import { describe, expect, it } from "vitest";
import { DEFAULT_FLAGS, type OnboardingFlags } from "../onboarding-flags";
import { SHARE_NUDGE_TEXT, dayWellFed, shareNudgeDue } from "../share-nudge";

const flags = (over: Partial<OnboardingFlags> = {}): OnboardingFlags => ({ ...DEFAULT_FLAGS, ...over });
const ids = ["vitamin_c", "iron", "calcium", "zinc", "magnesium", "potassium"];
const targets = { vitamin_c: 100, iron: 10, calcium: 1000, zinc: 10, magnesium: 400, potassium: 3000 };
// Five at 80 % or more (Gần đủ or Đạt): vitamin C 80 %, iron 100 %, calcium 90 %, zinc 150 %, magnesium 80 %; potassium 10 %
const five = { vitamin_c: 80, iron: 10, calcium: 900, zinc: 15, magnesium: 320, potassium: 300 };

describe("dayWellFed: 80 % of kcal and five vitamins or minerals at Gần đủ or Đạt", () => {
  it("is true at 80 % kcal with five at 80 % or more", () => {
    expect(dayWellFed({ kcal: 1600, kcalTarget: 2000, values: five, targets, ids })).toBe(true);
  });

  it("is false under 80 % kcal, or with four", () => {
    expect(dayWellFed({ kcal: 1580, kcalTarget: 2000, values: five, targets, ids })).toBe(false);
    expect(dayWellFed({ kcal: 2000, kcalTarget: 2000, values: { ...five, magnesium: 310 }, targets, ids })).toBe(false);
  });

  it("counts a level the way the bars do (79,5 % rounds to 80 %); unknown values and targets count for nothing", () => {
    expect(dayWellFed({ kcal: 2000, kcalTarget: 2000, values: { ...five, magnesium: 318 }, targets, ids })).toBe(true);
    expect(dayWellFed({ kcal: 2000, kcalTarget: 2000, values: { ...five, iron: null }, targets, ids })).toBe(false);
    expect(dayWellFed({ kcal: 2000, kcalTarget: 2000, values: five, targets: { ...targets, iron: null }, ids })).toBe(false);
    expect(dayWellFed({ kcal: null, kcalTarget: 2000, values: five, targets, ids })).toBe(false);
    expect(dayWellFed({ kcal: 2000, kcalTarget: null, values: five, targets, ids })).toBe(false);
  });
});

describe("shareNudgeDue: once a day, when the day first gets there", () => {
  const today = "2026-10-22";

  it("when the day goes from not there to there", () => {
    expect(shareNudgeDue({ flags: flags(), todayIso: today, was: false, now: true })).toBe(true);
  });

  it("not when it already was (an app opened on a full day), or is not", () => {
    expect(shareNudgeDue({ flags: flags(), todayIso: today, was: true, now: true })).toBe(false);
    expect(shareNudgeDue({ flags: flags(), todayIso: today, was: null, now: true })).toBe(false);
    expect(shareNudgeDue({ flags: flags(), todayIso: today, was: false, now: false })).toBe(false);
  });

  it("at most once a day, never the day the share tip showed, never with tips off", () => {
    expect(shareNudgeDue({ flags: flags({ shareNudgeIso: today }), todayIso: today, was: false, now: true })).toBe(false);
    expect(shareNudgeDue({ flags: flags({ shareNudgeIso: "2026-10-21" }), todayIso: today, was: false, now: true })).toBe(true);
    expect(shareNudgeDue({ flags: flags({ shareTipIso: today }), todayIso: today, was: false, now: true })).toBe(false);
    expect(shareNudgeDue({ flags: flags({ tipsOff: true }), todayIso: today, was: false, now: true })).toBe(false);
  });

  it("says so in the words of the brief", () => {
    expect(SHARE_NUDGE_TEXT).toBe("Hôm nay ăn khá đủ chất — chia sẻ nhé?");
  });
});
