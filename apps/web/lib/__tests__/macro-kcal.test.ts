import { describe, expect, it } from "vitest";
import { HERO_MACRO_LABEL, macroKcal, toggleMacro } from "../macro-kcal";
import { groupMeals, pctOf, sumEntries, type HomeEntry } from "../home";

// The share of the kcal shown is the hero's pctOf (a whole percent, null when unknown or nothing was eaten)
const macroKcalShare = pctOf;

const entry = (id: string, slot: HomeEntry["slot"], kcal: number | null, protein: number | null, carbs: number | null, fat: number | null): HomeEntry =>
  ({ id, name: id, qty: "100 g", grams: 100, slot, kcal, protein, carbs, fat, fiber: null, nutrients: {}, quick: false }) as HomeEntry;

describe("macroKcal", () => {
  it("đạm and tinh bột 4 kcal/g, chất béo 9 kcal/g, whole kcal", () => {
    expect(macroKcal("protein", 154)).toBe(616);
    expect(macroKcal("carbs", 191)).toBe(764);
    expect(macroKcal("fat", 77)).toBe(693);
    expect(macroKcal("fat", 12.4)).toBe(112);
    expect(macroKcal("protein", 0)).toBe(0);
  });

  it("unknown grams give no kcal, never 0", () => {
    expect(macroKcal("carbs", null)).toBeNull();
    expect(macroKcal("carbs", Number.NaN)).toBeNull();
  });

  it("the share of the kcal shown, whole; the three are not forced to add up to 100", () => {
    expect(macroKcalShare(616, 2153)).toBe(29);
    const shares = [macroKcal("carbs", 191), macroKcal("protein", 154), macroKcal("fat", 77)].map((k) => macroKcalShare(k, 2153));
    expect(shares).toEqual([35, 29, 32]);
    expect(shares.reduce((a, b) => a! + b!, 0)).not.toBe(100);
    expect(macroKcalShare(null, 2153)).toBeNull();
    expect(macroKcalShare(100, 0)).toBeNull();
    expect(macroKcalShare(100, null)).toBeNull();
  });

  it("per meal: the macro grams of the meal give its kcal", () => {
    const entries = [entry("a", "breakfast", 400, 30, 50, 10), entry("b", "breakfast", 200, 10, 20, 5), entry("c", "lunch", 500, 40, 60, 15)];
    const breakfast = groupMeals(entries).find((m) => m.slot === "breakfast")!;
    const t = sumEntries(breakfast.entries);
    expect(macroKcal("protein", t.protein)).toBe(160);
    expect(macroKcal("fat", t.fat)).toBe(135);
    expect(macroKcalShare(macroKcal("protein", t.protein), t.kcal)).toBe(27);
  });

  it("a meal whose foods have no macro data: unknown, not 0", () => {
    const t = sumEntries([entry("q", "snack", 300, null, null, null)]);
    expect(macroKcal("carbs", t.carbs)).toBeNull();
  });
});

describe("select and clear", () => {
  it("a tap picks a macro, the same tap clears it, another tap switches", () => {
    expect(toggleMacro(null, "protein")).toBe("protein");
    expect(toggleMacro("protein", "protein")).toBeNull();
    expect(toggleMacro("protein", "fat")).toBe("fat");
    expect(HERO_MACRO_LABEL).toEqual({ carbs: "Tinh bột", protein: "Đạm", fat: "Chất béo" });
  });
});
