// Where the diary lives in the browser. Added entries, edits to sample items, Gần đây, favourites and Bữa ăn của
// tôi are kept in localStorage so they survive closing the tab or the installed app, under a key per signed-in
// account (`<base>_<accountId>`). Demo mode (lib/demo) uses its own keys (a "_demo" suffix), so what is made
// there never shows up outside it, and the reverse. Đăng xuất leaves the data where it is.

import { FAVOURITES_KEY } from "./favourites";
import { SAVED_MEALS_KEY } from "./saved-meals";
import { DAY_ARCHIVE_KEY } from "./day-archive";

export const ADDED_ENTRIES_KEY = "h1t_added_entries_v1";
// Edits to sample-day items (portion, meal, deleted), kept next to the added entries
export const SAMPLE_EDITS_KEY = "h1t_sample_edits_v1";
// v2: recents are { foodId, servingLabel } objects. The v1 string list is ignored.
export const RECENT_FOODS_KEY = "h1t_recent_foods_v2";

export const DEMO_SUFFIX = "_demo";

// Earlier days of the added entries, filed by date when the date moves on (lib/day-archive)
export { DAY_ARCHIVE_KEY };

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
 * The one-time move from the old unscoped keys to an account. Runs for the first account that loads; an account
 * that already has data of its own leaves the old keys alone. An old sessionStorage copy goes to localStorage
 * first. Demo keys are never touched. Safe to call again: after the move there is nothing left to move.
 */
export function adoptLegacyKeys(local: KeyValueStore | null, session: KeyValueStore | null, accountId: string): void {
  if (!local) return;
  attempt(() => {
    const legacy = ACCOUNT_KEYS.map((base) => ({ base, value: loadMigrated(base, local, session) }));
    if (legacy.every((k) => k.value === null)) return;
    const hasOwnData = ACCOUNT_KEYS.some((base) => !isEmptyStored(local.getItem(`${base}_${accountId}`)));
    if (hasOwnData) return;
    for (const { base, value } of legacy) {
      if (value === null) continue;
      local.setItem(`${base}_${accountId}`, value);
      local.removeItem(base);
    }
  }, undefined);
}

/** The browser's localStorage, or null when it is missing or blocked. */
export function browserLocal(): KeyValueStore | null {
  return attempt(() => (typeof window === "undefined" ? null : window.localStorage), null);
}

/** The browser's sessionStorage, or null when it is missing or blocked. */
export function browserSession(): KeyValueStore | null {
  return attempt(() => (typeof window === "undefined" ? null : window.sessionStorage), null);
}
