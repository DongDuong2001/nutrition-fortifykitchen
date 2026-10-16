import { beforeEach, describe, expect, it } from "vitest";
import { MOCK_FOODS, dropMockCatalog, setCatalogFoods, type FoodItem } from "../mock/foods";

const food = (id: string, extra: Partial<FoodItem> = {}): FoodItem => ({
  id,
  nameVi: id,
  category: "trai_cay" as FoodItem["category"],
  source: "USDA",
  servings: [{ label: "100 g", grams: 100 }],
  nutrients: { energy: 50 },
  ...extra,
});

describe("live catalogue", () => {
  beforeEach(() => {
    MOCK_FOODS.length = 0;
  });

  it("setCatalogFoods merges: foods already there stay, same id is replaced", () => {
    MOCK_FOODS.push(food("a"), food("b"));
    setCatalogFoods([food("b", { nameVi: "b2" }), food("c")]);
    expect(MOCK_FOODS.map((f) => f.id).sort()).toEqual(["a", "b", "c"]);
    expect(MOCK_FOODS.find((f) => f.id === "b")?.nameVi).toBe("b2");
  });

  it("creating one food does not wipe the catalogue", () => {
    MOCK_FOODS.push(food("a"), food("b"));
    setCatalogFoods([food("mine", { source: "user", category: "cua_toi" })]);
    expect(MOCK_FOODS).toHaveLength(3);
  });

  it("an empty answer changes nothing", () => {
    MOCK_FOODS.push(food("a"));
    setCatalogFoods([]);
    expect(MOCK_FOODS).toHaveLength(1);
  });

  it("dropMockCatalog keeps only the user's own foods", () => {
    MOCK_FOODS.push(food("a"), food("mine", { source: "user", category: "cua_toi" }));
    dropMockCatalog();
    expect(MOCK_FOODS.map((f) => f.id)).toEqual(["mine"]);
  });
});
