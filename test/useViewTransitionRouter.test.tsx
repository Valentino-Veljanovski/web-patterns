import { afterEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { installMatchMedia, REDUCED_MOTION } from "./helpers/matchMedia";

// Fake next/navigation: the test moves the pathname by hand and re-renders.
const nav = vi.hoisted(() => ({ pathname: "/", push: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: nav.push }),
  usePathname: () => nav.pathname,
}));

import { useViewTransitionRouter, VIEW_TRANSITION_NAME } from "../src/navigation/useViewTransitionRouter";

type Update = () => void | Promise<void>;
interface FakeTransition {
  finished: Promise<void>;
  ready: Promise<void>;
  updateCallbackDone: Promise<void>;
  skipTransition: () => void;
}

function installViewTransition() {
  const transitions: Array<{ transition: FakeTransition; finish: () => void; update: Update }> = [];
  const startViewTransition = vi.fn((update: Update): FakeTransition => {
    let finish!: () => void;
    const finished = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const updateCallbackDone = Promise.resolve().then(() => update());
    updateCallbackDone.catch(() => {});
    const transition: FakeTransition = { finished, ready: Promise.resolve(), updateCallbackDone, skipTransition: () => {} };
    transitions.push({ transition, finish, update });
    return transition;
  });
  (document as unknown as { startViewTransition?: unknown }).startViewTransition = startViewTransition;
  return { startViewTransition, transitions };
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

async function isSettled(p: Promise<unknown>): Promise<boolean> {
  let settled = false;
  p.then(
    () => {
      settled = true;
    },
    () => {
      settled = true;
    },
  );
  await flush();
  return settled;
}

afterEach(() => {
  delete (document as unknown as { startViewTransition?: unknown }).startViewTransition;
  nav.pathname = "/";
  nav.push.mockReset();
  vi.useRealTimers();
});

describe("useViewTransitionRouter E19", () => {
  // Old use-view-transition-router.ts lines 51-53: the startViewTransition callback returned void right
  // after router.push, so the new-state snapshot was taken before the next page existed.
  it("E19a: resolves on pathname change, not synchronously", async () => {
    installMatchMedia();
    const vt = installViewTransition();
    const { result, rerender } = renderHook(() => useViewTransitionRouter());
    let navigation!: Promise<void>;
    act(() => {
      navigation = result.current("/navigation/target");
    });
    await flush();
    expect(vt.startViewTransition).toHaveBeenCalledTimes(1);
    expect(nav.push).toHaveBeenCalledWith("/navigation/target");
    expect(await isSettled(navigation)).toBe(false);
    expect(await isSettled(vt.transitions[0]!.transition.updateCallbackDone)).toBe(false);

    nav.pathname = "/navigation/target";
    rerender();
    await flush();
    expect(await isSettled(navigation)).toBe(true);
    expect(await isSettled(vt.transitions[0]!.transition.updateCallbackDone)).toBe(true);
  });

  it("E19b: reduced motion: plain push, still resolves on pathname change", async () => {
    installMatchMedia({ [REDUCED_MOTION]: true });
    const vt = installViewTransition();
    const { result, rerender } = renderHook(() => useViewTransitionRouter());
    let navigation!: Promise<void>;
    act(() => {
      navigation = result.current("/navigation/target");
    });
    expect(nav.push).toHaveBeenCalledWith("/navigation/target");
    expect(vt.startViewTransition).not.toHaveBeenCalled();
    expect(await isSettled(navigation)).toBe(false);
    nav.pathname = "/navigation/target";
    rerender();
    expect(await isSettled(navigation)).toBe(true);
  });

  it("E19c: no startViewTransition support: plain push", async () => {
    installMatchMedia();
    const { result, rerender } = renderHook(() => useViewTransitionRouter());
    let navigation!: Promise<void>;
    act(() => {
      navigation = result.current("/navigation/target");
    });
    expect(nav.push).toHaveBeenCalledWith("/navigation/target");
    expect(await isSettled(navigation)).toBe(false);
    nav.pathname = "/navigation/target";
    rerender();
    expect(await isSettled(navigation)).toBe(true);
  });

  it("E19d: safety timeout resolves after 2000 ms when the pathname never changes", async () => {
    vi.useFakeTimers();
    installMatchMedia();
    const vt = installViewTransition();
    const { result } = renderHook(() => useViewTransitionRouter());
    let navigation!: Promise<void>;
    act(() => {
      navigation = result.current("/nowhere");
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1999);
    });
    expect(await isSettled(navigation)).toBe(false);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(await isSettled(navigation)).toBe(true);
    expect(await isSettled(vt.transitions[0]!.transition.updateCallbackDone)).toBe(true);
  });

  it("E19e: clears view-transition-name after finished, and does not throw when the element unmounted", async () => {
    installMatchMedia();
    const vt = installViewTransition();
    const el = document.createElement("article");
    document.body.appendChild(el);
    const { result, rerender } = renderHook(() => useViewTransitionRouter());
    act(() => {
      void result.current("/navigation/target", el);
    });
    expect(el.style.getPropertyValue("view-transition-name")).toBe(VIEW_TRANSITION_NAME);

    nav.pathname = "/navigation/target";
    rerender();
    await flush();
    // Still named while the animation runs.
    expect(el.style.getPropertyValue("view-transition-name")).toBe(VIEW_TRANSITION_NAME);

    el.remove(); // unmounted during the transition
    vt.transitions[0]!.finish();
    await flush();
    expect(el.style.getPropertyValue("view-transition-name")).toBe("");

    // A second navigation whose element is gone before `finished`: nothing to clear, nothing thrown.
    const gone = document.createElement("article");
    document.body.appendChild(gone);
    act(() => {
      void result.current("/navigation", gone);
    });
    gone.remove();
    vt.transitions[1]!.finish();
    await expect(flush()).resolves.toBeUndefined();
  });
});
