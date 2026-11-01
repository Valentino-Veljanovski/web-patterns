# SVG architecture diagrams

`ArchitectureDiagram` draws a flow diagram from a list of nodes with grid coordinates and a list of edges. No layout engine, no charting library. The author places every node.

## Grid coordinates

Each node has a `row` and a `col`. The component computes pixel positions from fixed layout constants: node width and height, row gap, column gap. Because the constants are shared, every diagram in a publication has the same node size and rhythm and they read as one set. The cost is that the author arranges the nodes instead of a solver doing it. For diagrams with a dozen nodes this is faster than fighting an auto-layout.

Edges are straight lines from the bottom centre of one node to the top centre of the next, with an arrow marker. If a line would cross a node, rearrange the grid rather than adding routing.

## Marker ids

An SVG arrow is a `<marker>` referenced by id. A fixed id works until two diagrams share a page: both lines then point at the first diagram's marker, and if the first one is styled differently or unmounts, the second loses its arrows. The id here comes from React's `useId`, sanitised for use in a URL fragment, so each instance references its own marker. The test renders two diagrams and checks that the ids differ and that each line references the id of its own `<svg>`.

## Empty input

A diagram with no nodes used to compute its height from `Math.max()` of an empty list, which is `-Infinity`, and emit a `viewBox` with `NaN`. The row count is now at least one, so an empty diagram renders a valid, empty canvas. The example app shows one on purpose.

## Colours without a style block

Every fill and stroke is a CSS variable with a fallback, for example `var(--ad-node-fill, #131826)`. A stylesheet can set the variables on any ancestor to retheme the diagram. Hover highlighting is React state on the node group, which changes the stroke and text colour to the accent variable. No `<style>` element is injected and nothing needs to override anything.

## Labels and tolerance

Labels longer than about 18 characters wrap onto up to three lines. If a label needs more, shorten the label. Edges that name a node that does not exist are skipped silently; the diagram still renders the rest.

## Mobile

The SVG has a fixed `viewBox` and `width="100%"`, so it scales down with the page. The `maxWidth` stops it from growing past its design size on wide screens, and the wrapper scrolls horizontally if the viewport is narrower than the diagram can shrink to.
