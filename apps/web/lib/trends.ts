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
  /** Shown as the top of the range; a day above it still counts as on target */
  targetMax?: number;
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
 * Counts the days that reach the minimum. Product rule: a value above the max is on target too,
 * so there is no over-limit. The max is for display only (see trendTargetsFrom).
 */
export function countDaysOnTarget(values: number[], target: { min: number }): number {
  return values.filter((val) => val >= target.min).length;
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
  const daysOnTarget = countDaysOnTarget(values, { min: target.targetMin });
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
    targetMax: target.targetMax,
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
