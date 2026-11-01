# The on-page assistant

`src/chat/` is the assistant of the artist site, which is live. It answers in the browser from the site's own content and makes no network request: there is no `/api/chat`, no model and no provider key. The old snippet with a streaming route over an AI gateway and a fallback does not describe the live site; its provider path is dropped here, not rewritten.

## Why deterministic

The site has a fixed body of public facts: songs, productions, awards, listening links, how to book. A visitor's question is almost always "where is X" or "how do I Y". A keyword match over the same data that renders the pages answers those questions, cannot invent a date or a price, costs nothing per question, needs no key, and works in a static deployment. A model would add a server, a budget and a way to say things the page does not say.

## createOnPageAssistant

`createOnPageAssistant({ sources, fallback })` takes a list of `{ keywords, answer, link? }` and returns `answer(text)`. Each keyword is matched as a whole word, case-insensitively, so `music` matches "the MUSIC page" and not "musician". The source with the most matching keywords wins; a tie goes to the first in the list, so order the sources by priority. No match returns the fallback. The function is pure: no fetch, no timers, no globals, and the test suite spies on `fetch` and `XMLHttpRequest` to make sure nothing under `src/chat` reaches for them.

Build the sources from the data file that also renders the pages. Then an answer can never say more than the page does, and a new section brings its own keywords.

## useFloatingChat

The hook owns the open flag, the input, the messages, `send`, `reset`, the starter questions and a ref for the scrolling list. `send` appends the question and the answer in one state update; there is no loading state because nothing is awaited.

History is kept in `localStorage`. The old widget read it inside `useMemo` during render, so the server render and the first client render disagreed whenever a visitor had a stored conversation, and a corrupted value threw in the middle of rendering. Here the read happens in an effect after mount: the greeting renders everywhere first, then the stored messages replace it. The parse is guarded (malformed JSON, a non-array, entries without a role are ignored), a message without `parts` renders as empty text, the stored list is capped at `maxStored`, and quota errors on save are swallowed. The tests render the widget with `renderToString` and assert zero `getItem` calls, then mount it and assert exactly one.

## FloatingChatWidget

The presentational layer: a toggle with `aria-expanded` and `aria-controls`, a panel with `role="dialog"` and a label, a labelled input, starter buttons, a reset button, and Escape to close with focus returned to the toggle. Styling is inline with CSS variables (`--chat-bg`, `--chat-fg`, `--chat-accent`, `--chat-border`, `--chat-z`, `--chat-width`) so a stylesheet can retheme it without fighting an injected style block.

The host proof opens the widget on `/chat`, asks about music, checks the answer and counts the XHR and fetch requests after the widget opened. The only ones are the Next link prefetches of the navigation bar, which the proof lists separately; the widget itself makes none.
