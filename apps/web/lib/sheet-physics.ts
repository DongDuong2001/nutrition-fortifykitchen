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

/** How long the release spring takes to settle (its envelope is down to 0.2 %), in ms. */
export const RELEASE_SETTLE_MS = 280;
/** How many points the spring is sampled at for the browser's linear() easing. */
const SPRING_STEPS = 40;
/** The CSS easing of a release when linear() is not there (an older browser): the sheet curve, no velocity carried over. */
export const RELEASE_FALLBACK = { easing: "cubic-bezier(0.32, 0.72, 0, 1)", durationMs: 300 } as const;

/**
 * Progress (0 at the start, 1 at the target) of a damped spring after `t` seconds. `omega` is its natural frequency in rad/s,
 * `zeta` the damping ratio (1 = no bounce) and `v0` the progress it already moves with at t = 0, in 1/s: the finger's speed over
 * the distance still to go (positive toward the target).
 */
export function springProgress(t: number, omega: number, zeta: number, v0: number): number {
  if (zeta >= 1) return 1 - Math.exp(-omega * t) * (1 + (omega - v0) * t);
  const wd = omega * Math.sqrt(1 - zeta * zeta);
  return 1 - Math.exp(-zeta * omega * t) * (Math.cos(wd * t) + ((zeta * omega - v0) / wd) * Math.sin(wd * t));
}

export interface ReleasePlan {
  /** The sheet's offset (px, down positive) where the finger let go, and where it ends up. */
  from: number;
  to: number;
  durationMs: number;
  /** A CSS easing for WAAPI: linear(...) sampled from the spring, so it starts with the finger's own speed. */
  easing: string;
}

/**
 * The motion after a release, as one WAAPI animation that starts in the same pointerup: from the offset where the finger let go
 * to the open (0) or closed (height) position, a spring that begins with the speed the finger had (`velocityPxPerMs`, down
 * positive), so there is no pause and no lurch between the drag and the settle. A close carries on without a bounce; a snap
 * back after a flick settles with a little (bounce 0.15); a slow release does not bounce.
 */
export function releasePlan(pos: number, dismiss: boolean, velocityPxPerMs: number, height: number, linearSupported = true): ReleasePlan {
  const to = dismiss ? height : 0;
  if (!linearSupported) return { from: pos, to, ...RELEASE_FALLBACK };
  const flicked = Math.abs(velocityPxPerMs) > FLICK_SPEED;
  const zeta = 1 - (dismiss ? 0 : flicked ? 0.15 : 0);
  const omega = Math.log(1 / 0.002) / (zeta * (RELEASE_SETTLE_MS / 1000));
  const distance = to - pos;
  // The finger's speed as a share of the distance to go per second; capped so a short distance cannot throw the sheet far past it
  const raw = Math.abs(distance) > 0.5 ? (velocityPxPerMs * 1000) / distance : 0;
  const v0 = Math.max(-2 * omega, Math.min(dismiss ? 3 * omega : 1.5 * omega, raw));
  const points: string[] = [];
  for (let i = 0; i <= SPRING_STEPS; i++) {
    const p = i === SPRING_STEPS ? 1 : springProgress((i / SPRING_STEPS) * (RELEASE_SETTLE_MS / 1000), omega, zeta, v0);
    points.push(String(Math.round(p * 10000) / 10000));
  }
  return { from: pos, to, durationMs: RELEASE_SETTLE_MS, easing: `linear(${points.join(", ")})` };
}
