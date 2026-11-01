import { ScrollReveal, SplitText, Typewriter } from "web-patterns/motion";

const ROLES = [
  "types one line at a time.",
  "pauses with the full line on screen.",
  "deletes it and starts the next.",
];

export default function MotionPage() {
  return (
    <>
      <section className="hero">
        <div className="hero-content">
          <h1 aria-label="Motion patterns">
            <SplitText text="Motion patterns" />
          </h1>
          <p className="lead">
            This typewriter <Typewriter mode="cycle" roles={ROLES} speed={70} waitMs={1800} />
          </p>
          <p>
            Scroll down. The blocks below the fold are hidden after the page has loaded and fade in once they enter
            the viewport. With reduced motion on, everything on this page is static.
          </p>
        </div>
      </section>

      <div className="spacer" aria-hidden="true" />

      <section>
        <ScrollReveal>
          <h2>Below the fold</h2>
        </ScrollReveal>
        <ScrollReveal delay={0.1}>
          <p className="card">
            The server HTML of this block has opacity 1. After hydration the observer reports it as out of view and
            it is hidden without a transition. When you scroll here it slides up and fades in.
          </p>
        </ScrollReveal>
        <ScrollReveal delay={0.2}>
          <p className="card">
            A second block with a longer delay, so the two cascade instead of arriving together.
          </p>
        </ScrollReveal>
      </section>

      <section>
        <h2>
          <Typewriter mode="once" text="Typed once, when in view" speed={60} delay={100} />
        </h2>
        <p>
          The heading above types itself the first time it enters the viewport. Before that an invisible copy
          reserves its width, so the layout does not shift when the letters appear.
        </p>
      </section>
    </>
  );
}
