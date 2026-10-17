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
 * Provisional reference values from Vietnam 2016 recommended intakes (VN2016).
 */
export const VN2016_TARGETS: Record<string, TargetRange> = {
  b1: { min: 1.2, max: 1.2 },
  b2: { min: 1.3, max: 1.3 },
  b3: { min: 16, max: 16 },
  b5: { min: 5, max: 5 },
  b6: { min: 1.3, max: 1.3 },
  b12: { min: 2.4, max: 2.4 },
  folate: { min: 400, max: 400 },
  vitamin_a: { min: 650, max: 650 },
  vitamin_c: { min: 100, max: 100 },
  vitamin_d: { min: 15, max: 15 },
  vitamin_e: { min: 6.5, max: 6.5 },
  vitamin_k: { min: 150, max: 150 },
  copper: { min: 0.9, max: 0.9 },
  manganese: { min: 2.3, max: 2.3 },
  phosphorus: { min: 700, max: 700 },
  selenium: { min: 34, max: 34 },
};

/**
 * Flag marking targets that are provisional until confirmed by coach.
 */
export const PROVISIONAL_TARGETS = {
  fiber: true,
  fastCarbs: true,
  b1: true,
  b2: true,
  b3: true,
  b5: true,
  b6: true,
  b12: true,
  folate: true,
  vitamin_a: true,
  vitamin_c: true,
  vitamin_d: true,
  vitamin_e: true,
  vitamin_k: true,
  copper: true,
  manganese: true,
  phosphorus: true,
  selenium: true,
} as const;

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

export function calculateSodiumTarget(trainingMinutes = 0): TargetRange {
  // Salt: 4–6 g/day + 1–1.5 g per 20 min of training
  // 1 g salt = 393 mg sodium, rounded to nearest 10 mg
  const trainingIntervals = trainingMinutes / 20;
  const saltMin = 4 + 1.0 * trainingIntervals;
  const saltMax = 6 + 1.5 * trainingIntervals;

  return {
    min: Math.round((saltMin * 393) / 10) * 10,
    max: Math.round((saltMax * 393) / 10) * 10,
  };
}

export function calculatePotassiumTarget(weightKg: number): TargetRange {
  // 80–100 mg/kg, rounded to nearest 10 mg
  return {
    min: Math.round((weightKg * 80) / 10) * 10,
    max: Math.round((weightKg * 100) / 10) * 10,
  };
}

export function calculateCalciumTarget(): TargetRange {
  // 1200–1500 mg
  return { min: 1200, max: 1500 };
}

/**
 * Derives magnesium target as 50% of calcium target.
 */
export function calculateMagnesiumTarget(calciumTarget: TargetRange = calculateCalciumTarget()): TargetRange {
  return {
    min: Math.round(calciumTarget.min * 0.5),
    max: Math.round(calciumTarget.max * 0.5),
  };
}

export function calculateIronTarget(sex: SexType, isPeriod = false): TargetRange {
  if (sex === "female") {
    const val = isPeriod ? 28 : 18;
    return { min: val, max: val };
  }
  // Men: 8 mg (coach rule). Period mode only changes women's target.
  return { min: 8, max: 8 };
}

export function calculateZincTarget(sex: SexType): TargetRange {
  // Men: 12 mg, Women: 8 mg
  const val = sex === "male" ? 12 : 8;
  return { min: val, max: val };
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
  const sodium = calculateSodiumTarget(trainingMinutes);
  const potassium = calculatePotassiumTarget(profile.weightKg);
  const calcium = calculateCalciumTarget();
  const magnesium = calculateMagnesiumTarget(calcium);
  const iron = calculateIronTarget(profile.sex, profile.isPeriod);
  const zinc = calculateZincTarget(profile.sex);
  const fiber = calculateFiberTarget(calories.min, profile.sex);
  const fastCarbs = calculateFastCarbsTarget(trainingMinutes);

  return {
    ...VN2016_TARGETS,
    calories,
    protein,
    fat,
    carbs,
    fiber,
    sodium,
    potassium,
    calcium,
    magnesium,
    iron,
    zinc,
    fastCarbs,
  };
}
