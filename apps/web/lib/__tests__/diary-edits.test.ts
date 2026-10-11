import { describe, it, expect } from "vitest";
import { SAMPLE_DAY, type MockDayData } from "../mock/sample-day";
import { MOCK_FOODS } from "../mock/foods";
import { computeCompositeDayData } from "../diary-store";
import {
  type AddedDiaryEntry,
  type DiaryEdits,
  dismissUndoIn,
  deleteEntryIn,
  entryNumbers,
  findEntry,
  parseAddedEntries,
  parseSampleEdits,
  resolveSampleItems,
  SAMPLE_ITEMS,
  undoDeleteIn,
  updateEntryIn,
} from "../diary-edits";

const EMPTY: DiaryEdits = { added: [], sample: {}, undo: null };

function addedEntry(id: string, foodId: string, grams: number, mealSlot: AddedDiaryEntry["mealSlot"]): AddedDiaryEntry {
  const food = MOCK_FOODS.find((f) => f.id === foodId)!;
  const n = entryNumbers(food, grams);
  return {
    id,
    foodId,
    foodName: food.nameVi,
    grams,
    displayQty: `${grams} g`,
    mealSlot,
    calories: n.calories,
    protein: n.protein,
    carbs: n.carbs,
    fat: n.fat,
    fiber: n.fiber,
    nutrients: n.nutrients,
    addedAt: "2026-10-11T00:00:00.000Z",
  };
}

// A day whose one item is not in MOCK_FOODS, so it cannot change portion
const UNKNOWN_MEALS: MockDayData["meals"] = [
  { id: "meal-lunch", slot: "lunch", name: "Bữa trưa", kcal: 5, items: [{ id: "item-x", name: "Món lạ", qty: "1 g", kcal: 5 }] },
];
const UNKNOWN_SAMPLES = resolveSampleItems({ meals: UNKNOWN_MEALS });

const mealKcal = (day: MockDayData, slot: string) => day.meals.find((m) => m.slot === slot)!.kcal;

describe("sample items", () => {
  it("resolves all seven sample items to a food by name", () => {
    expect(SAMPLE_ITEMS.map((s) => s.item.id)).toEqual(["item-1", "item-2", "item-3", "item-4", "item-5", "item-6", "item-7"]);
    for (const s of SAMPLE_ITEMS) {
      expect(s.food, s.item.name).not.toBeNull();
      expect(s.grams, s.item.name).not.toBeNull();
    }
  });

  it("each sample item's kcal matches its food table at the sample grams", () => {
    // This is what lets an edit change calories by the right amount
    for (const s of SAMPLE_ITEMS) {
      expect(entryNumbers(s.food!, s.grams!).calories, s.item.name).toBe(s.item.kcal);
    }
  });

  it("does not resolve a name that is not in MOCK_FOODS", () => {
    expect(UNKNOWN_SAMPLES[0].food).toBeNull();
    expect(UNKNOWN_SAMPLES[0].grams).toBeNull();
  });
});

describe("parseAddedEntries", () => {
  it("reads nothing, bad JSON, or a value that is not a list as no entries", () => {
    expect(parseAddedEntries(null)).toEqual([]);
    expect(parseAddedEntries("[oops")).toEqual([]);
    expect(parseAddedEntries("{}")).toEqual([]);
  });

  it("keeps the entries that have an id and drops the rest", () => {
    const good = addedEntry("entry-1", "food-chuoi", 100, "snack");
    const raw = JSON.stringify([good, null, 5, { foodId: "x" }]);
    expect(parseAddedEntries(raw)).toEqual([JSON.parse(JSON.stringify(good))]);
  });
});

describe("parseSampleEdits", () => {
  it("reads nothing, or bad JSON, as no edits", () => {
    expect(parseSampleEdits(null)).toEqual({});
    expect(parseSampleEdits("{oops")).toEqual({});
  });

  it("drops values that are not valid edits", () => {
    const raw = JSON.stringify({
      "item-1": { grams: -5, mealSlot: "moon", deleted: "yes" },
      "item-2": { deleted: true },
    });
    expect(parseSampleEdits(raw)).toEqual({ "item-2": { deleted: true } });
  });
});

describe("findEntry", () => {
  it("finds an added entry with its food and amount", () => {
    const edits: DiaryEdits = { ...EMPTY, added: [addedEntry("entry-1", "food-cha-la", 30, "snack")] };
    const view = findEntry(edits, "entry-1");
    expect(view?.name).toBe("Chà là");
    expect(view?.grams).toBe(30);
    expect(view?.canChangePortion).toBe(true);
  });

  it("finds a sample item in its sample meal, with its sample amount", () => {
    const view = findEntry(EMPTY, "item-1");
    expect(view?.name).toBe("Yến mạch");
    expect(view?.mealSlot).toBe("breakfast");
    expect(view?.servingLabel).toBe("60 g");
    expect(view?.kcal).toBe(228);
  });

  it("returns null for an unknown id", () => {
    expect(findEntry(EMPTY, "nope")).toBeNull();
  });

  it("does not find a deleted sample item", () => {
    const edits: DiaryEdits = { ...EMPTY, sample: { "item-3": { deleted: true } } };
    expect(findEntry(edits, "item-3")).toBeNull();
  });

  it("finds an item that cannot change portion, and says why", () => {
    const view = findEntry(EMPTY, "item-x", UNKNOWN_SAMPLES);
    expect(view?.canChangePortion).toBe(false);
    expect(view?.portionNote).not.toBeNull();
  });
});

describe("updateEntryIn", () => {
  it("changes the portion of a sample item and keeps its meal", () => {
    const next = updateEntryIn(EMPTY, "item-1", { grams: 90, servingLabel: "90 g" });
    const view = findEntry(next, "item-1");
    expect(view?.grams).toBe(90);
    expect(view?.servingLabel).toBe("90 g");
    expect(view?.kcal).toBe(342);
    expect(view?.mealSlot).toBe("breakfast");
  });

  it("moves a sample item to another meal without changing its portion", () => {
    const next = updateEntryIn(EMPTY, "item-1", { mealSlot: "dinner" });
    const view = findEntry(next, "item-1");
    expect(view?.mealSlot).toBe("dinner");
    expect(view?.servingLabel).toBe("60 g");
    expect(view?.kcal).toBe(228);
  });

  it("recomputes an added entry when its portion changes", () => {
    const start: DiaryEdits = { ...EMPTY, added: [addedEntry("entry-1", "food-cha-la", 30, "snack")] };
    const next = updateEntryIn(start, "entry-1", { grams: 60, servingLabel: "60 g" });
    expect(next.added[0].grams).toBe(60);
    expect(next.added[0].displayQty).toBe("60 g");
    expect(next.added[0].calories).toBe(168);
  });

  it("ignores a portion change for an item that cannot change portion", () => {
    const next = updateEntryIn(EMPTY, "item-x", { grams: 5, servingLabel: "5 g" }, UNKNOWN_SAMPLES);
    expect(next.sample["item-x"]?.grams).toBeUndefined();
  });

  it("does nothing for an unknown id", () => {
    expect(updateEntryIn(EMPTY, "nope", { grams: 10 })).toEqual(EMPTY);
  });
});

describe("deleteEntryIn and undoDeleteIn", () => {
  const three: DiaryEdits = {
    ...EMPTY,
    added: [
      addedEntry("entry-a", "food-cha-la", 30, "snack"),
      addedEntry("entry-b", "food-chuoi", 100, "snack"),
      addedEntry("entry-c", "food-yen-mach", 60, "breakfast"),
    ],
  };

  it("removes an added entry and remembers its position", () => {
    const next = deleteEntryIn(three, "entry-b");
    expect(next.added.map((e) => e.id)).toEqual(["entry-a", "entry-c"]);
    expect(next.undo).toMatchObject({ kind: "added", index: 1, name: "Chuối" });
  });

  it("undo puts an added entry back in its place", () => {
    const next = undoDeleteIn(deleteEntryIn(three, "entry-b"));
    expect(next.added.map((e) => e.id)).toEqual(["entry-a", "entry-b", "entry-c"]);
    expect(next.undo).toBeNull();
  });

  it("deletes a sample item by flag, and undo removes the flag", () => {
    const deleted = deleteEntryIn(EMPTY, "item-2");
    expect(findEntry(deleted, "item-2")).toBeNull();
    const restored = undoDeleteIn(deleted);
    expect(findEntry(restored, "item-2")?.name).toBe("Yogurt kefir");
    expect(restored.sample["item-2"]?.deleted).toBeUndefined();
  });

  it("only the last delete can be undone", () => {
    const afterTwo = deleteEntryIn(deleteEntryIn(three, "entry-a"), "entry-b");
    const restored = undoDeleteIn(afterTwo);
    expect(restored.added.map((e) => e.id)).toEqual(["entry-b", "entry-c"]);
    expect(restored.undo).toBeNull();
  });

  it("cannot undo after the toast is dismissed", () => {
    const dismissed = dismissUndoIn(deleteEntryIn(three, "entry-b"));
    expect(dismissed.undo).toBeNull();
    expect(undoDeleteIn(dismissed).added.map((e) => e.id)).toEqual(["entry-a", "entry-c"]);
  });

  it("does nothing for an unknown id", () => {
    expect(deleteEntryIn(EMPTY, "nope")).toEqual(EMPTY);
  });
});

describe("totals follow the edits", () => {
  const base = computeCompositeDayData(SAMPLE_DAY, [], {});
  const chala = entryNumbers(MOCK_FOODS.find((f) => f.id === "food-cha-la")!, 30);

  it("the sample day adds up to 1041 kcal before any edit", () => {
    expect(base.calories.consumed).toBe(1041);
  });

  it("a portion change moves calories and the meal total", () => {
    const day = computeCompositeDayData(SAMPLE_DAY, [], { "item-1": { grams: 90, servingLabel: "90 g" } });
    expect(day.calories.consumed).toBe(1155);
    expect(mealKcal(day, "breakfast")).toBe(573);
  });

  it("moving an item changes the two meal totals but not the day total", () => {
    const day = computeCompositeDayData(SAMPLE_DAY, [], { "item-1": { mealSlot: "dinner" } });
    expect(day.calories.consumed).toBe(1041);
    expect(mealKcal(day, "breakfast")).toBe(231);
    expect(mealKcal(day, "dinner")).toBe(228);
  });

  it("deleting an item takes its kcal, carbs and nutrients out of the totals", () => {
    const day = computeCompositeDayData(SAMPLE_DAY, [], { "item-6": { deleted: true } });
    expect(day.calories.consumed).toBe(1041 - 84);
    const carbs = day.macros.find((m) => m.key === "carbs")!;
    const baseCarbs = base.macros.find((m) => m.key === "carbs")!;
    expect(carbs.consumed).toBe(Math.round((baseCarbs.consumed ?? 0) - chala.carbs));
    expect(day.nutrients?.energy).toBeCloseTo(1041 - 84, 5);
    const kali = day.minerals.find((m) => m.key === "potassium")!;
    expect(kali.consumed).toBe(Math.round(3900 - chala.nutrients.potassium!));
  });

  it("an added entry and a sample edit add together", () => {
    const added = [addedEntry("entry-1", "food-chuoi", 100, "snack")];
    const day = computeCompositeDayData(SAMPLE_DAY, added, { "item-1": { grams: 90, servingLabel: "90 g" } });
    expect(day.calories.consumed).toBe(1041 + 114 + 105);
  });
});
