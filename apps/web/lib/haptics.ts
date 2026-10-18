import { accountStorage, type KeyValueStore } from "./storage-keys";
import { loadSettings } from "./settings";

/**
 * cc-51 Part C: short vibrations on Android (navigator.vibrate). iOS has no vibrate, so nothing happens there and the
 * switch is not shown. Never on scroll, typing, a tab switch or a page load: only the actions below call haptic().
 */
export type HapticKind = "saved" | "longPress" | "moveDrop" | "delete" | "undo" | "error" | "goal100";

export const HAPTIC_PATTERNS: Readonly<Record<HapticKind, number | number[]>> = {
  saved: 10,
  longPress: 20,
  moveDrop: 8,
  delete: [10, 40, 10],
  undo: 10,
  error: 60,
  goal100: [15, 60, 15],
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

/**
 * After today's nutrients changed: true when a vitamin or mineral is over 100 % now, was not before, and reaches it
 * for the first time today (`firstToday` records it), and the change came from a local add. The first read (`before`
 * null) and a refetch (entries from another device, the poll, pull to refresh) record but never vibrate.
 */
export function goal100Reached(
  over: ReadonlySet<string>,
  before: ReadonlySet<string> | null,
  localAdd: boolean,
  firstToday: (key: string) => boolean
): boolean {
  const reached = [...over].filter((key) => firstToday(key) && before !== null && !before.has(key));
  return localAdd && reached.length > 0;
}

const GOAL_KEY = "h1t_goal100";

/** True the first time `nutrient` reaches 100 % on `date` for this account (remembered), false after that. */
export function firstGoalToday(nutrient: string, date: string, storage: KeyValueStore | null = accountStorage()): boolean {
  let seen: string[] = [];
  try {
    const saved = JSON.parse(storage?.getItem(GOAL_KEY) ?? "null");
    if (saved?.date === date && Array.isArray(saved.nutrients)) seen = saved.nutrients;
  } catch {
    // Unreadable: start the day again
  }
  if (seen.includes(nutrient)) return false;
  try {
    storage?.setItem(GOAL_KEY, JSON.stringify({ date, nutrients: [...seen, nutrient] }));
  } catch {
    // Storage full or blocked
  }
  return true;
}
