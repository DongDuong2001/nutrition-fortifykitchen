"use client";

import { useRef } from "react";
import type React from "react";

/** Let go after dragging down this share of the sheet's height, or faster than this (px per ms, a flick): it closes. */
const DISMISS_SHARE = 0.25;
const DISMISS_SPEED = 0.11;
/** Above the top the sheet follows the finger 1:1 at first, then tightens up to this many px. */
const STRETCH = 24;
const stretch = (up: number) => STRETCH * (1 - Math.exp(-up / STRETCH));

/** A finger that stood still this long before letting go was not flicking. */
const STILL_MS = 100;

/**
 * cc-55: drag a sheet down by its grabber (Sheet and the /add panel). The sheet follows the finger 1:1: the transform
 * is written on the element itself while `data-dragging` turns its transition off. Past the top it moves with
 * friction instead of stopping (1:1 at first, then it tightens). A sheet grabbed while it is still sliding open or
 * closed is held where it is, not snapped to 0. A second finger is ignored. On release it closes on distance or on a quick flick
 * (`onDismiss`, with data-state="closed" set at once), or goes back up; either way the CSS transition finishes from
 * where the finger let go, with the sheet's own curve.
 */
export function useSheetDrag(sheetRef: React.RefObject<HTMLElement | null>, onDismiss: () => void) {
  // base: where the sheet was when the finger came down (a sheet grabbed mid-open is not at 0); dy: the finger's travel
  // (for the flick speed); pos: where the sheet is now
  const drag = useRef<{ id: number; y: number; t: number; dy: number; moved: number; base: number; pos: number } | null>(null);
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;

  const end = (e: React.PointerEvent<HTMLElement>, cancelled: boolean) => {
    const d = drag.current;
    const el = sheetRef.current;
    if (!d || e.pointerId !== d.id) return;
    drag.current = null;
    if (!el) return;
    const speed = e.timeStamp - d.moved > STILL_MS ? 0 : d.dy / Math.max(1, e.timeStamp - d.t);
    const dismiss = !cancelled && (d.pos > el.offsetHeight * DISMISS_SHARE || speed > DISMISS_SPEED);
    el.removeAttribute("data-dragging");
    el.style.transform = "";
    if (dismiss) {
      el.dataset.state = "closed";
      dismissRef.current();
    }
  };

  return {
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
      if (drag.current || (e.pointerType === "mouse" && e.button !== 0)) return;
      const el = sheetRef.current;
      // Read where the sheet is right now (it may be mid-transition), pin it there, then switch the transition off
      const base = el ? new DOMMatrix(getComputedStyle(el).transform).m42 : 0;
      drag.current = { id: e.pointerId, y: e.clientY, t: e.timeStamp, dy: 0, moved: e.timeStamp, base, pos: base };
      e.currentTarget.setPointerCapture(e.pointerId);
      if (el) {
        el.style.transform = `translateY(${base}px)`;
        el.setAttribute("data-dragging", "");
      }
    },
    onPointerMove: (e: React.PointerEvent<HTMLElement>) => {
      const d = drag.current;
      const el = sheetRef.current;
      if (!d || !el || e.pointerId !== d.id) return;
      d.dy = e.clientY - d.y;
      const total = d.base + d.dy;
      d.pos = total >= 0 ? total : -stretch(-total);
      d.moved = e.timeStamp;
      el.style.transform = `translateY(${d.pos}px)`;
    },
    onPointerUp: (e: React.PointerEvent<HTMLElement>) => end(e, false),
    onPointerCancel: (e: React.PointerEvent<HTMLElement>) => end(e, true),
  };
}
