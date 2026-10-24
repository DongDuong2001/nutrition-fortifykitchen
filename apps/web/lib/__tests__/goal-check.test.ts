import { describe, expect, it } from "vitest";
import { FIRST_FOOD, type GoalDay } from "../goals";
import { LOCAL_ADD_WINDOW_MS, addMark, checkGoals } from "../goal-check";

// feat/sound-goals §3 (review 25ac3ab): what one look at the day does. Only an add into today marks the change as local, and what a
// Ngày tập add records or replays is decided here, not in the store's effect.

const TODAY = "2026-10-24";
const YESTERDAY = "2026-10-23";
const a = (value: number | null, target: number | null = 100) => ({ value, target });
const day = (pct: number, over: Partial<GoalDay> = {}): GoalDay => ({
  kcal: a(pct * 20, 2000),
  macros: { carbs: a(pct), protein: a(pct), fat: a(pct) },
  fiber: a(pct),
  column: { iron: a(pct), vitamin_c: a(pct) },
  training: false,
  ...over,
});
const fresh = { hadEntries: false, hadRecents: false };
const NOT_DUE = { seen: true, recentsAnswered: true, demo: false };
const DUE = { seen: false, recentsAnswered: true, demo: false };
const look = (over: Partial<Parameters<typeof checkGoals>[0]> = {}) =>
  checkGoals({ before: day(50), after: day(50, { column: { iron: a(100), vitamin_c: a(50) } }), mark: addMark(TODAY, TODAY, fresh, 1000), now: 1100, today: TODAY, record: null, source: null, firstFood: NOT_DUE, ...over });

describe("addMark", () => {
  it("an add into today marks the change as local, with what the account had before", () => {
    expect(addMark(TODAY, TODAY, { hadEntries: true, hadRecents: false }, 1000)).toEqual({ hadEntries: true, hadRecents: false, at: 1000 });
  });
  it("an add into yesterday marks nothing: it changes nothing today", () => {
    expect(addMark(YESTERDAY, TODAY, fresh, 1000)).toBeNull();
  });
});

describe("checkGoals", () => {
  it("a local add that brings a nutrient to 100 % reaches it, and the record keeps every goal met today", () => {
    const out = look();
    expect(out.reached).toEqual(["iron"]);
    expect(out.keys).toEqual(["iron"]);
    expect(out.queue).toEqual(["iron"]);
    expect(out.record.goals).toEqual(expect.arrayContaining(["iron"]));
  });

  it("an add into yesterday, then a refetch that reaches a goal: nothing plays", () => {
    const mark = addMark(YESTERDAY, TODAY, fresh, 1000);
    const out = look({ mark, now: 1500 });
    expect(out.reached).toEqual([]);
    expect(out.queue).toEqual([]);
    expect(out.moment).toBeNull();
    // ...but the goal is recorded for the day, so a later add does not replay it
    expect(out.record.goals).toContain("iron");
  });

  it("a mark that nothing followed within 3 s (a backstop) does not make a later refetch local", () => {
    const mark = addMark(TODAY, TODAY, fresh, 1000);
    expect(LOCAL_ADD_WINDOW_MS).toBe(3000);
    expect(look({ mark, now: 1000 + 3001 }).queue).toEqual([]);
    expect(look({ mark, now: 1000 + 2999 }).queue).toEqual(["iron"]);
  });

  it("the first look of the day records and plays nothing", () => {
    expect(look({ before: null }).queue).toEqual([]);
  });

  it("a goal already in the day's record is not reached again", () => {
    expect(look({ record: { date: TODAY, goals: ["iron"] } }).queue).toEqual([]);
  });

  it("a Ngày tập add records its nutrient goals and replays none of them on Hôm nay", () => {
    const out = look({ source: "training" });
    expect(out.reached).toEqual(["iron"]);
    expect(out.queue).toEqual([]);
    expect(out.record.goals).toContain("iron");
  });

  it("but a T3 it reaches stays queued for Hôm nay", () => {
    const after = day(100);
    const out = look({ before: day(50, { column: { iron: a(100), vitamin_c: a(99) } }), after, source: "training" });
    expect(out.reached).toContain("column");
    expect(out.queue).toEqual(["column"]);
  });

  it("the first food ever leads, and is marked used when it is due", () => {
    const out = look({ firstFood: DUE });
    expect(out.firstFoodUsed).toBe(true);
    expect(out.keys).toEqual([FIRST_FOOD, "iron"]);
    expect(out.moment).toMatchObject({ lead: FIRST_FOOD, pops: ["iron"] });
  });

  it("a first food logged through a Ngày tập tick keeps its moment: it plays on Hôm nay on return", () => {
    const out = look({ firstFood: DUE, source: "training" });
    expect(out.firstFoodUsed).toBe(true);
    expect(out.queue).toEqual([FIRST_FOOD]);
  });

  it("no mark (not a local add): never a first food either", () => {
    expect(look({ mark: null, firstFood: DUE }).firstFoodUsed).toBe(false);
  });

  it("the first food waits for Gần đây, and is never in demo or for an account that had foods", () => {
    expect(look({ firstFood: { ...DUE, recentsAnswered: false } }).firstFoodUsed).toBe(false);
    expect(look({ firstFood: { ...DUE, demo: true } }).firstFoodUsed).toBe(false);
    expect(look({ mark: addMark(TODAY, TODAY, { hadEntries: true, hadRecents: false }, 1000), firstFood: DUE }).firstFoodUsed).toBe(false);
    expect(look({ mark: addMark(TODAY, TODAY, { hadEntries: false, hadRecents: true }, 1000), firstFood: DUE }).firstFoodUsed).toBe(false);
  });
});
