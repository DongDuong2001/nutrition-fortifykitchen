import { describe, expect, it } from "vitest";
import { CATALOG_FOODS, addCatalogFood, catalogChanged, catalogFoodById, setCatalogFoods, type FoodItem } from "../catalog";

// perf/live-bundle: catalogFoodById answers from an id → index map instead of scanning the catalogue, and still
// answers exactly what Array.find did, whatever changed the catalogue and whether or not the change was announced.
const food = (id: string, nameVi = id): FoodItem => ({ id, nameVi, category: "dam", source: "USDA", servings: [{ label: "100 g", grams: 100 }], nutrients: {} });
const find = (id: string) => CATALOG_FOODS.find((f) => f.id === id);

describe("catalogFoodById", () => {
  it("finds every sample food, the same object as a scan", () => {
    expect(CATALOG_FOODS.length).toBeGreaterThan(20);
    for (const f of CATALOG_FOODS) expect(catalogFoodById(f.id)).toBe(find(f.id));
  });

  it("nothing for an unknown, empty or missing id", () => {
    expect(catalogFoodById("food-none")).toBeUndefined();
    expect(catalogFoodById("")).toBeUndefined();
    expect(catalogFoodById(null)).toBeUndefined();
    expect(catalogFoodById(undefined)).toBeUndefined();
  });

  it("follows addCatalogFood (put first, the others move one place)", () => {
    const before = CATALOG_FOODS[3];
    addCatalogFood(food("made-1"));
    expect(catalogFoodById("made-1")).toBe(CATALOG_FOODS[0]);
    expect(catalogFoodById(before.id)).toBe(before);
  });

  it("follows setCatalogFoods (a food replaced by id, new ones added)", () => {
    const id = CATALOG_FOODS[5].id;
    setCatalogFoods([food(id, "Thay thế"), food("db-1")]);
    expect(catalogFoodById(id)?.nameVi).toBe("Thay thế");
    expect(catalogFoodById("db-1")).toBe(find("db-1"));
  });

  it("is right after changes nobody announced: in place, reordered, pushed, emptied", () => {
    catalogFoodById(CATALOG_FOODS[0].id); // index built
    const swapped = food(CATALOG_FOODS[2].id, "Đổi tại chỗ");
    CATALOG_FOODS[2] = swapped;
    expect(catalogFoodById(swapped.id)).toBe(swapped);
    CATALOG_FOODS.reverse();
    for (const f of CATALOG_FOODS.slice(0, 10)) expect(catalogFoodById(f.id)).toBe(find(f.id));
    CATALOG_FOODS.push(food("pushed-1"));
    expect(catalogFoodById("pushed-1")).toBe(find("pushed-1"));
    const kept = CATALOG_FOODS.slice();
    CATALOG_FOODS.length = 0;
    expect(catalogFoodById(kept[0].id)).toBeUndefined();
    CATALOG_FOODS.push(...kept);
    catalogChanged();
    expect(catalogFoodById(kept[0].id)).toBe(kept[0]);
  });

  it("the first of two foods with one id wins, as with find", () => {
    CATALOG_FOODS.push(food("twice", "first"), food("twice", "second"));
    catalogChanged();
    expect(catalogFoodById("twice")?.nameVi).toBe("first");
  });

  it("3.000 foods, every one looked up: one pass to index, then O(1)", () => {
    const many = Array.from({ length: 3000 }, (_, i) => food(`bulk-${i}`));
    setCatalogFoods(many);
    const started = performance.now();
    for (let round = 0; round < 10; round++) for (const f of many) expect(catalogFoodById(f.id)?.id).toBe(f.id);
    // 30.000 look-ups; a scan per look-up was about 45 M comparisons
    expect(performance.now() - started).toBeLessThan(1000);
  });
});
