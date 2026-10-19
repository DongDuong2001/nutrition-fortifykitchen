import { rdaTargets } from "./rda";

/** The age the micro targets use until the profile says one (the 20–29 band) */
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
  /** Age in years, for the recommended amounts of the 22 micros (lib/rda); 25 when not known */
  age?: number;
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

export function calculateEnergyTarget(weightKg: number, goal: GoalType): TargetRange {
  switch (goal) {
    case "build": // Tăng cơ
      return { min: Math.round(weightKg * 35), max: Math.round(weightKg * 40) };
    case "maintain": // Giữ cân
      return { min: Math.round(weightKg * 30), max: Math.round(weightKg * 35) };
    case "cut": // Giảm mỡ
      return { min: Math.round(weightKg * 25), max: Math.round(weightKg * 30) };
    case "deep_cut": // Giảm mỡ nhanh
      return { min: Math.round(weightKg * 20), max: Math.round(weightKg * 25) };
  }
}

export function calculateProteinTarget(weightKg: number): TargetRange {
  return {
    min: Math.round(weightKg * 1.6),
    max: Math.round(weightKg * 2.2),
  };
}

export function calculateFatTarget(weightKg: number): TargetRange {
  return {
    // 0.5 g/kg: for 65 kg this is 32.5 g, standard coach display rounds up to 33 g
    min: Math.ceil(weightKg * 0.5),
    max: Math.round(weightKg * 1.0),
  };
}

export function calculateCarbTarget(caloriesMin: number, proteinMid: number, fatMid: number): TargetRange {
  // Coach remainder formula: (energy - protein mid * 4 - fat mid * 9) / 4
  const carbGrams = Math.round((caloriesMin - proteinMid * 4 - fatMid * 9) / 4);
  return {
    min: carbGrams,
    max: carbGrams,
  };
}

/**
 * PROVISIONAL: 14 g per 1000 kcal, kept within men 30–40 g, women 20–30 g.
 */
export function calculateFiberTarget(caloriesMin: number, sex: SexType): TargetRange {
  const rawFiber = Math.round((caloriesMin / 1000) * 14);
  if (sex === "male") {
    return {
      min: Math.max(30, Math.min(40, rawFiber)),
      max: 40,
    };
  }
  return {
    min: Math.max(20, Math.min(30, rawFiber)),
    max: 30,
  };
}

/**
 * PROVISIONAL: Training fast carbs 30–45 g * trainingMinutes / 60.
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
    const proteinMid = (protein.min + protein.max) / 2;
    const fatMid = (profile.weightKg * 0.5 + profile.weightKg * 1.0) / 2;
    carbs = calculateCarbTarget(calories.min, proteinMid, fatMid);
  }

  const trainingMinutes = profile.trainingMinutes ?? 0;
  const fiber = calculateFiberTarget(calories.min, profile.sex);
  const fastCarbs = calculateFastCarbsTarget(trainingMinutes);

  return {
    // cc-67: the 22 vitamins and minerals are the recommended amounts for this sex and age (lib/rda), whatever the weight or training
    ...rdaTargets(profile.sex, profile.age ?? DEFAULT_AGE),
    calories,
    protein,
    fat,
    carbs,
    fiber,
    fastCarbs,
  } as CompleteTargets;
}
