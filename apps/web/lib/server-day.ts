import type { DaySummaryResponse } from "./api-client";
import { entriesOnDay, entryIso, isTodays } from "./day-archive";
import type { AddedDiaryEntry } from "./diary-edits";
import { isUuid } from "./uuid";
import type { MealSlot } from "./meal-slot";

/**
 * The entries of a day as the server lists them (GET /days/{date}), as diary entries. Each one carries the day it was
 * read under: an entry added to yesterday today has a created_at of today, but it is yesterday's.
 */
export function entriesFromDaySummary(summary: Pick<DaySummaryResponse, "meals">, iso: string): AddedDiaryEntry[] {
  const out: AddedDiaryEntry[] = [];
  for (const meal of summary.meals) {
    for (const e of meal.entries || []) {
      out.push({
        id: e.id,
        foodId: e.food_id || "",
        foodName: e.food_name || "Món ăn",
        grams: e.grams,
        displayQty: e.serving_label || `${e.grams} g`,
        mealSlot: (e.meal_slot === "preworkout" ? "pre_workout" : e.meal_slot) as MealSlot,
        // A NULL kcal (unknown, migration 000011) stays null: it adds nothing to a total and is not shown as a measured 0
        calories: typeof e.calories === "number" ? e.calories : null,
        protein: (e.nutrients?.protein as number | null) ?? null,
        carbs: (e.nutrients?.carbs as number | null) ?? null,
        fat: (e.nutrients?.fat as number | null) ?? null,
        fiber: (e.nutrients?.fiber as number | null) ?? null,
        nutrients: (e.nutrients as Record<string, number | null>) ?? {},
        addedAt: e.created_at || new Date().toISOString(),
        day: iso,
        synced: true,
      });
    }
  }
  return out;
}

/**
 * A day refetched from the server (diary-store refreshRemoteDay). `keep` holds the entries with a write queued, being
 * sent, or started after the refetch did: the device's version of those wins (an edit not sent yet stays, a delete
 * not sent yet does not come back). Any other entry is the server's. A local entry the server does not have stays
 * unless the server confirmed it before (`synced`: it was deleted elsewhere), or it was added before the refetch
 * started and its id is not a uuid (it can never reach the server).
 */
export function mergeServerDay(
  local: readonly AddedDiaryEntry[],
  server: readonly AddedDiaryEntry[],
  { keep, startedAt }: { keep: ReadonlySet<string>; startedAt: number }
): AddedDiaryEntry[] {
  const onServer = new Set(server.map((e) => e.id));
  const mine = new Map(local.map((e) => [e.id, e]));
  const fromServer = server.flatMap((e): AddedDiaryEntry[] => {
    const own = mine.get(e.id);
    if (keep.has(e.id) && !own) return [];
    const next: AddedDiaryEntry = { ...(keep.has(e.id) && own ? own : e), synced: true };
    // The entry the device already has, when the server says the same: the same object, so nothing that reads it renders again
    return [own && sameEntry(own, next) ? own : next];
  });
  const stays = (e: AddedDiaryEntry) =>
    keep.has(e.id) || Date.parse(e.addedAt) >= startedAt || (!e.synced && isUuid(e.id));
  const merged = [...fromServer, ...local.filter((e) => !onServer.has(e.id) && stays(e))];
  // Nothing changed (every 60 s poll): the list that was passed in
  return merged.length === local.length && merged.every((e, i) => e === local[i]) ? (local as AddedDiaryEntry[]) : merged;
}

/** The same entry field for field. `addedAt` is left out: the server's stamp is whenever it was read when it sends none. */
function sameEntry(a: AddedDiaryEntry, b: AddedDiaryEntry): boolean {
  const x = a as unknown as Record<string, unknown>;
  const y = b as unknown as Record<string, unknown>;
  for (const key of new Set([...Object.keys(x), ...Object.keys(y)])) {
    if (key === "addedAt" || x[key] === y[key]) continue;
    if (key !== "nutrients") return false;
    const n = a.nutrients;
    const m = b.nutrients;
    const keys = Object.keys(n);
    if (keys.length !== Object.keys(m).length || keys.some((k) => n[k] !== m[k])) return false;
  }
  return true;
}

/** The list with the entries of `iso` replaced by `next`; the other days keep their place and order. */
export function replaceDay(list: AddedDiaryEntry[], iso: string, todayIso: string, next: AddedDiaryEntry[]): AddedDiaryEntry[] {
  const isDay = (e: AddedDiaryEntry) => (iso === todayIso ? isTodays(e, todayIso) : entryIso(e) === iso);
  const current = list.filter(isDay);
  // Nothing changed: the same list, so nothing that reads it renders again
  if (current.length === next.length && current.every((e, i) => e === next[i])) return list;
  return [...list.filter((e) => !isDay(e)), ...next];
}


/**
 * The diary's list after the server's day `day` was read: that day's entries merged with the server's (mergeServerDay), the
 * other days as they were. The same list when nothing changed.
 */
export function applyServerDay(
  added: AddedDiaryEntry[],
  summary: Pick<DaySummaryResponse, "meals">,
  day: string,
  todayIso: string,
  options: { keep: ReadonlySet<string>; startedAt: number }
): AddedDiaryEntry[] {
  return replaceDay(added, day, todayIso, mergeServerDay(entriesOnDay(added, day, todayIso), entriesFromDaySummary(summary, day), options));
}
