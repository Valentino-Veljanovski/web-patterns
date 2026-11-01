#!/usr/bin/env node
/**
 * Host proof: the built example app, served by `next start`, opened in
 * Chromium with reduced motion on and off. vitest proves the logic; only
 * this proves the host. Run `npm run build --workspace examples/next-app`
 * first. Every measured value is printed; the process exits 1 on any
 * failed check.
 */
import { spawn } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const appDir = path.join(root, "examples", "next-app");
const nextBin = path.join(root, "node_modules", "next", "dist", "bin", "next");
const PAGES = ["/", "/motion", "/scroll", "/graphics", "/diagrams"];
const CONTEXTS = ["reduce", "no-preference"];
const VIEWPORT = { width: 1440, height: 900 };

const failures = [];
function check(label, ok, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"} ${label}${detail ? `  [${detail}]` : ""}`);
  if (!ok) failures.push(label);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

async function waitForServer(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let last = "";
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
      last = `status ${res.status}`;
    } catch (err) {
      last = String(err);
    }
    await sleep(250);
  }
  throw new Error(`server did not answer within ${timeoutMs} ms (${last})`);
}

function startServer(port) {
  const child = spawn(process.execPath, [nextBin, "start", "-p", String(port), "-H", "127.0.0.1"], {
    cwd: appDir,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, NODE_ENV: "production" },
  });
  child.stdout.on("data", (d) => process.stdout.write(`[next] ${d}`));
  child.stderr.on("data", (d) => process.stderr.write(`[next] ${d}`));
  return child;
}

function stopServer(child) {
  if (!child || child.exitCode !== null) return;
  if (process.platform === "win32") {
    spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
  } else {
    child.kill("SIGTERM");
  }
}

async function openPage(context, base, route) {
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];
  page.on("console", (m) => {
    if (m.type() === "error") consoleErrors.push(m.text());
  });
  page.on("pageerror", (e) => pageErrors.push(String(e)));
  page.on("requestfailed", (r) => failedRequests.push(`${r.url()} ${r.failure()?.errorText ?? ""}`));
  page.on("response", (r) => {
    if (r.status() >= 400) failedRequests.push(`${r.url()} HTTP ${r.status()}`);
  });
  const response = await page.goto(base + route, { waitUntil: "load" });
  const loadedAt = Date.now();
  return { page, status: response?.status() ?? 0, loadedAt, consoleErrors, pageErrors, failedRequests };
}

function reportH1(mode, route, p) {
  const detail = `status=${p.status} consoleErrors=${p.consoleErrors.length} pageErrors=${p.pageErrors.length} failedRequests=${p.failedRequests.length}`;
  const ok = p.status === 200 && p.consoleErrors.length === 0 && p.pageErrors.length === 0 && p.failedRequests.length === 0;
  check(`H1 ${route} [${mode}]`, ok, detail);
  for (const e of [...p.consoleErrors, ...p.pageErrors, ...p.failedRequests]) console.log(`     ${e}`);
}

const opacities = (page, selector) =>
  page.$$eval(selector, (els) => els.map((el) => getComputedStyle(el).opacity));

async function motionReduce(p) {
  const { page, loadedAt } = p;
  const before = await opacities(page, "[data-scroll-reveal]");
  check("H2 /motion [reduce] ScrollReveal opacity 1 at load, before scroll", before.length > 0 && before.every((o) => o === "1"), `opacities=${before.join(",")}`);

  let typewriterMs = -1;
  try {
    await page.waitForFunction(
      () => {
        const el = document.querySelector("[data-typewriter]");
        return !!el && el.getAttribute("data-typewriter") === "static" && (el.textContent ?? "").length > 0;
      },
      null,
      { timeout: 2000 },
    );
    typewriterMs = Date.now() - loadedAt;
  } catch {
    typewriterMs = Infinity;
  }
  const typed = await page.$eval("[data-typewriter]", (el) => el.textContent ?? "");
  check("H2 /motion [reduce] Typewriter full text within 100 ms of load", typewriterMs <= 100, `after=${typewriterMs}ms text="${typed}"`);

  const after = await opacities(page, "[data-scroll-reveal]");
  check("H2 /motion [reduce] ScrollReveal opacity 1 after hydration", after.every((o) => o === "1"), `opacities=${after.join(",")}`);

  const chars = await opacities(page, ".splittext-char");
  check("H2 /motion [reduce] SplitText spans opacity 1", chars.length > 0 && chars.every((o) => o === "1"), `spans=${chars.length} opacities=${[...new Set(chars)].join(",")}`);
}

async function motionNoPreference(p) {
  const { page, loadedAt } = p;

  // Hydration hides the below-the-fold blocks; wait for that and read one.
  let hiddenOpacity = "n/a";
  try {
    await page.waitForSelector('[data-scroll-reveal="hidden"]', { timeout: 3000 });
    hiddenOpacity = await page.$eval('[data-scroll-reveal="hidden"]', (el) => getComputedStyle(el).opacity);
  } catch {
    hiddenOpacity = "none-found";
  }
  check("H3 /motion [no-preference] below-fold ScrollReveal opacity 0 before scrolling", hiddenOpacity === "0", `opacity=${hiddenOpacity}`);

  const typedAt = async (ms) => {
    const wait = loadedAt + ms - Date.now();
    if (wait > 0) await sleep(wait);
    return page.$eval("[data-typewriter-output]", (el) => el.textContent ?? "").catch(() => "");
  };
  const t03 = await typedAt(300);
  const t15 = await typedAt(1500);
  check("H3 /motion [no-preference] Typewriter longer at 1.5 s than at 0.3 s", t15.length > 0 && t15.length > t03.length, `t=0.3s "${t03}" (${t03.length})  t=1.5s "${t15}" (${t15.length})`);

  let splitOk = false;
  try {
    await page.waitForFunction(
      () => {
        const els = Array.from(document.querySelectorAll(".splittext-char"));
        return els.length > 0 && els.every((el) => getComputedStyle(el).opacity === "1");
      },
      null,
      { timeout: 2000 },
    );
    splitOk = true;
  } catch {
    splitOk = false;
  }
  const splitAfter = Date.now() - loadedAt;
  check("H3 /motion [no-preference] SplitText chars opacity 1 within 2 s", splitOk, `after=${splitAfter}ms`);

  const revealStart = Date.now();
  await page.$eval('[data-scroll-reveal="hidden"]', (el) => el.scrollIntoView({ block: "center" })).catch(() => {});
  let revealOk = false;
  try {
    await page.waitForFunction(
      () => {
        const el = document.querySelector('[data-scroll-reveal="visible"]');
        return !!el && getComputedStyle(el).opacity === "1";
      },
      null,
      { timeout: 1500 },
    );
    revealOk = true;
  } catch {
    revealOk = false;
  }
  check("H3 /motion [no-preference] ScrollReveal opacity 1 within 1.5 s of scrolling into view", revealOk, `after=${Date.now() - revealStart}ms`);
}

async function diagrams(mode, p) {
  const { page } = p;
  const info = await page.$$eval("svg[role='img']", (svgs) =>
    svgs.map((svg) => ({
      viewBox: svg.getAttribute("viewBox") ?? "",
      marker: svg.querySelector("marker")?.getAttribute("id") ?? "",
      rects: svg.querySelectorAll("rect").length,
      hasNaN: svg.outerHTML.includes("NaN"),
    })),
  );
  check(`H4 /diagrams [${mode}] two diagrams`, info.length === 2, `count=${info.length}`);
  const viewBoxOk = info.every((d) => /^0 0 \d+ \d+$/.test(d.viewBox));
  check(`H4 /diagrams [${mode}] viewBox pattern`, viewBoxOk, `viewBoxes=${info.map((d) => `"${d.viewBox}"`).join(" ")}`);
  check(`H4 /diagrams [${mode}] distinct marker ids`, info.length === 2 && info[0].marker !== "" && info[0].marker !== info[1].marker, `ids=${info.map((d) => d.marker).join(" ")}`);
  const empty = info.find((d) => d.rects === 0);
  check(`H4 /diagrams [${mode}] empty diagram has no NaN`, !!empty && !empty.hasNaN, `emptyFound=${!!empty} hasNaN=${empty?.hasNaN}`);
}

async function scroll(mode, p) {
  const { page } = p;
  const metrics = await page.evaluate(() => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo(0, Math.round(max * 0.6));
    return { max, target: Math.round(max * 0.6), innerWidth: window.innerWidth };
  });
  await sleep(700); // two frames for the rAF handlers plus the show transition
  const bar = await page.$eval("[data-reading-progress]", (el) => el.getBoundingClientRect().width);
  const ratio = bar / metrics.innerWidth;
  check(`H5 /scroll [${mode}] ReadingProgress width 50-70 % at 60 % scroll`, ratio >= 0.5 && ratio <= 0.7, `bar=${bar.toFixed(1)}px viewport=${metrics.innerWidth}px ratio=${(ratio * 100).toFixed(1)}% scrollMax=${metrics.max}`);
  const shown = await page.$eval("[data-back-to-top]", (el) => ({
    ariaHidden: el.getAttribute("aria-hidden"),
    opacity: getComputedStyle(el).opacity,
    tabIndex: el.getAttribute("tabindex"),
  }));
  check(`H5 /scroll [${mode}] BackToTop visible and not aria-hidden after scrolling`, shown.ariaHidden === "false" && Number(shown.opacity) > 0.9 && shown.tabIndex === "0", `aria-hidden=${shown.ariaHidden} opacity=${shown.opacity} tabindex=${shown.tabIndex}`);
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(700);
  const top = await page.$eval("[data-back-to-top]", (el) => ({
    ariaHidden: el.getAttribute("aria-hidden"),
    opacity: getComputedStyle(el).opacity,
  }));
  check(`H5 /scroll [${mode}] BackToTop aria-hidden at the top`, top.ariaHidden === "true" && Number(top.opacity) < 0.1, `aria-hidden=${top.ariaHidden} opacity=${top.opacity}`);
}

async function graphics(mode, p) {
  const { page } = p;
  await sleep(300); // let the effect request a context and link the program
  const info = await page.$eval("[data-shader]", (el) => ({
    shader: el.getAttribute("data-shader"),
    canvases: el.querySelectorAll("canvas").length,
  }));
  if (mode === "no-preference") {
    check("H6 /graphics [no-preference] canvas exists at 1440x900", info.canvases === 1, `canvases=${info.canvases} data-shader=${info.shader}`);
  } else {
    check("H6 /graphics [reduce] no canvas and data-shader off", info.canvases === 0 && info.shader === "off", `canvases=${info.canvases} data-shader=${info.shader}`);
  }
}

async function main() {
  const port = await freePort();
  const base = `http://127.0.0.1:${port}`;
  console.log(`host-proof: starting next start on ${base}`);
  const server = startServer(port);
  let browser;
  try {
    await waitForServer(`${base}/`, 30000);
    browser = await chromium.launch();
    console.log(`host-proof: chromium ${browser.version()}`);
    for (const mode of CONTEXTS) {
      const context = await browser.newContext({ reducedMotion: mode, viewport: VIEWPORT });
      for (const route of PAGES) {
        const p = await openPage(context, base, route);
        if (route === "/motion" && mode === "reduce") await motionReduce(p);
        if (route === "/motion" && mode === "no-preference") await motionNoPreference(p);
        if (route === "/diagrams") await diagrams(mode, p);
        if (route === "/scroll") await scroll(mode, p);
        if (route === "/graphics") await graphics(mode, p);
        await sleep(100);
        reportH1(mode, route, p);
        await p.page.close();
      }
      await context.close();
    }
  } finally {
    if (browser) await browser.close();
    stopServer(server);
  }
  console.log(failures.length === 0 ? "host-proof: all checks passed" : `host-proof: ${failures.length} check(s) failed`);
  process.exit(failures.length === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
