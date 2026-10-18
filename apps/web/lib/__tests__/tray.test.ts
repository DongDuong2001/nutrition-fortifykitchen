import { describe, expect, it } from "vitest";
import type { FoodItem } from "../mock/foods";
import { canAddTray, inTray, patchTrayItem, putInTray, removeFromTray, setTrayPortion, toggleTray, trayTotals, type TrayItem } from "../tray";

const food = (id: string, nutrients: Record<string, number | null>, servings = [{ label: "1 chén", grams: 200 }, { label: "100 g", grams: 100 }]): FoodItem => ({
  id,
  nameVi: id,
  category: "tinh_bot" as FoodItem["category"],
  source: "USDA",
  servings,
  nutrients,
});

const rice = food("rice", { energy: 130, protein: 2.7, carbs: 28, fat: 0.3 });
const egg = food("egg", { energy: 150, protein: 12, carbs: 1, fat: 10 }, [{ label: "1 quả", grams: 50 }]);
const mystery = food("mystery", { energy: null, protein: 5, carbs: null, fat: null });

describe("tray (the multi-add list on /add)", () => {
  it("toggling a food puts it in at its default portion (cc-53b: grams, 100 g), toggling again takes it out", () => {
    const one = toggleTray([], rice);
    expect(one).toEqual([{ food: rice, grams: 100, label: "100 g" }]);
    expect(inTray(one, "rice")).toBe(true);
    expect(toggleTray(one, rice)).toEqual([]);
  });

  it("a food with no serving falls back to 100 g", () => {
    expect(toggleTray([], food("x", { energy: 10 }, []))[0]).toMatchObject({ grams: 100, label: "100 g" });
  });

  it("keeps the order foods were added in", () => {
    const tray = toggleTray(toggleTray([], rice), egg);
    expect(tray.map((i) => i.food.id)).toEqual(["rice", "egg"]);
  });

  it("putInTray adds with the chosen portion, and replaces the portion of a food already there (no duplicate)", () => {
    const first = putInTray([], rice, 150, "150 g");
    expect(first).toEqual([{ food: rice, grams: 150, label: "150 g" }]);
    const again = putInTray(toggleTray(first, egg), rice, 300, "300 g");
    expect(again.map((i) => [i.food.id, i.grams])).toEqual([["rice", 300], ["egg", 100]]);
  });

  it("setTrayPortion changes one item and leaves the rest", () => {
    const tray = toggleTray(toggleTray([], rice), egg);
    const changed = setTrayPortion(tray, "rice", 100, "100 g");
    expect(changed[0]).toMatchObject({ grams: 100, label: "100 g" });
    expect(changed[1]).toEqual(tray[1]);
  });

  it("removeFromTray drops one item", () => {
    const tray = toggleTray(toggleTray([], rice), egg);
    expect(removeFromTray(tray, "rice").map((i) => i.food.id)).toEqual(["egg"]);
  });

  it("totals add up each item at its portion: 200 g rice + 50 g egg", () => {
    const tray: TrayItem[] = [
      { food: rice, grams: 200, label: "1 chén" },
      { food: egg, grams: 50, label: "1 quả" },
    ];
    expect(trayTotals(tray)).toEqual({ count: 2, kcal: 335, protein: 11.4, carbs: 56.5, fat: 5.6 });
  });

  it("an empty tray has no totals to show", () => {
    expect(trayTotals([])).toEqual({ count: 0, kcal: null, protein: null, carbs: null, fat: null });
  });

  it("unknown energy stays unknown: the kcal total is null, never a sum that treats it as 0", () => {
    const tray: TrayItem[] = [
      { food: rice, grams: 200, label: "1 chén" },
      { food: mystery, grams: 100, label: "100 g" },
    ];
    const totals = trayTotals(tray);
    expect(totals.kcal).toBeNull();
    expect(totals.protein).toBe(10.4);
    expect(totals.carbs).toBe(56);
  });

  it("a tray with a food that has no energy cannot be added", () => {
    expect(canAddTray([{ food: rice, grams: 200, label: "1 chén" }])).toBe(true);
    expect(canAddTray([{ food: mystery, grams: 100, label: "100 g" }])).toBe(false);
    expect(canAddTray([])).toBe(false);
  });
});

describe("cc-53b: editing the tray", () => {
  it("an item cleared to 0 g blocks the add (it would log an empty entry)", () => {
    const tray = toggleTray(toggleTray([], rice), egg);
    expect(canAddTray(tray)).toBe(true);
    expect(canAddTray(patchTrayItem(tray, "egg", { grams: 0 }))).toBe(false);
  });

  it("swapping in a pair already in the tray merges into it: no food twice", () => {
    const cooked = food("rice-cooked", { energy: 130 });
    const tray = [...toggleTray([], rice), { food: cooked, grams: 50, label: "50 g" }];
    const out = patchTrayItem(tray, "rice", { food: cooked, grams: 300, label: "Đã nấu chín · 100 g × 3" });
    expect(out).toEqual([{ food: cooked, grams: 300, label: "Đã nấu chín · 100 g × 3" }]);
  });

  it("swapping in a new pair replaces the food in place", () => {
    const cooked = food("rice-cooked", { energy: 130 });
    const out = patchTrayItem(toggleTray(toggleTray([], rice), egg), "rice", { food: cooked });
    expect(out.map((i) => i.food.id)).toEqual(["rice-cooked", "egg"]);
  });
});
