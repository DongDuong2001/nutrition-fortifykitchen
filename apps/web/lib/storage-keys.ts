// Where the diary lives in the browser. Added entries, edits to sample items and Gần đây are kept in
// localStorage so the diary survives closing the tab or the installed app. Demo mode (lib/demo) uses its own
// keys (a "_demo" suffix), so what is made there never shows up outside it, and the reverse.

export const ADDED_ENTRIES_KEY = "h1t_added_entries_v1";
// Edits to sample-day items (portion, meal, deleted), kept next to the added entries
export const SAMPLE_EDITS_KEY = "h1t_sample_edits_v1";
// v2: recents are { foodId, servingLabel } objects. The v1 string list is ignored.
export const RECENT_FOODS_KEY = "h1t_recent_foods_v2";

export const DEMO_SUFFIX = "_demo";

/** The same shape as Storage, for the parts of it the app uses. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** The key a store uses: the real one, or its demo twin. */
export function storageKey(base: string, demo: boolean): string {
  return demo ? `${base}${DEMO_SUFFIX}` : base;
}

/** A view of a storage whose every key is the demo twin (or the real key, when demo is false). */
export function keyedStorage(storage: KeyValueStore, demo: boolean): KeyValueStore {
  return {
    getItem: (key) => storage.getItem(storageKey(key, demo)),
    setItem: (key, value) => storage.setItem(storageKey(key, demo), value),
    removeItem: (key) => storage.removeItem(storageKey(key, demo)),
  };
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

/** The browser's localStorage, or null when it is missing or blocked. */
export function browserLocal(): KeyValueStore | null {
  return attempt(() => (typeof window === "undefined" ? null : window.localStorage), null);
}

/** The browser's sessionStorage, or null when it is missing or blocked. */
export function browserSession(): KeyValueStore | null {
  return attempt(() => (typeof window === "undefined" ? null : window.sessionStorage), null);
}
