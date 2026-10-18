import { describe, it, expect } from "vitest";
import { scaleNutrients, parseGramsInput, calculateMacroPreview, formatGramsServingLabel, gramsServingLabel, MAX_GRAMS_PER_PORTION, hidesGrams, unitPortionText, unitAmountText, unitPortion, unitCountOf, MAX_UNIT_COUNT } from "../portion";
import { MOCK_FOODS } from "../mock/foods";

// Grams as Vietnamese text: comma for decimals, dot for thousands (2,5 g; 1.000 g)
describe("gramsServingLabel", () => {
  it("writes grams in the Vietnamese number format", () => {
    expect(gramsServingLabel(2.5)).toBe("2,5 g");
    expect(gramsServingLabel(100)).toBe("100 g");
    expect(gramsServingLabel(1000)).toBe("1.000 g");
  });
});

describe("formatGramsServingLabel", () => {
  it("formats decimal grams with comma in Vietnamese format", () => {
    expect(formatGramsServingLabel("2,5", "100 g")).toBe("2,5 g");
    expect(formatGramsServingLabel("2.5", "100 g")).toBe("2,5 g");
  });

  it("formats integer grams, with the dot for thousands", () => {
    expect(formatGramsServingLabel("100", "50 g")).toBe("100 g");
    expect(formatGramsServingLabel("1000", "50 g")).toBe("1.000 g");
  });

  it("keeps the fallback when the input is empty or invalid", () => {
    expect(formatGramsServingLabel("", "100 g")).toBe("100 g");
    expect(formatGramsServingLabel("   ", "100 g")).toBe("100 g");
    expect(formatGramsServingLabel("abc", "100 g")).toBe("100 g");
  });
});

describe("lib/portion", () => {
  const chaLa = MOCK_FOODS.find((f) => f.id === "food-cha-la")!;

  describe("parseGramsInput", () => {
    it("parses numbers with comma or dot as decimal separator", () => {
      expect(parseGramsInput("30")).toBe(30);
      expect(parseGramsInput("2,5")).toBe(2.5);
      expect(parseGramsInput("2.5")).toBe(2.5);
      expect(parseGramsInput(" 150 ")).toBe(150);
      expect(parseGramsInput("abc")).toBe(0);
      expect(parseGramsInput("-5")).toBe(0);
      expect(parseGramsInput("")).toBe(0);
    });

    it("clamps large values to MAX_GRAMS_PER_PORTION", () => {
      expect(parseGramsInput("100000")).toBe(MAX_GRAMS_PER_PORTION);
      expect(parseGramsInput("5001")).toBe(MAX_GRAMS_PER_PORTION);
      expect(parseGramsInput("5000")).toBe(5000);
    });
  });

  describe("scaleNutrients", () => {
    it("scales nutrients for Chà là 30 g to match design numbers", () => {
      const scaled = scaleNutrients(chaLa.nutrients, 30);
      // 84 kcal, 22 g carb, 197 mg kali
      expect(Math.round(scaled.energy!)).toBe(84);
      expect(Math.round(scaled.carbs!)).toBe(22);
      expect(Math.round(scaled.potassium!)).toBe(197);
    });

    it("keeps null as null (never converts unknown to 0)", () => {
      const sampleWithNulls = {
        energy: 100,
        caffeine: null,
        alcohol: null,
      };
      const scaled = scaleNutrients(sampleWithNulls, 50);
      expect(scaled.energy).toBe(50);
      expect(scaled.caffeine).toBeNull();
      expect(scaled.alcohol).toBeNull();
    });

    it("returns 0 for non-null numbers when grams is 0", () => {
      const scaled = scaleNutrients(chaLa.nutrients, 0);
      expect(scaled.energy).toBe(0);
      expect(scaled.carbs).toBe(0);
    });
  });

  describe("calculateMacroPreview", () => {
    it("computes 4-up macro preview formatted for display", () => {
      const preview = calculateMacroPreview(chaLa.nutrients, 30);
      expect(preview.calories).toBe(84);
      expect(preview.carbs).toBe(22);
      expect(preview.protein).toBeCloseTo(0.7, 1);
      expect(preview.fat).toBeCloseTo(0.1, 1);
    });
  });
});

describe("supplement amounts (unit portions)", () => {
  const canxi = {
    category: "bo_sung",
    source: "label",
    servings: [
      { label: "1 viên", grams: 1 },
      { label: "2 viên (liều trên nhãn)", grams: 2 },
    ],
  };

  it("collapses a quantity of a portion into its natural form", () => {
    expect(unitPortionText("1 viên", 1)).toBe("1 viên");
    expect(unitPortionText("1 viên", 2)).toBe("2 viên");
    expect(unitPortionText("1 giọt", 3)).toBe("3 giọt");
    expect(unitPortionText("1 muỗng", 0.5)).toBe("0,5 muỗng");
    expect(unitPortionText("2 viên (liều trên nhãn)", 2)).toBe("4 viên (liều trên nhãn)");
    expect(unitPortionText("muỗng canh", 2)).toBe("2 × muỗng canh");
  });

  it("shows the quantity of the portion, not grams, for a supplement", () => {
    expect(unitAmountText(canxi, "1 viên", 1)).toBe("1 viên");
    expect(unitAmountText(canxi, "1 viên", 2)).toBe("2 viên");
    expect(unitAmountText(canxi, "2 viên (liều trên nhãn)", 2)).toBe("2 viên (liều trên nhãn)");
    expect(unitAmountText(canxi, "1 viên", null)).toBe("1 viên");
  });

  it("leaves other foods and gram entries to the usual grams text", () => {
    expect(unitAmountText({ category: "trai_cay", servings: [{ label: "1 quả", grams: 60 }] }, "1 quả", 60)).toBeNull();
    expect(unitAmountText({ category: "bo_sung", source: "USDA" }, "30 g", 30)).toBeNull();
    expect(unitAmountText(null, "1 viên", 1)).toBeNull();
    expect(unitAmountText(canxi, "", 1)).toBeNull();
  });

  it("never shows grams for a supplement whose source is the pack label", () => {
    expect(hidesGrams(canxi)).toBe(true);
    expect(hidesGrams({ ...canxi, source: "Label" })).toBe(true);
    expect(hidesGrams({ ...canxi, source: "USDA" })).toBe(false);
    expect(hidesGrams({ category: "tinh_bot", source: "label" })).toBe(false);
    expect(hidesGrams(undefined)).toBe(false);
  });
});

describe("the ×N quantity of a supplement", () => {
  const servings = [
    { label: "1 viên", grams: 1 },
    { label: "2 viên (liều trên nhãn)", grams: 2 },
  ];

  it("N units are N × the serving's grams under the collapsed label", () => {
    expect(unitPortion(servings[0], 1)).toEqual({ grams: 1, label: "1 viên" });
    expect(unitPortion(servings[0], 3)).toEqual({ grams: 3, label: "3 viên" });
    expect(unitPortion(servings[1], 2)).toEqual({ grams: 4, label: "4 viên (liều trên nhãn)" });
  });

  it("keeps the count between 1 and 10", () => {
    expect(MAX_UNIT_COUNT).toBe(10);
    expect(unitPortion(servings[0], 0).grams).toBe(1);
    expect(unitPortion(servings[0], 25)).toEqual({ grams: 10, label: "10 viên" });
  });

  it("reads the serving and count back from a label and grams", () => {
    expect(unitCountOf(servings, "1 viên", 1)).toEqual({ serving: servings[0], count: 1 });
    expect(unitCountOf(servings, "1 viên", 2)).toEqual({ serving: servings[0], count: 2 });
    expect(unitCountOf(servings, "3 viên", 3)).toEqual({ serving: servings[0], count: 3 });
    expect(unitCountOf(servings, "2 viên (liều trên nhãn)", 2)).toEqual({ serving: servings[1], count: 1 });
    expect(unitCountOf(servings, "4 viên (liều trên nhãn)", 4)).toEqual({ serving: servings[1], count: 2 });
  });

  it("a label that matches nothing falls back to the first serving and the count its grams give", () => {
    expect(unitCountOf(servings, "một ít", 5)).toEqual({ serving: servings[0], count: 5 });
    expect(unitCountOf([], "1 viên", 1)).toBeNull();
  });
});
