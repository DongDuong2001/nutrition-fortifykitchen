import { describe, expect, it } from "vitest";
import type { AddedDiaryEntry } from "../diary-edits";
import { SHORTLIST_DAYS, frequentFoods, recentForMeal } from "../meal-shortlists";

// cc-51 D1: Gần đây (last 8 distinct foods of this meal) and Hay ăn (top 8 by count over 14 days), from the diary.

const entry = (id: string, foodId: string, slot: AddedDiaryEntry["mealSlot"], addedAt: string, displayQty = "100 g", grams = 100): AddedDiaryEntry => ({
  id, foodId, foodName: foodId, grams, displayQty, mealSlot: slot, calories: 100, protein: 1, carbs: 1, fat: 1, fiber: 1, nutrients: {}, addedAt,
});

describe("recentForMeal", () => {
  it("the meal's foods, newest first, each once, with the portion it was last logged with", () => {
    const list = recentForMeal(
      [
        entry("1", "com", "lunch", "2026-10-16T05:00:00Z", "1 chén", 150),
        entry("2", "pho", "breakfast", "2026-10-17T01:00:00Z"),
        entry("3", "ga", "lunch", "2026-10-17T05:00:00Z"),
        entry("4", "com", "lunch", "2026-10-18T05:00:00Z", "2 chén", 300),
      ],
      "lunch"
    );
    expect(list).toEqual([
      { foodId: "com", servingLabel: "2 chén", grams: 300 },
      { foodId: "ga", servingLabel: "100 g", grams: 100 },
    ]);
  });
  it("at most 8, and quick kcal entries (no food) are left out", () => {
    const many = Array.from({ length: 12 }, (_, i) => entry(`${i}`, `f${i}`, "dinner", `2026-10-1${i % 9}T10:00:00Z`));
    const quick = { ...entry("q", "", "dinner", "2026-10-18T12:00:00Z"), kind: "quick" as const };
    const list = recentForMeal([...many, quick], "dinner");
    expect(list).toHaveLength(8);
    expect(list.some((r) => r.foodId === "")).toBe(false);
  });
});

describe("frequentFoods", () => {
  const today = "2026-10-18";
  it("the most logged foods of the last 14 days, any meal, with their last portion; ties: the newer first", () => {
    const list = frequentFoods(
      [
        entry("1", "trung", "breakfast", "2026-10-10T01:00:00Z"),
        entry("2", "trung", "breakfast", "2026-10-12T01:00:00Z", "2 quả", 100),
        entry("3", "chuoi", "snack", "2026-10-13T08:00:00Z"),
        entry("4", "trung", "dinner", "2026-10-15T12:00:00Z", "1 quả", 50),
        entry("5", "sua", "breakfast", "2026-10-16T01:00:00Z"),
        entry("6", "chuoi", "snack", "2026-10-17T08:00:00Z"),
      ],
      today
    );
    expect(list.map((f) => f.foodId)).toEqual(["trung", "chuoi", "sua"]);
    expect(list[0]).toEqual({ foodId: "trung", servingLabel: "1 quả", grams: 50 });
  });
  it(`only the last ${SHORTLIST_DAYS} days count`, () => {
    const list = frequentFoods([entry("1", "old", "lunch", "2026-10-01T05:00:00Z"), entry("2", "old", "lunch", "2026-10-02T05:00:00Z"), entry("3", "new", "lunch", "2026-10-17T05:00:00Z")], today);
    expect(list.map((f) => f.foodId)).toEqual(["new"]);
  });
});
