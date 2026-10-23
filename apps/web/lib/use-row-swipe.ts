"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
import { haptic } from "./haptics";
import { markUsed } from "./onboarding-store";
import { createRowSwipe, SWIPE_ACTION_PX, type SwipeRest } from "./row-swipe";
import { getOpenRow, markSwipedAway, setOpenRow, subscribeOpenRow } from "./row-swipe-open";

const SETTLE_MS = 260;
const FADE_MS = 120;
const DELETE_OUT_MS = 160;
const EASE = "var(--ease-drawer)";

/** A finger or a pen is the main pointer: only there a row can be swiped (a mouse keeps its long press and the edit screen). */
export function useCoarsePointer(): boolean {
  return useSyncExternalStore(
    (notify) => {
      const mq = window.matchMedia("(pointer: coarse)");
      mq.addEventListener("change", notify);
      return () => mq.removeEventListener("change", notify);
    },
    () => window.matchMedia("(pointer: coarse)").matches,
    () => false
  );
}

type RowEvent = ReactPointerEvent<HTMLElement>;

/**
 * The swipe of one food row (Job I). The row follows the finger through its transform (written to the element, no render per move);
 * the buttons behind it (Xoá on the right, ⋯ on the left) grow with the offset. A swipe never takes a touch that is a scroll (see
 * lib/row-swipe), never starts after a hold lifted the row (cc-70), and a tap on an open row closes it. Reduced motion: the row does
 * not slide, the buttons fade in.
 */
export function useRowSwipe({
  id,
  enabled,
  rowRef,
  onDelete,
  onMenu,
}: {
  id: string;
  enabled: boolean;
  rowRef: RefObject<HTMLElement | null>;
  onDelete: () => void;
  onMenu: () => void;
}) {
  const latest = useRef({ onDelete, onMenu, enabled });
  latest.current = { onDelete, onMenu, enabled };
  const trashRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLButtonElement>(null);
  const [rest, setRest] = useState<SwipeRest>("closed");
  const restRef = useRef<SwipeRest>("closed");
  const gesture = useRef<{ ctrl: ReturnType<typeof createRowSwipe>; pointerId: number; width: number; crossed: boolean } | null>(null);
  /** The click that ends a swipe must not select the food. */
  const swiped = useRef(false);
  const openId = useSyncExternalStore(subscribeOpenRow, getOpenRow, () => null);

  const reduced = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

  /** Draws the row at `offset`; the buttons take the room it leaves. */
  const apply = useCallback(
    (offset: number, motion: "none" | "settle" | "fade") => {
      const row = rowRef.current;
      if (!row) return;
      const slide = !reduced();
      row.style.transition = motion === "settle" && slide ? `transform ${SETTLE_MS}ms ${EASE}` : "none";
      row.style.transform = slide || motion === "fade" ? (offset === 0 ? "" : `translate3d(${offset}px,0,0)`) : "";
      for (const [el, show] of [[trashRef.current, offset < 0], [menuRef.current, offset > 0]] as const) {
        if (!el) continue;
        el.style.width = `${Math.max(SWIPE_ACTION_PX, Math.abs(offset))}px`;
        el.style.opacity = show ? "1" : "0";
        el.style.transition = motion === "fade" || !slide ? `opacity ${FADE_MS}ms ${EASE}` : "none";
        el.style.pointerEvents = show && Math.abs(offset) >= SWIPE_ACTION_PX / 2 ? "auto" : "none";
      }
    },
    [rowRef]
  );

  const settle = useCallback(
    (to: SwipeRest) => {
      restRef.current = to;
      setRest(to);
      setOpenRow(to === "closed" ? (getOpenRow() === id ? null : getOpenRow()) : id);
      apply(to === "left" ? -SWIPE_ACTION_PX : to === "right" ? SWIPE_ACTION_PX : 0, reduced() ? "fade" : "settle");
    },
    [apply, id]
  );

  // Another row opened: this one closes
  useEffect(() => {
    if (openId !== id && restRef.current !== "closed") settle("closed");
  }, [openId, id, settle]);

  // A scroll or a touch anywhere else closes an open row
  useEffect(() => {
    if (rest === "closed") return;
    const away = (e: Event) => {
      if (e.target instanceof Element && e.target.closest(`[data-swipe-wrap="${CSS.escape(id)}"]`)) return;
      settle("closed");
    };
    const scrolled = () => settle("closed");
    document.addEventListener("pointerdown", away, true);
    window.addEventListener("scroll", scrolled, { passive: true, capture: true });
    return () => {
      document.removeEventListener("pointerdown", away, true);
      window.removeEventListener("scroll", scrolled, { capture: true });
    };
  }, [rest, id, settle]);

  const slideOutAndDelete = useCallback(
    (width: number) => {
      markSwipedAway(id);
      if (reduced()) return latest.current.onDelete();
      const row = rowRef.current;
      if (row) {
        row.style.transition = `transform ${DELETE_OUT_MS}ms ${EASE}`;
        row.style.transform = `translate3d(${-width}px,0,0)`;
      }
      window.setTimeout(() => latest.current.onDelete(), DELETE_OUT_MS);
    },
    [id, rowRef]
  );

  const finish = (end: ReturnType<ReturnType<typeof createRowSwipe>["up"]>, width: number) => {
    if (end === "delete") return slideOutAndDelete(width);
    if (end === "menu") {
      settle("closed");
      return latest.current.onMenu();
    }
    settle(end === "open-left" ? "left" : end === "open-right" ? "right" : "closed");
  };

  return {
    rest,
    trashRef,
    menuRef,
    /** The click after a swipe is ignored once; a click on an open row closes it. True: the row's own click is handled. */
    handleClick(): boolean {
      if (swiped.current) {
        swiped.current = false;
        return true;
      }
      if (restRef.current !== "closed") {
        settle("closed");
        return true;
      }
      return false;
    },
    onButtonDelete: () => slideOutAndDelete(rowRef.current?.getBoundingClientRect().width ?? 0),
    onButtonMenu: () => {
      settle("closed");
      latest.current.onMenu();
    },
    onPointerDown(e: RowEvent): void {
      swiped.current = false;
      if (!latest.current.enabled || e.pointerType === "mouse" || !e.isPrimary) return;
      const width = e.currentTarget.getBoundingClientRect().width;
      const ctrl = createRowSwipe({ width, rest: restRef.current });
      ctrl.down(e.clientX, e.clientY);
      gesture.current = { ctrl, pointerId: e.pointerId, width, crossed: false };
    },
    onPointerMove(e: RowEvent): void {
      const g = gesture.current;
      if (!g || g.pointerId !== e.pointerId) return;
      // A hold has lifted the row (cc-70): it is a drag now, never a swipe
      const lifted = e.currentTarget.getAttribute("data-touch-drag");
      if (lifted === "lifted" || lifted === "dragging") {
        gesture.current = null;
        return;
      }
      const wasSwiping = g.ctrl.state === "swiping";
      const move = g.ctrl.move(e.clientX, e.clientY);
      if (!move) return;
      if (!wasSwiping) {
        markUsed("food-swipe");
        swiped.current = true;
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          // The pointer is gone already
        }
      }
      if (move.pastDelete !== g.crossed) {
        g.crossed = move.pastDelete;
        if (move.pastDelete) haptic("tick");
      }
      // One row open at a time: this one is being moved
      if (getOpenRow() !== id) setOpenRow(id);
      apply(move.offset, "none");
    },
    onPointerUp(e: RowEvent): void {
      const g = gesture.current;
      if (!g || g.pointerId !== e.pointerId) return;
      gesture.current = null;
      const end = g.ctrl.up();
      if (end !== "none") finish(end, g.width);
    },
    onPointerCancel(e: RowEvent): void {
      const g = gesture.current;
      if (!g || g.pointerId !== e.pointerId) return;
      gesture.current = null;
      if (g.ctrl.cancel() === "close") settle("closed");
    },
  };
}
