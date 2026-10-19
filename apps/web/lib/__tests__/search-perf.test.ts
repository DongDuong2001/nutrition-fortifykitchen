import { describe, expect, it } from "vitest";
import type { FoodItem } from "../mock/foods";
import { searchFoods } from "../search";

// cc-58: a query against a live-size catalogue (6,000 foods) must not take a frame budget of its own. The bound is loose
// (CI machines are slow); the numbers in the PR come from running this file's loop with the old and the new search.
const WORDS = ["cá", "lóc", "gà", "bò", "heo", "rau", "muống", "cải", "xanh", "cơm", "phở", "bún", "chả", "nướng", "luộc", "chiên", "canh", "chua", "trứng", "đậu", "hũ", "sữa", "yến", "mạch", "chuối", "cam", "bưởi", "xoài"];
function catalogue(n: number): FoodItem[] {
  const foods: FoodItem[] = [];
  for (let i = 0; i < n; i++) {
    const name = i % 50 === 0 ? `Cá lóc nướng ${i}` : [0, 1, 2].map((k) => WORDS[(i * (k + 3) + k * 7) % WORDS.length]).join(" ") + ` ${i}`;
    foods.push({ id: `f${i}`, nameVi: name, category: "khac" as FoodItem["category"], source: "USDA", servings: [{ label: "100 g", grams: 100 }], nutrients: { energy: i % 400 } });
  }
  return foods;
}

describe("searchFoods on a live-size catalogue (cc-58)", () => {
  const foods = catalogue(6000);

  it("answers a keystroke well inside a frame budget once the folded forms exist", () => {
    searchFoods(foods, "c"); // the first query of a session folds every name once
    const times: number[] = [];
    for (const q of ["ca", "cá", "cá l", "cá lóc"]) {
      const t0 = performance.now();
      const found = searchFoods(foods, q);
      times.push(performance.now() - t0);
      expect(found.length).toBeGreaterThan(0);
    }
    times.sort((a, b) => a - b);
    const median = times[Math.floor(times.length / 2)];
    console.log(`search 6000 foods, median of 4 keystrokes: ${median.toFixed(1)} ms (max ${times[times.length - 1].toFixed(1)} ms)`);
    expect(median).toBeLessThan(120);
  });

  it("keeps the order: the exact name first, then whole words, then the shorter name", () => {
    const small: FoodItem[] = [
      { id: "a", nameVi: "Bột quế", category: "khac" as FoodItem["category"], source: "USDA", servings: [], nutrients: {} },
      { id: "b", nameVi: "Quả bơ", category: "khac" as FoodItem["category"], source: "USDA", servings: [], nutrients: {} },
      { id: "c", nameVi: "Bơ", category: "khac" as FoodItem["category"], source: "USDA", servings: [], nutrients: {} },
    ];
    expect(searchFoods(small, "bơ").map((f) => f.id)).toEqual(["c", "b", "a"]);
  });
});
