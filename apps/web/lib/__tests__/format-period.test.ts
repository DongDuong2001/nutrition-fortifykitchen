import { describe, expect, it } from "vitest";
import { formatPercent, formatPeriodRange, formatSigned } from "../format";

describe("formatSigned", () => {
  it("writes + for a rise and a real minus sign (−) for a fall", () => {
    expect(formatSigned(18)).toBe("+18");
    expect(formatSigned(-12)).toBe("−12");
  });

  it("writes zero without a sign", () => {
    expect(formatSigned(0)).toBe("0");
  });

  it("uses vi-VN separators and the asked decimals", () => {
    expect(formatSigned(-0.8, { decimals: 1 })).toBe("−0,8");
    expect(formatSigned(1250.5, { decimals: 1 })).toBe("+1.250,5");
  });

  it("does not show −0 for a fall that rounds to zero", () => {
    expect(formatSigned(-0.04, { decimals: 1 })).toBe("0,0");
  });
});

describe("formatPercent", () => {
  it("writes a whole percent with a space before %", () => {
    expect(formatPercent(28)).toBe("28 %");
    expect(formatPercent(27.6)).toBe("28 %");
  });

  it("can carry a sign", () => {
    expect(formatPercent(18, { signed: true })).toBe("+18 %");
    expect(formatPercent(-12, { signed: true })).toBe("−12 %");
  });
});

describe("formatPeriodRange", () => {
  it("writes a range inside one month as dd–dd/mm", () => {
    expect(formatPeriodRange("2026-10-06", "2026-10-12")).toBe("06–12/10");
  });

  it("writes a range across two months as dd/mm–dd/mm", () => {
    expect(formatPeriodRange("2026-09-13", "2026-10-12")).toBe("13/09–12/10");
  });

  it("writes one day as dd/mm", () => {
    expect(formatPeriodRange("2026-10-12", "2026-10-12")).toBe("12/10");
  });
});
