import { act } from "react";
import { vi } from "vitest";

type Callback = (entries: IntersectionObserverEntry[], observer: IntersectionObserver) => void;

interface MockObserver {
  callback: Callback;
  options: IntersectionObserverInit | undefined;
  elements: Set<Element>;
  disconnected: boolean;
  instance: IntersectionObserver;
}

/**
 * Installs an IntersectionObserver mock that records every instance and the
 * elements it observes. `trigger(el, isIntersecting)` delivers one entry to
 * every observer that currently observes `el`, inside act().
 */
export function installIntersectionObserver() {
  const observers: MockObserver[] = [];

  class IO {
    readonly root = null;
    readonly rootMargin: string;
    readonly thresholds: ReadonlyArray<number>;
    private readonly record: MockObserver;

    constructor(callback: Callback, options?: IntersectionObserverInit) {
      this.rootMargin = options?.rootMargin ?? "0px";
      const t = options?.threshold ?? 0;
      this.thresholds = Array.isArray(t) ? t : [t];
      this.record = {
        callback,
        options,
        elements: new Set(),
        disconnected: false,
        instance: this as unknown as IntersectionObserver,
      };
      observers.push(this.record);
    }
    observe(el: Element) {
      this.record.elements.add(el);
    }
    unobserve(el: Element) {
      this.record.elements.delete(el);
    }
    disconnect() {
      this.record.elements.clear();
      this.record.disconnected = true;
    }
    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
  }

  vi.stubGlobal("IntersectionObserver", IO);

  return {
    observers,
    get count() {
      return observers.length;
    },
    isObserved(el: Element) {
      return observers.some((o) => o.elements.has(el));
    },
    trigger(el: Element, isIntersecting = true) {
      act(() => {
        for (const o of observers) {
          if (!o.elements.has(el)) continue;
          const entry = {
            target: el,
            isIntersecting,
            intersectionRatio: isIntersecting ? 1 : 0,
            boundingClientRect: el.getBoundingClientRect(),
            intersectionRect: el.getBoundingClientRect(),
            rootBounds: null,
            time: 0,
          } as IntersectionObserverEntry;
          o.callback([entry], o.instance);
        }
      });
    },
  };
}
