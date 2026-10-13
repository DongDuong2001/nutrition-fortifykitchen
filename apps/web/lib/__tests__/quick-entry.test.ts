import { describe, it, expect } from "vitest";
import { COUNTED_NUTRIENT_KEYS } from "../day-totals";
import { parseDecimalInput, quickEntryFrom } from "../quick-entry";

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

  it("names it Ghi nhanh when no name is given", () => {
    const r = make({});
    expect(r.ok && r.entry.foodName).toBe("Ghi nhanh");
    expect(r.ok && r.entry.displayQty).toBe("Ghi nhanh");
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

  it("treats a blank macro as 0 g and a bad macro as an error", () => {
    const ok = make({ protein: "" });
    expect(ok.ok && ok.entry.protein).toBe(0);
    expect(make({ protein: "x" }).ok).toBe(false);
  });
});
