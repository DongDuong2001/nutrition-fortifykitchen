import { describe, expect, it } from "vitest";
import {
  MAX_COMPARE_FOODS,
  basisPortion,
  buildCompare,
  compareHref,
  markHighest,
  parseCompareIds,
} from "../food-compare";
import type { FoodItem } from "../mock/foods";

const food = (id: string, nutrients: Record<string, number | null>, servings = [{ label: "100 g", grams: 100 }]): FoodItem => ({
  id,
  nameVi: `Món ${id}`,
  category: "trai_cay",
  source: "USDA",
  servings,
  nutrients,
});

const known = (...ids: string[]) => (id: string) => ids.includes(id);

describe("parseCompareIds", () => {
  it("splits the list, trims, and keeps the order", () => {
    expect(parseCompareIds("a, b ,c", known("a", "b", "c"))).toEqual(["a", "b", "c"]);
  });

  it("dedupes, keeping the first place", () => {
    expect(parseCompareIds("a,b,a,b", known("a", "b"))).toEqual(["a", "b"]);
  });

  it("skips unknown ids and empty parts", () => {
    expect(parseCompareIds("a,,x,b,", known("a", "b"))).toEqual(["a", "b"]);
  });

  it("keeps at most 3, counted after unknown ids are skipped", () => {
    expect(MAX_COMPARE_FOODS).toBe(3);
    expect(parseCompareIds("a,b,c,d,e", known("a", "b", "c", "d", "e"))).toEqual(["a", "b", "c"]);
    expect(parseCompareIds("a,x,b,y,c,d", known("a", "b", "c", "d"))).toEqual(["a", "b", "c"]);
  });

  it("returns nothing for a missing or empty value", () => {
    expect(parseCompareIds(null, known("a"))).toEqual([]);
    expect(parseCompareIds(undefined, known("a"))).toEqual([]);
    expect(parseCompareIds("", known("a"))).toEqual([]);
  });
});

describe("compareHref", () => {
  it("builds the route with the ids in order, and the bare route without ids", () => {
    expect(compareHref(["a", "b"])).toBe("/foods/compare?ids=a,b");
    expect(compareHref([])).toBe("/foods/compare");
  });

  it("never links more than 3 ids", () => {
    expect(compareHref(["a", "b", "c", "d"])).toBe("/foods/compare?ids=a,b,c");
  });
});

describe("basisPortion", () => {
  const rice = food("rice", {}, [
    { label: "1 chén", grams: 160 },
    { label: "100 g", grams: 100 },
  ]);

  it("per 100 g is 100 g for every food, with no label", () => {
    expect(basisPortion(rice, "per100")).toEqual({ grams: 100, label: null });
  });

  it("per serving is the food's first serving, with the grams after a named serving", () => {
    expect(basisPortion(rice, "serving")).toEqual({ grams: 160, label: "1 chén · 160 g" });
    expect(basisPortion(food("x", {}, [{ label: "30 g", grams: 30 }]), "serving")).toEqual({ grams: 30, label: "30 g" });
  });

  it("falls back to 100 g for a food with no serving", () => {
    expect(basisPortion(food("x", {}, []), "serving")).toEqual({ grams: 100, label: "100 g" });
  });
});

describe("markHighest", () => {
  it("marks the single highest known value", () => {
    expect(markHighest([1, 5, 3], "g")).toEqual([false, true, false]);
  });

  it("marks nothing when the highest is tied", () => {
    expect(markHighest([5, 5, 3], "g")).toEqual([false, false, false]);
    expect(markHighest([2, 2], "g")).toEqual([false, false]);
  });

  it("marks nothing when only one value is known", () => {
    expect(markHighest([4, null, null], "g")).toEqual([false, false, false]);
    expect(markHighest([null, null], "g")).toEqual([false, false]);
  });

  it("ignores unknown values when ranking the known ones", () => {
    expect(markHighest([null, 2, 7], "g")).toEqual([false, false, true]);
  });

  it("a known 0 is a value, and is never marked on its own", () => {
    expect(markHighest([0, 3], "g")).toEqual([false, true]);
    expect(markHighest([0, 0], "g")).toEqual([false, false]);
  });

  it("treats values that show as the same number as a tie", () => {
    // 100,2 and 100 both show as "100" in mg
    expect(markHighest([100.2, 100], "mg")).toEqual([false, false]);
    // 2,04 and 2,0 show as "2,0" in g
    expect(markHighest([2.04, 2.0], "g")).toEqual([false, false]);
    expect(markHighest([2.3, 2.0], "g")).toEqual([true, false]);
  });
});

describe("buildCompare", () => {
  const dates = food("dates", { energy: 280, protein: 2.4, fat: 0.4, carbs: 75, fiber: 7, iron: 1, vitamin_c: 0 }, [
    { label: "30 g", grams: 30 },
    { label: "100 g", grams: 100 },
  ]);
  const oats = food("oats", { energy: 380, protein: 13, fat: 7, carbs: 67, fiber: null, iron: 4.7, calcium: 54 }, [
    { label: "1 chén", grams: 40 },
  ]);

  it("lists the macros first in the order kcal, đạm, chất béo, tinh bột, chất xơ", () => {
    const { sections } = buildCompare([dates, oats], "per100");
    expect(sections[0].key).toBe("macros");
    expect(sections[0].rows.map((r) => r.id)).toEqual(["energy", "protein", "fat", "carbs", "fiber"]);
    expect(sections[0].rows.map((r) => r.unit)).toEqual(["kcal", "g", "g", "g", "g"]);
  });

  it("then the 22 micros: Vitamin, then Khoáng chất", () => {
    const { sections } = buildCompare([dates, oats], "per100");
    expect(sections.map((s) => s.key)).toEqual(["macros", "vitamins", "minerals"]);
    expect(sections[1].rows).toHaveLength(12);
    expect(sections[2].rows).toHaveLength(10);
    expect(sections[1].rows[0].id).toBe("b1");
    expect(sections[2].rows[0].id).toBe("calcium");
  });

  it("per 100 g reads the stored values", () => {
    const { rows } = { rows: buildCompare([dates, oats], "per100").sections[0].rows };
    expect(rows[0].values).toEqual([280, 380]);
    expect(rows[1].values).toEqual([2.4, 13]);
  });

  it("per serving scales each food by its own first serving", () => {
    const { columns, sections } = buildCompare([dates, oats], "serving");
    expect(columns.map((c) => [c.grams, c.portion])).toEqual([
      [30, "30 g"],
      [40, "1 chén · 40 g"],
    ]);
    // 280 kcal per 100 g at 30 g = 84; 380 at 40 g = 152 (the calibrated sample: Chà là 30 g is 84 kcal)
    expect(sections[0].rows[0].values[0]).toBeCloseTo(84, 6);
    expect(sections[0].rows[0].values[1]).toBeCloseTo(152, 6);
    const iron = sections[2].rows.find((r) => r.id === "iron");
    expect(iron?.values[0]).toBeCloseTo(0.3, 6);
    expect(iron?.values[1]).toBeCloseTo(1.88, 6);
  });

  it("keeps an unknown value null in both bases, never 0", () => {
    for (const basis of ["per100", "serving"] as const) {
      const fiber = buildCompare([dates, oats], basis).sections[0].rows[4];
      expect(fiber.values[1]).toBeNull();
      const calcium = buildCompare([dates, oats], basis).sections[2].rows.find((r) => r.id === "calcium");
      expect(calcium?.values[0]).toBeNull();
    }
  });

  it("keeps a known 0 as 0", () => {
    const vitC = buildCompare([dates, oats], "per100").sections[1].rows.find((r) => r.id === "vitamin_c");
    expect(vitC?.values).toEqual([0, null]);
  });

  it("marks the highest per row and nothing on ties or a lone value", () => {
    const { sections } = buildCompare([dates, oats], "per100");
    const [kcal, protein, , carbs, fiber] = sections[0].rows;
    expect(kcal.highest).toEqual([false, true]);
    expect(protein.highest).toEqual([false, true]);
    expect(carbs.highest).toEqual([true, false]);
    expect(fiber.highest).toEqual([false, false]);
    const iron = sections[2].rows.find((r) => r.id === "iron");
    expect(iron?.highest).toEqual([false, true]);
  });

  it("works with three foods", () => {
    const eggs = food("eggs", { energy: 280, protein: 12 });
    const { columns, sections } = buildCompare([dates, oats, eggs], "per100");
    expect(columns).toHaveLength(3);
    // energy: 280, 380, 280 -> oats alone is highest
    expect(sections[0].rows[0].highest).toEqual([false, true, false]);
    // protein: 2,4, 13, 12 -> oats
    expect(sections[0].rows[1].highest).toEqual([false, true, false]);
  });

  it("names the columns with the food name and id", () => {
    const { columns } = buildCompare([dates, oats], "per100");
    expect(columns.map((c) => [c.id, c.name])).toEqual([
      ["dates", "Món dates"],
      ["oats", "Món oats"],
    ]);
    expect(columns.map((c) => c.portion)).toEqual([null, null]);
  });
});
