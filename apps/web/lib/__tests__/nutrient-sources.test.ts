import { describe, expect, it } from "vitest";
import { nutrientSourcesIn } from "../nutrient-sources";
import { MOCK_FOODS, type FoodItem } from "../mock/foods";
import { SAMPLE_ITEMS, type AddedDiaryEntry, type SampleEdits, type SampleItemInfo } from "../diary-edits";

const oats = MOCK_FOODS.find((f) => f.nameVi === "Yến mạch") as FoodItem;

// Oats: 138 mg magnesium per 100 g
const oatsItem: SampleItemInfo = {
  item: { id: "item-1", name: "Yến mạch", qty: "60 g", kcal: 228 },
  mealSlot: "breakfast",
  food: oats,
  grams: 60,
};

function added(id: string, foodName: string, magnesium: number | null): AddedDiaryEntry {
  return {
    id,
    foodId: `food-${id}`,
    foodName,
    grams: 100,
    displayQty: "100 g",
    mealSlot: "lunch",
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
    nutrients: { magnesium },
    addedAt: "2026-10-10T05:00:00.000Z",
  };
}

describe("nutrientSourcesIn", () => {
  it("lists a sample item with its share of the nutrient, scaled by grams", () => {
    const sources = nutrientSourcesIn([], {}, "magnesium", [oatsItem]);
    expect(sources).toHaveLength(1);
    expect(sources[0].id).toBe("item-1");
    expect(sources[0].name).toBe("Yến mạch");
    expect(sources[0].qty).toBe("60 g");
    expect(sources[0].amount).toBeCloseTo(82.8, 5);
  });

  it("uses the edited grams of a sample item", () => {
    const sources = nutrientSourcesIn([], { "item-1": { grams: 100 } }, "magnesium", [oatsItem]);
    expect(sources[0].qty).toBe("100 g");
    expect(sources[0].amount).toBeCloseTo(138, 5);
  });

  it("leaves out a deleted sample item", () => {
    expect(nutrientSourcesIn([], { "item-1": { deleted: true } }, "magnesium", [oatsItem])).toEqual([]);
  });

  it("includes added entries with their own amount and quantity", () => {
    const sources = nutrientSourcesIn([added("e-1", "Hạt điều", 20)], {}, "magnesium", []);
    expect(sources).toMatchObject([{ id: "e-1", name: "Hạt điều", qty: "100 g", amount: 20 }]);
  });

  it("drops zero and unknown amounts, so a dash is never a 0 source", () => {
    const sources = nutrientSourcesIn(
      [added("e-zero", "Nước lọc", 0), added("e-null", "Cà phê", null)],
      {},
      "magnesium",
      []
    );
    expect(sources).toEqual([]);
  });

  it("sorts the largest contributor first", () => {
    const sources = nutrientSourcesIn([added("e-small", "Chuối", 27), added("e-big", "Hạt bí", 150)], {}, "magnesium", [
      oatsItem,
    ]);
    expect(sources.map((s) => s.id)).toEqual(["e-big", "item-1", "e-small"]);
  });
});

// The 18/10 integration of hotfix/gia-vi and cc-51: the sources sheet and the last portion follow the supplement rules
import { portionLabel } from "../home";
import { unitCountOf } from "../portion";
import { lastPortionOf } from "../recent-foods";
import { recentForMeal } from "../meal-shortlists";

describe("a label supplement in cc-51's views", () => {
  const capsule = {
    id: "supp-mag",
    nameVi: "Magnesium bisglycinate",
    category: "bo_sung",
    source: "label",
    servings: [{ label: "1 viên", grams: 1 }],
    nutrients: { energy: 0, magnesium: 20000 },
  } as unknown as FoodItem;
  const entry = (over: Partial<AddedDiaryEntry> = {}): AddedDiaryEntry => ({
    id: "e-supp", foodId: "supp-mag", foodName: "Magnesium bisglycinate", grams: 2, displayQty: "2 viên", mealSlot: "breakfast",
    calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, nutrients: { magnesium: 400 }, addedAt: "2026-10-18T01:00:00Z", ...over,
  });

  it("the nutrient sources sheet shows 2 viên, never a gram figure", () => {
    MOCK_FOODS.push(capsule);
    try {
      const [source] = nutrientSourcesIn([entry()], {}, "magnesium", []);
      expect(portionLabel({ qty: source.qty, grams: source.grams, foodId: source.foodId })).toBe("2 viên");
    } finally {
      MOCK_FOODS.splice(MOCK_FOODS.indexOf(capsule), 1);
    }
  });

  it("the last portion opens as 1 viên × 2 (the stepper), from Gần đây and from the recents", () => {
    MOCK_FOODS.push(capsule);
    try {
      const [shortlisted] = recentForMeal([entry()], "breakfast");
      expect(shortlisted).toEqual({ foodId: "supp-mag", servingLabel: "2 viên", grams: 2 });
      const last = lastPortionOf("supp-mag", [{ foodId: "supp-mag", servingLabel: "2 viên" }], MOCK_FOODS);
      const read = unitCountOf(capsule.servings, last?.label ?? "", last?.grams ?? 0);
      expect(read).toEqual({ serving: { label: "1 viên", grams: 1 }, count: 2 });
    } finally {
      MOCK_FOODS.splice(MOCK_FOODS.indexOf(capsule), 1);
    }
  });
});

// Hotfix 23/10: the card lists what the page total adds up from, one row per food
import { sourcesAgree, sourcesSum } from "../nutrient-sources";
import { computeCompositeDayData } from "../diary-store";
import { blankDay } from "../day-history";
import { nutrientOnDay } from "../nutrient-detail";
import { getNutrientDefinition } from "../nutrients";
import { SAMPLE_DAY, type MockDayData } from "../mock/sample-day";
import { contribDay } from "./contrib-day-fixture";

const logged = (id: string, over: Partial<AddedDiaryEntry>): AddedDiaryEntry => ({
  ...added(id, "Thịt bò nạc", 12),
  foodId: "beef",
  nutrients: { magnesium: 12 },
  ...over,
});

describe("the same food logged more than once is one row", () => {
  it("merges two entries of one food and one portion form: amounts and grams add, the label says how many times", () => {
    const sources = nutrientSourcesIn([logged("a", {}), logged("b", {})], {}, "magnesium", []);
    expect(sources).toHaveLength(1);
    expect(sources[0]).toMatchObject({ name: "Thịt bò nạc", qty: "200 g · 2 lần", amount: 24, grams: 200 });
  });

  it("labels the merged portion the way Hôm nay does: a volume stays in ml, a count of eggs in quả", () => {
    const milk = nutrientSourcesIn(
      [logged("a", { foodId: "m", displayQty: "200 ml", grams: 200 }), logged("b", { foodId: "m", displayQty: "330 ml", grams: 330 })],
      {}, "magnesium", []
    );
    expect(milk[0].qty).toBe("530 ml · 2 lần");
    const eggs = nutrientSourcesIn(
      [logged("a", { foodId: "e", displayQty: "Cỡ lớn · 2 quả", grams: 120 }), logged("b", { foodId: "e", displayQty: "Cỡ lớn · 3 quả", grams: 180 })],
      {}, "magnesium", []
    );
    expect(eggs[0].qty).toBe("5 quả · 2 lần");
  });

  it("counts three entries as 3 lần", () => {
    expect(nutrientSourcesIn(["a", "b", "c"].map((id) => logged(id, {})), {}, "magnesium", [])[0].qty).toBe("300 g · 3 lần");
  });

  it("keeps different forms of one food apart: raw and cooked, grams and ml, an egg size", () => {
    const sources = nutrientSourcesIn(
      [
        logged("raw", { displayQty: "Cân sống · 100 g" }),
        logged("cooked", { displayQty: "Đã nấu chín · 100 g" }),
        logged("plain", { displayQty: "100 g" }),
        logged("ml", { displayQty: "100 ml" }),
      ],
      {}, "magnesium", []
    );
    expect(sources.map((s) => s.id).sort()).toEqual(["cooked", "ml", "plain", "raw"]);
    expect(sources.every((s) => !s.qty.includes("lần"))).toBe(true);
  });

  it("keeps two foods apart even when they share a name only by id: another foodId is another row", () => {
    const sources = nutrientSourcesIn([logged("a", {}), logged("b", { foodId: "beef-2" })], {}, "magnesium", []);
    expect(sources).toHaveLength(2);
  });

  it("merges quick entries by name", () => {
    const quick = (id: string, name: string): AddedDiaryEntry => ({ ...logged(id, { foodName: name, displayQty: "300 kcal", grams: 0 }), kind: "quick", foodId: "" });
    const sources = nutrientSourcesIn([quick("a", "Bún bò"), quick("b", "Bún bò"), quick("c", "Phở")], {}, "magnesium", []);
    expect(sources.map((s) => [s.name, s.qty])).toEqual([["Bún bò", "600 kcal · 2 lần"], ["Phở", "300 kcal"]]);
  });

  it("merges a sample item with an added entry of the same food, and sorts the merged row by its sum", () => {
    const sources = nutrientSourcesIn(
      [{ ...added("e-oats", "Yến mạch", 40), foodId: oats.id }, added("e-big", "Hạt bí", 150)],
      {}, "magnesium", [oatsItem]
    );
    expect(sources.map((s) => [s.name, s.qty])).toEqual([["Hạt bí", "100 g"], ["Yến mạch", "160 g · 2 lần"]]);
  });

  it("leaves a lone entry exactly as it was", () => {
    const [only] = nutrientSourcesIn([added("e-1", "Hạt điều", 20)], {}, "magnesium", []);
    expect(only).toMatchObject({ id: "e-1", qty: "100 g", amount: 20 });
  });
});

describe("a day with 24 entries (the 23/10 report): the rows add up to the page", () => {
  const entries = contribDay();
  const hero = (key: string) => {
    const day = computeCompositeDayData(blankDay(SAMPLE_DAY), entries, {});
    return nutrientOnDay(day, getNutrientDefinition(key)!)?.consumed as number;
  };

  it("the page says 103 g of fat", () => {
    expect(entries).toHaveLength(24);
    expect(hero("fat")).toBe(103);
  });

  it("lists each food once, largest first; Thịt bò nạc is one row", () => {
    const sources = nutrientSourcesIn(entries, {}, "fat", []);
    expect(sources.map((s) => s.name)).toEqual([
      "Quả bơ", "Thịt bò nạc", "Kefir", "Trứng gà", "Hạt bí", "Phô mai", "Hàu", "Vinamilk Flex", "Cơm trắng",
    ]);
    expect(sources.find((s) => s.name === "Thịt bò nạc")).toMatchObject({ qty: "200 g · 2 lần", amount: 24 });
  });

  it("the two Kefir entries are both grams, so they merge; a Kefir in ml would not", () => {
    expect(nutrientSourcesIn(entries, {}, "fat", []).find((s) => s.name === "Kefir")).toMatchObject({ qty: "540 g · 2 lần" });
    const withMl = entries.map((e) => (e.id === "tu-12" ? { ...e, displayQty: "180 ml" } : e));
    const kefirs = nutrientSourcesIn(withMl, {}, "fat", []).filter((s) => s.name === "Kefir");
    expect(kefirs.map((s) => s.qty).sort()).toEqual(["180 ml", "360 g"]);
  });

  it("the unrounded rows add up to the hero within its own rounding", () => {
    const sources = nutrientSourcesIn(entries, {}, "fat", []);
    expect(sourcesSum(sources)).toBeCloseTo(102.94, 5);
    expect(sourcesAgree(sources, hero("fat"))).toBe(true);
  });

  it("fails when the rows and the total read different entries", () => {
    const sources = nutrientSourcesIn(entries.slice(1), {}, "fat", []);
    expect(sourcesAgree(sources, hero("fat"))).toBe(false);
  });
});

describe("the sources and the day total read the same entries (sample edits and deletes included)", () => {
  const entries = [added("e-1", "Hạt điều", 20), added("e-2", "Chuối", 27)];
  const total = (edits: SampleEdits, base: MockDayData = SAMPLE_DAY) =>
    nutrientOnDay(computeCompositeDayData(base, entries, edits), getNutrientDefinition("magnesium")!)?.consumed as number;

  it("every sample item deleted: the day is the added entries alone, and so are the rows", () => {
    const edits = Object.fromEntries(SAMPLE_ITEMS.map((i) => [i.item.id, { deleted: true }]));
    expect(sourcesAgree(nutrientSourcesIn(entries, edits, "magnesium", SAMPLE_ITEMS), total(edits))).toBe(true);
  });

  it("an empty base day (live): entries only", () => {
    expect(sourcesAgree(nutrientSourcesIn(entries, {}, "magnesium", []), total({}, blankDay(SAMPLE_DAY)))).toBe(true);
  });

  it.each([["deleted", { deleted: true }], ["set to 200 g", { grams: 200 }]])(
    "a sample item %s moves the rows and the total by the same amount (the total is a whole number, so within 1)",
    (_name, edit) => {
      const item = SAMPLE_ITEMS.find((i) => i.food && i.grams !== null && typeof i.food.nutrients.magnesium === "number")!;
      const edits = { [item.item.id]: edit };
      const rows = (e: typeof edits) => sourcesSum(nutrientSourcesIn(entries, e, "magnesium", SAMPLE_ITEMS));
      const rowsMove = rows({}) - rows(edits);
      const totalMove = total({}) - total(edits);
      expect(rowsMove).not.toBe(0);
      expect(Math.abs(rowsMove - totalMove)).toBeLessThanOrEqual(1);
    }
  );
});

// Job A (hero hold): the foods behind Tinh bột, Đạm, Chất béo and Chất xơ, in grams
describe("macro sources", () => {
  const macro = (id: string, name: string, over: Partial<AddedDiaryEntry>): AddedDiaryEntry => ({
    id, foodId: `food-${id}`, foodName: name, grams: 100, displayQty: "100 g", mealSlot: "lunch",
    calories: 100, protein: 0, carbs: 0, fat: 0, fiber: 0, nutrients: {}, addedAt: "2026-10-10T05:00:00.000Z", ...over,
  });

  it("lists the foods that add to a macro, largest first, in grams", () => {
    const rows = [macro("a", "Ức gà", { protein: 31, nutrients: { protein: 31 } }), macro("b", "Trứng", { protein: 12.6, nutrients: { protein: 12.6 } })];
    expect(nutrientSourcesIn(rows, {}, "protein", []).map((s) => [s.id, s.amount])).toEqual([["a", 31], ["b", 12.6]]);
  });

  it("leaves out a food with no value for it (null or 0), never a 0 row", () => {
    const rows = [macro("a", "Nước", { protein: null, nutrients: {} }), macro("b", "Dầu ăn", { protein: 0, fat: 14, nutrients: { protein: 0, fat: 14 } })];
    expect(nutrientSourcesIn(rows, {}, "protein", [])).toEqual([]);
    expect(nutrientSourcesIn(rows, {}, "fat", []).map((s) => s.id)).toEqual(["b"]);
  });

  it("a quick kcal entry (macros typed, no nutrient record) is a source, so the rows add up to the hero", () => {
    const quick = macro("q", "Bữa ngoài", { kind: "quick", protein: 18, carbs: 40, fat: 9, fiber: 3, nutrients: {} });
    const rows = [quick, macro("a", "Ức gà", { protein: 31, nutrients: { protein: 31 } })];
    for (const [key, total] of [["protein", 49], ["carbs", 40], ["fat", 9], ["fiber", 3]] as const) {
      expect(sourcesAgree(nutrientSourcesIn(rows, {}, key, []), total), key).toBe(true);
    }
  });

  it("reads a sample item through its edits, unrounded like the other nutrients", () => {
    const [source] = nutrientSourcesIn([], { "item-1": { grams: 100 } }, "carbs", [oatsItem]);
    expect(source.amount).toBeCloseTo(oats.nutrients.carbs ?? 0, 5);
  });
});
