"use client";
import type { CSSProperties, ReactNode } from "react";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";
import { useScrollReveal } from "./useScrollReveal";

/**
 * ScrollReveal
 * ============
 * Fades and slides its children in the first time they scroll into view.
 *
 *   <ScrollReveal>            <h2>Heading</h2></ScrollReveal>
 *   <ScrollReveal delay={0.1}><p>Paragraph</p></ScrollReveal>
 *
 * Mechanism, in order:
 *   1. Server HTML and first paint: final state (opacity 1, no transform).
 *   2. After mount the observer reports. In view: nothing changes, the
 *      block never animates. Out of view: the block is hidden without a
 *      transition.
 *   3. When it enters the viewport it transitions to the final state.
 *
 * Under `prefers-reduced-motion: reduce` the block always renders its
 * final state: no transform, no transition, regardless of the observer.
 */

export interface ScrollRevealProps {
  children: ReactNode;
  /** Transition delay in seconds; stagger siblings with 0, 0.1, 0.2. */
  delay?: number;
  /** Transition duration in seconds. Default 0.7. */
  duration?: number;
  /** Slide distance in px. Default 24. */
  distance?: number;
  /** Observer threshold. Default 0.12. */
  threshold?: number;
  rootMargin?: string;
  className?: string;
  style?: CSSProperties;
}

export function ScrollReveal({
  children,
  delay = 0,
  duration = 0.7,
  distance = 24,
  threshold = 0.12,
  rootMargin,
  className,
  style,
}: ScrollRevealProps) {
  const reduced = usePrefersReducedMotion();
  const { ref, state } = useScrollReveal<HTMLDivElement>({ threshold, rootMargin });

  let motion: CSSProperties;
  if (reduced || state === "pending") {
    motion = { opacity: 1 };
  } else if (state === "hidden") {
    // No transition here: hiding must be instant, only the reveal animates.
    motion = { opacity: 0, transform: `translateY(${distance}px)` };
  } else {
    motion = {
      opacity: 1,
      transform: "none",
      transition: `opacity ${duration}s ease ${delay}s, transform ${duration}s ease ${delay}s`,
    };
  }

  return (
    <div
      ref={ref}
      className={className}
      data-scroll-reveal={reduced ? "static" : state}
      style={{ ...style, ...motion }}
    >
      {children}
    </div>
  );
}
