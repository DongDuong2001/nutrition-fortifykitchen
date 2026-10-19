import { describe, it, expect } from "vitest";
import { COUNTED_NUTRIENT_KEYS } from "../day-totals";
import { parseDecimalInput, quickDetail, quickEntryFrom } from "../quick-entry";

const base = { name: "", kcal: "350", protein: "", carbs: "", fat: "" };
const make = (patch: Partial<typeof base>) => quickEntryFrom({ ...base, ...patch }, "lunch", "quick-1", "2026-10-13T12:00:00.000Z");

describe("parseDecimalInput", () => {
  it("reads a comma or a dot", () => {
    expect(parseDecimalInput("2,5")).toBe(2.5);
    expect(parseDecimalInput("2.5")).toBe(2.5);
    expect(parseDecimalInput(" 350 ")).toBe(350);
  });

  it("gives null for blank, text or a negative number", () => {
    expect(parseDecimalInput("")).toBeNull();
    expect(parseDecimalInput("abc")).toBeNull();
    expect(parseDecimalInput("-4")).toBeNull();
  });

  it("keeps zero as zero", () => {
    expect(parseDecimalInput("0")).toBe(0);
  });
});

describe("quickEntryFrom", () => {
  it("needs kcal above zero", () => {
    expect(make({ kcal: "" }).ok).toBe(false);
    expect(make({ kcal: "0" }).ok).toBe(false);
    expect(make({ kcal: "abc" }).ok).toBe(false);
  });

  it("refuses kcal that would be stored as 0", () => {
    expect(make({ kcal: "0,4" }).ok).toBe(false);
    expect(make({ kcal: "0,5" }).ok).toBe(true);
  });

  it("names it Thêm nhanh when no name is given", () => {
    const r = make({});
    expect(r.ok && r.entry.foodName).toBe("Thêm nhanh");
    expect(r.ok && r.entry.displayQty).toBe("Thêm nhanh");
    expect(r.ok && r.entry.kind).toBe("quick");
  });

  it("keeps a given name and the macros, with a comma decimal", () => {
    const r = make({ name: " Bánh mì ", kcal: "350", protein: "10,5", carbs: "30", fat: "4" });
    expect(r.ok && r.entry).toMatchObject({ foodName: "Bánh mì", calories: 350, protein: 10.5, carbs: 30, fat: 4, mealSlot: "lunch" });
  });

  it("rounds kcal to a whole number like every other entry", () => {
    const r = make({ kcal: "349,6" });
    expect(r.ok && r.entry.calories).toBe(350);
  });

  it("leaves every counted micronutrient unknown (null), never 0", () => {
    const r = make({});
    if (!r.ok) throw new Error("expected ok");
    for (const key of COUNTED_NUTRIENT_KEYS) expect(r.entry.nutrients[key]).toBeNull();
    expect(Object.values(r.entry.nutrients).every((v) => v === null)).toBe(true);
  });

  it("stores a blank macro and fibre as null (unknown), never 0", () => {
    const r = make({});
    if (!r.ok) throw new Error("expected ok");
    expect(r.entry.protein).toBeNull();
    expect(r.entry.carbs).toBeNull();
    expect(r.entry.fat).toBeNull();
    expect(r.entry.fiber).toBeNull();
  });

  it("keeps a typed 0 as 0, and a blank next to a typed value as null", () => {
    const r = make({ protein: "0", carbs: "12,5", fat: "" });
    if (!r.ok) throw new Error("expected ok");
    expect(r.entry.protein).toBe(0);
    expect(r.entry.carbs).toBe(12.5);
    expect(r.entry.fat).toBeNull();
  });

  it("rejects a bad macro", () => {
    expect(make({ protein: "x" }).ok).toBe(false);
    expect(make({ fat: "-1" }).ok).toBe(false);
  });
});

describe("quickDetail", () => {
  it("shows — for an unknown macro and the value for a known one", () => {
    expect(quickDetail({ protein: null, carbs: null, fat: null })).toBe("Đạm — · Tinh bột — · Chất béo —");
    expect(quickDetail({ protein: 12.5, carbs: 0, fat: null })).toBe("Đạm 12,5 g · Tinh bột 0 g · Chất béo —");
  });
});

describe("quick entry limits (cc-63, B5)", () => {
  const input = { name: "", kcal: "500", protein: "", carbs: "", fat: "" };
  const make = (patch: Partial<typeof input>) => quickEntryFrom({ ...input, ...patch }, "breakfast", "id-1", "2026-10-19T08:00:00+07:00");

  it("takes up to 9.999 kcal and says so above", () => {
    expect(make({ kcal: "9999" }).ok).toBe(true);
    expect(make({ kcal: "9.999" }).ok).toBe(true);
    expect(make({ kcal: "10000" })).toEqual({ ok: false, field: "kcal", message: "Tối đa 9.999 kcal" });
  });

  it("rejects half-numbers and exponents", () => {
    expect(make({ kcal: "12abc" }).ok).toBe(false);
    expect(make({ kcal: "1e3" }).ok).toBe(false);
    expect(make({ kcal: "500", protein: "1e3" }).ok).toBe(false);
  });

  it("keeps a name to 80 characters, counting an emoji as one", () => {
    const r = make({ name: "a".repeat(100) });
    expect(r.ok && Array.from(r.entry.foodName).length).toBe(80);
    const emoji = make({ name: "🍜".repeat(90) });
    expect(emoji.ok && Array.from(emoji.entry.foodName).length).toBe(80);
  });
});
