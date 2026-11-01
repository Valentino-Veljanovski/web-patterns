/**
 * createOnPageAssistant
 * =====================
 * A deterministic assistant that answers from the site's own content. This
 * is what the artist site runs: no model, no endpoint, no network request.
 *
 * `sources` is a list of `{ keywords, answer, link? }` built from the site's
 * data. `answer(text)` scores every source by the number of its keywords
 * that occur in the question as whole words, case-insensitively, and returns
 * the best source's answer with its link. Ties go to the first source in the
 * list, so order the sources by priority. No keyword hit returns the
 * fallback.
 *
 * Pure: no fetch, no timers, no globals. The same question always gives the
 * same answer, which is what the tests pin.
 */

export interface AssistantLink {
  label: string;
  href: string;
}

export interface AssistantSource {
  /** Whole words that select this source, e.g. ["music", "song"]. */
  keywords: string[];
  answer: string;
  link?: AssistantLink;
}

export interface AssistantReply {
  text: string;
  link?: AssistantLink;
}

export interface OnPageAssistantOptions {
  sources: AssistantSource[];
  /** Returned when no keyword matches. */
  fallback: string;
}

export interface OnPageAssistant {
  answer(text: string): AssistantReply;
  readonly sources: ReadonlyArray<AssistantSource>;
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");

/** Whole-word, case-insensitive matcher; letters and digits on either side break the match. */
function keywordMatcher(keyword: string): RegExp {
  return new RegExp(`(?<![\\p{L}\\p{N}])${escapeRe(keyword.trim())}(?![\\p{L}\\p{N}])`, "iu");
}

export function createOnPageAssistant({ sources, fallback }: OnPageAssistantOptions): OnPageAssistant {
  const compiled = sources.map((source) => ({
    source,
    matchers: source.keywords.filter((k) => k.trim() !== "").map(keywordMatcher),
  }));

  return {
    sources,
    answer(text) {
      const question = typeof text === "string" ? text : "";
      let best: AssistantSource | null = null;
      let bestScore = 0;
      for (const { source, matchers } of compiled) {
        const score = matchers.reduce((n, re) => n + (re.test(question) ? 1 : 0), 0);
        if (score > bestScore) {
          best = source;
          bestScore = score;
        }
      }
      if (!best) return { text: fallback };
      return best.link ? { text: best.answer, link: best.link } : { text: best.answer };
    },
  };
}
