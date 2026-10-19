import { describe, expect, it } from "vitest";
import { EDITABLE_PAST_DAYS, dayBefore, editableFrom, isEditableDay, isReadOnlyDay, yesterdayOf } from "../day-rules";

describe("the editable window (Hao 19/10: today and yesterday)", () => {
  const today = "2026-10-19";

  it("is one past day", () => {
    expect(EDITABLE_PAST_DAYS).toBe(1);
    expect(editableFrom(today)).toBe("2026-10-18");
    expect(yesterdayOf(today)).toBe("2026-10-18");
  });

  it("today and yesterday are editable; two or more days back and the future are not", () => {
    expect(isEditableDay("2026-10-19", today)).toBe(true);
    expect(isEditableDay("2026-10-18", today)).toBe(true);
    expect(isEditableDay("2026-10-17", today)).toBe(false);
    expect(isEditableDay("2026-09-01", today)).toBe(false);
    expect(isEditableDay("2026-10-20", today)).toBe(false);
  });

  it("read-only is a day before today beyond the window", () => {
    expect(isReadOnlyDay("2026-10-17", today)).toBe(true);
    expect(isReadOnlyDay("2026-10-18", today)).toBe(false);
    expect(isReadOnlyDay("2026-10-19", today)).toBe(false);
  });

  it("is calendar arithmetic across months and years", () => {
    expect(yesterdayOf("2026-11-01")).toBe("2026-10-31");
    expect(yesterdayOf("2027-01-01")).toBe("2026-12-31");
    expect(dayBefore("2026-03-01")).toBe("2026-02-28");
    expect(isEditableDay("2026-12-31", "2027-01-01")).toBe(true);
  });

  it("with the window set to 0 only today is editable (the switch for shipping before the API)", () => {
    expect(isEditableDay("2026-10-18", today, 0)).toBe(false);
    expect(isEditableDay("2026-10-19", today, 0)).toBe(true);
    expect(isReadOnlyDay("2026-10-18", today, 0)).toBe(true);
  });
});
