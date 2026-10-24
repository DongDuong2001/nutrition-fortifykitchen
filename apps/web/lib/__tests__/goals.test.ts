import { describe, expect, it, vi } from "vitest";
import {
  FIRST_FOOD,
  MOMENT_AFTER_SHEET_MS,
  firstFoodDue,
  goalsMet,
  loadGoalRecord,
  momentFor,
  momentGate,
  onGoal,
  emitGoal,
  reachedGoals,
  saveGoalRecord,
  seenToday,
  withGoals,
  type GoalDay,
} from "../goals";

// feat/sound-goals §3: which goals a local add reaches today, once a day, and which one gets the moment.

const TODAY = "2026-10-24";
const a = (value: number | null, target: number | null = 100) => ({ value, target });

/** A Level 1 day: kcal 2.000, the three macros, Chất xơ, and the column's eight counted nutrients, all at `pct` % unless set. */
function day(pct: number, over: Partial<GoalDay> = {}): GoalDay {
  const ids = ["sodium", "potassium", "calcium", "magnesium", "iron", "zinc", "vitamin_a", "vitamin_c"];
  return {
    kcal: a(pct * 20, 2000),
    macros: { carbs: a(pct), protein: a(pct), fat: a(pct) },
    fiber: a(pct),
    column: Object.fromEntries(ids.map((id) => [id, a(pct)])),
    training: false,
    ...over,
  };
}

function memoryStorage(init: Record<string, string> = {}) {
  const data = new Map(Object.entries(init));
  return {
    data,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  };
}

describe("goalsMet (100 % as the bars round it)", () => {
  it("lists every goal at 100 % or more, the hero first, then the column in its order, then column and training", () => {
    expect(goalsMet(day(100, { training: true }))).toEqual([
      "kcal",
      "macros",
      "macro:carbs",
      "macro:protein",
      "macro:fat",
      "fiber",
      "sodium",
      "potassium",
      "calcium",
      "magnesium",
      "iron",
      "zinc",
      "vitamin_a",
      "vitamin_c",
      "column",
      "training",
    ]);
  });
  it("99,5 % rounds to 100 % and counts; 99,4 % does not", () => {
    expect(goalsMet(day(0, { fiber: a(99.5) }))).toEqual(["fiber"]);
    expect(goalsMet(day(0, { fiber: a(99.4) }))).toEqual([]);
  });
  it("macros needs all three; one alone is its own goal", () => {
    const met = goalsMet(day(0, { macros: { carbs: a(100), protein: a(100), fat: a(80) } }));
    expect(met).toEqual(["macro:carbs", "macro:protein"]);
  });
  it("column needs Chất xơ ≥ 100 % too (RA2): every counted nutrient at 100 % with Chất xơ short is no Đủ chất", () => {
    const short = goalsMet(day(100, { fiber: a(99) }));
    expect(short).not.toContain("column");
    expect(short).toContain("vitamin_c");
    expect(goalsMet(day(100, { fiber: a(100) }))).toContain("column");
  });

  it("column needs every counted nutrient and Chất xơ; an unknown value or target never counts as reached", () => {
    expect(goalsMet(day(100, { fiber: a(50) }))).not.toContain("column");
    const unknown = day(100);
    unknown.column.zinc = a(null);
    expect(goalsMet(unknown)).not.toContain("column");
    expect(goalsMet(unknown)).not.toContain("zinc");
    expect(goalsMet(day(100, { kcal: a(2500, null) }))).not.toContain("kcal");
  });
});

describe("reachedGoals", () => {
  const ctx = { localAdd: true, isToday: true, seen: [] as string[] };
  it("a local add today that brings Vitamin C to 100 %: vitamin_c", () => {
    const before = day(50);
    const after = day(50);
    after.column.vitamin_c = a(120);
    expect(reachedGoals(before, after, ctx)).toEqual(["vitamin_c"]);
  });
  it("already over before the add: nothing", () => {
    expect(reachedGoals(day(100), day(110), ctx)).toEqual([]);
  });
  it("the first read (opening the app), a refetch, another device, another day: nothing", () => {
    expect(reachedGoals(null, day(100), ctx)).toEqual([]);
    expect(reachedGoals(day(50), day(100), { ...ctx, localAdd: false })).toEqual([]);
    expect(reachedGoals(day(50), day(100), { ...ctx, isToday: false })).toEqual([]);
  });
  it("a goal already reached once today (an undo, then the same add again): nothing", () => {
    expect(reachedGoals(day(50), day(100, { fiber: a(50) }), { ...ctx, seen: goalsMet(day(100)) })).toEqual([]);
  });
  it("Ngày tập: the last tick of the checklist", () => {
    expect(reachedGoals(day(0), day(0, { training: true }), ctx)).toEqual(["training"]);
  });
});

describe("the once-a-day record", () => {
  it("records a day's goals and forgets them the next day", () => {
    const r = withGoals(null, TODAY, ["kcal", "iron"]);
    expect(seenToday(r, TODAY)).toEqual(["kcal", "iron"]);
    expect(seenToday(withGoals(r, TODAY, ["iron", "fiber"]), TODAY)).toEqual(["kcal", "iron", "fiber"]);
    expect(seenToday(r, "2026-10-25")).toEqual([]);
    expect(withGoals(r, "2026-10-25", ["zinc"])).toEqual({ date: "2026-10-25", goals: ["zinc"] });
  });
  it("saves per account and reads it back", () => {
    const storage = memoryStorage();
    saveGoalRecord({ date: TODAY, goals: ["kcal"] }, storage);
    expect(loadGoalRecord(storage)).toEqual({ date: TODAY, goals: ["kcal"] });
  });
  it("takes over the old h1t_goal100 record (the vitamins and minerals already vibrated today), then drops it", () => {
    const storage = memoryStorage({ h1t_goal100: JSON.stringify({ date: TODAY, nutrients: ["iron", "calcium"] }) });
    const record = loadGoalRecord(storage);
    expect(record).toEqual({ date: TODAY, goals: ["iron", "calcium"] });
    saveGoalRecord(withGoals(record, TODAY, ["kcal"]), storage);
    expect(storage.data.has("h1t_goal100")).toBe(false);
    expect(loadGoalRecord(storage)).toEqual({ date: TODAY, goals: ["iron", "calcium", "kcal"] });
  });
  it("unreadable or no storage: an empty record, and saving does not throw", () => {
    expect(loadGoalRecord(memoryStorage({ h1t_goals_v1: "{nope" }))).toBeNull();
    expect(loadGoalRecord(null)).toBeNull();
    expect(() => saveGoalRecord({ date: TODAY, goals: [] }, null)).not.toThrow();
  });
});

describe("momentFor (one moment per add)", () => {
  it("nothing reached: no moment", () => {
    expect(momentFor([])).toBeNull();
  });
  it("T1: one nutrient, Chất xơ or a hero macro", () => {
    expect(momentFor(["vitamin_c"])).toEqual({ tier: 1, lead: "vitamin_c", pops: [] });
    expect(momentFor(["macro:protein"])).toEqual({ tier: 1, lead: "macro:protein", pops: [] });
  });
  it("T2: kcal, the three macros, Ngày tập; the T1 goals of the same add only pop their number", () => {
    expect(momentFor(["kcal", "macro:fat", "iron"])).toEqual({ tier: 2, lead: "kcal", pops: ["macro:fat", "iron"] });
    expect(momentFor(["macros", "macro:fat"])).toEqual({ tier: 2, lead: "macros", pops: ["macro:fat"] });
    expect(momentFor(["training"])).toEqual({ tier: 2, lead: "training", pops: [] });
  });
  it("kcal and the three macros on one add: kcal leads, macros pops", () => {
    expect(momentFor(["macros", "kcal"])).toEqual({ tier: 2, lead: "kcal", pops: ["macros"] });
  });
  it("T3: the whole column wins over everything else", () => {
    expect(momentFor(["kcal", "vitamin_c", "column"])).toEqual({ tier: 3, lead: "column", pops: ["kcal", "vitamin_c"] });
  });
  it("the first food ever is T1; a goal of a higher tier on the same add wins, a nutrient of its tier only pops", () => {
    expect(momentFor([FIRST_FOOD])).toEqual({ tier: 1, lead: FIRST_FOOD, pops: [] });
    expect(momentFor(["vitamin_c", FIRST_FOOD])).toEqual({ tier: 1, lead: FIRST_FOOD, pops: ["vitamin_c"] });
    expect(momentFor([FIRST_FOOD, "kcal"])).toEqual({ tier: 2, lead: "kcal", pops: [] });
  });
});

describe("firstFoodDue (the first food ever logged on this account)", () => {
  it("a new account's first add: due", () => {
    expect(firstFoodDue({ seen: false, hadEntries: false, hadRecents: false, demo: false })).toBe(true);
  });
  it("seen before, entries or Gần đây already there (a returning user on a new phone), or demo mode: not due", () => {
    expect(firstFoodDue({ seen: true, hadEntries: false, hadRecents: false, demo: false })).toBe(false);
    expect(firstFoodDue({ seen: false, hadEntries: true, hadRecents: false, demo: false })).toBe(false);
    expect(firstFoodDue({ seen: false, hadEntries: false, hadRecents: true, demo: false })).toBe(false);
    expect(firstFoodDue({ seen: false, hadEntries: false, hadRecents: false, demo: true })).toBe(false);
  });
});

describe("momentGate (when a queued moment plays)", () => {
  const idle = { addSheet: false, whatsNewOrTour: false, homeSheet: false, choosing: false, levelUp: false };
  const base = { queuedFor: TODAY, today: TODAY, homeToday: true, waitingOn: idle, sheetExitEndedAt: null, now: 5000 };
  it("on Hôm nay showing today, nothing open: now", () => {
    expect(momentGate(base)).toBe(0);
  });
  it("150 ms after the + sheet's exit ends", () => {
    expect(MOMENT_AFTER_SHEET_MS).toBe(150);
    expect(momentGate({ ...base, sheetExitEndedAt: 4900 })).toBe(50);
    expect(momentGate({ ...base, sheetExitEndedAt: 4000 })).toBe(0);
  });
  it("waits while away from Hôm nay or anything is open or playing", () => {
    expect(momentGate({ ...base, homeToday: false })).toBe("wait");
    for (const key of Object.keys(idle)) expect(momentGate({ ...base, waitingOn: { ...idle, [key]: true } })).toBe("wait");
  });
  it("a moment queued yesterday is dropped", () => {
    expect(momentGate({ ...base, queuedFor: "2026-10-23" })).toBe("drop");
  });
});

describe("onGoal (for the later gamification layers)", () => {
  it("tells each listener about a moment until it unsubscribes", () => {
    const listener = vi.fn();
    const off = onGoal(listener);
    const event = { date: TODAY, keys: ["kcal" as const], moment: { tier: 2 as const, lead: "kcal", pops: [] } };
    emitGoal(event);
    off();
    emitGoal(event);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(event);
  });
});
