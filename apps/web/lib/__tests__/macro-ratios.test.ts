import { describe, it, expect } from "vitest";
import {
  calculateMacrosFromRatios,
  calculateMacrosFromFixed,
  MACRO_PRESETS,
  calculateTargets,
  type MacroRatios,
} from "../targets";

describe("lib/targets macro ratios", () => {
  it("calculates exact grams and kcal from ratios matching image 2 (1964 kcal, 25/55/20)", () => {
    const ratios: MacroRatios = { proteinPct: 25, carbsPct: 55, fatPct: 20 };
    const result = calculateMacrosFromRatios(1964, ratios);

    // Protein: 25% * 1964 = 491 kcal -> 123 g
    expect(result.proteinKcal).toBe(491);
    expect(result.protein.min).toBe(123);
    expect(result.protein.max).toBe(123);

    // Carbs: 55% * 1964 = 1080 kcal -> 270 g
    expect(result.carbsKcal).toBe(1080);
    expect(result.carbs.min).toBe(270);
    expect(result.carbs.max).toBe(270);

    // Fat: 20% * 1964 = 393 kcal -> 44 g (393 / 9 = 43.6 -> 44 g)
    expect(result.fatKcal).toBe(393);
    expect(result.fat.min).toBe(44);
    expect(result.fat.max).toBe(44);

    expect(result.totalPct).toBe(100);
  });

  it("calculates keto preset accurately", () => {
    const result = calculateMacrosFromRatios(2000, MACRO_PRESETS.keto.ratios);
    // Keto: 20% Protein, 5% Carbs, 75% Fat
    expect(result.protein.min).toBe(100); // 400 kcal / 4 = 100 g
    expect(result.carbs.min).toBe(25);   // 100 kcal / 4 = 25 g
    expect(result.fat.min).toBe(167);    // 1500 kcal / 9 = 166.7 -> 167 g
  });

  it("calculates fixed macros and derives kcal and percentages", () => {
    const result = calculateMacrosFromFixed({ proteinGrams: 140, carbsGrams: 200, fatGrams: 60 });
    // 140 * 4 = 560 kcal, 200 * 4 = 800 kcal, 60 * 9 = 540 kcal. Total = 1900 kcal
    expect(result.totalKcal).toBe(1900);
    expect(result.proteinKcal).toBe(560);
    expect(result.carbsKcal).toBe(800);
    expect(result.fatKcal).toBe(540);
  });

  it("applies custom macro mode in calculateTargets when macroMode is ratios", () => {
    const customUser = {
      sex: "male" as const,
      weightKg: 65,
      goal: "maintain" as const,
      macroMode: "ratios" as const,
      macroRatios: { proteinPct: 30, carbsPct: 40, fatPct: 30 },
      customEnergyKcal: 2000,
    };
    const targets = calculateTargets(customUser);

    expect(targets.calories.min).toBe(2000);
    // 30% of 2000 = 600 kcal / 4 = 150 g
    expect(targets.protein.min).toBe(150);
    // 40% of 2000 = 800 kcal / 4 = 200 g
    expect(targets.carbs.min).toBe(200);
    // 30% of 2000 = 600 kcal / 9 = 67 g
    expect(targets.fat.min).toBe(67);
  });
});
