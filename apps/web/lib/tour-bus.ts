import { tourReduce, type TourAction, type TourEvent, type TourState } from "./tour";

/**
 * Where a running tour lives while the user moves between screens: sessionStorage (a reload keeps the step, a new
 * tab does not). Screens tell the tour what happened (tourAction) and the overlay listens (subscribeTour).
 * Client only.
 */
const TOUR_KEY = "h1t_tour_v1";
const OFF: TourState = { status: "off" };

export function readTour(): TourState {
  try {
    const raw = globalThis.sessionStorage?.getItem(TOUR_KEY);
    if (!raw) return OFF;
    const v = JSON.parse(raw);
    if (v?.status === "step" && Number.isInteger(v.index) && v.index >= 0) return { status: "step", index: v.index };
  } catch {
    // Storage blocked: no tour
  }
  return OFF;
}

export function writeTour(state: TourState): void {
  try {
    if (state.status === "step") globalThis.sessionStorage?.setItem(TOUR_KEY, JSON.stringify(state));
    else globalThis.sessionStorage?.removeItem(TOUR_KEY);
  } catch {
    // Storage blocked
  }
  notify();
}

type Listener = () => void;
const listeners = new Set<Listener>();
const notify = () => listeners.forEach((l) => l());
export function subscribeTour(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function startTour(): void {
  writeTour(tourReduce(OFF, { type: "start" }));
}

/** A screen reports what the user just did (food-picked, portion-confirmed, add-opened). Only the step it belongs to moves. */
export function tourAction(name: TourAction): void {
  const before = readTour();
  const event: TourEvent = { type: "action", name };
  const after = tourReduce(before, event);
  if (after !== before) writeTour(after);
}

/** Other things the overlay watches (Chọn nhiều món opened). */
type UiSignal = "select-mode";
const signalListeners = new Set<(signal: UiSignal) => void>();
export const emitSignal = (signal: UiSignal) => signalListeners.forEach((l) => l(signal));
export function subscribeSignal(listener: (signal: UiSignal) => void): () => void {
  signalListeners.add(listener);
  return () => signalListeners.delete(listener);
}
