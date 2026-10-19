import { describe, expect, it } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { isAmount } from "../amount";
import { countAt, shouldCount } from "../count-up";
import { sumKcal } from "../kcal";
import { calculateSegments, getLevel, homeSegments } from "../levels";
import { calculateNutrientPercentage } from "../nutrients";
import { totalsFromEntries } from "../day-totals";
import { sumEntries, type HomeEntry } from "../home";
import { trayTotals } from "../tray";
import { amountsOfNumbers } from "../diary-edits";
import { LevelBar } from "@/components/ui/level-bar";
import type { AddedDiaryEntry } from "../diary-edits";
import type { FoodItem } from "../mock/foods";

const BAD = [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, -1];

describe("isAmount (cc-63, B4)", () => {
  it("is a finite number of 0 or more", () => {
    expect([0, 1, 2.5, 1e6].every(isAmount)).toBe(true);
    expect([...BAD, null, undefined, "3", {}].some(isAmount)).toBe(false);
  });
});

describe("sums skip NaN, Infinity and negative values", () => {
  it("sumKcal", () => {
    expect(sumKcal([100, ...BAD, 50])).toBe(150);
    expect(sumKcal(BAD)).toBeNull();
    expect(sumKcal([Number.NaN, null])).toBeNull();
    expect(sumKcal([0])).toBe(0);
  });

  it("a day's totals from entries", () => {
    const entry = (over: Partial<AddedDiaryEntry>): AddedDiaryEntry =>
      ({ id: "a", kind: "food", foodId: "f", foodName: "Cơm", grams: 100, displayQty: "100 g", mealSlot: "lunch", calories: 100, protein: 5, carbs: 20, fat: 1, fiber: 1, nutrients: { calcium: 10 }, addedAt: "2026-10-19T10:00:00+07:00", ...over }) as AddedDiaryEntry;
    const totals = totalsFromEntries("2026-10-19", [
      entry({}),
      entry({ id: "b", calories: Number.NaN, protein: Number.POSITIVE_INFINITY, carbs: -20, nutrients: { calcium: Number.NaN } }),
    ]);
    expect(totals.calories).toBe(100);
    expect(totals.protein).toBe(5);
    expect(totals.carbs).toBe(20);
    expect(totals.nutrients.calcium).toBe(10);
    const none = totalsFromEntries("2026-10-19", [entry({ calories: Number.NaN, nutrients: { calcium: Number.NaN } })]);
    expect(none.calories).toBeNull();
    expect(none.nutrients.calcium).toBeNull();
  });

  it("the home sum", () => {
    const e = (kcal: number | null, protein: number | null): HomeEntry => ({ kcal, protein, carbs: null, fat: null, fiber: null, nutrients: {} }) as unknown as HomeEntry;
    const sum = sumEntries([e(100, 5), e(Number.NaN, Number.POSITIVE_INFINITY), e(-5, -1)]);
    expect(sum.kcal).toBe(100);
    expect(sum.protein).toBe(5);
  });

  it("the tray: a food with a NaN energy makes the total unknown, not 0 or NaN", () => {
    const food = (energy: number): FoodItem => ({ id: `f${energy}`, nameVi: "Món", category: "dam", source: "USDA", servings: [{ label: "100 g", grams: 100 }], nutrients: { energy, protein: energy } });
    expect(trayTotals([{ food: food(100), grams: 100, label: "100 g" }]).kcal).toBe(100);
    for (const bad of BAD) {
      const t = trayTotals([{ food: food(100), grams: 100, label: "100 g" }, { food: food(bad), grams: 100, label: "100 g" }]);
      expect(t.kcal).toBeNull();
      expect(t.protein === null || Number.isFinite(t.protein)).toBe(true);
    }
  });

  it("an entry's amounts", () => {
    const a = amountsOfNumbers({ calories: Number.NaN, protein: Number.POSITIVE_INFINITY, carbs: -3, fat: 2, fiber: null, nutrients: { iron: Number.NaN, zinc: 1 } } as never);
    expect(a).toMatchObject({ calories: 0, protein: 0, carbs: 0, fat: 2, fiber: 0 });
    expect(a.nutrients).toEqual({ zinc: 1 });
  });
});

describe("levels and bars", () => {
  it("a NaN is the lowest level and no segments", () => {
    expect(getLevel(Number.NaN)).toBe("thieu");
    expect(getLevel(-10)).toBe("thieu");
    expect(getLevel(Number.POSITIVE_INFINITY)).toBe("dat");
    expect(calculateSegments(Number.NaN)).toBe(0);
    expect(homeSegments(Number.NaN)).toBe(0);
    expect(calculateSegments(-5)).toBe(0);
  });

  it("a percentage of a NaN or an Infinity is unknown", () => {
    expect(calculateNutrientPercentage(Number.NaN, 100)).toBeNull();
    expect(calculateNutrientPercentage(50, Number.POSITIVE_INFINITY)).toBeNull();
    expect(calculateNutrientPercentage(50, 100)).toBe(50);
  });

  it("LevelBar draws no NaN: an empty track", () => {
    for (const bad of [Number.NaN, Number.POSITIVE_INFINITY, -20]) {
      const html = renderToStaticMarkup(React.createElement(LevelBar, { label: "Canxi", pct: bad, heightClass: "h-[9px]" }));
      expect(html).not.toContain("NaN");
      expect(html).toContain("translateX(-100%)");
    }
    const nan = renderToStaticMarkup(React.createElement(LevelBar, { label: "Canxi", pct: Number.NaN, heightClass: "h-[9px]" }));
    expect(nan).toContain("Chưa có dữ liệu");
  });
});

describe("count-up", () => {
  it("never loops on NaN: no count to or from a value that is not a finite number", () => {
    expect(shouldCount(0, Number.NaN)).toBe(false);
    expect(shouldCount(Number.NaN, Number.NaN)).toBe(false);
    expect(shouldCount(10, Number.POSITIVE_INFINITY)).toBe(false);
    expect(shouldCount(Number.NaN, 5)).toBe(false);
    expect(shouldCount(null, 5)).toBe(false);
    expect(shouldCount(5, 5)).toBe(false);
    expect(shouldCount(5, 6)).toBe(true);
  });

  it("countAt lands on a non-finite end at once", () => {
    expect(countAt(0, Number.NaN, 10)).toBeNaN();
    expect(countAt(Number.NaN, 5, 10)).toBe(5);
  });
});
