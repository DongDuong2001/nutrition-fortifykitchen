/**
 * Press and hold (Job A, hero hold): how long and how far a finger may move. The same hold a meal row uses for the edit screen
 * (components/home/food-list.tsx LONG_PRESS_MS / MOVE_LIMIT_PX); a move past the limit is a scroll, never a hold.
 */
export const HOLD_MS = 500;
export const HOLD_MOVE_PX = 10;

/**
 * One hold timer for a group of controls: `start` says which one is pressed, and the hold fires with it after HOLD_MS unless the
 * finger lifts, moves more than HOLD_MOVE_PX or the browser takes the touch for a scroll (`cancel`). `fire` is the shortcut a
 * right-click or the browser's own long-press menu takes (the hold then says it was not the timer). The click that follows a hold is `takeFired()`: true once, so the
 * hold does not also do what a tap does.
 */
export function createHold<T>(onHold: (arg: T, heldByTimer: boolean) => void) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let origin: { x: number; y: number } | null = null;
  let fired = false;
  const cancel = () => {
    if (timer) clearTimeout(timer);
    timer = null;
    origin = null;
  };
  const fire = (arg: T, heldByTimer = false) => {
    if (fired) return;
    cancel();
    fired = true;
    onHold(arg, heldByTimer);
  };
  return {
    start(arg: T, x: number, y: number) {
      cancel();
      fired = false;
      origin = { x, y };
      timer = setTimeout(() => fire(arg, true), HOLD_MS);
    },
    move(x: number, y: number) {
      if (origin && Math.hypot(x - origin.x, y - origin.y) > HOLD_MOVE_PX) cancel();
    },
    cancel,
    fire,
    /** A new press of any button: the last hold is over, whether or not a click took it (the guard may have swallowed that click) */
    reset() {
      fired = false;
    },
    takeFired() {
      const was = fired;
      fired = false;
      return was;
    },
  };
}

/** The lifted finger of a hold can still deliver a click for this long. */
export const CLICK_GUARD_MS = 400;

/**
 * A hold opens a sheet under the finger, and when the finger lifts the browser may still send a click: the sheet's scrim would
 * take it as "close". From the hold until the finger lifts (plus CLICK_GUARD_MS) the next click anywhere is swallowed. Not armed
 * for a right-click, which has no click after it. The cap is only for a pointer that never reports its end.
 */
export function guardNextClick(doc: Pick<Document, "addEventListener" | "removeEventListener">): void {
  let soon: ReturnType<typeof setTimeout> | undefined;
  let cap: ReturnType<typeof setTimeout> | undefined;
  const swallow = (e: Event) => {
    e.stopPropagation();
    e.preventDefault();
    release();
  };
  const lifted = () => {
    soon = setTimeout(release, CLICK_GUARD_MS);
  };
  const release = () => {
    clearTimeout(soon);
    clearTimeout(cap);
    doc.removeEventListener("click", swallow, true);
    doc.removeEventListener("pointerup", lifted, true);
    doc.removeEventListener("pointercancel", lifted, true);
  };
  doc.addEventListener("click", swallow, true);
  doc.addEventListener("pointerup", lifted, true);
  doc.addEventListener("pointercancel", lifted, true);
  cap = setTimeout(release, 10_000);
}
