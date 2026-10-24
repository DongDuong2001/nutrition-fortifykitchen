import { accountStorage, type KeyValueStore } from "./storage-keys";
import { loadSettings } from "./settings";

/**
 * cc-51 Part C: short vibrations on Android (navigator.vibrate). iOS has no vibrate, so nothing happens there and the
 * switch is not shown. Never on scroll, typing, a tab switch or a page load: only the actions below call haptic().
 */
export type HapticKind = "saved" | "longPress" | "moveDrop" | "delete" | "undo" | "error" | "goal100" | "snap" | "tick" | "levelUp";

export const HAPTIC_PATTERNS: Readonly<Record<HapticKind, number | number[]>> = {
  saved: 10,
  longPress: 20,
  moveDrop: 8,
  delete: [10, 40, 10],
  undo: 10,
  error: 60,
  goal100: [15, 60, 15],
  // cc-62: a sheet closing under the finger, and pull to refresh crossing its threshold
  snap: 12,
  tick: 5,
  // The Level-up celebration's hatch (a tick marks each cross-fade before it)
  levelUp: [30, 30, 70],
};

/** "Rung khi chạm": on unless switched off; with reduced motion it stays off until the user switches it on. */
export function hapticsWanted(setting: boolean | null, reducedMotion: boolean): boolean {
  return setting ?? !reducedMotion;
}

/** A touch phone that can vibrate (Android). Desktop Chrome has navigator.vibrate too, but nothing vibrates there. */
export function canVibrate(): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.vibrate === "function" &&
    typeof window !== "undefined" &&
    window.matchMedia?.("(pointer: coarse)").matches === true
  );
}

export function haptic(kind: HapticKind, storage: KeyValueStore | null = accountStorage()): void {
  if (!canVibrate()) return;
  const reduced = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
  if (!hapticsWanted(loadSettings(storage).haptics, reduced)) return;
  try {
    navigator.vibrate(HAPTIC_PATTERNS[kind]);
  } catch {
    // Some browsers throw without a user gesture: no vibration then
  }
}
