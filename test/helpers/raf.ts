import { act } from "react";
import { vi } from "vitest";

/**
 * Manual requestAnimationFrame clock. `frame(ms)` advances the clock by `ms`
 * and runs every callback queued before the frame, inside act(). `advance(ms)`
 * runs frames of `step` ms until `ms` has elapsed. performance.now() returns
 * the same clock so code that mixes both stays consistent.
 */
export function installRafClock(step = 16) {
  let now = 0;
  let nextId = 1;
  let requested = 0;
  const queue = new Map<number, FrameRequestCallback>();

  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    const id = nextId++;
    requested++;
    queue.set(id, cb);
    return id;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => {
    queue.delete(id);
  });
  vi.spyOn(performance, "now").mockImplementation(() => now);

  function frame(ms = step) {
    now += ms;
    const callbacks = [...queue.values()];
    queue.clear();
    act(() => {
      for (const cb of callbacks) cb(now);
    });
  }

  function advance(ms: number) {
    const end = now + ms;
    while (now < end) frame(Math.min(step, end - now));
  }

  return {
    frame,
    advance,
    get now() {
      return now;
    },
    /** Callbacks waiting for the next frame. */
    get pending() {
      return queue.size;
    },
    /** Total requestAnimationFrame calls since install. */
    get requested() {
      return requested;
    },
  };
}
