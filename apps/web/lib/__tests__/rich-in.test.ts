import { describe, expect, it } from "vitest";
import { RICH_NUTRIENT_IDS, richInFoods, richName } from "../rich-in";
import { getNutrientDefinition } from "../nutrients";
import type { FoodItem } from "../mock/foods";

const food = (id: string, calcium: number | null, grams = 100, category: FoodItem["category"] = "dam"): FoodItem => ({
  id,
  nameVi: id,
  category,
  source: "USDA",
  servings: [{ label: `${grams} g`, grams }],
  nutrients: { calcium },
});

describe("richInFoods", () => {
  const foods = [food("a", 100), food("b", 300), food("c", null), food("d", 0), food("e", 200, 50)];

  it("ranks by amount per 100 g, highest first, and leaves out unknown and zero", () => {
    const rows = richInFoods(foods, "calcium", "per100", 1000, "food");
    expect(rows.map((r) => r.food.id)).toEqual(["b", "e", "a"]);
    expect(rows[0]).toMatchObject({ amount: 300, pct: 30, basis: "100 g" });
  });

  it("per portion scales to the first serving", () => {
    const rows = richInFoods(foods, "calcium", "portion", 1000, "food");
    expect(rows.map((r) => r.food.id)).toEqual(["b", "a", "e"]);
    expect(rows.find((r) => r.food.id === "e")).toMatchObject({ amount: 100, pct: 10, basis: "50 g" });
  });

  it("pct is null when the target is unknown", () => {
    expect(richInFoods(foods, "calcium", "per100", null, "food")[0].pct).toBeNull();
  });

  // fix/rich-tabs: supplements (bo_sung) hold far more per 100 g than any food, so they get their own tab
  describe("food or supplement", () => {
    const mixed = [...foods, food("pill", 50000, 1, "bo_sung"), food("powder", 900, 30, "bo_sung"), food("pill-none", null, 1, "bo_sung"), food("pill-zero", 0, 1, "bo_sung")];

    it("a supplement never appears among the foods", () => {
      const ids = richInFoods(mixed, "calcium", "per100", 1000, "food").map((r) => r.food.id);
      expect(ids).toEqual(["b", "e", "a"]);
      expect(richInFoods(mixed, "calcium", "portion", 1000, "food").every((r) => r.food.category !== "bo_sung")).toBe(true);
    });

    it("a food never appears among the supplements", () => {
      const rows = richInFoods(mixed, "calcium", "portion", 1000, "supplement");
      expect(rows.every((r) => r.food.category === "bo_sung")).toBe(true);
      // Same ranking and null / 0 rules: per usual serving, highest first, unknown and zero left out
      expect(rows.map((r) => r.food.id)).toEqual(["pill", "powder"]);
      expect(rows[0]).toMatchObject({ amount: 500, pct: 50, basis: "1 g" });
    });

    it("an empty list when there is no supplement", () => {
      expect(richInFoods(foods, "calcium", "portion", 1000, "supplement")).toEqual([]);
    });
  });

  it("lists minerals, then vitamins, then đạm and chất xơ (feat/rich-more-nutrients); never sodium", () => {
    expect(RICH_NUTRIENT_IDS).toEqual([
      "calcium", "iron", "potassium", "magnesium", "zinc", "selenium", "phosphorus",
      "vitamin_d", "vitamin_c", "vitamin_a", "b12", "folate", "vitamin_e", "vitamin_k", "b6",
      "protein", "fiber",
    ]);
    expect(RICH_NUTRIENT_IDS).not.toContain("sodium");
    const groups = RICH_NUTRIENT_IDS.map((id) => getNutrientDefinition(id)?.group);
    const firstVitamin = groups.indexOf("vitamins");
    expect(groups.slice(0, firstVitamin).every((g) => g === "minerals")).toBe(true);
    expect(groups.slice(firstVitamin, firstVitamin + 8).every((g) => g === "vitamins")).toBe(true);
  });

  it("every nutrient has a catalogue definition, a unit, a colour and a name for its title", async () => {
    const { NUTRIENT_COLORS } = await import("../nutrient-colors");
    for (const id of RICH_NUTRIENT_IDS) {
      const def = getNutrientDefinition(id);
      expect(def, id).toBeDefined();
      expect(def!.unit.length, id).toBeGreaterThan(0);
      expect(richName(def!).length, id).toBeGreaterThan(0);
      if (def!.group === "minerals" || def!.group === "vitamins") expect(NUTRIENT_COLORS[id], id).toBeDefined();
    }
  });

  it("a new nutrient ranks per 100 g and per portion like the others (zinc: oysters per 100 g, a big serving per portion)", () => {
    const zinc = (id: string, per100: number, grams: number): FoodItem => ({ ...food(id, null, grams), nutrients: { zinc: per100 } });
    const list = [zinc("hau", 16.6, 50), zinc("bo", 10.5, 200), zinc("hat", 9.9, 10)];
    expect(richInFoods(list, "zinc", "per100", 11, "food").map((r) => r.food.id)).toEqual(["hau", "bo", "hat"]);
    expect(richInFoods(list, "zinc", "portion", 11, "food").map((r) => r.food.id)).toEqual(["bo", "hau", "hat"]);
    expect(richInFoods(list, "zinc", "per100", 11, "food")[0]).toMatchObject({ unit: "mg", pct: 151 });
  });
});

describe("richName", () => {
  it("keeps mineral and vitamin names in English as they are and lowercases the macros (Hao, 17/10)", () => {
    const title = (id: string) => `Giàu ${richName(getNutrientDefinition(id)!)}`;
    expect(title("vitamin_d")).toBe("Giàu Vitamin D");
    expect(title("vitamin_c")).toBe("Giàu Vitamin C");
    expect(title("calcium")).toBe("Giàu Calcium");
    expect(title("iron")).toBe("Giàu Iron");
    expect(title("protein")).toBe("Giàu đạm");
    expect(title("fiber")).toBe("Giàu chất xơ");
  });
});
