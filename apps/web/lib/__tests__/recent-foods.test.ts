import { describe, it, expect } from "vitest";
import { MOCK_FOODS } from "../mock/foods";
import { DEFAULT_RECENT_FOODS, lastPortionOf, pushRecent, resolveRecent } from "../recent-foods";

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
    const resolved = resolveRecent({ foodId: "food-chuoi", servingLabel: "không rõ" }, MOCK_FOODS);
    expect(resolved?.label).toBe("100 g");
    expect(resolved?.grams).toBe(100);
  });

  it("resolves unit amounts like 2 trái lớn (a food that keeps its units: cc-67 took them off fruit)", () => {
    const fruit = { ...MOCK_FOODS.find((f) => f.id === "food-chuoi")!, servings: [{ label: "1 trái vừa", grams: 118 }, { label: "1 trái lớn", grams: 136 }, { label: "100 g", grams: 100 }] };
    const resolved = resolveRecent({ foodId: "food-chuoi", servingLabel: "2 trái lớn" }, [fruit]);
    expect(resolved?.label).toBe("2 trái lớn");
    expect(resolved?.grams).toBe(272);
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

describe("lastPortionOf", () => {
  const recents = [
    { foodId: "food-chuoi", servingLabel: "1 quả" },
    { foodId: "food-yen-mach", servingLabel: "45 g" },
    { foodId: "food-yen-mach", servingLabel: "60 g" },
  ];

  it("gives the newest portion used for the food", () => {
    const last = lastPortionOf("food-yen-mach", recents, MOCK_FOODS);
    expect(last?.label).toBe("45 g");
    expect(last?.grams).toBe(45);
  });

  it("gives null for a food with no history, so the portion panel opens instead", () => {
    expect(lastPortionOf("food-cha-la", recents, MOCK_FOODS)).toBeNull();
    expect(lastPortionOf("food-chuoi", [], MOCK_FOODS)).toBeNull();
  });

  it("gives null when the food is gone", () => {
    expect(lastPortionOf("food-gone", [{ foodId: "food-gone", servingLabel: "1" }], MOCK_FOODS)).toBeNull();
  });
});
