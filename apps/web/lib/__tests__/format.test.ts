import { describe, it, expect } from "vitest";
import { formatNumber, formatRange, formatAmount, getWeekdayName, formatDesktopDate, formatDayLabel } from "../format";
import { parseNumberInput } from "../parse-number";

describe("lib/format", () => {
  describe("formatNumber", () => {
    it("formats integers with dot thousand separators", () => {
      expect(formatNumber(0)).toBe("0");
      expect(formatNumber(60)).toBe("60");
      expect(formatNumber(1041)).toBe("1.041");
      expect(formatNumber(1950)).toBe("1.950");
      expect(formatNumber(2275)).toBe("2.275");
      expect(formatNumber(1000000)).toBe("1.000.000");
    });

    it("formats decimal numbers with comma decimal separator", () => {
      expect(formatNumber(2.1)).toBe("2,1");
      expect(formatNumber(1.5, { decimals: 1 })).toBe("1,5");
      expect(formatNumber(2.125, { decimals: 2 })).toBe("2,13");
      expect(formatNumber(1041.5, { decimals: 1 })).toBe("1.041,5");
      expect(formatNumber(0.6)).toBe("0,6");
      expect(formatNumber(0.04)).toBe("0,04");
    });
  });

  describe("formatRange", () => {
    it("formats ranges with en-dash and dot thousand separators", () => {
      expect(formatRange(1950, 2275)).toBe("1.950–2.275");
      expect(formatRange(33, 65)).toBe("33–65");
      expect(formatRange(5200, 6500)).toBe("5.200–6.500");
    });

    it("returns single value if min equals max", () => {
      expect(formatRange(1200, 1200)).toBe("1.200");
    });
  });

  describe("formatAmount", () => {
    it("formats mg with 1 decimal below 100 and whole for 100+", () => {
      expect(formatAmount(1.1, "mg")).toBe("1,1");
      expect(formatAmount(6.5, "mg")).toBe("6,5");
      expect(formatAmount(12.4, "mg")).toBe("12,4");
      expect(formatAmount(3900, "mg")).toBe("3.900");
      expect(formatAmount(0.05, "mg")).toBe("0,05");
    });

    it("formats kcal as whole numbers", () => {
      expect(formatAmount(1041, "kcal")).toBe("1.041");
    });

    it("formats g and µg with 1 decimal below 100", () => {
      expect(formatAmount(2.1, "g")).toBe("2,1");
      expect(formatAmount(380, "µg")).toBe("380");
      expect(formatAmount(3.1, "µg")).toBe("3,1");
    });
  });

  describe("getWeekdayName", () => {
    it("returns full Vietnamese weekday names", () => {
      expect(getWeekdayName("2026-10-10")).toBe("Thứ Bảy");
      expect(getWeekdayName("2026-10-11")).toBe("Chủ nhật");
      expect(getWeekdayName("2026-10-12")).toBe("Thứ Hai");
      expect(getWeekdayName("2026-10-13")).toBe("Thứ Ba");
      expect(getWeekdayName("2026-10-14")).toBe("Thứ Tư");
      expect(getWeekdayName("2026-10-15")).toBe("Thứ Năm");
      expect(getWeekdayName("2026-10-16")).toBe("Thứ Sáu");
    });
  });

  describe("formatDesktopDate", () => {
    it("formats full desktop date with weekday and DD/MM/YYYY", () => {
      expect(formatDesktopDate("2026-10-10")).toBe("Thứ Bảy, 10/10/2026");
      expect(formatDesktopDate("2026-10-11")).toBe("Chủ nhật, 11/10/2026");
      expect(formatDesktopDate("2026-10-12")).toBe("Thứ Hai, 12/10/2026");
    });
  });

  describe("formatDayLabel", () => {
    // Reference now: Saturday 2026-10-10 14:00 in Saigon
    const saigonSaturdayNoon = new Date("2026-10-10T14:00:00+07:00");

    it("returns 'Hôm nay dd/mm' when target is the same day as now", () => {
      expect(formatDayLabel("2026-10-10", saigonSaturdayNoon)).toBe("Hôm nay 10/10");
      expect(formatDayLabel(new Date("2026-10-10T08:00:00+07:00"), saigonSaturdayNoon)).toBe("Hôm nay 10/10");
    });

    it("returns 'Hôm qua dd/mm' when target is yesterday", () => {
      expect(formatDayLabel("2026-10-09", saigonSaturdayNoon)).toBe("Hôm qua 09/10");
      expect(formatDayLabel(new Date("2026-10-09T22:00:00+07:00"), saigonSaturdayNoon)).toBe("Hôm qua 09/10");
    });

    it("returns 'Chủ nhật dd/mm' for Sunday, never 'Thứ 1'", () => {
      expect(formatDayLabel("2026-10-11", saigonSaturdayNoon)).toBe("Chủ nhật 11/10");
      expect(formatDayLabel(new Date("2026-10-11T10:00:00+07:00"), saigonSaturdayNoon)).toBe("Chủ nhật 11/10");
    });

    it("returns full weekday names 'Thứ Hai' through 'Thứ Bảy' when not today or yesterday", () => {
      expect(formatDayLabel("2026-10-08", saigonSaturdayNoon)).toBe("Thứ Năm 08/10");
      expect(formatDayLabel("2026-10-12", saigonSaturdayNoon)).toBe("Thứ Hai 12/10");
      expect(formatDayLabel("2026-10-13", saigonSaturdayNoon)).toBe("Thứ Ba 13/10");
      expect(formatDayLabel("2026-10-14", saigonSaturdayNoon)).toBe("Thứ Tư 14/10");
      expect(formatDayLabel("2026-10-15", saigonSaturdayNoon)).toBe("Thứ Năm 15/10");
      expect(formatDayLabel("2026-10-16", saigonSaturdayNoon)).toBe("Thứ Sáu 16/10");
      // Different Saturday from now (next week)
      expect(formatDayLabel("2026-10-17", saigonSaturdayNoon)).toBe("Thứ Bảy 17/10");
    });

    it("handles 23:30 Asia/Ho_Chi_Minh boundary correctly", () => {
      // 23:30 in Saigon on Oct 10 is 16:30 UTC on Oct 10
      const now2330 = new Date("2026-10-10T23:30:00+07:00");

      expect(formatDayLabel("2026-10-10", now2330)).toBe("Hôm nay 10/10");
      expect(formatDayLabel(new Date("2026-10-10T23:30:00+07:00"), now2330)).toBe("Hôm nay 10/10");
      expect(formatDayLabel("2026-10-09", now2330)).toBe("Hôm qua 09/10");
      expect(formatDayLabel("2026-10-08", now2330)).toBe("Thứ Năm 08/10");
      expect(formatDayLabel("2026-10-11", now2330)).toBe("Chủ nhật 11/10");
      expect(formatDayLabel(new Date("2026-10-11T00:30:00+07:00"), now2330)).toBe("Chủ nhật 11/10");
      expect(formatDayLabel("2026-10-12", now2330)).toBe("Thứ Hai 12/10");
    });

    it("handles 00:30 Asia/Ho_Chi_Minh boundary correctly", () => {
      // 00:30 in Saigon on Oct 11 is 17:30 UTC on Oct 10
      const now0030 = new Date("2026-10-11T00:30:00+07:00");

      expect(formatDayLabel("2026-10-11", now0030)).toBe("Hôm nay 11/10");
      expect(formatDayLabel(new Date("2026-10-11T00:30:00+07:00"), now0030)).toBe("Hôm nay 11/10");
      expect(formatDayLabel("2026-10-10", now0030)).toBe("Hôm qua 10/10");
      expect(formatDayLabel(new Date("2026-10-10T23:30:00+07:00"), now0030)).toBe("Hôm qua 10/10");
      expect(formatDayLabel("2026-10-09", now0030)).toBe("Thứ Sáu 09/10");
      expect(formatDayLabel("2026-10-12", now0030)).toBe("Thứ Hai 12/10");
    });
  });
});

describe("parseNumberInput (cc-63, B5)", () => {
  it("reads the Vietnamese way", () => {
    expect(parseNumberInput("1.000")).toBe(1000);
    expect(parseNumberInput("12.345.678")).toBe(12345678);
    expect(parseNumberInput("1,5")).toBe(1.5);
    expect(parseNumberInput("1.5")).toBe(1.5);
    expect(parseNumberInput("0")).toBe(0);
    expect(parseNumberInput(",5")).toBe(0.5);
  });

  it("gives null for anything it cannot read whole", () => {
    for (const bad of ["12abc", "1e3", "", " ", "-1", "1.2.3", "1,2,3", "NaN", "Infinity"]) expect(parseNumberInput(bad), bad).toBeNull();
  });
});
