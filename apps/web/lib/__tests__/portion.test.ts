import { describe, it, expect } from "vitest";
import { scaleNutrients, parseGramsInput, calculateMacroPreview, formatGramsServingLabel, gramsServingLabel } from "../portion";
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
