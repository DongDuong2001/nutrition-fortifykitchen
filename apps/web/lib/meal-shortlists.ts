import type { AddedDiaryEntry } from "./diary-edits";
import type { MealSlot } from "./meal-slot";
import { shiftIsoDate } from "./day-history";

/**
 * cc-51 D1: the add sheet's shortlists, from this device's diary (today and the archive). Gần đây: the last 8 distinct
 * foods of this meal. Hay ăn: the 8 foods logged most over the last 14 days, any meal. Each comes with the portion it
 * was last logged with, so one tap adds it again. Quick kcal entries have no food and are left out.
 */
export const SHORTLIST_SIZE = 8;
export const SHORTLIST_DAYS = 14;

export interface Shortlisted {
  foodId: string;
  servingLabel: string;
  grams: number;
}

const newestFirst = (a: AddedDiaryEntry, b: AddedDiaryEntry) => Date.parse(b.addedAt) - Date.parse(a.addedAt);
const withFood = (e: AddedDiaryEntry) => e.kind !== "quick" && e.foodId !== "";
const portion = (e: AddedDiaryEntry): Shortlisted => ({ foodId: e.foodId, servingLabel: e.displayQty, grams: e.grams });

export function recentForMeal(entries: readonly AddedDiaryEntry[], slot: MealSlot): Shortlisted[] {
  const seen = new Set<string>();
  const out: Shortlisted[] = [];
  for (const e of [...entries].filter(withFood).filter((e) => e.mealSlot === slot).sort(newestFirst)) {
    if (seen.has(e.foodId)) continue;
    seen.add(e.foodId);
    out.push(portion(e));
    if (out.length === SHORTLIST_SIZE) break;
  }
  return out;
}

/** `todayIso` is today in Asia/Ho_Chi_Minh; the window is today and the 13 days before it. */
export function frequentFoods(entries: readonly AddedDiaryEntry[], todayIso: string): Shortlisted[] {
  const from = Date.parse(`${shiftIsoDate(todayIso, -(SHORTLIST_DAYS - 1))}T00:00:00+07:00`);
  const counts = new Map<string, { count: number; last: AddedDiaryEntry }>();
  for (const e of [...entries].filter(withFood).filter((e) => Date.parse(e.addedAt) >= from).sort(newestFirst)) {
    const c = counts.get(e.foodId);
    if (c) c.count += 1;
    else counts.set(e.foodId, { count: 1, last: e });
  }
  return [...counts.values()]
    .sort((a, b) => b.count - a.count || newestFirst(a.last, b.last))
    .slice(0, SHORTLIST_SIZE)
    .map((c) => portion(c.last));
}
