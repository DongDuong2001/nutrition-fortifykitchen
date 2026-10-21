import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { FULL_DISHES, SLIM_DISHES, slimText } from "../../scripts/slim-dishes.mjs";
import { canEditParts, dishViewOf, editParts, editTotals, foodsByKey, isDishFood, isEdited, keysOfFood, partGrams, scaledAddOn, scaledPart, servingsOf, type DishRecipes } from "../dish-recipes";
import { calculateMacroPreview } from "../portion";
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

describe("the alternatives of an ingredient (Hao 21/10: a person can swap it)", () => {
  it("the slim file keeps them as a 7th element, only on an ingredient that has alternatives", () => {
    const [serving, rows] = recipes["fortify_kitchen|fortify_kitchen:banh-khoai-nuong"];
    expect(serving).toBe(1027.9);
    const withAlts = rows.filter((r) => r.length === 7);
    expect(withAlts.map((r) => r[3])).toEqual(["Sữa chua thường (nguyên kem, không đường)", "Bột hạnh nhân", "Hạnh nhân", "Siro cây phong"]);
    expect(rows.find((r) => r[3].startsWith("Sữa chua"))?.[6]).toEqual([["usda_sr_legacy|FDC 171304", "Sữa chua Hy Lạp không đường"]]);
    // no other recipe changed shape: six elements everywhere else
    const others = Object.entries(recipes).filter(([k]) => !k.startsWith("fortify_kitchen|"));
    expect(others.every(([, [, r]]) => r.every((row) => row.length === 6))).toBe(true);
  });

  it("the cake's parts add up to its serving grams, so a portion scales them exactly", () => {
    const [serving, rows] = recipes["fortify_kitchen|fortify_kitchen:banh-khoai-nuong"];
    expect(Math.round(rows.reduce((sum, r) => sum + r[1], 0) * 10) / 10).toBe(serving);
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

describe("changing the parts for one meal (cc-67)", () => {
  const view = dishViewOf(phoBo, recipes, foodsByKey(withDemo));
  if (!view) throw new Error("no Phở bò view");
  const BANH = view.parts[0].key;
  const THIT_BO = "+ Thịt bò";
  const kcalOfTotals = (t: { grams: number; per100: Record<string, number | null> }) => calculateMacroPreview(t.per100, t.grams).calories;
  const recipeKcal = view.parts.reduce((sum, p) => sum + (scaledPart(p, 1).kcal ?? 0), 0);

  it("starts as the recipe: nothing is changed, the grams are the recipe's for one serving", () => {
    const parts = editParts(view, {}, []);
    expect(parts.map((p) => p.perServing)).toEqual(view.parts.map((p) => p.grams));
    expect(isEdited(parts)).toBe(false);
    expect(canEditParts(parts)).toBe(true);
    expect(editTotals(parts, 1).grams).toBe(view.servingGrams);
  });

  it("scaling: a part's grams follow the portion, typed ones too (the portion ×2 doubles a part set to 150 g)", () => {
    const typed = { [BANH]: 150 };
    const parts = editParts(view, typed, []);
    expect(partGrams(parts[0], 1)).toBe(150);
    expect(partGrams(parts[0], 2)).toBe(300);
    expect(partGrams(parts[0], 0.5)).toBe(75);
    expect(editTotals(parts, 2).grams).toBe((view.servingGrams - 50) * 2);
  });

  it("the dish adds up from its parts: Bánh phở 200 → 150 g takes 54 kcal (108 per 100 g) and 50 g off the total", () => {
    const before = editTotals(editParts(view, {}, []), 1);
    const after = editTotals(editParts(view, { [BANH]: 150 }, []), 1);
    expect(before.grams).toBe(600);
    expect(after.grams).toBe(550);
    expect(kcalOfTotals(before)).toBe(Math.round(recipeKcal));
    expect(kcalOfTotals(after)).toBe(Math.round(recipeKcal - 54));
    expect(isEdited(editParts(view, { [BANH]: 150 }, []))).toBe(true);
    // Typing the grams that were there is no change
    expect(isEdited(editParts(view, { [BANH]: 200 }, []))).toBe(false);
  });

  it("an add-on is a part of this list: its food, its grams for one serving, after the recipe's parts", () => {
    const parts = editParts(view, {}, [THIT_BO]);
    expect(parts).toHaveLength(view.parts.length + 1);
    const added = parts[parts.length - 1];
    expect(added).toMatchObject({ name: view.addOns[1].food.nameVi, perServing: 50, base: 0, added: true });
    expect(isEdited(parts)).toBe(true);
    expect(editTotals(parts, 1).grams).toBe(650);
    expect(editTotals(parts, 2).grams).toBe(1300);
    // The chip off takes it out again
    expect(isEdited(editParts(view, {}, []))).toBe(false);
  });

  it("a part set to 0 is out of the totals but stays a row (to put it back)", () => {
    const parts = editParts(view, { [BANH]: 0 }, []);
    expect(parts).toHaveLength(view.parts.length);
    expect(partGrams(parts[0], 1)).toBe(0);
    expect(editTotals(parts, 1).grams).toBe(400);
    expect(editTotals(parts, 1).ingredients.some((i) => i.foodId === view.parts[0].food?.id)).toBe(false);
    expect(isEdited(parts)).toBe(true);
  });

  it("Khôi phục is the recipe again: no typed grams, no add-ons", () => {
    expect(isEdited(editParts(view, {}, []))).toBe(false);
    expect(editTotals(editParts(view, {}, []), 1)).toEqual(editTotals(editParts(view, {}, []), 1));
  });

  it("a dish with a part the catalogue lacks is shown, not changed (its numbers cannot be added up)", () => {
    const bare = dishViewOf(phoBo, recipes, foodsByKey(MOCK_FOODS));
    expect(bare && canEditParts(editParts(bare, {}, []))).toBe(false);
  });

  it("the numbers per 100 g keep a nutrient unknown when any part lacks it", () => {
    const parts = editParts(view, {}, []).map((p, i) => (i === 0 && p.food ? { ...p, food: { ...p.food, nutrients: { ...p.food.nutrients, potassium: null } } } : p));
    expect(editTotals(parts, 1).per100.potassium).toBeNull();
    expect(typeof editTotals(parts, 1).per100.energy).toBe("number");
  });
});
