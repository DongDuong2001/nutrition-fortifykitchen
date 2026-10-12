import { describe, expect, it } from "vitest";
import {
  amountLabel,
  dayIsEmpty,
  historyDays,
  levelFor,
  nutrientOnDay,
  weekdayShortVi,
} from "../nutrient-detail";
import { getNutrientDefinition } from "../nutrients";
import { blankDay } from "../day-history";
import { SAMPLE_DAY } from "../mock/sample-day";

describe("amountLabel", () => {
  it("shows a dash for an unknown amount, never 0", () => {
    expect(amountLabel(null, "mg")).toBe("—");
  });

  it("shows the amount with its unit", () => {
    expect(amountLabel(331, "mg")).toBe("331 mg");
    expect(amountLabel(1041, "kcal")).toBe("1.041 kcal");
  });
});

describe("levelFor", () => {
  it("has no level without a percentage", () => {
    expect(levelFor(null)).toBeNull();
  });

  it("maps the four bands: under 50, 50–79, 80–99, 100 and over", () => {
    expect(levelFor(28)).toBe("thieu");
    expect(levelFor(49)).toBe("thieu");
    expect(levelFor(50)).toBe("trungbinh");
    expect(levelFor(79)).toBe("trungbinh");
    expect(levelFor(80)).toBe("ganDu");
    expect(levelFor(99)).toBe("ganDu");
    expect(levelFor(100)).toBe("dat");
    expect(levelFor(130)).toBe("dat");
  });
});

describe("historyDays", () => {
  it("returns seven days, oldest first, ending on today", () => {
    expect(historyDays("2026-10-10")).toEqual([
      "2026-10-04",
      "2026-10-05",
      "2026-10-06",
      "2026-10-07",
      "2026-10-08",
      "2026-10-09",
      "2026-10-10",
    ]);
  });

  it("crosses a month boundary", () => {
    expect(historyDays("2026-11-02")[0]).toBe("2026-10-27");
  });
});

describe("weekdayShortVi", () => {
  it("gives the short Vietnamese weekday, Sunday as CN", () => {
    expect(weekdayShortVi("2026-10-11")).toBe("CN");
    expect(weekdayShortVi("2026-10-12")).toBe("T2");
    expect(weekdayShortVi("2026-10-10")).toBe("T7");
  });
});

describe("dayIsEmpty", () => {
  it("is false for a day with meals and true for a day with nothing logged", () => {
    expect(dayIsEmpty(SAMPLE_DAY)).toBe(false);
    expect(dayIsEmpty(blankDay(SAMPLE_DAY))).toBe(true);
  });
});

describe("nutrientOnDay", () => {
  const calcium = getNutrientDefinition("calcium")!;

  it("reads the row for a day with entries", () => {
    const row = nutrientOnDay(SAMPLE_DAY, calcium);
    expect(row?.consumed).toBe(331);
    expect(row?.percentage).toBe(28);
  });

  it("shows a dash, never 0, for a day with nothing logged", () => {
    const row = nutrientOnDay(blankDay(SAMPLE_DAY), calcium);
    expect(row?.consumed).toBeNull();
    expect(row?.percentage).toBeNull();
    expect(row?.formattedAmount).toBe("—");
  });
});
