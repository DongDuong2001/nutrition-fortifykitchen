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
    expect(sources).toMatchObject([{ id: "e-1", name: "Hạt điều", qty: "100 g", amount: 20 }]);
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

// The 18/10 integration of hotfix/gia-vi and cc-51: the sources sheet and the last portion follow the supplement rules
import { portionLabel } from "../home";
import { unitCountOf } from "../portion";
import { lastPortionOf } from "../recent-foods";
import { recentForMeal } from "../meal-shortlists";

describe("a label supplement in cc-51's views", () => {
  const capsule = {
    id: "supp-mag",
    nameVi: "Magnesium bisglycinate",
    category: "bo_sung",
    source: "label",
    servings: [{ label: "1 viên", grams: 1 }],
    nutrients: { energy: 0, magnesium: 20000 },
  } as unknown as FoodItem;
  const entry = (over: Partial<AddedDiaryEntry> = {}): AddedDiaryEntry => ({
    id: "e-supp", foodId: "supp-mag", foodName: "Magnesium bisglycinate", grams: 2, displayQty: "2 viên", mealSlot: "breakfast",
    calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, nutrients: { magnesium: 400 }, addedAt: "2026-10-18T01:00:00Z", ...over,
  });

  it("the nutrient sources sheet shows 2 viên, never a gram figure", () => {
    MOCK_FOODS.push(capsule);
    try {
      const [source] = nutrientSourcesIn([entry()], {}, "magnesium", []);
      expect(portionLabel({ qty: source.qty, grams: source.grams, foodId: source.foodId })).toBe("2 viên");
    } finally {
      MOCK_FOODS.splice(MOCK_FOODS.indexOf(capsule), 1);
    }
  });

  it("the last portion opens as 1 viên × 2 (the stepper), from Gần đây and from the recents", () => {
    MOCK_FOODS.push(capsule);
    try {
      const [shortlisted] = recentForMeal([entry()], "breakfast");
      expect(shortlisted).toEqual({ foodId: "supp-mag", servingLabel: "2 viên", grams: 2 });
      const last = lastPortionOf("supp-mag", [{ foodId: "supp-mag", servingLabel: "2 viên" }], MOCK_FOODS);
      const read = unitCountOf(capsule.servings, last?.label ?? "", last?.grams ?? 0);
      expect(read).toEqual({ serving: { label: "1 viên", grams: 1 }, count: 2 });
    } finally {
      MOCK_FOODS.splice(MOCK_FOODS.indexOf(capsule), 1);
    }
  });
});
