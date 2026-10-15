import { COUNTED_NUTRIENT_KEYS, dayTotals, type DayTotals } from "./day-totals";
import { SAMPLE_SLOT } from "./diary-edits";
import type { MealSlot } from "./meal-slot";
import type { MockDayData } from "./mock/sample-day";
import { weightLogSample } from "./mock/weight-log";
import { NUTRIENT_CATALOG } from "./nutrients";
import {
  hasEnoughData,
  loggingStreak,
  macroComposition,
  period,
  periodAverages,
  periodTargetDays,
  targetMinFor,
  weightSummary,
  type Period,
  type PeriodAverages,
  type PeriodLength,
  type TargetCount,
  type WeightPoint,
  type WeightSummary,
} from "./period";
import type { CompleteTargets } from "./targets";

/** Everything the four Tổng quan sub-tabs show for one period. Pure: the screens only format it. */
export interface Overview {
  period: Period;
  previous: Period;
  days: DayTotals[];
  averages: PeriodAverages;
  previousAverages: PeriodAverages;
  targetDays: { calories: TargetCount; protein: TargetCount; nutrients: Record<string, TargetCount> };
  /** At least 3 finished logged days. Under that Tóm tắt shows "Chưa đủ dữ liệu". */
  enough: boolean;
  composition: { protein: number; carbs: number; fat: number } | null;
  streak: number;
  weight: WeightSummary;
  /** The weigh-in log the weight summary came from (for day-to-day changes) */
  weightLog: WeightPoint[];
}

export function buildOverview(input: {
  todayIso: string;
  /** Today as the diary store holds it (with the user's edits) */
  today: MockDayData;
  targets: CompleteTargets;
  length: PeriodLength;
  offset: number;
  weightLog?: WeightPoint[];
}): Overview {
  const { todayIso, today, targets, length, offset } = input;
  const current = period(todayIso, length, offset);
  const previous = period(todayIso, length, current.offset + 1);

  const totalsOf = (iso: string) => dayTotals(iso, todayIso, today);
  const days = current.days.map(totalsOf);
  const previousDays = previous.days.map(totalsOf);

  const averages = periodAverages(days, todayIso);
  const previousAverages = periodAverages(previousDays, todayIso);
  const targetDays = periodTargetDays(days, todayIso, targets);
  const streak = loggingStreak((iso) => totalsOf(iso).logged, todayIso);
  const enough = hasEnoughData(averages);
  const weightLog = input.weightLog ?? weightLogSample(todayIso);

  return {
    period: current,
    previous,
    days,
    averages,
    previousAverages,
    targetDays,
    enough,
    composition: macroComposition({ protein: averages.protein, carbs: averages.carbs, fat: averages.fat }),
    streak,
    weight: weightSummary(weightLog, current),
    weightLog,
  };
}

/** One row of the Vi chất sub-tab. */
export interface MicroRow {
  key: string;
  name: string;
  unit: string;
  /** Average per logged day, or null when no logged day carries a value */
  average: number | null;
  targetMin: number | null;
  targetMax: number | null;
  /** Average as a share of the minimum target, rounded; null with no average or no target */
  percentage: number | null;
  met: number;
  of: number;
}

/**
 * The 22 counted nutrients with their period average, lowest share of target first. Nutrients with no average
 * (no logged day carries a value) come last, with null, never 0.
 */
export function microRows(averages: PeriodAverages, targetDays: Overview["targetDays"], targets: CompleteTargets): MicroRow[] {
  const rows: MicroRow[] = COUNTED_NUTRIENT_KEYS.map((key) => {
    const def = NUTRIENT_CATALOG.find((n) => n.id === key);
    const average = averages.nutrients[key] ?? null;
    const targetMin = targetMinFor(key, targets);
    const range = targets[key];
    const count = targetDays.nutrients[key] ?? { met: 0, of: 0 };
    return {
      key,
      name: def?.nameVi ?? key,
      unit: def?.unit ?? "",
      average,
      targetMin,
      targetMax: range && range.max > range.min ? range.max : null,
      percentage: average !== null && targetMin !== null ? Math.round((average / targetMin) * 100) : null,
      met: count.met,
      of: count.of,
    };
  });
  return rows.sort((a, b) => {
    if (a.percentage === null && b.percentage === null) return 0;
    if (a.percentage === null) return 1;
    if (b.percentage === null) return -1;
    return a.percentage - b.percentage;
  });
}
