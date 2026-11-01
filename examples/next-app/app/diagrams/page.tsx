import { ArchitectureDiagram, type FlowEdge, type FlowNode } from "web-patterns/diagrams";

const nodes: FlowNode[] = [
  { id: "trigger", label: "Webhook trigger", row: 0, col: 1 },
  { id: "validate", label: "Validate input", row: 1, col: 0 },
  { id: "transform", label: "Transform data", row: 1, col: 1 },
  { id: "store", label: "Persist record", row: 1, col: 2 },
  { id: "notify", label: "Notify the team channel", row: 2, col: 1 },
];

const edges: FlowEdge[] = [
  { from: "trigger", to: "validate" },
  { from: "trigger", to: "transform" },
  { from: "trigger", to: "store" },
  { from: "validate", to: "notify" },
  { from: "transform", to: "notify" },
  { from: "store", to: "notify" },
];

export default function DiagramsPage() {
  return (
    <>
      <h1>Diagram patterns</h1>
      <p className="lead">
        Two diagrams on one page. Each has its own arrow marker id, so the second one does not reuse the first
        one&apos;s marker. The second diagram has no nodes at all and still renders a valid, empty canvas.
      </p>
      <h2>Intake pipeline</h2>
      <ArchitectureDiagram nodes={nodes} edges={edges} cols={3} caption="A generic intake pipeline on a 3-column grid." />
      <h2>Empty diagram</h2>
      <ArchitectureDiagram nodes={[]} edges={[]} caption="No nodes yet. The viewBox is still a positive size." />
    </>
  );
}
