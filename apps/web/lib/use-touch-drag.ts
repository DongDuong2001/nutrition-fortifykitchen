import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from "react";
import { haptic } from "./haptics";
import { markUsed } from "./onboarding-store";
import { setLanding } from "./touch-drag-landing";

/**
 * cc-70: move a food to another meal by holding it and dragging, with a finger or a pen. The mouse keeps the HTML5 drag
 * of food-list.tsx. Plain pointer events, no library. `createTouchDrag` is the gesture (pure, tested without a DOM);
 * `useTouchDrag` ties it to a row: the lift, the floating copy, the meal under the finger and the auto-scroll.
 */

/** How long a finger rests on a row before it lifts (the same hold as the long press). */
export const TOUCH_LIFT_MS = 500;
/** Moving more than this before the lift cancels it (the list scrolls); after the lift it starts the drag. */
export const TOUCH_MOVE_PX = 8;
/** The finger this close to the top or bottom edge of the list scrolls it. */
export const AUTOSCROLL_EDGE_PX = 48;
const AUTOSCROLL_MAX_PX = 12;
/** On a phone the floating tab bar (64 px, 24 px up) covers the bottom of the screen: the bottom scroll band sits above it. */
const PAGE_BOTTOM_RESERVE_PX = 88;
/** The copy eases back to the row in this long when it is let go off target. */
const SPRING_BACK_MS = 200;

/** Only on a day that can be edited (today, yesterday), not in select mode and not while a sheet is open. */
export const canTouchDrag = ({ editable, selecting, sheetOpen }: { editable: boolean; selecting: boolean; sheetOpen: boolean }): boolean =>
  editable && !selecting && !sheetOpen;

/** How far (px per frame, negative is up) the list scrolls with the finger at `y`: nothing outside the edge bands, more the closer to the edge. */
export function autoScrollDelta(y: number, top: number, bottom: number, edge = AUTOSCROLL_EDGE_PX, max = AUTOSCROLL_MAX_PX): number {
  if (y < top + edge) return -Math.round(max * Math.min(1, (top + edge - y) / edge)) || 0;
  if (y > bottom - edge) return Math.round(max * Math.min(1, (y - (bottom - edge)) / edge)) || 0;
  return 0;
}

export type TouchDragPhase = "idle" | "pressing" | "lifted" | "dragging";

export interface TouchDragOptions<S extends string> {
  /** The meal the row is in: dropping there changes nothing. */
  from: S;
  /** The meal under a point of the screen, or null. */
  slotAt: (x: number, y: number) => S | null;
  /** The finger has rested for TOUCH_LIFT_MS. */
  onLift: () => void;
  /** The first move after the lift: the copy appears. */
  onDragStart: (x: number, y: number) => void;
  /** Every move of the drag. */
  onMove: (x: number, y: number) => void;
  /** The meal that would take the food changed (null: none, or the meal it is already in). */
  onTarget: (slot: S | null) => void;
  /** Let go over another meal. */
  onDrop: (slot: S) => void;
  /** Let go over the same meal or outside any: the row springs back, nothing changes. */
  onSpringBack: () => void;
  /** Let go after the lift without moving: the long press action. */
  onLongPress: () => void;
  /** The gesture ended with no change (moved too early, or the system took the touch). */
  onCancel: () => void;
}

export type TouchDragEnd = "none" | "tap" | "long-press" | "drop" | "spring-back";

/** One gesture, from the finger down to the finger up (or cancel). Make a new one for each touch. */
export function createTouchDrag<S extends string>(o: TouchDragOptions<S>) {
  let phase: TouchDragPhase = "idle";
  let startX = 0;
  let startY = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let target: S | null = null;

  const clearTimer = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };
  const finish = () => {
    clearTimer();
    phase = "idle";
    if (target !== null) {
      target = null;
      o.onTarget(null);
    }
  };
  const retarget = (x: number, y: number) => {
    const at = o.slotAt(x, y);
    const next = at !== null && at !== o.from ? at : null;
    if (next === target) return;
    target = next;
    o.onTarget(next);
  };

  return {
    get phase(): TouchDragPhase {
      return phase;
    },
    down(x: number, y: number): void {
      if (phase !== "idle") return;
      phase = "pressing";
      startX = x;
      startY = y;
      timer = setTimeout(() => {
        timer = null;
        phase = "lifted";
        o.onLift();
      }, TOUCH_LIFT_MS);
    },
    move(x: number, y: number): void {
      if (phase === "idle") return;
      if (phase === "dragging") {
        o.onMove(x, y);
        retarget(x, y);
        return;
      }
      if (Math.hypot(x - startX, y - startY) <= TOUCH_MOVE_PX) return;
      if (phase === "pressing") {
        // Moved before the lift: a scroll, as it always was
        finish();
        o.onCancel();
        return;
      }
      phase = "dragging";
      o.onDragStart(x, y);
      retarget(x, y);
    },
    /** The list scrolled under a finger that did not move: the meal under it may be another. */
    retarget(x: number, y: number): void {
      if (phase === "dragging") retarget(x, y);
    },
    up(x: number, y: number): TouchDragEnd {
      const was = phase;
      if (was === "idle") return "none";
      if (was === "dragging") {
        const at = o.slotAt(x, y);
        const drop = at !== null && at !== o.from ? at : null;
        finish();
        if (drop === null) {
          o.onSpringBack();
          return "spring-back";
        }
        o.onDrop(drop);
        return "drop";
      }
      finish();
      if (was === "lifted") {
        o.onLongPress();
        return "long-press";
      }
      return "tap";
    },
    cancel(): void {
      if (phase === "idle") return;
      finish();
      o.onCancel();
    },
  };
}

type RowEvent = ReactPointerEvent<HTMLElement>;

export interface TouchDragProps {
  /** False: the row behaves as before (the long press alone). */
  enabled: boolean;
  /** The meal the row is in. */
  slot: string;
  /** Released after the lift without moving: the long press action. */
  onLongPress: () => void;
  /** The meal under the finger, for the highlight (null: none). */
  onTarget: (slot: string | null) => void;
  /** Released over another meal. */
  onDrop: (slot: string) => void;
}

/**
 * Pointer handlers for a row (a button) that lifts after a hold and drags to another meal. Each handler returns true when
 * the touch belongs to the drag, so the caller leaves it alone; for a mouse, or when `enabled` is false, they return false.
 * The row needs `data-meal-slot` sections around it and a scroller marked `data-food-scroll`.
 */
export function useTouchDrag(props: TouchDragProps) {
  const latest = useRef(props);
  latest.current = props;
  const gesture = useRef<{ ctrl: ReturnType<typeof createTouchDrag<string>>; id: number } | null>(null);
  /** The click that follows a lift must not select the food. */
  const justLifted = useRef(false);
  const lastType = useRef("mouse");
  const locked = useRef(false);
  const cleanup = useRef<(() => void) | null>(null);
  const rowRef = useRef<HTMLElement | null>(null);

  // A touch scroll can only be stopped from a touchmove that is not passive; the lift is when it must stop
  const stopScroll = useRef((e: TouchEvent) => {
    if (locked.current && e.cancelable) e.preventDefault();
  }).current;
  const bindLock = (el: HTMLElement) => {
    if (rowRef.current === el) return;
    rowRef.current?.removeEventListener("touchmove", stopScroll);
    rowRef.current = el;
    el.addEventListener("touchmove", stopScroll, { passive: false });
  };

  useEffect(
    () => () => {
      cleanup.current?.();
      rowRef.current?.removeEventListener("touchmove", stopScroll);
      rowRef.current = null;
    },
    [stopScroll]
  );

  const start = (e: RowEvent) => {
    const el = e.currentTarget;
    const scroller = el.closest<HTMLElement>("[data-food-scroll]");
    const reduced = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
    let ghost: HTMLElement | null = null;
    let frame = 0;
    let landing: ReturnType<typeof setTimeout> | null = null;
    let offX = 0;
    let offY = 0;
    let lastX = e.clientX;
    let lastY = e.clientY;
    const pointerId = e.pointerId;

    const place = (x: number, y: number) => {
      if (ghost) ghost.style.transform = `translate3d(${x - offX}px, ${y - offY}px, 0) scale(${reduced ? 1 : 1.03})`;
    };
    const end = () => {
      cleanup.current = null;
      if (landing) clearTimeout(landing);
      landing = null;
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      ghost?.remove();
      ghost = null;
      locked.current = false;
      el.removeAttribute("data-touch-drag");
      el.style.touchAction = "";
      scroller?.removeAttribute("data-touch-dragging");
      try {
        if (el.hasPointerCapture?.(pointerId)) el.releasePointerCapture(pointerId);
      } catch {
        // The element is gone already
      }
      gesture.current = null;
      // The click that ends a lifted touch comes right after the pointer goes up
      setTimeout(() => {
        justLifted.current = false;
      }, 400);
    };
    cleanup.current = end;

    const scrollLoop = () => {
      frame = requestAnimationFrame(scrollLoop);
      if (!scroller) return;
      // From lg the list card scrolls itself; on a phone (V3) the page does, and the glass tab bar covers the bottom of the screen
      const inner = getComputedStyle(scroller).overflowY === "auto";
      const box = scroller.getBoundingClientRect();
      const step = inner ? autoScrollDelta(lastY, box.top, box.bottom) : autoScrollDelta(lastY, 0, window.innerHeight - PAGE_BOTTOM_RESERVE_PX);
      if (step === 0) return;
      if (inner) scroller.scrollTop += step;
      else window.scrollBy(0, step);
      ctrl.retarget(lastX, lastY);
    };

    const ctrl = createTouchDrag<string>({
      from: latest.current.slot,
      slotAt: (x, y) => {
        const section = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-meal-slot]");
        return section && scroller?.contains(section) ? (section.dataset.mealSlot ?? null) : null;
      },
      onLift: () => {
        justLifted.current = true;
        locked.current = true;
        el.setAttribute("data-touch-drag", "lifted");
        el.style.touchAction = "none";
        // The list must not also pull to refresh or scroll while the row is held
        scroller?.setAttribute("data-touch-dragging", "");
        try {
          el.setPointerCapture(pointerId);
        } catch {
          // The pointer is gone already
        }
        haptic("longPress");
      },
      onDragStart: (x, y) => {
        const box = el.getBoundingClientRect();
        offX = x - box.left;
        offY = y - box.top;
        const copy = el.cloneNode(true) as HTMLElement;
        copy.className = `${copy.className.replace(/\b(bg-transparent|m-row-enter|m-drag-lift)\b/g, "")} m-drag-ghost`;
        for (const attr of ["data-tour", "data-entry-id", "data-touch-drag", "aria-pressed", "id"]) copy.removeAttribute(attr);
        copy.setAttribute("aria-hidden", "true");
        copy.style.width = `${box.width}px`;
        copy.style.height = `${box.height}px`;
        copy.style.touchAction = "none";
        document.body.appendChild(copy);
        ghost = copy;
        el.setAttribute("data-touch-drag", "dragging");
        place(x, y);
        frame = requestAnimationFrame(scrollLoop);
      },
      onMove: (x, y) => {
        lastX = x;
        lastY = y;
        place(x, y);
      },
      onTarget: (slot) => {
        latest.current.onTarget(slot);
        if (slot !== null) haptic("moveDrop");
      },
      onDrop: (slot) => {
        // The row is drawn in its new meal from where the copy is now (row-motion plays it in from this box)
        const id = el.dataset.entryId;
        if (ghost && id) {
          const box = ghost.getBoundingClientRect();
          setLanding(id, { cx: box.left + box.width / 2, cy: box.top + box.height / 2, width: box.width });
        }
        end();
        latest.current.onDrop(slot);
      },
      onSpringBack: () => {
        if (!ghost || reduced) return end();
        const box = el.getBoundingClientRect();
        ghost.setAttribute("data-landing", "");
        ghost.style.transform = `translate3d(${box.left}px, ${box.top}px, 0)`;
        landing = setTimeout(end, SPRING_BACK_MS + 20);
      },
      onLongPress: () => {
        end();
        markUsed("long-press-edit");
        latest.current.onLongPress();
      },
      onCancel: end,
    });
    gesture.current = { ctrl, id: pointerId };
    // From the touch-down the row's tint deepens for the hold (globals.css m-hold-tint); onLift makes it "lifted"
    el.setAttribute("data-touch-drag", "pressing");
    ctrl.down(e.clientX, e.clientY);
  };

  const mine = (e: RowEvent) => gesture.current?.id === e.pointerId;

  return {
    /** The click after a lifted touch: the row ignores it once. */
    justLifted,
    /** Whether the last pointer on the row was a touch or a pen (the HTML5 drag must not start then). */
    touchLast: () => lastType.current !== "mouse",
    /** A touch or pen went down: true when it is the drag's. */
    onPointerDown(e: RowEvent): boolean {
      lastType.current = e.pointerType;
      if (!latest.current.enabled || e.pointerType === "mouse" || !e.isPrimary) return false;
      bindLock(e.currentTarget);
      gesture.current?.ctrl.cancel();
      start(e);
      return true;
    },
    onPointerMove(e: RowEvent): boolean {
      if (!mine(e)) return false;
      gesture.current?.ctrl.move(e.clientX, e.clientY);
      return true;
    },
    onPointerUp(e: RowEvent): boolean {
      if (!mine(e)) return false;
      const g = gesture.current;
      const result = g?.ctrl.up(e.clientX, e.clientY);
      // A tap (let go before the lift) ends here; its click selects the food as before
      if (result === "tap" || result === "none") {
        cleanup.current?.();
      }
      return true;
    },
    onPointerCancel(e: RowEvent): boolean {
      if (!mine(e)) return false;
      gesture.current?.ctrl.cancel();
      cleanup.current?.();
      return true;
    },
  } as const;
}

export type TouchDrag = ReturnType<typeof useTouchDrag>;
