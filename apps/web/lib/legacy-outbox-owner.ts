import type { KeyValueStore } from "./storage-keys";

// cc-68: the outbox of the first versions was one unscoped localStorage key. It holds writes that never reached the server, so it
// is not deleted like the other old unscoped keys, but it goes to the account it was written for and to no one else. This file is
// the small part every page loads (lib/auth-actions records the owner when the browser's email changes); lib/legacy-outbox, loaded
// with the outbox, does the claiming.

/** Entries waiting to reach the server. Once unscoped, now per account (`<key>_<account>`) like the rest. */
export const OFFLINE_OUTBOX_KEY = "h1t_offline_outbox";

/** Who the old unscoped outbox belongs to (see noteLegacyOutboxOwner): an email, or "" when nobody can be named. */
export const LEGACY_OUTBOX_OWNER_KEY = "h1t_legacy_outbox_owner";

/**
 * The email stored for the browser is about to change (sign-in as someone else, Đăng xuất). If the old unscoped outbox is still
 * there and nobody owns it yet, it belongs to the account that was on this browser until now: that is written down, so it
 * goes to that account only. With nobody signed in before (the old version signed out) it cannot be named: "".
 */
export function noteLegacyOutboxOwner(local: KeyValueStore | null, previous: string | null, next: string | null): void {
  if (!local || previous === next) return;
  try {
    if (local.getItem(OFFLINE_OUTBOX_KEY) === null || local.getItem(LEGACY_OUTBOX_OWNER_KEY) !== null) return;
    local.setItem(LEGACY_OUTBOX_OWNER_KEY, previous ?? "");
  } catch {
    // Storage blocked
  }
}
