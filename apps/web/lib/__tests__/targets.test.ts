import { describe, it, expect } from "vitest";
import {
  calculateTargets,
  calculateEnergyTarget,
  calculateProteinTarget,
  calculateFatTarget,
  calculateCarbTarget,
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
    age: 23,
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

      // Carbs: ~254 g min target
      expect(targets.carbs.min).toBe(254);
    });

    it("cc-67: the 22 vitamins and minerals are the VN 2016 recommended amounts for a man of 20–29, not formulas", () => {
      const t = calculateTargets(sampleUser);
      const single = (id: string) => {
        expect(t[id]?.min, id).toBe(t[id]?.max);
        return t[id]?.min;
      };
      expect(single("sodium")).toBe(2000);
      expect(single("potassium")).toBe(2500);
      expect(single("calcium")).toBe(800);
      expect(single("magnesium")).toBe(340);
      expect(single("iron")).toBe(7.9);
      expect(single("zinc")).toBe(10);
      expect(single("vitamin_k")).toBe(150);
      expect(single("b6")).toBe(1.3);
    });

    it("the weight and the training minutes do not move them", () => {
      const light = calculateTargets({ ...sampleUser, weightKg: 50, trainingMinutes: 0 });
      const heavy = calculateTargets({ ...sampleUser, weightKg: 95, trainingMinutes: 120 });
      for (const id of ["sodium", "potassium", "calcium", "magnesium", "iron", "zinc", "b1", "vitamin_a"]) expect(light[id]).toEqual(heavy[id]);
    });

    it("a woman and an older man get their own amounts", () => {
      const woman = calculateTargets({ ...sampleUser, sex: "female" });
      expect(woman.iron?.min).toBe(17.4);
      expect(woman.zinc?.min).toBe(8);
      expect(woman.potassium?.min).toBe(2000);
      const older = calculateTargets({ ...sampleUser, age: 55 });
      expect(older.calcium?.min).toBe(800);
      expect(older.vitamin_d?.min).toBe(20);
      expect(calculateTargets({ ...sampleUser, sex: "female", age: 55 }).calcium?.min).toBe(900);
    });

    it("an age that is not given counts as 20–29", () => {
      expect(calculateTargets({ sex: "male", weightKg: 65, goal: "maintain" }).magnesium?.min).toBe(340);
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

});
