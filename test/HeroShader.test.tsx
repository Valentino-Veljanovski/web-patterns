import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { HeroShader } from "../src/graphics/HeroShader";
import { installMatchMedia, REDUCED_MOTION } from "./helpers/matchMedia";
import { installRafClock } from "./helpers/raf";
import { installIntersectionObserver } from "./helpers/io";

const COARSE = "(pointer: coarse)";

function setInnerWidth(w: number) {
  Object.defineProperty(window, "innerWidth", { configurable: true, writable: true, value: w });
}

/** Minimal WebGL context double: every call succeeds. */
function fakeGl(overrides: Partial<Record<string, unknown>> = {}) {
  const gl: Record<string, unknown> = {
    VERTEX_SHADER: 35633,
    FRAGMENT_SHADER: 35632,
    COMPILE_STATUS: 35713,
    LINK_STATUS: 35714,
    ARRAY_BUFFER: 34962,
    STATIC_DRAW: 35044,
    FLOAT: 5126,
    TRIANGLES: 4,
    BLEND: 3042,
    SRC_ALPHA: 770,
    ONE_MINUS_SRC_ALPHA: 771,
    COLOR_BUFFER_BIT: 16384,
    createShader: vi.fn(() => ({})),
    shaderSource: vi.fn(),
    compileShader: vi.fn(),
    getShaderParameter: vi.fn(() => true),
    deleteShader: vi.fn(),
    createProgram: vi.fn(() => ({})),
    attachShader: vi.fn(),
    linkProgram: vi.fn(),
    getProgramParameter: vi.fn(() => true),
    deleteProgram: vi.fn(),
    createBuffer: vi.fn(() => ({})),
    bindBuffer: vi.fn(),
    bufferData: vi.fn(),
    deleteBuffer: vi.fn(),
    useProgram: vi.fn(),
    getAttribLocation: vi.fn(() => 0),
    enableVertexAttribArray: vi.fn(),
    vertexAttribPointer: vi.fn(),
    getUniformLocation: vi.fn(() => ({})),
    uniform1f: vi.fn(),
    uniform2f: vi.fn(),
    uniform3f: vi.fn(),
    enable: vi.fn(),
    blendFunc: vi.fn(),
    viewport: vi.fn(),
    clearColor: vi.fn(),
    clear: vi.fn(),
    drawArrays: vi.fn(),
    ...overrides,
  };
  return gl;
}

const root = (c: HTMLElement) => c.querySelector<HTMLElement>("[data-shader]") as HTMLElement;

describe("HeroShader", () => {
  // N4.
  it("N4: under reduced motion no canvas context is requested and nothing is drawn", () => {
    installMatchMedia({ [REDUCED_MOTION]: true });
    installRafClock();
    installIntersectionObserver();
    const spy = vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    const { container } = render(<HeroShader />);
    expect(spy).not.toHaveBeenCalled();
    expect(root(container).dataset.shader).toBe("off");
    expect(container.querySelector("canvas")).toBeNull();
  });

  it("guard: coarse pointer requests no context", () => {
    installMatchMedia({ [COARSE]: true });
    installRafClock();
    installIntersectionObserver();
    setInnerWidth(1440);
    const spy = vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    const { container } = render(<HeroShader />);
    expect(spy).not.toHaveBeenCalled();
    expect(root(container).dataset.shader).toBe("off");
  });

  it("guard: narrow viewport requests no context", () => {
    installMatchMedia();
    installRafClock();
    installIntersectionObserver();
    setInnerWidth(600);
    const spy = vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    const { container } = render(<HeroShader />);
    expect(spy).not.toHaveBeenCalled();
    expect(root(container).dataset.shader).toBe("off");
  });

  it("guard: no WebGL context leaves the shader off without throwing", () => {
    installMatchMedia();
    const raf = installRafClock();
    installIntersectionObserver();
    setInnerWidth(1440);
    const spy = vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    const { container } = render(<HeroShader />);
    expect(spy).toHaveBeenCalled();
    expect(root(container).dataset.shader).toBe("off");
    expect(raf.requested).toBe(0);
  });

  it("guard: shader compile failure leaves the shader off and frees the shader", () => {
    installMatchMedia();
    const raf = installRafClock();
    installIntersectionObserver();
    setInnerWidth(1440);
    const gl = fakeGl({ getShaderParameter: vi.fn(() => false) });
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(gl as unknown as RenderingContext);
    const { container } = render(<HeroShader />);
    expect(root(container).dataset.shader).toBe("off");
    expect(gl.deleteShader).toHaveBeenCalled();
    expect(raf.requested).toBe(0);
  });

  it("draws only while intersecting, pauses when hidden, and cleans up", () => {
    installMatchMedia();
    const raf = installRafClock();
    const io = installIntersectionObserver();
    setInnerWidth(1440);
    const gl = fakeGl();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(gl as unknown as RenderingContext);
    const { container, unmount } = render(<HeroShader />);
    const el = root(container);
    expect(el.dataset.shader).toBe("on");
    expect(container.querySelector("canvas")).not.toBeNull();
    // Not yet observed as visible: no frames.
    expect(raf.pending).toBe(0);
    io.trigger(el, true);
    expect(raf.pending).toBe(1);
    raf.frame();
    expect(gl.drawArrays).toHaveBeenCalledTimes(1);
    expect(raf.pending).toBe(1);
    io.trigger(el, false);
    expect(raf.pending).toBe(0);
    io.trigger(el, true);
    raf.frame();
    expect(gl.drawArrays).toHaveBeenCalledTimes(2);
    unmount();
    expect(raf.pending).toBe(0);
    expect(gl.deleteProgram).toHaveBeenCalled();
    expect(gl.deleteBuffer).toHaveBeenCalled();
  });

  it("stops and hides the canvas when the context is lost", () => {
    installMatchMedia();
    const raf = installRafClock();
    const io = installIntersectionObserver();
    setInnerWidth(1440);
    const gl = fakeGl();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(gl as unknown as RenderingContext);
    const { container } = render(<HeroShader />);
    const el = root(container);
    io.trigger(el, true);
    const canvas = container.querySelector("canvas") as HTMLCanvasElement;
    canvas.dispatchEvent(new Event("webglcontextlost", { cancelable: true }));
    expect(raf.pending).toBe(0);
    expect(el.dataset.shader).toBe("off");
    expect(canvas.style.display).toBe("none");
  });

  it("N4: a change to reduced motion after mount removes the canvas", () => {
    const mm = installMatchMedia();
    installRafClock();
    installIntersectionObserver();
    setInnerWidth(1440);
    const gl = fakeGl();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(gl as unknown as RenderingContext);
    const { container } = render(<HeroShader />);
    expect(container.querySelector("canvas")).not.toBeNull();
    mm.setReducedMotion(true);
    expect(container.querySelector("canvas")).toBeNull();
    expect(root(container).dataset.shader).toBe("off");
    expect(gl.deleteProgram).toHaveBeenCalled();
  });
});
