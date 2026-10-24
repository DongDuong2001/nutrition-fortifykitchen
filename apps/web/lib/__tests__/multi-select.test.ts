import { describe, expect, it } from "vitest";
import {
  TARGET_MEALS,
  actionBarLabel,
  chosenEntries,
  chosenKcal,
  copyHomeEntries,
  moveTargets,
  ddMm,
  mealFullySelected,
  pastCopySubtitle,
  pastCopyTitle,
  pastCopyToast,
  selectAll,
  selectTitle,
  toggleId,
  toggleMealSelection,
} from "../multi-select";
import { deleteEntriesIn, moveEntriesIn, findEntry, SAMPLE_ITEMS, type DiaryEdits, type AddedDiaryEntry } from "../diary-edits";
import type { HomeEntry } from "../home";

function entry(id: string, over: Partial<HomeEntry> = {}): HomeEntry {
  return {
    id,
    foodId: "food-x",
    name: `Món ${id}`,
    qty: "100 g",
    grams: 100,
    slot: "lunch",
    kcal: 100,
    protein: 5,
    carbs: 10,
    fat: 2,
    fiber: 1,
    nutrients: { iron: 1 },
    quick: false,
    ...over,
  };
}

describe("selection", () => {
  it("toggles one id without changing the old set", () => {
    const a = new Set(["1"]);
    const b = toggleId(a, "2");
    expect([...b].sort()).toEqual(["1", "2"]);
    expect([...a]).toEqual(["1"]);
    expect([...toggleId(b, "1")]).toEqual(["2"]);
  });

  it("Chọn cả bữa selects every entry of the meal, then drops them all", () => {
    const meal = [entry("a"), entry("b")];
    const one = new Set(["a", "z"]);
    expect(mealFullySelected(one, meal)).toBe(false);
    const all = toggleMealSelection(one, meal);
    expect([...all].sort()).toEqual(["a", "b", "z"]);
    expect(mealFullySelected(all, meal)).toBe(true);
    expect([...toggleMealSelection(all, meal)]).toEqual(["z"]);
  });

  it("an empty meal is never fully selected and toggling it changes nothing", () => {
    expect(mealFullySelected(new Set(["a"]), [])).toBe(false);
    expect([...toggleMealSelection(new Set(["a"]), [])]).toEqual(["a"]);
  });

  it("Chọn hết takes every entry", () => {
    expect([...selectAll([entry("a"), entry("b")])]).toEqual(["a", "b"]);
  });

  it("counts and sums only the chosen entries that still exist", () => {
    const day = [entry("a", { kcal: 459 }), entry("b", { kcal: 200 }), entry("c", { kcal: 94 })];
    const sel = new Set(["a", "c", "gone"]);
    expect(chosenEntries(day, sel).map((e) => e.id)).toEqual(["a", "c"]);
    expect(chosenKcal(day, sel)).toBe(553);
    expect(chosenKcal(day, new Set())).toBe(0);
  });

  it("skips entries with unknown kcal, and is unknown when none of the chosen has kcal", () => {
    const day = [entry("a", { kcal: 459 }), entry("b", { kcal: null }), entry("c", { kcal: null })];
    expect(chosenKcal(day, new Set(["a", "b"]))).toBe(459);
    expect(chosenKcal(day, new Set(["b", "c"]))).toBeNull();
    expect(actionBarLabel(2, null)).toBe("2 món · — kcal");
  });
});

describe("texts", () => {
  it("action bar and header title", () => {
    expect(actionBarLabel(3, 1041)).toBe("3 món · 1.041 kcal");
    expect(actionBarLabel(0, 0)).toBe("0 món · 0 kcal");
    expect(selectTitle(4)).toBe("Đã chọn 4");
  });

  it("past-day sheet title, subtitle and toast", () => {
    expect(pastCopyTitle(5)).toBe("Chép 5 món vào hôm nay");
    expect(pastCopySubtitle("Hôm qua 14/10", 1532, "15/10")).toBe(
      "Từ Hôm qua 14/10 · 1.532 kcal. Ngày đã qua chỉ xem, nên món được chép vào hôm nay 15/10."
    );
    expect(pastCopyToast(5)).toBe("Đã chép 5 món vào hôm nay");
    expect(ddMm("2026-10-15")).toBe("15/10");
  });

  it("offers the four meals, not Trước tập", () => {
    expect(TARGET_MEALS.map((m) => m.name)).toEqual(["Bữa sáng", "Bữa trưa", "Bữa phụ", "Bữa tối"]);
    expect(TARGET_MEALS.map((m) => m.label)).toEqual(["Sáng", "Trưa", "Bữa phụ", "Tối"]);
  });
});

describe("copies", () => {
  const source = [entry("a", { slot: "breakfast", kcal: 300 }), entry("b", { slot: "dinner", quick: true, grams: null, foodId: undefined })];

  it("keeps each entry's own meal for Giữ nguyên bữa", () => {
    const copies = copyHomeEntries(source, "keep", "copy-1", "2026-10-15T01:00:00.000Z");
    expect(copies.map((c) => c.mealSlot)).toEqual(["breakfast", "dinner"]);
  });

  it("puts every copy in one chosen meal", () => {
    const copies = copyHomeEntries(source, "snack", "copy-1", "t");
    expect(copies.map((c) => c.mealSlot)).toEqual(["snack", "snack"]);
  });

  it("makes new ids, keeps the numbers and does not touch the source", () => {
    const copies = copyHomeEntries(source, "keep", "copy-9", "t");
    expect(copies.map((c) => c.id)).toEqual(["copy-9-0", "copy-9-1"]);
    expect(copies[0]).toMatchObject({ foodId: "food-x", foodName: "Món a", calories: 300, protein: 5, grams: 100, displayQty: "100 g", addedAt: "t" });
    expect(copies[0].nutrients).toEqual({ iron: 1 });
    expect(copies[0].nutrients).not.toBe(source[0].nutrients);
    expect(source[0].id).toBe("a");
  });

  it("a quick kcal entry stays a quick entry with no grams", () => {
    const copies = copyHomeEntries(source, "keep", "c", "t");
    expect(copies[1].kind).toBe("quick");
    expect(copies[1].grams).toBe(0);
    expect(copies[0].kind).toBeUndefined();
  });
});

describe("delete and move several entries", () => {
  const added = (id: string, slot: AddedDiaryEntry["mealSlot"]): AddedDiaryEntry => ({
    id, foodId: "food-cha-la", foodName: id, grams: 30, displayQty: "30 g", mealSlot: slot, calories: 84, protein: 1, carbs: 22, fat: 0, fiber: 2, nutrients: {}, addedAt: "t",
  });
  const base = (): DiaryEdits => ({ added: [added("a", "breakfast"), added("b", "lunch"), added("c", "lunch"), added("d", "dinner")], sample: {}, undo: null });

  it("removes the chosen ones and keeps them for ONE undo", () => {
    const after = deleteEntriesIn(base(), ["b", "d"], []);
    expect(after.added.map((e) => e.id)).toEqual(["a", "c"]);
    expect(after.undo).toMatchObject({ kind: "meal", count: 2 });
  });

  it("skips ids that are not there and changes nothing when none is", () => {
    const edits = base();
    expect(deleteEntriesIn(edits, ["zzz"], [])).toBe(edits);
    expect(deleteEntriesIn(edits, ["a", "zzz"], []).added.map((e) => e.id)).toEqual(["b", "c", "d"]);
  });

  it("a sample item is flagged deleted, an added entry is removed, and one undo restores both", () => {
    const sampleId = SAMPLE_ITEMS[0].item.id;
    const edits = base();
    const after = deleteEntriesIn(edits, [sampleId, "a"], SAMPLE_ITEMS);
    expect(findEntry(after, sampleId, SAMPLE_ITEMS)).toBeNull();
    expect(after.added.map((e) => e.id)).toEqual(["b", "c", "d"]);
    const undone = (() => {
      const u = after.undo!;
      expect(u.kind).toBe("meal");
      return u;
    })();
    expect(undone).toBeTruthy();
  });

  it("moves the chosen entries to a meal", () => {
    const after = moveEntriesIn(base(), ["a", "d"], "snack", []);
    expect(after.added.map((e) => [e.id, e.mealSlot])).toEqual([
      ["a", "snack"],
      ["b", "lunch"],
      ["c", "lunch"],
      ["d", "snack"],
    ]);
  });
});

describe("moveTargets: the meals the ⋯ menu's Chuyển sang bữa… offers (review 24/10)", () => {
  const day = (...slots: Array<[HomeEntry["slot"], string]>) => slots.map(([slot, label]) => ({ slot, label }));
  const four = day(["breakfast", "Sáng"], ["lunch", "Trưa"], ["snack", "Bữa phụ"], ["dinner", "Tối"]);
  const five = day(["breakfast", "Sáng"], ["lunch", "Trưa"], ["pre_workout", "Trước tập"], ["snack", "Bữa phụ"], ["dinner", "Tối"]);

  it("a day that shows Trước tập offers it, in the day's own order, so a food can be moved into it", () => {
    expect(moveTargets(five)).toEqual([
      { id: "breakfast", label: "Sáng" },
      { id: "lunch", label: "Trưa" },
      { id: "pre_workout", label: "Trước tập" },
      { id: "snack", label: "Bữa phụ" },
      { id: "dinner", label: "Tối" },
    ]);
  });

  it("a day without it offers the four meals, as Chọn nhiều món does", () => {
    expect(moveTargets(four)).toEqual(TARGET_MEALS.map((m) => ({ id: m.id, label: m.label })));
  });

  it("Chọn nhiều món's own targets stay the four (Trước tập is not a copy target)", () => {
    expect(TARGET_MEALS.map((m) => m.id)).toEqual(["breakfast", "lunch", "snack", "dinner"]);
  });
});
