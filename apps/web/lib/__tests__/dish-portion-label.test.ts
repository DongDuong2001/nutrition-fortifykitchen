import { describe, expect, it } from "vitest";
import { portionDetailOf, portionLabel } from "../home";
import { portionDetail, withoutServingHint } from "../portion";
import { addCatalogFood, type FoodItem } from "../mock/foods";

// fix/dish-portion-label (21/10): a premade dish logged as "1 phần" showed its whole serving label in the amount column
// ("1 phần (495 g, gồm 46 g mắm tôm)"), so the name was squeezed to one letter per line. The amount is the short part;
// the "(…)" part is the line under the name on Hôm nay.
const LABEL = "1 phần (495 g, gồm 46 g mắm tôm)";
const dish = {
  id: "food-test-bun-dau-mam-tom",
  nameVi: "Bún đậu mắm tôm",
  category: "mon_viet",
  source: "recipe_calc",
  servings: [{ label: "100 g", grams: 100 }, { label: LABEL, grams: 495 }],
  nutrients: { energy: 164.657 },
} as unknown as FoodItem;
addCatalogFood(dish);

describe("withoutServingHint", () => {
  it("drops a trailing (…) part", () => {
    expect(withoutServingHint(LABEL)).toBe("1 phần");
    expect(withoutServingHint("1 ly lớn (350 ml)")).toBe("1 ly lớn");
    expect(withoutServingHint("2 viên (liều trên nhãn)")).toBe("2 viên");
  });

  it("keeps a text without one", () => {
    expect(withoutServingHint("1 phần")).toBe("1 phần");
    expect(withoutServingHint("150 g")).toBe("150 g");
    expect(withoutServingHint("Bún (sợi tươi) xào")).toBe("Bún (sợi tươi) xào");
  });
});

describe("portionLabel: the amount column shows the short amount", () => {
  it("1 phần of a dish", () => {
    expect(portionLabel({ foodId: dish.id, qty: LABEL, grams: 495 })).toBe("1 phần");
  });

  it("2 phần of a dish", () => {
    expect(portionLabel({ foodId: dish.id, qty: LABEL, grams: 990 })).toBe("2 phần");
    expect(portionLabel({ foodId: dish.id, qty: "2 phần (495 g, gồm 46 g mắm tôm)", grams: 990 })).toBe("2 phần");
  });

  it("the grams the user set stay grams", () => {
    expect(portionLabel({ foodId: dish.id, qty: "300 g", grams: 300 })).toBe("300 g");
  });

  it("a typed portion with no grams", () => {
    expect(portionLabel({ foodId: "food-unknown", qty: LABEL, grams: null })).toBe("1 phần");
  });

  it("an edited dish (· đã chỉnh) logged as 1 phần", () => {
    expect(portionLabel({ foodId: dish.id, qty: "1 phần", grams: 495 })).toBe("1 phần");
  });
});

describe("portionDetail: the (…) part is the line under the name", () => {
  it("1 phần (495 g, gồm 46 g mắm tôm)", () => {
    expect(portionDetail(LABEL, 495)).toBe("495 g · gồm 46 g mắm tôm");
  });

  it("several of the portion: the hint is per portion", () => {
    expect(portionDetail(LABEL, 990, 2)).toBe("Mỗi phần: 495 g · gồm 46 g mắm tôm");
    expect(portionDetailOf({ foodId: dish.id, qty: LABEL, grams: 990 })).toBe("Mỗi phần: 495 g · gồm 46 g mắm tôm");
    // The label already says two: shown as written, so the hint is for both
    expect(portionDetailOf({ foodId: dish.id, qty: "2 phần (495 g, gồm 46 g mắm tôm)", grams: 990 })).toBe("495 g · gồm 46 g mắm tôm");
  });

  it("a label with no unit word of its own (1 dĩa 8 cái, live catalogue)", () => {
    const khot = { ...dish, id: "food-test-banh-khot", servings: [{ label: "1 dĩa 8 cái (205 g, gồm rau sống và 44 g nước mắm)", grams: 205 }] } as FoodItem;
    addCatalogFood(khot);
    const qty = khot.servings[0].label;
    expect(portionLabel({ foodId: khot.id, qty, grams: 205 })).toBe("1 dĩa 8 cái");
    expect(portionDetailOf({ foodId: khot.id, qty, grams: 205 })).toBe("205 g · gồm rau sống và 44 g nước mắm");
    expect(portionLabel({ foodId: khot.id, qty, grams: 410 })).toBe("2 dĩa 8 cái");
    expect(portionDetailOf({ foodId: khot.id, qty, grams: 410 })).toBe("Mỗi dĩa 8 cái: 205 g · gồm rau sống và 44 g nước mắm");
  });

  it("a hint of words starts with a capital; a decimal comma is no list", () => {
    expect(portionDetail("2 viên (liều trên nhãn)", 2)).toBe("Liều trên nhãn");
    expect(portionDetail("1 muỗng (2,5 g)", 2.5)).toBe("2,5 g");
  });

  it("nothing for a label without one", () => {
    expect(portionDetail("1 phần", 495)).toBeNull();
    expect(portionDetailOf({ foodId: dish.id, qty: "1 phần", grams: 495 })).toBeNull();
  });

  it("the weighing lines are unchanged", () => {
    expect(portionDetail("Đã nấu chín · 100 g × 3", 300)).toBe("Đã nấu chín · 100 g × 3");
    expect(portionDetail("150 g", 150)).toBeNull();
  });
});
