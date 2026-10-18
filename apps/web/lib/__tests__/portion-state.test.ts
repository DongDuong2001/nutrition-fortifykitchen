import { describe, expect, it } from "vitest";
import {
  defaultPortionOf,
  eggParts,
  eggSizes,
  formatPortionLabel,
  parsePortionLabel,
  portionAmountText,
  portionDetail,
  portionHint,
  portionModeOf,
  portionNote,
  portionSummary,
  resolvePortion,
  startPortion,
  withBase,
  withMult,
  type GramPortion,
  type PortionState,
} from "../portion";
import type { FoodItem } from "../mock/foods";

const food = (id: string, nameVi: string, category: FoodItem["category"], servings: FoodItem["servings"], extra: Partial<FoodItem> = {}): FoodItem => ({
  id,
  nameVi,
  category,
  source: "USDA",
  servings,
  nutrients: { energy: 100 },
  ...extra,
});

// Live egg rows (food-research eggs-notes.md): edible grams per size, from the box label weighed with the shell
const egg = food("egg", "Trứng gà luộc", "dam", [
  { label: "1 quả vừa (trứng 50-55 g)", grams: 46.2 },
  { label: "1 quả nhỏ (trứng 45-50 g)", grams: 41.8 },
  { label: "1 quả lớn (trứng 55-60 g)", grams: 50.6 },
  { label: "1 quả rất lớn (trứng 60-65 g)", grams: 55 },
  { label: "100 g", grams: 100 },
]);
const chicken = food("chicken", "Ức gà phi lê", "dam", [{ label: "100 g", grams: 100 }]);
const rice = food("rice", "Cơm trắng (chín)", "tinh_bot", [{ label: "100 g", grams: 100 }, { label: "1 chén lưng", grams: 130 }]);
const banana = food("banana", "Chuối", "trai_cay", [{ label: "1 trái vừa", grams: 118 }, { label: "100 g", grams: 100 }]);
const fishRaw = food("fish-raw", "Cá chép (sống)", "dam", [{ label: "100 g", grams: 100 }]);
const fishCooked = food("fish-cooked", "Cá chép (nấu chín)", "dam", [{ label: "100 g", grams: 100 }]);
const supplement = food("d3", "CanPrev D3 1000 IU", "bo_sung", [{ label: "1 viên", grams: 1 }], { source: "label" });
const dish = food("bun", "Bún chả Hà Nội", "mon_viet", [{ label: "1 phần", grams: 350 }, { label: "100 g", grams: 100 }]);
const redBull = food("rb", "Red Bull", "do_uong", [{ label: "1 lon", grams: 250 }, { label: "100 g", grams: 100 }]);
const recipe = food("mine", "Gà kho gừng", "cua_toi", [{ label: "1 phần", grams: 220 }], { source: "user" });

const grams = (base: number, mult = 1, state: "raw" | "cooked" | null = null): GramPortion => ({ kind: "grams", base, mult, state });

describe("portion math (coach rule 2: ×N multiplies whatever gram amount is set)", () => {
  it("typed 200 × 3 is 600 g; the 100 g chip × 3 is 300 g", () => {
    expect(resolvePortion(banana, withMult(grams(200), 3), null).grams).toBe(600);
    expect(resolvePortion(banana, withMult(withBase(grams(200), 100), 3), null).grams).toBe(300);
  });

  it("typing a new amount keeps N", () => {
    expect(withBase(grams(100, 3), 150)).toEqual(grams(150, 3));
  });

  it("N steps by 1 and never goes under 1", () => {
    expect(withMult(grams(100), 0)).toEqual(grams(100, 1));
    expect(withMult(grams(100), 2.6)).toEqual(grams(100, 3));
  });

  it("hints the product, or how to start", () => {
    expect(portionHint(grams(100, 3))).toBe("100 g × 3 = 300 g");
    expect(portionHint(grams(150))).toBe("Bấm + để nhân 150 g này lên");
  });
});

describe("raw or cooked", () => {
  it("cooked chicken with only raw data logs the raw row at the raw weight (150 g cooked = 214 g raw)", () => {
    const sw = { own: "raw" as const, pair: null, factor: 0.7 };
    const out = resolvePortion(chicken, grams(150, 1, "cooked"), sw);
    expect(out.food).toBe(chicken);
    expect(out.grams).toBeCloseTo(214.3, 1);
    expect(out.label).toBe("Đã nấu chín · 150 g");
  });

  it("dry rice weighed raw logs the cooked row at the cooked weight (80 g dry = 200 g cooked)", () => {
    const sw = { own: "cooked" as const, pair: null, factor: 2.5 };
    const out = resolvePortion(rice, grams(80, 1, "raw"), sw);
    expect(out.food).toBe(rice);
    expect(out.grams).toBe(200);
    expect(out.label).toBe("Cân sống · 80 g");
  });

  it("rice cooked × 3 needs no conversion", () => {
    const sw = { own: "cooked" as const, pair: null, factor: 2.5 };
    expect(resolvePortion(rice, grams(100, 3, "cooked"), sw)).toEqual({ food: rice, grams: 300, label: "Đã nấu chín · 100 g × 3" });
  });

  it("the switch picks the paired food's id, at the same grams", () => {
    const fromRaw = resolvePortion(fishRaw, grams(150, 1, "cooked"), { own: "raw", pair: fishCooked, factor: 0.8 });
    expect(fromRaw.food.id).toBe("fish-cooked");
    expect(fromRaw.grams).toBe(150);
    const fromCooked = resolvePortion(fishCooked, grams(150, 1, "raw"), { own: "cooked", pair: fishRaw, factor: 0.8 });
    expect(fromCooked.food.id).toBe("fish-raw");
  });
});

describe("eggs (Quả: size from the box, how many)", () => {
  it("lists the sizes of the data in order, with the box range", () => {
    expect(eggSizes(egg).map((s) => [s.label, s.hint])).toEqual([
      ["Nhỏ", "45–50 g"],
      ["Vừa", "50–55 g"],
      ["Lớn", "55–60 g"],
      ["Rất lớn", "60–65 g"],
    ]);
  });

  it("3 large eggs are 3 × the large edible grams", () => {
    const out = resolvePortion(egg, { kind: "egg", size: "lớn", count: 3 }, null);
    expect(out.grams).toBeCloseTo(151.8, 1);
    expect(out.label).toBe("Cỡ lớn · 3 quả");
  });

  it("an egg with one size has no size word", () => {
    const quail = food("quail", "Trứng cút", "dam", [{ label: "1 quả (trứng 10-12 g)", grams: 9.9 }, { label: "100 g", grams: 100 }]);
    expect(resolvePortion(quail, { kind: "egg", size: null, count: 5 }, null)).toEqual({ food: quail, grams: 49.5, label: "5 quả" });
  });
});

describe("serving_label: one parseable format, both ways", () => {
  const cases: Array<[PortionState, string]> = [
    [grams(150), "150 g"],
    [grams(100, 3), "100 g × 3"],
    [grams(200, 1, "raw"), "Cân sống · 200 g"],
    [grams(150, 1, "cooked"), "Đã nấu chín · 150 g"],
    [grams(100, 3, "cooked"), "Đã nấu chín · 100 g × 3"],
    [grams(2.5), "2,5 g"],
    [grams(1200), "1.200 g"],
    [{ kind: "egg", size: "lớn", count: 3 }, "Cỡ lớn · 3 quả"],
    [{ kind: "egg", size: "rất lớn", count: 1 }, "Cỡ rất lớn · 1 quả"],
    [{ kind: "egg", size: null, count: 2 }, "2 quả"],
  ];
  it.each(cases)("%o is written %s and read back", (state, label) => {
    expect(formatPortionLabel(state)).toBe(label);
    expect(parsePortionLabel(label)).toEqual(state);
  });

  it("reads nothing it did not write", () => {
    expect(parsePortionLabel("1 trái vừa")).toBeNull();
    expect(parsePortionLabel("2 viên")).toBeNull();
    expect(parsePortionLabel("1 lon")).toBeNull();
    expect(parsePortionLabel("")).toBeNull();
  });
});

describe("startPortion (editing reopens the same state; old entries fall back to grams)", () => {
  it("parses a label it wrote", () => {
    expect(startPortion(chicken, "Đã nấu chín · 150 g", 214.3)).toEqual(grams(150, 1, "cooked"));
    expect(startPortion(egg, "Cỡ lớn · 3 quả", 151.8)).toEqual({ kind: "egg", size: "lớn", count: 3 });
  });

  it("an old unit entry opens as its grams", () => {
    expect(startPortion(banana, "1 trái vừa", 118)).toEqual(grams(118));
    expect(startPortion(rice, "1 chén lưng", 130)).toEqual(grams(130));
  });

  it("an old egg entry opens in Quả at its size and count", () => {
    expect(startPortion(egg, "2 quả vừa (trứng 50-55 g)", 92.4)).toEqual({ kind: "egg", size: "vừa", count: 2 });
    expect(startPortion(egg, "1 quả lớn (trứng 55-60 g)", 50.6)).toEqual({ kind: "egg", size: "lớn", count: 1 });
  });

  it("an egg weighed in grams stays in grams", () => {
    expect(startPortion(egg, "120 g", 120)).toEqual(grams(120));
  });
});

describe("portionModeOf (coach rule 5: exceptions keep their unit)", () => {
  it("supplements, món Việt, cans and recipes keep units", () => {
    expect(portionModeOf(supplement)).toBe("units");
    expect(portionModeOf(dish)).toBe("units");
    expect(portionModeOf(redBull)).toBe("units");
    expect(portionModeOf(recipe)).toBe("units");
  });

  it("eggs go by the piece, everything else by grams", () => {
    expect(portionModeOf(egg)).toBe("egg");
    expect(portionModeOf(banana)).toBe("grams");
    expect(portionModeOf(chicken)).toBe("grams");
    expect(portionModeOf(food("w", "Lòng trắng trứng gà", "dam", [{ label: "1 lòng trắng", grams: 33 }]))).toBe("grams");
  });
});

describe("Hôm nay shows the label's amount and its detail", () => {
  it("the amount is what the user set, not the logged raw weight", () => {
    expect(portionAmountText("Đã nấu chín · 150 g")).toBe("150 g");
    expect(portionAmountText("Đã nấu chín · 100 g × 3")).toBe("300 g");
    expect(portionAmountText("Cỡ lớn · 3 quả")).toBe("3 quả");
    expect(portionAmountText("2 viên")).toBeNull();
  });

  it("the detail says how it was weighed", () => {
    expect(portionDetail("Cân sống · 200 g", 200)).toBe("Cân sống");
    expect(portionDetail("Đã nấu chín · 100 g × 3", 300)).toBe("Đã nấu chín · 100 g × 3");
    expect(portionDetail("Đã nấu chín · 150 g", 214.3)).toBe("Đã nấu chín · bằng 214 g lúc sống");
    expect(portionDetail("Cân sống · 80 g", 200)).toBe("Cân sống · bằng 200 g lúc chín");
    expect(portionDetail("100 g × 3", 300)).toBe("100 g × 3");
    expect(portionDetail("Cỡ lớn · 3 quả", 151.8)).toBe("Cỡ lớn");
    expect(portionDetail("150 g", 150)).toBeNull();
    expect(portionDetail("2 viên", 2)).toBeNull();
  });
});

describe("the kcal card's summary and note", () => {
  const rawSw = { own: "raw" as const, pair: null, factor: 0.7 };
  const cookedSw = { own: "cooked" as const, pair: null, factor: 2.5 };
  it("summarises the portion", () => {
    expect(portionSummary({ kind: "egg", size: "lớn", count: 3 }, null)).toBe("3 quả lớn");
    expect(portionSummary(grams(100, 3, "cooked"), cookedSw)).toBe("300 g đã nấu chín");
    expect(portionSummary(grams(200), rawSw)).toBe("200 g lúc sống");
    expect(portionSummary(grams(150), null)).toBe("150 g");
  });

  it("explains a conversion and how eggs are weighed", () => {
    expect(portionNote(grams(150, 1, "cooked"), rawSw, 214.3)).toBe("Món chín nhẹ hơn lúc sống, nên 150 g chín bằng khoảng 214 g sống. App tính theo số đó cho bạn.");
    expect(portionNote(grams(80, 1, "raw"), cookedSw, 200)).toBe("80 g lúc sống nấu xong thành khoảng 200 g. App tính theo số đó cho bạn.");
    expect(portionNote(grams(300, 1, "cooked"), cookedSw, 300)).toBe("300 g chín là khoảng 120 g trước khi nấu.");
    expect(portionNote(grams(150, 1, "raw"), rawSw, 150)).toBe("Cân lúc đã nấu chín thì chọn Đã nấu chín.");
    expect(portionNote({ kind: "egg", size: "lớn", count: 3 }, null, 151.8)).toBe("Hộp ghi cân cả vỏ, app tự trừ vỏ khi tính.");
    expect(portionNote(grams(120), null, 120, true)).toBe("Bóc vỏ rồi cân thì nhập số gam ở đây.");
    expect(portionNote(grams(120), null, 120)).toBeNull();
  });
});

describe("eggParts and defaultPortionOf", () => {
  const white = food("w", "Lòng trắng trứng gà", "dam", [{ label: "1 lòng trắng", grams: 33 }]);
  const yolk = food("y", "Lòng đỏ trứng gà", "dam", [{ label: "1 lòng đỏ", grams: 17 }]);
  const rawEgg = food("raw-egg", "Trứng gà (sống)", "dam", egg.servings);
  const catalog = [egg, rawEgg, white, yolk];

  it("Cả quả is the egg itself; on a white it is the raw egg", () => {
    expect(eggParts(egg, catalog).map((p) => [p.label, p.food.id, p.active])).toEqual([
      ["Cả quả", "egg", true],
      ["Lòng trắng", "w", false],
      ["Lòng đỏ", "y", false],
    ]);
    expect(eggParts(white, catalog).map((p) => [p.label, p.food.id, p.active])).toEqual([
      ["Cả quả", "raw-egg", false],
      ["Lòng trắng", "w", true],
      ["Lòng đỏ", "y", false],
    ]);
    expect(eggParts(chicken, catalog)).toEqual([]);
  });

  it("a food starts at its gram portion in its own state, an egg at one medium, a unit food at its first portion", () => {
    expect(defaultPortionOf(chicken)).toEqual({ food: chicken, grams: 100, label: "Cân sống · 100 g" });
    expect(defaultPortionOf(banana)).toEqual({ food: banana, grams: 100, label: "100 g" });
    expect(defaultPortionOf(egg)).toEqual({ food: egg, grams: 46.2, label: "Cỡ vừa · 1 quả" });
    expect(defaultPortionOf(supplement)).toEqual({ label: "1 viên", grams: 1 });
  });
});
