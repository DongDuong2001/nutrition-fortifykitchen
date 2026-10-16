import { describe, it, expect } from "vitest";
import { MOCK_FOODS } from "../mock/foods";
import type { AddedDiaryEntry } from "../diary-edits";
import {
  buildSavedMeal,
  defaultMealName,
  itemsFromEntries,
  parseSavedMeals,
  removeSavedMeal,
  renameSavedMeal,
  savedMealEntries,
  savedMealSkipped,
  savedMealTotals,
  type SavedMeal,
} from "../saved-meals";

const items = [
  { foodId: "food-yen-mach", servingLabel: "60 g", grams: 60 },
  { foodId: "food-chuoi", servingLabel: "1 quả", grams: 100 },
];

const meal = (id: string, name = "Sáng nhanh"): SavedMeal => ({ id, name, items, createdAt: "2026-10-13T08:00:00.000Z" });

describe("defaultMealName", () => {
  it("is the meal name and the day as dd/mm", () => {
    expect(defaultMealName("breakfast", "2026-10-13")).toBe("Bữa sáng 13/10");
    expect(defaultMealName("pre_workout", "2026-01-05")).toBe("Trước tập 05/01");
  });
});

describe("buildSavedMeal", () => {
  const base = { id: "sm-1", createdAt: "2026-10-13T08:00:00.000Z", fallbackName: "Bữa sáng 13/10" };

  it("keeps the name and the items", () => {
    expect(buildSavedMeal({ ...base, name: "  Sáng nhanh ", items })).toEqual(meal("sm-1"));
  });

  it("uses the default name for a blank name", () => {
    expect(buildSavedMeal({ ...base, name: "   ", items })?.name).toBe("Bữa sáng 13/10");
  });

  it("returns null for an empty meal", () => {
    expect(buildSavedMeal({ ...base, name: "x", items: [] })).toBeNull();
  });
});

describe("rename and remove", () => {
  const list = [meal("a", "A"), meal("b", "B")];

  it("renames one meal and ignores a blank name", () => {
    expect(renameSavedMeal(list, "b", " Bữa B ").map((m) => m.name)).toEqual(["A", "Bữa B"]);
    expect(renameSavedMeal(list, "b", "  ")).toEqual(list);
  });

  it("removes one meal", () => {
    expect(removeSavedMeal(list, "a").map((m) => m.id)).toEqual(["b"]);
  });
});

describe("parseSavedMeals", () => {
  it("reads a saved list", () => {
    expect(parseSavedMeals(JSON.stringify([meal("a")]))).toEqual([meal("a")]);
  });

  it("gives an empty list for missing or bad data", () => {
    expect(parseSavedMeals(null)).toEqual([]);
    expect(parseSavedMeals("{")).toEqual([]);
    expect(parseSavedMeals('{"a":1}')).toEqual([]);
  });

  it("drops a meal without items or with a bad item", () => {
    const raw = JSON.stringify([
      meal("a"),
      { id: "b", name: "B", items: [], createdAt: "x" },
      { id: "c", name: "C", items: [{ foodId: "f", servingLabel: "1", grams: -3 }], createdAt: "x" },
      { name: "no id", items },
    ]);
    expect(parseSavedMeals(raw).map((m) => m.id)).toEqual(["a"]);
  });
});

describe("savedMealEntries with a food of unknown energy", () => {
  it("leaves it out instead of logging 0 kcal", () => {
    const unknown = { ...MOCK_FOODS[0], id: "recipe-unknown", nutrients: { ...MOCK_FOODS[0].nutrients, energy: null } };
    const foods = [...MOCK_FOODS, unknown];
    const withUnknown: SavedMeal = { ...meal("u"), items: [...items, { foodId: "recipe-unknown", servingLabel: "100 g", grams: 100 }] };
    const entries = savedMealEntries(withUnknown, foods, "dinner", "sm", "2026-10-13T12:00:00.000Z");
    expect(entries.map((e) => e.foodId)).toEqual(["food-yen-mach", "food-chuoi"]);
  });
});

describe("savedMealSkipped", () => {
  it("counts the foods in the catalogue whose energy is unknown, so the tap can say so", () => {
    const unknown = { ...MOCK_FOODS[0], id: "recipe-unknown", nutrients: { ...MOCK_FOODS[0].nutrients, energy: null } };
    const foods = [...MOCK_FOODS, unknown];
    const m: SavedMeal = { ...meal("u"), items: [...items, { foodId: "recipe-unknown", servingLabel: "100 g", grams: 100 }, { foodId: "gone", servingLabel: "x", grams: 1 }] };
    expect(savedMealSkipped(m, foods)).toBe(1);
    expect(savedMealSkipped(meal("a"), foods)).toBe(0);
    // A meal of only such foods still shows as a row (itemCount 1), with 0 kcal
    const only: SavedMeal = { ...meal("o"), items: [{ foodId: "recipe-unknown", servingLabel: "100 g", grams: 100 }] };
    expect(savedMealTotals(only, foods)).toEqual({ itemCount: 1, kcal: 0 });
  });
});

describe("savedMealEntries", () => {
  it("makes one entry per food, in the chosen meal, with the saved portion", () => {
    const entries = savedMealEntries(meal("a"), MOCK_FOODS, "dinner", "sm-add-1", "2026-10-13T12:00:00.000Z");
    expect(entries.map((e) => [e.foodId, e.mealSlot, e.grams, e.displayQty])).toEqual([
      ["food-yen-mach", "dinner", 60, "60 g"],
      ["food-chuoi", "dinner", 100, "1 quả"],
    ]);
    expect(new Set(entries.map((e) => e.id)).size).toBe(2);
    expect(entries[0].calories).toBeGreaterThan(0);
  });

  it("skips a food that is no longer in the catalogue", () => {
    const gone = { ...meal("a"), items: [...items, { foodId: "food-gone", servingLabel: "1", grams: 10 }] };
    expect(savedMealEntries(gone, MOCK_FOODS, "lunch", "p", "t")).toHaveLength(2);
  });
});

describe("savedMealTotals", () => {
  it("counts the foods that exist and sums their kcal", () => {
    const totals = savedMealTotals(meal("a"), MOCK_FOODS);
    const entries = savedMealEntries(meal("a"), MOCK_FOODS, "lunch", "p", "t");
    expect(totals.itemCount).toBe(2);
    expect(totals.kcal).toBe(entries.reduce((s, e) => s + e.calories, 0));
  });
});

describe("itemsFromEntries", () => {
  const entry = (patch: Partial<AddedDiaryEntry>): AddedDiaryEntry => ({
    id: "e",
    foodId: "food-chuoi",
    foodName: "Chuối",
    grams: 100,
    displayQty: "1 quả",
    mealSlot: "breakfast",
    calories: 89,
    protein: 1,
    carbs: 23,
    fat: 0,
    fiber: 2,
    nutrients: {},
    addedAt: "t",
    ...patch,
  });

  it("keeps the food, the portion label and the grams", () => {
    expect(itemsFromEntries([entry({})])).toEqual([{ foodId: "food-chuoi", servingLabel: "1 quả", grams: 100 }]);
  });

  it("leaves out quick kcal entries, which have no food", () => {
    expect(itemsFromEntries([entry({ kind: "quick", foodId: "quick" }), entry({ id: "f" })])).toHaveLength(1);
  });
});
