// cc-62: how a dragged sheet decides, on release, whether to close or go back up (audit M1–M2). Pure functions: the drag
// hook (components/ui/use-sheet-drag.ts) feeds them the last pointer samples and the sheet's height.

/** One pointermove: when (ms, the event's timeStamp) and where (the sheet's offset in px, down is positive). */
export interface DragSample {
  t: number;
  y: number;
}

/** How many samples the hook keeps. */
export const SAMPLE_COUNT = 5;
/** The release speed is the slope over at most this window before the last sample. */
export const VELOCITY_WINDOW_MS = 80;
/** A finger that stood still this long before letting go was not flicking. */
export const STILL_MS = 100;
/** Faster than this downward (px/ms) closes whatever the distance. */
export const FLICK_SPEED = 0.4;
/** A toast is small and light: a swipe sideways this fast (px/ms) dismisses it whatever the distance. */
export const TOAST_FLICK_SPEED = 0.11;
/** Momentum projection with a deceleration rate of 0.998 per ms: the distance it would still travel is v · 0.998 / (1 − 0.998). */
export const PROJECTION_MS = 499;

/** Keeps the last SAMPLE_COUNT samples (a new array, the old one is left as it is). */
export function pushSample(samples: readonly DragSample[], sample: DragSample): DragSample[] {
  const next = [...samples, sample];
  return next.length > SAMPLE_COUNT ? next.slice(next.length - SAMPLE_COUNT) : next;
}

/**
 * The release velocity in px/ms (down positive): the slope between the last sample and the oldest one within
 * VELOCITY_WINDOW_MS of it. 0 when the finger stood still for STILL_MS or more before `releaseAt`, or with fewer than two
 * samples in the window.
 */
export function releaseVelocity(samples: readonly DragSample[], releaseAt: number): number {
  const last = samples[samples.length - 1];
  if (!last || releaseAt - last.t >= STILL_MS) return 0;
  let first = last;
  for (let i = samples.length - 2; i >= 0; i--) {
    if (last.t - samples[i].t > VELOCITY_WINDOW_MS) break;
    first = samples[i];
  }
  const dt = last.t - first.t;
  return dt > 0 ? (last.y - first.y) / dt : 0;
}

/** Where the sheet would come to rest if it kept its momentum. */
export function projectedOffset(pos: number, velocity: number): number {
  return pos + PROJECTION_MS * velocity;
}

/**
 * Close or go back? An upward release velocity never closes. Otherwise it closes when it is a flick (v > FLICK_SPEED) or
 * when the projected rest point is past half of the sheet.
 */
export function shouldDismiss(pos: number, velocity: number, height: number): boolean {
  if (velocity < 0) return false;
  return velocity > FLICK_SPEED || projectedOffset(pos, velocity) > height / 2;
}

/** Spring options for the release (motion's animate), velocity in px/s. */
export function releaseSpring(dismiss: boolean, velocityPxPerMs: number): { type: "spring"; bounce: number; visualDuration: number; velocity: number } {
  const velocity = velocityPxPerMs * 1000;
  // A flick that did not close (it was too short) settles with a little bounce; a slow release does not
  const flicked = Math.abs(velocityPxPerMs) > FLICK_SPEED;
  return { type: "spring", bounce: dismiss ? 0 : flicked ? 0.15 : 0, visualDuration: 0.3, velocity };
}
