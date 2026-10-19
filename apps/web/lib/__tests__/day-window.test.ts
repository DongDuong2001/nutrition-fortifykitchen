import { describe, expect, it } from "vitest";
import { homeDay, setHomeDay } from "../home-scroll";
import { entriesOnDay, isTodays, liftEditableDays, splitByDay, withEditableDays } from "../day-archive";
import { pastDaysFor } from "../day-rules";
import { deleteEntryIn, deleteMealIn, findEntry, mealEntryIds, mealPortions, moveEntriesIn, undoDeleteIn, updateEntryIn, type AddedDiaryEntry, type DiaryEdits } from "../diary-edits";
import { applyServerDay, entriesFromDaySummary, replaceDay } from "../server-day";

// cc-68 Part 2: the list of editable days (today and yesterday). Today is 2026-10-19 in these tests.
const TODAY = "2026-10-19";
const YESTERDAY = "2026-10-18";

const entry = (id: string, day: string | undefined, slot: AddedDiaryEntry["mealSlot"] = "lunch", addedAt = "2026-10-19T03:00:00.000Z"): AddedDiaryEntry => ({
  id,
  foodId: "f",
  foodName: `Món ${id}`,
  grams: 100,
  displayQty: "100 g",
  mealSlot: slot,
  calories: 100,
  protein: 1,
  carbs: 1,
  fat: 1,
  fiber: 1,
  nutrients: {},
  addedAt,
  day,
});

const t1 = entry("t1", TODAY);
const t2 = entry("t2", undefined, "dinner");
const y1 = entry("y1", YESTERDAY, "lunch");
const y2 = entry("y2", YESTERDAY, "dinner", "2026-10-18T05:00:00.000Z");
const both: AddedDiaryEntry[] = [y1, t1, y2, t2];
const edits = (added: AddedDiaryEntry[]): DiaryEdits => ({ added, sample: {}, undo: null });

describe("pastDaysFor", () => {
  it("is one in a real account and none in demo or the mock", () => {
    expect(pastDaysFor(true, false)).toBe(1);
    expect(pastDaysFor(true, true)).toBe(0);
    expect(pastDaysFor(false, false)).toBe(0);
  });
});

describe("entriesOnDay", () => {
  it("today's entries are the ones not filed under an earlier day; nothing is dropped", () => {
    expect(entriesOnDay(both, TODAY, TODAY).map((e) => e.id)).toEqual(["t1", "t2"]);
    // An unreadable time, or a day after today (a clock that moved back), is today's
    expect(isTodays({ ...t1, day: undefined, addedAt: "nonsense" }, TODAY)).toBe(true);
    expect(isTodays({ ...t1, day: "2026-10-20" }, TODAY)).toBe(true);
  });

  it("yesterday's are the ones under yesterday, however late they were added", () => {
    expect(entriesOnDay(both, YESTERDAY, TODAY).map((e) => e.id)).toEqual(["y1", "y2"]);
    // Added to yesterday today: its time says today, its day says yesterday
    expect(entriesOnDay([entry("late", YESTERDAY, "snack", "2026-10-19T08:00:00.000Z")], YESTERDAY, TODAY)).toHaveLength(1);
  });

  it("the same list comes back while it holds nothing else (no render for nothing)", () => {
    const only = [t1, t2];
    expect(entriesOnDay(only, TODAY, TODAY)).toBe(only);
  });
});

describe("replaceDay", () => {
  it("replaces one day's entries and leaves the other day alone", () => {
    const next = replaceDay(both, YESTERDAY, TODAY, [entry("y9", YESTERDAY)]);
    expect(entriesOnDay(next, YESTERDAY, TODAY).map((e) => e.id)).toEqual(["y9"]);
    expect(entriesOnDay(next, TODAY, TODAY).map((e) => e.id)).toEqual(["t1", "t2"]);
  });

  it("returns the same list when the day's entries are the same objects", () => {
    expect(replaceDay(both, YESTERDAY, TODAY, [y1, y2])).toBe(both);
    expect(replaceDay(both, TODAY, TODAY, [t1, t2])).toBe(both);
  });
});

describe("filing by day with yesterday kept", () => {
  it("splitByDay keeps yesterday and files the days before it", () => {
    const old = entry("old", "2026-10-17");
    const split = splitByDay([old, ...both], TODAY, YESTERDAY);
    expect(split.today.map((e) => e.id)).toEqual(["y1", "t1", "y2", "t2"]);
    expect(split.past["2026-10-17"]).toEqual([old]);
  });

  it("with the window shut (demo) yesterday is filed as before", () => {
    const split = splitByDay(both, TODAY, TODAY);
    expect(split.today.map((e) => e.id)).toEqual(["t1", "t2"]);
    expect(split.past[YESTERDAY].map((e) => e.id)).toEqual(["y1", "y2"]);
  });

  it("an archive's yesterday comes back into the list, with its day; older days stay filed", () => {
    const { archive, lifted } = liftEditableDays({ [YESTERDAY]: [{ ...y1, day: undefined }], "2026-10-17": [entry("old", "2026-10-17")] }, TODAY, 1);
    expect(lifted.map((e) => [e.id, e.day])).toEqual([["y1", YESTERDAY]]);
    expect(Object.keys(archive)).toEqual(["2026-10-17"]);
    // Nothing editable in the archive: the same object
    const same = { "2026-10-17": [entry("old", "2026-10-17")] };
    expect(liftEditableDays(same, TODAY, 1).archive).toBe(same);
    expect(liftEditableDays({ [YESTERDAY]: [y1] }, TODAY, 0).lifted).toEqual([]);
  });

  it("the history the screens read has yesterday's list on top of the archive", () => {
    const archive = { [YESTERDAY]: [entry("stale", YESTERDAY)], "2026-10-17": [entry("old", "2026-10-17")] };
    const history = withEditableDays(archive, both, TODAY, 1);
    expect(history[YESTERDAY].map((e) => e.id)).toEqual(["y1", "y2"]);
    expect(history["2026-10-17"]).toBe(archive["2026-10-17"]);
    // Everything of yesterday deleted: the day is empty, the stale copy does not come back
    expect(withEditableDays(archive, [t1], TODAY, 1)[YESTERDAY]).toBeUndefined();
    // Window shut: the archive itself
    expect(withEditableDays(archive, both, TODAY, 0)).toBe(archive);
  });
});

describe("editing yesterday's entries in the shared list", () => {
  it("an edit, a move and a delete find a yesterday entry by id, like a today's", () => {
    const e = edits(both);
    expect(findEntry(e, "y1", [])?.day).toBe(YESTERDAY);
    expect(findEntry(e, "t1", [])?.day).toBe(TODAY);
    const edited = updateEntryIn(e, "y1", { mealSlot: "snack" }, []);
    expect(edited.added.find((x) => x.id === "y1")?.mealSlot).toBe("snack");
    expect(edited.added.find((x) => x.id === "t1")?.mealSlot).toBe("lunch");
    const moved = moveEntriesIn(e, ["y1", "y2"], "breakfast", []);
    expect(moved.added.map((x) => x.mealSlot)).toEqual(["breakfast", "lunch", "breakfast", "dinner"]);
    const deleted = deleteEntryIn(e, "y2", []);
    expect(deleted.added.map((x) => x.id)).toEqual(["y1", "t1", "t2"]);
    // Hoàn tác puts it back where it was
    expect(undoDeleteIn(deleted).added.map((x) => x.id)).toEqual(["y1", "t1", "y2", "t2"]);
  });

  it("a meal is one day's: deleting yesterday's lunch leaves today's lunch", () => {
    const yesterdayOnly = (x: AddedDiaryEntry) => x.day === YESTERDAY;
    const e = edits(both);
    expect(mealEntryIds(e, "lunch", [], yesterdayOnly)).toEqual(["y1"]);
    expect(mealEntryIds(e, "lunch", [])).toEqual(["y1", "t1"]);
    const next = deleteMealIn(e, "lunch", [], yesterdayOnly);
    expect(next.added.map((x) => x.id)).toEqual(["t1", "y2", "t2"]);
    expect(undoDeleteIn(next).added.map((x) => x.id)).toEqual(["y1", "t1", "y2", "t2"]);
    expect(mealPortions(e, "dinner", [], yesterdayOnly).length).toBe(1);
  });
});

describe("entriesFromDaySummary", () => {
  it("files each entry under the day it was read for, whatever its created_at says", () => {
    const summary = { meals: [{ slot: "lunch", name_vi: "Trưa", total_kcal: 0, target_min_kcal: 0, entries: [{ id: "a", food_id: "f", food_name: "Cơm", kind: "food", meal_slot: "lunch", serving_label: "", grams: 200, calories: 260, nutrients: {}, created_at: "2026-10-19T03:00:00Z" }] }] };
    const [one] = entriesFromDaySummary(summary as never, YESTERDAY);
    expect(one).toMatchObject({ id: "a", day: YESTERDAY, synced: true, displayQty: "200 g", calories: 260 });
  });
});

describe("applyServerDay", () => {
  const server = (id: string) => ({ meals: [{ slot: "all", name_vi: "", total_kcal: 0, target_min_kcal: 0, entries: [{ id, food_id: "f", food_name: "Cơm", kind: "food", meal_slot: "lunch", serving_label: "", grams: 100, calories: 130, nutrients: {}, created_at: "2026-10-18T05:00:00Z" }] }] });
  const none = { keep: new Set<string>(), startedAt: Date.parse("2026-10-19T04:00:00Z") };

  it("reading yesterday changes yesterday's entries and leaves today's as they are", () => {
    const synced = { ...y1, synced: true };
    const next = applyServerDay([synced, t1, t2], server("y-new") as never, YESTERDAY, TODAY, none);
    // y1 was confirmed before and the server no longer has it (deleted on another device): it goes; the server's entry comes
    expect(entriesOnDay(next, YESTERDAY, TODAY).map((e) => e.id)).toEqual(["y-new"]);
    expect(entriesOnDay(next, TODAY, TODAY).map((e) => e.id)).toEqual(["t1", "t2"]);
  });

  it("an entry of yesterday with a write waiting is kept, whatever the server says", () => {
    const next = applyServerDay([y1, t1], server("y-new") as never, YESTERDAY, TODAY, { ...none, keep: new Set(["y1"]) });
    expect(entriesOnDay(next, YESTERDAY, TODAY).map((e) => e.id).sort()).toEqual(["y-new", "y1"]);
  });
});

describe("the day the + of the nav adds to", () => {
  it("is the day Hôm nay shows while it is yesterday, and nothing once Hôm nay is left", () => {
    expect(homeDay()).toBeNull();
    setHomeDay(YESTERDAY);
    expect(homeDay()).toBe(YESTERDAY);
    setHomeDay(null);
    expect(homeDay()).toBeNull();
  });
});
