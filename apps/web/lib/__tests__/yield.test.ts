import { describe, expect, it } from "vitest";
import { COOKED_PER_RAW, cookStateOf, cookSwitchFor, nameStem, ownCookState, yieldGroupOf } from "../yield";
import type { FoodItem } from "../mock/foods";

const food = (id: string, nameVi: string, category: FoodItem["category"] = "dam"): FoodItem => ({
  id,
  nameVi,
  category,
  source: "USDA",
  servings: [{ label: "100 g", grams: 100 }],
  nutrients: { energy: 100 },
});

describe("cookStateOf (the state a food's name says)", () => {
  it("reads raw and cooked markers", () => {
    expect(cookStateOf("Cá chép (sống)")).toBe("raw");
    expect(cookStateOf("Cá lóc (cá quả, sống)")).toBe("raw");
    expect(cookStateOf("Đậu đen (hạt khô)")).toBe("raw");
    expect(cookStateOf("Mì ý (khô)")).toBe("raw");
    expect(cookStateOf("Cá chép (nấu chín)")).toBe("cooked");
    expect(cookStateOf("Cơm trắng (chín)")).toBe("cooked");
    expect(cookStateOf("Khoai lang luộc")).toBe("cooked");
    expect(cookStateOf("Cá hồi (Atlantic, nuôi) nấu chín")).toBe("cooked");
    expect(cookStateOf("Ức gà phi lê")).toBeNull();
  });
});

describe("yieldGroupOf", () => {
  it("puts meat, fish, rice, pasta and noodles in their group", () => {
    expect(yieldGroupOf(food("a", "Ức gà phi lê"))).toBe("meat");
    expect(yieldGroupOf(food("a", "Thịt bò nạc"))).toBe("meat");
    expect(yieldGroupOf(food("a", "Cá hồi"))).toBe("fish");
    expect(yieldGroupOf(food("a", "Cơm trắng (chín)", "tinh_bot"))).toBe("rice");
    expect(yieldGroupOf(food("a", "Gạo trắng", "tinh_bot"))).toBe("rice");
    expect(yieldGroupOf(food("a", "Mì ý (khô)", "tinh_bot"))).toBe("pasta");
    expect(yieldGroupOf(food("a", "Bún khô", "tinh_bot"))).toBe("noodle");
  });

  it("leaves eggs, tofu, processed meat and other groups out", () => {
    expect(yieldGroupOf(food("a", "Trứng gà"))).toBeNull();
    expect(yieldGroupOf(food("a", "Đậu hũ trắng"))).toBeNull();
    expect(yieldGroupOf(food("a", "Chả lụa"))).toBeNull();
    expect(yieldGroupOf(food("a", "Cá ngừ đóng hộp"))).toBeNull();
    expect(yieldGroupOf(food("a", "Yến mạch", "tinh_bot"))).toBeNull();
    expect(yieldGroupOf(food("a", "Chuối", "trai_cay"))).toBeNull();
  });

  it("uses the coach's starting factors", () => {
    expect(COOKED_PER_RAW).toEqual({ meat: 0.7, fish: 0.8, rice: 2.5, pasta: 2.25, noodle: 2.5 });
  });
});

describe("ownCookState", () => {
  it("takes the name's marker, else cơm is cooked and the rest raw", () => {
    expect(ownCookState(food("a", "Cá chép (nấu chín)"))).toBe("cooked");
    expect(ownCookState(food("a", "Cơm gạo lứt", "tinh_bot"))).toBe("cooked");
    expect(ownCookState(food("a", "Ức gà phi lê"))).toBe("raw");
  });
});

describe("nameStem", () => {
  it("drops the state so a raw row and its cooked row match", () => {
    expect(nameStem("Cá lóc (cá quả, sống)")).toBe(nameStem("Cá lóc (nấu chín)"));
    expect(nameStem("Bún khô")).toBe(nameStem("Bún khô (luộc)"));
    expect(nameStem("Củ dền sống")).toBe(nameStem("Củ dền luộc"));
    expect(nameStem("Cá chép (sống)")).not.toBe(nameStem("Cá chim (nấu chín)"));
  });
});

describe("cookSwitchFor", () => {
  const raw = food("raw", "Cá chép (sống)");
  const cooked = food("cooked", "Cá chép (nấu chín)");
  const grilled = food("grilled", "Cá chép (nướng)");
  const catalog = [raw, grilled, cooked, food("x", "Cá chim (nấu chín)")];

  it("finds the paired row, preferring nấu chín", () => {
    expect(cookSwitchFor(raw, catalog, true)).toEqual({ own: "raw", pair: cooked, factor: 0.8 });
    expect(cookSwitchFor(cooked, catalog, true)?.pair).toBe(raw);
  });

  it("falls back to the yield factor when the pair cannot be swapped in", () => {
    expect(cookSwitchFor(raw, catalog, false)).toEqual({ own: "raw", pair: null, factor: 0.8 });
  });

  it("has a factor for chicken with no cooked row", () => {
    expect(cookSwitchFor(food("g", "Ức gà phi lê"), [], true)).toEqual({ own: "raw", pair: null, factor: 0.7 });
  });

  it("shows no switch where raw or cooked does not matter or nothing converts", () => {
    expect(cookSwitchFor(food("b", "Chuối", "trai_cay"), [], true)).toBeNull();
    expect(cookSwitchFor(food("y", "Yến mạch", "tinh_bot"), [], true)).toBeNull();
    expect(cookSwitchFor(food("e", "Trứng gà"), [], true)).toBeNull();
    // A vegetable pair is not one the coach asked for
    const cabbage = food("c1", "Bắp cải (sống)", "rau");
    expect(cookSwitchFor(cabbage, [cabbage, food("c2", "Bắp cải (luộc)", "rau")], true)).toBeNull();
  });

  it("keeps tubers and legumes when they have a pair", () => {
    const beans = food("d1", "Đậu đen (hạt khô)");
    const boiled = food("d2", "Đậu đen (luộc)");
    expect(cookSwitchFor(beans, [beans, boiled], true)?.pair).toBe(boiled);
    const tuber = food("t1", "Củ từ (sống)", "tinh_bot");
    const tuberCooked = food("t2", "Củ từ (luộc)", "tinh_bot");
    expect(cookSwitchFor(tuber, [tuber, tuberCooked], true)).toEqual({ own: "raw", pair: tuberCooked, factor: null });
  });
});

describe("cookState in the data wins over the name", () => {
  it("the roasted chicken breast (FDC 171477) is cooked though its name says nothing", () => {
    expect(ownCookState({ ...food("g", "Ức gà phi lê"), cookState: "cooked" })).toBe("cooked");
  });
});
