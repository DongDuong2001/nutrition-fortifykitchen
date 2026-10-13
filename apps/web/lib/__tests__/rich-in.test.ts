import { describe, expect, it } from "vitest";
import { RICH_NUTRIENT_IDS, richInFoods, richName } from "../rich-in";
import { getNutrientDefinition } from "../nutrients";
import type { FoodItem } from "../mock/foods";

const food = (id: string, calcium: number | null, grams = 100): FoodItem => ({
  id,
  nameVi: id,
  category: "dam",
  source: "USDA",
  servings: [{ label: `${grams} g`, grams }],
  nutrients: { calcium },
});

describe("richInFoods", () => {
  const foods = [food("a", 100), food("b", 300), food("c", null), food("d", 0), food("e", 200, 50)];

  it("ranks by amount per 100 g, highest first, and leaves out unknown and zero", () => {
    const rows = richInFoods(foods, "calcium", "per100", 1000);
    expect(rows.map((r) => r.food.id)).toEqual(["b", "e", "a"]);
    expect(rows[0]).toMatchObject({ amount: 300, pct: 30, basis: "100 g" });
  });

  it("per portion scales to the first serving", () => {
    const rows = richInFoods(foods, "calcium", "portion", 1000);
    expect(rows.map((r) => r.food.id)).toEqual(["b", "a", "e"]);
    expect(rows.find((r) => r.food.id === "e")).toMatchObject({ amount: 100, pct: 10, basis: "50 g" });
  });

  it("pct is null when the target is unknown", () => {
    expect(richInFoods(foods, "calcium", "per100", null)[0].pct).toBeNull();
  });

  it("lists the eight nutrients of the brief", () => {
    expect(RICH_NUTRIENT_IDS).toEqual(["calcium", "iron", "potassium", "magnesium", "protein", "fiber", "vitamin_d", "vitamin_c"]);
  });
});

describe("richName", () => {
  it("keeps the vitamin letter capital and lowercases the rest", () => {
    const title = (id: string) => `Giàu ${richName(getNutrientDefinition(id)!.nameVi)}`;
    expect(title("vitamin_d")).toBe("Giàu vitamin D");
    expect(title("vitamin_c")).toBe("Giàu vitamin C");
    expect(title("calcium")).toBe("Giàu canxi");
    expect(title("iron")).toBe("Giàu sắt");
  });
});
