import { afterEach, describe, expect, it } from "vitest";
import { Profiler, type ProfilerOnRenderCallback } from "react";
import { render } from "@testing-library/react";
import { Typewriter } from "../src/motion/Typewriter";
import { installMatchMedia, REDUCED_MOTION } from "./helpers/matchMedia";
import { installRafClock } from "./helpers/raf";
import { installIntersectionObserver } from "./helpers/io";
import { resetDocumentVisibility, setDocumentVisibility } from "./helpers/visibility";

const FRAME = 16;
const output = (c: HTMLElement) => c.querySelector<HTMLElement>("[data-typewriter-output]");
const text = (c: HTMLElement) => output(c)?.textContent ?? "";

afterEach(() => resetDocumentVisibility());

describe("Typewriter E17", () => {
  // Old typewriter-cycle.tsx lines 84 and 99: setDisplayText per character, so one commit per character.
  it("E17a: renders at most twice per cycle", () => {
    installMatchMedia();
    const raf = installRafClock(FRAME);
    let commits = 0;
    const onRender: ProfilerOnRenderCallback = () => {
      commits++;
    };
    const role = "Workflow Dev"; // 12 characters
    expect(role).toHaveLength(12);
    const { container } = render(
      <Profiler id="tw" onRender={onRender}>
        <Typewriter mode="cycle" roles={[role]} speed={10} waitMs={40} deleteSpeed={10} />
      </Profiler>,
    );
    raf.advance(12 * FRAME);
    expect(text(container)).toBe(role);
    raf.advance(6 * FRAME);
    const mid = text(container).length;
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(12);
    raf.advance(40 * FRAME);
    expect(commits).toBeLessThanOrEqual(2);
  });

  // Old line 109: the effect depends on `roles` identity, so every parent render restarts the cycle.
  it("E17b: stable deps: same roles content does not restart", () => {
    installMatchMedia();
    const raf = installRafClock(FRAME);
    const { container, rerender } = render(
      <Typewriter mode="cycle" roles={["Automation", "Workflow"]} speed={10} />,
    );
    raf.advance(5 * FRAME);
    expect(text(container)).toBe("Autom");
    rerender(<Typewriter mode="cycle" roles={["Automation", "Workflow"]} speed={10} />);
    raf.advance(FRAME);
    expect(text(container)).toBe("Automa");
  });

  // Old lines 78 and 81: roles[s.roleIndex] is undefined after the array shrinks, TypeError on .length.
  it("E17c: roles array shrinks without throwing", () => {
    installMatchMedia();
    const raf = installRafClock(FRAME);
    const { container, rerender } = render(
      <Typewriter mode="cycle" roles={["Aa", "Bb", "Cc"]} speed={10} waitMs={10} deleteSpeed={10} />,
    );
    // Frames 1-2 type "Aa", 3 waits, 4-5 delete, 6-7 type "Bb", 8 waits, 9-10 delete, 11 types "C".
    raf.advance(11 * FRAME);
    expect(text(container)).toBe("C");
    expect(() => {
      rerender(<Typewriter mode="cycle" roles={["Zz"]} speed={10} waitMs={10} deleteSpeed={10} />);
      raf.advance(2 * FRAME);
    }).not.toThrow();
    const t = text(container);
    expect(t.length).toBeGreaterThan(0);
    expect("Zz".startsWith(t)).toBe(true);
    raf.advance(20 * FRAME);
    expect("Zz".startsWith(text(container))).toBe(true);
  });

  // Old: setInterval keeps ticking in background tabs.
  it("E17d: pauses while the document is hidden", () => {
    installMatchMedia();
    const raf = installRafClock(FRAME);
    const { container } = render(<Typewriter mode="cycle" roles={["Automation"]} speed={10} />);
    raf.advance(3 * FRAME);
    expect(text(container)).toBe("Aut");
    setDocumentVisibility("hidden");
    raf.advance(10 * FRAME);
    expect(text(container)).toBe("Aut");
    setDocumentVisibility("visible");
    raf.advance(3 * FRAME);
    expect(text(container).length).toBeGreaterThan(3);
  });

  // Old typewriter-on-view.tsx line 82: private IntersectionObserver (D14). Now useScrollReveal.
  it("E17e: once mode types when visible", () => {
    installMatchMedia();
    const raf = installRafClock(FRAME);
    const io = installIntersectionObserver();
    const { container } = render(<Typewriter mode="once" text="Contact" speed={10} delay={0} />);
    const root = container.firstElementChild as HTMLElement;
    raf.advance(5 * FRAME);
    expect(text(container)).toBe("");
    // CLS guard: the full text already reserves its width, invisibly.
    const placeholder = container.querySelector<HTMLElement>("[data-typewriter-placeholder]");
    expect(placeholder?.textContent).toBe("Contact");
    expect(placeholder?.style.visibility).toBe("hidden");
    io.trigger(root, true);
    raf.advance(5 * FRAME);
    expect(text(container).length).toBeGreaterThan(0);
    expect("Contact".startsWith(text(container))).toBe(true);
    raf.advance(20 * FRAME);
    expect(text(container)).toBe("Contact");
    // Once mode stops its loop when the text is complete.
    const before = raf.requested;
    raf.advance(5 * FRAME);
    expect(raf.requested).toBe(before);
  });

  it("E17e: once mode honours delay before the first character", () => {
    installMatchMedia();
    const raf = installRafClock(FRAME);
    const io = installIntersectionObserver();
    const { container } = render(<Typewriter mode="once" text="Contact" speed={10} delay={100} />);
    io.trigger(container.firstElementChild as HTMLElement, true);
    raf.advance(4 * FRAME); // 64 ms < 100 ms
    expect(text(container)).toBe("");
    raf.advance(4 * FRAME);
    expect(text(container).length).toBeGreaterThan(0);
  });

  it("E17f: empty roles / empty text render nothing and do not throw", () => {
    installMatchMedia();
    installRafClock(FRAME);
    const a = render(<Typewriter mode="cycle" roles={[]} />);
    expect(a.container.innerHTML).toBe("");
    const b = render(<Typewriter mode="once" text="" />);
    expect(b.container.innerHTML).toBe("");
  });

  it("writes the typed text through a ref, not through React children", () => {
    installMatchMedia();
    const raf = installRafClock(FRAME);
    const { container } = render(<Typewriter mode="cycle" roles={["Automation"]} speed={10} />);
    raf.advance(2 * FRAME);
    const out = output(container) as HTMLElement;
    expect(out.textContent).toBe("Au");
    expect(out.childNodes).toHaveLength(1);
    expect(out.childNodes[0]?.nodeType).toBe(Node.TEXT_NODE);
  });
});

describe("Typewriter N4", () => {
  it("N4: under reduced motion the full first role is in the DOM synchronously and no frame is requested", () => {
    installMatchMedia({ [REDUCED_MOTION]: true });
    const raf = installRafClock(FRAME);
    const { container } = render(<Typewriter mode="cycle" roles={["Automation", "Workflow"]} />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.dataset.typewriter).toBe("static");
    expect(root.textContent).toBe("Automation");
    expect(output(container)).toBeNull();
    expect(raf.requested).toBe(0);
    raf.advance(10 * FRAME);
    expect(raf.requested).toBe(0);
  });

  it("N4: once mode under reduced motion shows the text without waiting for the viewport", () => {
    installMatchMedia({ [REDUCED_MOTION]: true });
    const raf = installRafClock(FRAME);
    installIntersectionObserver();
    const { container } = render(<Typewriter mode="once" text="Contact" />);
    expect((container.firstElementChild as HTMLElement).textContent).toBe("Contact");
    expect(raf.requested).toBe(0);
  });

  it("N4: reacts to a change event and switches to the static state", () => {
    const mm = installMatchMedia();
    const raf = installRafClock(FRAME);
    const { container } = render(<Typewriter mode="cycle" roles={["Automation", "Workflow"]} speed={10} />);
    raf.advance(3 * FRAME);
    expect(text(container)).toBe("Aut");
    mm.setReducedMotion(true);
    const root = container.firstElementChild as HTMLElement;
    expect(root.dataset.typewriter).toBe("static");
    expect(root.textContent).toBe("Automation");
    expect(raf.pending).toBe(0);
  });
});
