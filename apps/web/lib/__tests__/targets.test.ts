import { describe, it, expect } from "vitest";
import {
  calculateTargets,
  calculateEnergyTarget,
  calculateProteinTarget,
  calculateFatTarget,
  calculateCarbTarget,
  calculateFiberTarget,
  calculateFastCarbsTarget,
  calculateSodiumTarget,
  type GoalType,
  type UserProfileForTargets,
} from "../targets";

// cc-73b (Hao 20/10): the coach's targets are the upper end of every range, one number each. The expected values are worked
// out by hand from the coach's rules (energy 40/35/30/25 kcal/kg, protein 2.2 g/kg, fat 1.0 g/kg, carbs the remainder,
// fibre 14 g per 1,000 kcal capped 40/30), not read back from lib/targets.
const one = (n: number) => ({ min: n, max: n });

describe("lib/targets", () => {
  const sampleUser: UserProfileForTargets = {
    sex: "male",
    weightKg: 65,
    goal: "maintain", // Giữ cân
    trainingMinutes: 60,
    age: 23,
  };

  describe("the upper end of the coach's range, one number", () => {
    // 65 kg: energy 2.600 / 2.275 / 1.950 / 1.625; protein 143 g and fat 65 g in all; carbs (energy − 143 × 4 − 65 × 9) ÷ 4
    const at65: [GoalType, number, number, number][] = [
      ["build", 2600, 361, 36], // (2600 − 572 − 585) ÷ 4 = 360,75
      ["maintain", 2275, 280, 32], // 1118 ÷ 4 = 279,5
      ["cut", 1950, 198, 27], // 793 ÷ 4 = 198,25; fibre 27,3
      ["deep_cut", 1625, 117, 23], // 468 ÷ 4; fibre 22,75
    ];
    for (const [goal, kcal, carbs, fiber] of at65) {
      it(`65 kg, ${goal}: ${kcal} kcal, protein 143 g, fat 65 g, carbs ${carbs} g, fibre ${fiber} g`, () => {
        const t = calculateTargets({ ...sampleUser, goal });
        expect(t.calories).toEqual(one(kcal));
        expect(t.protein).toEqual(one(143));
        expect(t.fat).toEqual(one(65));
        expect(t.carbs).toEqual(one(carbs));
        expect(t.fiber).toEqual(one(fiber));
      });
    }

    // 69 kg: protein 151,8 → 152 g, fat 69 g; build is the "1.278 / 2.760 kcal" of the brief
    const at69: [GoalType, number, number, number][] = [
      ["build", 2760, 383, 39], // 1531 ÷ 4 = 382,75; fibre 38,64
      ["maintain", 2415, 297, 34], // 1186 ÷ 4 = 296,5; fibre 33,81
      ["cut", 2070, 210, 29], // 841 ÷ 4 = 210,25; fibre 28,98
      ["deep_cut", 1725, 124, 24], // 496 ÷ 4; fibre 24,15
    ];
    for (const [goal, kcal, carbs, fiber] of at69) {
      it(`69 kg, ${goal}: ${kcal} kcal, protein 152 g, fat 69 g, carbs ${carbs} g, fibre ${fiber} g`, () => {
        const t = calculateTargets({ ...sampleUser, weightKg: 69, goal });
        expect(t.calories).toEqual(one(kcal));
        expect(t.protein).toEqual(one(152));
        expect(t.fat).toEqual(one(69));
        expect(t.carbs).toEqual(one(carbs));
        expect(t.fiber).toEqual(one(fiber));
      });
    }

    it("energy is 40, 35, 30 and 25 kcal/kg, rounded to a whole kcal", () => {
      expect(calculateEnergyTarget(70, "build")).toEqual(one(2800));
      expect(calculateEnergyTarget(70, "maintain")).toEqual(one(2450));
      expect(calculateEnergyTarget(70, "cut")).toEqual(one(2100));
      expect(calculateEnergyTarget(70, "deep_cut")).toEqual(one(1750));
      expect(calculateEnergyTarget(70.5, "maintain")).toEqual(one(2468)); // 2467,5
    });

    it("protein is 2,2 g/kg and fat 1 g/kg", () => {
      expect(calculateProteinTarget(70)).toEqual(one(154));
      expect(calculateFatTarget(70)).toEqual(one(70));
      expect(calculateFatTarget(65.4)).toEqual(one(65));
    });

    it("carbs are the remainder of the energy after protein × 4 and fat × 9", () => {
      expect(calculateCarbTarget(2275, 143, 65)).toEqual(one(280));
      expect(calculateCarbTarget(2000, 143, 65)).toEqual(one(211)); // 843 ÷ 4 = 210,75
    });

    it("fibre is 14 g per 1.000 kcal, and no more than 40 g for a man and 30 g for a woman", () => {
      expect(calculateFiberTarget(2275, "male")).toEqual(one(32));
      expect(calculateFiberTarget(2275, "female")).toEqual(one(30)); // 31,85 capped
      expect(calculateFiberTarget(3500, "male")).toEqual(one(40)); // 49 capped
      expect(calculateFiberTarget(1800, "female")).toEqual(one(25)); // 25,2, under the cap
    });

    it("a woman's fibre stops at 30 g even at a high energy", () => {
      expect(calculateTargets({ sex: "female", weightKg: 80, goal: "build", age: 30 }).fiber).toEqual(one(30));
    });

    it("the user's custom kcal wins: the carbs and the fibre follow it", () => {
      const t = calculateTargets({ ...sampleUser, customEnergyKcal: 2000 });
      expect(t.calories).toEqual(one(2000));
      expect(t.protein).toEqual(one(143));
      expect(t.fat).toEqual(one(65));
      expect(t.carbs).toEqual(one(211));
      expect(t.fiber).toEqual(one(28));
    });

    it("custom macro ratios and fixed grams still win over the coach's formulas", () => {
      const ratios = calculateTargets({ ...sampleUser, macroMode: "ratios", macroRatios: { proteinPct: 25, carbsPct: 55, fatPct: 20 } });
      expect(ratios.calories).toEqual(one(2275));
      expect(ratios.protein).toEqual(one(142)); // 25 % of 2275 = 569 kcal ÷ 4
      expect(ratios.carbs).toEqual(one(313)); // 55 % = 1251 kcal ÷ 4
      expect(ratios.fat).toEqual(one(51)); // 20 % = 455 kcal ÷ 9
      const fixed = calculateTargets({ ...sampleUser, macroMode: "fixed", macroFixed: { proteinGrams: 120, carbsGrams: 200, fatGrams: 60 } });
      expect(fixed.protein).toEqual(one(120));
      expect(fixed.carbs).toEqual(one(200));
      expect(fixed.fat).toEqual(one(60));
    });
  });

  describe("fast carbs and salt stay ranges (Hao 20/10)", () => {
    it("fast carbs are 30–45 g per training hour", () => {
      expect(calculateFastCarbsTarget(0)).toEqual({ min: 0, max: 0 });
      expect(calculateFastCarbsTarget(60)).toEqual({ min: 30, max: 45 });
      expect(calculateFastCarbsTarget(120)).toEqual({ min: 60, max: 90 });
      expect(calculateTargets({ ...sampleUser, trainingMinutes: 120 }).fastCarbs).toEqual({ min: 60, max: 90 });
    });

    it("salt is 4–6 g plus 1–1,5 g per 20 minutes of training, × 393 mg of sodium", () => {
      expect(calculateSodiumTarget(0)).toEqual({ min: 1570, max: 2360 });
      expect(calculateSodiumTarget(60)).toEqual({ min: 2750, max: 4130 });
      expect(calculateSodiumTarget(120)).toEqual({ min: 3930, max: 5900 });
      expect(calculateTargets({ ...sampleUser, trainingMinutes: 0 }).sodium).toEqual({ min: 1570, max: 2360 });
    });
  });

  describe("the 21 vitamins and minerals are US DRI amounts for sex and age", () => {
    it("a man of 23 gets the 19–30 amounts, one value each, whatever the weight or training", () => {
      const t = calculateTargets(sampleUser);
      const single = (id: string) => {
        expect(t[id]?.min, id).toBe(t[id]?.max);
        return t[id]?.min;
      };
      expect(single("potassium")).toBe(3400);
      expect(single("calcium")).toBe(1000);
      expect(single("magnesium")).toBe(400);
      expect(single("iron")).toBe(8);
      expect(single("zinc")).toBe(11);
      expect(single("vitamin_k")).toBe(120);
      expect(single("b6")).toBe(1.3);
      const light = calculateTargets({ ...sampleUser, weightKg: 50, trainingMinutes: 0 });
      const heavy = calculateTargets({ ...sampleUser, weightKg: 95, trainingMinutes: 120 });
      for (const id of ["potassium", "calcium", "magnesium", "iron", "zinc", "b1", "vitamin_a"]) expect(light[id]).toEqual(heavy[id]);
    });

    it("a woman and an older man get their own amounts", () => {
      const woman = calculateTargets({ ...sampleUser, sex: "female" });
      expect(woman.iron?.min).toBe(18);
      expect(woman.zinc?.min).toBe(8);
      expect(woman.potassium?.min).toBe(2600);
      expect(woman.magnesium?.min).toBe(310);
      const older = calculateTargets({ ...sampleUser, age: 75 });
      expect(older.calcium?.min).toBe(1200);
      expect(older.vitamin_d?.min).toBe(20);
      expect(calculateTargets({ ...sampleUser, sex: "female", age: 55 }).calcium?.min).toBe(1200);
    });

    it("the period makes a woman's iron the coach's 28 mg, and nothing else changes", () => {
      const base = calculateTargets({ ...sampleUser, sex: "female", isPeriod: false });
      const period = calculateTargets({ ...sampleUser, sex: "female", isPeriod: true });
      expect(base.iron).toEqual(one(18));
      expect(period.iron).toEqual(one(28));
      expect({ ...period, iron: base.iron }).toEqual(base);
      // a man ignores it
      expect(calculateTargets({ ...sampleUser, isPeriod: true }).iron).toEqual(one(8));
    });

    it("an age that is not given counts as 25 (the 19–30 stage)", () => {
      expect(calculateTargets({ sex: "male", weightKg: 65, goal: "maintain" }).magnesium?.min).toBe(400);
    });
  });
});
