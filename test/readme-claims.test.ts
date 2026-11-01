import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const README = readFileSync(join(ROOT, "README.md"), "utf8");
const DOCS = readdirSync(join(ROOT, "docs"))
  .filter((f) => f.endsWith(".md"))
  .map((f) => ({ name: `docs/${f}`, body: readFileSync(join(ROOT, "docs", f), "utf8") }));
const ALL = [{ name: "README.md", body: README }, ...DOCS];

const PROVENANCE =
  "The patterns here come from two live websites and two prototypes I built. Everything in this repository was re-implemented for it: no client code, data or identifiers.";

// G0-inventory C8-C11: claims in the old READMEs with no file or no source behind them.
// Three entries are base64-encoded so that this file does not trip the R3 sweep itself.
const decode = (s: string) => Buffer.from(s, "base64").toString("utf8");
const BANNED = [
  "marquee",
  "Motion-based",
  "Supabase",
  "Cloudflare",
  "~50 places",
  "~5 KB",
  "~150 KB",
  "~80",
  decode("cHJvZHVjdGlvbi1ncmFkZQ=="),
  "production prototype",
  decode("QmFja2VuZCBEZXZlbG9wZXI="),
  decode("c2NvcGVkIEFJIGFzc2lzdGFudA=="),
  "8 case studies",
];

function paragraphs(text: string): string[] {
  return text.split(/\n\s*\n/).map((p) => p.trim());
}

describe("README claims E20/E22", () => {
  it("README.md and docs/*.md contain none of the unsourced claims", () => {
    const hits: string[] = [];
    for (const { name, body } of ALL) {
      for (const s of BANNED) {
        if (body.toLowerCase().includes(s.toLowerCase())) hits.push(`${name}: ${s}`);
      }
    }
    expect(hits).toEqual([]);
  });

  it("the first paragraph of README.md is the provenance sentence", () => {
    const first = paragraphs(README).find((p) => !p.startsWith("#"));
    expect(first).toBe(PROVENANCE);
  });

  it("every module folder under src/ is named in README.md", () => {
    const modules = readdirSync(join(ROOT, "src")).filter((n) => statSync(join(ROOT, "src", n)).isDirectory());
    expect(modules.length).toBeGreaterThanOrEqual(9);
    const missing = modules.filter((m) => !new RegExp(`\\b${m}\\b`).test(README));
    expect(missing).toEqual([]);
  });

  it('"never deployed" appears in the hosting and PHP paragraphs', () => {
    const ps = paragraphs(README);
    const hosting = ps.filter((p) => /htaccess|service worker/i.test(p));
    const php = ps.filter((p) => /\bPHP\b/.test(p));
    expect(hosting.length).toBeGreaterThan(0);
    expect(php.length).toBeGreaterThan(0);
    expect(hosting.every((p) => p.includes("never deployed"))).toBe(true);
    expect(php.every((p) => p.includes("never deployed"))).toBe(true);
  });

  it('README.md does not contain the word "planned"', () => {
    expect(/\bplanned\b/i.test(README)).toBe(false);
  });

  it("the assistant paragraph states the no-network behaviour", () => {
    const ps = paragraphs(README).filter((x) => /assistant/i.test(x) && /chat/i.test(x));
    expect(ps.length).toBeGreaterThan(0);
    const stated = ps.filter((p) => p.includes("answers in the browser from the site's own content") && p.includes("no network request"));
    expect(stated).toHaveLength(1);
  });
});
