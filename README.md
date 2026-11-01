# web-patterns

The patterns here come from two live websites and two prototypes I built. Everything in this repository was re-implemented for it: no client code, data or identifiers.

[![CI](https://github.com/Valentino-Veljanovski/web-patterns/actions/workflows/ci.yml/badge.svg)](https://github.com/Valentino-Veljanovski/web-patterns/actions/workflows/ci.yml)

React 19 and Next 16 components and route helpers: motion, scrolling, a WebGL hero background, SVG architecture diagrams, view-transition navigation, SEO metadata, a contact route over Microsoft Graph, hosting files and an on-page assistant. TypeScript sources only, no runtime dependencies, no build step: the package `exports` map points at `src/`, and the consuming app transpiles the files. The repository is not published to npm. Read it, or copy the modules you need.

The four sources: my portfolio site (live), an artist's site (live), a landing page for a 3D-scanning service (prototype, never deployed) and a company site (prototype, never deployed). Each module group below says which of them it comes from.

## What is here

| Module | Exports | Source | State |
| --- | --- | --- | --- |
| `web-patterns/motion` | `usePrefersReducedMotion`, `useScrollReveal`, `ScrollReveal`, `SplitText`, `Typewriter` | portfolio, 3D-service landing page | tested, in the host proof |
| `web-patterns/scroll` | `ReadingProgress`, `BackToTop` | portfolio | tested, in the host proof |
| `web-patterns/graphics` | `HeroShader` | portfolio | tested, in the host proof |
| `web-patterns/diagrams` | `ArchitectureDiagram` | portfolio | tested, in the host proof |
| `web-patterns/navigation` | `useViewTransitionRouter`, `routeMetadata`, `toNextMetadata` | portfolio, artist site | tested, in the host proof |
| `web-patterns/seo` | `createSiteMetadata`, `pageMetadata`, `sitemapEntries`, `robotsRules`, `webManifest`, `JsonLd` and presets, `static/` example files | 3D-service landing page, company site | tested, in the host proof |
| `web-patterns/contact` | `createContactHandler`, `createGraphSender`, `createSlidingWindowLimiter`, `php/` files | 3D-service landing page, company site | tested, in the host proof; the PHP files are documented only, never deployed |
| `web-patterns/hosting/*` | `htaccess.example`, `sw.js` | company site | documented files, never deployed |
| `web-patterns/chat` | `createOnPageAssistant`, `useFloatingChat`, `FloatingChatWidget` | artist site | tested, in the host proof |

**Motion, scroll, graphics, diagrams.** The portfolio's reveal, typewriter, split-text, reading-progress, back-to-top, shader background and architecture diagram, plus the landing page's on-view typewriter folded into the same engine. Three rules hold for every component: the server HTML contains the final text, and client effects animate over it, never before it; `prefers-reduced-motion: reduce` means static, the final state with no transition and no animation frame; scroll and animation handlers write to the DOM through refs, and React re-renders on mount and on real state changes, not per scroll event or typed character.

**Navigation.** `useViewTransitionRouter` wraps the App Router's `push` in `document.startViewTransition` and resolves when the pathname has changed, with a safety timeout, so the new snapshot is taken after the next page exists; the portfolio's version returned right after `push`. `routeMetadata` describes a page's title, description and Open Graph tags once for TanStack Start's `head()` (the artist site) and for Next through `toNextMetadata()`: two frameworks, documented as such.

**SEO.** Pure functions that turn one site config into the root metadata, each page's canonical and Open Graph URLs, and the sitemap, robots and manifest routes; the example app's `app/sitemap.ts`, `app/robots.ts` and `app/manifest.ts` are each a few lines over them. `JsonLd` escapes `<` in values so a `</script>` inside a name cannot close the tag. The `static/` files are the same three files for a host without a framework. From the landing page's metadata snippet and the company site's SEO files.

**Contact.** `createContactHandler` is a route-handler factory with the company site's pipeline (method, rate limit, honeypot, required fields, e-mail format) and the landing page's Microsoft Graph payload, built in the same shape as the n8n repository's mail helper. A transport failure answers with one fixed sentence; the old route sent the error text to the browser. `createGraphSender` is the transport with `fetch` only, no SDK. The PHP handler and its config template are kept as documented files from the company-site prototype, never deployed, not run here.

**Hosting.** The company site's Apache rules and its service worker, as documented example files with the "never deployed" label in their headers: security headers, compression, caching and clean URLs in `htaccess.example`; pre-cache, network-first and an offline page in the service worker `sw.js`.

**Chat.** The artist site's assistant: it answers in the browser from the site's own content, with a keyword match over sources built from the same data that renders the pages; no network request, no model, no provider. `useFloatingChat` keeps the history in localStorage, read only after mount, with a guarded parse. `FloatingChatWidget` is the accessible panel over it.

Design notes with the mechanism behind each group are in [`docs/`](docs/):
[intersection-observer-reveal.md](docs/intersection-observer-reveal.md),
[scroll-animation-patterns.md](docs/scroll-animation-patterns.md),
[svg-architecture-diagrams.md](docs/svg-architecture-diagrams.md),
[seo.md](docs/seo.md),
[contact.md](docs/contact.md),
[hosting.md](docs/hosting.md),
[chat.md](docs/chat.md).

## How it is verified

Two layers. The unit tests prove the logic. Only the built app proves the host.

**Unit tests** (`npm test`): vitest with jsdom, one file per component or module, plus a structure file and a README-claims file. The tests pin the contracts that the earlier versions got wrong: a typewriter that re-rendered per character, a diagram with one shared marker id, a navigation that resolved before the next page existed, a chat widget that read localStorage during render, a contact route that returned the transport's error text, a JSON-LD script that a value could close. Each test names the old behaviour it replaces. The structure file also checks that none of the packages the old snippets pulled in (AI SDK, Azure identity, Graph client, a fetch polyfill) is imported or installed.

**Host proof** (`scripts/host-proof.mjs`): `examples/next-app` is an App Router app that renders every module on nine pages. CI builds it with `next build`, serves it with `next start` and opens every page in Chromium twice, with reduced motion on and off. The script checks HTTP status, console and page errors and failed requests on every page, then the reduced-motion states and reveal timing, the diagram ids, the reading-progress width, the shader flag, the view-transition navigation and its reduced-motion branch, the JSON-LD and the three generated SEO files, the contact route's recorded payload and its 400, and the assistant's answer with zero XHR or fetch requests after the widget opened. It prints every value it measured.

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

## Using a module

```tsx
import { ScrollReveal, Typewriter } from "web-patterns/motion";
import { createContactHandler, createGraphSender } from "web-patterns/contact";
import { createOnPageAssistant, FloatingChatWidget } from "web-patterns/chat";

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
