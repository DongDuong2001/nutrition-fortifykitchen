import { describe, expect, it } from "vitest";
import {
  attentionRows,
  boardDays,
  changeLine,
  dayNote,
  heroState,
  mealBars,
  microBoard,
  periodHeading,
  weekdayShort,
  weightDays,
  weightDayNote,
} from "../overview-board";
import { period } from "../period";
import { buildOverview, microRows, type MicroRow } from "../overview";
import { SAMPLE_DAY } from "../mock/sample-day";
import { calculateTargets } from "../targets";
import type { DayTotals } from "../day-totals";

const TODAY = "2026-10-12";
const TARGETS = calculateTargets({ sex: "male", weightKg: 65, goal: "maintain" });

const day = (date: string, calories: number | null, protein: number | null): DayTotals => ({
  date,
  logged: calories !== null,
  calories,
  protein,
  carbs: null,
  fat: null,
  fiber: null,
  nutrients: {},
});

describe("heroState", () => {
  it("remaining kcal and n = min(10, floor(eaten / min × 10)) segments", () => {
    expect(heroState(1460, 2100)).toEqual({ eaten: 1460, min: 2100, remaining: 640, done: false, segments: 6 });
  });
  it("at or over the minimum: done, no negative remaining, 10 segments", () => {
    expect(heroState(2100, 2100)).toMatchObject({ remaining: 0, done: true, segments: 10 });
    expect(heroState(2500, 2100)).toMatchObject({ remaining: 0, done: true, segments: 10 });
  });
  it("nothing eaten: 0 segments", () => {
    expect(heroState(0, 2100)).toMatchObject({ remaining: 2100, done: false, segments: 0 });
  });
});

describe("mealBars", () => {
  type Slot = "breakfast" | "lunch" | "preworkout" | "dinner" | "snack";
  const meal = (slot: Slot, kcal: number, items = 1) => ({
    id: slot,
    slot,
    name: slot,
    kcal,
    items: Array.from({ length: items }, (_, i) => ({ id: `${slot}${i}`, name: "x", qty: "1", kcal })),
  });
  it("Sáng, Trưa, Phụ (trước tập + phụ), Tối in that order; empty meal is flagged", () => {
    const bars = mealBars([meal("breakfast", 420), meal("lunch", 680), meal("preworkout", 200), meal("snack", 160), meal("dinner", 0, 0)]);
    expect(bars.map((b) => b.label)).toEqual(["Sáng", "Trưa", "Phụ", "Tối"]);
    expect(bars.map((b) => b.kcal)).toEqual([420, 680, 360, 0]);
    expect(bars.map((b) => b.empty)).toEqual([false, false, false, true]);
    expect(bars[1].share).toBe(1);
    expect(bars[3].share).toBe(0);
  });
  it("a meal that is missing counts as empty", () => {
    const bars = mealBars([meal("breakfast", 300)]);
    expect(bars.map((b) => b.empty)).toEqual([false, true, true, true]);
  });
});

describe("periodHeading", () => {
  it("current 7 days", () => {
    expect(periodHeading(period(TODAY, 7, 0))).toBe("7 ngày qua · 06/10 – 12/10");
  });
  it("current 30 days", () => {
    expect(periodHeading(period(TODAY, 30, 0))).toBe("30 ngày qua · 13/09 – 12/10");
  });
  it("a past period shows the dates only", () => {
    expect(periodHeading(period(TODAY, 7, 1))).toBe("29/09 – 05/10");
  });
});

describe("changeLine", () => {
  it("words, never a bare sign", () => {
    expect(changeLine(2289, 2374, "kcal", 7)).toBe("Giảm 85 so với 7 ngày trước");
    expect(changeLine(132, 120, "g", 7)).toBe("Tăng 12 g so với 7 ngày trước");
    expect(changeLine(132, 132, "g", 30)).toBe("Không đổi so với 30 ngày trước");
  });
  it("missing numbers say so", () => {
    expect(changeLine(2289, null, "kcal", 7)).toBe("Chưa có 7 ngày trước để so sánh");
    expect(changeLine(null, 2000, "kcal", 7)).toBe("Chưa có dữ liệu trong kỳ này");
  });
});

describe("weekdayShort", () => {
  it("T2..T7 and CN", () => {
    expect(weekdayShort("2026-10-12")).toBe("T2");
    expect(weekdayShort("2026-10-10")).toBe("T7");
    expect(weekdayShort("2026-10-11")).toBe("CN");
  });
});

describe("dayNote", () => {
  it("below the minimum: 'thiếu n g'", () => {
    expect(dayNote(118, 128, "g")).toEqual({ text: "thiếu 10 g", tone: "under" });
  });
  it("at or above the minimum: 'đạt mục tiêu' (above the range is on target too)", () => {
    expect(dayNote(130, 128, "g")).toEqual({ text: "đạt mục tiêu", tone: "met" });
    expect(dayNote(200, 128, "g")).toEqual({ text: "đạt mục tiêu", tone: "met" });
  });
});

describe("boardDays", () => {
  const days = ["2026-10-06", "2026-10-07", "2026-10-08", "2026-10-09", "2026-10-10", "2026-10-11", "2026-10-12"].map((d, i) =>
    day(d, i === 2 ? null : 1900 + i * 100, i === 2 ? null : 100 + i * 10)
  );
  it("seven days; today is in progress and neither met nor missed", () => {
    const out = boardDays(days, "calories", 2100, TODAY);
    expect(out).toHaveLength(7);
    expect(out.map((d) => d.label)).toEqual(["T3", "T4", "T5", "T6", "T7", "CN", "T2"]);
    expect(out[6].inProgress).toBe(true);
    expect(out[6].met).toBeNull();
    expect(out[2]).toMatchObject({ value: null, met: false });
    expect(out[1]).toMatchObject({ value: 2000, met: false });
    expect(out[3]).toMatchObject({ value: 2200, met: true });
  });
  it("keeps only the last seven of a 30-day period", () => {
    const thirty = Array.from({ length: 30 }, (_, i) => day(`2026-09-${String(i + 1).padStart(2, "0")}`, 2000, 100));
    const out = boardDays(thirty, "calories", 1950, TODAY);
    expect(out).toHaveLength(7);
    expect(out[6].iso).toBe("2026-09-30");
  });
});

describe("weightDays / weightDayNote", () => {
  const log = [
    { date: "2026-10-08", kg: 65.2 },
    { date: "2026-10-10", kg: 65.0 },
    { date: "2026-10-11", kg: 65.1 },
  ];
  it("a day without a weigh-in has no value", () => {
    const out = weightDays(["2026-10-09", "2026-10-10"], log, TODAY);
    expect(out.map((d) => d.value)).toEqual([null, 65.0]);
  });
  it("change vs the day before when it was weighed, otherwise vs the last weigh-in", () => {
    expect(weightDayNote(log, "2026-10-11")).toBe("+0,1 kg so với hôm trước");
    expect(weightDayNote(log, "2026-10-10")).toBe("−0,2 kg so với lần cân trước");
    expect(weightDayNote(log, "2026-10-08")).toBe("");
    expect(weightDayNote(log, "2026-10-09")).toBe("");
  });
});

describe("microBoard (Vi chất card)", () => {
  const o = buildOverview({ todayIso: TODAY, today: SAMPLE_DAY, targets: TARGETS, length: 7, offset: 0 });
  const rows = microRows(o.averages, o.targetDays, TARGETS);
  const prev = microRows(o.previousAverages, o.targetDays, TARGETS);
  const board = microBoard(rows, prev);
  it("counts nutrients at or over their minimum out of 22", () => {
    expect(board.total).toBe(22);
    expect(board.achieved).toBe(rows.filter((r) => r.percentage !== null && r.percentage >= 100).length);
    expect(board.counts.thieu + board.counts.trungbinh + board.counts.ganDu + board.counts.dat + board.unknown).toBe(22);
  });
  it("squares are sorted lowest share first, unknown last", () => {
    const known = board.squares.map((s) => s.percentage).filter((p): p is number => p !== null);
    expect(known).toEqual([...known].sort((a, b) => a - b));
    expect(board.squares).toHaveLength(22);
  });
  it("the hint lists up to three nutrients under their target", () => {
    expect(board.lowest.length).toBeLessThanOrEqual(3);
    for (const l of board.lowest) expect(l.percentage).toBeLessThan(100);
  });
  it("change is the number achieved now minus the previous period's", () => {
    expect(board.change).toBe(board.achieved - prev.filter((r) => r.percentage !== null && r.percentage >= 100).length);
  });
});

describe("attentionRows", () => {
  const micro: MicroRow[] = [
    { key: "iodine", name: "Iốt", unit: "µg", average: 40, targetMin: 150, targetMax: null, percentage: 27, met: 0, of: 5 },
    { key: "vitamin_d", name: "Vitamin D", unit: "µg", average: 4.8, targetMin: 15, targetMax: null, percentage: 32, met: 0, of: 5 },
    { key: "iron", name: "Sắt", unit: "mg", average: 12, targetMin: 11, targetMax: null, percentage: 109, met: 5, of: 5 },
  ];
  it("protein first, then the lowest nutrients, at most three, facts only", () => {
    const days = [day("2026-10-07", 2000, 118), day("2026-10-08", 2000, 140), day("2026-10-10", 2000, 120), day("2026-10-12", 900, 40)];
    const out = attentionRows({ days, proteinMin: 128, todayIso: TODAY, micro, length: 7 });
    expect(out.length).toBe(3);
    expect(out[0]).toMatchObject({ kind: "protein", title: "Chưa đạt mục tiêu Đạm vào 2 ngày", number: "−10 g", line: "Thứ Tư, Thứ Bảy" });
    expect(out[1]).toMatchObject({ kind: "nutrient", key: "iodine", title: "Iốt đang thấp nhất", number: "27%" });
    expect(out[1].line).toBe("40 / 150 µg mỗi ngày · còn thiếu 110 µg");
    expect(out[2]).toMatchObject({ key: "vitamin_d", title: "Vitamin D cũng đang thấp", number: "32%" });
  });
  it("nothing to flag: no rows", () => {
    expect(attentionRows({ days: [day("2026-10-07", 2000, 140)], proteinMin: 128, todayIso: TODAY, micro: [micro[2]], length: 7 })).toEqual([]);
  });
  it("30 days: dates, and 'và n ngày khác' after three", () => {
    const days = ["2026-09-20", "2026-09-21", "2026-09-22", "2026-09-23", "2026-09-24"].map((d) => day(d, 2000, 100));
    const out = attentionRows({ days, proteinMin: 128, todayIso: TODAY, micro: [], length: 30 });
    expect(out[0].title).toBe("Chưa đạt mục tiêu Đạm vào 5 ngày");
    expect(out[0].line).toBe("20/09, 21/09, 22/09 và 2 ngày khác");
    expect(out[0].number).toBe("−28 g");
  });
});
