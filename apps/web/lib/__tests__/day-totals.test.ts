import { describe, expect, it } from "vitest";
import { COUNTED_NUTRIENT_KEYS, dayTotals, totalsFromDay, totalsFromEntries } from "../day-totals";
import { dayEntries, shiftIsoDate } from "../day-history";
import { pastDayData } from "../diary-store";
import { SAMPLE_PROFILE, targetsFor } from "../profile";
import { SAMPLE_DAY } from "../mock/sample-day";

const TODAY = "2026-10-12";
const YESTERDAY = "2026-10-11";

describe("COUNTED_NUTRIENT_KEYS", () => {
  it("is the 22 counted nutrients: 12 vitamins and 10 minerals", () => {
    expect(COUNTED_NUTRIENT_KEYS).toHaveLength(22);
    expect(new Set(COUNTED_NUTRIENT_KEYS).size).toBe(22);
    expect(COUNTED_NUTRIENT_KEYS).toContain("vitamin_d");
    expect(COUNTED_NUTRIENT_KEYS).toContain("sodium");
    expect(COUNTED_NUTRIENT_KEYS).not.toContain("energy");
    expect(COUNTED_NUTRIENT_KEYS).not.toContain("protein");
  });

  it("matches the vitamins and minerals of the sample day", () => {
    const sample = [...SAMPLE_DAY.minerals, ...SAMPLE_DAY.vitamins].map((s) => s.key).sort();
    expect([...COUNTED_NUTRIENT_KEYS].sort()).toEqual(sample);
  });
});

describe("totalsFromDay (today)", () => {
  const totals = totalsFromDay(SAMPLE_DAY);

  it("reads kcal and the four macros of the sample day", () => {
    expect(totals.date).toBe(SAMPLE_DAY.date);
    expect(totals.logged).toBe(true);
    expect(totals.calories).toBe(1041);
    expect(totals.protein).toBe(62);
    expect(totals.carbs).toBe(133);
    expect(totals.fat).toBe(21);
    expect(totals.fiber).toBe(14);
  });

  it("has a value or null for each of the 22 nutrients", () => {
    expect(Object.keys(totals.nutrients).sort()).toEqual([...COUNTED_NUTRIENT_KEYS].sort());
    expect(totals.nutrients.calcium).toBe(331);
    expect(totals.nutrients.vitamin_d).toBe(2.1);
  });
});

describe("totalsFromEntries (a past day)", () => {
  const entries = dayEntries(YESTERDAY, TODAY);
  const totals = totalsFromEntries(YESTERDAY, entries);

  it("sums the entries of the day: yesterday is 1.532 kcal", () => {
    expect(totals.logged).toBe(true);
    expect(totals.calories).toBe(1532);
  });

  it("has a key for all 22 nutrients, a number only where a food knows it", () => {
    expect(Object.keys(totals.nutrients).sort()).toEqual([...COUNTED_NUTRIENT_KEYS].sort());
    expect(totals.nutrients.potassium).toBeGreaterThan(0);
    expect(totals.nutrients.b5).toBeNull(); // no food in the catalog carries B5
  });

  it("sums known macros only: an unknown macro adds nothing and stays null when nothing knows it", () => {
    const [first, ...rest] = entries;
    const quick = { ...first, id: "q", kind: "quick" as const, protein: null, carbs: null, fat: null, fiber: null };
    const withQuick = totalsFromEntries(YESTERDAY, [...entries, quick]);
    expect(withQuick.protein).toBe(totals.protein);
    expect(withQuick.fat).toBe(totals.fat);
    expect(withQuick.calories).toBe((totals.calories ?? 0) + first.calories);

    const onlyQuick = totalsFromEntries(YESTERDAY, [quick]);
    expect(onlyQuick.protein).toBeNull();
    expect(onlyQuick.carbs).toBeNull();
    expect(onlyQuick.fat).toBeNull();
    expect(onlyQuick.fiber).toBeNull();
    expect(onlyQuick.calories).toBe(first.calories);
    expect(rest.length).toBeGreaterThan(0);
  });

  it("is not logged, with null (not 0) everywhere, for a day with no entries", () => {
    const none = totalsFromEntries("2026-08-01", []);
    expect(none.logged).toBe(false);
    expect(none.calories).toBeNull();
    expect(none.protein).toBeNull();
    expect(Object.values(none.nutrients).every((v) => v === null)).toBe(true);
    expect(Object.keys(none.nutrients)).toHaveLength(22);
  });
});

describe("dayTotals: today from the live day, other days from the history", () => {
  it("uses the day it is given for today", () => {
    const edited = { ...SAMPLE_DAY, calories: { ...SAMPLE_DAY.calories, consumed: 1300 } };
    expect(dayTotals(TODAY, TODAY, edited).calories).toBe(1300);
  });

  it("falls back to the sample day for today when no live day is given", () => {
    expect(dayTotals(TODAY, TODAY).calories).toBe(1041);
  });

  it("reads yesterday from its entries", () => {
    expect(dayTotals(YESTERDAY, TODAY).calories).toBe(1532);
  });

  it("is not logged for a day older than the history", () => {
    const old = dayTotals(shiftIsoDate(TODAY, -60), TODAY);
    expect(old.logged).toBe(false);
    expect(old.calories).toBeNull();
  });
});

describe("one source: Nhật ký and Tổng quan show the same numbers for the same day", () => {
  const targets = targetsFor(SAMPLE_PROFILE);

  it("pastDayData matches dayTotals for every logged day of the history", () => {
    let checked = 0;
    for (let ago = 1; ago <= 29; ago++) {
      const iso = shiftIsoDate(TODAY, -ago);
      const totals = dayTotals(iso, TODAY);
      if (!totals.logged) continue;
      checked++;
      const day = pastDayData(iso, TODAY, SAMPLE_PROFILE, targets);
      expect(day.calories.consumed).toBe(totals.calories);
      const macro = (key: string) => day.macros.find((m) => m.key === key)?.consumed;
      expect(macro("protein")).toBe(totals.protein);
      expect(macro("carbs")).toBe(totals.carbs);
      expect(macro("fat")).toBe(totals.fat);
      expect(macro("fiber")).toBe(totals.fiber);
      for (const stat of [...day.minerals, ...day.vitamins]) {
        expect(stat.consumed, `${iso} ${stat.key}`).toBe(totals.nutrients[stat.key]);
      }
    }
    expect(checked).toBeGreaterThan(20);
  });

  it("a day with no entries reads null for every nutrient in the diary too", () => {
    const iso = shiftIsoDate(TODAY, -60);
    const day = pastDayData(iso, TODAY, SAMPLE_PROFILE, targets);
    expect([...day.minerals, ...day.vitamins].every((s) => s.consumed === null)).toBe(true);
  });
});
