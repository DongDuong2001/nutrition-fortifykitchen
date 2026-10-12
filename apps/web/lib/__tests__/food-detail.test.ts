import { describe, expect, it } from "vitest";
import { goodSourcesOf, microRowsFor } from "../food-detail";
import type { CompleteTargets } from "../targets";

const targets = { calcium: { min: 1000 }, iron: { min: 10 }, zinc: { min: 10 } } as unknown as CompleteTargets;

describe("goodSourcesOf", () => {
  it("includes a nutrient at exactly 20 % and leaves out 19,9 %", () => {
    expect(goodSourcesOf({ calcium: 200 }, 100, targets).map((r) => r.id)).toEqual(["calcium"]);
    expect(goodSourcesOf({ iron: 1.99 }, 100, targets)).toEqual([]);
  });

  it("scales by grams and sorts by share, highest first", () => {
    const rows = goodSourcesOf({ calcium: 200, iron: 4 }, 100, targets);
    expect(rows.map((r) => [r.id, r.pct])).toEqual([
      ["iron", 40],
      ["calcium", 20],
    ]);
    expect(goodSourcesOf({ calcium: 200 }, 50, targets)).toEqual([]);
  });

  it("ignores unknown values and nutrients without a target", () => {
    expect(goodSourcesOf({ calcium: null, selenium: 99 }, 100, targets)).toEqual([]);
  });
});

describe("microRowsFor", () => {
  it("returns the 22 counted nutrients, unknown as null, never 0", () => {
    const { rows, unknown } = microRowsFor({ iron: 2.6, calcium: null }, 60, targets);
    expect(rows).toHaveLength(22);
    expect(unknown).toBe(21);
    const iron = rows.find((r) => r.id === "iron")!;
    expect(iron.value).toBeCloseTo(1.56);
    expect(iron.pct).toBe(16);
    expect(rows.find((r) => r.id === "calcium")).toMatchObject({ value: null, pct: null });
    expect(rows.find((r) => r.id === "selenium")?.value).toBeNull();
  });

  it("a value without a target has no share", () => {
    const { rows } = microRowsFor({ selenium: 10 }, 100, targets);
    expect(rows.find((r) => r.id === "selenium")).toMatchObject({ value: 10, pct: null });
  });
});
