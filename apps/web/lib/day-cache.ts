import { idbBatch, idbGetMany, idbKeys, storageErrorKind } from "./idb";
import type { AddedDiaryEntry } from "./diary-edits";
import type { MealSlot } from "./meal-slot";

/**
 * cc-68 (S4, S5): past days live on the server; this device keeps a slim copy of them, one record per day in IndexedDB
 * (store "days", key `<scope>|<YYYY-MM-DD>`). It is a cache: Safari may clear it, another device never sees it, and the next
 * read of the server rebuilds it. The one thing in it that is not a copy is `unsynced`: entries of that day the server never
 * confirmed, kept whole until the server lists them, so a day that could not be saved is never lost from the history.
 * The copy keeps what the history needs (the food, the portion, the numbers) and none of what only today's list needs.
 */
export interface SlimEntry {
  id: string;
  /** "quick": a kcal-only entry. */
  k?: "quick";
  f: string;
  n: string;
  g: number;
  q: string;
  m: MealSlot;
  /** kcal, protein, carbs, fat, fibre (null: unknown) */
  v: [number | null, number | null, number | null, number | null, number | null];
  /** The other nutrients, rounded; unknown ones are left out. */
  u?: Record<string, number>;
}

export interface DayRecord {
  scope: string;
  date: string;
  /** When it was read from the server (ms). */
  at: number;
  /** Read when the day could no longer be edited: it cannot change any more, so it is not read again. */
  final: boolean;
  entries: SlimEntry[];
  /** Entries of this day the server never confirmed, whole. */
  unsynced?: AddedDiaryEntry[];
}

/** The days kept per account. Older ones are dropped (the server has them). */
export const DAY_CACHE_DAYS = 400;

export const dayKey = (scope: string, date: string) => `${scope}|${date}`;

const round = (v: number) => Math.round(v * 1000) / 1000;

export function slimEntry(e: AddedDiaryEntry): SlimEntry {
  const u: Record<string, number> = {};
  for (const [key, value] of Object.entries(e.nutrients ?? {})) if (typeof value === "number" && Number.isFinite(value)) u[key] = round(value);
  return {
    id: e.id,
    ...(e.kind === "quick" ? { k: "quick" as const } : {}),
    f: e.foodId,
    n: e.foodName,
    g: e.grams,
    q: e.displayQty,
    m: e.mealSlot,
    v: [e.calories, e.protein, e.carbs, e.fat, e.fiber],
    ...(Object.keys(u).length > 0 ? { u } : {}),
  };
}

/** The entry again, for the day it belongs to (the time of day was not kept: noon, so the day cannot shift). */
export function unslimEntry(s: SlimEntry, date: string): AddedDiaryEntry {
  return {
    id: s.id,
    ...(s.k ? { kind: s.k } : {}),
    foodId: s.f,
    foodName: s.n,
    grams: s.g,
    displayQty: s.q,
    mealSlot: s.m,
    calories: s.v[0],
    protein: s.v[1],
    carbs: s.v[2],
    fat: s.v[3],
    fiber: s.v[4],
    nutrients: s.u ?? {},
    addedAt: `${date}T05:00:00.000Z`,
    day: date,
    synced: true,
  };
}

/** The entries of a record as the diary uses them: the confirmed ones, then the ones the server never confirmed. */
export function recordEntries(record: DayRecord): AddedDiaryEntry[] {
  const unsynced = record.unsynced ?? [];
  const ids = new Set(unsynced.map((e) => e.id));
  return [...record.entries.filter((s) => !ids.has(s.id)).map((s) => unslimEntry(s, record.date)), ...unsynced];
}

export async function readDayRecords(scope: string, dates: readonly string[]): Promise<Map<string, DayRecord>> {
  const result = await idbGetMany<DayRecord>("days", dates.map((d) => dayKey(scope, d)));
  const out = new Map<string, DayRecord>();
  if (!result.ok) return out;
  (result.value ?? []).forEach((record, i) => {
    if (record && record.date === dates[i]) out.set(dates[i], record);
  });
  return out;
}

/** Writes the records (one transaction). False when the disk refused them (the history is read from the server again next time). */
export async function writeDayRecords(records: readonly DayRecord[]): Promise<boolean> {
  const result = await idbBatch("days", records.map((r) => ({ put: r, key: dayKey(r.scope, r.date) })));
  if (!result.ok && storageErrorKind(result.error) === "quota") await pruneDayRecords(records[0]?.scope ?? "", Math.floor(DAY_CACHE_DAYS / 2));
  return result.ok;
}

/** Keeps the newest `keep` days of the account; older ones go. */
export async function pruneDayRecords(scope: string, keep: number = DAY_CACHE_DAYS): Promise<number> {
  const keys = await idbKeys("days");
  if (!keys.ok) return 0;
  const mine = (keys.value ?? []).map(String).filter((k) => k.startsWith(`${scope}|`)).sort();
  const drop = mine.slice(0, Math.max(0, mine.length - keep));
  if (drop.length > 0) await idbBatch("days", drop.map((key) => ({ delete: key })));
  return drop.length;
}
