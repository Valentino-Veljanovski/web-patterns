"use client";
import { useSyncExternalStore } from "react";

/**
 * usePrefersReducedMotion
 * =======================
 * Reads `(prefers-reduced-motion: reduce)` and follows its change events.
 *
 * - On the server (and during hydration) the value is `false`, so the
 *   server HTML is the same for every visitor; the real preference is
 *   applied in the first client render after mount.
 * - In environments without `matchMedia` (very old browsers, jsdom) the
 *   value is `false`: motion stays on rather than throwing.
 *
 * Every motion component in this repository calls this hook and renders
 * its final, static state when it returns `true`.
 */

const QUERY = "(prefers-reduced-motion: reduce)";

function hasMatchMedia(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function";
}

function subscribe(onChange: () => void): () => void {
  if (!hasMatchMedia()) return () => {};
  const mql = window.matchMedia(QUERY);
  if (typeof mql.addEventListener === "function") {
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }
  // Safari before 14 only had the deprecated pair.
  mql.addListener(onChange);
  return () => mql.removeListener(onChange);
}

function getSnapshot(): boolean {
  return hasMatchMedia() && window.matchMedia(QUERY).matches;
}

function getServerSnapshot(): boolean {
  return false;
}

export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
