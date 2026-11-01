"use client";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { usePrefersReducedMotion } from "../motion/usePrefersReducedMotion";

/**
 * BackToTop
 * =========
 * A round button in the bottom-right corner with a ring that fills as the
 * page is read. It appears after `threshold` px of scrolling and scrolls
 * back to the top on click.
 *
 * - The ring offset is written to the SVG element from a rAF-throttled
 *   scroll handler. React state changes only when the button flips between
 *   hidden and visible.
 * - While hidden the button is aria-hidden, out of the tab order and
 *   ignores pointer events.
 * - Styling is inline with CSS variables, so a stylesheet can retheme it
 *   by setting variables, with no injected <style> block to fight:
 *     --btt-size (48px) --btt-offset (24px) --btt-color (currentColor)
 *     --btt-bg (transparent) --btt-border (currentColor) --btt-z (100)
 *   Hover and focus styles belong to the consumer's stylesheet, e.g.
 *   `[data-back-to-top]:focus-visible { outline: 2px solid var(--btt-color); }`.
 * - Under `prefers-reduced-motion: reduce` there is no transition and the
 *   click uses `behavior: "auto"` instead of smooth scrolling.
 */

const RING_RADIUS = 28;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export interface BackToTopProps {
  /** Scroll distance in px before the button shows. Default 400. */
  threshold?: number;
  /** Accessible name. Default "Scroll to top". */
  label?: string;
  className?: string;
  style?: CSSProperties;
}

export function BackToTop({ threshold = 400, label = "Scroll to top", className, style }: BackToTopProps) {
  const reduced = usePrefersReducedMotion();
  const [visible, setVisible] = useState(false);
  const ringRef = useRef<SVGCircleElement>(null);
  const visibleRef = useRef(false);

  useEffect(() => {
    let rafId = 0;
    const update = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const progress = max > 0 ? Math.min(window.scrollY / max, 1) : 0;
      const ring = ringRef.current;
      if (ring) ring.style.strokeDashoffset = String(RING_CIRCUMFERENCE * (1 - progress));
      // Only a real flip reaches React; same-value sets would still cost a render.
      const next = window.scrollY > threshold;
      if (next !== visibleRef.current) {
        visibleRef.current = next;
        setVisible(next);
      }
    };
    const onScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    onScroll();
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [threshold]);

  const handleClick = useCallback(() => {
    window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
  }, [reduced]);

  const transition = reduced
    ? {}
    : { transition: "opacity 0.45s cubic-bezier(0.4, 0, 0.2, 1), transform 0.45s cubic-bezier(0.4, 0, 0.2, 1)" };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={className}
      data-back-to-top={visible ? "visible" : "hidden"}
      aria-label={label}
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      style={{
        position: "fixed",
        bottom: "var(--btt-offset, 24px)",
        right: "var(--btt-offset, 24px)",
        zIndex: "var(--btt-z, 100)" as unknown as number,
        width: "var(--btt-size, 48px)",
        height: "var(--btt-size, 48px)",
        padding: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--btt-bg, transparent)",
        border: "1px solid var(--btt-border, currentColor)",
        borderRadius: "50%",
        cursor: "pointer",
        color: "var(--btt-color, currentColor)",
        opacity: visible ? 1 : 0,
        transform: visible || reduced ? "none" : "translateY(12px) scale(0.9)",
        pointerEvents: visible ? "auto" : "none",
        ...transition,
        ...style,
      }}
    >
      <svg
        viewBox="0 0 60 60"
        aria-hidden="true"
        style={{ position: "absolute", inset: -6, width: "calc(100% + 12px)", height: "calc(100% + 12px)", pointerEvents: "none", overflow: "visible" }}
      >
        <circle cx="30" cy="30" r={RING_RADIUS} fill="none" stroke="currentColor" strokeOpacity={0.2} strokeWidth={1.5} />
        <circle
          ref={ringRef}
          data-back-to-top-ring=""
          cx="30"
          cy="30"
          r={RING_RADIUS}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeDasharray={RING_CIRCUMFERENCE}
          transform="rotate(-90 30 30)"
          style={{ strokeDashoffset: RING_CIRCUMFERENCE, ...(reduced ? {} : { transition: "stroke-dashoffset 250ms ease-out" }) }}
        />
      </svg>
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ width: "38%", height: "38%", position: "relative" }}
      >
        <path d="M12 19V5M5 12l7-7 7 7" />
      </svg>
    </button>
  );
}
