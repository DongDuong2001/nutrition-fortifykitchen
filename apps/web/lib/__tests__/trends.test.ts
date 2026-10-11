import { describe, it, expect } from "vitest";
import {
  calculateAverage,
  countDaysOnTarget,
  calculateNutrientTrend,
  getBestAndWorstNutrients,
  type DailyTrendEntry,
  type NutrientTargetDef,
  type NutrientTrendResult,
} from "../trends";
import {
  MOCK_TRENDS_7_DAYS,
  MOCK_TRENDS_30_DAYS,
  TREND_TARGETS,
} from "../mock/trends";

describe("Trends calculation helpers (lib/trends.ts)", () => {
  it("calculates arithmetic average correctly", () => {
    expect(calculateAverage([10, 20, 30])).toBe(20);
    expect(calculateAverage([2050, 1890, 2210, 1640, 2120, 1980])).toBe(1982); // rounded
    expect(calculateAverage([])).toBe(0);
  });

  it("counts days on target correctly with min and max bounds", () => {
    const values = [2050, 1890, 2210, 1640, 2120, 1980];
    // Target 1950 - 2275:
    // 2050 (in), 1890 (no), 2210 (in), 1640 (no), 2120 (in), 1980 (in) -> 4 on target
    const count = countDaysOnTarget(values, { min: 1950, max: 2275 });
    expect(count).toBe(4);
  });

  it("counts days on target with min-only target", () => {
    const values = [100, 105, 110, 95, 120, 80];
    // Target min 104:
    // 100 (no), 105 (yes), 110 (yes), 95 (no), 120 (yes), 80 (no) -> 3
    const count = countDaysOnTarget(values, { min: 104 });
    expect(count).toBe(3);
  });

  it("calculates nutrient trend with levels matching bar thresholds", () => {
    // Thresholds: <50 (thieu), 50-79 (trungbinh), 80-99 (ganDu), >=100 (dat)
    const target: NutrientTargetDef = {
      key: "vitamin_d",
      name: "Vitamin D",
      unit: "µg",
      targetMin: 15,
    };

    // Case 1: <50% (thieu)
    const lowTrend = calculateNutrientTrend([2, 3, 2, 4, 3, 2, 2], target);
    expect(lowTrend.averagePercentage).toBeLessThan(50);
    expect(lowTrend.level).toBe("thieu");

    // Case 2: 50-79% (trungbinh)
    const midTrend = calculateNutrientTrend([10, 11, 10, 9, 10, 11, 10], target); // avg 10.14/15 = 68%
    expect(midTrend.averagePercentage).toBeGreaterThanOrEqual(50);
    expect(midTrend.averagePercentage).toBeLessThan(80);
    expect(midTrend.level).toBe("trungbinh");

    // Case 3: 80-99% (ganDu)
    const nearTrend = calculateNutrientTrend([13, 13, 14, 13, 13, 13, 13], target); // avg ~13.1/15 = 87%
    expect(nearTrend.averagePercentage).toBeGreaterThanOrEqual(80);
    expect(nearTrend.averagePercentage).toBeLessThan(100);
    expect(nearTrend.level).toBe("ganDu");

    // Case 4: >=100% (dat)
    const fullTrend = calculateNutrientTrend([16, 17, 15, 16, 18, 15, 16], target); // avg ~16/15 = 107%
    expect(fullTrend.averagePercentage).toBeGreaterThanOrEqual(100);
    expect(fullTrend.level).toBe("dat");
  });

  it("identifies best and worst nutrients correctly", () => {
    const list: NutrientTrendResult[] = [
      {
        key: "vitamin_d",
        name: "Vitamin D",
        unit: "µg",
        averageValue: 2.7,
        averagePercentage: 18,
        daysOnTarget: 0,
        totalDays: 7,
        level: "thieu",
        targetMin: 15,
      },
      {
        key: "calcium",
        name: "Canxi",
        unit: "mg",
        averageValue: 410,
        averagePercentage: 41,
        daysOnTarget: 0,
        totalDays: 7,
        level: "thieu",
        targetMin: 1000,
      },
      {
        key: "protein",
        name: "Đạm",
        unit: "g",
        averageValue: 112,
        averagePercentage: 108,
        daysOnTarget: 6,
        totalDays: 7,
        level: "dat",
        targetMin: 104,
      },
    ];

    const { best, worst } = getBestAndWorstNutrients(list);
    expect(best?.key).toBe("protein");
    expect(worst?.key).toBe("vitamin_d");
  });

  it("handles empty nutrient list in getBestAndWorstNutrients", () => {
    const { best, worst } = getBestAndWorstNutrients([]);
    expect(best).toBeNull();
    expect(worst).toBeNull();
  });
});

describe("Trends mock data (lib/mock/trends.ts)", () => {
  it("provides 7 days of mock daily totals with 5 key micros and macros", () => {
    expect(MOCK_TRENDS_7_DAYS).toHaveLength(7);
    const day = MOCK_TRENDS_7_DAYS[0];
    expect(day.calories).toBeGreaterThan(1000);
    expect(day.protein).toBeGreaterThan(0);
    expect(day.fat).toBeGreaterThan(0);
    expect(day.carbs).toBeGreaterThan(0);
    expect(day.fiber).toBeGreaterThan(0);
    // 5 key micros:
    expect(day.calcium).toBeGreaterThan(0);
    expect(day.iron).toBeGreaterThan(0);
    expect(day.potassium).toBeGreaterThan(0);
    expect(day.magnesium).toBeGreaterThan(0);
    expect(day.vitamin_d).toBeGreaterThan(0);
  });

  it("provides 30 days of mock daily totals", () => {
    expect(MOCK_TRENDS_30_DAYS).toHaveLength(30);
    const lastDay = MOCK_TRENDS_30_DAYS[29];
    expect(lastDay.calories).toBeGreaterThan(0);
  });

  it("has targets defined for kcal, macros, and 5 key micros", () => {
    expect(TREND_TARGETS.calories.min).toBe(1950);
    expect(TREND_TARGETS.calories.max).toBe(2275);
    expect(TREND_TARGETS.protein.targetMin).toBe(104);
    expect(TREND_TARGETS.calcium.targetMin).toBe(1000);
    expect(TREND_TARGETS.vitamin_d.targetMin).toBe(15);
  });
});
