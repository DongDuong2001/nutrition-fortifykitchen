import { describe, expect, it, vi } from "vitest";
import { upperLimits } from "../rda";
import { supplementAmount, upperLimitNote } from "../upper-limits";

// A catalogue of two foods: a supplement and an ordinary food
vi.mock("../mock/foods", () => ({
  catalogFoodById: (id: string) => (id === "supp" ? { id, category: "bo_sung" } : id === "rice" ? { id, category: "tinh_bot" } : undefined),
}));

const limit = (id: string, age = 25) => upperLimits(age)[id];

describe("upperLimitNote", () => {
  it("says Vượt mức an toàn with the limit when the day total is above a UL that covers all food", () => {
    const note = upperLimitNote({ ul: limit("zinc"), unit: "mg", total: 45, supplement: 0 });
    expect(note?.line).toBe("Vượt mức an toàn (40 mg)");
    expect(note?.detail).toContain("45 mg");
    expect(note?.detail).toContain("40 mg");
  });

  it("is quiet at the limit itself and below it", () => {
    expect(upperLimitNote({ ul: limit("zinc"), unit: "mg", total: 40, supplement: 0 })).toBeNull();
    expect(upperLimitNote({ ul: limit("zinc"), unit: "mg", total: 12, supplement: 0 })).toBeNull();
  });

  it("is quiet for a nutrient with no UL, and for an unknown total", () => {
    expect(limit("potassium")).toBeUndefined();
    expect(upperLimitNote({ ul: limit("potassium"), unit: "mg", total: 99999, supplement: 0 })).toBeNull();
    expect(upperLimitNote({ ul: limit("vitamin_k"), unit: "µg", total: 99999, supplement: 0 })).toBeNull();
    expect(upperLimitNote({ ul: limit("zinc"), unit: "mg", total: null, supplement: 0 })).toBeNull();
  });

  it("counts only supplement foods against a supplements-only UL (magnesium, vitamin E, niacin, folate)", () => {
    // 500 mg of magnesium, all from ordinary food: nothing to say
    expect(upperLimitNote({ ul: limit("magnesium"), unit: "mg", total: 500, supplement: 0 })).toBeNull();
    // 300 mg of it from a supplement is under 350: still nothing, though the day total is above
    expect(upperLimitNote({ ul: limit("magnesium"), unit: "mg", total: 700, supplement: 300 })).toBeNull();
    // 400 mg from supplements is above it
    const note = upperLimitNote({ ul: limit("magnesium"), unit: "mg", total: 700, supplement: 400 });
    expect(note?.line).toBe("Vượt mức an toàn (350 mg)");
    expect(note?.detail).toContain("chỉ tính cho thực phẩm bổ sung");
    expect(note?.detail).toContain("400 mg");
    for (const [id, unit, total] of [["vitamin_e", "mg", 2000], ["b3", "mg", 100], ["folate", "µg", 3000]] as const) {
      expect(upperLimitNote({ ul: limit(id), unit, total, supplement: 0 }), id).toBeNull();
      expect(upperLimitNote({ ul: limit(id), unit, total, supplement: total })?.line, id).toBe(`Vượt mức an toàn (${id === "folate" ? "1.000 µg" : id === "vitamin_e" ? "1.000 mg" : "35 mg"})`);
    }
  });

  it("uses the limit of the age: 1.700 µg of vitamin A for a child of 11, 3.000 µg for an adult", () => {
    expect(upperLimitNote({ ul: limit("vitamin_a", 11), unit: "µg", total: 2000, supplement: 0 })?.line).toBe("Vượt mức an toàn (1.700 µg)");
    expect(upperLimitNote({ ul: limit("vitamin_a", 25), unit: "µg", total: 2000, supplement: 0 })).toBeNull();
  });

  it("says what vitamin A's limit is for", () => {
    expect(upperLimitNote({ ul: limit("vitamin_a"), unit: "µg", total: 3500, supplement: 0 })?.detail).toContain("retinol");
  });
});

describe("supplementAmount", () => {
  it("adds up only the foods of the supplement category", () => {
    expect(
      supplementAmount([
        { foodId: "supp", amount: 120 },
        { foodId: "rice", amount: 30 },
        { foodId: "supp", amount: 80 },
        { foodId: "", amount: 15 }, // a quick kcal entry has no food
        { foodId: "unknown-food", amount: 9 },
      ])
    ).toBe(200);
    expect(supplementAmount([])).toBe(0);
  });
});
