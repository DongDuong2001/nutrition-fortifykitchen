/**
 * Training checklist ticks, saved per day (YYYY-MM-DD in Asia/Ho_Chi_Minh).
 * A day keeps the duration it was logged with, because a past day shows its checklist from that duration.
 * A day with no record has nothing ticked and no duration.
 */

import { TRAINING_CHECKLIST_KEY, accountStorage } from "./storage-keys";

export { TRAINING_CHECKLIST_KEY };

export interface DayChecklist {
  /** Training minutes for the day; 0 is a rest day. */
  minutes: number;
  /** Ids of the checklist items ticked that day. */
  ticked: string[];
  /** cc-52: the diary entry a tick logged, and its amount, by item id. Kept after an untick so Hoàn tác re-ticks it. */
  logged?: Record<string, LoggedTick>;
}

export interface LoggedTick {
  entryId: string;
  /** The amount as logged ("1,5 g") */
  qty: string;
}

export type KeyValueStorage = Pick<Storage, "getItem" | "setItem">;

type Store = Record<string, DayChecklist>;

function readStore(storage: KeyValueStorage | null): Store {
  if (!storage) return {};
  try {
    const raw = storage.getItem(TRAINING_CHECKLIST_KEY);
    const store = raw ? JSON.parse(raw) : {};
    return store && typeof store === "object" ? (store as Store) : {};
  } catch {
    return {};
  }
}

/** The saved day, or null when nothing was saved for that date. */
export function readDay(dateKey: string, storage: KeyValueStorage | null = accountStorage()): DayChecklist | null {
  const day = readStore(storage)[dateKey];
  if (!day || typeof day.minutes !== "number" || !Array.isArray(day.ticked)) return null;
  const ticked = day.ticked.filter((id): id is string => typeof id === "string");
  const links = Object.entries(day.logged ?? {}).filter(
    (e): e is [string, LoggedTick] => typeof e[1]?.entryId === "string" && typeof e[1]?.qty === "string"
  );
  return links.length > 0 ? { minutes: day.minutes, ticked, logged: Object.fromEntries(links) } : { minutes: day.minutes, ticked };
}

/** Save one day. Other days are kept. Storage errors (quota, disabled) are ignored. */
export function writeDay(
  dateKey: string,
  day: DayChecklist,
  storage: KeyValueStorage | null = accountStorage()
): void {
  if (!storage) return;
  try {
    const store = readStore(storage);
    store[dateKey] = day;
    storage.setItem(TRAINING_CHECKLIST_KEY, JSON.stringify(store));
  } catch {
    // Ignore storage errors
  }
}

/** Ticked ids with one id flipped. Returns a new array. */
export function toggleTick(ticked: string[], id: string): string[] {
  return ticked.includes(id) ? ticked.filter((x) => x !== id) : [...ticked, id];
}

/** A tick that logged a diary entry: the item is ticked and remembers the entry. */
export function logTick(day: DayChecklist, itemId: string, entryId: string, qty: string): DayChecklist {
  return {
    ...day,
    ticked: day.ticked.includes(itemId) ? day.ticked : [...day.ticked, itemId],
    logged: { ...day.logged, [itemId]: { entryId, qty } },
  };
}

/** Untick. The link stays: if the entry comes back (Hoàn tác), the item is ticked again (effectiveTicked). */
export function untick(day: DayChecklist, itemId: string): DayChecklist {
  return { ...day, ticked: day.ticked.filter((id) => id !== itemId) };
}

/**
 * Today's ticks as the diary has them: a logged item is ticked exactly while its entry exists (deleted on Hôm nay, it
 * shows unticked; put back with Hoàn tác, ticked again). Items that log nothing keep their saved tick.
 */
export function effectiveTicked(day: DayChecklist, entryExists: (entryId: string) => boolean): string[] {
  const links = day.logged ?? {};
  const kept = day.ticked.filter((id) => !links[id] || entryExists(links[id].entryId));
  const back = Object.keys(links).filter((id) => !kept.includes(id) && entryExists(links[id].entryId));
  return [...kept, ...back];
}

/** The logged amount of each ticked item that logged one. */
export function loggedAmounts(day: DayChecklist, ticked: readonly string[]): Record<string, string> {
  return Object.fromEntries(Object.entries(day.logged ?? {}).filter(([id]) => ticked.includes(id)).map(([id, l]) => [id, l.qty]));
}

/** Only today can be ticked. A past day is read-only and shows its saved ticks. */
export function isEditableDay(dateKey: string, todayKey: string): boolean {
  return dateKey === todayKey;
}
