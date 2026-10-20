import { readDayRecords } from "./day-cache";
import { idbRun } from "./idb";
import { entryMadeAt, hasOwnTime, isDiaryAdd, madeTooLate, tooOldForServer } from "./late-writes";
import { putItems, readItems, type OutboxItem, type OutboxScope } from "./outbox";
import { ADDED_ENTRIES_KEY, browserLocal, storageKey } from "./storage-keys";

/**
 * Hotfix 20/10: phones hold diary writes the server refused with 409 PAST_DAY_READ_ONLY although the user made them while
 * the day was still editable. Once per app version, those go back to queued and are sent again with made_at.
 *
 * Second run (2026-10-20.4 on the prod build, 2026-10-21.2 on main): an add re-sent from the local diary (a closed day's entry the server never confirmed) was queued
 * with createdAt = the moment it was queued again, days after the user made it, so its made_at was refused as well. Before
 * 20/10 a past day could not be edited, so such an add was made on its day: it gets the entry's own addedAt from the local
 * diary, else its day at 23:00 Ho Chi Minh time (the same for an add with no usable time at all). Writes older than the 14 days
 * the server accepts stay as they are: sending them again could only be refused again.
 */
const markerKey = (scope: OutboxScope) => `unstick-late-writes-2:${scope.id}`;
const localMarkerKey = (scope: OutboxScope) => `h1t_unstick_late_writes_2_${scope.id}`;

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

/** A diary write the server held with the 409 for a past day (for good or not). */
const heldForPastDay = (item: OutboxItem): boolean =>
  (item.kind ?? "diary") === "diary" && item.held?.status === 409 && (item.held.code === undefined || item.held.code === "PAST_DAY_READ_ONLY");

/** An add, queued or held for a past day, whose time is wrong or missing: its made time is put right from the local diary. */
const needsRepair = (item: OutboxItem, now: number): boolean =>
  isDiaryAdd(item) && (!item.held || heldForPastDay(item)) && (madeTooLate(item, now) || !hasOwnTime(item));

/** The addedAt of the local diary's entries, by id: the closed days' records (entries the server never confirmed) and the open days. */
async function diaryTimes(scope: OutboxScope, days: string[]): Promise<Map<string, string>> {
  const times = new Map<string, string>();
  for (const record of (await readDayRecords(scope.id, days)).values()) {
    for (const e of record.unsynced ?? []) if (typeof e?.addedAt === "string") times.set(e.id, e.addedAt);
  }
  try {
    const key = storageKey(ADDED_ENTRIES_KEY, false, scope.account);
    const open: unknown = JSON.parse((key && browserLocal()?.getItem(key)) || "[]");
    if (Array.isArray(open)) for (const e of open) if (typeof e?.id === "string" && typeof e?.addedAt === "string" && !times.has(e.id)) times.set(e.id, e.addedAt);
  } catch {
    // Unreadable: the day's end stands in
  }
  return times;
}

/**
 * Puts the made time right where it is wrong (see above) and moves the 409 items the server would take now back to queued.
 * Returns how many went back to queued. The outbox of `scope` must be loaded.
 */
export async function unstickLateWrites(scope: OutboxScope, version: string, now = Date.now()): Promise<number> {
  if ((await readMarker(scope)) === version) return 0;
  const items = readItems(scope);
  const repair = items.filter((item) => needsRepair(item, now));
  const times = repair.length > 0 ? await diaryTimes(scope, [...new Set(repair.map((item) => item.date))]) : new Map<string, string>();
  const changed: OutboxItem[] = [];
  let moved = 0;
  for (const item of items) {
    const fixed = repair.includes(item) ? { ...item, madeAt: entryMadeAt(times.get(item.id), item.date, now) ?? undefined } : item;
    if (heldForPastDay(fixed) && !tooOldForServer(fixed, now) && !madeTooLate(fixed, now)) {
      changed.push({ ...fixed, held: undefined, parked: undefined, state: "queued", nextAttemptAt: undefined, retries: 0, lastStatus: undefined });
      moved++;
    } else if (fixed !== item) {
      changed.push(fixed);
    }
  }
  if (changed.length > 0) await putItems(scope, changed);
  await writeMarker(scope, version);
  return moved;
}
