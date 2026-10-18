import { describe, it, expect, vi } from "vitest";
import { writeDay } from "../training-checklist";
import { rememberServerTraining, subscribeTraining, trainingChanged, trainingMinutesFor, trainingVersion } from "../training-minutes";
import { SAMPLE_PROFILE, applyProfileTargets, targetsFor } from "../profile";
import { SAMPLE_DAY } from "../mock/sample-day";
import { calculateFastCarbsTarget, calculateSodiumTarget } from "../targets";

function fakeStorage() {
  const data: Record<string, string> = {};
  return {
    getItem: (key: string) => (key in data ? data[key] : null),
    setItem: (key: string, value: string) => {
      data[key] = value;
    },
  };
}

const TODAY = "2026-10-18";
const TOMORROW = "2026-10-19";
const PROFILE = { trainingMinutesDefault: 60 };

describe("trainingMinutesFor (lib/training-minutes.ts)", () => {
  it("a day with nothing chosen reads the Hồ sơ default", () => {
    const storage = fakeStorage();
    expect(trainingMinutesFor(TODAY, PROFILE, { storage, account: "a@x.vn" })).toBe(60);
    expect(trainingMinutesFor(TODAY, { trainingMinutesDefault: 0 }, { storage, account: "a@x.vn" })).toBe(0);
  });

  it("the minutes chosen for a day win, and the next day still reads the default", () => {
    const storage = fakeStorage();
    writeDay(TODAY, { minutes: 90, ticked: [] }, storage);
    expect(trainingMinutesFor(TODAY, PROFILE, { storage, account: "a@x.vn" })).toBe(90);
    expect(trainingMinutesFor(TOMORROW, PROFILE, { storage, account: "a@x.vn" })).toBe(60);
  });

  it("a rest day chosen for a day reads 0, not the default", () => {
    const storage = fakeStorage();
    writeDay(TODAY, { minutes: 0, ticked: [] }, storage);
    expect(trainingMinutesFor(TODAY, PROFILE, { storage, account: "a@x.vn" })).toBe(0);
  });

  it("changing the Hồ sơ default leaves a day that was set", () => {
    const storage = fakeStorage();
    writeDay(TODAY, { minutes: 90, ticked: [] }, storage);
    expect(trainingMinutesFor(TODAY, { trainingMinutesDefault: 45 }, { storage, account: "a@x.vn" })).toBe(90);
    expect(trainingMinutesFor(TOMORROW, { trainingMinutesDefault: 45 }, { storage, account: "a@x.vn" })).toBe(45);
  });

  it("with nothing saved on the device, the server's minutes for that day come next", () => {
    const storage = fakeStorage();
    rememberServerTraining("b@x.vn", TODAY, 120, 60);
    expect(trainingMinutesFor(TODAY, PROFILE, { storage, account: "b@x.vn" })).toBe(120);
    // Only that day, only that account
    expect(trainingMinutesFor(TOMORROW, PROFILE, { storage, account: "b@x.vn" })).toBe(60);
    expect(trainingMinutesFor(TODAY, PROFILE, { storage, account: "c@x.vn" })).toBe(60);
    // The device's own choice still wins
    writeDay(TODAY, { minutes: 45, ticked: [] }, storage);
    expect(trainingMinutesFor(TODAY, PROFILE, { storage, account: "b@x.vn" })).toBe(45);
  });

  it("a server value equal to the default is the default, so a later change in Hồ sơ applies", () => {
    const storage = fakeStorage();
    rememberServerTraining("d@x.vn", TODAY, 60, 60);
    expect(trainingMinutesFor(TODAY, { trainingMinutesDefault: 90 }, { storage, account: "d@x.vn" })).toBe(90);
  });

  it("a later server answer replaces the earlier one; a bad value is ignored", () => {
    const storage = fakeStorage();
    rememberServerTraining("e@x.vn", TODAY, 120, 60);
    rememberServerTraining("e@x.vn", TODAY, 60, 60);
    expect(trainingMinutesFor(TODAY, PROFILE, { storage, account: "e@x.vn" })).toBe(60);
    rememberServerTraining("e@x.vn", TODAY, "90", 60);
    rememberServerTraining("e@x.vn", TODAY, -1, 60);
    expect(trainingMinutesFor(TODAY, PROFILE, { storage, account: "e@x.vn" })).toBe(60);
  });

  it("tells the screens when a day's minutes may have changed", () => {
    const listener = vi.fn();
    const stop = subscribeTraining(listener);
    const before = trainingVersion();
    trainingChanged();
    expect(trainingVersion()).toBe(before + 1);
    expect(listener).toHaveBeenCalledTimes(1);
    // A server answer that changes nothing does not
    rememberServerTraining("f@x.vn", TODAY, 60, 60);
    expect(listener).toHaveBeenCalledTimes(1);
    rememberServerTraining("f@x.vn", TODAY, 90, 60);
    expect(listener).toHaveBeenCalledTimes(2);
    stop();
    trainingChanged();
    expect(listener).toHaveBeenCalledTimes(2);
  });
});

describe("the day's targets follow its training minutes", () => {
  it("salt and fast carbs are worked out from the day's minutes, not the Hồ sơ default", () => {
    const t = targetsFor(SAMPLE_PROFILE, 90);
    expect(t.sodium).toEqual(calculateSodiumTarget(90));
    expect(t.fastCarbs).toEqual(calculateFastCarbsTarget(90));
    expect(t.sodium).not.toEqual(targetsFor(SAMPLE_PROFILE).sodium);
    expect(targetsFor(SAMPLE_PROFILE).sodium).toEqual(calculateSodiumTarget(SAMPLE_PROFILE.trainingMinutesDefault));
  });

  it("the day's user shows the day's minutes (Hôm nay's Ngày tập pill)", () => {
    const day = applyProfileTargets(SAMPLE_DAY, SAMPLE_PROFILE, targetsFor(SAMPLE_PROFILE, 90), 90);
    expect(day.user.trainingMinutes).toBe(90);
    const rest = applyProfileTargets(SAMPLE_DAY, SAMPLE_PROFILE, targetsFor(SAMPLE_PROFILE, 0), 0);
    expect(rest.user.trainingMinutes).toBe(0);
  });
});
