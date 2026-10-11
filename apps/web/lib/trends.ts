import { getLevel, type NutrientLevel } from "./levels";
import type { DailyTrendEntry, NutrientTargetDef } from "./mock/trends";
import { VN2016_TARGETS, type CompleteTargets } from "./targets";

export type { DailyTrendEntry, NutrientTargetDef };

export interface NutrientTrendResult {
  key: string;
  name: string;
  unit: string;
  averageValue: number;
  averagePercentage: number;
  daysOnTarget: number;
  totalDays: number;
  level: NutrientLevel;
  targetMin: number;
  isCoachRule?: boolean;
}

/**
 * Calculates arithmetic average of a number array, rounded to nearest integer (or 1 decimal if needed).
 */
export function calculateAverage(values: number[], decimals = 0): number {
  if (values.length === 0) return 0;
  const sum = values.reduce((acc, curr) => acc + curr, 0);
  const avg = sum / values.length;
  if (decimals === 0) return Math.round(avg);
  const factor = Math.pow(10, decimals);
  return Math.round(avg * factor) / factor;
}

/**
 * Counts how many values fall within a target definition.
 * If max is provided: min <= value <= max.
 * If only min is provided: value >= min.
 */
export function countDaysOnTarget(
  values: number[],
  target: { min: number; max?: number }
): number {
  return values.filter((val) => {
    if (target.max !== undefined) {
      return val >= target.min && val <= target.max;
    }
    return val >= target.min;
  }).length;
}

/**
 * Calculates trend statistics for a single nutrient across a series of values.
 */
export function calculateNutrientTrend(
  values: number[],
  target: NutrientTargetDef
): NutrientTrendResult {
  const averageValue = calculateAverage(values, target.unit === "g" ? 0 : 1);
  const rawPct = (averageValue / target.targetMin) * 100;
  const averagePercentage = Math.round(rawPct);
  const daysOnTarget = countDaysOnTarget(values, {
    min: target.targetMin,
    max: target.targetMax,
  });
  const level = getLevel(averagePercentage);

  return {
    key: target.key,
    name: target.name,
    unit: target.unit,
    averageValue,
    averagePercentage,
    daysOnTarget,
    totalDays: values.length,
    level,
    targetMin: target.targetMin,
    isCoachRule: target.isCoachRule,
  };
}

/**
 * Finds the best (highest % achieved) and worst (lowest % achieved) nutrients from a list.
 */
export function getBestAndWorstNutrients(list: NutrientTrendResult[]): {
  best: NutrientTrendResult | null;
  worst: NutrientTrendResult | null;
} {
  if (list.length === 0) {
    return { best: null, worst: null };
  }

  let best = list[0];
  let worst = list[0];

  for (let i = 1; i < list.length; i++) {
    const item = list[i];
    if (item.averagePercentage > best.averagePercentage) {
      best = item;
    }
    if (item.averagePercentage < worst.averagePercentage) {
      worst = item;
    }
  }

  return { best, worst };
}

export interface TrendTargets {
  calories: { min: number; max: number };
  protein: NutrientTargetDef;
  calcium: NutrientTargetDef;
  magnesium: NutrientTargetDef;
  potassium: NutrientTargetDef;
  iron: NutrientTargetDef;
  vitamin_d: NutrientTargetDef;
}

/**
 * The Trends targets for one profile, read from the same numbers as Today and Micros (lib/targets.ts).
 * Nothing is typed in here, so Trends cannot drift from the profile.
 */
export function trendTargetsFrom(targets: CompleteTargets): TrendTargets {
  return {
    calories: { min: targets.calories.min, max: targets.calories.max },
    protein: { key: "protein", name: "Đạm", unit: "g", targetMin: targets.protein.min, isCoachRule: true },
    calcium: { key: "calcium", name: "Canxi", unit: "mg", targetMin: targets.calcium.min, targetMax: targets.calcium.max, isCoachRule: true },
    magnesium: { key: "magnesium", name: "Magie", unit: "mg", targetMin: targets.magnesium.min, targetMax: targets.magnesium.max },
    potassium: { key: "potassium", name: "Kali", unit: "mg", targetMin: targets.potassium.min, targetMax: targets.potassium.max },
    iron: { key: "iron", name: "Sắt", unit: "mg", targetMin: targets.iron.min },
    vitamin_d: { key: "vitamin_d", name: "Vitamin D", unit: "µg", targetMin: VN2016_TARGETS.vitamin_d.min },
  };
}

/**
 * Product rule: a kcal day above the range is on target, not an over-limit. Only a day below the minimum is off.
 */
export function kcalOnTarget(calories: number, targetMin: number): boolean {
  return calories >= targetMin;
}

const WEEKDAY_LABELS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Moves a mock series so its last day is `todayIso` (YYYY-MM-DD). The last entry is today; earlier entries step back
 * one day each. Values stay in order. Pure, so it can run after mount with the runtime date.
 */
export function anchorTrendDays(entries: DailyTrendEntry[], todayIso: string): DailyTrendEntry[] {
  const [year, month, day] = todayIso.split("-").map(Number);
  const last = Date.UTC(year, month - 1, day);
  return entries.map((entry, i) => {
    const offset = entries.length - 1 - i;
    const date = new Date(last - offset * DAY_MS);
    const iso = date.toISOString().slice(0, 10);
    return {
      ...entry,
      date: iso,
      dayLabel: WEEKDAY_LABELS[date.getUTCDay()],
      dateNumber: iso.slice(8, 10),
      isToday: offset === 0,
    };
  });
}

/** "05–11/10" within one month, "12/09–11/10" across two. */
export function trendWindowLabel(entries: DailyTrendEntry[]): string {
  if (entries.length === 0) return "";
  const [, startMonth, startDay] = entries[0].date.split("-");
  const [, endMonth, endDay] = entries[entries.length - 1].date.split("-");
  return startMonth === endMonth
    ? `${startDay}–${endDay}/${endMonth}`
    : `${startDay}/${startMonth}–${endDay}/${endMonth}`;
}
