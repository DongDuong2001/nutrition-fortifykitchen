import { canLog, entryNumbers, type AddedDiaryEntry } from "./diary-edits";
import { formatAmount } from "./format";
import { sumKcal } from "./kcal";
import type { MealSlot } from "./meal-slot";
import { CATALOG_FOODS } from "./catalog";
import type { MockDayData, MockMacroStat, MockMicroStat } from "./mock/sample-day";
import { historyItems } from "./mock/history";
import { isLiveMode } from "./api-mode";
import { isDemo } from "./demo";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Moves a YYYY-MM-DD date by whole days. Calendar arithmetic in UTC, so the time zone cannot shift it. */
export function shiftIsoDate(iso: string, days: number): string {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

/**
 * The day a ?date= value asks for. Only a real day before today counts. Anything else (missing, bad,
 * today, future, or a date that does not exist) shows today.
 */
export function viewedIsoDate(param: string | null | undefined, todayIso: string): string {
  if (!param || !ISO_DATE.test(param)) return todayIso;
  if (shiftIsoDate(param, 0) !== param) return todayIso;
  return param < todayIso ? param : todayIso;
}

/** Whole days from `iso` to `todayIso` (positive when `iso` is in the past). Calendar arithmetic in UTC. */
export function daysBefore(iso: string, todayIso: string): number {
  const [y1, m1, d1] = iso.split("-").map(Number);
  const [y2, m2, d2] = todayIso.split("-").map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86_400_000);
}

let dayArchive: Record<string, AddedDiaryEntry[]> = {};

/** The diary store hands over the earlier days the user logged (lib/day-archive). Module state, like the demo flag. */
export function setDayArchive(archive: Record<string, AddedDiaryEntry[]>): void {
  dayArchive = archive;
}

/**
 * What was logged on a day (mock history, see lib/mock/history): the 29 days before today have entries
 * except a few gaps. Today, the future and older days are empty here (today comes from the diary store).
 */
export function dayEntries(iso: string, todayIso: string): AddedDiaryEntry[] {
  // A day the user logged in this app (filed by lib/day-archive when the date moved on) wins over the sample history
  const archived = dayArchive[iso];
  if (archived && archived.length > 0) return archived;
  if (isLiveMode() && !isDemo()) return [];
  const items = historyItems(daysBefore(iso, todayIso));
  if (!items) return [];
  return items.flatMap((item, i) => {
    const food = CATALOG_FOODS.find((f) => f.id === item.foodId);
    if (!food || !canLog(food)) return [];
    return [
      {
        id: `hist-${iso}-${i}`,
        foodId: food.id,
        foodName: food.nameVi,
        grams: item.grams,
        displayQty: item.qty,
        mealSlot: item.mealSlot,
        ...entryNumbers(food, item.grams),
        addedAt: `${iso}T12:00:00.000Z`,
      },
    ];
  });
}

/** The entries of the chosen meals, as new entries for today. The source entries are not changed. */
export function copyMeals(
  source: AddedDiaryEntry[],
  slots: MealSlot[],
  idPrefix: string,
  addedAt: string
): AddedDiaryEntry[] {
  const chosen = new Set(slots);
  return source.filter((e) => chosen.has(e.mealSlot)).map((e, i) => ({ ...e, id: `${idPrefix}-${i}`, addedAt }));
}

/** The kcal of the entries that have one; null when none does (unknown, not 0). */
export function entriesKcal(entries: AddedDiaryEntry[]): number | null {
  return sumKcal(entries.map((e) => e.calories));
}

export type DayStatus = "none" | "under" | "met" | "over";

/** A day counts as met from this share of the kcal target up to the target itself (cc-73b: the target is one number now). */
export const DAY_MET_FROM = 0.9;

/** How a day's kcal sits against the day's kcal target: under below 90 % of it, met from there up to the target, over above it. */
export function dayStatus(kcal: number, target: number): DayStatus {
  if (kcal <= 0) return "none";
  if (kcal < target * DAY_MET_FROM) return "under";
  if (kcal > target) return "over";
  return "met";
}

/** "YYYY-MM" for the month a date falls in. */
export function monthOf(iso: string): string {
  return iso.slice(0, 7);
}

/** Moves a "YYYY-MM" month by whole months. */
export function shiftMonth(month: string, delta: number): string {
  const [year, m] = month.split("-").map(Number);
  return new Date(Date.UTC(year, m - 1 + delta, 1)).toISOString().slice(0, 7);
}

export interface CalendarDay {
  iso: string;
  day: number;
  future: boolean;
}

/** One month as a Monday-first grid. `leading` is the number of blank cells before the 1st. */
export function monthGrid(month: string, todayIso: string): { leading: number; days: CalendarDay[] } {
  const [year, m] = month.split("-").map(Number);
  const count = new Date(Date.UTC(year, m, 0)).getUTCDate();
  const firstWeekday = new Date(Date.UTC(year, m - 1, 1)).getUTCDay(); // 0 is Sunday
  const days = Array.from({ length: count }, (_, i) => {
    const iso = `${month}-${String(i + 1).padStart(2, "0")}`;
    return { iso, day: i + 1, future: iso > todayIso };
  });
  return { leading: (firstWeekday + 6) % 7, days };
}

/** The text a macro or mineral shows: "consumed / target" (or "consumed / min–max"), or just "consumed" with no target. */
export function statDisplay(consumed: number, stat: Pick<MockMacroStat, "unit" | "targetMin" | "targetMax">): string {
  const { unit, targetMin, targetMax } = stat;
  if (targetMin === null) return `${formatAmount(consumed, unit)} ${unit}`;
  if (targetMax && targetMax !== targetMin) return `${formatAmount(consumed, unit)} / ${formatAmount(targetMin, unit)}–${formatAmount(targetMax, unit)} ${unit}`;
  return `${formatAmount(consumed, unit)} / ${formatAmount(targetMin, unit)} ${unit}`;
}

/**
 * The same day with nothing logged: intakes at zero, meals empty, nutrients unknown (null).
 * Targets and the layout stay as they are. Pass the result to computeCompositeDayData to add entries.
 */
export function blankDay(day: MockDayData): MockDayData {
  const nutrients = Object.fromEntries(Object.keys(day.nutrients ?? {}).map((key) => [key, null]));
  // Unknown, not zero: nothing is logged yet, so a macro or a Vi chất has no value (null, shown as a dash)
  const unknownStat = <S extends MockMacroStat | MockMicroStat>(stat: S): S => ({
    ...stat,
    consumed: null,
    percentage: null,
    displayValue: statDisplay(0, stat).replace(/^0/, "—"),
  });
  return {
    ...day,
    meals: day.meals.map((meal) => ({ ...meal, items: [], kcal: 0 })),
    calories: { ...day.calories, consumed: 0, remaining: day.calories.targetMin, percentage: 0 },
    macros: day.macros.map(unknownStat),
    minerals: day.minerals.map(unknownStat),
    vitamins: day.vitamins.map(unknownStat),
    microsSummary: { ...day.microsSummary, achieved: 0, vitaminsAchieved: 0, mineralsAchieved: 0 },
    nutrients,
  };
}
