import { describe, expect, it } from "vitest";
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
const isText = (p: string) => /\.(ts|tsx|mjs|js|json|md|css|yml|yaml)$/.test(p);

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
  const decode = (s: string) => Buffer.from(s, "base64").toString("utf8");
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

  it("no forbidden string in src, test, examples, docs, README or scripts", () => {
    const files = listFiles(ROOT)
      .filter(isText)
      .filter((f) => rel(f) !== "test/structure.test.ts")
      .filter((f) => !rel(f).endsWith("package-lock.json"));
    const hits: string[] = [];
    for (const f of files) {
      const body = readFileSync(f, "utf8").toLowerCase();
      for (const s of FORBIDDEN) {
        if (body.includes(s.toLowerCase())) hits.push(`${rel(f)}: ${s}`);
      }
    }
    expect(hits).toEqual([]);
  });
});
