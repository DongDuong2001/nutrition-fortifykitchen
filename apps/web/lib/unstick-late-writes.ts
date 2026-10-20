import { idbRun } from "./idb";
import { tooOldForServer } from "./late-writes";
import { putItems, readItems, type OutboxScope } from "./outbox";
import { browserLocal } from "./storage-keys";

/**
 * Hotfix 20/10: phones hold writes the old rule marked FINAL (409 PAST_DAY_READ_ONLY on a day two or more back) although
 * the user made them while the day was still editable. Once per app version, those go back to queued, so they are sent
 * again with made_at (the moment the user made them) and the server judges them by that. Writes older than the 14 days the
 * server accepts stay as they are: sending them again could only be refused again.
 */
const markerKey = (scope: OutboxScope) => `unstick-late-writes:${scope.id}`;
const localMarkerKey = (scope: OutboxScope) => `h1t_unstick_late_writes_${scope.id}`;

async function readMarker(scope: OutboxScope): Promise<string | null> {
  const stored = await idbRun<string>("kv", "readonly", (store) => store.get(markerKey(scope)));
  if (stored.ok) return stored.value;
  try {
    return browserLocal()?.getItem(localMarkerKey(scope)) ?? null;
  } catch {
    return null;
  }
}

async function writeMarker(scope: OutboxScope, version: string): Promise<void> {
  const stored = await idbRun("kv", "readwrite", (store) => store.put(version, markerKey(scope)));
  if (stored.ok) return;
  try {
    browserLocal()?.setItem(localMarkerKey(scope), version);
  } catch {
    // Storage blocked: the move is idempotent, it can run again
  }
}

/** A write the old rule held for good (the 409 for a past day) that the server would take now. */
export const isUnstickable = (item: ReturnType<typeof readItems>[number], now: number): boolean =>
  item.held?.final === true && item.held.status === 409 && (item.held.code === undefined || item.held.code === "PAST_DAY_READ_ONLY") && !tooOldForServer(item, now);

/** Moves them back to queued. Returns how many. The outbox of `scope` must be loaded. */
export async function unstickLateWrites(scope: OutboxScope, version: string, now = Date.now()): Promise<number> {
  if ((await readMarker(scope)) === version) return 0;
  const stuck = readItems(scope).filter((item) => isUnstickable(item, now));
  if (stuck.length > 0) {
    await putItems(
      scope,
      stuck.map((item) => ({ ...item, held: undefined, parked: undefined, state: "queued" as const, nextAttemptAt: undefined, retries: 0, lastStatus: undefined }))
    );
  }
  await writeMarker(scope, version);
  return stuck.length;
}
