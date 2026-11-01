# Reveal on scroll with one IntersectionObserver

`useScrollReveal` is the only IntersectionObserver in this repository. `ScrollReveal`, the viewport-triggered `Typewriter` and `HeroShader` all use it. One implementation, one set of tests.

## Three states, not two

The usual hook returns a boolean: visible or not. That forces a choice on the first render. Render hidden, and a block that is already in view at load fades in from nothing, which reads as a flash. Render visible, and you cannot tell a block that is still waiting from one that has been revealed.

The hook here returns a state:

- `pending`: the observer has not reported yet. This is what the server renders and what the browser paints first.
- `hidden`: the browser has confirmed the block is out of view.
- `visible`: the block has entered the viewport.

`ScrollReveal` maps the states to styles. `pending` and `visible` show the content. Only `hidden` sets opacity 0 and a translate. The hide has no transition, so it is instant and nobody sees it; the reveal has one.

Two things follow. The server HTML always contains the final content, visible. And a block that is in view when the page loads never animates, because its first report is "intersecting" and it goes from `pending` straight to `visible`.

## Fire once

With the default `once: true` the observer disconnects after the first hit, so scrolling up and down does not replay the animation. `HeroShader` passes `once: false` to keep receiving enter and leave reports and pause its render loop off screen.

## Reduced motion

`usePrefersReducedMotion` wraps `matchMedia("(prefers-reduced-motion: reduce)")` in `useSyncExternalStore`. It is `false` on the server, reads the real value in the first client render and follows change events. When it is `true`, `ScrollReveal` ignores the observer state and renders the final state with no transform and no transition. The test for this fires a change event after mount and checks that the wrapper switches to static.

## Where the observer does not exist

Old browsers and jsdom have no IntersectionObserver. The hook then reports `visible`, so content is never trapped behind a hidden state.

## Knobs

- `threshold`: fraction of the element that must be in view before it counts. `ScrollReveal` uses 0.12, the typewriter 0.5 because a short heading should be clearly in view before it starts typing.
- `rootMargin`: CSS-style margins around the viewport, for triggering a little early or late.
- `delay` on `ScrollReveal`: seconds, so siblings can cascade with 0, 0.1, 0.2.
