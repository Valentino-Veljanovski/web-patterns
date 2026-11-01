#!/usr/bin/env node
/**
 * Host proof: the built example app, served by `next start`, opened in
 * Chromium with reduced motion on and off. vitest proves the logic; only
 * this proves the host. H1-H6 cover the G2a pages, H7-H10 navigation, seo,
 * contact and chat. Run `npm run build --workspace examples/next-app` first.
 * Every measured value is printed; the process exits 1 on any failed check.
 */
import { spawn } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const appDir = path.join(root, "examples", "next-app");
const nextBin = path.join(root, "node_modules", "next", "dist", "bin", "next");
const PAGES = ["/", "/motion", "/scroll", "/graphics", "/diagrams", "/navigation", "/navigation/target", "/seo", "/contact", "/chat"];
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

async function navigation(mode, p) {
  const { page } = p;
  const start = Date.now();
  await page.click("[data-nav-card]");
  let arrived = false;
  try {
    await page.waitForURL("**/navigation/target", { timeout: 2000 });
    arrived = true;
  } catch {
    arrived = false;
  }
  const ms = Date.now() - start;
  const vt = await page.evaluate(() => document.documentElement.getAttribute("data-vt"));
  const heading = await page.$eval("[data-nav-target]", (el) => el.textContent ?? "").catch(() => "");
  check(`H7 /navigation [${mode}] card click reaches /navigation/target within 2 s`, arrived && heading === "Target page", `url=${page.url()} after=${ms}ms heading="${heading}"`);
  const expected = mode === "reduce" ? "skipped" : "used";
  check(`H7 /navigation [${mode}] startViewTransition ${expected}`, vt === expected, `data-vt=${vt}`);
}

async function seo(mode, p, base) {
  const { page } = p;
  const raw = await page.$eval('script[type="application/ld+json"]', (el) => el.textContent ?? "").catch(() => "");
  let type = "";
  let parsed = false;
  try {
    const data = JSON.parse(raw);
    parsed = true;
    type = data["@type"];
  } catch {
    parsed = false;
  }
  check(`H8 /seo [${mode}] JSON-LD parses with @type Person`, parsed && type === "Person", `parsed=${parsed} type=${type} bytes=${raw.length}`);
  const canonical = await page.$eval('link[rel="canonical"]', (el) => el.getAttribute("href") ?? "").catch(() => "");
  check(`H8 /seo [${mode}] canonical link set from the page path`, canonical === "https://web-patterns.example/seo", `canonical=${canonical}`);
  const files = [
    ["/sitemap.xml", /^application\/xml/, "<urlset"],
    ["/robots.txt", /^text\/plain/, "Sitemap: https://web-patterns.example/sitemap.xml"],
    ["/manifest.webmanifest", /^application\/manifest\+json/, '"start_url":"/"'],
  ];
  for (const [route, typeRe, needle] of files) {
    const res = await fetch(base + route);
    const ct = res.headers.get("content-type") ?? "";
    const body = await res.text();
    check(`H8 ${route} [${mode}] 200 with the expected content type and content`, res.status === 200 && typeRe.test(ct) && body.includes(needle), `status=${res.status} type="${ct}" bytes=${body.length}`);
  }
}

async function contact(mode, p) {
  const { page } = p;
  await page.click("[data-contact-form] button[type=submit]");
  let ok = false;
  try {
    await page.waitForSelector('[data-contact-status="200"] [data-contact-payload]', { timeout: 3000 });
    ok = true;
  } catch {
    ok = false;
  }
  const payload = ok ? await page.$eval("[data-contact-payload]", (el) => el.textContent ?? "") : "";
  let shape = false;
  try {
    const data = JSON.parse(payload);
    shape = data.saveToSentItems === true && data.message.body.contentType === "HTML" && data.message.toRecipients[0].emailAddress.address === "inbox@example.com";
  } catch {
    shape = false;
  }
  check(`H9 /contact [${mode}] valid body → 200 and the recorded payload shown`, ok && shape, `status200=${ok} shape=${shape} bytes=${payload.length}`);

  await page.fill('[data-contact-form] input[name="email"]', "not an address");
  await page.click("[data-contact-form] button[type=submit]");
  let bad = "";
  try {
    await page.waitForSelector('[data-contact-status="400"]', { timeout: 3000 });
    bad = await page.$eval('[data-contact-status="400"] [data-contact-message]', (el) => el.textContent ?? "");
  } catch {
    bad = "";
  }
  check(`H9 /contact [${mode}] bad email → 400 message shown`, bad.includes("invalid_email") && bad.includes("email"), `message="${bad}"`);
  // The 400 above is the expected answer of the route, not a failed request of the page;
  // Chromium also logs it as a console error ("Failed to load resource ... 400").
  p.failedRequests = p.failedRequests.filter((r) => !/\/api\/contact HTTP 400$/.test(r));
  p.consoleErrors = p.consoleErrors.filter((e) => !/status of 400/.test(e));
}

async function chat(mode, p) {
  const { page } = p;
  const requests = [];
  const onRequest = (r) => {
    const type = r.resourceType();
    if (type !== "xhr" && type !== "fetch") return;
    const prefetch = r.headers()["next-router-prefetch"] !== undefined;
    requests.push(`${type} ${r.url()}${prefetch ? " (next prefetch)" : ""}`);
  };
  page.on("request", onRequest);
  await page.click('button[aria-expanded="false"]');
  await page.fill('section[role="dialog"] input[type="text"]', "music");
  await page.press('section[role="dialog"] input[type="text"]', "Enter");
  let answered = false;
  try {
    await page.waitForFunction(
      () => Array.from(document.querySelectorAll('[data-chat-message="assistant"]')).some((el) => (el.textContent ?? "").includes("featured songs")),
      null,
      { timeout: 2000 },
    );
    answered = true;
  } catch {
    answered = false;
  }
  await sleep(500);
  page.off("request", onRequest);
  const count = await page.$$eval("[data-chat-message]", (els) => els.length);
  check(`H10 /chat [${mode}] "music" gets the source answer`, answered, `answered=${answered} messages=${count}`);
  const own = requests.filter((r) => !r.endsWith("(next prefetch)"));
  check(`H10 /chat [${mode}] zero XHR/fetch requests after opening the widget`, own.length === 0, `xhr/fetch=${own.length} nextLinkPrefetch=${requests.length - own.length}`);
  for (const r of own) console.log(`     ${r}`);
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
        if (route === "/navigation") await navigation(mode, p);
        if (route === "/seo") await seo(mode, p, base);
        if (route === "/contact") await contact(mode, p);
        if (route === "/chat") await chat(mode, p);
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
