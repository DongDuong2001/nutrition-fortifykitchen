import { describe, it, expect, vi, afterEach } from "vitest";
import { getTodayIsoVN } from "../date";

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
