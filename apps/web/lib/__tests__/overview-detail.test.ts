import { describe, expect, it } from "vitest";
import {
  bestWorstDays,
  energyAttention,
  macroScoreRow,
  microSections,
  nutrientAttention,
  topFoodSources,
  trainingSplit,
  weightShift,
  weighIns,
} from "../overview-detail";
import { buildOverview, microRows, type MicroRow } from "../overview";
import { microBoard } from "../overview-board";
import { SAMPLE_DAY } from "../mock/sample-day";
import { calculateTargets } from "../targets";
import type { DayTotals } from "../day-totals";
import type { AddedDiaryEntry } from "../diary-edits";

const TODAY = "2026-10-12";
const TARGETS = calculateTargets({ sex: "male", weightKg: 65, goal: "maintain" });
const build = (length: 7 | 30 = 7, offset = 0) =>
  buildOverview({ todayIso: TODAY, today: SAMPLE_DAY, targets: TARGETS, length, offset });

const day = (date: string, calories: number | null, protein: number | null = null): DayTotals => ({
  date,
  logged: calories !== null,
  calories,
  protein,
  carbs: null,
  fat: null,
  fiber: null,
  nutrients: {},
});

describe("macroScoreRow", () => {
  const o = build();
  it("kcal: average, target range, change in words, seven days, n/6 caption (finished days only)", () => {
    const row = macroScoreRow({ key: "calories", overview: o, targets: TARGETS, todayIso: TODAY });
    expect(row.title).toBe("Kcal");
    expect(row.days).toHaveLength(7);
    expect(row.unit).toBe("kcal");
    expect(row.sub.startsWith("kcal / ")).toBe(true);
    expect(row.caption).toMatch(/^\d\/6 ngày đạt$/);
    expect(row.target).toEqual({ min: TARGETS.calories.min, max: TARGETS.calories.max });
  });
  it("carbs and fat show their share of kcal in the sub line", () => {
    const row = macroScoreRow({ key: "carbs", overview: o, targets: TARGETS, todayIso: TODAY });
    expect(row.title).toBe("Tinh bột");
    expect(row.sub).toMatch(/^g \/ .* · \d+% kcal$/);
    expect(macroScoreRow({ key: "fat", overview: o, targets: TARGETS, todayIso: TODAY }).title).toBe("Chất béo");
  });
  it("fibre is Chất xơ and has no kcal share", () => {
    const row = macroScoreRow({ key: "fiber", overview: o, targets: TARGETS, todayIso: TODAY });
    expect(row.title).toBe("Chất xơ");
    expect(row.sub).not.toContain("% kcal");
  });
});

describe("trainingSplit", () => {
  const days = [
    day("2026-10-06", 2000, 120),
    day("2026-10-07", 2400, 140),
    day("2026-10-08", 1800, 100),
    day("2026-10-09", 2200, 130),
    day("2026-10-12", 900, 40),
  ];
  const minutes: Record<string, number> = { "2026-10-06": 60, "2026-10-07": 45, "2026-10-08": 0, "2026-10-12": 60 };
  it("averages kcal and đạm on training days and rest days; today and unknown days are left out", () => {
    const s = trainingSplit(days, (iso) => (iso in minutes ? minutes[iso] : null), TODAY);
    expect(s.training).toEqual({ days: 2, calories: 2200, protein: 130 });
    expect(s.rest).toEqual({ days: 1, calories: 1800, protein: 100 });
  });
  it("no day has a recorded duration: both sides are empty", () => {
    const s = trainingSplit(days, () => null, TODAY);
    expect(s.training.days).toBe(0);
    expect(s.rest.days).toBe(0);
    expect(s.training.calories).toBeNull();
  });
});

describe("bestWorstDays", () => {
  const range = { min: 2000, max: 2300 };
  it("closest to the range and farthest from it, finished logged days only", () => {
    const days = [day("2026-10-06", 2100), day("2026-10-07", 1500), day("2026-10-08", 2450), day("2026-10-09", null), day("2026-10-12", 100)];
    const r = bestWorstDays(days, range, TODAY);
    expect(r.best).toMatchObject({ iso: "2026-10-06", value: 2100, distance: 0 });
    expect(r.worst).toMatchObject({ iso: "2026-10-07", value: 1500, distance: 500 });
  });
  it("one logged day, or all in range: no worst day", () => {
    expect(bestWorstDays([day("2026-10-06", 2100)], range, TODAY).worst).toBeNull();
    expect(bestWorstDays([day("2026-10-06", 2100), day("2026-10-07", 2200)], range, TODAY).worst).toBeNull();
    expect(bestWorstDays([], range, TODAY).best).toBeNull();
  });
});

describe("energyAttention", () => {
  it("kcal and đạm days under the minimum, then fibre; at most three rows, facts only", () => {
    const days = [day("2026-10-07", 1800, 90), day("2026-10-08", 2300, 140), day("2026-10-10", 1700, 95), day("2026-10-12", 500, 20)];
    const rows = energyAttention({ days, targets: TARGETS, todayIso: TODAY, length: 7 });
    expect(rows[0]).toMatchObject({ title: "Chưa đạt kcal tối thiểu vào 2 ngày", line: "Thứ Tư, Thứ Bảy" });
    expect(rows[0].number).toBe(`−${TARGETS.calories.min - 1700} kcal`);
    expect(rows[1].title).toBe("Chưa đạt mục tiêu Đạm vào 2 ngày");
    expect(rows.length).toBeLessThanOrEqual(3);
  });
  it("nothing under: no rows", () => {
    expect(energyAttention({ days: [day("2026-10-07", 2500, 200)], targets: TARGETS, todayIso: TODAY, length: 7 })).toEqual([]);
  });
});

describe("microSections", () => {
  const o = build();
  const board = microBoard(microRows(o.averages, o.targetDays, TARGETS), []);
  it("four sections in the order Thiếu, Trung bình, Gần đủ, Đạt, each sorted lowest first", () => {
    const sections = microSections(board);
    expect(sections.map((s) => s.label)).toEqual(["Thiếu", "Trung bình", "Gần đủ", "Đạt"]);
    for (const s of sections) {
      const p = s.items.map((i) => i.percentage as number);
      expect(p).toEqual([...p].sort((a, b) => a - b));
    }
    expect(sections.reduce((n, s) => n + s.items.length, 0)).toBe(board.total - board.unknown);
  });
});

describe("topFoodSources and nutrientAttention", () => {
  const entry = (id: string, name: string, n: Record<string, number | null>): AddedDiaryEntry => ({
    id,
    foodId: id,
    foodName: name,
    grams: 100,
    displayQty: "100 g",
    mealSlot: "lunch",
    calories: 100,
    protein: 1,
    carbs: 1,
    fat: 1,
    fiber: 1,
    nutrients: n,
    addedAt: "2026-10-07T12:00:00.000Z",
  });
  const entries = [
    entry("a", "Cá hồi", { vitamin_d: 8 }),
    entry("b", "Trứng", { vitamin_d: 2 }),
    entry("c", "Cá hồi", { vitamin_d: 4 }),
    entry("d", "Cơm", { vitamin_d: null }),
  ];
  it("sums per food over the period, per logged day, most first, unknown values skipped", () => {
    expect(topFoodSources(entries, "vitamin_d", 2, 2)).toEqual([
      { name: "Cá hồi", perDay: 6 },
      { name: "Trứng", perDay: 1 },
    ]);
  });
  it("no food carries the nutrient: empty", () => {
    expect(topFoodSources(entries, "iron", 2)).toEqual([]);
  });
  const micro: MicroRow[] = [
    { key: "vitamin_d", name: "Vitamin D", unit: "µg", average: 4.8, targetMin: 15, targetMax: null, percentage: 32, met: 0, of: 5 },
    { key: "iron", name: "Sắt", unit: "mg", average: 12, targetMin: 11, targetMax: null, percentage: 109, met: 5, of: 5 },
  ];
  it("the lowest nutrients with amount / target, the gap per day and the foods that gave the most", () => {
    const rows = nutrientAttention({ micro, entries, loggedDays: 2 });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ key: "vitamin_d", title: "Vitamin D", number: "32%" });
    expect(rows[0].line).toBe("4,8 / 15 µg mỗi ngày · còn thiếu 10,2 µg");
    expect(rows[0].foods).toBe("Nhiều nhất từ: Cá hồi 6 µg, Trứng 1 µg mỗi ngày");
  });
  it("says so when no logged food carries the nutrient", () => {
    const rows = nutrientAttention({ micro, entries: [], loggedDays: 2 });
    expect(rows[0].foods).toBe("Chưa có món nào trong nhật ký có số liệu chất này");
  });
});

describe("weighIns and weightShift", () => {
  const dates = ["2026-10-06", "2026-10-07", "2026-10-08", "2026-10-09", "2026-10-10", "2026-10-11", "2026-10-12"];
  it("counts weigh-ins inside the period", () => {
    const log = [
      { date: "2026-10-05", kg: 65.5 },
      { date: "2026-10-07", kg: 65.2 },
      { date: "2026-10-12", kg: 65.0 },
    ];
    expect(weighIns(dates, log)).toEqual({ count: 2, of: 7 });
  });
  const profile = { sex: "male" as const, goal: "maintain" as const, trainingMinutesDefault: 60, periodMode: false };
  it("kcal, đạm and kali before and now when the weight moved", () => {
    const rows = weightShift(profile, 80, 78);
    expect(rows.map((r) => r.key)).toEqual(["calories", "protein", "potassium"]);
    expect(rows[1].changed).toBe(true);
    expect(rows[1].before).not.toEqual(rows[1].now);
  });
  it("same weight: nothing changed", () => {
    expect(weightShift(profile, 65, 65).every((r) => !r.changed)).toBe(true);
  });
});
