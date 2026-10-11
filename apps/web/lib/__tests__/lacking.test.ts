import { describe, expect, it } from "vitest";
import { microsSummaryFor } from "../lacking";
import { computeCompositeDayData } from "../diary-store";
import { entryNumbers, type AddedDiaryEntry } from "../diary-edits";
import { MOCK_FOODS } from "../mock/foods";
import { SAMPLE_DAY, type MockMicroStat } from "../mock/sample-day";

describe("Thiếu nhiều nhất follows the day's food", () => {
  it("the sample day lacks Vitamin D and Canxi most", () => {
    expect(microsSummaryFor(SAMPLE_DAY).mostLacking).toEqual(["Vitamin D", "Canxi"]);
  });

  it("drops Canxi from the list once a calcium-rich food is logged today", () => {
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
    expect(day.microsSummary.mostLacking).not.toContain("Canxi");
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
      minerals: [micro("Canxi", 100, 1200), micro("Kẽm", 12, 12), micro("Magie", 300, 600)],
      vitamins: [micro("Vitamin D", 2, 15, "vitamin")],
    });
    // Canxi 8 %, Vitamin D 13 %, Magie 50 %, Kẽm 100 %
    expect(summary.mostLacking).toEqual(["Canxi", "Vitamin D"]);
  });

  it("leaves out nutrients with no target or no known amount", () => {
    const summary = microsSummaryFor({
      minerals: [micro("Natri", 1000, null), micro("Kali", null, 3900), micro("Sắt", 1, 8)],
      vitamins: [],
    });
    expect(summary.mostLacking).toEqual(["Sắt"]);
  });

  it("is empty when nothing has a target", () => {
    const summary = microsSummaryFor({ minerals: [micro("Natri", 1000, null)], vitamins: [] });
    expect(summary.mostLacking).toEqual([]);
  });

  it("counts reached nutrients (100 % or more) per group, and totals as the list lengths", () => {
    const summary = microsSummaryFor({
      minerals: [micro("Kẽm", 12, 12), micro("Canxi", 100, 1200)],
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
