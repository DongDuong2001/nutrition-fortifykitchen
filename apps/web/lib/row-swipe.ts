/**
 * Job I: swipe a food row on Hôm nay (today only, touch only). Left reveals Xóa, right reveals ⋯. Pure: `createRowSwipe` is the
 * gesture (tested without a DOM), `offsetFor` and `endOf` its two rules. lib/use-row-swipe ties it to a row.
 */

/** The finger must move this far, and more across than down, before the row moves: a vertical scroll and pull to refresh stay as they are. */
export const SWIPE_LOCK_PX = 10;
/** The width of the button a row rests open on. ≥ 44 px (D-CTL). */
export const SWIPE_ACTION_PX = 56;
/** Released past this share of the row: it rests open (left), or opens the menu at once (right). */
export const SWIPE_OPEN_FRACTION = 0.25;
/** Released past this share of the row going left: it is deleted. */
export const SWIPE_DELETE_FRACTION = 0.6;
/** The row can be pulled right this far (a share of its width) before the rubber band holds it. */
export const SWIPE_RIGHT_MAX_FRACTION = 0.35;
/** Past an end the row follows the finger this much (a quarter). */
const RUBBER = 0.25;

export type SwipeRest = "closed" | "left" | "right";
export type SwipeEnd = "delete" | "open-left" | "open-right" | "menu" | "close";
export type SwipeState = "idle" | "pressing" | "swiping" | "scroll" | "done";

const rightMax = (width: number) => Math.round(width * SWIPE_RIGHT_MAX_FRACTION);

/** Where the row is for a finger that has moved `dx` since it went down, starting from where the row rests. */
export function offsetFor(rest: SwipeRest, dx: number, width: number): number {
  const base = rest === "left" ? -SWIPE_ACTION_PX : rest === "right" ? SWIPE_ACTION_PX : 0;
  const raw = base + dx;
  const right = rightMax(width);
  if (raw < -width) return -width + (raw + width) * RUBBER;
  if (raw > right) return right + (raw - right) * RUBBER;
  return raw;
}

/** What letting go at `offset` does. */
export function endOf(rest: SwipeRest, offset: number, width: number): SwipeEnd {
  if (offset <= -width * SWIPE_DELETE_FRACTION) return "delete";
  // Resting on the ⋯ already puts the row past 25 % of a narrow row: from there it takes half a button more to open the menu, but never
  // more than the pull can give (it is held at 35 % of the row, then a quarter of the finger: 65 px on the 185 px column, so 84 px was ~85 px of finger)
  if (rest === "right") return offset >= Math.min(SWIPE_ACTION_PX * 1.5, rightMax(width) + 4) ? "menu" : offset > SWIPE_ACTION_PX / 2 ? "open-right" : "close";
  if (offset >= width * SWIPE_OPEN_FRACTION) return "menu";
  if (rest === "left") return offset < -SWIPE_ACTION_PX / 2 ? "open-left" : "close";
  if (offset <= -width * SWIPE_OPEN_FRACTION) return "open-left";
  if (offset > SWIPE_ACTION_PX / 2) return "open-right";
  return "close";
}

export interface SwipeMove {
  locked: true;
  /** Where the row is now (px, negative is left) */
  offset: number;
  /** The row is past the point where letting go deletes it */
  pastDelete: boolean;
}

/** One gesture, from the finger down to the finger up (or cancel). Make a new one for each touch. */
export function createRowSwipe({ width, rest }: { width: number; rest: SwipeRest }) {
  let state: SwipeState = "idle";
  let startX = 0;
  let startY = 0;
  let offset = rest === "left" ? -SWIPE_ACTION_PX : rest === "right" ? SWIPE_ACTION_PX : 0;
  return {
    get state(): SwipeState {
      return state;
    },
    down(x: number, y: number): void {
      if (state !== "idle") return;
      state = "pressing";
      startX = x;
      startY = y;
    },
    /** Null until the gesture is a swipe (and for good once it was taken for a scroll). */
    move(x: number, y: number): SwipeMove | null {
      if (state === "pressing") {
        const dx = Math.abs(x - startX);
        const dy = Math.abs(y - startY);
        if (Math.max(dx, dy) < SWIPE_LOCK_PX) return null;
        if (dx <= dy) {
          state = "scroll";
          return null;
        }
        state = "swiping";
      }
      if (state !== "swiping") return null;
      offset = offsetFor(rest, x - startX, width);
      return { locked: true, offset, pastDelete: offset <= -width * SWIPE_DELETE_FRACTION };
    },
    /** "none": it was never a swipe (a tap, a scroll). */
    up(): SwipeEnd | "none" {
      const was = state;
      state = "done";
      return was === "swiping" ? endOf(rest, offset, width) : "none";
    },
    /** The system took the touch: the row closes and nothing happens. */
    cancel(): "close" | "none" {
      const was = state;
      state = "done";
      return was === "swiping" ? "close" : "none";
    },
  };
}
