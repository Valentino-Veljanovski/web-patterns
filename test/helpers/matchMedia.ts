import { act } from "react";
import { vi } from "vitest";

export const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

type Listener = (event: MediaQueryListEvent) => void;

/**
 * Installs a window.matchMedia mock. Every query starts as "does not match"
 * except the ones passed in `initial`. `set(query, value)` flips a query and
 * fires the registered "change" listeners inside React's act().
 */
export function installMatchMedia(initial: Record<string, boolean> = {}) {
  const state: Record<string, boolean> = { ...initial };
  const listeners = new Map<string, Set<Listener>>();

  const matchMedia = vi.fn((query: string): MediaQueryList => {
    const bag = listeners.get(query) ?? new Set<Listener>();
    listeners.set(query, bag);
    const mql = {
      media: query,
      get matches() {
        return state[query] === true;
      },
      onchange: null,
      addEventListener: (_type: string, cb: Listener) => {
        bag.add(cb);
      },
      removeEventListener: (_type: string, cb: Listener) => {
        bag.delete(cb);
      },
      addListener: (cb: Listener) => {
        bag.add(cb);
      },
      removeListener: (cb: Listener) => {
        bag.delete(cb);
      },
      dispatchEvent: () => true,
    };
    return mql as unknown as MediaQueryList;
  });

  vi.stubGlobal("matchMedia", matchMedia);

  return {
    matchMedia,
    set(query: string, value: boolean) {
      state[query] = value;
      const event = { matches: value, media: query } as MediaQueryListEvent;
      act(() => {
        for (const cb of listeners.get(query) ?? []) cb(event);
      });
    },
    setReducedMotion(value: boolean) {
      this.set(REDUCED_MOTION, value);
    },
    listenerCount(query: string) {
      return listeners.get(query)?.size ?? 0;
    },
  };
}
