# Scroll animation patterns

Two patterns for a page that moves without being noisy: a reveal for blocks of content and a typewriter for one heading per section. A third component, `SplitText`, staggers the letters of a title. All three go static under reduced motion.

## Reveal

`ScrollReveal` is described in [intersection-observer-reveal.md](intersection-observer-reveal.md). Use it for paragraphs, cards and images below the fold. Do not wrap the hero in it; the component would not animate the hero anyway, since a block in view at load goes straight to its final state.

## Typewriter, one engine, two modes

`Typewriter` types text one character at a time. In `cycle` mode it types a line, waits, deletes it and moves to the next, forever. In `once` mode it types one text the first time the element enters the viewport, through `useScrollReveal`.

The engine is a `requestAnimationFrame` loop. Each frame it checks whether enough time has passed for the next step and, if so, writes the new text to a span through a ref. React is not involved: the component commits on mount and when the mode or the viewport state changes, never per character.

The list of lines lives in a ref that is refreshed after every render. A parent re-render that passes a new array with the same content does not restart the animation. A list that shrinks clamps the current index instead of reading past the end.

The loop pauses when the document is hidden and resumes when it is visible again, with the paused time credited so the next character does not fire at once. In `once` mode the loop stops when the text is complete and no further frame is requested.

Layout: before typing starts, an invisible copy of the longest line reserves the width. Nothing shifts when the letters appear. A visually hidden span carries the full first line for screen readers; the typed span is `aria-hidden`.

## SplitText

`SplitText` renders one span per grapheme with a staggered `animation-delay` and leaves the keyframe to the stylesheet:

```css
.splittext-char { animation: splittext-in 0.5s ease both; }
@keyframes splittext-in {
  from { opacity: 0; transform: translateY(0.4em); }
  to { opacity: 1; transform: none; }
}
```

Graphemes come from `Intl.Segmenter`, so a flag or a family emoji is one span. Words are `inline-block` with `nowrap`, spaces between them are ordinary inline text, so a line can break between words and never inside one. The parent heading carries `aria-label` with the readable text; every span is decoration and `aria-hidden`.

## Reduced motion

Every component reads `usePrefersReducedMotion`. Reveal shows the final state with no transition. Typewriter renders the full first line synchronously and requests no frame. SplitText sets `animation: none` on every span. The tests flip the media query after mount and check the switch.

## When to use which

- Reveal for most content below the fold.
- One typewriter per section at most. Two typing at once reads like a chat demo.
- SplitText for a single title. Long paragraphs do not benefit from staggered letters.
