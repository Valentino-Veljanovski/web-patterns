import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { ArchitectureDiagram, type FlowEdge, type FlowNode } from "../src/diagrams/ArchitectureDiagram";

const nodes: FlowNode[] = [
  { id: "trigger", label: "Webhook trigger", row: 0, col: 1 },
  { id: "validate", label: "Validate input", row: 1, col: 0 },
  { id: "store", label: "Persist record", row: 1, col: 2 },
  { id: "notify", label: "Notify the team channel", row: 2, col: 1 },
];
const edges: FlowEdge[] = [
  { from: "trigger", to: "validate" },
  { from: "trigger", to: "store" },
  { from: "validate", to: "notify" },
  { from: "store", to: "notify" },
];

function listFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? listFiles(p) : [p];
  });
}

describe("ArchitectureDiagram E18", () => {
  // Old architecture-diagram.tsx line 106: Math.max(...[]) is -Infinity, so totalH is NaN.
  it("E18a: nodes=[] renders a valid viewBox and no NaN anywhere", () => {
    const { container } = render(<ArchitectureDiagram nodes={[]} edges={[]} caption="Empty" />);
    const svg = container.querySelector("svg") as SVGSVGElement;
    const viewBox = svg.getAttribute("viewBox") ?? "";
    const m = /^0 0 (\d+) (\d+)$/.exec(viewBox);
    expect(m).not.toBeNull();
    expect(Number(m?.[1])).toBeGreaterThan(0);
    expect(Number(m?.[2])).toBeGreaterThan(0);
    expect(svg.outerHTML).not.toContain("NaN");
    expect(svg.outerHTML).not.toContain("Infinity");
  });

  // Old line 142: fixed id "ad-arrow" shared by every diagram on the page.
  it("E18b: two instances have distinct marker ids and reference their own", () => {
    const { container } = render(
      <>
        <ArchitectureDiagram nodes={nodes} edges={edges} caption="First" />
        <ArchitectureDiagram nodes={nodes} edges={edges} caption="Second" />
      </>,
    );
    const svgs = Array.from(container.querySelectorAll("svg"));
    expect(svgs).toHaveLength(2);
    const ids = svgs.map((s) => s.querySelector("marker")?.getAttribute("id") ?? "");
    expect(ids[0]).toBeTruthy();
    expect(ids[1]).toBeTruthy();
    expect(ids[0]).not.toBe(ids[1]);
    svgs.forEach((svg, i) => {
      const lines = Array.from(svg.querySelectorAll("line"));
      expect(lines.length).toBe(edges.length);
      for (const line of lines) {
        expect(line.getAttribute("marker-end")).toBe(`url(#${ids[i]})`);
      }
    });
  });

  // Old lines 150, 168, 193-194, 203: bare hex colours in the SVG.
  it("E18c: every fill and stroke is a CSS variable with a fallback; no bare hex outside var()", () => {
    const { container } = render(<ArchitectureDiagram nodes={nodes} edges={edges} caption="Colours" />);
    const svg = container.querySelector("svg") as SVGSVGElement;
    const painted = Array.from(svg.querySelectorAll("[fill], [stroke]"));
    expect(painted.length).toBeGreaterThan(0);
    const varRef = /^var\(--[a-z0-9-]+,\s*[^)]+\)$/i;
    for (const el of painted) {
      for (const attr of ["fill", "stroke"]) {
        const v = el.getAttribute(attr);
        if (v !== null) expect(v, `${el.tagName} ${attr}="${v}"`).toMatch(varRef);
      }
    }
    const stripped = svg.outerHTML.replace(/var\([^)]*\)/g, "").replace(/url\(#[^)]*\)/g, "");
    expect(stripped).not.toMatch(/#[0-9a-f]{3,8}\b/i);
  });

  // Old lines 117-119: four !important rules in an inline <style>.
  it("E18d: no !important anywhere under src/", () => {
    const files = listFiles(join(process.cwd(), "src"));
    expect(files.length).toBeGreaterThan(0);
    const offenders = files.filter((f) => readFileSync(f, "utf8").includes("!important"));
    expect(offenders).toEqual([]);
  });

  it("E18d: renders no inline <style> element", () => {
    const { container } = render(<ArchitectureDiagram nodes={nodes} edges={edges} caption="Style" />);
    expect(container.querySelector("style")).toBeNull();
  });

  it("E18e: unknown edge endpoints are skipped, not thrown", () => {
    const bad: FlowEdge[] = [...edges, { from: "trigger", to: "missing" }, { from: "ghost", to: "notify" }];
    const { container } = render(<ArchitectureDiagram nodes={nodes} edges={bad} caption="Tolerant" />);
    expect(container.querySelectorAll("line")).toHaveLength(edges.length);
  });

  it("renders every node label and the caption", () => {
    const { getByText } = render(<ArchitectureDiagram nodes={nodes} edges={edges} caption="Pipeline" />);
    expect(getByText("Webhook trigger")).toBeTruthy();
    expect(getByText("Pipeline")).toBeTruthy();
  });

  it("wraps long labels onto several lines", () => {
    const { container } = render(<ArchitectureDiagram nodes={nodes} edges={edges} caption="Wrap" />);
    const texts = Array.from(container.querySelectorAll("text")).map((t) => t.textContent);
    expect(texts).toContain("Notify the team");
    expect(texts).toContain("channel");
  });
});
