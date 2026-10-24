import { describe, expect, it } from "vitest";
import { goalDayFrom } from "../goal-day";
import { goalsMet } from "../goals";
import type { MockDayData } from "../mock/sample-day";

// feat/sound-goals §3: the day's numbers as Hôm nay's hero and column read them, in the shape lib/goals takes.

const stat = (key: string, consumed: number | null, targetMin: number | null) => ({ key, consumed, targetMin });
const day = {
  calories: { consumed: 2000, targetMin: 2000 },
  macros: [stat("carbs", 250, 250), stat("protein", 100, 150), stat("fat", 70, 70), stat("fiber", 30, 30)],
  minerals: [stat("iron", 12, 10), stat("zinc", 5, 10), stat("selenium", 99, 100)],
  vitamins: [stat("vitamin_c", 80, 80)],
} as unknown as MockDayData;

describe("goalDayFrom", () => {
  it("reads kcal against its low end, the macros, Chất xơ, and the Level's counted nutrients", () => {
    const g = goalDayFrom(day, ["iron", "zinc", "vitamin_c"]);
    expect(g.kcal).toEqual({ value: 2000, target: 2000 });
    expect(g.macros).toEqual({ carbs: { value: 250, target: 250 }, protein: { value: 100, target: 150 }, fat: { value: 70, target: 70 } });
    expect(g.fiber).toEqual({ value: 30, target: 30 });
    expect(Object.keys(g.column)).toEqual(["iron", "zinc", "vitamin_c"]);
    expect(g.column.zinc).toEqual({ value: 5, target: 10 });
    expect(g.training).toBe(false);
  });
  it("a nutrient the Level does not count is not in the column", () => {
    expect(Object.keys(goalDayFrom(day, ["iron"]).column)).toEqual(["iron"]);
  });
  it("a nutrient the day does not list is unknown, never reached", () => {
    const g = goalDayFrom(day, ["iron", "mystery"]);
    expect(g.column.mystery).toEqual({ value: null, target: null });
    expect(goalsMet(g)).not.toContain("column");
  });
  it("goalsMet over it: the hero, Chất xơ and the column as the bars round them", () => {
    expect(goalsMet(goalDayFrom(day, ["iron", "vitamin_c"]))).toEqual(["kcal", "macro:carbs", "macro:fat", "fiber", "iron", "vitamin_c", "column"]);
  });
  it("Ngày tập is whatever the caller says", () => {
    expect(goalDayFrom(day, [], true).training).toBe(true);
  });
});
