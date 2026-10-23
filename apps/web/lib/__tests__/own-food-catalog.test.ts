import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CATALOG_FOODS, browsableFoods, catalogFoodById, putBackCatalogFood, removeCatalogFood, setCatalogFoods, type FoodItem } from "../catalog";
import { resolveFavourites } from "../favourites";
import { savedMealEntries, type SavedMeal } from "../saved-meals";
import { searchFoods } from "../search";

// Job C: Xoá món. A deleted own food leaves the catalogue at once (lists, search, Gần đây, Yêu thích and the add sheet all read it),
// stays out when a catalogue load brings it back while the delete is still waiting, and Hoàn tác puts it back.

const mine: FoodItem = {
  id: "55555555-5555-4555-8555-555555555555",
  nameVi: "Bánh nhà làm",
  category: "cua_toi",
  source: "user",
  servings: [{ label: "100 g", grams: 100 }],
  nutrients: { energy: 250, protein: 5, carbs: 40, fat: 8 },
} as FoodItem;

beforeEach(() => setCatalogFoods([mine]));
afterEach(() => {
  putBackCatalogFood(mine); // forget the delete: the module remembers deleted ids for the page's life
  const at = CATALOG_FOODS.findIndex((f) => f.id === mine.id);
  if (at >= 0) CATALOG_FOODS.splice(at, 1);
});

describe("removeCatalogFood / putBackCatalogFood", () => {
  it("takes the food out of the catalogue, the lists and the id lookup, and hands it back for Hoàn tác", () => {
    expect(catalogFoodById(mine.id)).toBeDefined();
    const removed = removeCatalogFood(mine.id);
    expect(removed?.id).toBe(mine.id);
    expect(catalogFoodById(mine.id)).toBeUndefined();
    expect(browsableFoods().some((f) => f.id === mine.id)).toBe(false);
  });

  it("is gone from search, Yêu thích and a saved meal's one-tap add", () => {
    removeCatalogFood(mine.id);
    expect(searchFoods(browsableFoods(), "banh nha lam").some((f) => f.id === mine.id)).toBe(false);
    expect(resolveFavourites([mine.id], browsableFoods())).toEqual([]);
    const meal: SavedMeal = { id: "m", name: "Bữa", createdAt: "", items: [{ foodId: mine.id, servingLabel: "100 g", grams: 100 }] };
    expect(savedMealEntries(meal, browsableFoods(), "lunch", "t", "")).toEqual([]);
  });

  it("stays out when the catalogue loads again before the server has deleted it", () => {
    removeCatalogFood(mine.id);
    setCatalogFoods([mine]);
    expect(catalogFoodById(mine.id)).toBeUndefined();
    expect(browsableFoods().some((f) => f.id === mine.id)).toBe(false);
  });

  it("Hoàn tác puts the same food back, in the lists and by id, and a later load keeps it", () => {
    const removed = removeCatalogFood(mine.id)!;
    putBackCatalogFood(removed);
    expect(catalogFoodById(mine.id)?.nameVi).toBe("Bánh nhà làm");
    expect(browsableFoods().some((f) => f.id === mine.id)).toBe(true);
    setCatalogFoods([{ ...mine, nameVi: "Bánh nhà làm (server)" }]);
    expect(catalogFoodById(mine.id)?.nameVi).toBe("Bánh nhà làm (server)");
  });

  it("an id that is not in the catalogue changes nothing", () => {
    expect(removeCatalogFood("66666666-6666-4666-8666-666666666666")).toBeUndefined();
  });
});
