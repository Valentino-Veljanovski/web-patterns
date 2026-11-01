"use client";
import { useEffect, useRef, type CSSProperties } from "react";
import { usePrefersReducedMotion } from "../motion/usePrefersReducedMotion";

/**
 * ReadingProgress
 * ===============
 * A fixed bar along the top edge whose width follows the scroll position.
 *
 * The width is written straight to the element from a scroll handler
 * throttled to one requestAnimationFrame per frame. No React state is
 * involved, so scrolling never re-renders anything. The bar is synced
 * once on mount, which covers a browser restoring the scroll position
 * after a reload before any scroll event fires.
 *
 * Theming through CSS variables on any ancestor:
 *   --reading-progress-height   default 2px
 *   --reading-progress-color    default currentColor
 *
 * Under `prefers-reduced-motion: reduce` the bar has no transition.
 * It is aria-hidden: it decorates, it does not inform.
 */

export interface ReadingProgressProps {
  className?: string;
  style?: CSSProperties;
}

export function ReadingProgress({ className, style }: ReadingProgressProps) {
  const reduced = usePrefersReducedMotion();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let rafId = 0;
    let queued = false;

    const compute = () => {
      queued = false;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const progress = max > 0 ? Math.min(window.scrollY / max, 1) : 0;
      el.style.width = `${progress * 100}%`;
    };
    const onScroll = () => {
      if (queued) return;
      queued = true;
      rafId = requestAnimationFrame(compute);
    };

    compute();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      data-reading-progress=""
      className={className}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: 0,
        height: "var(--reading-progress-height, 2px)",
        background: "var(--reading-progress-color, currentColor)",
        zIndex: 9999,
        pointerEvents: "none",
        ...(reduced ? {} : { transition: "width 0.1s linear" }),
        ...style,
      }}
    />
  );
}
