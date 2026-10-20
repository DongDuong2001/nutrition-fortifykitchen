import { describe, expect, it } from "vitest";
import { MOCK_FOODS } from "../mock/foods";
import { addedToast, ADD_TOAST_MS, undoIdsOf } from "../add-toast";
import { entryNumbers, removeAddedIn, type AddedDiaryEntry, type DiaryEdits } from "../diary-edits";
import type { ToastInfo } from "../diary-store";

// Toast review (21/10): every add shows "Đã thêm … · Hoàn tác" and Hoàn tác removes exactly the entries that add made.

const entry = (id: string, foodId: string, grams: number, mealSlot: AddedDiaryEntry["mealSlot"] = "lunch"): AddedDiaryEntry => {
  const food = MOCK_FOODS.find((f) => f.id === foodId) ?? MOCK_FOODS[0];
  const n = entryNumbers(food, grams);
  return { id, foodId: food.id, foodName: food.nameVi, grams, displayQty: `${grams} g`, mealSlot, ...n, addedAt: "2026-10-21T05:00:00.000Z" };
};
const seq = () => {
  let n = 0;
  return () => ++n;
};
const fact = (entryId: string, mealSlot: "lunch" | "dinner" = "lunch") => ({ entryId, foodName: "Trứng", amount: "1 quả", mealSlot, mealNameVi: mealSlot === "lunch" ? "Bữa trưa" : "Bữa tối", dayText: "" });

describe("the toast after an add", () => {
  it("one add is an undoable toast for that entry alone", () => {
    const t = addedToast(null, fact("e1"), seq());
    expect(t.kind).toBe("undoable");
    expect(t.message).toBe("Đã thêm Trứng 1 quả vào Bữa trưa");
    expect(t.undoIds).toEqual(["e1"]);
    expect(t.durationMs).toBe(ADD_TOAST_MS);
  });

  it("adds into the same meal while the toast is up update it in place, and its Hoàn tác takes out both", () => {
    const next = seq();
    const one = addedToast(null, fact("e1"), next);
    const two = addedToast(one, fact("e2"), next);
    expect(two.message).toBe("Đã thêm 2 món vào Bữa trưa");
    expect(two.count).toBe(2);
    expect(two.groupId).toBe(one.groupId);
    expect(two.undoIds).toEqual(["e1", "e2"]);
    const three = addedToast(two, fact("e3"), next);
    expect(three.undoIds).toEqual(["e1", "e2", "e3"]);
  });

  it("an add into another meal starts its own toast: its Hoàn tác touches only its own entry", () => {
    const next = seq();
    const lunch = addedToast(null, fact("e1"), next);
    const dinner = addedToast(lunch, fact("e2", "dinner"), next);
    expect(dinner.count).toBe(1);
    expect(dinner.groupId).not.toBe(lunch.groupId);
    expect(dinner.undoIds).toEqual(["e2"]);
  });

  it("a toast of another kind (a delete, a notice) is not joined", () => {
    const notice: ToastInfo = { message: "x", kind: "notice", mealSlot: "lunch", durationMs: 1, groupId: 9, undoIds: ["z"] };
    expect(addedToast(notice, fact("e1"), seq()).undoIds).toEqual(["e1"]);
  });
});

describe("Hoàn tác after an add", () => {
  const edits = (): DiaryEdits => ({ added: [entry("t1", "food-chuoi", 100), entry("t2", "food-chuoi", 120), entry("t3", "food-chuoi", 80), entry("keep", "food-chuoi", 50)], sample: {}, undo: null });

  it("after a tray add of 3 it removes those 3 and nothing else", () => {
    const toast: ToastInfo = { message: "Đã thêm 3 món vào Bữa trưa", kind: "undoable", mealSlot: "lunch", durationMs: ADD_TOAST_MS, undoIds: ["t1", "t2", "t3"] };
    const after = removeAddedIn(edits(), undoIdsOf(toast));
    expect(after.added.map((e) => e.id)).toEqual(["keep"]);
  });

  it("after a grouped toast it removes both entries", () => {
    const next = seq();
    const t = addedToast(addedToast(null, fact("t1"), next), fact("t2"), next);
    expect(removeAddedIn(edits(), undoIdsOf(t)).added.map((e) => e.id)).toEqual(["t3", "keep"]);
  });

  it("with no toast on screen (it expired) it is a no-op", () => {
    expect(undoIdsOf(null)).toEqual([]);
    expect(undoIdsOf(undefined)).toEqual([]);
    expect(removeAddedIn(edits(), undoIdsOf(null)).added).toHaveLength(4);
  });

  it("another kind of toast on screen has nothing to undo here", () => {
    const deleted: ToastInfo = { message: "Đã xóa", kind: "deleted", mealSlot: null, durationMs: 1 };
    expect(undoIdsOf(deleted)).toEqual([]);
  });
});
