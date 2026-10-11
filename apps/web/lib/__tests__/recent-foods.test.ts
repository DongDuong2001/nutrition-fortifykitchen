import { describe, it, expect } from "vitest";
import { MOCK_FOODS } from "../mock/foods";
import { DEFAULT_RECENT_FOODS, pushRecent, resolveRecent } from "../recent-foods";

describe("resolveRecent", () => {
  it("uses the grams of a saved serving", () => {
    const resolved = resolveRecent({ foodId: "food-yen-mach", servingLabel: "60 g" }, MOCK_FOODS);
    expect(resolved?.food.id).toBe("food-yen-mach");
    expect(resolved?.grams).toBe(60);
    expect(resolved?.label).toBe("60 g");
  });

  it("reads grams from a custom amount label such as 45 g", () => {
    const resolved = resolveRecent({ foodId: "food-yen-mach", servingLabel: "45 g" }, MOCK_FOODS);
    expect(resolved?.grams).toBe(45);
    expect(resolved?.label).toBe("45 g");
  });

  it("returns null when the food no longer exists", () => {
    expect(resolveRecent({ foodId: "food-gone", servingLabel: "60 g" }, MOCK_FOODS)).toBeNull();
  });

  it("falls back to the first serving for a label it cannot read", () => {
    const resolved = resolveRecent({ foodId: "food-chuoi", servingLabel: "2 quả lớn" }, MOCK_FOODS);
    expect(resolved?.label).toBe("1 quả");
    expect(resolved?.grams).toBe(100);
  });

  it("resolves every default recent", () => {
    for (const recent of DEFAULT_RECENT_FOODS) {
      expect(resolveRecent(recent, MOCK_FOODS), recent.foodId).not.toBeNull();
    }
  });
});

describe("pushRecent", () => {
  it("puts the newest first and removes the same food and serving", () => {
    const list = [
      { foodId: "food-chuoi", servingLabel: "1 quả" },
      { foodId: "food-yen-mach", servingLabel: "60 g" },
    ];
    expect(pushRecent(list, { foodId: "food-yen-mach", servingLabel: "60 g" })).toEqual([
      { foodId: "food-yen-mach", servingLabel: "60 g" },
      { foodId: "food-chuoi", servingLabel: "1 quả" },
    ]);
  });

  it("keeps the same food with a different serving", () => {
    const list = pushRecent([{ foodId: "food-yen-mach", servingLabel: "60 g" }], {
      foodId: "food-yen-mach",
      servingLabel: "100 g",
    });
    expect(list).toHaveLength(2);
  });

  it("keeps at most 8 recents", () => {
    let list: { foodId: string; servingLabel: string }[] = [];
    for (let i = 0; i < 10; i++) {
      list = pushRecent(list, { foodId: `food-${i}`, servingLabel: "1 g" });
    }
    expect(list).toHaveLength(8);
    expect(list[0].foodId).toBe("food-9");
  });
});
