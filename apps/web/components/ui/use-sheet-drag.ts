"use client";

import { useRef } from "react";
import type React from "react";
import { createSheetDrag, type AnimateFn, type DragElement } from "@/components/ui/sheet-drag-controller";

// motion's animate, loaded on the first pointerdown on a sheet (cc-62: never in a route's first-load JS)
let animateFn: AnimateFn | null = null;
let loading: Promise<void> | null = null;
function loadAnimate(): void {
  loading ??= import(/* webpackChunkName: "sheet-spring", webpackExports: ["animate"] */ "motion")
    .then((m) => {
      animateFn = m.animate as unknown as AnimateFn;
    })
    .catch(() => {
      // Offline before the chunk was cached: the CSS release stays, the next grab tries again
      loading = null;
    });
}

const readOffset = (el: DragElement) => new DOMMatrix(getComputedStyle(el as unknown as HTMLElement).transform).m42;
const reducedMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

export interface SheetDragOptions {
  /** The scrim behind the sheet: its opacity follows the drag (1 − pos / height). */
  scrimRef?: React.RefObject<HTMLElement | null>;
  /** A sheet sliding away was grabbed: open it again and return true, or return false to ignore the grab. */
  onRegrab?: () => boolean;
}

/**
 * cc-55, cc-62: drag a sheet down by its drag areas (the grabber and the title block; Sheet and the /add panel). See
 * sheet-drag-controller.ts for the behaviour. Pointerdowns on a control inside a drag area (a button, a link, a field)
 * are left to the control. A second finger is ignored.
 */
export function useSheetDrag(sheetRef: React.RefObject<HTMLElement | null>, onDismiss: () => void, options: SheetDragOptions = {}) {
  const latest = useRef({ onDismiss, options });
  latest.current = { onDismiss, options };
  const controller = useRef<ReturnType<typeof createSheetDrag> | null>(null);
  controller.current ??= createSheetDrag({
    sheet: () => sheetRef.current as unknown as DragElement | null,
    scrim: () => (latest.current.options.scrimRef?.current ?? null) as unknown as DragElement | null,
    readOffset,
    reducedMotion,
    animate: () => animateFn,
    load: loadAnimate,
    onDismiss: () => latest.current.onDismiss(),
    onRegrab: () => latest.current.options.onRegrab?.() ?? false,
  });
  const drag = controller.current;

  return {
    settled: drag.settled,
    springing: drag.springing,
    handlers: {
      onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
        if (e.pointerType === "mouse" && e.button !== 0) return;
        if ((e.target as Element).closest?.("button, a, input, select, textarea, label")) return;
        if (drag.down(e.pointerId, e.clientY, e.timeStamp)) e.currentTarget.setPointerCapture(e.pointerId);
      },
      onPointerMove: (e: React.PointerEvent<HTMLElement>) => drag.move(e.pointerId, e.clientY, e.timeStamp),
      onPointerUp: (e: React.PointerEvent<HTMLElement>) => drag.up(e.pointerId, e.timeStamp, false),
      onPointerCancel: (e: React.PointerEvent<HTMLElement>) => drag.up(e.pointerId, e.timeStamp, true),
    },
  };
}
