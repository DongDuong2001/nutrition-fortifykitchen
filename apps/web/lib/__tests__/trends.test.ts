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
} from "../mock/trends";
import {
  anchorTrendDays,
  kcalOnTarget,
  trendTargetsFrom,
  trendWindowLabel,
} from "../trends";
import { calculateTargets } from "../targets";

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

});

describe("Trends date window (anchorTrendDays, trendWindowLabel)", () => {
  it("ends the window on today and labels the last day", () => {
    const days = anchorTrendDays(MOCK_TRENDS_7_DAYS, "2026-10-11");
    expect(days).toHaveLength(7);
    expect(days[0].date).toBe("2026-10-05");
    expect(days[6].date).toBe("2026-10-11");
    expect(days[6].dateNumber).toBe("11");
    expect(days[6].dayLabel).toBe("CN"); // 11/10/2026 is a Sunday
    expect(days[6].isToday).toBe(true);
    expect(days.slice(0, 6).some((d) => d.isToday)).toBe(false);
  });

  it("keeps the mock values in order when it moves the dates", () => {
    const days = anchorTrendDays(MOCK_TRENDS_7_DAYS, "2026-10-11");
    expect(days[0].calories).toBe(MOCK_TRENDS_7_DAYS[0].calories);
    expect(days[5].calories).toBe(MOCK_TRENDS_7_DAYS[5].calories);
  });

  it("builds the 30-day window back from today across a month boundary", () => {
    const days = anchorTrendDays(MOCK_TRENDS_30_DAYS, "2026-10-11");
    expect(days).toHaveLength(30);
    expect(days[0].date).toBe("2026-09-12");
    expect(days[29].date).toBe("2026-10-11");
  });

  it("writes the window range in one month as dd–dd/mm", () => {
    expect(trendWindowLabel(anchorTrendDays(MOCK_TRENDS_7_DAYS, "2026-10-11"))).toBe("05–11/10");
  });

  it("writes the window range across two months as dd/mm–dd/mm", () => {
    expect(trendWindowLabel(anchorTrendDays(MOCK_TRENDS_30_DAYS, "2026-10-11"))).toBe("12/09–11/10");
  });
});

describe("Trends kcal rule (kcalOnTarget)", () => {
  it("counts a day below the range as off target", () => {
    expect(kcalOnTarget(1890, 1950)).toBe(false);
  });

  it("counts the bottom of the range as on target", () => {
    expect(kcalOnTarget(1950, 1950)).toBe(true);
  });

  it("counts a day above the range as on target, never as an over-limit", () => {
    expect(kcalOnTarget(2300, 1950)).toBe(true);
  });
});

describe("Trends targets come from the profile (trendTargetsFrom)", () => {
  // Coach values for a 65 kg maintain profile: the same numbers as Today and Micros
  const male = trendTargetsFrom(
    calculateTargets({ sex: "male", weightKg: 65, goal: "maintain" })
  );

  it("uses the kcal range and protein minimum from the profile", () => {
    expect(male.calories).toEqual({ min: 1950, max: 2275 });
    expect(male.protein.targetMin).toBe(104);
  });

  it("uses the calcium and magnesium ranges (1.200–1.500 mg, 600–750 mg)", () => {
    expect(male.calcium.targetMin).toBe(1200);
    expect(male.magnesium.targetMin).toBe(600);
    expect(male.magnesium.targetMax).toBe(750);
  });

  it("uses potassium from weight (80–100 mg/kg) and vitamin D 15 µg", () => {
    expect(male.potassium.targetMin).toBe(5200);
    expect(male.vitamin_d.targetMin).toBe(15);
  });

  it("uses iron 8 mg for a man, 18 mg for a woman and 28 mg in her period", () => {
    expect(male.iron.targetMin).toBe(8);
    const female = trendTargetsFrom(calculateTargets({ sex: "female", weightKg: 65, goal: "maintain" }));
    expect(female.iron.targetMin).toBe(18);
    const period = trendTargetsFrom(
      calculateTargets({ sex: "female", weightKg: 65, goal: "maintain", isPeriod: true })
    );
    expect(period.iron.targetMin).toBe(28);
  });
});
