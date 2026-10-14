import type { DayTotals } from "./day-totals";
import type { AddedDiaryEntry } from "./diary-edits";
import { formatAmount, formatNumber, formatRange, formatSigned } from "./format";
import { getLevelLabel, type NutrientLevel } from "./levels";
import type { MicroRow, Overview } from "./overview";
import {
  boardDays,
  changeLine,
  underDaysRow,
  weightDays,
  type AttentionRow,
  type BoardDay,
  type BoardKey,
  type MicroBoard,
  type MicroSquare,
} from "./overview-board";
import type { WeightPoint } from "./period";
import { calculateTargets, type CompleteTargets, type GoalType, type SexType, type TargetRange } from "./targets";

/** The deeper Tổng quan sub-tabs (Năng lượng, Vi chất, Cơ thể): data the screens only format. Pure. */

/** One scoreboard row, already formatted. Tóm tắt and Năng lượng both draw these. */
export interface ScoreRowData {
  key: BoardKey | "weight";
  title: string;
  /** The period average (or the latest weight), formatted; "—" when unknown */
  value: string;
  /** "kcal / 1.950–2.275", "g / 128–176 · 24% kcal" */
  sub: string;
  /** The change in words */
  change: string;
  /** Seven days; value null = nothing logged */
  days: BoardDay[];
  unit: string;
  /** Target minimum and maximum for the band and the day note; null for weight */
  target: { min: number; max: number | null } | null;
  /** "n/7 ngày đạt" (targets only) or the weight change */
  caption: string;
  /** Weight only: the log, for the change against the day before */
  weightLog?: WeightPoint[];
  decimals: number;
}

const ROW_INFO: Record<BoardKey, { title: string; unit: string; target: keyof CompleteTargets; kcalPerGram: number | null }> = {
  calories: { title: "Kcal", unit: "kcal", target: "calories", kcalPerGram: null },
  protein: { title: "Đạm", unit: "g", target: "protein", kcalPerGram: 4 },
  fat: { title: "Chất béo", unit: "g", target: "fat", kcalPerGram: 9 },
  carbs: { title: "Tinh bột", unit: "g", target: "carbs", kcalPerGram: 4 },
  fiber: { title: "Chất xơ", unit: "g", target: "fiber", kcalPerGram: null },
};

/** A scoreboard row for kcal, đạm, chất béo, tinh bột or chất xơ over the period of `overview`. */
export function macroScoreRow(input: {
  key: BoardKey;
  overview: Overview;
  targets: CompleteTargets;
  todayIso: string;
}): ScoreRowData {
  const { key, overview, targets, todayIso } = input;
  const info = ROW_INFO[key];
  const range = targets[info.target] as TargetRange;
  const length = overview.period.length;
  const average = overview.averages[key];
  const previous = overview.previousAverages[key];
  const days = boardDays(overview.days, key, range.min, todayIso);
  const share =
    info.kcalPerGram !== null && overview.composition
      ? ` · ${overview.composition[key as "protein" | "carbs" | "fat"]}% kcal`
      : "";
  return {
    key,
    title: info.title,
    value: average === null ? "—" : formatNumber(Math.round(average)),
    sub: `${info.unit} / ${formatRange(range.min, range.max)}${share}`,
    change: changeLine(average, previous, info.unit, length),
    days,
    unit: info.unit,
    target: { min: range.min, max: range.max },
    caption: `${days.filter((d) => d.met === true).length}/${days.filter((d) => !d.inProgress).length} ngày đạt`,
    decimals: 0,
  };
}

/** The Cân nặng row: the latest weight, the profile weight, the change in the period and its seven days. */
export function weightScoreRow(input: {
  overview: Overview;
  profileKg: number;
  demo: boolean;
  todayIso: string;
}): ScoreRowData {
  const { overview, profileKg, demo, todayIso } = input;
  const { weight, period } = overview;
  return {
    key: "weight",
    title: "Cân nặng",
    value: weight.latest === null ? "—" : formatNumber(weight.latest, { decimals: 1 }),
    sub: "kg",
    change: `${demo ? "Dữ liệu mẫu · hồ sơ" : "Hồ sơ"} ${formatNumber(profileKg, { decimals: 1 })} kg`,
    days: weightDays(period.days, overview.weightLog, todayIso),
    unit: "kg",
    target: null,
    caption:
      weight.latest === null
        ? "Chưa có số cân"
        : weight.change === null
          ? "Chưa đủ số cân trong kỳ"
          : `${formatSigned(weight.change, { decimals: 1 })} kg trong ${period.length} ngày`,
    weightLog: overview.weightLog,
    decimals: 1,
  };
}

export interface SplitSide {
  days: number;
  /** Average kcal / đạm over those days; null with no days */
  calories: number | null;
  protein: number | null;
}

/**
 * Average kcal and đạm on training days (minutes > 0) against rest days (minutes 0). A day with no saved
 * duration (null) is unknown and counts on neither side. Only finished logged days count.
 */
export function trainingSplit(
  days: DayTotals[],
  minutesOf: (iso: string) => number | null,
  todayIso: string
): { training: SplitSide; rest: SplitSide } {
  const side = (list: DayTotals[]): SplitSide => {
    const mean = (pick: (d: DayTotals) => number | null) => {
      const known = list.map(pick).filter((v): v is number => v !== null);
      return known.length === 0 ? null : known.reduce((s, v) => s + v, 0) / known.length;
    };
    return { days: list.length, calories: mean((d) => d.calories), protein: mean((d) => d.protein) };
  };
  const finished = days.filter((d) => d.logged && d.date < todayIso);
  const training: DayTotals[] = [];
  const rest: DayTotals[] = [];
  for (const d of finished) {
    const minutes = minutesOf(d.date);
    if (minutes === null) continue;
    (minutes > 0 ? training : rest).push(d);
  }
  return { training: side(training), rest: side(rest) };
}

export interface DayPick {
  iso: string;
  value: number;
  /** How far outside the target range (0 inside it) */
  distance: number;
}

/**
 * The day of the period closest to the kcal range and the one farthest from it (finished logged days).
 * No worst day with fewer than two days, or when every day is inside the range.
 */
export function bestWorstDays(
  days: DayTotals[],
  range: { min: number; max: number },
  todayIso: string
): { best: DayPick | null; worst: DayPick | null } {
  const picks: DayPick[] = days
    .filter((d) => d.logged && d.date < todayIso && d.calories !== null)
    .map((d) => {
      const value = d.calories as number;
      const distance = value < range.min ? range.min - value : value > range.max ? value - range.max : 0;
      return { iso: d.date, value, distance };
    });
  if (picks.length === 0) return { best: null, worst: null };
  const mid = (range.min + range.max) / 2;
  const best = [...picks].sort(
    (a, b) => a.distance - b.distance || Math.abs(a.value - mid) - Math.abs(b.value - mid) || b.iso.localeCompare(a.iso)
  )[0];
  const worstPick = [...picks].sort((a, b) => b.distance - a.distance || b.iso.localeCompare(a.iso))[0];
  const worst = picks.length >= 2 && worstPick.distance > 0 && worstPick.iso !== best.iso ? worstPick : null;
  return { best, worst };
}

/** "Cần chú ý" for Năng lượng: kcal, đạm and chất xơ days under their minimum. At most three. */
export function energyAttention(input: {
  days: DayTotals[];
  targets: CompleteTargets;
  todayIso: string;
  length: 7 | 30;
}): AttentionRow[] {
  const { days, targets, todayIso, length } = input;
  const rows = [
    underDaysRow({ days, key: "calories", min: targets.calories.min, title: "Chưa đạt kcal tối thiểu", unit: "kcal", todayIso, length }),
    underDaysRow({ days, key: "protein", min: targets.protein.min, title: "Chưa đạt mục tiêu Đạm", unit: "g", todayIso, length }),
    underDaysRow({ days, key: "fiber", min: targets.fiber.min, title: "Chưa đạt mục tiêu Chất xơ", unit: "g", todayIso, length }),
  ];
  return rows.filter((r): r is AttentionRow => r !== null).slice(0, 3);
}

export interface MicroSection {
  level: NutrientLevel;
  label: string;
  items: MicroSquare[];
}

const SECTION_ORDER: NutrientLevel[] = ["thieu", "trungbinh", "ganDu", "dat"];

/** The nutrients with a number, grouped Thiếu, Trung bình, Gần đủ, Đạt; lowest share first in each. */
export function microSections(board: MicroBoard): MicroSection[] {
  return SECTION_ORDER.map((level) => ({
    level,
    label: getLevelLabel(level),
    items: board.squares.filter((s) => s.level === level),
  }));
}

/**
 * Which logged foods gave the most of one nutrient: per food name, the period total over `loggedDays` (so an
 * amount per day), biggest first. Foods with no value for it are skipped.
 */
export function topFoodSources(
  entries: AddedDiaryEntry[],
  key: string,
  loggedDays: number,
  limit = 2
): { name: string; perDay: number }[] {
  if (loggedDays <= 0) return [];
  const totals = new Map<string, number>();
  for (const e of entries) {
    const v = e.nutrients[key];
    if (typeof v === "number" && v > 0) totals.set(e.foodName, (totals.get(e.foodName) ?? 0) + v);
  }
  return [...totals.entries()]
    .map(([name, total]) => ({ name, perDay: Math.round((total / loggedDays) * 100) / 100 }))
    .sort((a, b) => b.perDay - a.perDay || a.name.localeCompare(b.name, "vi"))
    .slice(0, limit);
}

export interface NutrientAttentionRow extends AttentionRow {
  /** "Nhiều nhất từ: Cá hồi 6 µg, Trứng 1 µg mỗi ngày" or that no logged food carries it */
  foods: string;
}

/** "Cần chú ý" for Vi chất: the three lowest nutrients under target, amount / target, the gap and the foods. */
export function nutrientAttention(input: {
  micro: MicroRow[];
  /** Entries of the finished logged days of the period */
  entries: AddedDiaryEntry[];
  loggedDays: number;
}): NutrientAttentionRow[] {
  const { micro, entries, loggedDays } = input;
  return micro
    .filter((r) => r.percentage !== null && r.percentage < 100 && r.average !== null && r.targetMin !== null)
    .sort((a, b) => (a.percentage as number) - (b.percentage as number))
    .slice(0, 3)
    .map((r) => {
      const average = r.average as number;
      const min = r.targetMin as number;
      const sources = topFoodSources(entries, r.key, loggedDays);
      return {
        kind: "nutrient",
        key: r.key,
        title: r.name,
        line: `${formatAmount(average, r.unit)} / ${formatAmount(min, r.unit)} ${r.unit} mỗi ngày · còn thiếu ${formatAmount(min - average, r.unit)} ${r.unit}`,
        number: `${formatNumber(r.percentage as number)}%`,
        gap: false,
        foods:
          sources.length === 0
            ? "Chưa có món nào trong nhật ký có số liệu chất này"
            : `Nhiều nhất từ: ${sources.map((s) => `${s.name} ${formatAmount(s.perDay, r.unit)} ${r.unit}`).join(", ")} mỗi ngày`,
      };
    });
}

/** How many of the period's days have a weigh-in. */
export function weighIns(dates: string[], log: WeightPoint[]): { count: number; of: number } {
  const logged = new Set(log.map((p) => p.date));
  return { count: dates.filter((d) => logged.has(d)).length, of: dates.length };
}

export interface ShiftRow {
  key: "calories" | "protein" | "potassium";
  label: string;
  unit: string;
  before: TargetRange;
  now: TargetRange;
  changed: boolean;
}

/** The targets that follow body weight (kcal, đạm, kali) at `beforeKg` and at `nowKg`. */
export function weightShift(
  profile: { sex: SexType; goal: GoalType; trainingMinutesDefault: number; periodMode: boolean },
  beforeKg: number,
  nowKg: number
): ShiftRow[] {
  const at = (weightKg: number) =>
    calculateTargets({
      sex: profile.sex,
      weightKg,
      goal: profile.goal,
      trainingMinutes: profile.trainingMinutesDefault,
      isPeriod: profile.sex === "female" && profile.periodMode,
    });
  const before = at(beforeKg);
  const now = at(nowKg);
  const rows: { key: ShiftRow["key"]; label: string; unit: string }[] = [
    { key: "calories", label: "Kcal", unit: "kcal" },
    { key: "protein", label: "Đạm", unit: "g" },
    { key: "potassium", label: "Kali", unit: "mg" },
  ];
  return rows.map((r) => {
    const b = before[r.key] as TargetRange;
    const n = now[r.key] as TargetRange;
    return { ...r, before: b, now: n, changed: b.min !== n.min || b.max !== n.max };
  });
}
