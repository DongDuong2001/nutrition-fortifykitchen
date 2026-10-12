import { describe, it, expect, vi, afterEach } from "vitest";
import { getTodayIsoVN, withRuntimeDate } from "../date";
import { SAMPLE_DAY } from "../mock/sample-day";
import { SAMPLE_PROFILE, applyProfileTargets, targetsFor } from "../profile";
import { calculateSaltTarget } from "../training";

describe("getTodayIsoVN", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns YYYY-MM-DD for today in Asia/Ho_Chi_Minh", () => {
    // 2026-10-11 15:00 in Saigon (UTC+7) = 2026-10-11T08:00:00Z
    vi.setSystemTime(new Date("2026-10-11T08:00:00Z"));
    expect(getTodayIsoVN()).toBe("2026-10-11");
  });

  it("handles midnight boundary: 23:30 Saigon is still the same day", () => {
    // 23:30 in Saigon on Oct 11 = 16:30 UTC on Oct 11
    vi.setSystemTime(new Date("2026-10-11T16:30:00Z"));
    expect(getTodayIsoVN()).toBe("2026-10-11");
  });

  it("handles early morning: 00:30 Saigon on Oct 12 = still Oct 11 in UTC", () => {
    // 00:30 in Saigon on Oct 12 = 17:30 UTC on Oct 11
    vi.setSystemTime(new Date("2026-10-11T17:30:00Z"));
    expect(getTodayIsoVN()).toBe("2026-10-12");
  });

  it("returns correctly for a different year boundary", () => {
    // 2027-01-01 00:30 Saigon = 2026-12-31T17:30:00Z
    vi.setSystemTime(new Date("2026-12-31T17:30:00Z"));
    expect(getTodayIsoVN()).toBe("2027-01-01");
  });
});

describe("withRuntimeDate", () => {
  it("returns a new day with the date, labels and desktop subtitle for that date", () => {
    const day = withRuntimeDate(SAMPLE_DAY, "2026-10-12");
    expect(day).not.toBe(SAMPLE_DAY);
    expect(day.date).toBe("2026-10-12");
    expect(day.dateLabel).toBe("Hôm nay 12/10");
    expect(day.desktopDateLabel).toBe("Thứ Hai, 12/10/2026 · Ngày tập 60′ · Giữ cân · 65 kg");
  });

  it("does not change the day it was given", () => {
    const before = JSON.stringify(SAMPLE_DAY);
    withRuntimeDate(SAMPLE_DAY, "2030-01-01");
    expect(JSON.stringify(SAMPLE_DAY)).toBe(before);
  });

  it("keeps the meals and totals as they are", () => {
    const day = withRuntimeDate(SAMPLE_DAY, "2026-10-12");
    expect(day.meals).toBe(SAMPLE_DAY.meals);
    expect(day.calories).toBe(SAMPLE_DAY.calories);
  });
});

describe("the profile drives the day's user fields", () => {
  const profile = { ...SAMPLE_PROFILE, trainingMinutesDefault: 90, weightKg: 70.5, goal: "build" as const };
  const day = withRuntimeDate(applyProfileTargets(SAMPLE_DAY, profile, targetsFor(profile)), "2026-10-12");

  it("writes minutes, goal name and weight (vi format) into the desktop label", () => {
    expect(day.user).toMatchObject({ trainingMinutes: 90, weightKg: 70.5, goalLabel: "Tăng cơ" });
    expect(day.desktopDateLabel).toBe("Thứ Hai, 12/10/2026 · Ngày tập 90′ · Tăng cơ · 70,5 kg");
  });

  it("gives the salt total for the profile's minutes", () => {
    const salt = calculateSaltTarget(day.user.trainingMinutes);
    expect(salt.baseMin).toBe(4);
    expect(salt.topUpMin).toBe(4.5); // 90 min = 4.5 x 20 min, 1 g each
    expect(salt.topUpMax).toBe(6.75);
    expect(salt.totalMin).toBe(8.5);
    expect(salt.totalMax).toBe(12.75);
    expect(salt.totalMin).not.toBe(calculateSaltTarget(60).totalMin);
  });
});
