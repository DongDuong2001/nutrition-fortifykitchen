import { describe, expect, it } from "vitest";
import {
  blankDay,
  copyMeals,
  dayEntries,
  dayStatus,
  entriesKcal,
  monthGrid,
  shiftIsoDate,
  shiftMonth,
  statDisplay,
  viewedIsoDate,
} from "../day-history";
import { pastDayData } from "../diary-store";
import { SAMPLE_PROFILE, targetsFor } from "../profile";
import { SAMPLE_DAY } from "../mock/sample-day";

const TODAY = "2026-10-11";
const YESTERDAY = "2026-10-10";

describe("statDisplay", () => {
  it("shows consumed over the target range, and consumed alone with no target", () => {
    expect(statDisplay(0, { unit: "g", targetMin: 104, targetMax: 143 })).toBe("0 / 104–143 g");
    expect(statDisplay(0, { unit: "g", targetMin: null })).toBe("0 g");
  });
});

describe("blankDay and pastDayData", () => {
  it("blankDay has nothing eaten: energy and meals at zero, macros and micros unknown (null)", () => {
    const blank = blankDay(SAMPLE_DAY);
    expect(blank.calories.consumed).toBe(0);
    expect(blank.meals.every((m) => m.items.length === 0 && m.kcal === 0)).toBe(true);
    expect(blank.macros.every((m) => m.consumed === null && m.percentage === null)).toBe(true);
    expect(blank.minerals.every((m) => m.consumed === null && m.percentage === null)).toBe(true);
    expect(blank.microsSummary.achieved).toBe(0);
  });

  it("pastDayData for yesterday adds its mock entries to the empty day", () => {
    const targets = targetsFor(SAMPLE_PROFILE);
    const day = pastDayData(YESTERDAY, TODAY, SAMPLE_PROFILE, targets);
    expect(day.date).toBe(YESTERDAY);
    expect(day.calories.consumed).toBe(1532);
    expect(day.calories.targetMin).toBe(targets.calories.min);
  });

  it("pastDayData for a day with nothing logged reads zero", () => {
    const day = pastDayData("2026-08-05", TODAY, SAMPLE_PROFILE, targetsFor(SAMPLE_PROFILE));
    expect(day.calories.consumed).toBe(0);
    expect(day.meals.every((m) => m.items.length === 0)).toBe(true);
  });
});

describe("shiftIsoDate", () => {
  it("moves a day back across a month boundary", () => {
    expect(shiftIsoDate("2026-10-01", -1)).toBe("2026-09-30");
  });

  it("moves a day forward across a year boundary", () => {
    expect(shiftIsoDate("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("returns the same day for 0", () => {
    expect(shiftIsoDate(TODAY, 0)).toBe(TODAY);
  });
});

describe("viewedIsoDate", () => {
  it("shows a past day from the ?date= value", () => {
    expect(viewedIsoDate("2026-10-05", TODAY)).toBe("2026-10-05");
  });

  it("falls back to today for no value, a bad value, today and future days", () => {
    expect(viewedIsoDate(null, TODAY)).toBe(TODAY);
    expect(viewedIsoDate("", TODAY)).toBe(TODAY);
    expect(viewedIsoDate("hôm qua", TODAY)).toBe(TODAY);
    expect(viewedIsoDate(TODAY, TODAY)).toBe(TODAY);
    expect(viewedIsoDate("2026-10-12", TODAY)).toBe(TODAY);
  });

  it("rejects a date that does not exist", () => {
    expect(viewedIsoDate("2026-02-31", TODAY)).toBe(TODAY);
  });
});

describe("dayEntries (mock history)", () => {
  it("gives yesterday its logged items, with kcal from the catalog", () => {
    const entries = dayEntries(YESTERDAY, TODAY);
    expect(entries).toHaveLength(9);
    expect(entriesKcal(entries)).toBe(1532);
    expect(entries.every((e) => e.foodName.length > 0)).toBe(true);
  });

  it("gives the 29 days before today a mock history, with a few days not logged", () => {
    const perDay = Array.from({ length: 29 }, (_, i) => dayEntries(shiftIsoDate(TODAY, -(i + 1)), TODAY));
    const loggedDays = perDay.filter((entries) => entries.length > 0);
    expect(loggedDays.length).toBeGreaterThanOrEqual(24);
    expect(loggedDays.length).toBeLessThan(29);
    // every history entry has a food from the catalog and a unique id
    const all = loggedDays.flat();
    expect(all.every((e) => e.foodName.length > 0 && e.calories > 0)).toBe(true);
    expect(new Set(all.map((e) => e.id)).size).toBe(all.length);
  });

  it("gives today, the future and days older than the history no entries", () => {
    expect(dayEntries(TODAY, TODAY)).toEqual([]);
    expect(dayEntries("2026-10-12", TODAY)).toEqual([]);
    expect(dayEntries(shiftIsoDate(TODAY, -30), TODAY)).toEqual([]);
    expect(dayEntries("2026-01-05", TODAY)).toEqual([]);
  });

  it("keeps the same entries for the same day (the history is fixed, not random)", () => {
    const iso = shiftIsoDate(TODAY, -5);
    expect(dayEntries(iso, TODAY)).toEqual(dayEntries(iso, TODAY));
  });
});

describe("copyMeals", () => {
  it("copies only the chosen meals, keeping their order and leaving the source as it was", () => {
    const source = dayEntries(YESTERDAY, TODAY);
    const before = JSON.stringify(source);

    const copied = copyMeals(source, ["breakfast", "dinner"], "copy-1", "2026-10-11T08:00:00.000Z");

    expect(copied).toHaveLength(6);
    expect(copied.map((e) => e.mealSlot)).toEqual(["breakfast", "breakfast", "breakfast", "dinner", "dinner", "dinner"]);
    expect(entriesKcal(copied)).toBe(459 + 475);
    expect(copied.every((e) => e.id.startsWith("copy-1-"))).toBe(true);
    expect(new Set(copied.map((e) => e.id)).size).toBe(copied.length);
    expect(copied[0].addedAt).toBe("2026-10-11T08:00:00.000Z");
    expect(JSON.stringify(source)).toBe(before);
  });

  it("copies nothing when no meal is chosen", () => {
    expect(copyMeals(dayEntries(YESTERDAY, TODAY), [], "copy-2", "x")).toEqual([]);
  });
});

describe("dayStatus", () => {
  const range = { min: 1950, max: 2275 };

  it("is none with nothing logged", () => {
    expect(dayStatus(0, range)).toBe("none");
  });

  it("is under below the minimum and over above the maximum", () => {
    expect(dayStatus(1949, range)).toBe("under");
    expect(dayStatus(2276, range)).toBe("over");
  });

  it("is met at both ends of the range", () => {
    expect(dayStatus(1950, range)).toBe("met");
    expect(dayStatus(2275, range)).toBe("met");
  });
});

describe("monthGrid", () => {
  it("starts October 2026 on a Thursday, so three blanks come before the 1st (Monday first)", () => {
    const grid = monthGrid("2026-10", TODAY);
    expect(grid.leading).toBe(3);
    expect(grid.days).toHaveLength(31);
    expect(grid.days[0].iso).toBe("2026-10-01");
    expect(grid.days[30].iso).toBe("2026-10-31");
  });

  it("marks days after today as future", () => {
    const grid = monthGrid("2026-10", TODAY);
    expect(grid.days.find((d) => d.iso === TODAY)?.future).toBe(false);
    expect(grid.days.find((d) => d.iso === "2026-10-12")?.future).toBe(true);
  });
});

describe("shiftMonth", () => {
  it("moves the month across the year", () => {
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-10", 1)).toBe("2026-11");
  });
});
