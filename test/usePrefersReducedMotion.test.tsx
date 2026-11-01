import { describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { usePrefersReducedMotion } from "../src/motion/usePrefersReducedMotion";
import { installMatchMedia, REDUCED_MOTION } from "./helpers/matchMedia";

function Probe() {
  const reduced = usePrefersReducedMotion();
  return <span>{String(reduced)}</span>;
}

describe("usePrefersReducedMotion", () => {
  it("is false when matchMedia does not exist", () => {
    // jsdom ships no matchMedia; the hook must not throw and must default to motion on.
    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(false);
  });

  it("reads the media query on the client", () => {
    installMatchMedia({ [REDUCED_MOTION]: true });
    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(true);
  });

  it("follows change events", () => {
    const mm = installMatchMedia();
    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(false);
    mm.setReducedMotion(true);
    expect(result.current).toBe(true);
    mm.setReducedMotion(false);
    expect(result.current).toBe(false);
  });

  it("renders false on the server even when the client would say true", () => {
    installMatchMedia({ [REDUCED_MOTION]: true });
    expect(renderToString(<Probe />)).toContain("false");
  });

  it("removes its listener on unmount", () => {
    const mm = installMatchMedia();
    const { unmount } = renderHook(() => usePrefersReducedMotion());
    expect(mm.listenerCount(REDUCED_MOTION)).toBe(1);
    unmount();
    expect(mm.listenerCount(REDUCED_MOTION)).toBe(0);
  });
});
