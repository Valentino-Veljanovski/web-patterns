import { describe, expect, it, vi } from "vitest";
import { Profiler, type ProfilerOnRenderCallback } from "react";
import { act, fireEvent, render } from "@testing-library/react";
import { BackToTop } from "../src/scroll/BackToTop";
import { installMatchMedia, REDUCED_MOTION } from "./helpers/matchMedia";
import { installRafClock } from "./helpers/raf";

function setScroll(scrollY: number, scrollHeight = 3000, innerHeight = 800) {
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

const button = (c: HTMLElement) =>
  c.querySelector<HTMLButtonElement>("button[data-back-to-top]") as HTMLButtonElement;

describe("BackToTop", () => {
  it("is out of the a11y tree and tab order while hidden", () => {
    installMatchMedia();
    installRafClock();
    setScroll(0);
    const { container } = render(<BackToTop />);
    const b = button(container);
    expect(b.getAttribute("aria-hidden")).toBe("true");
    expect(b.tabIndex).toBe(-1);
    expect(b.dataset.backToTop).toBe("hidden");
  });

  it("shows after the threshold and is reachable again", () => {
    installMatchMedia();
    const raf = installRafClock();
    setScroll(0);
    const { container } = render(<BackToTop threshold={400} />);
    scrollTo(401);
    raf.frame();
    const b = button(container);
    expect(b.getAttribute("aria-hidden")).toBe("false");
    expect(b.tabIndex).toBe(0);
    expect(b.dataset.backToTop).toBe("visible");
    scrollTo(0);
    raf.frame();
    expect(b.getAttribute("aria-hidden")).toBe("true");
  });

  it("updates the progress ring without re-rendering", () => {
    installMatchMedia();
    const raf = installRafClock();
    setScroll(0);
    let commits = 0;
    const onRender: ProfilerOnRenderCallback = () => {
      commits++;
    };
    const { container } = render(
      <Profiler id="btt" onRender={onRender}>
        <BackToTop />
      </Profiler>,
    );
    scrollTo(1100);
    raf.frame();
    const afterShow = commits; // one commit for the visibility flip
    const ring = container.querySelector<SVGCircleElement>("[data-back-to-top-ring]") as SVGCircleElement;
    const offsetA = ring.style.strokeDashoffset;
    scrollTo(1650); // 75 % of 2200
    raf.frame();
    const offsetB = ring.style.strokeDashoffset;
    expect(offsetA).not.toBe(offsetB);
    expect(commits).toBe(afterShow);
  });

  it("smooth-scrolls to the top on click", () => {
    installMatchMedia();
    const raf = installRafClock();
    const scrollToMock = vi.fn();
    vi.stubGlobal("scrollTo", scrollToMock);
    setScroll(0);
    const { container } = render(<BackToTop />);
    scrollTo(900);
    raf.frame();
    fireEvent.click(button(container));
    expect(scrollToMock).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
  });

  // N4. Old back-to-top-progress.tsx lines 59-65 handled this; the test now pins it.
  it("N4: under reduced motion the click scrolls with behavior auto", () => {
    installMatchMedia({ [REDUCED_MOTION]: true });
    const raf = installRafClock();
    const scrollToMock = vi.fn();
    vi.stubGlobal("scrollTo", scrollToMock);
    setScroll(0);
    const { container } = render(<BackToTop />);
    scrollTo(900);
    raf.frame();
    fireEvent.click(button(container));
    expect(scrollToMock).toHaveBeenCalledWith({ top: 0, behavior: "auto" });
    expect(button(container).style.transition).toBe("");
  });

  // Old lines 70-199: a <style> block with four !important rules.
  it("renders no inline <style> element and styles through CSS variables", () => {
    installMatchMedia();
    installRafClock();
    setScroll(0);
    const { container } = render(<BackToTop />);
    expect(container.querySelector("style")).toBeNull();
    const b = button(container);
    expect(b.style.width).toContain("var(--btt-size");
    expect(b.style.color).toContain("var(--btt-color");
  });

  it("has an accessible name", () => {
    installMatchMedia();
    installRafClock();
    setScroll(0);
    const { container } = render(<BackToTop label="Back to top" />);
    expect(button(container).getAttribute("aria-label")).toBe("Back to top");
  });
});
