import { describe, expect, it } from "vitest";
import { weightLogSample } from "../mock/weight-log";

const TODAY = "2026-10-12";

describe("weightLogSample (the weight log sample behind Cơ thể)", () => {
  const log = weightLogSample(TODAY);

  it("has 30 days, oldest first, ending today", () => {
    expect(log).toHaveLength(30);
    expect(log[0].date).toBe("2026-09-13");
    expect(log[29].date).toBe(TODAY);
    const dates = log.map((e) => e.date);
    expect([...dates].sort()).toEqual(dates);
    expect(new Set(dates).size).toBe(30);
  });

  it("stays around 65 kg (the sample profile) within a realistic band", () => {
    for (const e of log) {
      expect(e.kg).toBeGreaterThan(64);
      expect(e.kg).toBeLessThan(66.5);
    }
    expect(log[29].kg).toBe(65);
  });

  it("is one decimal, and moves down a little over the month", () => {
    for (const e of log) expect(Math.round(e.kg * 10) / 10).toBe(e.kg);
    expect(log[0].kg).toBeGreaterThan(log[29].kg);
  });

  it("moves with the date it is anchored to", () => {
    const other = weightLogSample("2026-11-01");
    expect(other[29].date).toBe("2026-11-01");
    expect(other.map((e) => e.kg)).toEqual(log.map((e) => e.kg));
  });
});
