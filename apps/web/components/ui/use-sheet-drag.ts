"use client";

import { useRef } from "react";
import type React from "react";

/** Let go after dragging down this share of the sheet's height, or faster than this (px per ms, a flick): it closes. */
const DISMISS_SHARE = 0.25;
const DISMISS_SPEED = 0.11;
/** A finger that stood still this long before letting go was not flicking. */
const STILL_MS = 100;

/**
 * cc-55: drag a sheet down by its grabber (Sheet and the /add panel). The sheet follows the finger 1:1: the transform
 * is written on the element itself while `data-dragging` turns its transition off. Past the top it moves with
 * friction instead of stopping. A second finger is ignored. On release it closes on distance or on a quick flick
 * (`onDismiss`, with data-state="closed" set at once), or goes back up; either way the CSS transition finishes from
 * where the finger let go, with the sheet's own curve.
 */
export function useSheetDrag(sheetRef: React.RefObject<HTMLElement | null>, onDismiss: () => void) {
  const drag = useRef<{ id: number; y: number; t: number; dy: number; moved: number } | null>(null);
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;

  const end = (e: React.PointerEvent<HTMLElement>, cancelled: boolean) => {
    const d = drag.current;
    const el = sheetRef.current;
    if (!d || e.pointerId !== d.id) return;
    drag.current = null;
    if (!el) return;
    const speed = e.timeStamp - d.moved > STILL_MS ? 0 : d.dy / Math.max(1, e.timeStamp - d.t);
    const dismiss = !cancelled && (d.dy > el.offsetHeight * DISMISS_SHARE || speed > DISMISS_SPEED);
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
      drag.current = { id: e.pointerId, y: e.clientY, t: e.timeStamp, dy: 0, moved: e.timeStamp };
      e.currentTarget.setPointerCapture(e.pointerId);
      sheetRef.current?.setAttribute("data-dragging", "");
    },
    onPointerMove: (e: React.PointerEvent<HTMLElement>) => {
      const d = drag.current;
      const el = sheetRef.current;
      if (!d || !el || e.pointerId !== d.id) return;
      const raw = e.clientY - d.y;
      d.dy = raw >= 0 ? raw : -2 * Math.sqrt(-raw);
      d.moved = e.timeStamp;
      el.style.transform = `translateY(${d.dy}px)`;
    },
    onPointerUp: (e: React.PointerEvent<HTMLElement>) => end(e, false),
    onPointerCancel: (e: React.PointerEvent<HTMLElement>) => end(e, true),
  };
}
