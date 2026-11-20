import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const ROOT = process.cwd();
const SKIP = new Set(["node_modules", ".next", ".git", "test-results", "playwright-report", "dist"]);

function listFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    if (SKIP.has(name)) return [];
    const p = join(dir, name);
    return statSync(p).isDirectory() ? listFiles(p) : [p];
  });
}

const rel = (p: string) => relative(ROOT, p).split(sep).join("/");
const isText = (p: string) => /\.(ts|tsx|mjs|js|json|md|css|yml|yaml|php|txt|xml|webmanifest|example|svg)$/.test(p);
const decode = (s: string) => Buffer.from(s, "base64").toString("utf8");

describe("D13/D14 structure", () => {
  it("exactly one IntersectionObserver implementation under src/, in useScrollReveal", () => {
    const hits = listFiles(join(ROOT, "src"))
      .filter((f) => readFileSync(f, "utf8").includes("new IntersectionObserver"))
      .map(rel);
    expect(hits).toEqual(["src/motion/useScrollReveal.ts"]);
  });

  it("Typewriter.tsx has no IntersectionObserver of its own", () => {
    const src = readFileSync(join(ROOT, "src/motion/Typewriter.tsx"), "utf8");
    expect(src).not.toContain("IntersectionObserver");
    expect(src).toContain("useScrollReveal");
  });

  it("no framer-motion anywhere in the repository", () => {
    const hits = listFiles(ROOT)
      .filter(isText)
      .filter((f) => rel(f) !== "test/structure.test.ts")
      .filter((f) => readFileSync(f, "utf8").includes("framer-motion"))
      .map(rel);
    expect(hits).toEqual([]);
  });
});

describe("R3 forbidden strings", () => {
  // Stored base64-encoded so that this file itself does not contain the strings.
  const FORBIDDEN = [
    "SGF1cHR0YWJlbGxl",
    "UHJlZGlzcGF0Y2g=",
    "RGllbnN0cGxhbg==",
    "aGFmdHVuZ192Mg==",
    "RElTUEFUQ0ggREVVVFNDSExBTkQ=",
    "dGhyZWUgR2VybWFuIGNpdGllcw==",
    "MyBHZXJtYW4gY2l0aWVz",
    "YmFja2VuZCBkZXZlbG9wZXI=",
    "Q29taW5nIG5leHQ=",
    "c2NvcGVkIEFJIGFzc2lzdGFudA==",
    "cHJvZHVjdGlvbi1yZWFkeQ==",
    "U29mdHdhcmVz",
    "dm9pY2UgaW4gcm9sbG91dA==",
    "dm9pY2UgcGVuZGluZw==",
    "aW4gZGFpbHkgb3BlcmF0aW9u",
    "bGl2ZSDCtyAzIGJ1aWx0",
    "MiBvZiAzIHJlZ2lvbnM=",
    "VG9taXNsYXY=",
    "KFAyKQ==",
    "UDIuVA==",
    "QmF1U2NvcGU=",
    "RmxvZ2lzdGljcw==",
    "Sm9uZ2lz",
  ].map(decode);

  it("the decoded list is intact", () => {
    expect(FORBIDDEN).toHaveLength(23);
    expect(FORBIDDEN[7]?.split(" ")).toEqual(["backend", "developer"]);
  });

  // Every file git tracks, as repo-relative paths. Only binary extensions are skipped; no file is
  // excluded by name, this one included: the list above is encoded so that it can be swept too.
  const BINARY = /\.(png|jpg|jpeg|gif|webp|ico|woff|woff2|pdf)$/i;
  const trackedFiles = () =>
    execFileSync("git", ["ls-files", "-z"], { cwd: ROOT, encoding: "utf8" })
      .split("\0")
      .filter((f) => f !== "" && !BINARY.test(f));

  it("no forbidden string in any tracked file", () => {
    const files = trackedFiles();
    // Guard: fails if this file is excluded again or the sweep goes back to an extension allow-list.
    expect(files).toEqual(
      expect.arrayContaining(["test/structure.test.ts", "package-lock.json", "LICENSE", ".gitignore", ".github/workflows/ci.yml"]),
    );
    const hits: string[] = [];
    for (const f of files) {
      const body = readFileSync(join(ROOT, f), "utf8").toLowerCase();
      for (const s of FORBIDDEN) {
        if (body.includes(s.toLowerCase())) hits.push(`${f}: ${s}`);
      }
    }
    expect(hits).toEqual([]);
  });

  it("the retired example-role string has zero hits in any case", () => {
    const needle = decode("YmFja2VuZCBkZXZlbG9wZXI=");
    const hits = trackedFiles().filter((f) => readFileSync(join(ROOT, f), "utf8").toLowerCase().includes(needle));
    expect(hits).toEqual([]);
  });
});

describe("G2b library rule and example files", () => {
  // The old contact route pulled @azure/identity, @microsoft/microsoft-graph-client and isomorphic-fetch;
  // the old chat pulled ai and @ai-sdk/react. None of them come in.
  const BANNED_PACKAGES = ["ai", "@ai-sdk/react", "@azure/identity", "@microsoft/microsoft-graph-client", "isomorphic-fetch"];
  const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");

  it("no banned package import under src/ or examples/", () => {
    const files = [...listFiles(join(ROOT, "src")), ...listFiles(join(ROOT, "examples"))].filter((f) => /\.(ts|tsx|mjs|js)$/.test(f));
    const hits: string[] = [];
    for (const f of files) {
      const body = readFileSync(f, "utf8");
      for (const pkg of BANNED_PACKAGES) {
        const re = new RegExp(`(from\\s*|import\\s*\\(?\\s*|require\\s*\\(\\s*)["']${escapeRe(pkg)}(/[^"']*)?["']`);
        if (re.test(body)) hits.push(`${rel(f)}: ${pkg}`);
      }
    }
    expect(hits).toEqual([]);
  });

  it("the banned packages are not in any package.json or the lockfile", () => {
    const files = listFiles(ROOT).filter((f) => /package(-lock)?\.json$/.test(f));
    expect(files.length).toBeGreaterThanOrEqual(3);
    const hits: string[] = [];
    for (const f of files) {
      const body = readFileSync(f, "utf8");
      for (const pkg of BANNED_PACKAGES) {
        if (body.includes(`"${pkg}":`) || body.includes(`"node_modules/${pkg}"`)) hits.push(`${rel(f)}: ${pkg}`);
      }
    }
    expect(hits).toEqual([]);
  });

  it("package.json has no runtime dependencies and exports every module", () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
    expect(pkg.dependencies).toBeUndefined();
    for (const m of ["motion", "scroll", "graphics", "diagrams", "navigation", "seo", "contact", "chat"]) {
      expect(pkg.exports[`./${m}`]).toBe(`./src/${m}/index.ts`);
    }
    expect(pkg.exports["./hosting/*"]).toBe("./src/hosting/*");
  });

  it("hosting files and PHP files are labelled, and the PHP example holds no credential", () => {
    const head = (p: string) => readFileSync(join(ROOT, p), "utf8").split("\n").slice(0, 12).join("\n");
    expect(head("src/hosting/htaccess.example")).toContain("never deployed");
    expect(head("src/hosting/sw.js")).toContain("never deployed");
    expect(head("src/contact/php/send-contact.php")).toContain("never deployed");
    expect(head("src/contact/php/config.example.php")).toContain("never deployed");
    const config = readFileSync(join(ROOT, "src/contact/php/config.example.php"), "utf8");
    expect(config).toMatch(/SMTP_PASSWORD',\s*'SMTP_PASSWORD_HERE'/);
    expect(config).toMatch(/SMTP_USERNAME',\s*'SMTP_USER_HERE'/);
    for (const p of ["src/contact/php/send-contact.php", "src/contact/php/config.example.php"]) {
      const emails = readFileSync(join(ROOT, p), "utf8").match(/[\w.+-]+@[\w-]+\.[\w.]+/g) ?? [];
      expect(emails.filter((e) => !e.endsWith("@example.com"))).toEqual([]);
    }
  });

  it('"production-grade" appears nowhere (R5)', () => {
    const hits = listFiles(ROOT)
      .filter(isText)
      .filter((f) => rel(f) !== "test/structure.test.ts")
      .filter((f) => readFileSync(f, "utf8").includes("production-grade"))
      .map(rel);
    expect(hits).toEqual([]);
  });
});
