"use client";
import { useEffect, useRef, type CSSProperties } from "react";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";
import { useScrollReveal } from "./useScrollReveal";

/**
 * Typewriter
 * ==========
 * One engine, two modes.
 *
 *   <Typewriter mode="cycle" roles={["Automation Engineer", "Workflow Developer"]} />
 *   <Typewriter mode="once" text="Contact" />
 *
 * "cycle" types a role, waits, deletes it and moves to the next, forever.
 * "once" types a single text when the element enters the viewport
 * (through useScrollReveal; this component owns no observer).
 *
 * Engine: a requestAnimationFrame loop that steps at most once per frame
 * and writes `textContent` through a ref. React commits on mount and on
 * mode or visibility changes, never per character. The role list lives in
 * a ref that is refreshed after every render, so a parent re-render with
 * a new array of the same content does not restart the animation, and a
 * list that shrinks clamps the current index instead of throwing.
 *
 * The loop pauses while the document is hidden and resumes, with the
 * pause time credited, when it becomes visible again. In "once" mode the
 * loop stops when the text is complete.
 *
 * Layout: an invisible placeholder with the longest text reserves the
 * width before typing starts, so nothing shifts (the CLS guard). A
 * visually hidden span carries the full first text for assistive
 * technology; the typed span is aria-hidden.
 *
 * Under `prefers-reduced-motion: reduce` the component renders the full
 * text (first role in cycle mode) synchronously and requests no frame.
 */

interface BaseProps {
  /** Milliseconds per typed character. Default 80. At most one step per frame. */
  speed?: number;
  className?: string;
}

export interface TypewriterCycleProps extends BaseProps {
  mode: "cycle";
  roles: string[];
  /** Pause with the full role on screen, ms. Default 2200. */
  waitMs?: number;
  /** Milliseconds per deleted character. Default: speed. */
  deleteSpeed?: number;
}

export interface TypewriterOnceProps extends BaseProps {
  mode: "once";
  text: string;
  /** Delay after entering the viewport before the first character, ms. Default 200. */
  delay?: number;
  /** Fraction of the element that must be in view. Default 0.5. */
  threshold?: number;
}

export type TypewriterProps = TypewriterCycleProps | TypewriterOnceProps;

type Phase = "delay" | "typing" | "waiting" | "deleting" | "done";

interface EngineState {
  roleIndex: number;
  length: number;
  phase: Phase;
  lastStepAt: number;
}

const VISUALLY_HIDDEN: CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  whiteSpace: "nowrap",
  border: 0,
};

export function Typewriter(props: TypewriterProps) {
  const { mode, speed = 80, className } = props;
  const roles = mode === "cycle" ? props.roles : [props.text];
  const waitMs = mode === "cycle" ? (props.waitMs ?? 2200) : 0;
  const deleteSpeed = mode === "cycle" ? (props.deleteSpeed ?? speed) : speed;
  const delay = mode === "once" ? (props.delay ?? 200) : 0;
  const threshold = mode === "once" ? (props.threshold ?? 0.5) : 0;

  const reduced = usePrefersReducedMotion();
  const { ref, isVisible } = useScrollReveal<HTMLSpanElement>({ threshold, enabled: mode === "once" });
  const outputRef = useRef<HTMLSpanElement>(null);
  const rolesRef = useRef<string[]>(roles);
  const stateRef = useRef<EngineState>({
    roleIndex: 0,
    length: 0,
    phase: delay > 0 ? "delay" : "typing",
    lastStepAt: -Infinity,
  });

  // Content changes reach the running loop through the ref: no restart.
  useEffect(() => {
    rolesRef.current = roles;
  });

  const hasContent = roles.some((r) => r.length > 0);
  const active = !reduced && hasContent && (mode === "cycle" || isVisible);

  useEffect(() => {
    if (!active) return;
    const out = outputRef.current;
    if (!out) return;
    const s = stateRef.current;

    const currentRole = (): string => {
      const list = rolesRef.current;
      if (list.length === 0) return "";
      if (s.roleIndex >= list.length) s.roleIndex = list.length - 1;
      const role = list[s.roleIndex] ?? "";
      if (s.length > role.length) s.length = role.length;
      return role;
    };

    const write = () => {
      out.textContent = currentRole().slice(0, s.length);
    };

    /** One engine step. Returns false when the loop should stop. */
    const step = (now: number): boolean => {
      for (;;) {
        const role = currentRole();
        switch (s.phase) {
          case "delay":
            if (s.lastStepAt === -Infinity) {
              s.lastStepAt = now;
              return true;
            }
            if (now - s.lastStepAt < delay) return true;
            s.phase = "typing";
            s.lastStepAt = -Infinity;
            continue;
          case "typing":
            if (s.length < role.length) {
              if (now - s.lastStepAt >= speed) {
                s.length += 1;
                s.lastStepAt = now;
                write();
              }
              return true;
            }
            if (mode === "once") {
              s.phase = "done";
              return false;
            }
            s.phase = "waiting";
            s.lastStepAt = now;
            return true;
          case "waiting":
            if (now - s.lastStepAt < waitMs) return true;
            s.phase = "deleting";
            s.lastStepAt = -Infinity;
            continue;
          case "deleting":
            if (s.length > 0) {
              if (now - s.lastStepAt >= deleteSpeed) {
                s.length -= 1;
                s.lastStepAt = now;
                write();
              }
              return true;
            }
            s.roleIndex = (s.roleIndex + 1) % Math.max(1, rolesRef.current.length);
            s.phase = "typing";
            s.lastStepAt = -Infinity;
            continue;
          case "done":
            return false;
        }
      }
    };

    write();
    if (s.phase === "done") return;

    let rafId = 0;
    let running = false;
    let paused = false;
    let pausedAt = 0;

    const tick = (now: number) => {
      if (!running) return;
      if (step(now)) rafId = requestAnimationFrame(tick);
      else running = false;
    };
    const start = () => {
      if (running) return;
      running = true;
      rafId = requestAnimationFrame(tick);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(rafId);
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        if (!running) return;
        stop();
        paused = true;
        pausedAt = performance.now();
      } else if (paused) {
        paused = false;
        if (s.lastStepAt !== -Infinity) s.lastStepAt += performance.now() - pausedAt;
        start();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    if (document.visibilityState === "hidden") paused = true;
    else start();

    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [active, mode, speed, waitMs, deleteSpeed, delay]);

  if (!hasContent) return null;

  const first = roles.find((r) => r.length > 0) ?? "";

  if (reduced) {
    return (
      <span className={className} data-typewriter="static">
        {first}
      </span>
    );
  }

  const longest = roles.reduce((a, b) => (b.length > a.length ? b : a), "");

  return (
    <span
      ref={ref}
      className={className}
      data-typewriter="typing"
      style={{ position: "relative", display: "inline-block" }}
    >
      <span aria-hidden="true" data-typewriter-placeholder="" style={{ visibility: "hidden" }}>
        {longest}
      </span>
      <span ref={outputRef} aria-hidden="true" data-typewriter-output="" style={{ position: "absolute", left: 0, top: 0 }} />
      <span style={VISUALLY_HIDDEN}>{first}</span>
    </span>
  );
}
