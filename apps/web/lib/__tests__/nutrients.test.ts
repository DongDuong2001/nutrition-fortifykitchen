import { describe, it, expect } from "vitest";
import {
  NUTRIENT_CATALOG,
  calculateNutrientPercentage,
  calculateNutrientLevel,
  countAchievedNutrients,
  getNutrientDefinition,
} from "../nutrients";
import { PROVISIONAL_TARGETS, VN2016_TARGETS } from "../targets";
import { SAMPLE_DAY } from "../mock/sample-day";

describe("Nutrient Catalogue & Null Handling", () => {
  it("contains complete catalogue matching docs/nutrient-catalog.md", () => {
    expect(NUTRIENT_CATALOG.length).toBeGreaterThanOrEqual(58);

    const withTarget = NUTRIENT_CATALOG.filter((n) => n.targetSource !== "none");
    expect(withTarget.length).toBe(27);

    const microsWithTarget = NUTRIENT_CATALOG.filter(
      (n) => (n.group === "vitamins" || n.group === "minerals") && n.targetSource !== "none"
    );
    expect(microsWithTarget.length).toBe(22);

    const ala = getNutrientDefinition("ala");
    expect(ala).toBeDefined();
    expect(ala?.depth).toBe(3);
    expect(ala?.parentId).toBe("omega3");
    expect(ala?.targetSource).toBe("none");
  });

  it("percentage calculation returns null when consumed or target is null", () => {
    expect(calculateNutrientPercentage(null, 100)).toBeNull();
    expect(calculateNutrientPercentage(50, null)).toBeNull();
    expect(calculateNutrientPercentage(null, null)).toBeNull();
    expect(calculateNutrientPercentage(50, 0)).toBeNull();
    expect(calculateNutrientPercentage(50, 100)).toBe(50);
    expect(calculateNutrientPercentage(1041, 1950)).toBe(53);
  });

  it("level calculation returns null when percentage is null", () => {
    expect(calculateNutrientLevel(null)).toBeNull();
    expect(calculateNutrientLevel(40)).toBe("thieu");
    expect(calculateNutrientLevel(60)).toBe("trungbinh");
    expect(calculateNutrientLevel(85)).toBe("ganDu");
    expect(calculateNutrientLevel(100)).toBe("dat");
    expect(calculateNutrientLevel(150)).toBe("dat");
  });

  it("countAchievedNutrients only counts nutrients with a target and ignores null", () => {
    const list = [
      { id: "water", consumed: 2000, targetMin: null, targetSource: "none" as const }, // no target
      { id: "caffeine", consumed: null, targetMin: null, targetSource: "none" as const }, // no target, null
      { id: "vitamin_d", consumed: null, targetMin: 15, targetSource: "vn2016" as const }, // has target, null consumed
      { id: "calcium", consumed: 331, targetMin: 1200, targetSource: "coach" as const }, // not reached (28%)
      { id: "zinc", consumed: 12.4, targetMin: 12, targetSource: "coach" as const }, // reached (100%+)
      { id: "iron", consumed: 11, targetMin: 8, targetSource: "coach" as const }, // reached (100%+)
    ];

    const result = countAchievedNutrients(list);
    // Only 4 items have a target (vitamin_d, calcium, zinc, iron)
    expect(result.totalWithTarget).toBe(4);
    // Only 2 are reached (zinc, iron). vitamin_d is null so NOT reached.
    expect(result.achieved).toBe(2);
  });

  it("VN2016 targets exist and are flagged as provisional", () => {
    expect(VN2016_TARGETS.vitamin_d.min).toBe(15);
    expect(VN2016_TARGETS.b12.min).toBe(2.4);
    expect(VN2016_TARGETS.copper.min).toBe(0.9);
    expect(VN2016_TARGETS.manganese.min).toBe(2.3);

    expect(PROVISIONAL_TARGETS.vitamin_d).toBe(true);
    expect(PROVISIONAL_TARGETS.b12).toBe(true);
    expect(PROVISIONAL_TARGETS.copper).toBe(true);
    expect(PROVISIONAL_TARGETS.manganese).toBe(true);
  });

  it("percentage calculation uses lower bound for range targets and handles single target values", () => {
    // For range targets (e.g. sodium 2.751–4.127 mg), lower bound is 2.751 mg
    // 2900 mg / 2751 mg = 105%
    const sodiumPct = calculateNutrientPercentage(2900, 2751);
    expect(sodiumPct).toBe(105);

    // Potassium: 3900 / 5200 = 75%
    const potassiumPct = calculateNutrientPercentage(3900, 5200);
    expect(potassiumPct).toBe(75);

    // Tracked-only rows with targetMin null have no percentage
    expect(calculateNutrientPercentage(100, null)).toBeNull();
  });

  it("vi chat đạt count only counts vitamins + minerals with a target", () => {
    // There are 22 total vitamins + minerals with a target (12 vitamins + 10 minerals)
    const vitaminsAndMineralsWithTarget = NUTRIENT_CATALOG.filter(
      (n) => (n.group === "vitamins" || n.group === "minerals") && n.targetSource !== "none"
    );
    expect(vitaminsAndMineralsWithTarget.length).toBe(22);

    // General, carbs, lipids, protein (macros) are NOT in the 22 count
    const macroTargets = NUTRIENT_CATALOG.filter(
      (n) => (n.group !== "vitamins" && n.group !== "minerals") && n.targetSource !== "none"
    );
    expect(macroTargets.length).toBe(5); // energy, carbs, fiber, fat, protein
  });

  it("checks SAMPLE_DAY nutrient totals consistency and breakdown invariants", () => {
    const n = SAMPLE_DAY.nutrients;
    expect(n).toBeDefined();
    if (!n) return;

    // 1. monounsaturated + polyunsaturated + saturated + trans <= total fat
    const fatBreakdown =
      (n.monounsaturated_fat ?? 0) +
      (n.polyunsaturated_fat ?? 0) +
      (n.saturated_fat ?? 0) +
      (n.trans_fat ?? 0);
    expect(Number(fatBreakdown.toFixed(2))).toBeLessThanOrEqual(n.fat ?? 0);

    // 2. omega-3 + omega-6 <= polyunsaturated
    const pufaBreakdown = (n.omega3 ?? 0) + (n.omega6 ?? 0);
    expect(Number(pufaBreakdown.toFixed(2))).toBeLessThanOrEqual(n.polyunsaturated_fat ?? 0);

    // 3. ALA + DHA + EPA <= omega-3
    const omega3Breakdown = (n.ala ?? 0) + (n.dha ?? 0) + (n.epa ?? 0);
    expect(Number(omega3Breakdown.toFixed(2))).toBeLessThanOrEqual(n.omega3 ?? 0);

    // 4. soluble + insoluble fibre = fibre
    expect((n.soluble_fiber ?? 0) + (n.insoluble_fiber ?? 0)).toBe(n.fiber);

    // 5. net carbs = carbs - fibre
    expect(n.net_carbs).toBe((n.carbs ?? 0) - (n.fiber ?? 0));
  });
});

