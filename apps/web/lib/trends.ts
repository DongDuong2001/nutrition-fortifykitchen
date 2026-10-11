import { getLevel, type NutrientLevel } from "./levels";
import type { DailyTrendEntry, NutrientTargetDef } from "./mock/trends";

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
