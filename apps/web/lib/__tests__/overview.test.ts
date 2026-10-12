import { describe, expect, it } from "vitest";
import { buildOverview, microRows, summaryMeals } from "../overview";
import { SAMPLE_DAY } from "../mock/sample-day";
import { calculateTargets } from "../targets";
import { COUNTED_NUTRIENT_KEYS } from "../day-totals";

const TODAY = "2026-10-12";
const TARGETS = calculateTargets({ sex: "male", weightKg: 65, goal: "maintain" });
const build = (length: 7 | 30, offset = 0) => buildOverview({ todayIso: TODAY, today: SAMPLE_DAY, targets: TARGETS, length, offset });

describe("buildOverview (the data behind the four Tổng quan sub-tabs)", () => {
  it("7 days ending today: the finished days with entries are counted, today is not", () => {
    const o = build(7);
    expect(o.period.label).toBe("06–12/10");
    expect(o.days).toHaveLength(7);
    expect(o.averages.loggedDays).toBe(6);
    expect(o.enough).toBe(true);
  });

  it("30 days counts the finished logged days of the mock history (three gaps)", () => {
    const o = build(30);
    expect(o.period.label).toBe("13/09–12/10");
    expect(o.averages.loggedDays).toBe(26);
  });

  it("stepping back moves to the previous 7 days and compares with the one before", () => {
    const o = build(7, 1);
    expect(o.period.label).toBe("29/09–05/10");
    expect(o.period.isCurrent).toBe(false);
    expect(o.previous.label).toBe("22–28/09");
    // today is outside this period, so all seven days could count; 01/10... one gap day (daysAgo 8 = 04/10)
    expect(o.averages.loggedDays).toBe(6);
  });

  it("a period before the history has no logged days: not enough data", () => {
    const o = build(7, 6);
    expect(o.averages.loggedDays).toBe(0);
    expect(o.enough).toBe(false);
    expect(o.composition).toBeNull();
    expect(o.changes).toEqual([]);
    expect(o.insights.filter((i) => i.kind !== "streak")).toEqual([]);
  });

  it("composition adds up to 100 and comes from the averages", () => {
    const c = build(7).composition!;
    expect(c.protein + c.carbs + c.fat).toBe(100);
    expect(c.carbs).toBeGreaterThan(c.protein);
  });

  it("targets days are out of the logged days (kcal and protein)", () => {
    const o = build(7);
    expect(o.targetDays.calories.of).toBe(6);
    expect(o.targetDays.protein.of).toBe(6);
    expect(o.targetDays.calories.met).toBeLessThanOrEqual(6);
  });

  it("the streak runs from today back to the gap (8 days: today and daysAgo 1 to 7)", () => {
    expect(build(7).streak).toBe(8);
  });

  it("insights are at most three", () => {
    expect(build(30).insights.length).toBeLessThanOrEqual(3);
  });

  it("weight comes from the weight log sample: 65 kg now", () => {
    const o = build(7);
    expect(o.weight.latest).toBe(65);
    expect(o.weight.points).toHaveLength(7);
    expect(o.weight.change).not.toBeNull();
  });
});

describe("microRows (Vi chất sub-tab): lowest share of target first", () => {
  const rows = microRows(build(7).averages, build(7).targetDays, TARGETS);

  it("has a row for each of the 22 counted nutrients", () => {
    expect(rows).toHaveLength(22);
    expect(rows.map((r) => r.key).sort()).toEqual([...COUNTED_NUTRIENT_KEYS].sort());
  });

  it("sorts known averages by share of target, lowest first", () => {
    const known = rows.filter((r) => r.percentage !== null).map((r) => r.percentage as number);
    expect([...known].sort((a, b) => a - b)).toEqual(known);
  });

  it("puts nutrients without an average at the end, as null (never 0)", () => {
    const firstUnknown = rows.findIndex((r) => r.average === null);
    expect(firstUnknown).toBeGreaterThan(-1);
    expect(rows.slice(firstUnknown).every((r) => r.average === null && r.percentage === null)).toBe(true);
    expect(rows.find((r) => r.key === "b5")!.average).toBeNull(); // no food carries B5
  });

  it("carries days on target as met/of", () => {
    const vitaminD = rows.find((r) => r.key === "vitamin_d")!;
    expect(vitaminD.of).toBeGreaterThanOrEqual(0);
    expect(vitaminD.met).toBeLessThanOrEqual(vitaminD.of);
  });
});

describe("summaryMeals (what nextMeal needs)", () => {
  it("maps the sample day's meals to slots with item counts", () => {
    const meals = summaryMeals(SAMPLE_DAY);
    expect(meals).toEqual([
      { slot: "breakfast", itemCount: 3 },
      { slot: "lunch", itemCount: 2 },
      { slot: "pre_workout", itemCount: 2 },
      { slot: "dinner", itemCount: 0 },
      { slot: "snack", itemCount: 0 },
    ]);
  });
});
