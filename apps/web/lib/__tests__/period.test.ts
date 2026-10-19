import { describe, expect, it } from "vitest";
import {
  comparePeriods,
  loggingStreak,
  macroComposition,
  parsePeriodParams,
  period,
  periodAverages,
  periodQuery,
  periodTargetDays,
  weightSummary,
} from "../period";
import { calculateTargets } from "../targets";
import type { DayTotals } from "../day-totals";

const TODAY = "2026-10-12"; // Monday
const TARGETS = calculateTargets({ sex: "male", weightKg: 65, goal: "maintain" }); // kcal 1.950–2.275, protein 104–143

/** A logged day; any nutrient not given is null (unknown), never 0. */
function day(
  date: string,
  v: { calories: number; protein: number; carbs: number; fat: number; fiber?: number; nutrients?: Record<string, number | null> }
): DayTotals {
  return {
    date,
    logged: true,
    calories: v.calories,
    protein: v.protein,
    carbs: v.carbs,
    fat: v.fat,
    fiber: v.fiber ?? null,
    nutrients: v.nutrients ?? {},
  };
}
function empty(date: string): DayTotals {
  return { date, logged: false, calories: null, protein: null, carbs: null, fat: null, fiber: null, nutrients: {} };
}

describe("period(today, length, offset)", () => {
  it("ends on today by default: 7 days is 06–12/10", () => {
    const p = period(TODAY, 7, 0);
    expect(p.start).toBe("2026-10-06");
    expect(p.end).toBe("2026-10-12");
    expect(p.days).toHaveLength(7);
    expect(p.days[0]).toBe("2026-10-06");
    expect(p.days[6]).toBe("2026-10-12");
    expect(p.isCurrent).toBe(true);
  });

  it("steps back one whole period per offset (‹)", () => {
    const p = period(TODAY, 7, 1);
    expect(p.start).toBe("2026-09-29");
    expect(p.end).toBe("2026-10-05");
    expect(p.isCurrent).toBe(false);
    expect(period(TODAY, 7, 2).end).toBe("2026-09-28");
  });

  it("30 days crosses a month boundary", () => {
    const p = period(TODAY, 30, 0);
    expect(p.start).toBe("2026-09-13");
    expect(p.end).toBe("2026-10-12");
    expect(p.days).toHaveLength(30);
  });

  it("never reaches the future: a negative or bad offset is the current period", () => {
    expect(period(TODAY, 7, -1).end).toBe(TODAY);
    expect(period(TODAY, 7, Number.NaN).end).toBe(TODAY);
    expect(period(TODAY, 7, 1.7).offset).toBe(1);
  });

  it("labels the range", () => {
    expect(period(TODAY, 7, 0).label).toBe("06–12/10");
    expect(period(TODAY, 30, 0).label).toBe("13/09–12/10");
  });
});

describe("period URL params (?p=7&o=0)", () => {
  it("reads length and offset", () => {
    expect(parsePeriodParams("30", "2")).toEqual({ length: 30, offset: 2 });
  });

  it("falls back to 7 and 0 for missing or bad values", () => {
    expect(parsePeriodParams(null, null)).toEqual({ length: 7, offset: 0 });
    expect(parsePeriodParams("14", "-3")).toEqual({ length: 7, offset: 0 });
    expect(parsePeriodParams("abc", "x")).toEqual({ length: 7, offset: 0 });
  });

  it("writes the query, leaving the default out", () => {
    expect(periodQuery(7, 0)).toBe("");
    expect(periodQuery(30, 0)).toBe("?p=30");
    expect(periodQuery(7, 2)).toBe("?o=2");
    expect(periodQuery(30, 1)).toBe("?p=30&o=1");
  });
});

describe("periodAverages: logged days only, today and null skipped, never 0", () => {
  const days = [
    day("2026-10-08", { calories: 2000, protein: 100, carbs: 250, fat: 60, nutrients: { calcium: 400, vitamin_d: 2 } }),
    empty("2026-10-09"),
    day("2026-10-10", { calories: 1800, protein: 120, carbs: 200, fat: 50, nutrients: { calcium: 600, vitamin_d: null } }),
    day("2026-10-11", { calories: 2200, protein: 110, carbs: 300, fat: 70, nutrients: { calcium: 500 } }),
    // today, in progress: must not move any average
    day(TODAY, { calories: 500, protein: 10, carbs: 50, fat: 10, nutrients: { calcium: 10, vitamin_d: 9 } }),
  ];
  const avg = periodAverages(days, TODAY);

  it("counts only finished days that have entries", () => {
    expect(avg.loggedDays).toBe(3);
  });

  it("averages kcal and macros per logged day", () => {
    expect(avg.calories).toBeCloseTo(2000, 6);
    expect(avg.protein).toBeCloseTo(110, 6);
    expect(avg.carbs).toBeCloseTo(250, 6);
    expect(avg.fat).toBeCloseTo(60, 6);
  });

  it("skips a null value instead of counting it as 0", () => {
    expect(avg.nutrients.calcium).toBeCloseTo(500, 6);
    expect(avg.nutrients.vitamin_d).toBeCloseTo(2, 6); // one known value, two nulls
  });

  it("is null for a nutrient that no day knows", () => {
    expect(avg.nutrients.iron).toBeNull();
  });

  it("has null everywhere with no logged days", () => {
    const none = periodAverages([empty("2026-10-09"), day(TODAY, { calories: 500, protein: 10, carbs: 50, fat: 10 })], TODAY);
    expect(none.loggedDays).toBe(0);
    expect(none.calories).toBeNull();
    expect(none.protein).toBeNull();
    expect(none.nutrients.calcium).toBeNull();
  });
});

describe("periodTargetDays: above the range is đạt, null days are not counted", () => {
  const days = [
    day("2026-10-06", { calories: 2380, protein: 118, carbs: 280, fat: 60, nutrients: { calcium: 1600, iron: 9 } }), // above max: đạt
    day("2026-10-07", { calories: 1950, protein: 104, carbs: 250, fat: 60, nutrients: { calcium: 1200, iron: 7 } }), // exactly min: đạt
    day("2026-10-08", { calories: 1640, protein: 94, carbs: 210, fat: 46, nutrients: { calcium: 700, iron: null } }), // below (calcium min 800 for a man of 20–29, VN 2016)
    empty("2026-10-09"),
    day(TODAY, { calories: 3000, protein: 200, carbs: 300, fat: 60, nutrients: { calcium: 2000, iron: 20 } }), // today: not counted
  ];
  const result = periodTargetDays(days, TODAY, TARGETS);

  it("counts kcal and protein days at or above the minimum", () => {
    expect(result.calories).toEqual({ met: 2, of: 3 });
    expect(result.protein).toEqual({ met: 2, of: 3 });
  });

  it("counts a nutrient only on days where it is known", () => {
    expect(result.nutrients.calcium).toEqual({ met: 2, of: 3 });
    expect(result.nutrients.iron).toEqual({ met: 1, of: 2 }); // iron min 7,9: 9 yes, 7 no, null skipped
  });

  it("has of = 0 for a nutrient no day knows", () => {
    expect(result.nutrients.zinc).toEqual({ met: 0, of: 0 });
  });
});

describe("macroComposition: share of kcal from đạm, tinh bột, béo", () => {
  it("uses 4, 4 and 9 kcal per gram", () => {
    // 100 g protein = 400, 250 g carbs = 1.000, 60 g fat = 540 → 1.940 kcal: 20,6 % · 51,5 % · 27,8 %
    expect(macroComposition({ protein: 100, carbs: 250, fat: 60 })).toEqual({ protein: 21, carbs: 51, fat: 28 });  });

  it("always adds up to 100", () => {
    const c = macroComposition({ protein: 90, carbs: 200, fat: 70 });
    expect(c).not.toBeNull();
    expect(c!.protein + c!.carbs + c!.fat).toBe(100);
  });

  it("is null when a macro is unknown or there is nothing eaten", () => {
    expect(macroComposition({ protein: null, carbs: 100, fat: 10 })).toBeNull();
    expect(macroComposition({ protein: 0, carbs: 0, fat: 0 })).toBeNull();
  });
});

describe("comparePeriods: biggest changes first, facts only", () => {
  const current = periodAverages(
    [day("2026-10-08", { calories: 2000, protein: 100, carbs: 250, fat: 60, nutrients: { calcium: 590, magnesium: 300, iron: 10 } })],
    TODAY
  );
  const previous = periodAverages(
    [day("2026-10-01", { calories: 2100, protein: 112, carbs: 250, fat: 60, nutrients: { calcium: 500, magnesium: 330, iron: null } })],
    TODAY
  );
  const changes = comparePeriods(current, previous);

  it("sorts by the size of the relative change", () => {
    // calcium +18 %, magnesium −9,1 %, protein −10,7 %, calories −4,8 %
    expect(changes.map((c) => c.key)).toEqual(["calcium", "protein", "magnesium", "calories"]);
  });

  it("carries the values, the change and the percent change", () => {
    const calcium = changes[0];
    expect(calcium.current).toBe(590);
    expect(calcium.previous).toBe(500);
    expect(calcium.delta).toBe(90);
    expect(calcium.deltaPct).toBe(18);
    expect(calcium.label).toBe("Calcium");
    expect(calcium.unit).toBe("mg");
    const protein = changes.find((c) => c.key === "protein")!;
    expect(protein.delta).toBe(-12);
  });

  it("leaves out a metric that is unknown in either period, or that did not change", () => {
    const keys = changes.map((c) => c.key);
    expect(keys).not.toContain("iron"); // null before
    expect(keys).not.toContain("carbs"); // same
  });

  it("is empty when the previous period has no logged days", () => {
    expect(comparePeriods(current, periodAverages([], TODAY))).toEqual([]);
  });
});

describe("loggingStreak", () => {
  const logged = (set: string[]) => (iso: string) => set.includes(iso);

  it("counts back from today when today has entries", () => {
    expect(loggingStreak(logged(["2026-10-12", "2026-10-11", "2026-10-10", "2026-10-08"]), TODAY)).toBe(3);
  });

  it("counts back from yesterday when today is still empty", () => {
    expect(loggingStreak(logged(["2026-10-11", "2026-10-10", "2026-10-08"]), TODAY)).toBe(2);
  });

  it("is 0 when neither today nor yesterday has entries", () => {
    expect(loggingStreak(logged(["2026-10-10"]), TODAY)).toBe(0);
  });
});

describe("weightSummary", () => {
  const log = [
    { date: "2026-09-20", kg: 66.0 },
    { date: "2026-10-01", kg: 65.8 },
    { date: "2026-10-04", kg: 65.5 },
    { date: "2026-10-10", kg: 65.0 },
  ];

  it("gives the latest weight in the period and the change inside it", () => {
    const w = weightSummary(log, period(TODAY, 7, 0));
    expect(w.latest).toBe(65.0);
    // 06–12/10 holds only 10/10: one point, no change
    expect(w.change).toBeNull();
  });

  it("gives the change between the first and last entry of the period", () => {
    const w = weightSummary(log, period(TODAY, 30, 0)); // 13/09–12/10: all four
    expect(w.change).toBeCloseTo(-1.0, 6);
    expect(w.points).toHaveLength(4);
  });

  it("gives the change since the first entry up to the end of the period", () => {
    const w = weightSummary(log, period(TODAY, 7, 0));
    expect(w.sinceStart).toBeCloseTo(-1.0, 6);
    expect(w.startDate).toBe("2026-09-20");
  });

  it("uses only entries up to the period end for an earlier period", () => {
    const w = weightSummary(log, period(TODAY, 7, 1)); // 29/09–05/10: 01/10 and 04/10
    expect(w.change).toBeCloseTo(-0.3, 6);
    expect(w.latest).toBe(65.5);
    expect(w.sinceStart).toBeCloseTo(-0.5, 6);
  });

  it("has no weight for a period before the log, and the latest earlier weight when the period has none", () => {
    const none = weightSummary(log, period(TODAY, 7, 3)); // 15/09–21/09: only 20/09
    expect(none.change).toBeNull();
    expect(none.latest).toBe(66.0);
    expect(weightSummary([], period(TODAY, 7, 0))).toEqual({
      latest: null,
      change: null,
      sinceStart: null,
      startDate: null,
      points: [],
    });
  });
});

describe("a logged day whose entries have no kcal", () => {
  const unknownKcal: DayTotals = { ...day("2026-10-10", { calories: 0, protein: 100, carbs: 200, fat: 60 }), calories: null };

  it("is skipped by the kcal average, and the average is null (not 0) when no day knows kcal", () => {
    const withKnown = periodAverages([unknownKcal, day("2026-10-11", { calories: 2000, protein: 100, carbs: 200, fat: 60 })], TODAY);
    expect(withKnown.calories).toBe(2000);
    expect(periodAverages([unknownKcal], TODAY).calories).toBeNull();
    expect(periodAverages([unknownKcal], TODAY).protein).toBe(100);
  });

  it("is not counted in the days on kcal target", () => {
    expect(periodTargetDays([unknownKcal], TODAY, TARGETS).calories).toEqual({ met: 0, of: 0 });
  });
});
