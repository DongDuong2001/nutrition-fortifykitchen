import { describe, expect, it } from "vitest";
import { EXTRA_NUTRIENT_IDS, addedNames, columnGroups, countedForLevel, isExtra, levelSummary, nutrientsForLevel, sumExtras } from "../level-nutrients";
import { COUNTED_NUTRIENT_KEYS } from "../day-totals";
import { getNutrientDefinition } from "../nutrients";
import { LEVELS } from "../coaching-link";

const names = (ids: string[]) => ids.map((id) => getNutrientDefinition(id)?.nameVi);

describe("lists per Level (the coach's table)", () => {
  it("Level 0 and 1: 6 minerals and Vitamin A and C", () => {
    for (const level of [0, 1] as const) {
      const n = nutrientsForLevel(level);
      expect(names(n.minerals)).toEqual(["Natri", "Kali", "Canxi", "Magie", "Sắt", "Kẽm"]);
      expect(names(n.vitamins)).toEqual(["Vitamin A", "Vitamin C"]);
      expect(n.extras).toEqual([]);
    }
  });

  it("Level 2: adds Selen; Vitamin A, D, E, K and B6, B9, B12", () => {
    const n = nutrientsForLevel(2);
    expect(names(n.minerals)).toEqual(["Natri", "Kali", "Canxi", "Magie", "Sắt", "Kẽm", "Selen"]);
    expect(names(n.vitamins)).toEqual(["Vitamin A", "Vitamin D", "Vitamin E", "Vitamin K", "Vitamin B6", "Vitamin B9", "Vitamin B12"]);
    expect(n.extras).toEqual([]);
  });

  it("Level 3: Phốt pho, Đồng, Selen; Vitamin A, D, E, K and B1, B3, B6, B9, B12; the extras", () => {
    const n = nutrientsForLevel(3);
    expect(names(n.minerals)).toEqual(["Natri", "Kali", "Canxi", "Magie", "Phốt pho", "Sắt", "Kẽm", "Đồng", "Selen"]);
    expect(names(n.vitamins)).toEqual(["Vitamin A", "Vitamin D", "Vitamin E", "Vitamin K", "Vitamin B1", "Vitamin B3", "Vitamin B6", "Vitamin B9", "Vitamin B12"]);
    expect(names(n.extras)).toEqual([
      "Béo không bão hòa đơn",
      "Béo không bão hòa đa",
      "Omega-3",
      "Omega-6",
      "Xơ hòa tan",
      "Xơ không tan",
    ]);
  });

  it("Level 4 and 5: all 22 and the same extras", () => {
    for (const level of [4, 5] as const) {
      const n = nutrientsForLevel(level);
      expect([...n.minerals, ...n.vitamins].sort()).toEqual([...COUNTED_NUTRIENT_KEYS].sort());
      expect(n.extras).toEqual(EXTRA_NUTRIENT_IDS);
    }
  });

  it("counted micros per Level: 8, 8, 14, 18, 22, 22", () => {
    expect(LEVELS.map((l) => countedForLevel(l).length)).toEqual([8, 8, 14, 18, 22, 22]);
  });

  it("every id is in the catalogue, nothing repeats, and a Level never loses a nutrient except Vitamin C going up to Level 2", () => {
    for (const level of LEVELS) {
      const n = nutrientsForLevel(level);
      const all = [...n.extras, ...n.minerals, ...n.vitamins];
      expect(new Set(all).size).toBe(all.length);
      for (const id of all) expect(getNutrientDefinition(id)).toBeDefined();
      // the counted ones are always counted keys; the extras never are
      for (const id of countedForLevel(level)) expect(COUNTED_NUTRIENT_KEYS).toContain(id);
      for (const id of n.extras) expect(COUNTED_NUTRIENT_KEYS).not.toContain(id);
    }
  });

  it("an extra is never a counted key", () => {
    expect(EXTRA_NUTRIENT_IDS.every((id) => isExtra(id))).toBe(true);
    expect(isExtra("iron")).toBe(false);
  });
});

describe("column groups", () => {
  it("Level 0 to 2: Khoáng chất then Vitamin", () => {
    expect(columnGroups(1).map((g) => g.title)).toEqual(["Khoáng chất", "Vitamin"]);
    expect(columnGroups(2).map((g) => g.title)).toEqual(["Khoáng chất", "Vitamin"]);
  });

  it("Level 3 and up: Chi tiết béo & xơ first", () => {
    expect(columnGroups(3).map((g) => g.title)).toEqual(["Chi tiết béo & xơ", "Khoáng chất", "Vitamin"]);
    expect(columnGroups(5).map((g) => g.title)).toEqual(["Chi tiết béo & xơ", "Khoáng chất", "Vitamin"]);
  });
});

describe("summary of the level's own micros", () => {
  const ids = ["iron", "calcium", "zinc"];
  const targets = { iron: 10, calcium: 1000, zinc: 10, selenium: 50 };

  it("counts reached over the level's total, ignoring micros outside the list", () => {
    const s = levelSummary({ iron: 12, calcium: 300, zinc: 10, selenium: 900 }, targets, ids);
    expect(s.reached).toBe(2);
    expect(s.total).toBe(3);
  });

  it("names the two lowest, lowest first", () => {
    const s = levelSummary({ iron: 12, calcium: 300, zinc: 6 }, targets, ids);
    expect(s.lacking).toEqual(["Canxi", "Kẽm"]);
  });

  it("an unknown value is neither reached nor ranked as 0", () => {
    const s = levelSummary({ iron: null, calcium: 300 }, targets, ids);
    expect(s.reached).toBe(0);
    expect(s.lacking).toEqual(["Canxi"]);
    expect(s.total).toBe(3);
  });

  it("a micro with no target is not ranked", () => {
    const s = levelSummary({ iron: 5, calcium: 1, zinc: 1 }, { iron: 10, calcium: null, zinc: 0 }, ids);
    expect(s.lacking).toEqual(["Sắt"]);
  });
});

describe("what a Level adds", () => {
  it("1 to 2: Selen and the vitamins D, E, K, B6, B9, B12", () => {
    expect(addedNames(1, 2)).toEqual(["Selen", "Vitamin D", "Vitamin E", "Vitamin K", "Vitamin B6", "Vitamin B9", "Vitamin B12"]);
  });

  it("2 to 3: Phốt pho, Đồng, B1, B3 and the extras line", () => {
    expect(addedNames(2, 3)).toEqual(["Phốt pho", "Đồng", "Vitamin B1", "Vitamin B3", "chi tiết béo và xơ"]);
  });

  it("3 to 4: the rest of the 22, no extras line again", () => {
    expect(addedNames(3, 4)).toEqual(["Mangan", "Vitamin C", "Vitamin B2", "Vitamin B5"]);
  });

  it("going down lists only what the lower Level shows that the higher does not (Vitamin C is in Level 0 and 1, not 2 or 3)", () => {
    expect(addedNames(3, 2)).toEqual([]);
    expect(addedNames(3, 1)).toEqual(["Vitamin C"]);
  });
});

describe("sumExtras", () => {
  it("sums the known amounts and leaves an unknown one null, never 0", () => {
    const sums = sumExtras([
      { nutrients: { omega3: 0.5, monounsaturated_fat: 2 } },
      { nutrients: { omega3: 0.25, omega6: null } },
      { nutrients: {} },
    ]);
    expect(sums.omega3).toBe(0.75);
    expect(sums.monounsaturated_fat).toBe(2);
    expect(sums.omega6).toBeNull();
    expect(sums.soluble_fiber).toBeNull();
    expect(Object.keys(sums)).toEqual(EXTRA_NUTRIENT_IDS);
  });

  it("an empty day has every extra unknown", () => {
    expect(Object.values(sumExtras([])).every((v) => v === null)).toBe(true);
  });

  it("keeps a known 0", () => {
    expect(sumExtras([{ nutrients: { omega6: 0 } }]).omega6).toBe(0);
  });
});
