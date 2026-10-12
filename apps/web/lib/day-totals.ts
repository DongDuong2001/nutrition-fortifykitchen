import { dayEntries } from "./day-history";
import type { AddedDiaryEntry } from "./diary-edits";
import type { MockDayData } from "./mock/sample-day";
import { SAMPLE_DAY } from "./mock/sample-day";
import { NUTRIENT_CATALOG } from "./nutrients";

/**
 * The 22 counted nutrients (12 vitamins and 10 minerals), in catalog order. Vi chất, the day's 8/22 count and
 * the period averages all use this list.
 */
export const COUNTED_NUTRIENT_KEYS: readonly string[] = NUTRIENT_CATALOG.filter(
  (n) => n.group === "vitamins" || n.group === "minerals"
).map((n) => n.id);

/**
 * One day's totals, the single shape both Nhật ký and Tổng quan read.
 * A day with nothing logged is `logged: false` and every amount is null: unknown, never 0.
 * Every counted nutrient has a key: a number, or null when no food of the day carries a value for it.
 */
export interface DayTotals {
  date: string;
  logged: boolean;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  fiber: number | null;
  nutrients: Record<string, number | null>;
}

const nullNutrients = (): Record<string, number | null> =>
  Object.fromEntries(COUNTED_NUTRIENT_KEYS.map((key) => [key, null]));

/** Totals of a past day from its entries. Macros are whole grams, as the day screens show them. */
export function totalsFromEntries(iso: string, entries: AddedDiaryEntry[]): DayTotals {
  if (entries.length === 0) {
    return { date: iso, logged: false, calories: null, protein: null, carbs: null, fat: null, fiber: null, nutrients: nullNutrients() };
  }
  const sum = (pick: (e: AddedDiaryEntry) => number) => entries.reduce((acc, e) => acc + pick(e), 0);
  const nutrients = nullNutrients();
  for (const key of COUNTED_NUTRIENT_KEYS) {
    let total: number | null = null;
    for (const entry of entries) {
      const value = entry.nutrients[key];
      if (typeof value === "number") total = (total ?? 0) + value;
    }
    nutrients[key] = total === null ? null : Math.round(total * 100) / 100;
  }
  return {
    date: iso,
    logged: true,
    calories: sum((e) => e.calories),
    protein: Math.round(sum((e) => e.protein)),
    carbs: Math.round(sum((e) => e.carbs)),
    fat: Math.round(sum((e) => e.fat)),
    fiber: Math.round(sum((e) => e.fiber)),
    nutrients,
  };
}

/** Totals of a day as the diary store holds it (today, with the user's edits). */
export function totalsFromDay(day: MockDayData): DayTotals {
  const macro = (key: string) => day.macros.find((m) => m.key === key)?.consumed ?? null;
  const stats = [...day.minerals, ...day.vitamins];
  const nutrients = nullNutrients();
  for (const key of COUNTED_NUTRIENT_KEYS) {
    nutrients[key] = stats.find((s) => s.key === key)?.consumed ?? null;
  }
  const logged = day.meals.some((meal) => meal.items.length > 0);
  return {
    date: day.date,
    logged,
    calories: logged ? day.calories.consumed : null,
    protein: logged ? macro("protein") : null,
    carbs: logged ? macro("carbs") : null,
    fat: logged ? macro("fat") : null,
    fiber: logged ? macro("fiber") : null,
    nutrients: logged ? nutrients : nullNutrients(),
  };
}

/**
 * The totals of any day, from the one history: today from the live day (default: the sample day), a past day
 * from its entries, a future day as not logged.
 */
export function dayTotals(iso: string, todayIso: string, today: MockDayData = SAMPLE_DAY): DayTotals {
  if (iso === todayIso) return { ...totalsFromDay(today), date: iso };
  if (iso > todayIso) return totalsFromEntries(iso, []);
  return totalsFromEntries(iso, dayEntries(iso, todayIso));
}
