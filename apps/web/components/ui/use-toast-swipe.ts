"use client";

import { useRef } from "react";
import type React from "react";
import { FLICK_SPEED, pushSample, releaseVelocity, type DragSample } from "@/lib/sheet-physics";

/** A sideways move under this many px is still a tap (the action button keeps working). */
const SWIPE_SLOP_PX = 8;

export interface ToastSwipe {
  ref: React.RefObject<HTMLDivElement | null>;
  onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerCancel: (e: React.PointerEvent<HTMLDivElement>) => void;
}

/**
 * cc-64 (2b): a sideways swipe on a toast follows the finger and, on release, dismisses it (as accepted: no Hoàn tác)
 * when it went past half the toast or was a flick (the sheets' velocity window, lib/sheet-physics); otherwise it slides
 * back. Reduced motion: it fades instead of sliding away. Only the app's toast host uses it, so the sign-in pages'
 * toasts do not carry it.
 */
export function useToastSwipe(onDismiss: () => void): ToastSwipe {
  const ref = useRef<HTMLDivElement | null>(null);
  const drag = useRef<{ id: number; x0: number; y0: number; samples: DragSample[]; swiping: boolean } | null>(null);
  const setX = (x: number, transition: string) => {
    const el = ref.current;
    if (!el) return;
    el.style.transition = transition;
    el.style.transform = x ? `translateX(${x}px)` : "";
    el.style.opacity = x ? String(Math.max(0, 1 - Math.abs(x) / el.offsetWidth)) : "";
  };
  const end = (e: React.PointerEvent<HTMLDivElement>, cancelled: boolean) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    if (!d.swiping) return;
    const dx = e.clientX - d.x0;
    const v = releaseVelocity(d.samples, e.timeStamp);
    const width = ref.current?.offsetWidth ?? 366;
    const away = !cancelled && (Math.abs(dx) > width / 2 || (Math.abs(v) > FLICK_SPEED && Math.sign(v) === Math.sign(dx)));
    if (!away) {
      setX(0, "transform var(--m-row) var(--ease-out), opacity var(--m-row) var(--ease-out)");
      return;
    }
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setX(0, "opacity var(--m-fade) var(--ease-out)");
      if (ref.current) ref.current.style.opacity = "0";
    } else setX(Math.sign(dx) * width, "transform var(--m-pop-out) var(--ease-out), opacity var(--m-pop-out) var(--ease-out)");
    window.setTimeout(onDismiss, 150);
  };
  return {
    ref,
    onPointerDown: (e) => {
      if (e.button !== 0) return;
      drag.current = { id: e.pointerId, x0: e.clientX, y0: e.clientY, samples: [{ t: e.timeStamp, y: 0 }], swiping: false };
    },
    onPointerMove: (e) => {
      const d = drag.current;
      if (!d || d.id !== e.pointerId) return;
      const dx = e.clientX - d.x0;
      if (!d.swiping) {
        if (Math.abs(dx) < SWIPE_SLOP_PX || Math.abs(dx) < Math.abs(e.clientY - d.y0)) return;
        d.swiping = true;
        e.currentTarget.setPointerCapture(e.pointerId);
      }
      d.samples = pushSample(d.samples, { t: e.timeStamp, y: dx });
      setX(dx, "none");
    },
    onPointerUp: (e) => end(e, false),
    onPointerCancel: (e) => end(e, true),
  };
}
