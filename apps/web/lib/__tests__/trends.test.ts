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
import { trendSeries } from "../mock/trends";
import { COUNTED_NUTRIENT_KEYS, dayTotals } from "../day-totals";
import { kcalOnTarget, trendTargetsFrom } from "../trends";
import { calculateTargets } from "../targets";

describe("Trends calculation helpers (lib/trends.ts)", () => {
  it("calculates arithmetic average correctly", () => {
    expect(calculateAverage([10, 20, 30])).toBe(20);
    expect(calculateAverage([2050, 1890, 2210, 1640, 2120, 1980])).toBe(1982); // rounded
    expect(calculateAverage([])).toBe(0);
  });

  it("counts a day above the max as on target, not over the limit", () => {
    const values = [2050, 1890, 2210, 1640, 2120, 1980, 2400];
    // Target 1950 - 2275 (only the minimum counts):
    // 2050, 2210, 2120, 1980 and 2400 (above 2275) -> 5 on target; 1890 and 1640 are below
    const count = countDaysOnTarget(values, { min: 1950 });
    expect(count).toBe(5);
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

describe("Trend series (lib/mock/trends.ts) comes from the day history", () => {
  const TODAY = "2026-10-12";

  it("ends on today and steps back one day each (7 and 30 days)", () => {
    const week = trendSeries(TODAY, 7);
    expect(week).toHaveLength(7);
    expect(week[0].date).toBe("2026-10-06");
    expect(week[6].date).toBe("2026-10-12");
    expect(week[6].isToday).toBe(true);
    expect(week[6].dayLabel).toBe("T2"); // 12/10/2026 is a Monday
    expect(week[6].dateNumber).toBe("12");
    expect(week.slice(0, 6).some((d) => d.isToday)).toBe(false);
    const month = trendSeries(TODAY, 30);
    expect(month).toHaveLength(30);
    expect(month[0].date).toBe("2026-09-13");
  });

  it("is the same number as the day total for the same day", () => {
    for (const entry of trendSeries(TODAY, 30)) {
      const totals = dayTotals(entry.date, TODAY);
      expect(entry.calories, entry.date).toBe(totals.calories);
      expect(entry.protein).toBe(totals.protein);
      expect(entry.nutrients).toEqual(totals.nutrients);
    }
  });

  it("uses the live day for today and the history for earlier days", () => {
    const today = trendSeries(TODAY, 7)[6];
    expect(today.calories).toBe(1041); // the sample day
    expect(trendSeries(TODAY, 7)[5].calories).toBe(1532); // yesterday
  });

  it("has a value or null for each of the 22 counted nutrients every day, never 0 for unknown", () => {
    for (const entry of trendSeries(TODAY, 30)) {
      expect(Object.keys(entry.nutrients).sort()).toEqual([...COUNTED_NUTRIENT_KEYS].sort());
      if (!entry.logged) expect(Object.values(entry.nutrients).every((v) => v === null)).toBe(true);
    }
  });

  it("has logged days and a gap, so averages and streaks have something to skip", () => {
    const month = trendSeries(TODAY, 30);
    expect(month.filter((d) => d.logged).length).toBeGreaterThan(20);
    expect(month.filter((d) => !d.logged).length).toBeGreaterThan(0);
  });
});

describe("Trends nutrient ranges: above the max counts as đạt (no over-limit)", () => {
  // Coach ranges at 65 kg, maintain: calcium 1.200–1.500 mg, magnesium 600–750 mg, potassium 5.200–6.500 mg
  const targets = trendTargetsFrom(calculateTargets({ sex: "male", weightKg: 65, goal: "maintain" }));

  it("counts calcium 1.600 with a 1.200–1.500 target as on target", () => {
    const trend = calculateNutrientTrend([1600, 1300, 1100], targets.calcium);
    expect(trend.daysOnTarget).toBe(2);
    expect(trend.targetMax).toBe(1500);
  });

  it("counts magnesium above 750 as on target", () => {
    const trend = calculateNutrientTrend([800, 700, 500], targets.magnesium);
    expect(trend.daysOnTarget).toBe(2);
    expect(trend.targetMax).toBe(750);
  });

  it("counts potassium above 6.500 as on target", () => {
    const trend = calculateNutrientTrend([7000, 6000, 5000], targets.potassium);
    expect(trend.daysOnTarget).toBe(2);
    expect(trend.targetMax).toBe(6500);
  });

  it("puts a nutrient above its max in the đạt level", () => {
    const trend = calculateNutrientTrend([1600, 1600, 1600], targets.calcium);
    expect(trend.level).toBe("dat");
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
