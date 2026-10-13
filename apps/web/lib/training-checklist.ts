/**
 * Training checklist ticks, saved per day (YYYY-MM-DD in Asia/Ho_Chi_Minh).
 * A day keeps the duration it was logged with, because a past day shows its checklist from that duration.
 * A day with no record has nothing ticked and no duration.
 */

export const TRAINING_CHECKLIST_KEY = "h1t_training_checklist_v1";

export interface DayChecklist {
  /** Training minutes for the day; 0 is a rest day. */
  minutes: number;
  /** Ids of the checklist items ticked that day. */
  ticked: string[];
}

export type KeyValueStorage = Pick<Storage, "getItem" | "setItem">;

function browserStorage(): KeyValueStorage | null {
  try {
    return typeof window !== "undefined" && window.localStorage ? window.localStorage : null;
  } catch {
    return null;
  }
}

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
export function readDay(dateKey: string, storage: KeyValueStorage | null = browserStorage()): DayChecklist | null {
  const day = readStore(storage)[dateKey];
  if (!day || typeof day.minutes !== "number" || !Array.isArray(day.ticked)) return null;
  return { minutes: day.minutes, ticked: day.ticked.filter((id): id is string => typeof id === "string") };
}

/** Save one day. Other days are kept. Storage errors (quota, disabled) are ignored. */
export function writeDay(
  dateKey: string,
  day: DayChecklist,
  storage: KeyValueStorage | null = browserStorage()
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

/** Only today can be ticked. A past day is read-only and shows its saved ticks. */
export function isEditableDay(dateKey: string, todayKey: string): boolean {
  return dateKey === todayKey;
}
