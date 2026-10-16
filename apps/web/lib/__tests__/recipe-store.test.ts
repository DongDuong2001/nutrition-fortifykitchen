import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MOCK_FOODS } from "../mock/foods";
import { flattenRecipe, isRecipeId, type Recipe } from "../recipe";
import { getRecipe, readRecipes, saveRecipe, syncRecipeFoods } from "../recipe-store";

function memory(failWrites = false) {
  const data: Record<string, string> = { h1t_demo_v1: "1" };
  return {
    data,
    getItem: (k: string) => (k in data ? data[k] : null),
    setItem: (k: string, v: string) => {
      if (failWrites) throw new Error("full");
      data[k] = v;
    },
    removeItem: (k: string) => void delete data[k],
  };
}

const kcalOf = (id: string) => MOCK_FOODS.find((f) => f.id === id)?.nutrients.energy as number;
const EGG = "food-trung-ga";
const OATS = "food-yen-mach";

const recipe = (id: string, over: Partial<Recipe> = {}): Recipe => ({
  id,
  name: id,
  servings: 1,
  cookedGrams: null,
  createdAt: "2026-10-16T00:00:00.000Z",
  ingredients: [],
  ...over,
});

describe("recipe store", () => {
  let local: ReturnType<typeof memory>;

  beforeEach(() => {
    local = memory();
    vi.stubGlobal("window", { localStorage: local, location: { search: "" } });
    syncRecipeFoods([]);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    syncRecipeFoods([]);
  });

  it("keeps the kcal of a recipe inside another one after a reload", () => {
    const a = recipe("recipe-a", {
      ingredients: [
        { foodId: EGG, name: "Trứng", grams: 100, unit: "g" },
        { foodId: OATS, name: "Yến mạch", grams: 50, unit: "g" },
      ],
    });
    expect(saveRecipe(a)).toBe(true);
    // 150 g of A (whose raw total is 150 g) plus 50 g of oats
    const b = recipe("recipe-b", {
      ingredients: [
        { foodId: "recipe-a", name: "A", grams: 150, unit: "g" },
        { foodId: OATS, name: "Yến mạch", grams: 50, unit: "g" },
      ],
    });
    expect(saveRecipe(b)).toBe(true);

    // Reload: the catalogue is rebuilt from storage alone
    syncRecipeFoods([]);
    syncRecipeFoods();
    const food = MOCK_FOODS.find((f) => f.id === "recipe-b");
    const expectedKcal = ((kcalOf(EGG) * 100 + kcalOf(OATS) * 50) / 100) + (kcalOf(OATS) * 50) / 100;
    const perServing = (food?.nutrients.energy as number) * (200 / 100);
    expect(perServing).toBeCloseTo(expectedKcal, 1);
    expect(food?.nutrients.energy).not.toBeNull();
  });

  it("stores no recipe among the ingredients of a saved recipe", () => {
    saveRecipe(recipe("recipe-a", { ingredients: [{ foodId: EGG, name: "Trứng", grams: 100, unit: "g" }] }));
    saveRecipe(recipe("recipe-b", { ingredients: [{ foodId: "recipe-a", name: "A", grams: 50, unit: "g" }] }));
    const stored = getRecipe("recipe-b");
    expect(stored?.ingredients.every((i) => !isRecipeId(i.foodId))).toBe(true);
    expect(readRecipes().map((r) => r.id).sort()).toEqual(["recipe-a", "recipe-b"]);
  });

  it("flattens a recipe saved in the old nested shape when the catalogue is built", () => {
    const a = recipe("recipe-a", { ingredients: [{ foodId: EGG, name: "Trứng", grams: 100, unit: "g" }] });
    const b = recipe("recipe-b", { ingredients: [{ foodId: "recipe-a", name: "A", grams: 100, unit: "g" }] });
    local.setItem("h1t_recipes_v1_demo", JSON.stringify([b, a]));
    syncRecipeFoods();
    expect(MOCK_FOODS.find((f) => f.id === "recipe-b")?.nutrients.energy).toBeCloseTo(kcalOf(EGG), 1);
  });

  it("reports false when the recipe could not be stored", () => {
    vi.stubGlobal("window", { localStorage: memory(true), location: { search: "" } });
    expect(saveRecipe(recipe("recipe-x", { ingredients: [{ foodId: EGG, name: "Trứng", grams: 10, unit: "g" }] }))).toBe(false);
    expect(MOCK_FOODS.some((f) => f.id === "recipe-x")).toBe(false);
  });
});

describe("flattenRecipe", () => {
  it("scales the inner ingredients by the share of the inner weight (cooked weight when given)", () => {
    const a = recipe("recipe-a", { cookedGrams: 200, ingredients: [{ foodId: EGG, name: "Trứng", grams: 400, unit: "g" }] });
    const b = recipe("recipe-b", { ingredients: [{ foodId: "recipe-a", name: "A", grams: 100, unit: "g" }] });
    const flat = flattenRecipe(b, [a, b]);
    expect(flat.ingredients).toEqual([{ foodId: EGG, name: "Trứng", grams: 200, unit: "g" }]);
    // The weight the user typed stays the weight of the pot
    expect(flat.cookedGrams).toBe(100);
  });

  it("flattens several levels and leaves a loop or a missing recipe alone", () => {
    const a = recipe("recipe-a", { ingredients: [{ foodId: EGG, name: "Trứng", grams: 100, unit: "g" }] });
    const b = recipe("recipe-b", { ingredients: [{ foodId: "recipe-a", name: "A", grams: 100, unit: "g" }] });
    const c = recipe("recipe-c", { ingredients: [{ foodId: "recipe-b", name: "B", grams: 50, unit: "g" }] });
    expect(flattenRecipe(c, [a, b, c]).ingredients).toEqual([{ foodId: EGG, name: "Trứng", grams: 50, unit: "g" }]);

    const loopA = recipe("recipe-a", { ingredients: [{ foodId: "recipe-b", name: "B", grams: 100, unit: "g" }] });
    const loopB = recipe("recipe-b", { ingredients: [{ foodId: "recipe-a", name: "A", grams: 100, unit: "g" }] });
    expect(() => flattenRecipe(loopA, [loopA, loopB])).not.toThrow();
    const gone = recipe("recipe-z", { ingredients: [{ foodId: "recipe-missing", name: "?", grams: 10, unit: "g" }] });
    expect(flattenRecipe(gone, [gone])).toBe(gone);
  });
});
