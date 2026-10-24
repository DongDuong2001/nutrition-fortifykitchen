import { haptic, type HapticKind } from "./haptics";
import type { Moment } from "./goals";
import { playSound, type SoundKind } from "./sound";
import { accountStorage, type KeyValueStore } from "./storage-keys";

/**
 * feat/sound-goals §2: one cue for the sound and the haptic of a tap, from one table, so they never drift. haptic() alone stays for
 * the kinds with no sound (longPress, moveDrop, snap, tick, error). Not lib/feedback: that is Góp ý & hỗ trợ.
 */
export const CUE_HAPTICS: Readonly<Record<SoundKind, HapticKind>> = {
  add: "saved",
  remove: "delete",
  undo: "undo",
  save: "saved",
  goal: "goal100",
  day: "goal100",
  full: "goal100",
};

/** The sound of a goal moment's tier (lib/goals momentFor). */
export const TIER_CUE: Readonly<Record<Moment["tier"], SoundKind>> = { 1: "goal", 2: "day", 3: "full" };

// full vibrates goal100 twice: 15·60·15 ms, a 120 ms rest, 15·60·15 ms (the mockup's pattern)
const SECOND_GOAL_MS = 15 + 60 + 15 + 120;

/** `sound`: the Âm thanh switch (null until the person touches it, lib/sound soundWanted). */
export function cue(kind: SoundKind, storage: KeyValueStore | null = accountStorage(), sound: boolean | null = null): void {
  haptic(CUE_HAPTICS[kind], storage);
  if (kind === "full") setTimeout(() => haptic("goal100", storage), SECOND_GOAL_MS);
  playSound(kind, sound);
}
