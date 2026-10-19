import type { KeyValueStore } from "./storage-keys";

// cc-68: the outbox of the first versions was one unscoped localStorage key. It holds writes that never reached the server, so it
// is not deleted like the other old unscoped keys, but it goes to the account it was written for and to no one else. Its own
// module: lib/auth-actions (which storage-keys imports) records the owner when the browser's email changes.

/** Entries waiting to reach the server. Once unscoped, now per account (`<key>_<account>`) like the rest. */
export const OFFLINE_OUTBOX_KEY = "h1t_offline_outbox";

/** Who the old unscoped outbox belongs to (see noteLegacyOutboxOwner): an email, or "" when nobody can be named. */
export const LEGACY_OUTBOX_OWNER_KEY = "h1t_legacy_outbox_owner";

function attempt(fn: () => void): void {
  try {
    fn();
  } catch {
    // Storage blocked: nothing was kept there
  }
}

/**
 * The email stored for the browser is about to change (sign-in as someone else, Đăng xuất). If the old unscoped outbox is still
 * there and nobody owns it yet, it belongs to the account that was on this browser until now: that is written down, so it
 * goes to that account only. With nobody signed in before (the old version signed out) it cannot be named: "".
 */
export function noteLegacyOutboxOwner(local: KeyValueStore | null, previous: string | null, next: string | null): void {
  if (!local || previous === next) return;
  attempt(() => {
    if (local.getItem(OFFLINE_OUTBOX_KEY) === null || local.getItem(LEGACY_OUTBOX_OWNER_KEY) !== null) return;
    local.setItem(LEGACY_OUTBOX_OWNER_KEY, previous ?? "");
  });
}

let unclaimedReported = false;

/** The old outbox is left on disk and sent for nobody; reported once (kind "storage") so it is not lost silently. */
function reportUnclaimed(): void {
  if (unclaimedReported) return;
  unclaimedReported = true;
  void import("./client-errors").then((m) => m.reportClientError({ kind: "storage", message: "legacy_outbox_unclaimed" }));
}

/** For tests. */
export function resetLegacyOutboxReport(): void {
  unclaimedReported = false;
}

/** The writes of `legacy` that `own` does not have (by key, else id and time), after `own`. Null when either is not a list. */
function mergeOutboxes(own: string, legacy: string): string | null {
  try {
    const a: unknown = JSON.parse(own);
    const b: unknown = JSON.parse(legacy);
    if (!Array.isArray(a) || !Array.isArray(b)) return null;
    const id = (i: { key?: string; id?: string; createdAt?: number }) => i.key ?? `${i.id}:${i.createdAt}`;
    const have = new Set(a.map(id));
    return JSON.stringify([...a, ...b.filter((i) => !have.has(id(i)))]);
  } catch {
    return null;
  }
}

/**
 * The old unscoped outbox for `accountId`, who loads now. It moves to the account's own key only when it is that account's: the one
 * noteLegacyOutboxOwner recorded, or, with no change of account since the update, the account that loads. Another account that
 * signs in first does not take it and nothing is sent for it: it stays on disk until its own account signs in, and the mismatch is
 * reported once. True when the old key should now be removed (taken, or nothing there to take).
 */
export function claimLegacyOutbox(local: KeyValueStore, accountId: string): boolean {
  const legacy = local.getItem(OFFLINE_OUTBOX_KEY);
  if (legacy === null) return false;
  const owner = local.getItem(LEGACY_OUTBOX_OWNER_KEY) ?? accountId;
  if (owner !== accountId) {
    reportUnclaimed();
    return false;
  }
  const own = `${OFFLINE_OUTBOX_KEY}_${accountId}`;
  const mine = local.getItem(own);
  if (mine === null) local.setItem(own, legacy);
  else {
    const merged = mergeOutboxes(mine, legacy);
    if (merged !== null) local.setItem(own, merged);
  }
  local.removeItem(LEGACY_OUTBOX_OWNER_KEY);
  return true;
}
