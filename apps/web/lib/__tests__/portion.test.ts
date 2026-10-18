import { describe, it, expect } from "vitest";
import {
  scaleNutrients,
  parseGramsInput,
  calculateMacroPreview,
  formatGramsServingLabel,
  gramsServingLabel,
  MAX_GRAMS_PER_PORTION,
  hidesGrams,
  unitPortionText,
  unitAmountText,
  unitPortion,
  unitCountOf,
  MAX_UNIT_COUNT,
  parseUnitServing,
  parseUnitAmount,
  findNearestUnitServing,
  clampUnitAmount,
  parseUnitAmountInput,
  UNIT_WORDS,
  SIZE_WORDS,
} from "../portion";
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

    it("keeps an unknown kcal or macro unknown (null, shown as a dash), never 0", () => {
      const preview = calculateMacroPreview({ energy: null, protein: null, carbs: 2, magnesium: 40 }, 1);
      expect(preview.calories).toBeNull();
      expect(preview.protein).toBeNull();
      expect(preview.fat).toBeNull();
      expect(preview.carbs).toBeCloseTo(0, 1);
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

  it("leaves gram entries to the usual grams text while formatting unit entries", () => {
    expect(unitAmountText({ category: "trai_cay", servings: [{ label: "1 quả", grams: 60 }] }, "1 quả", 60)).toBe("1 quả");
    expect(unitAmountText({ category: "trai_cay", servings: [{ label: "1 quả", grams: 60 }] }, "2 quả", 120)).toBe("2 quả");
    expect(unitAmountText({ category: "trai_cay", servings: [{ label: "1 quả", grams: 60 }] }, "60 g", 60)).toBeNull();
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

  it("keeps grams for a label powder that has a gram or volume portion", () => {
    const whey = { category: "bo_sung", source: "label", servings: [{ label: "1 muỗng", grams: 31 }, { label: "100 g", grams: 100 }] };
    expect(hidesGrams(whey)).toBe(false);
    expect(hidesGrams({ ...whey, servings: [{ label: "15 ml", grams: 15 }] })).toBe(false);
    expect(hidesGrams({ ...whey, servings: [{ label: "2,5 g", grams: 2.5 }] })).toBe(false);
    expect(hidesGrams({ ...canxi, servings: [{ label: "1 viên (500 mg)", grams: 1 }] })).toBe(true);
  });
});

describe("the ×N quantity of a supplement and unit food", () => {
  const servings = [
    { label: "1 viên", grams: 1 },
    { label: "2 viên (liều trên nhãn)", grams: 2 },
  ];

  it("N units are N × the serving's grams under the collapsed label", () => {
    expect(unitPortion(servings[0], 1)).toEqual({ grams: 1, label: "1 viên" });
    expect(unitPortion(servings[0], 3)).toEqual({ grams: 3, label: "3 viên" });
    expect(unitPortion(servings[0], 1.5)).toEqual({ grams: 1.5, label: "1,5 viên" });
    expect(unitPortion(servings[1], 2)).toEqual({ grams: 4, label: "4 viên (liều trên nhãn)" });
  });

  it("keeps the count between 0.5 and 20", () => {
    expect(MAX_UNIT_COUNT).toBe(20);
    expect(unitPortion(servings[0], 0).grams).toBe(0.5);
    expect(unitPortion(servings[0], 25)).toEqual({ grams: 20, label: "20 viên" });
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

describe("unit portion parser and nearest serving (Task cc-53)", () => {
  it("parses all 28 recognized unit words", () => {
    for (const unit of UNIT_WORDS) {
      const parsed = parseUnitServing(`1 ${unit}`);
      expect(parsed).not.toBeNull();
      expect(parsed?.unit).toBe(unit);
      expect(parsed?.size).toBeUndefined();
      expect(parsed?.hint).toBeUndefined();
    }
  });

  it("parses all recognized size words", () => {
    for (const size of SIZE_WORDS) {
      const parsed = parseUnitServing(`1 quả ${size}`);
      expect(parsed).not.toBeNull();
      expect(parsed?.unit).toBe("quả");
      expect(parsed?.size).toBe(size);
    }
  });

  it("parses hint inside parentheses e.g. eggs", () => {
    const parsed = parseUnitServing("1 quả vừa (50–55 g)");
    expect(parsed).toEqual({
      unit: "quả",
      unitDisplay: "Quả",
      size: "vừa",
      sizeDisplay: "Vừa",
      hint: "50–55 g",
      rawLabel: "1 quả vừa (50–55 g)",
    });

    const parsedNoSize = parseUnitServing("1 quả (50–55 g)");
    expect(parsedNoSize).toEqual({
      unit: "quả",
      unitDisplay: "Quả",
      size: undefined,
      sizeDisplay: undefined,
      hint: "50–55 g",
      rawLabel: "1 quả (50–55 g)",
    });
  });

  it("returns null for labels that do not match the unit pattern", () => {
    expect(parseUnitServing("100 g")).toBeNull();
    expect(parseUnitServing("2 quả")).toBeNull();
    expect(parseUnitServing("Bát phở đặc biệt")).toBeNull();
    expect(parseUnitServing("")).toBeNull();
    expect(parseUnitServing(null)).toBeNull();
  });

  it("parses arbitrary amounts with parseUnitAmount", () => {
    expect(parseUnitAmount("2 trái vừa")).toEqual({
      amount: 2,
      unit: "trái",
      unitDisplay: "Trái",
      size: "vừa",
      sizeDisplay: "Vừa",
      hint: undefined,
      rawLabel: "2 trái vừa",
    });

    expect(parseUnitAmount("1,5 chén đầy")).toEqual({
      amount: 1.5,
      unit: "chén",
      unitDisplay: "Chén",
      size: "đầy",
      sizeDisplay: "Đầy",
      hint: undefined,
      rawLabel: "1,5 chén đầy",
    });

    expect(parseUnitAmount("3 cuốn")).toEqual({
      amount: 3,
      unit: "cuốn",
      unitDisplay: "Cuốn",
      size: undefined,
      sizeDisplay: undefined,
      hint: undefined,
      rawLabel: "3 cuốn",
    });
  });

  it("finds the nearest unit serving and amount when switching from Gam to Unit", () => {
    const servings = [
      { label: "100 g", grams: 100 },
      { label: "1 chén lưng", grams: 130 },
      { label: "1 chén đầy", grams: 180 },
    ];

    // Target 180 g -> exactly 1 chén đầy
    const nearest = findNearestUnitServing(servings, "Chén", 180);
    expect(nearest).not.toBeNull();
    expect(nearest?.serving.label).toBe("1 chén đầy");
    expect(nearest?.amount).toBe(1);

    // Target 260 g -> 2 chén lưng (2 × 130 = 260)
    const nearest2 = findNearestUnitServing(servings, "Chén", 260);
    expect(nearest2?.serving.label).toBe("1 chén lưng");
    expect(nearest2?.amount).toBe(2);
  });

  it("dish '1 phần' ×2 produces 2 phần and double grams", () => {
    const dish = { label: "1 phần", grams: 350 };
    const portion2 = unitPortion(dish, 2);
    expect(portion2).toEqual({ grams: 700, label: "2 phần" });
    const portion15 = unitPortion(dish, 1.5);
    expect(portion15).toEqual({ grams: 525, label: "1,5 phần" });
  });

  it("validates and clamps typed unit amounts", () => {
    expect(clampUnitAmount(0.2)).toBe(0.5);
    expect(clampUnitAmount(25)).toBe(20);
    expect(clampUnitAmount(1.4)).toBe(1.5);
    expect(parseUnitAmountInput("1,5")).toBe(1.5);
    expect(parseUnitAmountInput("2.5")).toBe(2.5);
    expect(parseUnitAmountInput("abc")).toBeNull();
  });
});
