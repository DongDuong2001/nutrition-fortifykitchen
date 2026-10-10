import { describe, it, expect } from "vitest";
import {
  calculateTargets,
  calculateEnergyTarget,
  calculateProteinTarget,
  calculateFatTarget,
  calculateCarbTarget,
  calculateSodiumTarget,
  calculatePotassiumTarget,
  calculateCalciumTarget,
  calculateMagnesiumTarget,
  calculateIronTarget,
  calculateZincTarget,
  calculateFiberTarget,
  calculateFastCarbsTarget,
  type UserProfileForTargets,
} from "../targets";

describe("lib/targets", () => {
  const sampleUser: UserProfileForTargets = {
    sex: "male",
    weightKg: 65,
    goal: "maintain", // Giữ cân
    trainingMinutes: 60,
  };

  describe("Sample User Verification (HANDOFF.md & SPEC.md)", () => {
    it("calculates exact targets for male, 65 kg, Giữ cân, 60 min training", () => {
      const targets = calculateTargets(sampleUser);

      // 1.950–2.275 kcal
      expect(targets.calories.min).toBe(1950);
      expect(targets.calories.max).toBe(2275);

      // Protein 104–143 g
      expect(targets.protein.min).toBe(104);
      expect(targets.protein.max).toBe(143);

      // Fat 33–65 g (32.5 rounded up to 33)
      expect(targets.fat.min).toBe(33);
      expect(targets.fat.max).toBe(65);

      // Potassium 5.200–6.500 mg
      expect(targets.potassium.min).toBe(5200);
      expect(targets.potassium.max).toBe(6500);

      // Sodium 2.751–4.127 mg
      expect(targets.sodium.min).toBe(2751);
      expect(targets.sodium.max).toBe(4127);

      // Calcium 1.200–1.500 mg
      expect(targets.calcium.min).toBe(1200);
      expect(targets.calcium.max).toBe(1500);

      // Magnesium 600–750 mg
      expect(targets.magnesium.min).toBe(600);
      expect(targets.magnesium.max).toBe(750);

      // Iron: Men 8-10 mg
      expect(targets.iron.min).toBe(8);
      expect(targets.iron.max).toBe(10);

      // Zinc: Men 12 mg
      expect(targets.zinc.min).toBe(12);

      // Carbs: ~254 g min target
      expect(targets.carbs.min).toBe(254);
    });
  });

  describe("Goal Calorie Multipliers", () => {
    it("applies correct kcal/kg multipliers per goal", () => {
      expect(calculateEnergyTarget(70, "build")).toEqual({ min: 2450, max: 2800 }); // 35–40 kcal/kg
      expect(calculateEnergyTarget(70, "maintain")).toEqual({ min: 2100, max: 2450 }); // 30–35 kcal/kg
      expect(calculateEnergyTarget(70, "cut")).toEqual({ min: 1750, max: 2100 }); // 25–30 kcal/kg
      expect(calculateEnergyTarget(70, "deep_cut")).toEqual({ min: 1400, max: 1750 }); // 20–25 kcal/kg
    });
  });

  describe("Female-specific targets (Iron & Period)", () => {
    it("sets standard iron for female to 18 mg", () => {
      const female: UserProfileForTargets = {
        sex: "female",
        weightKg: 50,
        goal: "maintain",
        isPeriod: false,
      };
      expect(calculateIronTarget(female.sex, female.isPeriod)).toEqual({ min: 18, max: 18 });
      expect(calculateZincTarget(female.sex)).toEqual({ min: 8, max: 8 });
    });

    it("increases iron to 28 mg when in or near period", () => {
      const femaleInPeriod: UserProfileForTargets = {
        sex: "female",
        weightKg: 50,
        goal: "maintain",
        isPeriod: true,
      };
      expect(calculateIronTarget(femaleInPeriod.sex, femaleInPeriod.isPeriod)).toEqual({ min: 28, max: 28 });
    });
  });

  describe("Training sodium calculation", () => {
    it("calculates sodium on rest days (0 training min)", () => {
      // 4-6 g salt * 393 mg = 1572 - 2358 mg
      expect(calculateSodiumTarget(0)).toEqual({ min: 1572, max: 2358 });
    });

    it("scales salt for 60 min training (3 intervals of 20m -> +3..4.5g salt)", () => {
      // 7-10.5 g salt * 393 mg = 2751 - 4127 mg
      expect(calculateSodiumTarget(60)).toEqual({ min: 2751, max: 4127 });
    });
  });

  describe("Fast carbs for training", () => {
    it("calculates fast carbs according to training duration", () => {
      expect(calculateFastCarbsTarget(0)).toEqual({ min: 0, max: 0 });
      expect(calculateFastCarbsTarget(60)).toEqual({ min: 30, max: 45 });
      expect(calculateFastCarbsTarget(90)).toEqual({ min: 45, max: 68 });
    });
  });
});
