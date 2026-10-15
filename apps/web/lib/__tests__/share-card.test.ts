import { describe, expect, it } from "vitest";
import { buildShareCard, shareFilename } from "../share-card";
import { SAMPLE_DAY, type MockDayData } from "../mock/sample-day";

const NOW = new Date("2026-10-15T10:00:00+07:00");
const TODAY = { ...SAMPLE_DAY, date: "2026-10-15" };

function withMacro(day: MockDayData, key: string, consumed: number | null): MockDayData {
  return { ...day, macros: day.macros.map((m) => (m.key === key ? { ...m, consumed } : m)) };
}

describe("share card model", () => {
  it("labels the date with the shared helper", () => {
    expect(buildShareCard({ day: TODAY, finished: false, now: NOW }).dateLabel).toBe("Hôm nay 15/10");
    expect(buildShareCard({ day: { ...SAMPLE_DAY, date: "2026-10-14" }, finished: true, now: NOW }).dateLabel).toBe("Hôm qua 14/10");
    expect(buildShareCard({ day: { ...SAMPLE_DAY, date: "2026-10-14" }, finished: true, now: new Date("2026-10-16T10:00:00+07:00") }).dateLabel).toBe(
      "Thứ Tư 14/10"
    );
  });

  it("shows kcal eaten, the target range, the percent and the level word in Vietnamese format", () => {
    const { kcal } = buildShareCard({ day: TODAY, finished: false, now: NOW });
    expect(kcal.value).toBe("1.041");
    expect(kcal.target).toBe("1.950–2.275 kcal");
    expect(kcal.pctText).toBe("53%");
    expect(kcal.level).toBe("Trung bình");
    expect(kcal.segments).toBe(5);
  });

  it("lists Đạm, Tinh bột, Chất béo, Chất xơ with amount, percent, level word and segments", () => {
    const { bars } = buildShareCard({ day: TODAY, finished: false, now: NOW });
    expect(bars.map((b) => b.label)).toEqual(["Đạm", "Tinh bột", "Chất béo", "Chất xơ"]);
    expect(bars[0]).toMatchObject({ amount: "62 g", pctText: "60%", level: "Trung bình", segments: 6 });
    expect(bars[1]).toMatchObject({ amount: "133 g", pctText: "52%", level: "Trung bình", segments: 5 });
    expect(bars[2]).toMatchObject({ amount: "21 g", pctText: "64%", level: "Trung bình", segments: 6 });
    expect(bars[3]).toMatchObject({ amount: "14 g", pctText: "47%", level: "Thiếu", segments: 4 });
  });

  it("is two-tone on an open day and uses the four levels on a past day", () => {
    const open = buildShareCard({ day: TODAY, finished: false, now: NOW }).bars.map((b) => b.tone);
    expect(open).toEqual(["neutral", "neutral", "neutral", "neutral"]);
    const past = buildShareCard({ day: { ...SAMPLE_DAY, date: "2026-10-14" }, finished: true, now: NOW }).bars.map((b) => b.tone);
    expect(past).toEqual(["trungbinh", "trungbinh", "trungbinh", "thieu"]);
  });

  it("turns blue once a target is reached, even on an open day", () => {
    const day = withMacro(TODAY, "protein", 110);
    const { bars } = buildShareCard({ day, finished: false, now: NOW });
    expect(bars[0]).toMatchObject({ pctText: "106%", level: "Đạt", tone: "dat", segments: 10 });
  });

  it("never shows an unknown value as 0", () => {
    const { bars } = buildShareCard({ day: withMacro(TODAY, "fiber", null), finished: false, now: NOW });
    expect(bars[3]).toMatchObject({ amount: "—", pctText: "—", level: "Chưa có số liệu", segments: 0 });
  });

  it("counts the reached micros out of 22", () => {
    const { micros } = buildShareCard({ day: TODAY, finished: false, now: NOW });
    expect(micros).toEqual({ reached: 8, total: 22, text: "Vi chất đạt 8/22" });
  });

  it("lists the 3 micros with the lowest share of their target, lowest first", () => {
    const { lacking } = buildShareCard({ day: TODAY, finished: false, now: NOW });
    const expected = [...TODAY.minerals, ...TODAY.vitamins]
      .filter((s) => s.consumed !== null && s.targetMin)
      .map((s) => ({ name: s.name, ratio: s.consumed! / s.targetMin! }))
      .sort((a, b) => a.ratio - b.ratio)
      .slice(0, 3)
      .map((s) => s.name);
    expect(lacking.map((l) => l.name)).toEqual(expected);
    expect(lacking.slice(0, 2).map((l) => l.name)).toEqual(["Vitamin D", "Canxi"]);
    expect(lacking).toHaveLength(3);
    expect(lacking[1].pctText).toBe("28%");
  });

  it("leaves out a micro with no value instead of listing it at 0%", () => {
    const day = { ...TODAY, vitamins: TODAY.vitamins.map((v) => (v.key === "vitamin_d" ? { ...v, consumed: null, percentage: null } : v)) };
    const { lacking } = buildShareCard({ day, finished: false, now: NOW });
    expect(lacking.map((l) => l.name)).not.toContain("Vitamin D");
    expect(lacking.every((l) => l.pctText !== "0%" && l.pctText !== "—")).toBe(true);
    expect(lacking).toHaveLength(3);
  });

  it("holds nothing private: no email, weight or meal names", () => {
    const text = JSON.stringify(buildShareCard({ day: TODAY, finished: false, now: NOW }));
    expect(text).not.toContain(TODAY.user.email);
    expect(text).not.toMatch(/\bkg\b/);
    for (const meal of TODAY.meals) for (const item of meal.items) expect(text).not.toContain(item.name);
  });

  it("names the file h1t-micro-YYYY-MM-DD.png", () => {
    expect(shareFilename("2026-10-15")).toBe("h1t-micro-2026-10-15.png");
    expect(buildShareCard({ day: TODAY, finished: false, now: NOW }).filename).toBe("h1t-micro-2026-10-15.png");
  });
});
