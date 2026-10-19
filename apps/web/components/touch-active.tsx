"use client";

import { useEffect } from "react";

/**
 * cc-57: iOS Safari only matches :active on an element when the document has a touch listener, so the press feedback
 * (scale and tint) can stay silent on a phone. One passive no-op listener is enough; it does nothing else.
 */
export function TouchActive() {
  useEffect(() => {
    const noop = () => {};
    document.addEventListener("touchstart", noop, { passive: true });
    return () => document.removeEventListener("touchstart", noop);
  }, []);
  return null;
}
