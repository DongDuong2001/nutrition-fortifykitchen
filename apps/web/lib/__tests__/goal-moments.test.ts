import { beforeEach, describe, expect, it, vi } from "vitest";
import { FIRST_FOOD } from "../goals";
import {
  clearQueuedMoment,
  columnSummary,
  fxPlan,
  momentText,
  queueMoment,
  queuedMoment,
  setAddSource,
  subscribeMoment,
  takeAddSource,
} from "../goal-moments";

// feat/sound-goals §4, §5: what a moment says, the queue it waits in, what it animates, and the column's slot.

describe("momentText (D-MOT-02: every moment also changes text)", () => {
  it("a nutrient reached: the announcement names it; the label stays", () => {
    expect(momentText("vitamin_c")).toEqual({ announce: "Vitamin C đạt mục tiêu", label: null });
    expect(momentText("fiber")).toEqual({ announce: "Chất xơ đạt mục tiêu", label: null });
    expect(momentText("macro:carbs")).toEqual({ announce: "Tinh bột đạt mục tiêu", label: null });
  });
  it("kcal and the three macros: the hero label says it", () => {
    expect(momentText("kcal")).toEqual({ announce: "Đủ kcal hôm nay", label: "Đủ kcal hôm nay" });
    expect(momentText("macros")).toEqual({ announce: "Đủ tinh bột, đạm, chất béo", label: "Đủ tinh bột, đạm, chất béo" });
  });
  it("Đủ chất has its line in the column, not the label", () => {
    expect(momentText("column")).toEqual({ announce: "Đủ chất hôm nay", label: null });
  });
  it("the first food ever, and Ngày tập", () => {
    expect(momentText(FIRST_FOOD)).toEqual({ announce: "Món đầu tiên!", label: "Món đầu tiên!" });
    expect(momentText("training")).toEqual({ announce: "Xong Ngày tập hôm nay", label: null });
  });
});

describe("the queued moment", () => {
  beforeEach(() => clearQueuedMoment());

  it("starts empty; a queued add waits with its day and the moment its goals make", () => {
    expect(queuedMoment()).toBeNull();
    queueMoment("2026-10-24", ["vitamin_c", "iron"]);
    expect(queuedMoment()).toMatchObject({ date: "2026-10-24", keys: ["vitamin_c", "iron"], moment: { tier: 1, lead: "vitamin_c", pops: ["iron"] } });
  });
  it("a second add before the first played joins it: the highest tier leads", () => {
    queueMoment("2026-10-24", ["vitamin_c"]);
    queueMoment("2026-10-24", ["kcal"]);
    expect(queuedMoment()?.moment).toMatchObject({ tier: 2, lead: "kcal", pops: ["vitamin_c"] });
  });
  it("a moment of an earlier day is replaced, never merged", () => {
    queueMoment("2026-10-23", ["column"]);
    queueMoment("2026-10-24", ["iron"]);
    expect(queuedMoment()).toMatchObject({ date: "2026-10-24", keys: ["iron"] });
  });
  it("no goals: nothing queued", () => {
    queueMoment("2026-10-24", []);
    expect(queuedMoment()).toBeNull();
  });
  it("tells its listeners, and clear empties it", () => {
    const heard = vi.fn();
    const off = subscribeMoment(heard);
    queueMoment("2026-10-24", ["iron"]);
    expect(heard).toHaveBeenCalledTimes(1);
    clearQueuedMoment();
    expect(heard).toHaveBeenCalledTimes(2);
    expect(queuedMoment()).toBeNull();
    off();
    queueMoment("2026-10-24", ["iron"]);
    expect(heard).toHaveBeenCalledTimes(2);
  });
  it("the snapshot is the same object until something changes (useSyncExternalStore)", () => {
    queueMoment("2026-10-24", ["iron"]);
    expect(queuedMoment()).toBe(queuedMoment());
  });
});

describe("the add's source", () => {
  it("is taken once: the next add has none", () => {
    expect(takeAddSource()).toBeNull();
    setAddSource("training");
    expect(takeAddSource()).toBe("training");
    expect(takeAddSource()).toBeNull();
  });
});

describe("columnSummary (RA2, RA3: the slot never contradicts the bars)", () => {
  it("under n/n: the lowest nutrients, as the column had them", () => {
    expect(columnSummary({ reached: 6, total: 8, lacking: ["Calcium", "Vitamin C"] }, 100)).toEqual({ reached: 6, total: 8, lacking: ["Calcium", "Vitamin C"], done: false });
  });
  it("n/n with Chất xơ short: the slot names Chất xơ, it is not finished", () => {
    expect(columnSummary({ reached: 8, total: 8, lacking: [] }, 60)).toEqual({ reached: 8, total: 8, lacking: ["Chất xơ"], done: false });
  });
  it("n/n with Chất xơ at 100 %: Đủ chất", () => {
    expect(columnSummary({ reached: 8, total: 8, lacking: [] }, 100)).toEqual({ reached: 8, total: 8, lacking: [], done: true });
  });
  it("a Chất xơ whose target is unknown is short too, as lib/goals counts it", () => {
    expect(columnSummary({ reached: 8, total: 8, lacking: [] }, null).done).toBe(false);
  });
  it("it follows the numbers down: a delete that takes the column back under brings the lacking names back", () => {
    expect(columnSummary({ reached: 7, total: 8, lacking: ["Iron"] }, 120)).toMatchObject({ done: false, lacking: ["Iron"] });
  });
  it("a Level with no counted nutrient is never done", () => {
    expect(columnSummary({ reached: 0, total: 0, lacking: [] }, 120).done).toBe(false);
  });
});

const COL = 'aside[data-fx="column"]';
const HERO = '[data-fx="hero"]';

describe("fxPlan (what a moment animates; classes only, transform and opacity)", () => {
  const sel = (plan: ReturnType<typeof fxPlan>, cls: string) => plan.steps.filter((s) => s.cls === cls).map((s) => s.sel);

  it("T1, a column nutrient: its percent pops, its bar sheens, the counter pops; no sparks", () => {
    const plan = fxPlan({ tier: 1, lead: "vitamin_c", pops: [] });
    expect(sel(plan, "m-goal-pop")).toEqual([`${COL} [data-nutrient-row="vitamin_c"] [data-fx="pct"]`, `${COL} [data-fx="count"]`]);
    expect(sel(plan, "m-goal-sheen")).toEqual([`${COL} [data-nutrient-row="vitamin_c"] [role="progressbar"]`]);
    expect(plan.sparks).toBe(false);
  });
  it("T1, Chất xơ: its row pops and sheens; the counter does not (Chất xơ is not counted)", () => {
    const plan = fxPlan({ tier: 1, lead: "fiber", pops: [] });
    expect(sel(plan, "m-goal-pop")).toEqual([`${COL} [data-nutrient-row="fiber"] [data-fx="pct"]`]);
  });
  it("T1, a hero macro: its percent pops and its bar sheens", () => {
    const plan = fxPlan({ tier: 1, lead: "macro:protein", pops: [] });
    expect(sel(plan, "m-goal-pop")).toEqual([`${HERO} [data-hero-macro="protein"] [data-fx="pct"]`]);
    expect(sel(plan, "m-goal-sheen")).toEqual([`${HERO} [data-hero-macro="protein"] [role="progressbar"]`]);
  });
  it("T2, kcal: the ring on the hero, the kcal percent pops, the kcal bar sheens", () => {
    const plan = fxPlan({ tier: 2, lead: "kcal", pops: [] });
    expect(sel(plan, "m-goal-ring")).toEqual([HERO]);
    expect(sel(plan, "m-goal-pop")).toEqual([`${HERO} [data-fx="kcal-pct"]`]);
    expect(sel(plan, "m-goal-sheen")).toEqual([`${HERO} [data-fx="kcal-bar"] [role="progressbar"]`]);
  });
  it("T2, the three macros: the ring, and the three macro percents pop and their bars sheen", () => {
    const plan = fxPlan({ tier: 2, lead: "macros", pops: ["macro:carbs", "macro:protein", "macro:fat"] });
    expect(sel(plan, "m-goal-ring")).toEqual([HERO]);
    expect(sel(plan, "m-goal-pop")).toHaveLength(3);
    expect(sel(plan, "m-goal-sheen")).toHaveLength(3);
  });
  it("T3: the counter pops with the sparks, every bar of the column sheens top to bottom 40 ms apart (at most 10), the Đủ chất line glides in", () => {
    const plan = fxPlan({ tier: 3, lead: "column", pops: [] });
    expect(plan.sparks).toBe(true);
    expect(sel(plan, "m-goal-pop")).toEqual([`${COL} [data-fx="count"]`]);
    const bars = plan.steps.find((s) => s.cls === "m-goal-sheen");
    expect(bars).toMatchObject({ sel: `${COL} [data-nutrient-row] [role="progressbar"]`, stagger: 40, max: 10, visibleOnly: true });
    expect(sel(plan, "m-goal-label")).toEqual([`${COL} [data-fx="done-line"]`]);
  });
  it("lower goals of the same add only pop their number: no sheen, no ring", () => {
    const plan = fxPlan({ tier: 3, lead: "column", pops: ["vitamin_c", "kcal", "macro:fat", "fiber"] });
    expect(sel(plan, "m-goal-ring")).toEqual([]);
    expect(sel(plan, "m-goal-pop")).toEqual(
      expect.arrayContaining([
        `${COL} [data-nutrient-row="vitamin_c"] [data-fx="pct"]`,
        `${HERO} [data-fx="kcal-pct"]`,
        `${HERO} [data-hero-macro="fat"] [data-fx="pct"]`,
        `${COL} [data-nutrient-row="fiber"] [data-fx="pct"]`,
      ])
    );
    expect(plan.steps.filter((s) => s.cls === "m-goal-sheen")).toHaveLength(1);
  });
  it("the first food leads over a T1 nutrient: the nutrient only pops", () => {
    const plan = fxPlan({ tier: 1, lead: FIRST_FOOD, pops: ["vitamin_c"] });
    expect(sel(plan, "m-goal-sheen")).toEqual([]);
    expect(sel(plan, "m-goal-pop")).toEqual(expect.arrayContaining([`${COL} [data-nutrient-row="vitamin_c"] [data-fx="pct"]`]));
  });
  it("Ngày tập plays on /training, not here: nothing on Hôm nay", () => {
    expect(fxPlan({ tier: 2, lead: "training", pops: [] })).toEqual({ steps: [], sparks: false });
  });
  it("no selector twice", () => {
    const plan = fxPlan({ tier: 3, lead: "column", pops: ["vitamin_c", "iron"] });
    const keys = plan.steps.map((s) => `${s.cls} ${s.sel}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
