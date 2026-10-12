import { formatAmount } from "./format";
import { shiftIsoDate } from "./day-history";
import { getLevel, type NutrientLevel } from "./levels";
import { type NutrientDefinition } from "./nutrients";
import { buildNutrientRows, type NutrientRowData } from "./nutrient-rows";
import { type MockDayData } from "./mock/sample-day";

/** The amount as the detail shows it: "331 mg", or "—" when unknown. Never 0 for an unknown amount. */
export function amountLabel(consumed: number | null, unit: string): string {
  return consumed === null ? "—" : `${formatAmount(consumed, unit)} ${unit}`;
}

/** The level band of a percentage (same bands as the bar). Null when there is no percentage. */
export function levelFor(percentage: number | null): NutrientLevel | null {
  return percentage === null ? null : getLevel(percentage);
}

/** The last `count` days as YYYY-MM-DD, oldest first, ending on today. */
export function historyDays(todayIso: string, count = 7): string[] {
  return Array.from({ length: count }, (_, i) => shiftIsoDate(todayIso, i - (count - 1)));
}

const WEEKDAY_SHORT_VI = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

/** Short Vietnamese weekday for a YYYY-MM-DD date: "CN" for Sunday, "T2" to "T7". Pure date arithmetic, no time zone. */
export function weekdayShortVi(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  return WEEKDAY_SHORT_VI[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
}

/** A day with no meals logged. Its amounts are unknown, not zero. */
export function dayIsEmpty(day: Pick<MockDayData, "meals">): boolean {
  return day.meals.every((meal) => meal.items.length === 0);
}

/**
 * The Vi chất row of one nutrient for one day. On a day with nothing logged the amount is unknown (null),
 * so the detail shows "—" rather than the 0 the blank day carries.
 */
export function nutrientOnDay(day: MockDayData, def: NutrientDefinition): NutrientRowData | undefined {
  const row = Object.values(buildNutrientRows(day))
    .flat()
    .find((r) => r.definition.id === def.id);
  if (!row || !dayIsEmpty(day)) return row;
  return { ...row, consumed: null, percentage: null, formattedAmount: "—" };
}
