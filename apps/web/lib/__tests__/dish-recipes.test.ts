import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { FULL_DISHES, SLIM_DISHES, slimText } from "../../scripts/slim-dishes.mjs";
import { addOnEntries, dishViewOf, foodsByKey, isDishFood, keysOfFood, scaledAddOn, scaledPart, servingsOf, type DishRecipes } from "../dish-recipes";
import { DISH_DEMO_FOODS } from "../mock/dish-demo-foods";
import { MOCK_FOODS, type FoodItem } from "../mock/foods";

const read = (file: string) => readFileSync(file, "utf8");
const recipes = JSON.parse(read(SLIM_DISHES)) as DishRecipes;
const phoBo = MOCK_FOODS.find((f) => f.id === "food-pho-bo") as FoodItem;
const withDemo = [...MOCK_FOODS, ...DISH_DEMO_FOODS];

describe("the slim dish recipes the portion sheet reads (scripts/slim-dishes.mjs)", () => {
  it("are exactly the research file in tests/fixtures, slimmed: no drift", () => {
    expect(read(SLIM_DISHES)).toBe(slimText(JSON.parse(read(FULL_DISHES))));
  });

  it("keep every dish, keyed by source|source_id, with its serving grams and one row per ingredient", () => {
    const full = JSON.parse(read(FULL_DISHES));
    expect(Object.keys(recipes)).toHaveLength(full.length);
    const [serving, rows] = recipes["vn_table|food-pho-bo"];
    expect(serving).toBe(600);
    expect(rows).toHaveLength(8);
    expect(rows[0]).toEqual(["usda_sr_legacy|FDC 168914:banh-pho-chin", 200, "base", "Bánh phở (tươi)", "+ Bánh phở", 100]);
    expect(rows[3]).toEqual(["usda_sr_legacy|FDC 170005", 6, "veg", "Hành lá", null, null]);
  });
});

describe("a dish and its ingredients are found by (source, source_id)", () => {
  it("the demo catalogue's Phở bò answers to vn_table|food-pho-bo; a live food to its own source and source_id", () => {
    expect(keysOfFood(phoBo)).toContain("vn_table|food-pho-bo");
    expect(keysOfFood({ id: "uuid-1", source: "usda_sr_legacy" as FoodItem["source"], sourceId: "FDC 171811" })).toEqual(["usda_sr_legacy|FDC 171811"]);
    // a sample food with an SR Legacy reference answers to that key too
    expect(keysOfFood({ id: "x", source: "USDA", sourceRef: { db: "SR Legacy", id: "FDC 173944" } })).toContain("usda_sr_legacy|FDC 173944");
  });

  it("never by name: a food with the right name and another source_id is not the ingredient", () => {
    const lookalike: FoodItem = { ...DISH_DEMO_FOODS[0], id: "other", sourceId: "FDC 999" };
    const view = dishViewOf(phoBo, recipes, foodsByKey([...MOCK_FOODS, lookalike]));
    expect(view?.parts[0].food).toBeNull();
    expect(view?.parts[0].name).toBe("Bánh phở (tươi)");
  });

  it("resolves all eight ingredients of Phở bò with the demo foods, none without them (their rows keep a name, no kcal)", () => {
    const full = dishViewOf(phoBo, recipes, foodsByKey(withDemo));
    expect(full?.unresolved).toEqual([]);
    expect(full?.parts.map((p) => p.food?.nameVi)).toEqual(full?.parts.map((p) => p.name));
    const bare = dishViewOf(phoBo, recipes, foodsByKey(MOCK_FOODS));
    expect(bare?.unresolved).toHaveLength(8);
    expect(bare?.addOns).toEqual([]);
    expect(bare && scaledPart(bare.parts[0], 1).kcal).toBeNull();
  });

  it("a food with no recipe has no view, and only Món Việt foods open the recipes at all", () => {
    expect(dishViewOf(MOCK_FOODS.find((f) => f.id !== "food-pho-bo" && f.category !== "mon_viet") as FoodItem, recipes, foodsByKey(withDemo))).toBeNull();
    expect(isDishFood(phoBo)).toBe(true);
    expect(isDishFood({ category: "rau" })).toBe(false);
  });
});

describe("scaling to the chosen portion", () => {
  const view = dishViewOf(phoBo, recipes, foodsByKey(withDemo));
  if (!view) throw new Error("no Phở bò view");

  it("servingsOf: 600 g of a 600 g dish is 1, 300 g is 0.5, 1,200 g is 2, nothing is 0", () => {
    expect(servingsOf(600, view.servingGrams)).toBe(1);
    expect(servingsOf(300, view.servingGrams)).toBe(0.5);
    expect(servingsOf(1200, view.servingGrams)).toBe(2);
    expect(servingsOf(0, view.servingGrams)).toBe(0);
  });

  it("a part's grams and kcal scale with the portion (Bánh phở: 200 g, 108 kcal per 100 g)", () => {
    const banh = view.parts[0];
    expect(scaledPart(banh, 1)).toEqual({ grams: 200, kcal: 216 });
    expect(scaledPart(banh, 2)).toEqual({ grams: 400, kcal: 432 });
    expect(scaledPart(banh, 0.5)).toEqual({ grams: 100, kcal: 108 });
    // Hành lá 6 g x 1.5 = 9 g
    expect(scaledPart(view.parts[3], 1.5).grams).toBe(9);
  });

  it("the add-ons are the three the research names for Phở bò, in order", () => {
    expect(view.addOns.map((a) => [a.label, a.grams])).toEqual([
      ["+ Bánh phở", 100],
      ["+ Thịt bò", 50],
      ["+ Nạm", 30],
    ]);
    expect(scaledAddOn(view.addOns[0], 2)).toEqual({ grams: 200, kcal: 216 });
  });
});

describe("logging the add-ons with the dish", () => {
  const view = dishViewOf(phoBo, recipes, foodsByKey(withDemo));
  if (!view) throw new Error("no Phở bò view");

  it("each active add-on is its own entry: that ingredient food, its grams times the servings, in chip order", () => {
    const entries = addOnEntries(view.addOns, new Set(["+ Nạm", "+ Bánh phở"]), 1);
    expect(entries.map((e) => [e.food.nameVi, e.grams, e.label])).toEqual([
      ["Bánh phở (tươi)", 100, "100 g"],
      ["Nạm bò (chín)", 30, "30 g"],
    ]);
  });

  it("follows the portion: ×2 doubles the grams, half a bowl halves them", () => {
    expect(addOnEntries(view.addOns, new Set(["+ Thịt bò"]), 2)[0].grams).toBe(100);
    expect(addOnEntries(view.addOns, new Set(["+ Thịt bò"]), 0.5)[0].grams).toBe(25);
  });

  it("nothing when no chip is on, or the portion is not positive", () => {
    expect(addOnEntries(view.addOns, new Set(), 1)).toEqual([]);
    expect(addOnEntries(view.addOns, new Set(["+ Bánh phở"]), 0)).toEqual([]);
  });
});
