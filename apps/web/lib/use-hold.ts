"use client";

import { useRef, type CSSProperties, type MouseEvent, type PointerEvent } from "react";
import { createHold, guardNextClick } from "./hold";

/** No iOS callout and no text selection on a control that opens something on hold. */
const HOLD_STYLE: CSSProperties = { WebkitUserSelect: "none", userSelect: "none", WebkitTouchCallout: "none" };

/**
 * Press and hold on a group of controls (hero macros, the Chất xơ row): `bind(arg)` gives the pointer props of one control and
 * `onHold(arg)` runs when it was held. A mouse holds the same way, and a right-click opens at once; the context menu is always
 * kept away. Spread the props on a button and call `heldClick()` first in its onClick: true means the click ended a hold.
 */
export function useHold<T>(onHold: (arg: T) => void) {
  const latest = useRef(onHold);
  latest.current = onHold;
  const hold = useRef<ReturnType<typeof createHold<T>>>(null);
  hold.current ??= createHold<T>((arg, heldByTimer) => {
    if (heldByTimer) guardNextClick(document);
    latest.current(arg);
  });
  const h = hold.current;
  return {
    bind: (arg: T) => ({
      onPointerDown: (e: PointerEvent) => {
        h.reset();
        if (e.pointerType === "mouse" && e.button !== 0) return;
        h.start(arg, e.clientX, e.clientY);
      },
      onPointerMove: (e: PointerEvent) => h.move(e.clientX, e.clientY),
      onPointerUp: h.cancel,
      onPointerCancel: h.cancel,
      onPointerLeave: h.cancel,
      onContextMenu: (e: MouseEvent) => {
        e.preventDefault();
        h.fire(arg);
      },
      style: HOLD_STYLE,
    }),
    heldClick: () => h.takeFired(),
  };
}
