import { act } from "react";

/** Sets document.visibilityState / document.hidden and fires visibilitychange. */
export function setDocumentVisibility(state: "hidden" | "visible") {
  Object.defineProperty(document, "visibilityState", { configurable: true, get: () => state });
  Object.defineProperty(document, "hidden", { configurable: true, get: () => state === "hidden" });
  act(() => {
    document.dispatchEvent(new Event("visibilitychange"));
  });
}

/** Removes the instance overrides so jsdom's own getters apply again. */
export function resetDocumentVisibility() {
  delete (document as unknown as Record<string, unknown>).visibilityState;
  delete (document as unknown as Record<string, unknown>).hidden;
}
