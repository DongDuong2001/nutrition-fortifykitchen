"use client";

import { useEffect } from "react";
import { fieldHidden } from "@/lib/keyboard";
import { scrollBehavior } from "@/lib/scroll-behavior";

/**
 * design-floor (V3 22/10): when the on-screen keyboard opens or the focus moves to another field, the focused text field
 * is scrolled into the middle of what the keyboard leaves, if it is covered. Mounted once in the root layout; renders
 * nothing. The add sheet keeps its own lift (components/add/add-screen.tsx), and a field already in view is not moved.
 */
export function KeyboardGuard() {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const keep = () => {
      const el = document.activeElement;
      if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement)) return;
      const r = el.getBoundingClientRect();
      if (fieldHidden(r.top, r.bottom, vv.height, vv.offsetTop)) el.scrollIntoView({ block: "center", behavior: scrollBehavior() });
    };
    // The keyboard takes a moment to come up after the focus: check again once the viewport has settled
    const onFocus = () => window.setTimeout(keep, 300);
    vv.addEventListener("resize", keep);
    document.addEventListener("focusin", onFocus);
    return () => {
      vv.removeEventListener("resize", keep);
      document.removeEventListener("focusin", onFocus);
    };
  }, []);
  return null;
}
