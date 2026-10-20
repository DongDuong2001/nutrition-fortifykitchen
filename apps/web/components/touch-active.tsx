"use client";

import { useEffect } from "react";
import { installPressFeedback } from "@/lib/press-feedback";

/**
 * cc-57: iOS Safari only matches :active on an element when the document has a touch listener, so the press feedback
 * (scale and tint) can stay silent on a phone. One passive no-op listener is enough for that.
 * cc-fluid-add: and the press itself starts at the touch-down, not when the browser calls the touch a press
 * (lib/press-feedback marks the pressed control data-pressed, which the CSS treats like :active).
 */
export function TouchActive() {
  useEffect(() => {
    const noop = () => {};
    document.addEventListener("touchstart", noop, { passive: true });
    const off = installPressFeedback(document);
    return () => {
      document.removeEventListener("touchstart", noop);
      off();
    };
  }, []);
  return null;
}
