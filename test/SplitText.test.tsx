import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { SplitText } from "../src/motion/SplitText";
import { installMatchMedia, REDUCED_MOTION } from "./helpers/matchMedia";

const chars = (c: HTMLElement) => Array.from(c.querySelectorAll<HTMLElement>(".splittext-char"));
const words = (c: HTMLElement) => Array.from(c.querySelectorAll<HTMLElement>(".splittext-word"));

// Family emoji (man, ZWJ, woman, ZWJ, girl): one grapheme, five code points.
const FAMILY = "\u{1F468}‍\u{1F469}‍\u{1F467}";

describe("SplitText", () => {
  // E19a. Old split-text.tsx line 23: Array.from(text) splits a family emoji into code points.
  it("E19a: grapheme-safe: a family emoji plus space, A, b renders 4 grapheme spans", () => {
    installMatchMedia();
    const { container } = render(<SplitText text={`${FAMILY} Ab`} />);
    const spans = chars(container);
    expect(spans).toHaveLength(4);
    expect(spans[0]?.textContent).toBe(FAMILY);
    expect(spans[2]?.textContent).toBe("A");
    expect(spans[3]?.textContent).toBe("b");
  });

  // E19b. Old split-text.tsx line 25: whiteSpace "nowrap" on the whole string.
  it("E19b: wrapping allowed: no nowrap on the wrapper, one inline-block per word", () => {
    installMatchMedia();
    const { container } = render(<SplitText text="AI automation engineer" />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.style.whiteSpace).not.toBe("nowrap");
    const w = words(container);
    expect(w).toHaveLength(3);
    for (const word of w) {
      expect(word.style.display).toBe("inline-block");
      expect(word.style.whiteSpace).toBe("nowrap");
    }
    const spaces = Array.from(container.querySelectorAll<HTMLElement>(".splittext-space"));
    expect(spaces).toHaveLength(2);
    for (const s of spaces) {
      expect(s.style.display).not.toBe("inline-block");
      expect(s.textContent).toBe(" ");
    }
  });

  // E19c. The parent keeps the readable text via its own aria-label; the spans are decoration.
  it("E19c: readable text stays with the parent: spans are aria-hidden and not focusable", () => {
    installMatchMedia();
    const { container } = render(
      <h1 aria-label="AI automation engineer">
        <SplitText text="AI automation engineer" />
      </h1>,
    );
    const h1 = container.querySelector("h1") as HTMLElement;
    expect(h1.getAttribute("aria-label")).toBe("AI automation engineer");
    const root = h1.firstElementChild as HTMLElement;
    expect(root.getAttribute("aria-hidden")).toBe("true");
    for (const span of chars(container)) {
      expect(span.getAttribute("aria-hidden")).toBe("true");
      expect(span.hasAttribute("tabindex")).toBe(false);
    }
    expect(container.querySelector("[tabindex]")).toBeNull();
  });

  it("staggers animation-delay per grapheme from offset", () => {
    installMatchMedia();
    const { container } = render(<SplitText text="ab c" offset={100} stagger={20} />);
    const delays = chars(container).map((s) => s.style.animationDelay);
    expect(delays).toEqual(["100ms", "120ms", "140ms", "160ms"]);
  });

  it("N4: under reduced motion every span is static and visible", () => {
    installMatchMedia({ [REDUCED_MOTION]: true });
    const { container } = render(<SplitText text="AI automation" />);
    const spans = chars(container);
    expect(spans.length).toBeGreaterThan(0);
    for (const span of spans) {
      expect(span.style.animationDelay).toBe("");
      expect(span.style.animation).toBe("none");
      expect(span.style.opacity === "" || span.style.opacity === "1").toBe(true);
    }
  });

  it("empty text renders no spans and does not throw", () => {
    installMatchMedia();
    const { container } = render(<SplitText text="" />);
    expect(chars(container)).toHaveLength(0);
  });
});
