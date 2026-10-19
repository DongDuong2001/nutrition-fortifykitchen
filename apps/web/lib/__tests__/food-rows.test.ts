import { describe, expect, it } from "vitest";
import type { FoodItem } from "../mock/foods";
import { catalogVersion } from "../mock/foods";
import { collapseTwins, dedupeTwins, loadFoodRows, rowName, rowsReady, searchRows, twinIdsOf } from "../food-rows";
import { searchFoods } from "../search";

// cc-67: the one-row-per-food index loads after the first paint, so a screen has to work without it first

const food = (id: string, nameVi: string): FoodItem => ({ id, nameVi, category: "dam", source: "USDA", servings: [{ label: "100 g", grams: 100 }], nutrients: { energy: 100 } });
const foods = [food("a", "Thịt bò nạc (sống)"), food("b", "Thịt bò nạc (nấu chín)"), food("c", "Thịt bò kho")];

describe("before the index is loaded", () => {
  it("every row has its own name, id and place: a list is the plain list", () => {
    expect(rowsReady()).toBe(false);
    expect(rowName(foods[0])).toBe("Thịt bò nạc (sống)");
    expect(twinIdsOf(foods[1])).toEqual(["b"]);
    expect(dedupeTwins(foods, (f) => f)).toEqual(foods);
    expect(collapseTwins(foods)).toEqual(foods);
    expect(searchRows(foods, "thịt bò")).toEqual(searchFoods(foods, "thịt bò"));
  });

  it("loading it twice is one load, and asks every list to draw again", async () => {
    const before = catalogVersion();
    const first = loadFoodRows();
    expect(loadFoodRows()).toBe(first);
    await first;
    expect(rowsReady()).toBe(true);
    expect(catalogVersion()).toBe(before + 1);
  });
});
