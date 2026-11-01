import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { useScrollReveal } from "../src/motion/useScrollReveal";
import { installIntersectionObserver } from "./helpers/io";

function Probe(props: { threshold?: number; rootMargin?: string; once?: boolean }) {
  const { ref, isVisible, state } = useScrollReveal<HTMLDivElement>(props);
  return (
    <div ref={ref} data-visible={String(isVisible)} data-state={state}>
      content
    </div>
  );
}

describe("useScrollReveal", () => {
  it("is pending until the observer reports, then hidden or visible", () => {
    const io = installIntersectionObserver();
    const { container } = render(<Probe />);
    const el = container.firstElementChild as HTMLElement;
    expect(el.dataset.state).toBe("pending");
    expect(el.dataset.visible).toBe("false");
    io.trigger(el, false);
    expect(el.dataset.state).toBe("hidden");
    io.trigger(el, true);
    expect(el.dataset.state).toBe("visible");
    expect(el.dataset.visible).toBe("true");
  });

  it("passes threshold and rootMargin to the observer", () => {
    const io = installIntersectionObserver();
    render(<Probe threshold={0.4} rootMargin="0px 0px -10% 0px" />);
    expect(io.observers[0]?.options).toEqual({ threshold: 0.4, rootMargin: "0px 0px -10% 0px" });
  });

  it("fires once and disconnects after the first hit", () => {
    const io = installIntersectionObserver();
    const { container } = render(<Probe />);
    const el = container.firstElementChild as HTMLElement;
    io.trigger(el, true);
    expect(io.observers[0]?.disconnected).toBe(true);
    expect(io.isObserved(el)).toBe(false);
    io.trigger(el, false);
    expect(el.dataset.state).toBe("visible");
  });

  it("with once=false keeps observing and toggles", () => {
    const io = installIntersectionObserver();
    const { container } = render(<Probe once={false} threshold={0} />);
    const el = container.firstElementChild as HTMLElement;
    io.trigger(el, true);
    expect(el.dataset.state).toBe("visible");
    io.trigger(el, false);
    expect(el.dataset.state).toBe("hidden");
    expect(io.observers[0]?.disconnected).toBe(false);
  });

  it("disconnects on unmount", () => {
    const io = installIntersectionObserver();
    const { unmount } = render(<Probe />);
    unmount();
    expect(io.observers[0]?.disconnected).toBe(true);
  });

  it("is visible when IntersectionObserver is missing", () => {
    // jsdom has no IntersectionObserver: content must not stay hidden.
    const { container } = render(<Probe />);
    const el = container.firstElementChild as HTMLElement;
    expect(el.dataset.visible).toBe("true");
    expect(el.dataset.state).toBe("visible");
  });
});
