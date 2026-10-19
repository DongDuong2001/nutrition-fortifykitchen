import { LEGACY_OUTBOX_OWNER_KEY, OFFLINE_OUTBOX_KEY } from "./legacy-outbox-owner";
import type { KeyValueStore } from "./storage-keys";

// cc-68: the old unscoped outbox goes to the account it was written for (lib/legacy-outbox-owner records who that is), and to no one
// else. Loaded with the outbox, not with every page.

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
 * reported once. The old key is removed once it is taken.
 */
export function claimLegacyOutbox(local: KeyValueStore, accountId: string): void {
  const legacy = local.getItem(OFFLINE_OUTBOX_KEY);
  if (legacy === null) return;
  const owner = local.getItem(LEGACY_OUTBOX_OWNER_KEY) ?? accountId;
  if (owner !== accountId) {
    reportUnclaimed();
    return;
  }
  const own = `${OFFLINE_OUTBOX_KEY}_${accountId}`;
  const mine = local.getItem(own);
  if (mine === null) local.setItem(own, legacy);
  else {
    const merged = mergeOutboxes(mine, legacy);
    if (merged !== null) local.setItem(own, merged);
  }
  local.removeItem(LEGACY_OUTBOX_OWNER_KEY);
  local.removeItem(OFFLINE_OUTBOX_KEY);
}
