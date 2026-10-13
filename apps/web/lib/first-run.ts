import { getDefaultMealSlot } from "./meal-slot";
import { PROFILE_KEY, targetRangeText, targetsFor, type Profile } from "./profile";

// sessionStorage key of the diary store: the entries this user added. (Recents are seeded with sample foods,
// so they say nothing about whether the user logged anything.)
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

export interface SetupSummary {
  energy: string;
  protein: string;
  line: string;
}

/** The daily targets of a new profile, as text. Numbers come from lib/targets through the profile. */
export function setupSummary(profile: Profile): SetupSummary {
  const targets = targetsFor(profile);
  const energy = targetRangeText(targets.calories, "kcal");
  const protein = targetRangeText(targets.protein, "g");
  return { energy, protein, line: `Mục tiêu mỗi ngày: ${energy} · đạm ${protein}` };
}

/** The add sheet for the meal of the time of day. */
export function summaryAddHref(now: Date): string {
  return `/add?meal=${getDefaultMealSlot(now)}`;
}
