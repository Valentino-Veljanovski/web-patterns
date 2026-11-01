"use client";
import { useEffect, useRef, useState, useSyncExternalStore, type RefObject } from "react";

/**
 * useScrollReveal
 * ===============
 * The one IntersectionObserver in this repository. Attach `ref` to an
 * element and read `state`:
 *
 *   "pending"  the observer has not reported yet (server render, first paint)
 *   "hidden"   the element is out of view
 *   "visible"  the element has entered the viewport
 *
 * `isVisible` is `state === "visible"`. With the default `once: true` the
 * observer disconnects after the first hit and the state stays "visible"
 * for good. With `once: false` it keeps observing and toggles between
 * "hidden" and "visible" (used by HeroShader to pause off-screen).
 *
 * The three-state design lets a consumer render the final state in the
 * server HTML and hide an element only once the browser has confirmed it
 * is out of view. Blocks already in view at load never flicker.
 *
 * Where IntersectionObserver does not exist the state is "visible", so
 * content is never trapped in a hidden state.
 */

export type ScrollRevealState = "pending" | "hidden" | "visible";

export interface UseScrollRevealOptions {
  /** Fraction of the element that must be in view. Default 0.15. */
  threshold?: number;
  /** Margin around the root, CSS syntax, e.g. "0px 0px -10% 0px". */
  rootMargin?: string;
  /** Disconnect after the first hit. Default true. */
  once?: boolean;
  /** When false no observer is created and the state is "visible". Default true. */
  enabled?: boolean;
}

export interface UseScrollRevealResult<T extends Element> {
  ref: RefObject<T | null>;
  isVisible: boolean;
  state: ScrollRevealState;
}

const subscribeNever = () => () => {};
const supportedOnClient = () => typeof IntersectionObserver !== "undefined";
const supportedOnServer = () => true;

export function useScrollReveal<T extends Element = HTMLDivElement>(
  options: UseScrollRevealOptions = {},
): UseScrollRevealResult<T> {
  const { threshold = 0.15, rootMargin, once = true, enabled = true } = options;
  const ref = useRef<T>(null);
  const [observed, setObserved] = useState<ScrollRevealState>("pending");
  // Server: assume support so the server HTML carries the "pending" state.
  // Client: the real answer, read synchronously in the first render.
  const supported = useSyncExternalStore(subscribeNever, supportedOnClient, supportedOnServer);

  useEffect(() => {
    const el = ref.current;
    if (!enabled || !el || typeof IntersectionObserver === "undefined") return;

    const init: IntersectionObserverInit = rootMargin === undefined ? { threshold } : { threshold, rootMargin };
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          setObserved("visible");
          if (once) observer.disconnect();
        } else {
          setObserved("hidden");
        }
      }
    }, init);

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, rootMargin, once, enabled]);

  const state: ScrollRevealState = !enabled || !supported ? "visible" : observed;
  return { ref, isVisible: state === "visible", state };
}
