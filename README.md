# web-patterns

The patterns here come from two live websites and two prototypes I built. Everything in this repository was re-implemented for it: no client code, data or identifiers.

[![CI](https://github.com/Valentino-Veljanovski/web-patterns/actions/workflows/ci.yml/badge.svg)](https://github.com/Valentino-Veljanovski/web-patterns/actions/workflows/ci.yml)

React 19 and Next 16 components for motion, scrolling, a WebGL hero background and SVG architecture diagrams. TypeScript sources only, no runtime dependencies, no build step: the package `exports` map points at `src/`, and the consuming app transpiles the files. The repository is not published to npm. Read it, or copy the modules you need.

## What is here

| Module | Exports | State |
| --- | --- | --- |
| `web-patterns/motion` | `usePrefersReducedMotion`, `useScrollReveal`, `ScrollReveal`, `SplitText`, `Typewriter` | tested, in the host proof |
| `web-patterns/scroll` | `ReadingProgress`, `BackToTop` | tested, in the host proof |
| `web-patterns/graphics` | `HeroShader` | tested, in the host proof |
| `web-patterns/diagrams` | `ArchitectureDiagram` | tested, in the host proof |
| `navigation` | | planned |
| `seo` | | planned |
| `contact` | | planned |
| `hosting` | | planned |
| `chat` | | planned |

Three rules hold for every component:

- The server HTML contains the final text. Client effects animate over it, never before it.
- `prefers-reduced-motion: reduce` means static: the final state, no transition, no animation frame requested.
- Scroll and animation handlers write to the DOM through refs. React re-renders on mount and on real state changes, not per scroll event or per typed character.

Design notes with the mechanism behind each group are in [`docs/`](docs/):
[intersection-observer-reveal.md](docs/intersection-observer-reveal.md),
[scroll-animation-patterns.md](docs/scroll-animation-patterns.md),
[svg-architecture-diagrams.md](docs/svg-architecture-diagrams.md).

## How it is verified

Two layers. The unit tests prove the logic. Only the built app proves the host.

**Unit tests** (`npm test`): vitest with jsdom, one file per component, plus a structure file. The tests pin the contracts that the earlier versions of these components got wrong: a typewriter that re-rendered per character and restarted on every parent render, a diagram with one shared marker id and a `NaN` height for an empty node list, a split-text that broke emoji into code points and forbade line wrapping, reveal wrappers that ignored reduced motion. Each test names the old behaviour it replaces.

**Host proof** (`scripts/host-proof.mjs`): `examples/next-app` is an App Router app that renders every component on four pages. CI builds it with `next build`, serves it with `next start` and opens every page in Chromium twice, with reduced motion on and off. The script checks HTTP status, console and page errors, failed requests, the reduced-motion states, the reveal timing, the two diagram ids, the reading-progress width at 60 % scroll and the shader flag, and prints every value it measured.

Last local run: Next 16.4.3, Playwright 1.64.1 (Chromium 156), 1 November 2026, all checks passed. The CI badge above shows the current state of both jobs.

## Running it

```sh
npm ci                 # installs the library and the example app (npm workspace)
npm run lint
npm run typecheck
npm test

npm run build --workspace examples/next-app
npx playwright install chromium   # once
node scripts/host-proof.mjs
```

Node 20.19 or newer. CI runs the library jobs on Node 20, 22 and 24 and the host proof on Node 22.

Install from the repository root only. Running `npm ci` inside `examples/next-app` makes npm reinstall the root with just that workspace's dependencies and removes the test tooling.

## Using a component

```tsx
import { ScrollReveal, Typewriter } from "web-patterns/motion";

<h1 aria-label="Workflow Developer">
  <Typewriter mode="cycle" roles={["Workflow Developer", "Automation Engineer"]} />
</h1>
<ScrollReveal delay={0.1}>
  <p>Fades in the first time it scrolls into view.</p>
</ScrollReveal>
```

Every component file starts with a comment that explains its mechanism, props and the accessibility contract.

## Licence

MIT, see [LICENSE](LICENSE).
