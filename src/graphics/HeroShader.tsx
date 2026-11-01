"use client";
import { useEffect, useRef, type CSSProperties } from "react";
import { usePrefersReducedMotion } from "../motion/usePrefersReducedMotion";
import { useScrollReveal } from "../motion/useScrollReveal";

/**
 * HeroShader
 * ==========
 * A WebGL background: fractal Brownian motion noise, tinted with one
 * accent colour, drifting slowly and leaning towards the pointer. Meant
 * to sit behind a hero as `position: absolute; inset: 0`.
 *
 * Six guards, each of which leaves the page with a plain background and
 * `data-shader="off"` on the wrapper:
 *   1. no window (server render)
 *   2. prefers-reduced-motion: reduce, in which case no <canvas> is rendered
 *      and no context is ever requested
 *   3. coarse pointer or a viewport narrower than `minWidth`
 *   4. no WebGL context
 *   5. shader compile or program link failure
 *   6. webglcontextlost at runtime (the canvas is hidden)
 *
 * The render loop runs only while the element intersects the viewport
 * (useScrollReveal with once: false) and the tab is visible. The canvas is
 * resized to its box times a capped device pixel ratio.
 *
 * `data-shader` is "on" only after the program linked, so a page test can
 * assert whether WebGL work happened.
 */

const VERT = `attribute vec2 a_position;
void main() { gl_Position = vec4(a_position, 0.0, 1.0); }`;

const FRAG = `precision mediump float;
uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_pointer;
uniform vec3 u_accent;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
float noise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i), b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0)), d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.0; a *= 0.5; }
  return v;
}
void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  uv -= 0.5; uv.x *= u_resolution.x / u_resolution.y;
  vec2 pc = u_pointer - 0.5; pc.x *= u_resolution.x / u_resolution.y;
  uv += (pc - uv) * 0.04 * length(pc - uv);
  float t = u_time * 0.05;
  vec2 q = uv * 1.5 + vec2(t, t * 0.7);
  float f = fbm(q + fbm(q + fbm(q)));
  float orb = smoothstep(0.7, 0.0, length(uv));
  float intensity = pow(f, 1.5) * orb;
  gl_FragColor = vec4(u_accent * intensity * 0.6, intensity * 0.7);
}`;

export interface HeroShaderProps {
  /** Accent colour as RGB in 0..1. */
  accent?: readonly [number, number, number];
  /** Below this viewport width (px) the shader stays off. Default 768. */
  minWidth?: number;
  className?: string;
  style?: CSSProperties;
}

interface Controls {
  setIntersecting(value: boolean): void;
}

export function HeroShader({ accent = [0, 0.831, 0.631], minWidth = 768, className, style }: HeroShaderProps) {
  const reduced = usePrefersReducedMotion();
  const { ref, isVisible } = useScrollReveal<HTMLDivElement>({ threshold: 0, once: false });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controlsRef = useRef<Controls | null>(null);
  const [red, green, blue] = accent;

  useEffect(() => {
    if (reduced) return;
    const root = ref.current;
    const canvas = canvasRef.current;
    if (!root || !canvas || typeof window === "undefined") return;
    if (typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)").matches) return;
    if (window.innerWidth < minWidth) return;

    const gl = (canvas.getContext("webgl", { antialias: false, alpha: true, premultipliedAlpha: false }) ??
      canvas.getContext("experimental-webgl")) as WebGLRenderingContext | null;
    if (!gl) return;

    const compile = (type: number, source: string): WebGLShader | null => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };
    const vs = compile(gl.VERTEX_SHADER, VERT);
    const fs = compile(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) {
      if (vs) gl.deleteShader(vs);
      if (fs) gl.deleteShader(fs);
      return;
    }
    const program = gl.createProgram();
    if (!program) {
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      return;
    }
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      return;
    }

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    gl.useProgram(program);
    const aPosition = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(aPosition);
    gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);
    const uResolution = gl.getUniformLocation(program, "u_resolution");
    const uTime = gl.getUniformLocation(program, "u_time");
    const uPointer = gl.getUniformLocation(program, "u_pointer");
    const uAccent = gl.getUniformLocation(program, "u_accent");
    gl.uniform3f(uAccent, red, green, blue);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    let pointerX = 0.5;
    let pointerY = 0.5;
    const onPointerMove = (e: PointerEvent) => {
      pointerX = e.clientX / window.innerWidth;
      pointerY = 1 - e.clientY / window.innerHeight;
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = Math.max(1, Math.floor(canvas.clientWidth * dpr));
      const h = Math.max(1, Math.floor(canvas.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
    };

    let rafId = 0;
    let running = false;
    let intersecting = false;
    let lost = false;
    const startTime = performance.now();

    const tick = (now: number) => {
      if (!running) return;
      resize();
      gl.uniform2f(uResolution, canvas.width, canvas.height);
      gl.uniform1f(uTime, (now - startTime) / 1000);
      gl.uniform2f(uPointer, pointerX, pointerY);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      rafId = requestAnimationFrame(tick);
    };
    const sync = () => {
      const shouldRun = intersecting && !lost && document.visibilityState !== "hidden";
      if (shouldRun && !running) {
        running = true;
        rafId = requestAnimationFrame(tick);
      } else if (!shouldRun && running) {
        running = false;
        cancelAnimationFrame(rafId);
      }
    };

    const onVisibility = () => sync();
    const onLost = (e: Event) => {
      e.preventDefault();
      lost = true;
      sync();
      canvas.style.display = "none";
      root.dataset.shader = "off";
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVisibility);
    canvas.addEventListener("webglcontextlost", onLost);

    resize();
    root.dataset.shader = "on";
    controlsRef.current = {
      setIntersecting(value) {
        intersecting = value;
        sync();
      },
    };

    return () => {
      controlsRef.current = null;
      running = false;
      cancelAnimationFrame(rafId);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
      canvas.removeEventListener("webglcontextlost", onLost);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteBuffer(buffer);
      root.dataset.shader = "off";
    };
  }, [reduced, minWidth, red, green, blue, ref]);

  useEffect(() => {
    controlsRef.current?.setIntersecting(isVisible);
  }, [isVisible]);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      data-shader="off"
      className={className}
      style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden", ...style }}
    >
      {reduced ? null : <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "100%" }} />}
    </div>
  );
}
