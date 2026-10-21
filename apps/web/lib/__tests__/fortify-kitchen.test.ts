import { describe, expect, it } from "vitest";
import type { FoodItem } from "../catalog";
import { SAMPLE_FOODS } from "../mock/sample-foods";
import { buildFoodList, categoryOf } from "../food-categories";
import { dishViewOf, keysOfFood } from "../dish-recipes";
import { foodRowKcal, foodSourceLabel } from "../food-meta";
import { MINH_HAO_LABEL, MINH_HAO_SLUG, fortifyKitchenFoods, isFortifyKitchenFood } from "../fortify-kitchen";

const food = (over: Partial<FoodItem> & { id: string }): FoodItem => ({
  nameVi: over.id,
  category: "dam",
  source: "USDA",
  servings: [{ label: "100 g", grams: 100 }],
  nutrients: { energy: 100 },
  ...over,
});
const kitchen = (id: string, over: Partial<FoodItem> = {}) => food({ id, source: "fortify_kitchen" as FoodItem["source"], category: "mon_viet", ...over });

describe("Đồ ăn của Minh Hào", () => {
  it("is the fortify_kitchen source, however the API spells it, or the brand Fortify Kitchen", () => {
    expect(isFortifyKitchenFood({ source: "fortify_kitchen" as FoodItem["source"] })).toBe(true);
    expect(isFortifyKitchenFood({ source: "Fortify Kitchen" as FoodItem["source"] })).toBe(true);
    expect(isFortifyKitchenFood({ source: "USDA", brand: "  fortify   kitchen " })).toBe(true);
    expect(isFortifyKitchenFood({ source: "USDA" })).toBe(false);
    expect(isFortifyKitchenFood({ source: "label", brand: "Dalahouse" })).toBe(false);
    expect(isFortifyKitchenFood({ source: "user" })).toBe(false);
  });

  it("names its tab and its list route", () => {
    expect(MINH_HAO_LABEL).toBe("Đồ ăn của Minh Hào");
    expect(MINH_HAO_SLUG).toBe("minh-hao");
  });

  it("filters the list to those rows and searches inside them", () => {
    const rows = [food({ id: "a", nameVi: "Ức gà" }), kitchen("k1", { nameVi: "Ức gà nấu chậm Minh Hào" }), kitchen("k2", { nameVi: "Bò hầm Minh Hào" }), food({ id: "b", nameVi: "Bò nạc" })];
    expect(fortifyKitchenFoods(rows).map((f) => f.id)).toEqual(["k1", "k2"]);
    const all = buildFoodList(rows, "", "minh_hao");
    expect(all.grouped).toBe(false);
    expect(all.foods.map((f) => f.id).sort()).toEqual(["k1", "k2"]);
    expect(buildFoodList(rows, "bò", "minh_hao").foods.map((f) => f.id)).toEqual(["k2"]);
    expect(buildFoodList(rows, "xyz", "minh_hao").foods).toEqual([]);
  });

  it("gives no list when the catalogue has none of those rows", () => {
    expect(fortifyKitchenFoods([food({ id: "a" })])).toEqual([]);
    expect(buildFoodList([food({ id: "a" })], "", "minh_hao").foods).toEqual([]);
  });

  it("the source reads Fortify Kitchen on its card", () => {
    expect(foodSourceLabel("fortify_kitchen")).toBe("Fortify Kitchen");
  });

  it("the demo catalogue holds a few demo-only rows, plain foods with a weighed first portion", () => {
    const demo = fortifyKitchenFoods(SAMPLE_FOODS);
    expect(demo.length).toBeGreaterThanOrEqual(2);
    expect(demo.length).toBeLessThanOrEqual(3);
    for (const row of demo) {
      expect(row.demoOnly, row.id).toBe(true);
      expect(row.nameVi, row.id).toContain("(mẫu demo)");
      expect(row.recipe, row.id).toBeUndefined();
      expect(categoryOf(row)).toBe("mon_viet");
      // The kcal on a card is the first portion's: kcal per 100 g × its grams
      expect(foodRowKcal(row), row.id).toBe(`${Math.round(((row.nutrients.energy ?? 0) * row.servings[0].grams) / 100)} kcal`);
      // Never a dish: no recipe of the research holds a Fortify Kitchen key, so no Thành phần and no parts
      expect(dishViewOf(row, { "usda_sr_legacy|FDC 1": [100, []] }, new Map()), row.id).toBeNull();
      expect(keysOfFood(row).every((k) => k.startsWith("fortify_kitchen|"))).toBe(true);
    }
  });

  it("no dish recipe of the research is for a Fortify Kitchen food", async () => {
    const { default: recipes } = await import("../data/dish-recipes.slim.json");
    const ingredientKeys = Object.values(recipes as unknown as Record<string, [number, [string][]]>).flatMap(([, rows]) => rows.map((r) => r[0]));
    expect(Object.keys(recipes).filter((k) => k.startsWith("fortify_kitchen|"))).toEqual([]);
    expect(ingredientKeys.filter((k) => k.startsWith("fortify_kitchen|"))).toEqual([]);
  });
});
