import { getDefaultMealSlot } from "./meal-slot";
import { PROFILE_KEY, targetRangeText, targetsFor, type Profile } from "./profile";
import { calculateSaltTarget } from "./training";
import { isDemo } from "./demo";
import { currentAccountId } from "./auth-actions";
import { ADDED_ENTRIES_KEY, adoptLegacyKeys, adoptLegacyPersonal, browserLocal, browserSession, keyedStorage } from "./storage-keys";

// The entries this user added live in localStorage under the signed-in account's key (lib/storage-keys). Only
// real entries count here: the sample day, history and seeded Gần đây exist in demo mode only (lib/demo), and
// demo entries have their own key.
export { ADDED_ENTRIES_KEY };

export interface FirstRunFacts {
  profileSaved: boolean;
  entryEverLogged: boolean;
  /** False when nobody is signed in: the profile then cannot be read, so the sign-in gate decides, not setup. */
  signedIn?: boolean;
}

export type FirstRunState = "needs-setup" | "needs-first-meal" | "ready";

/** Where a user is in the first run: no profile yet, profile but no entry ever, or done. */
export function firstRunState({ profileSaved, entryEverLogged }: FirstRunFacts): FirstRunState {
  if (!profileSaved) return "needs-setup";
  return entryEverLogged ? "ready" : "needs-first-meal";
}

// The screens a user lands on from the bottom bar or the sidebar. A missing profile sends these to setup.
const TAB_ROUTES = ["/diary", "/explore", "/settings", "/add", "/micros", "/training", "/trends"];

export function isTabRoute(pathname: string): boolean {
  return pathname === "/" || TAB_ROUTES.some((route) => pathname === route || pathname.startsWith(route + "/"));
}

/** Where to send a user who has no profile yet (outside demo mode): setup, from any tab route. Else null. */
export function setupRedirectFor(pathname: string, facts: FirstRunFacts, demo: boolean): string | null {
  if (demo || !isTabRoute(pathname) || facts.signedIn === false) return null;
  return firstRunState(facts) === "needs-setup" ? "/setup/profile" : null;
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

/** Reads the facts from storage (the demo keys in demo mode). Blocked storage counts as "nothing saved". Client only. */
export function readFirstRunFacts(demo: boolean = isDemo()): FirstRunFacts {
  let profileSaved = false;
  let entryEverLogged = false;
  let signedIn = false;
  try {
    // The old unscoped keys move to the first account here, the same as the diary store does on load
    const account = currentAccountId();
    const local = browserLocal();
    if (!demo && account) {
      adoptLegacyKeys(local, browserSession(), account);
      adoptLegacyPersonal(local, account);
    }
    const own = local ? keyedStorage(local, demo, account) : null;
    profileSaved = own?.getItem(PROFILE_KEY) != null;
    entryEverLogged = countStoredEntries(own?.getItem(ADDED_ENTRIES_KEY) ?? null) > 0;
    signedIn = account !== null;
  } catch {
    // Storage blocked
  }
  return { profileSaved, entryEverLogged, signedIn };
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
