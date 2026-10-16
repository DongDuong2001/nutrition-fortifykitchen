import { describe, expect, it } from "vitest";

describe("test time zone", () => {
  it("runs in Asia/Ho_Chi_Minh whatever the machine's zone is", () => {
    // 20:00 UTC is 03:00 the next day in Việt Nam (UTC+7, no daylight saving)
    expect(process.env.TZ).toBe("Asia/Ho_Chi_Minh");
    expect(new Date("2026-10-15T20:00:00Z").getHours()).toBe(3);
    expect(new Date("2026-10-15T20:00:00Z").getTimezoneOffset()).toBe(-420);
  });
});
