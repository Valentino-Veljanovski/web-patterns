import { describe, expect, it } from "vitest";
import { Profiler, type ProfilerOnRenderCallback } from "react";
import { act, render } from "@testing-library/react";
import { ReadingProgress } from "../src/scroll/ReadingProgress";
import { installMatchMedia, REDUCED_MOTION } from "./helpers/matchMedia";
import { installRafClock } from "./helpers/raf";

function setScroll(scrollY: number, scrollHeight = 1500, innerHeight = 500) {
  Object.defineProperty(window, "scrollY", { configurable: true, writable: true, value: scrollY });
  Object.defineProperty(window, "innerHeight", { configurable: true, writable: true, value: innerHeight });
  Object.defineProperty(document.documentElement, "scrollHeight", {
    configurable: true,
    get: () => scrollHeight,
  });
}

function scrollTo(y: number) {
  setScroll(y);
  act(() => {
    window.dispatchEvent(new Event("scroll"));
  });
}

const bar = (c: HTMLElement) => c.querySelector<HTMLElement>("[data-reading-progress]") as HTMLElement;

describe("ReadingProgress", () => {
  it("syncs on mount without waiting for a scroll event", () => {
    installMatchMedia();
    installRafClock();
    setScroll(500);
    const { container } = render(<ReadingProgress />);
    expect(bar(container).style.width).toBe("50%");
  });

  // Old reading-progress.tsx line 15: setProgress on every rAF, so a React commit per scroll frame.
  it("writes width to the element from a rAF-throttled handler, with no re-render", () => {
    installMatchMedia();
    const raf = installRafClock();
    setScroll(0);
    let commits = 0;
    const onRender: ProfilerOnRenderCallback = () => {
      commits++;
    };
    const { container } = render(
      <Profiler id="rp" onRender={onRender}>
        <ReadingProgress />
      </Profiler>,
    );
    expect(commits).toBe(1);
    scrollTo(250);
    scrollTo(500);
    scrollTo(750);
    // Three scroll events, one pending frame.
    expect(raf.pending).toBe(1);
    raf.frame();
    expect(bar(container).style.width).toBe("75%");
    scrollTo(1000);
    raf.frame();
    expect(bar(container).style.width).toBe("100%");
    expect(commits).toBe(1);
  });

  it("is hidden from assistive technology", () => {
    installMatchMedia();
    installRafClock();
    setScroll(0);
    const { container } = render(<ReadingProgress />);
    expect(bar(container).getAttribute("aria-hidden")).toBe("true");
  });

  it("N4: under reduced motion the bar has no transition", () => {
    installMatchMedia({ [REDUCED_MOTION]: true });
    installRafClock();
    setScroll(0);
    const { container } = render(<ReadingProgress />);
    expect(bar(container).style.transition).toBe("");
  });

  it("has a width transition when motion is allowed", () => {
    installMatchMedia();
    installRafClock();
    setScroll(0);
    const { container } = render(<ReadingProgress />);
    expect(bar(container).style.transition).toContain("width");
  });

  it("removes its listener on unmount", () => {
    installMatchMedia();
    const raf = installRafClock();
    setScroll(0);
    const { unmount } = render(<ReadingProgress />);
    unmount();
    scrollTo(500);
    expect(raf.pending).toBe(0);
  });
});
