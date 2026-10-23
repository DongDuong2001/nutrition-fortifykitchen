import { describe, expect, it } from "vitest";
import {
  CUSTOM_MINUTES_MAX,
  CUSTOM_MINUTES_MIN,
  calculateSaltTarget,
  clampTrainingMinutes,
  getTrainingDurations,
  getTrainingPhases,
  isPresetMinutes,
} from "../training";
import { calculateFastCarbsTarget, calculateSodiumTarget } from "../targets";
import { mergeServerProfile, setupFieldsOf, SAMPLE_PROFILE } from "../profile";

// The coach's rules (HANDOFF.md, lib/targets): salt 4–6 g + 1–1,5 g per 20 min, a salt dose every 20 min, fast carbs 30–45 g per hour
const saltDoses = (minutes: number) =>
  getTrainingPhases(minutes).find((p) => p.id === "intra-workout")!.items.filter((i) => i.id.startsWith("intra-salt")).length;

describe("Tùy chỉnh: the same rules for any number of minutes", () => {
  it.each([
    // minutes, salt doses, fast carbs g, salt g (min–max), sodium mg (min–max, rounded to 10)
    [150, 7, [75, 113], [11.5, 17.25], [4520, 6780]],
    [210, 10, [105, 158], [14.5, 21.75], [5700, 8550]],
    [480, 24, [240, 360], [28, 42], [11000, 16510]],
  ] as const)("%i min: %i salt doses, fast carbs, salt and sodium", (minutes, doses, carbs, salt, sodium) => {
    expect(saltDoses(minutes)).toBe(doses);
    expect(calculateFastCarbsTarget(minutes)).toEqual({ min: carbs[0], max: carbs[1] });
    const s = calculateSaltTarget(minutes);
    expect([s.totalMin, s.totalMax]).toEqual(salt);
    const na = calculateSodiumTarget(minutes);
    expect([na.min, na.max]).toEqual(sodium);
  });

  it("the presets do not change: Nghỉ, 45, 60, 90, 120 phút, and their doses and targets", () => {
    expect(getTrainingDurations().map((d) => [d.id, d.minutes, d.label])).toEqual([
      ["rest", 0, "Nghỉ"],
      ["45", 45, "45 phút"],
      ["60", 60, "60 phút"],
      ["90", 90, "90 phút"],
      ["120", 120, "120 phút"],
    ]);
    expect([45, 60, 90, 120].map(saltDoses)).toEqual([2, 3, 4, 6]);
    expect([45, 60, 90, 120].map((m) => calculateFastCarbsTarget(m))).toEqual([
      { min: 23, max: 34 },
      { min: 30, max: 45 },
      { min: 45, max: 68 },
      { min: 60, max: 90 },
    ]);
    expect(calculateSaltTarget(60).formattedTotal).toBe("7–10,5");
    expect(getTrainingPhases(0)).toEqual([]);
  });
});

describe("the picker's minutes", () => {
  it("30 to 480 in 30-minute steps; outside the range or off a step is clamped", () => {
    expect([CUSTOM_MINUTES_MIN, CUSTOM_MINUTES_MAX]).toEqual([30, 480]);
    expect(clampTrainingMinutes(150)).toBe(150);
    expect(clampTrainingMinutes(160)).toBe(150);
    expect(clampTrainingMinutes(170)).toBe(180);
    expect(clampTrainingMinutes(5)).toBe(30);
    expect(clampTrainingMinutes(0)).toBe(30);
    expect(clampTrainingMinutes(900)).toBe(480);
    expect(clampTrainingMinutes(Number.NaN)).toBe(30);
  });

  it("a preset is a chip; anything else is Tùy chỉnh", () => {
    expect([0, 45, 60, 90, 120].every(isPresetMinutes)).toBe(true);
    expect([150, 240, 480].some(isPresetMinutes)).toBe(false);
  });
});

describe("a Tùy chỉnh time reaches the server as it is (the API takes 0, 45 or 30–480 in 30-minute steps, migration 000018)", () => {
  it("the profile save sends the custom default itself", () => {
    expect(setupFieldsOf({ ...SAMPLE_PROFILE, trainingMinutesDefault: 150 }).trainingMinutesDefault).toBe(150);
    expect(setupFieldsOf({ ...SAMPLE_PROFILE, trainingMinutesDefault: 480 }).trainingMinutesDefault).toBe(480);
  });

  it("the server's default wins on a reload, a custom one too", () => {
    const local = { ...SAMPLE_PROFILE, trainingMinutesDefault: 90 };
    expect(mergeServerProfile({ ...SAMPLE_PROFILE, trainingMinutesDefault: 150 }, local).profile.trainingMinutesDefault).toBe(150);
    expect(mergeServerProfile({ ...SAMPLE_PROFILE, trainingMinutesDefault: 60 }, { ...SAMPLE_PROFILE, trainingMinutesDefault: 150 }).profile.trainingMinutesDefault).toBe(60);
  });
});
