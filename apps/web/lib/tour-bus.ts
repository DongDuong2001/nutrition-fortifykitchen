import { getTodayIsoVN } from "./date";
import { markTourStarted } from "./onboarding-store";
import { RELEASES, joinedTour, type ReleaseTourStep } from "./releases";
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
  markTourStarted(getTodayIsoVN());
  writeTour(tourReduce(OFF, { type: "start" }));
}

/** A screen reports what the user just did (food-picked, portion-confirmed, add-opened). Only the step it belongs to moves. */
export function tourAction(name: TourAction): void {
  const before = readTour();
  const event: TourEvent = { type: "action", name };
  const after = tourReduce(before, event);
  if (after !== before) writeTour(after);
}

/** Other things the overlay watches (Chọn nhiều món opened or closed), and requests to Hôm nay (end Chọn nhiều món). */
type UiSignal = "select-mode" | "select-off" | "end-select" | "open-share";
const signalListeners = new Set<(signal: UiSignal) => void>();
export const emitSignal = (signal: UiSignal) => signalListeners.forEach((l) => l(signal));
export function subscribeSignal(listener: (signal: UiSignal) => void): () => void {
  signalListeners.add(listener);
  return () => signalListeners.delete(listener);
}

/**
 * Whether a first-visit tip is open or due on the screen shown (OnboardingLayer sets it). Things that must not open
 * on top of a tip, like the install pop-up, wait while it is true.
 */
let tipBusy: boolean | null = null;
const busyListeners = new Set<Listener>();
/** null: the layer has not looked yet (or is not mounted), so a tip may still turn up. */
export const isTipBusy = (): boolean | null => tipBusy;
export function setTipBusy(next: boolean | null): void {
  if (next === tipBusy) return;
  tipBusy = next;
  busyListeners.forEach((l) => l());
}
export function subscribeTipBusy(listener: Listener): () => void {
  busyListeners.add(listener);
  return () => busyListeners.delete(listener);
}

/**
 * Overlays that open by themselves and must not open on top of each other (cc-46): the install pop-up, the "Có gì
 * mới" sheet and its tour. Each sets its own flag; listeners are the tip-busy ones.
 */
export type Overlay = "install" | "whats-new" | "whats-new-tour";
const overlays = new Set<Overlay>();
export const isOverlayOpen = (name: Overlay): boolean => overlays.has(name);
export function setOverlayOpen(name: Overlay, open: boolean): void {
  if (open === overlays.has(name)) return;
  if (open) overlays.add(name);
  else overlays.delete(name);
  busyListeners.forEach((l) => l());
}

/**
 * Things on screen that have a first-visit tip of their own: an open sheet (drag down to close), the unit stepper, and
 * cc-53b's portion controls (×N, Sống | Chín, the egg's Quả | Gam, a row of the tray). Counted, since two can be up at
 * once. Listeners are the tip-busy ones.
 */
export type Presence = "sheet" | "stepper" | "multiply" | "cook" | "egg" | "tray";
/** The portion controls a tip can wait for (every Presence but the sheet). */
export const PORTION_PRESENCES = ["stepper", "multiply", "cook", "egg", "tray"] as const;
const present = new Map<Presence, number>();
export const isPresent = (name: Presence): boolean => (present.get(name) ?? 0) > 0;
export function setPresent(name: Presence, on: boolean): void {
  const before = isPresent(name);
  present.set(name, Math.max(0, (present.get(name) ?? 0) + (on ? 1 : -1)));
  if (isPresent(name) !== before) busyListeners.forEach((l) => l());
}

/**
 * The running "Có gì mới" tour (cc-46), in sessionStorage like the first-run tour: the releases whose tours it joins
 * (lib/releases joinedTour), the step it is on, and (`only`) which steps were on the page when it started, as places
 * in lib/releases tourSteps (before the 8-step cap), so a step that cannot show on Hôm nay is never counted in
 * "Mới · n/N" and never takes the place of one that can.
 */
export interface WhatsNewTour {
  releaseIds: string[];
  index: number;
  only?: number[];
}
const WN_TOUR_KEY = "h1t_wn_tour_v1";

export function readWhatsNewTour(): WhatsNewTour | null {
  try {
    const v = JSON.parse(globalThis.sessionStorage?.getItem(WN_TOUR_KEY) ?? "null");
    if (!Number.isInteger(v?.index) || v.index < 0) return null;
    const only = Array.isArray(v.only) && v.only.every(Number.isInteger) ? (v.only as number[]) : undefined;
    if (Array.isArray(v.releaseIds) && v.releaseIds.every((id: unknown) => typeof id === "string")) return { releaseIds: v.releaseIds, index: v.index, only };
    // A tour saved before several releases could run together: one release
    if (typeof v.releaseId === "string") return { releaseIds: [v.releaseId], index: v.index };
  } catch {
    // Storage blocked or bad JSON: no tour
  }
  return null;
}

/** The steps a running tour walks through, in order: those on the page when it started, then the 8-step cap. */
export function whatsNewSteps(tour: WhatsNewTour | null): ReleaseTourStep[] {
  if (!tour) return [];
  const only = tour.only;
  return only ? joinedTour(tour.releaseIds, RELEASES, (_, i) => only.includes(i)) : joinedTour(tour.releaseIds);
}

export function writeWhatsNewTour(tour: WhatsNewTour | null): void {
  try {
    if (tour) globalThis.sessionStorage?.setItem(WN_TOUR_KEY, JSON.stringify(tour));
    else globalThis.sessionStorage?.removeItem(WN_TOUR_KEY);
  } catch {
    // Storage blocked
  }
  notify();
}
