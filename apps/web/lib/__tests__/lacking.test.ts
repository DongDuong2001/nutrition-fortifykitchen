import { describe, expect, it } from "vitest";
import { lowestMicros, microsSummaryFor } from "../lacking";
import { computeCompositeDayData } from "../diary-store";
import { entryNumbers, type AddedDiaryEntry } from "../diary-edits";
import { MOCK_FOODS } from "../mock/foods";
import { SAMPLE_DAY, type MockMicroStat } from "../mock/sample-day";

describe("Thiếu nhiều nhất follows the day's food", () => {
  it("the sample day lacks Vitamin D and Calcium most", () => {
    expect(microsSummaryFor(SAMPLE_DAY).mostLacking).toEqual(["Vitamin D", "Calcium"]);
  });

  it("drops Calcium from the list once a calcium-rich food is logged today", () => {
    const tofu = MOCK_FOODS.find((f) => f.id === "food-dau-hu")!;
    const entry: AddedDiaryEntry = {
      id: "entry-tofu",
      foodId: tofu.id,
      foodName: tofu.nameVi,
      grams: 150,
      displayQty: "1 bìa",
      mealSlot: "lunch",
      ...entryNumbers(tofu, 150),
      addedAt: "2026-10-11T12:00:00.000Z",
    };
    const day = computeCompositeDayData(SAMPLE_DAY, [entry]);
    expect(day.microsSummary.mostLacking).toHaveLength(2);
    expect(day.microsSummary.mostLacking).not.toContain("Calcium");
  });
});

function micro(
  name: string,
  consumed: number | null,
  targetMin: number | null,
  group: "mineral" | "vitamin" = "mineral"
): MockMicroStat {
  const percentage = consumed !== null && targetMin ? Math.round((consumed / targetMin) * 100) : null;
  return {
    key: name.toLowerCase().replace(/\s+/g, "_"),
    name,
    group,
    consumed,
    targetMin,
    unit: "mg",
    displayValue: "",
    percentage,
    isCoachRule: true,
  };
}

describe("microsSummaryFor", () => {
  it("lists the two nutrients lacking most, lowest percentage first", () => {
    const summary = microsSummaryFor({
      minerals: [micro("Calcium", 100, 1200), micro("Zinc", 12, 12), micro("Magnesium", 300, 600)],
      vitamins: [micro("Vitamin D", 2, 15, "vitamin")],
    });
    // Calcium 8 %, Vitamin D 13 %, Magnesium 50 %, Zinc 100 %
    expect(summary.mostLacking).toEqual(["Calcium", "Vitamin D"]);
  });

  it("leaves out nutrients with no target or no known amount", () => {
    const summary = microsSummaryFor({
      minerals: [micro("Sodium", 1000, null), micro("Potassium", null, 3900), micro("Iron", 1, 8)],
      vitamins: [],
    });
    expect(summary.mostLacking).toEqual(["Iron"]);
  });

  it("lists only nutrients under 100 % of their target", () => {
    const summary = microsSummaryFor({
      minerals: [micro("Zinc", 12, 12), micro("Calcium", 1300, 1200), micro("Magnesium", 300, 600)],
      vitamins: [micro("Vitamin D", 20, 15, "vitamin")],
    });
    // Magnesium 50 %; Zinc 100 %, Calcium 108 %, Vitamin D 133 % are reached
    expect(summary.mostLacking).toEqual(["Magnesium"]);
  });

  it("is empty when nothing has a target", () => {
    const summary = microsSummaryFor({ minerals: [micro("Sodium", 1000, null)], vitamins: [] });
    expect(summary.mostLacking).toEqual([]);
  });

  it("counts reached nutrients (100 % or more) per group, and totals as the list lengths", () => {
    const summary = microsSummaryFor({
      minerals: [micro("Zinc", 12, 12), micro("Calcium", 100, 1200)],
      vitamins: [micro("Vitamin A", 700, 650, "vitamin"), micro("Vitamin D", 2, 15, "vitamin"), micro("Vitamin C", 10, 100, "vitamin")],
    });
    expect(summary.mineralsAchieved).toBe(1);
    expect(summary.mineralsTotal).toBe(2);
    expect(summary.vitaminsAchieved).toBe(1);
    expect(summary.vitaminsTotal).toBe(3);
    expect(summary.achieved).toBe(2);
    expect(summary.total).toBe(5);
  });
});

describe("lowestMicros", () => {
  it("all reached → empty", () => {
    const day = {
      minerals: [micro("Zinc", 12, 12), micro("Calcium", 1300, 1200)],
      vitamins: [micro("Vitamin A", 700, 650, "vitamin"), micro("Vitamin C", 99.6, 100, "vitamin")],
    };
    // Vitamin C 99,6 % rounds to 100 %: reached, as on the Micros screen
    expect(lowestMicros(day, 3)).toEqual([]);
    expect(microsSummaryFor(day).mostLacking).toEqual([]);
  });

  it("only those under target, lowest share first, at most count", () => {
    const day = {
      minerals: [micro("Zinc", 6, 12), micro("Calcium", 1300, 1200), micro("Iron", 1, 8)],
      vitamins: [micro("Vitamin D", 14.9, 15, "vitamin"), micro("Vitamin C", 99.4, 100, "vitamin")],
    };
    // Iron 13 %, Zinc 50 %, Vitamin D 99,3 %, Vitamin C 99,4 %; Calcium 108 % is left out
    expect(lowestMicros(day, 2).map((s) => s.name)).toEqual(["Iron", "Zinc"]);
    expect(lowestMicros(day, 10).map((s) => s.name)).toEqual(["Iron", "Zinc", "Vitamin D", "Vitamin C"]);
  });

  it("never ranks an unknown amount or a missing target", () => {
    const day = { minerals: [micro("Potassium", null, 3900), micro("Sodium", 10, null)], vitamins: [] };
    expect(lowestMicros(day, 2)).toEqual([]);
  });
});
