"use client";
import type { CSSProperties } from "react";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

/**
 * SplitText
 * =========
 * Renders `text` as one span per grapheme with a staggered `animation-delay`,
 * so a stylesheet keyframe on `.splittext-char` can bring the letters in one
 * after another:
 *
 *   .splittext-char { animation: splittext-in 0.5s ease both; }
 *   @keyframes splittext-in { from { opacity: 0; transform: translateY(0.4em); } to { opacity: 1; transform: none; } }
 *
 * Without such a rule the text is simply visible.
 *
 * Structure:
 *   <span aria-hidden>                     the wrapper, inline, wraps freely
 *     <span class="splittext-word">        inline-block, nowrap: a word never breaks inside
 *       <span class="splittext-char">g</span> ...
 *     </span>
 *     <span class="splittext-char splittext-space"> </span>   a real space: line breaks happen here
 *     ...
 *   </span>
 *
 * Graphemes come from Intl.Segmenter when available (a family emoji is one
 * span, not five), with Array.from as the fallback.
 *
 * Accessibility contract: everything here is decoration and aria-hidden.
 * The PARENT element (h1, h2, p) must carry `aria-label` with the readable
 * text. This component never sets aria-label itself, so it cannot shadow
 * or duplicate the parent's. No span is focusable.
 *
 * Under `prefers-reduced-motion: reduce` every span gets `animation: none`
 * and no delay, so the text is static and visible at once.
 */

export interface SplitTextProps {
  text: string;
  /** Delay in ms before the first grapheme. Default 0. */
  offset?: number;
  /** Delay in ms between graphemes. Default 28. */
  stagger?: number;
  className?: string;
}

interface Token {
  kind: "word" | "space";
  graphemes: string[];
}

export function splitGraphemes(text: string): string[] {
  if (typeof Intl !== "undefined" && typeof Intl.Segmenter === "function") {
    const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
    return Array.from(segmenter.segment(text), (s) => s.segment);
  }
  return Array.from(text);
}

function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  for (const g of splitGraphemes(text)) {
    const kind: Token["kind"] = /^\s$/.test(g) ? "space" : "word";
    const last = tokens[tokens.length - 1];
    if (last && last.kind === kind && kind === "word") last.graphemes.push(g);
    else tokens.push({ kind, graphemes: [g] });
  }
  return tokens;
}

export function SplitText({ text, offset = 0, stagger = 28, className }: SplitTextProps) {
  const reduced = usePrefersReducedMotion();
  const tokens = tokenize(text);
  let index = 0;

  const charStyle = (inlineBlock: boolean): CSSProperties => {
    const i = index++;
    if (reduced) return { animation: "none" };
    const style: CSSProperties = { animationDelay: `${offset + i * stagger}ms` };
    if (inlineBlock) style.display = "inline-block";
    return style;
  };

  return (
    <span className={className} aria-hidden="true" data-splittext={reduced ? "static" : "animated"}>
      {tokens.map((token, t) =>
        token.kind === "word" ? (
          <span key={t} className="splittext-word" style={{ display: "inline-block", whiteSpace: "nowrap" }}>
            {token.graphemes.map((g, i) => (
              <span key={i} className="splittext-char" aria-hidden="true" style={charStyle(true)}>
                {g}
              </span>
            ))}
          </span>
        ) : (
          token.graphemes.map((g, i) => (
            <span key={`${t}-${i}`} className="splittext-char splittext-space" aria-hidden="true" style={charStyle(false)}>
              {g}
            </span>
          ))
        ),
      )}
    </span>
  );
}
