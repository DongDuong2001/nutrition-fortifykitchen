import { idbAll, idbBatch, idbKeys, idbRun } from "./idb";
import { clearOutbox, loadOutbox, readItems, scopeFor } from "./outbox";
import { SETTINGS_STORAGE_KEY } from "./storage-keys";

/**
 * cc-68 (X8): Đăng xuất on a shared device must not leave the person's health data behind. When nothing waits to be sent,
 * everything the device kept for the account goes: the diary and its cache, the history, the profile cache, the foods the
 * person made, favourites and recents, Gần đây, the catalogue copy. What stays is the app's own settings (reminders, tips
 * already seen), which hold no health data. When writes still wait, the person is asked first (components/settings/sign-out-confirm).
 */

/** The keys of one account in localStorage are `<base>_<account>`: every h1t_ one of them but the settings. */
export function accountKeys(keys: readonly string[], account: string): string[] {
  const suffix = `_${account}`;
  return keys.filter((key) => key.startsWith("h1t_") && key.endsWith(suffix) && key !== `${SETTINGS_STORAGE_KEY}${suffix}`);
}

/** The legacy unscoped keys (before accounts): they are deleted, never adopted by whoever signs in next. */
export const LEGACY_KEYS = ["h1t_added_entries_v1", "h1t_sample_edits_v1", "h1t_recent_foods_v2", "h1t_favourite_foods_v1", "h1t_saved_meals_v1", "h1t_day_archive_v1", "h1t_profile_v1", "h1t_training_checklist_v1", "h1t_training_prefs_v1"];

/** How many writes of the account have not reached the server: what Đăng xuất would throw away. */
export async function unsyncedCount(account: string | null): Promise<number> {
  const scope = scopeFor(account, false);
  if (!scope) return 0;
  await loadOutbox(scope);
  return readItems(scope).length;
}

/** Removes everything the device kept for `account` (see above). `dropPending` also drops the writes still waiting. */
export async function wipeAccount(account: string, options: { dropPending?: boolean } = {}): Promise<void> {
  try {
    const local = typeof window === "undefined" ? null : window.localStorage;
    if (local) {
      const keys: string[] = [];
      for (let i = 0; i < local.length; i++) {
        const key = local.key(i);
        if (key) keys.push(key);
      }
      for (const key of accountKeys(keys, account)) local.removeItem(key);
      for (const key of LEGACY_KEYS) local.removeItem(key);
    }
  } catch {
    // Storage blocked: nothing was kept there
  }
  const scope = scopeFor(account, false);
  if (options.dropPending !== false) await clearOutbox(scope);
  // IndexedDB: the catalogue copy (it holds the foods the person made), the history cache and, when asked, the outbox
  await idbRun("kv", "readwrite", (store) => store.delete(`foods:${account}`));
  const days = await idbKeys("days");
  if (days.ok) await idbBatch("days", (days.value ?? []).filter((key) => String(key).startsWith(`${account}|`)).map((key) => ({ delete: key })));
  const records = await idbAll<{ key: string; scope?: string }>("outbox");
  if (records.ok && options.dropPending !== false) await idbBatch("outbox", (records.value ?? []).filter((r) => r.scope === account).map((r) => ({ delete: r.key })));
}
