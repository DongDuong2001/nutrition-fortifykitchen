import { describe, expect, it } from "vitest";
import type { FoodItem } from "../catalog";
import { SAMPLE_FOODS } from "../mock/sample-foods";
import { buildFoodList, categoryOf } from "../food-categories";
import { dishViewOf, keysOfFood } from "../dish-recipes";
import { brandToShow, foodRowKcal, foodSourceLabel } from "../food-meta";
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

  it("a food page names the source once when it is the brand (Fortify Kitchen, not Fortify Kitchen · Fortify Kitchen)", () => {
    expect(brandToShow(kitchen("k", { brand: "Fortify Kitchen" }))).toBeNull();
    expect(brandToShow(kitchen("k", { brand: " fortify  kitchen " }))).toBeNull();
    expect(brandToShow(food({ id: "d", source: "label", brand: "Dalahouse" }))).toBe("Dalahouse");
    expect(brandToShow(food({ id: "u", source: "USDA", brand: "Fortify Kitchen" }))).toBe("Fortify Kitchen");
    expect(brandToShow(food({ id: "n" }))).toBeNull();
  });

  it("the source reads Fortify Kitchen on its card", () => {
    expect(foodSourceLabel("fortify_kitchen")).toBe("Fortify Kitchen");
  });

  it("the demo catalogue holds a few demo-only rows, plain foods with a weighed first portion, and the cake with its recipe", () => {
    const rows = fortifyKitchenFoods(SAMPLE_FOODS);
    const demo = rows.filter((f) => f.nameVi.includes("(mẫu demo)"));
    expect(demo.length).toBeGreaterThanOrEqual(2);
    expect(demo.length).toBeLessThanOrEqual(3);
    // Bánh khoai nướng Minh Hào is the one with parts: a dish with a public recipe, filed under Đồ ngọt & ăn vặt (not Món Việt)
    expect(rows.filter((f) => !demo.includes(f)).map((f) => [f.id, f.category])).toEqual([["food-banh-khoai-nuong", "an_vat"]]);
    for (const row of rows) {
      expect(row.demoOnly, row.id).toBe(true);
      expect(row.recipe, row.id).toBeUndefined();
      // The kcal on a card is the first portion's: kcal per 100 g × its grams
      expect(foodRowKcal(row), row.id).toBe(`${Math.round(((row.nutrients.energy ?? 0) * row.servings[0].grams) / 100)} kcal`);
      expect(keysOfFood(row).every((k) => k.startsWith("fortify_kitchen|"))).toBe(true);
    }
    for (const row of demo) {
      expect(categoryOf(row)).toBe("mon_viet");
      // Plain foods: no recipe of the research holds their key, so no Thành phần and no parts
      expect(dishViewOf(row, { "usda_sr_legacy|FDC 1": [100, []] }, new Map()), row.id).toBeNull();
    }
  });

  it("the only Fortify Kitchen food with a recipe of the research is the cake: the plain rows have none, and no ingredient is a Fortify Kitchen row", async () => {
    const { default: recipes } = await import("../data/dish-recipes.slim.json");
    const ingredientKeys = Object.values(recipes as unknown as Record<string, [number, [string][]]>).flatMap(([, rows]) => rows.map((r) => r[0]));
    expect(Object.keys(recipes).filter((k) => k.startsWith("fortify_kitchen|"))).toEqual(["fortify_kitchen|fortify_kitchen:banh-khoai-nuong"]);
    expect(ingredientKeys.filter((k) => k.startsWith("fortify_kitchen|"))).toEqual([]);
  });
});
