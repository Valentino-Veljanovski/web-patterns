"use client";
import { useCallback, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { usePrefersReducedMotion } from "../motion/usePrefersReducedMotion";

/**
 * useViewTransitionRouter
 * =======================
 * Returns `navigate(href, fromElement?)`, a `router.push` wrapped in
 * `document.startViewTransition` for the Next App Router.
 *
 * - Feature-detects `startViewTransition`. Without it, or under
 *   `prefers-reduced-motion: reduce`, it is a plain `router.push`.
 * - The promise returned by `navigate` resolves when `usePathname()` reports
 *   the target path, never right after `push`. With a view transition this
 *   is also what the transition's update callback waits for, so the "new"
 *   snapshot is taken after the next page has rendered.
 * - A safety timeout (`timeoutMs`, default 2000) resolves the promise when
 *   the pathname never changes, so a failed navigation cannot leave the
 *   document frozen in a pending transition.
 * - `fromElement` gets `view-transition-name: <name>` for the duration and
 *   loses it after `finished`. If it unmounted in the meantime the cleanup
 *   is a no-op; nothing throws. The destination page must carry the same
 *   name on its target element for the morph to happen.
 */

export const VIEW_TRANSITION_NAME = "wp-nav-active";
const DEFAULT_TIMEOUT_MS = 2000;

export interface UseViewTransitionRouterOptions {
  /** The view-transition-name given to `fromElement`. Default "wp-nav-active". */
  name?: string;
  /** Resolve the navigation anyway after this many ms. Default 2000. */
  timeoutMs?: number;
}

export type Navigate = (href: string, fromElement?: HTMLElement | null) => Promise<void>;

interface ViewTransitionLike {
  finished: Promise<void>;
}
type DocumentWithViewTransition = Document & {
  startViewTransition?: (update: () => void | Promise<void>) => ViewTransitionLike;
};

interface Waiter {
  pathname: string;
  resolve: () => void;
}

/** Path part of `href`, resolved against the current location. */
function targetPathname(href: string): string {
  try {
    return new URL(href, window.location.href).pathname;
  } catch {
    return href;
  }
}

export function supportsViewTransition(): boolean {
  return typeof document !== "undefined" && typeof (document as DocumentWithViewTransition).startViewTransition === "function";
}

export function useViewTransitionRouter(options: UseViewTransitionRouterOptions = {}): Navigate {
  const { name = VIEW_TRANSITION_NAME, timeoutMs = DEFAULT_TIMEOUT_MS } = options;
  const router = useRouter();
  const pathname = usePathname();
  const reduced = usePrefersReducedMotion();
  const pathnameRef = useRef(pathname);
  const waitersRef = useRef<Waiter[]>([]);

  // Every render with a new pathname settles the navigations that waited for it.
  useEffect(() => {
    pathnameRef.current = pathname;
    const remaining: Waiter[] = [];
    for (const w of waitersRef.current) {
      if (w.pathname === pathname) w.resolve();
      else remaining.push(w);
    }
    waitersRef.current = remaining;
  }, [pathname]);

  const waitForPathname = useCallback(
    (target: string): Promise<void> => {
      if (pathnameRef.current === target) return Promise.resolve();
      return new Promise<void>((resolve) => {
        const waiter: Waiter = {
          pathname: target,
          resolve: () => {
            clearTimeout(timer);
            resolve();
          },
        };
        const timer = setTimeout(() => {
          waitersRef.current = waitersRef.current.filter((w) => w !== waiter);
          resolve();
        }, timeoutMs);
        waitersRef.current.push(waiter);
      });
    },
    [timeoutMs],
  );

  return useCallback<Navigate>(
    (href, fromElement) => {
      const target = targetPathname(href);
      const doc = document as DocumentWithViewTransition;
      if (reduced || typeof doc.startViewTransition !== "function") {
        router.push(href);
        return waitForPathname(target);
      }

      if (fromElement) fromElement.style.setProperty("view-transition-name", name);
      // Registered before the transition starts: the update callback (which the browser runs
      // asynchronously, after the old snapshot) pushes and then hands this promise back.
      const arrived = waitForPathname(target);
      const transition = doc.startViewTransition(() => {
        router.push(href);
        return arrived;
      });
      const clear = () => {
        if (fromElement && fromElement.style.getPropertyValue("view-transition-name") === name) {
          fromElement.style.removeProperty("view-transition-name");
        }
      };
      transition.finished.then(clear, clear);
      return arrived;
    },
    [name, reduced, router, waitForPathname],
  );
}
