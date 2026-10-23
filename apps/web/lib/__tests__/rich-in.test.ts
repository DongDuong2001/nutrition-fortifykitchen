import { describe, expect, it } from "vitest";
import { RICH_NUTRIENT_IDS, richInFoods, richName, richUpperLimitLine } from "../rich-in";
import { upperLimits } from "../rda";
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

// A3 (23/10): a Giàu … row says when one portion of the food is above the nutrient's UL (lib/rda.ts); selenium in Brazil nuts
describe("richUpperLimitLine", () => {
  const adult = upperLimits(30);
  const with_ = (id: string, nutrients: Record<string, number>, grams: number, category: FoodItem["category"] = "beo"): FoodItem => ({
    id, nameVi: id, category, source: "USDA", servings: [{ label: `${grams} g`, grams }], nutrients,
  });

  it("one portion above the UL: the existing note line with the limit", () => {
    // Hạt Brazil as in the 21/10 data: 1.920 µg per 100 g, first serving 100 g; the adult UL is 400 µg
    expect(richUpperLimitLine(with_("brazil", { selenium: 1920 }, 100), "selenium", adult.selenium)).toBe("Vượt mức an toàn (400 µg)");
  });

  it("the same food with a real portion under the UL: no line (the data-1023 serving fix)", () => {
    expect(richUpperLimitLine(with_("brazil", { selenium: 1920 }, 5), "selenium", adult.selenium)).toBeNull();
  });

  it("exactly at the UL is not above it", () => {
    expect(richUpperLimitLine(with_("x", { zinc: 40 }, 100, "dam"), "zinc", adult.zinc)).toBeNull();
  });

  it("a UL for supplements only (folate) never counts ordinary food, only a supplement", () => {
    expect(richUpperLimitLine(with_("matcha", { folate: 1200 }, 100, "do_uong"), "folate", adult.folate)).toBeNull();
    expect(richUpperLimitLine(with_("pill", { folate: 120000 }, 1, "bo_sung"), "folate", adult.folate)).toBe("Vượt mức an toàn (1.000 µg)");
  });

  it("a nutrient with no UL (vitamin K) or no value never gets a line", () => {
    expect(richUpperLimitLine(with_("matcha", { vitamin_k: 2900 }, 100, "do_uong"), "vitamin_k", adult.vitamin_k)).toBeNull();
    expect(richUpperLimitLine(with_("y", {}, 100), "selenium", adult.selenium)).toBeNull();
  });
});
