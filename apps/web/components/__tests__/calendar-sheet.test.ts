import { describe, expect, it } from "vitest";
import { STATUS_TEXT, calendarDayDot, calendarDayLabel } from "../calendar-sheet";

describe("calendar-sheet status and labels", () => {
  it("gives status 'over' the same dot and label as 'met' ('đạt mục tiêu') with no 'vượt'", () => {
    expect(STATUS_TEXT.met).toBe("đạt mục tiêu");
    expect(STATUS_TEXT.over).toBe("đạt mục tiêu");
    expect(Object.values(STATUS_TEXT).some((text) => text.includes("vượt"))).toBe(false);
    expect(calendarDayDot("met")).toBe("bg-blue");
    expect(calendarDayDot("over")).toBe("bg-blue");
    expect(calendarDayDot("under")).toBe("bg-red");
    expect(calendarDayDot("none")).toBe("bg-transparent");
  });

  it("formats the aria-label for met and over days identically as 'đạt mục tiêu'", () => {
    expect(calendarDayLabel("2026-10-08", 8, 10, "met")).toBe("Thứ Năm 8 tháng 10, đạt mục tiêu");
    expect(calendarDayLabel("2026-10-08", 8, 10, "over")).toBe("Thứ Năm 8 tháng 10, đạt mục tiêu");
    expect(calendarDayLabel("2026-10-12", 12, 10, "over", { isToday: true })).toBe(
      "Thứ Hai 12 tháng 10, hôm nay, đạt mục tiêu"
    );
    expect(calendarDayLabel("2026-10-15", 15, 10, "none", { future: true })).toBe(
      "Thứ Năm 15 tháng 10, chưa tới"
    );
  });
});
