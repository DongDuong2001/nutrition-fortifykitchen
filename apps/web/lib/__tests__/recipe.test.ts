import { describe, expect, it } from "vitest";
import {
  MAX_SERVINGS,
  baseGrams,
  clampServings,
  countedKnown,
  draftToRecipe,
  cookedWarning,
  hasErrors,
  ingredientPerServing,
  parseAmount,
  parseRecipes,
  per100Nutrients,
  perServingNutrients,
  rawTotalGrams,
  recipeToDraft,
  recipeToFood,
  servingGrams,
  totalNutrients,
  upsertRecipe,
  validateDraft,
  type IngredientLookup,
  type Recipe,
} from "../recipe";
import { COUNTED_NUTRIENT_KEYS } from "../day-totals";

const FOODS: Record<string, Record<string, number | null>> = {
  rice: { energy: 130, protein: 2.7, carbs: 28, fat: 0.3, fiber: 0.4, iron: 1, calcium: 10, b12: 0 },
  egg: { energy: 150, protein: 12, carbs: 1, fat: 10, fiber: 0, iron: 2, calcium: null, b12: 1 },
  oil: { energy: 880, protein: 0, carbs: 0, fat: 100, fiber: 0, iron: 0 },
};
const lookup: IngredientLookup = (id) => (FOODS[id] ? { nutrients: FOODS[id] } : null);

function recipe(over: Partial<Recipe> = {}): Recipe {
  return {
    id: "recipe-1",
    name: "Cơm chiên trứng",
    servings: 2,
    ingredients: [
      { foodId: "rice", name: "Cơm", grams: 200, unit: "g" },
      { foodId: "egg", name: "Trứng", grams: 100, unit: "g" },
    ],
    cookedGrams: null,
    createdAt: "2026-10-16T00:00:00.000Z",
    ...over,
  };
}

describe("totals", () => {
  it("sums each ingredient's per-100 g value scaled by its grams", () => {
    const t = totalNutrients(recipe().ingredients, lookup);
    expect(t.energy).toBe(410); // 130*2 + 150*1
    expect(t.protein).toBe(17.4);
    expect(t.iron).toBe(4);
  });

  it("a nutrient is unknown when any ingredient in the recipe lacks it", () => {
    const t = totalNutrients(recipe().ingredients, lookup);
    expect(t.calcium).toBeNull(); // egg: null
    expect(t.manganese).toBeNull(); // nobody has it
  });

  it("keeps a known 0 as 0", () => {
    const t = totalNutrients([{ foodId: "rice", grams: 100 }], lookup);
    expect(t.b12).toBe(0);
  });

  it("an ingredient with 0 grams does not make a nutrient unknown", () => {
    const t = totalNutrients(
      [
        { foodId: "rice", grams: 100 },
        { foodId: "egg", grams: 0 },
      ],
      lookup
    );
    expect(t.calcium).toBe(10);
  });

  it("an ingredient the catalogue does not know makes everything unknown", () => {
    const t = totalNutrients([{ foodId: "rice", grams: 100 }, { foodId: "gone", grams: 5 }], lookup);
    expect(t.energy).toBeNull();
    expect(t.iron).toBeNull();
  });

  it("no ingredient with grams: everything unknown, never 0", () => {
    const t = totalNutrients([], lookup);
    expect(Object.values(t).every((v) => v === null)).toBe(true);
    expect(totalNutrients([{ foodId: "rice", grams: 0 }], lookup).energy).toBeNull();
  });
});

describe("serving and per 100 g", () => {
  it("serving weight is the raw total over the servings when there is no cooked weight", () => {
    expect(rawTotalGrams(recipe().ingredients)).toBe(300);
    expect(servingGrams(recipe())).toBe(150);
    expect(servingGrams(recipe({ servings: 3 }))).toBe(100);
  });

  it("serving weight uses the cooked weight when given", () => {
    expect(baseGrams(recipe({ cookedGrams: 240 }))).toBe(240);
    expect(servingGrams(recipe({ cookedGrams: 240 }))).toBe(120);
  });

  it("a zero cooked weight is the same as none", () => {
    expect(baseGrams(recipe({ cookedGrams: 0 }))).toBe(300);
  });

  it("per serving divides the total by the servings", () => {
    const n = perServingNutrients(recipe(), lookup);
    expect(n.energy).toBe(205);
    expect(n.calcium).toBeNull();
  });

  it("per 100 g is read from the raw total, or from the cooked weight when given", () => {
    expect(per100Nutrients(recipe(), lookup).energy).toBeCloseTo((410 / 300) * 100, 1);
    expect(per100Nutrients(recipe({ cookedGrams: 240 }), lookup).energy).toBeCloseTo((410 / 240) * 100, 1);
  });

  it("the weight of one serving times its per-100 g value is the per-serving value", () => {
    const r = recipe({ cookedGrams: 240 });
    const perServing = perServingNutrients(r, lookup).energy as number;
    const per100 = per100Nutrients(r, lookup).energy as number;
    expect((per100 * servingGrams(r)) / 100).toBeCloseTo(perServing, 1);
  });

  it("clamps the servings to 1–20", () => {
    expect(clampServings(0)).toBe(1);
    expect(clampServings(21)).toBe(MAX_SERVINGS);
    expect(clampServings(2.6)).toBe(3);
    expect(clampServings(Number.NaN)).toBe(1);
  });

  it("counts the micros with a value", () => {
    expect(countedKnown(per100Nutrients(recipe(), lookup))).toBe(2); // iron and b12 (calcium is unknown for the egg)
  });
});

describe("recipe as a food", () => {
  it("is a Của tôi food with the 1 phần, ½ phần and 100 g servings", () => {
    const food = recipeToFood(recipe({ cookedGrams: 240 }), lookup);
    expect(food.id).toBe("recipe-1");
    expect(food.source).toBe("user");
    expect(food.category).toBe("cua_toi");
    expect(food.servings.map((s) => s.display ?? s.label)).toEqual(["1 phần · 120 g", "½ phần", "100 g"]);
    expect(food.servings.map((s) => s.grams)).toEqual([120, 60, 100]);
    expect(food.nutrients.energy).toBeCloseTo((410 / 240) * 100, 1);
  });

  it("keeps unknown micros null in the food", () => {
    const food = recipeToFood(recipe(), lookup);
    for (const key of COUNTED_NUTRIENT_KEYS) {
      if (key !== "iron" && key !== "b12") expect(food.nutrients[key]).toBeNull();
    }
  });
});

describe("draft", () => {
  const draft = () => ({
    name: " Cơm chiên ",
    servings: 2,
    ingredients: [{ foodId: "rice", name: "Cơm", amount: "200", unit: "g" as const }],
    cooked: "",
  });

  it("parses Vietnamese and plain decimals", () => {
    expect(parseAmount("1,5")).toBe(1.5);
    expect(parseAmount("200")).toBe(200);
    expect(parseAmount(" 0.5 ")).toBe(0.5);
    expect(parseAmount("")).toBeNull();
    expect(parseAmount("abc")).toBeNull();
    expect(parseAmount("-3")).toBeNull();
  });

  it("reads a dot between groups of three as the thousands mark", () => {
    expect(parseAmount("1.200")).toBe(1200);
    expect(parseAmount("1.200,5")).toBe(1200.5);
    expect(parseAmount("12.500")).toBe(12500);
    expect(parseAmount("1.200.000")).toBe(1200000);
    // Not a thousands group: a decimal point
    expect(parseAmount("1.5")).toBe(1.5);
    expect(parseAmount("0.500")).toBe(0.5);
    expect(parseAmount("12.50")).toBe(12.5);
    expect(parseAmount("1,200")).toBe(1.2);
    expect(parseAmount("1.2.3")).toBeNull();
  });

  it("warns when the cooked weight is under 20 % or over 300 % of the raw total, but still allows it", () => {
    const d = (cooked: string) => ({ ...draft(), cooked });
    const raw = rawTotalGrams(draft().ingredients.map((i) => ({ grams: parseAmount(i.amount) ?? 0 })));
    expect(cookedWarning(d(String(raw)))).toBeNull();
    expect(cookedWarning(d(""))).toBeNull();
    expect(cookedWarning(d(String(Math.floor(raw * 0.19))))).not.toBeNull();
    expect(cookedWarning(d(String(raw * 0.2)))).toBeNull();
    expect(cookedWarning(d(String(raw * 3)))).toBeNull();
    expect(cookedWarning(d(String(raw * 3 + 1)))).not.toBeNull();
    expect(hasErrors(validateDraft(d(String(raw * 5))))).toBe(false);
  });

  it("is valid with a name, an ingredient with grams, and an empty cooked weight", () => {
    expect(hasErrors(validateDraft(draft()))).toBe(false);
  });

  it("puts each error under its field", () => {
    const e = validateDraft({ name: " ", servings: 1, ingredients: [], cooked: "0" });
    expect(e.name).toBe("Nhập tên món");
    expect(e.ingredients).toBe("Thêm ít nhất một nguyên liệu");
    expect(e.cooked).toBe("Khối lượng sau khi nấu phải lớn hơn 0");
    const f = validateDraft({ ...draft(), ingredients: [{ foodId: "a", name: "A", amount: "0", unit: "g" }, { foodId: "b", name: "B", amount: "10", unit: "g" }] });
    expect(f.amounts).toEqual({ 0: "Nhập khối lượng lớn hơn 0" });
  });

  it("becomes a trimmed recipe and back to the same draft", () => {
    const r = draftToRecipe({ ...draft(), cooked: "180,5" }, "recipe-9", "2026-10-16T00:00:00.000Z");
    expect(r).toMatchObject({ id: "recipe-9", name: "Cơm chiên", servings: 2, cookedGrams: 180.5 });
    expect(r.ingredients).toEqual([{ foodId: "rice", name: "Cơm", grams: 200, unit: "g" }]);
    expect(recipeToDraft(r)).toEqual({ ...draft(), name: "Cơm chiên", cooked: "180,5" });
  });

  it("an empty cooked weight is null", () => {
    expect(draftToRecipe(draft(), "recipe-1", "x").cookedGrams).toBeNull();
  });

  it("how much of an ingredient is in one serving", () => {
    expect(ingredientPerServing({ grams: 200 }, 2)).toBe(100);
    expect(ingredientPerServing({ grams: 100 }, 3)).toBe(33.3);
  });
});

describe("storage", () => {
  it("round trips and drops bad rows", () => {
    const good = recipe();
    const raw = JSON.stringify([good, { ...good, id: "x" }, { ...good, id: "recipe-2", ingredients: [] }, { ...good, id: "recipe-3", servings: 25 }, null]);
    expect(parseRecipes(raw)).toEqual([good]);
    expect(parseRecipes("not json")).toEqual([]);
    expect(parseRecipes(null)).toEqual([]);
  });

  it("upsert adds to the front and replaces by id", () => {
    const a = recipe();
    const b = recipe({ id: "recipe-2", name: "B" });
    expect(upsertRecipe([a], b).map((r) => r.id)).toEqual(["recipe-2", "recipe-1"]);
    expect(upsertRecipe([a, b], { ...a, name: "A2" }).map((r) => r.name)).toEqual(["A2", "B"]);
  });
});
