import { describe, expect, it } from "vitest";
import { nutrientSourcesIn } from "../nutrient-sources";
import { MOCK_FOODS, type FoodItem } from "../mock/foods";
import type { AddedDiaryEntry, SampleItemInfo } from "../diary-edits";

const oats = MOCK_FOODS.find((f) => f.nameVi === "Yến mạch") as FoodItem;

// Oats: 138 mg magnesium per 100 g
const oatsItem: SampleItemInfo = {
  item: { id: "item-1", name: "Yến mạch", qty: "60 g", kcal: 228 },
  mealSlot: "breakfast",
  food: oats,
  grams: 60,
};

function added(id: string, foodName: string, magnesium: number | null): AddedDiaryEntry {
  return {
    id,
    foodId: "food-x",
    foodName,
    grams: 100,
    displayQty: "100 g",
    mealSlot: "lunch",
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
    nutrients: { magnesium },
    addedAt: "2026-10-10T05:00:00.000Z",
  };
}

describe("nutrientSourcesIn", () => {
  it("lists a sample item with its share of the nutrient, scaled by grams", () => {
    const sources = nutrientSourcesIn([], {}, "magnesium", [oatsItem]);
    expect(sources).toHaveLength(1);
    expect(sources[0].id).toBe("item-1");
    expect(sources[0].name).toBe("Yến mạch");
    expect(sources[0].qty).toBe("60 g");
    expect(sources[0].amount).toBeCloseTo(82.8, 5);
  });

  it("uses the edited grams of a sample item", () => {
    const sources = nutrientSourcesIn([], { "item-1": { grams: 100 } }, "magnesium", [oatsItem]);
    expect(sources[0].qty).toBe("100 g");
    expect(sources[0].amount).toBeCloseTo(138, 5);
  });

  it("leaves out a deleted sample item", () => {
    expect(nutrientSourcesIn([], { "item-1": { deleted: true } }, "magnesium", [oatsItem])).toEqual([]);
  });

  it("includes added entries with their own amount and quantity", () => {
    const sources = nutrientSourcesIn([added("e-1", "Hạt điều", 20)], {}, "magnesium", []);
    expect(sources).toEqual([{ id: "e-1", name: "Hạt điều", qty: "100 g", amount: 20 }]);
  });

  it("drops zero and unknown amounts, so a dash is never a 0 source", () => {
    const sources = nutrientSourcesIn(
      [added("e-zero", "Nước lọc", 0), added("e-null", "Cà phê", null)],
      {},
      "magnesium",
      []
    );
    expect(sources).toEqual([]);
  });

  it("sorts the largest contributor first", () => {
    const sources = nutrientSourcesIn([added("e-small", "Chuối", 27), added("e-big", "Hạt bí", 150)], {}, "magnesium", [
      oatsItem,
    ]);
    expect(sources.map((s) => s.id)).toEqual(["e-big", "item-1", "e-small"]);
  });
});
