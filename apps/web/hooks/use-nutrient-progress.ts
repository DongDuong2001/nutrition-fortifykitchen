"use client";

import { useMemo } from "react";
import { NutrientValues, DailyProgress } from "@/lib/api-client";

export interface NutrientComparison {
  name: string;
  key: keyof NutrientValues;
  consumed: number;
  target?: number;
  unit: string;
  percentage: number;
  status: "under" | "on_track" | "over";
}

const DEFAULT_TARGETS: NutrientValues = {
  calories: 2000,
  protein: 150,
  carbohydrates: 200,
  fat: 65,
  fiber: 30,
  sodium: 2300,
  cholesterol: 300,
  potassium: 3500,
  calcium: 1000,
  iron: 18,
  vitamin_a: 900,
  vitamin_c: 90,
  vitamin_d: 20,
  vitamin_e: 15,
};

export function useNutrientProgress(progress?: DailyProgress, customTargets?: NutrientValues) {
  return useMemo(() => {
    const consumed = progress?.total_nutrients || ({} as NutrientValues);
    const targets = customTargets || progress?.target_nutrients || DEFAULT_TARGETS;

    const compute = (
      name: string,
      key: keyof NutrientValues,
      unit: string
    ): NutrientComparison => {
      const c = consumed[key] || 0;
      const t = targets[key];
      const pct = t && t > 0 ? Math.min(Math.round((c / t) * 100), 200) : 0;
      let status: "under" | "on_track" | "over" = "under";
      if (pct >= 90 && pct <= 110) status = "on_track";
      else if (pct > 110) status = "over";

      return {
        name,
        key,
        consumed: Math.round(c * 10) / 10,
        target: t,
        unit,
        percentage: pct,
        status,
      };
    };

    const macros: NutrientComparison[] = [
      compute("Calories", "calories", "kcal"),
      compute("Protein", "protein", "g"),
      compute("Carbohydrates", "carbohydrates", "g"),
      compute("Fat", "fat", "g"),
      compute("Dietary Fiber", "fiber", "g"),
    ];

    const micros: NutrientComparison[] = [
      compute("Sodium", "sodium", "mg"),
      compute("Potassium", "potassium", "mg"),
      compute("Calcium", "calcium", "mg"),
      compute("Iron", "iron", "mg"),
      compute("Vitamin A", "vitamin_a", "mcg"),
      compute("Vitamin C", "vitamin_c", "mg"),
      compute("Vitamin D", "vitamin_d", "mcg"),
      compute("Vitamin E", "vitamin_e", "mg"),
    ];

    return {
      macros,
      micros,
      consumed,
      targets,
      totalCalories: consumed.calories || 0,
      targetCalories: targets.calories || 2000,
    };
  }, [progress, customTargets]);
}
