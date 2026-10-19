// Where the diary lives in the browser. Added entries, edits to sample items, Gần đây, favourites and Bữa ăn của
// tôi are kept in localStorage so they survive closing the tab or the installed app, under a key per signed-in
// account (`<base>_<accountId>`). Demo mode (lib/demo) uses its own keys (a "_demo" suffix), so what is made
// there never shows up outside it, and the reverse. Đăng xuất leaves the data where it is.

import { currentAccountId } from "./auth-actions";
import { isDemo } from "./demo";
import { FAVOURITES_KEY } from "./favourites";

// One value per account: the profile (sex, birth year, weight, goal, period mode, name), the reminder settings and
// the training ticks. Each is kept under the account's key too, so a second account on this browser never sees them.
// Named here, not in lib/saved-meals: that file pulls the whole diary (diary-edits, the sample foods) and this one is
// on the sign-in page's path (cc-58)
export const SAVED_MEALS_KEY = "h1t_saved_meals_v1";
export const PROFILE_KEY = "h1t_profile_v1";
export const SETTINGS_STORAGE_KEY = "h1t_settings_v1";
export const TRAINING_CHECKLIST_KEY = "h1t_training_checklist_v1";
export const TRAINING_PREFS_KEY = "h1t_training_prefs_v1";
export const LEADERBOARD_STORAGE_KEY = "h1t_leaderboard_opt_in";
/** Entries waiting to reach the server (lib/api-client). Once unscoped, now per account like the rest. */
export const OFFLINE_OUTBOX_KEY = "h1t_offline_outbox";
export const PERSONAL_KEYS: readonly string[] = [PROFILE_KEY, SETTINGS_STORAGE_KEY, TRAINING_CHECKLIST_KEY, TRAINING_PREFS_KEY, LEADERBOARD_STORAGE_KEY, OFFLINE_OUTBOX_KEY];

export const ADDED_ENTRIES_KEY = "h1t_added_entries_v1";
// Edits to sample-day items (portion, meal, deleted), kept next to the added entries
export const SAMPLE_EDITS_KEY = "h1t_sample_edits_v1";
// v2: recents are { foodId, servingLabel } objects. The v1 string list is ignored.
export const RECENT_FOODS_KEY = "h1t_recent_foods_v2";

export const DEMO_SUFFIX = "_demo";

// Earlier days of the added entries, filed by date when the date moves on (lib/day-archive). The key lives here, not in
// lib/day-archive: the sign-in page reads this file and must not load the diary's day helpers with it.
export const DAY_ARCHIVE_KEY = "h1t_day_archive_v1";

/** The same shape as Storage, for the parts of it the app uses. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** Every key that belongs to an account: the diary, sample edits, Gần đây, favourites and Bữa ăn của tôi. */
export const ACCOUNT_KEYS = [ADDED_ENTRIES_KEY, SAMPLE_EDITS_KEY, RECENT_FOODS_KEY, FAVOURITES_KEY, SAVED_MEALS_KEY, DAY_ARCHIVE_KEY];

/**
 * The key a store uses: `<base>_<accountId>` for the signed-in account, or the `_demo` twin in demo mode (demo
 * ignores the account). Null when there is no account: nothing is read or written then.
 */
export function storageKey(base: string, demo: boolean, accountId: string | null): string | null {
  if (demo) return `${base}${DEMO_SUFFIX}`;
  return accountId ? `${base}_${accountId}` : null;
}

/** A view of a storage whose every key is the account's (or demo's). Without an account it reads and writes nothing. */
export function keyedStorage(storage: KeyValueStore, demo: boolean, accountId: string | null): KeyValueStore {
  return {
    getItem: (key) => {
      const scoped = storageKey(key, demo, accountId);
      return scoped === null ? null : storage.getItem(scoped);
    },
    setItem: (key, value) => {
      const scoped = storageKey(key, demo, accountId);
      if (scoped !== null) storage.setItem(scoped, value);
    },
    removeItem: (key) => {
      const scoped = storageKey(key, demo, accountId);
      if (scoped !== null) storage.removeItem(scoped);
    },
  };
}

/** Nothing worth keeping: a missing value, or an empty list or object. */
function isEmptyStored(raw: string | null): boolean {
  return raw === null || ["", "[]", "{}", "null"].includes(raw.trim());
}

function attempt<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

/**
 * Reads a key from localStorage and moves any sessionStorage copy over, once. Local wins when both exist;
 * the session copy is removed either way. A storage that fails is skipped, never fatal.
 */
export function loadMigrated(key: string, local: KeyValueStore | null, session: KeyValueStore | null): string | null {
  const localValue = attempt(() => local?.getItem(key) ?? null, null);
  const sessionValue = attempt(() => session?.getItem(key) ?? null, null);
  if (localValue !== null) {
    if (sessionValue !== null) attempt(() => session?.removeItem(key), undefined);
    return localValue;
  }
  if (sessionValue === null) return null;
  const copied = attempt(() => {
    if (!local) return false;
    local.setItem(key, sessionValue);
    return true;
  }, false);
  // Only drop the session copy once the local one is there
  if (copied) attempt(() => session?.removeItem(key), undefined);
  return sessionValue;
}

/**
 * cc-68 (X8): the old unscoped keys (from before accounts existed) are deleted, not adopted. The first account that loaded
 * used to take them, which on a shared device could hand one person's diary to another. An old sessionStorage copy goes too.
 * Demo keys are never touched. Safe to call again.
 */
export function dropLegacyKeys(local: KeyValueStore | null, session: KeyValueStore | null): void {
  attempt(() => {
    for (const base of ACCOUNT_KEYS) {
      local?.removeItem(base);
      session?.removeItem(base);
    }
  }, undefined);
}

/**
 * The same for the old global profile, settings and training ticks: they are deleted. The one exception is the old offline
 * outbox: that is writes that never reached the server, so the first account that loads takes it (it is sent for them,
 * and never lost). Demo keys are never touched (the caller skips demo).
 */
export function dropLegacyPersonal(local: KeyValueStore | null, accountId: string): void {
  if (!local) return;
  attempt(() => {
    for (const base of PERSONAL_KEYS) {
      const legacy = local.getItem(base);
      if (legacy === null) continue;
      const own = `${base}_${accountId}`;
      if (base === OFFLINE_OUTBOX_KEY && local.getItem(own) === null) local.setItem(own, legacy);
      local.removeItem(base);
    }
  }, undefined);
}

/** The browser's localStorage, or null when it is missing or blocked. */
export function browserLocal(): KeyValueStore | null {
  return attempt(() => (typeof window === "undefined" ? null : window.localStorage), null);
}

/**
 * The storage the signed-in account (or demo) reads and writes its own values through. Null when there is no
 * browser storage; without an account it reads and writes nothing. The first read of the account also moves the
 * old global profile, settings and ticks are deleted (dropLegacyPersonal).
 */
export function accountStorage(): KeyValueStore | null {
  const local = browserLocal();
  if (!local) return null;
  const demo = isDemo();
  const account = currentAccountId();
  if (!demo && account) dropLegacyPersonal(local, account);
  return keyedStorage(local, demo, account);
}

/** The browser's sessionStorage, or null when it is missing or blocked. */
export function browserSession(): KeyValueStore | null {
  return attempt(() => (typeof window === "undefined" ? null : window.sessionStorage), null);
}
