"use client";
import { useId, useState } from "react";

/**
 * ArchitectureDiagram
 * ===================
 * An SVG flow diagram from nodes on a row/column grid plus a list of
 * edges. No layout engine: the author places every node, which keeps all
 * diagrams in a publication the same size and rhythm.
 *
 *   <ArchitectureDiagram
 *     nodes={[{ id: "in", label: "Webhook trigger", row: 0, col: 1 }, ...]}
 *     edges={[{ from: "in", to: "validate" }, ...]}
 *     cols={3}
 *     caption="Intake pipeline."
 *   />
 *
 * - The arrow marker id comes from useId, so several diagrams on one page
 *   do not share (and silently reuse) the first one's marker.
 * - An empty node list still produces a valid viewBox with positive size.
 * - Edges that name an unknown node are skipped.
 * - Every colour is a CSS variable with a fallback, so a stylesheet can
 *   retheme the diagram by setting variables:
 *     --ad-node-fill --ad-node-stroke --ad-text --ad-edge --ad-accent --ad-caption
 * - Hovering a node highlights it through React state, not injected CSS.
 */

export interface FlowNode {
  id: string;
  label: string;
  /** 0 = top row. */
  row: number;
  /** 0 = leftmost column. */
  col: number;
}

export interface FlowEdge {
  from: string;
  to: string;
}

export interface ArchitectureDiagramProps {
  nodes: FlowNode[];
  edges: FlowEdge[];
  /** Number of columns. Default 3. */
  cols?: number;
  caption: string;
  className?: string;
}

const NODE_W = 160;
const NODE_H = 46;
const ROW_GAP = 32;
const COL_GAP = 20;
const TOP_PAD = 40;
const BOTTOM_PAD = 20;
const LINE_H = 14;
const MAX_CHARS = 18;
const MAX_LINES = 3;

const COLOR = {
  nodeFill: "var(--ad-node-fill, #131826)",
  nodeStroke: "var(--ad-node-stroke, #1f2937)",
  text: "var(--ad-text, #e5e7eb)",
  edge: "var(--ad-edge, #6b7280)",
  accent: "var(--ad-accent, #00d4a1)",
  caption: "var(--ad-caption, #9ca3af)",
};

/** Word-wraps a label into at most MAX_LINES lines of about `maxChars`. */
export function wrapLabel(text: string, maxChars = MAX_CHARS): string[] {
  if (text.length <= maxChars) return [text];
  const lines: string[] = [];
  let current = "";
  for (const word of text.split(" ")) {
    if (current && `${current} ${word}`.length > maxChars) {
      lines.push(current);
      current = word;
    } else {
      current = current ? `${current} ${word}` : word;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, MAX_LINES);
}

function nodePosition(node: FlowNode, cols: number, totalW: number) {
  const slotW = totalW / cols;
  const cx = slotW * node.col + slotW / 2;
  const cy = TOP_PAD + node.row * (NODE_H + ROW_GAP) + NODE_H / 2;
  return { cx, cy, x: cx - NODE_W / 2, y: cy - NODE_H / 2 };
}

export function ArchitectureDiagram({ nodes, edges, cols = 3, caption, className }: ArchitectureDiagramProps) {
  const reactId = useId();
  const markerId = `ad-arrow-${reactId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const [hovered, setHovered] = useState<string | null>(null);

  const columnCount = Math.max(1, Math.floor(cols));
  const rowCount = nodes.reduce((max, n) => Math.max(max, n.row + 1), 1);
  const totalW = columnCount * (NODE_W + COL_GAP);
  const totalH = TOP_PAD + rowCount * (NODE_H + ROW_GAP) + BOTTOM_PAD;
  const nodeById = new Map(nodes.map((n) => [n.id, n]));

  return (
    <figure className={className} style={{ margin: 0, width: "100%" }}>
      <div style={{ width: "100%", overflowX: "auto" }}>
        <svg
          role="img"
          aria-label={caption}
          viewBox={`0 0 ${totalW} ${totalH}`}
          width="100%"
          style={{ display: "block", maxWidth: `${totalW}px`, margin: "0 auto" }}
        >
          <defs>
            <marker id={markerId} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M0,0 L10,5 L0,10 z" fill={COLOR.edge} />
            </marker>
          </defs>

          {edges.map((edge, i) => {
            const from = nodeById.get(edge.from);
            const to = nodeById.get(edge.to);
            if (!from || !to) return null;
            const a = nodePosition(from, columnCount, totalW);
            const b = nodePosition(to, columnCount, totalW);
            return (
              <line
                key={`${edge.from}-${edge.to}-${i}`}
                x1={a.cx}
                y1={a.cy + NODE_H / 2}
                x2={b.cx}
                y2={b.cy - NODE_H / 2}
                stroke={COLOR.edge}
                strokeWidth={1}
                markerEnd={`url(#${markerId})`}
              />
            );
          })}

          {nodes.map((node) => {
            const pos = nodePosition(node, columnCount, totalW);
            const lines = wrapLabel(node.label);
            const isHovered = hovered === node.id;
            return (
              <g
                key={node.id}
                data-node={node.id}
                data-hovered={isHovered ? "true" : undefined}
                onMouseEnter={() => setHovered(node.id)}
                onMouseLeave={() => setHovered(null)}
                style={{ cursor: "default" }}
              >
                <rect
                  x={pos.x}
                  y={pos.y}
                  width={NODE_W}
                  height={NODE_H}
                  rx={6}
                  fill={COLOR.nodeFill}
                  stroke={isHovered ? COLOR.accent : COLOR.nodeStroke}
                  strokeWidth={isHovered ? 1.5 : 1}
                />
                {lines.map((line, i) => (
                  <text
                    key={i}
                    x={pos.cx}
                    y={pos.cy + (i - (lines.length - 1) / 2) * LINE_H + 4}
                    fill={isHovered ? COLOR.accent : COLOR.text}
                    fontSize="11"
                    fontFamily="system-ui, sans-serif"
                    textAnchor="middle"
                  >
                    {line}
                  </text>
                ))}
              </g>
            );
          })}
        </svg>
      </div>
      {caption ? (
        <figcaption
          style={{ color: COLOR.caption, fontSize: "0.78rem", lineHeight: 1.6, textAlign: "center", marginTop: 12, fontStyle: "italic" }}
        >
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
