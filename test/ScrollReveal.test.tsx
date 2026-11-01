import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { ScrollReveal } from "../src/motion/ScrollReveal";
import { installIntersectionObserver } from "./helpers/io";
import { installMatchMedia, REDUCED_MOTION } from "./helpers/matchMedia";

function wrapper(container: HTMLElement) {
  return container.firstElementChild as HTMLElement;
}

describe("ScrollReveal", () => {
  it("renders its children", () => {
    installMatchMedia();
    installIntersectionObserver();
    const { getByText } = render(
      <ScrollReveal>
        <p>Paragraph</p>
      </ScrollReveal>,
    );
    expect(getByText("Paragraph")).toBeTruthy();
  });

  it("server HTML shows the final state (opacity 1, no transform)", () => {
    installMatchMedia();
    const html = renderToString(
      <ScrollReveal>
        <p>Paragraph</p>
      </ScrollReveal>,
    );
    expect(html).toContain("opacity:1");
    expect(html).not.toContain("translateY");
  });

  it("hides after the observer reports out of view, then reveals with a transition", () => {
    installMatchMedia();
    const io = installIntersectionObserver();
    const { container } = render(
      <ScrollReveal delay={0.2}>
        <p>Paragraph</p>
      </ScrollReveal>,
    );
    const el = wrapper(container);
    expect(el.style.opacity).toBe("1");
    io.trigger(el, false);
    expect(el.style.opacity).toBe("0");
    expect(el.style.transform).toContain("translateY");
    io.trigger(el, true);
    expect(el.style.opacity).toBe("1");
    expect(el.style.transform).toBe("none");
    expect(el.style.transition).toContain("0.2s");
  });

  it("does not hide a block that is already in view when first observed", () => {
    installMatchMedia();
    const io = installIntersectionObserver();
    const { container } = render(
      <ScrollReveal>
        <p>Above the fold</p>
      </ScrollReveal>,
    );
    const el = wrapper(container);
    io.trigger(el, true);
    expect(el.style.opacity).toBe("1");
    expect(el.style.transform).toBe("none");
  });

  // N4. Old scroll-reveal-wrapper.tsx lines 24-27 admit it ignores prefers-reduced-motion.
  it("N4: under reduced motion the wrapper has opacity 1 and no transform or transition before any trigger", () => {
    installMatchMedia({ [REDUCED_MOTION]: true });
    const io = installIntersectionObserver();
    const { container } = render(
      <ScrollReveal delay={0.3}>
        <p>Paragraph</p>
      </ScrollReveal>,
    );
    const el = wrapper(container);
    expect(el.style.opacity).toBe("1");
    expect(el.style.transform).toBe("");
    expect(el.style.transition).toBe("");
    io.trigger(el, false);
    expect(el.style.opacity).toBe("1");
    expect(el.style.transform).toBe("");
    expect(el.style.transition).toBe("");
  });

  it("N4: reacts to a change event and switches to the static state", () => {
    const mm = installMatchMedia();
    const io = installIntersectionObserver();
    const { container } = render(
      <ScrollReveal>
        <p>Paragraph</p>
      </ScrollReveal>,
    );
    const el = wrapper(container);
    io.trigger(el, false);
    expect(el.style.opacity).toBe("0");
    mm.setReducedMotion(true);
    expect(el.style.opacity).toBe("1");
    expect(el.style.transform).toBe("");
    expect(el.style.transition).toBe("");
  });

  it("passes className and threshold through", () => {
    installMatchMedia();
    const io = installIntersectionObserver();
    const { container } = render(
      <ScrollReveal className="card" threshold={0.5}>
        <p>Paragraph</p>
      </ScrollReveal>,
    );
    expect(wrapper(container).classList.contains("card")).toBe(true);
    expect(io.observers[0]?.options?.threshold).toBe(0.5);
  });
});
