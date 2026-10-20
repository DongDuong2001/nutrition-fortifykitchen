import { rdaTargets } from "./rda";

/** Iron for a woman in or near the period: the coach rule (mg a day) */
const PERIOD_IRON_MG = 28;

/** The age the micro targets use until the profile says one (the 19–30 stage) */
const DEFAULT_AGE = 25;

export type GoalType = "build" | "maintain" | "cut" | "deep_cut";
export type SexType = "male" | "female";

export interface TargetRange {
  min: number;
  max: number;
}

export interface MacroRatios {
  proteinPct: number;
  carbsPct: number;
  fatPct: number;
}

export interface MacroFixedGrams {
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
}

export type MacroTargetMode = "default" | "ratios" | "fixed" | "keto";

export interface MacroPreset {
  id: string;
  name: string;
  description: string;
  ratios: MacroRatios;
}

export const MACRO_PRESETS: Record<string, MacroPreset> = {
  balanced: {
    id: "balanced",
    name: "Cân bằng",
    description: "25% Đạm · 55% Tinh bột · 20% Chất béo",
    ratios: { proteinPct: 25, carbsPct: 55, fatPct: 20 },
  },
  high_protein: {
    id: "high_protein",
    name: "Tăng cơ cao đạm",
    description: "30% Đạm · 45% Tinh bột · 25% Chất béo",
    ratios: { proteinPct: 30, carbsPct: 45, fatPct: 25 },
  },
  fat_loss: {
    id: "fat_loss",
    name: "Giảm mỡ",
    description: "35% Đạm · 35% Tinh bột · 30% Chất béo",
    ratios: { proteinPct: 35, carbsPct: 35, fatPct: 30 },
  },
  keto: {
    id: "keto",
    name: "Keto",
    description: "20% Đạm · 5% Tinh bột · 75% Chất béo",
    ratios: { proteinPct: 20, carbsPct: 5, fatPct: 75 },
  },
};

export interface UserProfileForTargets {
  sex: SexType;
  weightKg: number;
  goal: GoalType;
  trainingMinutes?: number;
  /** Age in years, for the DRI amounts of the 21 micros (lib/rda); 25 when not known */
  age?: number;
  /** Women only: in or near the period. Iron is the coach's 28 mg then (the one micro the period changes) */
  isPeriod?: boolean;
  macroMode?: MacroTargetMode;
  macroRatios?: MacroRatios;
  macroFixed?: MacroFixedGrams;
  customEnergyKcal?: number;
}

export interface CompleteTargets {
  calories: TargetRange;
  protein: TargetRange;
  fat: TargetRange;
  carbs: TargetRange;
  fiber: TargetRange;
  sodium: TargetRange;
  potassium: TargetRange;
  calcium: TargetRange;
  magnesium: TargetRange;
  iron: TargetRange;
  zinc: TargetRange;
  fastCarbs?: TargetRange;
  [key: string]: TargetRange | undefined;
}

/**
 * Salt: 4–6 g/day + 1–1.5 g per 20 min of training (the coach's rule), 1 g salt = 393 mg sodium, rounded to 10 mg.
 * Stays a range and stays the coach's formula (Hao 20/10), not the DRI's 1.500 mg.
 */
export function calculateSodiumTarget(trainingMinutes = 0): TargetRange {
  const trainingIntervals = trainingMinutes / 20;
  const saltMin = 4 + 1.0 * trainingIntervals;
  const saltMax = 6 + 1.5 * trainingIntervals;

  return {
    min: Math.round((saltMin * 393) / 10) * 10,
    max: Math.round((saltMax * 393) / 10) * 10,
  };
}

const one = (value: number): TargetRange => ({ min: value, max: value });

/** kcal per kg, the upper end of the coach's range (Hao 20/10): one number, not a range. */
export const KCAL_PER_KG: Record<GoalType, number> = { build: 40, maintain: 35, cut: 30, deep_cut: 25 };

export function calculateEnergyTarget(weightKg: number, goal: GoalType): TargetRange {
  return one(Math.round(weightKg * KCAL_PER_KG[goal]));
}

/** 2.2 g/kg, the upper end of the coach's 1.6–2.2. */
export const PROTEIN_G_PER_KG = 2.2;
/** 1.0 g/kg, the upper end of the coach's 0.5–1.0. */
export const FAT_G_PER_KG = 1.0;

export function calculateProteinTarget(weightKg: number): TargetRange {
  return one(Math.round(weightKg * PROTEIN_G_PER_KG));
}

export function calculateFatTarget(weightKg: number): TargetRange {
  return one(Math.round(weightKg * FAT_G_PER_KG));
}

export function calculateCarbTarget(energyKcal: number, proteinGrams: number, fatGrams: number): TargetRange {
  // Coach remainder formula: (energy - protein * 4 - fat * 9) / 4, from the upper protein and fat
  return one(Math.round((energyKcal - proteinGrams * 4 - fatGrams * 9) / 4));
}

/** Fibre is 14 g per 1,000 kcal of the day's energy (provisional), at most 40 g for men and 30 g for women. */
export const FIBER_G_PER_1000_KCAL = 14;
export const FIBER_MAX_G: Record<SexType, number> = { male: 40, female: 30 };

export function calculateFiberTarget(energyKcal: number, sex: SexType): TargetRange {
  return one(Math.min(FIBER_MAX_G[sex], Math.round((energyKcal / 1000) * FIBER_G_PER_1000_KCAL)));
}

/**
 * PROVISIONAL: Training fast carbs 30–45 g * trainingMinutes / 60. Stays a range (Hao 20/10).
 */
export function calculateFastCarbsTarget(trainingMinutes: number): TargetRange {
  if (trainingMinutes <= 0) {
    return { min: 0, max: 0 };
  }
  return {
    min: Math.round((30 * trainingMinutes) / 60),
    max: Math.round((45 * trainingMinutes) / 60),
  };
}

export interface MacroRatioCalculation {
  protein: TargetRange;
  carbs: TargetRange;
  fat: TargetRange;
  proteinKcal: number;
  carbsKcal: number;
  fatKcal: number;
  totalPct: number;
}

export function calculateMacrosFromRatios(energyKcal: number, ratios: MacroRatios): MacroRatioCalculation {
  const proteinKcal = Math.round(energyKcal * (ratios.proteinPct / 100));
  const carbsKcal = Math.round(energyKcal * (ratios.carbsPct / 100));
  const fatKcal = Math.round(energyKcal * (ratios.fatPct / 100));

  const proteinGrams = Math.round(proteinKcal / 4);
  const carbsGrams = Math.round(carbsKcal / 4);
  const fatGrams = Math.round(fatKcal / 9);

  return {
    protein: { min: proteinGrams, max: proteinGrams },
    carbs: { min: carbsGrams, max: carbsGrams },
    fat: { min: fatGrams, max: fatGrams },
    proteinKcal,
    carbsKcal,
    fatKcal,
    totalPct: ratios.proteinPct + ratios.carbsPct + ratios.fatPct,
  };
}

export interface MacroFixedCalculation {
  protein: TargetRange;
  carbs: TargetRange;
  fat: TargetRange;
  proteinKcal: number;
  carbsKcal: number;
  fatKcal: number;
  totalKcal: number;
  proteinPct: number;
  carbsPct: number;
  fatPct: number;
}

export function calculateMacrosFromFixed(fixed: MacroFixedGrams): MacroFixedCalculation {
  const proteinKcal = Math.round(fixed.proteinGrams * 4);
  const carbsKcal = Math.round(fixed.carbsGrams * 4);
  const fatKcal = Math.round(fixed.fatGrams * 9);
  const totalKcal = proteinKcal + carbsKcal + fatKcal;

  const proteinPct = totalKcal > 0 ? Math.round((proteinKcal / totalKcal) * 100) : 0;
  const carbsPct = totalKcal > 0 ? Math.round((carbsKcal / totalKcal) * 100) : 0;
  const fatPct = totalKcal > 0 ? 100 - proteinPct - carbsPct : 0;

  return {
    protein: { min: fixed.proteinGrams, max: fixed.proteinGrams },
    carbs: { min: fixed.carbsGrams, max: fixed.carbsGrams },
    fat: { min: fixed.fatGrams, max: fixed.fatGrams },
    proteinKcal,
    carbsKcal,
    fatKcal,
    totalKcal,
    proteinPct,
    carbsPct,
    fatPct,
  };
}

export function calculateTargets(profile: UserProfileForTargets): CompleteTargets {
  const baseCalories = calculateEnergyTarget(profile.weightKg, profile.goal);
  const energyKcal =
    profile.customEnergyKcal && profile.customEnergyKcal > 0 ? profile.customEnergyKcal : baseCalories.min;
  const calories =
    profile.customEnergyKcal && profile.customEnergyKcal > 0
      ? { min: profile.customEnergyKcal, max: profile.customEnergyKcal }
      : baseCalories;

  let protein: TargetRange;
  let fat: TargetRange;
  let carbs: TargetRange;

  if ((profile.macroMode === "ratios" || profile.macroMode === "keto") && profile.macroRatios) {
    const macroCalc = calculateMacrosFromRatios(energyKcal, profile.macroRatios);
    protein = macroCalc.protein;
    carbs = macroCalc.carbs;
    fat = macroCalc.fat;
  } else if (profile.macroMode === "fixed" && profile.macroFixed) {
    const fixedCalc = calculateMacrosFromFixed(profile.macroFixed);
    protein = fixedCalc.protein;
    carbs = fixedCalc.carbs;
    fat = fixedCalc.fat;
  } else {
    protein = calculateProteinTarget(profile.weightKg);
    fat = calculateFatTarget(profile.weightKg);
    carbs = calculateCarbTarget(energyKcal, protein.min, fat.min);
  }

  const trainingMinutes = profile.trainingMinutes ?? 0;
  const fiber = calculateFiberTarget(energyKcal, profile.sex);
  const fastCarbs = calculateFastCarbsTarget(trainingMinutes);

  return {
    // cc-73b: 21 of the 22 vitamins and minerals are the US DRI amounts for this sex and age (lib/rda), whatever the weight or training
    ...rdaTargets(profile.sex, profile.age ?? DEFAULT_AGE),
    sodium: calculateSodiumTarget(trainingMinutes),
    // Iron in the period is the coach's 28 mg, not the DRI amount for the age (Hao 20/10)
    ...(profile.sex === "female" && profile.isPeriod ? { iron: { min: PERIOD_IRON_MG, max: PERIOD_IRON_MG } } : {}),
    calories,
    protein,
    fat,
    carbs,
    fiber,
    fastCarbs,
  } as CompleteTargets;
}
