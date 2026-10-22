import { describe, expect, it } from "vitest";
import { MOCK_FOODS } from "../mock/foods";
import { draftToRecipe, parseAmount, perServingNutrients, recipeDraftFromFood } from "../recipe";

const lookup = (id: string) => MOCK_FOODS.find((f) => f.id === id) ?? null;
const dishes = MOCK_FOODS.filter((f) => f.recipe);

describe("mock recipe dishes (Tùy chỉnh món này)", () => {
  it("has at least cơm đậu đỏ, cơm ngũ đậu and cháo đậu xanh", () => {
    expect(dishes.map((d) => d.nameVi)).toEqual(expect.arrayContaining(["Cơm đậu đỏ", "Cơm ngũ đậu (thập cẩm)", "Cháo đậu xanh"]));
  });

  it.each(dishes.map((d) => [d.nameVi, d] as const))("%s: every ingredient is in the catalogue", (_name, dish) => {
    for (const i of dish.recipe!.ingredients) expect(lookup(i.foodId), i.foodId).not.toBeNull();
  });

  it.each(dishes.map((d) => [d.nameVi, d] as const))("%s: the pre-filled recipe adds up to the dish's own kcal within 3%", (_name, dish) => {
    const draft = recipeDraftFromFood(dish)!;
    const recipe = draftToRecipe(draft, "recipe-test", "2026-10-17T00:00:00.000Z");
    const perServing = perServingNutrients(recipe, lookup).energy;
    const expected = ((dish.nutrients.energy as number) / 100) * (dish.recipe!.cookedGrams as number);
    expect(perServing).not.toBeNull();
    expect(Math.abs((perServing as number) - expected) / expected).toBeLessThan(0.03);
    expect(parseAmount(draft.cooked)).toBe(dish.recipe!.cookedGrams);
  });
});
