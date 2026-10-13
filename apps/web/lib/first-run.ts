import { getDefaultMealSlot } from "./meal-slot";
import { PROFILE_KEY, targetRangeText, targetsFor, type Profile } from "./profile";
import { calculateSaltTarget } from "./training";

// sessionStorage key of the diary store: the entries this user added. Only real entries are counted here:
// the sample day, the sample history and the seeded Gần đây exist in demo mode only (lib/demo) and are never
// stored in this key, so demo data never makes a new user look like a returning one.
export const ADDED_ENTRIES_KEY = "h1t_added_entries_v1";

export interface FirstRunFacts {
  profileSaved: boolean;
  entryEverLogged: boolean;
}

export type FirstRunState = "needs-setup" | "needs-first-meal" | "ready";

/** Where a user is in the first run: no profile yet, profile but no entry ever, or done. */
export function firstRunState({ profileSaved, entryEverLogged }: FirstRunFacts): FirstRunState {
  if (!profileSaved) return "needs-setup";
  return entryEverLogged ? "ready" : "needs-first-meal";
}

export function isNewUser(facts: FirstRunFacts): boolean {
  return firstRunState(facts) !== "ready";
}

/** Length of a stored JSON array. 0 for a missing value, bad JSON or a non-array. */
export function countStoredEntries(raw: string | null): number {
  if (!raw) return 0;
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? value.length : 0;
  } catch {
    return 0;
  }
}

/** Reads the facts from storage. Blocked storage counts as "nothing saved". Client only. */
export function readFirstRunFacts(): FirstRunFacts {
  let profileSaved = false;
  let entryEverLogged = false;
  try {
    profileSaved = window.localStorage.getItem(PROFILE_KEY) !== null;
  } catch {
    // Storage blocked
  }
  try {
    entryEverLogged = countStoredEntries(window.sessionStorage.getItem(ADDED_ENTRIES_KEY)) > 0;
  } catch {
    // Storage blocked
  }
  return { profileSaved, entryEverLogged };
}

/** One line of the day targets on the setup summary. */
export interface SetupTarget {
  key: string;
  label: string;
  value: string;
  hint?: string;
}

export interface SetupSummary {
  energy: string;
  protein: string;
  line: string;
  /** Năng lượng, Đạm, Chất béo, Tinh bột, Muối: the numbers of Nhật ký for a day of the default training minutes. */
  targets: SetupTarget[];
}

/** The daily targets of a new profile, as text. Numbers come from lib/targets through the profile. */
export function setupSummary(profile: Profile): SetupSummary {
  const targets = targetsFor(profile);
  const energy = targetRangeText(targets.calories, "kcal");
  const protein = targetRangeText(targets.protein, "g");
  const salt = calculateSaltTarget(profile.trainingMinutesDefault);
  const minutes = profile.trainingMinutesDefault;
  const list: SetupTarget[] = [
    { key: "energy", label: "Năng lượng", value: energy },
    { key: "protein", label: "Đạm", value: protein },
    { key: "fat", label: "Chất béo", value: targetRangeText(targets.fat, "g") },
    { key: "carbs", label: "Tinh bột", value: targetRangeText(targets.carbs, "g") },
    { key: "salt", label: "Muối", value: `${salt.formattedTotal} g`, hint: minutes > 0 ? `Ngày tập ${minutes}′` : "Ngày nghỉ" },
  ];
  return { energy, protein, line: `Mục tiêu mỗi ngày: ${energy} · đạm ${protein}`, targets: list };
}

/** The add sheet for the meal of the time of day. */
export function summaryAddHref(now: Date): string {
  return `/add?meal=${getDefaultMealSlot(now)}`;
}
