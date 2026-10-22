import { describe, expect, it } from "vitest";
import {
  EXTRA_FIELDS,
  MAIN_FIELDS,
  PINNED_EXTRA_KEYS,
  customFoodPayload,
  extraFieldsFor,
  fieldForKey,
} from "../custom-food-fields";

/** apps/api/internal/nutrition/service.go ValidNutrients, copied: the keys and units createFood's `micros` accepts. */
const VALID_NUTRIENTS: Record<string, string> = {
  energy: "kcal", water: "g", alcohol: "g", caffeine: "mg", oxalate: "mg", phytate: "mg",
  carbs: "g", net_carbs: "g", fiber: "g", insoluble_fiber: "g", soluble_fiber: "g",
  starch: "g", sugars: "g", added_sugars: "g",
  fat: "g", monounsaturated_fat: "g", polyunsaturated_fat: "g",
  omega3: "g", ala: "g", dha: "g", epa: "g", omega6: "g",
  saturated_fat: "g", trans_fat: "g", cholesterol: "mg",
  protein: "g", cystine: "g", histidine: "g", isoleucine: "g", leucine: "g",
  lysine: "g", methionine: "g", phenylalanine: "g", threonine: "g",
  tryptophan: "g", tyrosine: "g", valine: "g",
  b1: "mg", b2: "mg", b3: "mg", b5: "mg", b6: "mg", b12: "µg",
  folate: "µg", vitamin_a: "µg", vitamin_c: "mg", vitamin_d: "µg",
  vitamin_e: "mg", vitamin_k: "µg",
  calcium: "mg", copper: "mg", iron: "mg", magnesium: "mg",
  manganese: "mg", phosphorus: "mg", potassium: "mg", selenium: "µg",
  sodium: "mg", zinc: "mg",
};

describe("custom food fields", () => {
  it("lays the main block out in nutrition-label order, kcal required, sub-rows indented", () => {
    expect(MAIN_FIELDS.map((f) => [f.label, f.unit, f.indent === true, f.required === true])).toEqual([
      ["Năng lượng", "kcal", false, true],
      ["Đạm", "g", false, false],
      ["Tinh bột", "g", false, false],
      ["Chất xơ", "g", true, false],
      ["Đường", "g", true, false],
      ["Chất béo", "g", false, false],
      ["Bão hòa", "g", true, false],
      ["Trans", "g", true, false],
      ["Cholesterol", "mg", false, false],
      ["Sodium", "mg", false, false],
    ]);
  });

  it("maps every field to a ValidNutrients key with that key's unit", () => {
    for (const f of [...MAIN_FIELDS, ...EXTRA_FIELDS]) {
      expect(VALID_NUTRIENTS[f.key], f.key).toBe(f.unit);
    }
    expect(MAIN_FIELDS.map((f) => f.key)).toEqual([
      "energy", "protein", "carbs", "fiber", "sugars", "fat", "saturated_fat", "trans_fat", "cholesterol", "sodium",
    ]);
  });

  it("keeps the field ids the probes and labels use, and gives every field its own", () => {
    expect(MAIN_FIELDS.slice(0, 3).map((f) => f.id)).toEqual(["cf-kcal", "cf-pro", "cf-carbs"]);
    expect(fieldForKey("fat")?.id).toBe("cf-fat");
    expect(fieldForKey("sodium")?.id).toBe("cf-na");
    expect(fieldForKey("vitamin_c")?.id).toBe("cf-vitamin_c");
    const ids = [...MAIN_FIELDS, ...EXTRA_FIELDS].map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("offers every other tracked vitamin and mineral, English names, the four pinned ones first", () => {
    expect(EXTRA_FIELDS).toHaveLength(21);
    expect(EXTRA_FIELDS.some((f) => f.key === "sodium")).toBe(false);
    expect(EXTRA_FIELDS.slice(0, 4).map((f) => f.label)).toEqual(["Calcium", "Iron", "Potassium", "Vitamin D"]);
    expect(PINNED_EXTRA_KEYS).toEqual(["calcium", "iron", "potassium", "vitamin_d"]);
    expect(fieldForKey("magnesium")).toMatchObject({ label: "Magnesium", unit: "mg", group: "minerals" });
    expect(fieldForKey("b12")).toMatchObject({ label: "Vitamin B12", unit: "µg", group: "vitamins" });
    expect(fieldForKey("folate")).toMatchObject({ label: "Folate", unit: "µg", group: "vitamins" });
  });

  it("drops added fields from the list and finds a field by its English or Vietnamese name, with or without marks", () => {
    const left = extraFieldsFor({ added: ["calcium", "zinc"], query: "" });
    expect(left.some((f) => f.key === "calcium" || f.key === "zinc")).toBe(false);
    expect(left).toHaveLength(19);
    expect(extraFieldsFor({ added: [], query: "ma" }).map((f) => f.key)).toEqual(["magnesium", "manganese"]);
    expect(extraFieldsFor({ added: [], query: "Sắt" }).map((f) => f.key)).toEqual(["iron"]);
    expect(extraFieldsFor({ added: [], query: "kem" }).map((f) => f.key)).toEqual(["zinc"]);
    expect(extraFieldsFor({ added: [], query: "b9" }).map((f) => f.key)).toEqual(["folate"]);
    expect(extraFieldsFor({ added: ["iron"], query: "iron" })).toEqual([]);
  });

  it("sends kcal and the macros as before, every other value in micros under its key, blanks left out", () => {
    const payload = customFoodPayload({
      "cf-kcal": "250",
      "cf-pro": "12,5",
      "cf-carbs": "",
      "cf-fiber": "3",
      "cf-sugars": "1.000",
      "cf-fat": " ",
      "cf-chol": "abc",
      "cf-na": "0",
      "cf-vitamin_c": "40",
      "cf-magnesium": "60",
    });
    expect(payload).toEqual({
      calories: 250,
      protein: 12.5,
      carbs: null,
      fat: null,
      micros: { fiber: 3, sugars: 1000, sodium: 0, vitamin_c: 40, magnesium: 60 },
    });
  });

  it("reads only the fields it knows", () => {
    expect(customFoodPayload({ "cf-unknown": "5", "cf-kcal": "" })).toEqual({ calories: null, protein: null, carbs: null, fat: null, micros: {} });
  });
});
