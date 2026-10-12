import { shiftIsoDate } from "../day-history";
import { dayTotals } from "../day-totals";
import type { MockDayData } from "./sample-day";

/**
 * One day of the trend series. It is a day's totals (lib/day-totals) with the labels the charts need, so
 * Nhật ký and Tổng quan show the same numbers for the same day. A day with nothing logged is `logged: false`
 * with null amounts (never 0). `nutrients` holds a value or null for each of the 22 counted nutrients.
 */
export interface DailyTrendEntry {
  date: string; // YYYY-MM-DD
  dayLabel: string; // "CN", "T2", "T3", "T4", "T5", "T6", "T7"
  dateNumber: string; // "04", "05", etc.
  isToday?: boolean;
  logged: boolean;
  calories: number | null;
  protein: number | null; // g
  fat: number | null; // g
  carbs: number | null; // g
  fiber: number | null; // g
  nutrients: Record<string, number | null>;
}

export interface NutrientTargetDef {
  key: string;
  name: string;
  unit: string;
  targetMin: number;
  targetMax?: number;
  isCoachRule?: boolean;
}

const WEEKDAY_LABELS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

function weekdayLabel(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  return WEEKDAY_LABELS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
}

/**
 * The last `count` days ending on `todayIso` (oldest first), computed from the day history: today from `today`
 * (default: the sample day), earlier days from their entries. Pure, so it can run after mount with the runtime date.
 */
export function trendSeries(todayIso: string, count: number, today?: MockDayData): DailyTrendEntry[] {
  return Array.from({ length: count }, (_, i) => {
    const iso = shiftIsoDate(todayIso, i - (count - 1));
    const totals = dayTotals(iso, todayIso, today);
    return {
      date: iso,
      dayLabel: weekdayLabel(iso),
      dateNumber: iso.slice(8, 10),
      isToday: iso === todayIso,
      logged: totals.logged,
      calories: totals.calories,
      protein: totals.protein,
      fat: totals.fat,
      carbs: totals.carbs,
      fiber: totals.fiber,
      nutrients: totals.nutrients,
    };
  });
}
