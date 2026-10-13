import type { DayTotals } from "./day-totals";
import { shiftIsoDate } from "./day-history";
import { formatAmount, formatNumber, formatSigned, getWeekdayName } from "./format";
import { calculateSegments, getLevel, type NutrientLevel } from "./levels";
import type { MockMeal } from "./mock/sample-day";
import type { MicroRow } from "./overview";
import type { Period, WeightPoint } from "./period";

/** Tóm tắt, direction B: everything the hero, scoreboard, Vi chất card and "Cần chú ý" show. Pure. */

export interface HeroState {
  eaten: number;
  min: number;
  remaining: number;
  done: boolean;
  /** n = min(10, floor(eaten / min × 10)) */
  segments: number;
}

export function heroState(eaten: number, min: number): HeroState {
  const remaining = Math.max(0, min - eaten);
  return {
    eaten,
    min,
    remaining,
    done: min > 0 && eaten >= min,
    segments: min > 0 ? calculateSegments((eaten / min) * 100) : 0,
  };
}

export interface MealBar {
  key: "breakfast" | "lunch" | "extra" | "dinner";
  label: string;
  kcal: number;
  /** Share of the biggest meal, 0..1 */
  share: number;
  empty: boolean;
}

const BAR_GROUPS: { key: MealBar["key"]; label: string; slots: MockMeal["slot"][] }[] = [
  { key: "breakfast", label: "Sáng", slots: ["breakfast"] },
  { key: "lunch", label: "Trưa", slots: ["lunch"] },
  { key: "extra", label: "Phụ", slots: ["preworkout", "snack"] },
  { key: "dinner", label: "Tối", slots: ["dinner"] },
];

/** Today's kcal per meal for the hero's "Theo bữa" view. Trước tập and Bữa phụ share the Phụ bar. */
export function mealBars(meals: MockMeal[]): MealBar[] {
  const raw = BAR_GROUPS.map((g) => {
    const inGroup = meals.filter((m) => g.slots.includes(m.slot));
    const items = inGroup.reduce((sum, m) => sum + m.items.length, 0);
    const kcal = inGroup.reduce((sum, m) => sum + m.kcal, 0);
    return { key: g.key, label: g.label, kcal: items > 0 ? kcal : 0, empty: items === 0 };
  });
  const top = Math.max(1, ...raw.map((r) => r.kcal));
  return raw.map((r) => ({ ...r, share: r.empty ? 0 : r.kcal / top }));
}

const dm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

/** "7 ngày qua · 06/10 – 12/10" (30: "30 ngày qua · …"); a past period shows its dates only. */
export function periodHeading(p: Pick<Period, "length" | "start" | "end" | "isCurrent">): string {
  const dates = `${dm(p.start)} – ${dm(p.end)}`;
  return p.isCurrent ? `${p.length} ngày qua · ${dates}` : dates;
}

/** "Giảm 85 so với 7 ngày trước". Whole numbers, compared after rounding. */
export function changeLine(current: number | null, previous: number | null, unit: string, length: number): string {
  if (current === null) return "Chưa đủ số liệu trong kỳ";
  if (previous === null) return `Chưa có ${length} ngày trước để so sánh`;
  const delta = Math.round(current) - Math.round(previous);
  const suffix = unit === "kcal" ? "" : ` ${unit}`;
  if (delta === 0) return `Không đổi so với ${length} ngày trước`;
  return `${delta < 0 ? "Giảm" : "Tăng"} ${formatNumber(Math.abs(delta))}${suffix} so với ${length} ngày trước`;
}

const WEEKDAY_SHORT = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

export function weekdayShort(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return WEEKDAY_SHORT[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

/** "thiếu 10 g" under the minimum, "đạt mục tiêu" at or above it (above the range is on target too). */
export function dayNote(value: number, min: number, unit: string): { text: string; tone: "met" | "under" } {
  if (value >= min) return { text: "đạt mục tiêu", tone: "met" };
  return { text: `thiếu ${formatAmount(min - value, unit)} ${unit}`, tone: "under" };
}

export interface BoardDay {
  iso: string;
  /** "T7" */
  label: string;
  /** "T7 10/10" */
  dateLabel: string;
  value: number | null;
  /** Today: still being logged, so neither met nor missed */
  inProgress: boolean;
  /** null when in progress */
  met: boolean | null;
}

/** The last seven days of a period for kcal or đạm. A day with no entries is null, never 0. */
export type BoardKey = "calories" | "protein" | "carbs" | "fat" | "fiber";

export function boardDays(days: DayTotals[], key: BoardKey, min: number, todayIso: string): BoardDay[] {
  return days.slice(-7).map((d) => {
    const value = d.logged ? d[key] : null;
    const inProgress = d.date === todayIso;
    return {
      iso: d.date,
      label: weekdayShort(d.date),
      dateLabel: `${weekdayShort(d.date)} ${dm(d.date)}`,
      value,
      inProgress,
      met: inProgress ? null : value !== null && value >= min,
    };
  });
}

/** The last seven days of a period for the weight row; a day without a weigh-in has no value. */
export function weightDays(isos: string[], log: WeightPoint[], todayIso: string): BoardDay[] {
  const byDate = new Map(log.map((p) => [p.date, p.kg]));
  return isos.slice(-7).map((iso) => ({
    iso,
    label: weekdayShort(iso),
    dateLabel: `${weekdayShort(iso)} ${dm(iso)}`,
    value: byDate.get(iso) ?? null,
    inProgress: iso === todayIso,
    met: null,
  }));
}

/** "−0,2 kg so với hôm trước" (weighed the day before) or "so với lần cân trước"; "" with nothing to compare. */
export function weightDayNote(log: WeightPoint[], iso: string): string {
  const entry = log.find((p) => p.date === iso);
  if (!entry) return "";
  const before = log.filter((p) => p.date < iso).sort((a, b) => b.date.localeCompare(a.date))[0];
  if (!before) return "";
  const ref = before.date === shiftIsoDate(iso, -1) ? "hôm trước" : "lần cân trước";
  const delta = formatSigned(entry.kg - before.kg, { decimals: 1 });
  return delta === "0,0" ? `không đổi so với ${ref}` : `${delta} kg so với ${ref}`;
}

export interface MicroSquare {
  key: string;
  name: string;
  unit: string;
  percentage: number | null;
  level: NutrientLevel | null;
  average: number | null;
  targetMin: number | null;
}

export interface MicroBoard {
  total: number;
  achieved: number;
  /** Achieved now minus achieved in the previous period; null when the previous period has no numbers */
  change: number | null;
  segments: number;
  counts: Record<NutrientLevel, number>;
  /** Nutrients with no number in the period (no logged food carries a value) */
  unknown: number;
  /** Lowest share first, unknown last */
  squares: MicroSquare[];
  /** Up to three nutrients under their target, lowest first */
  lowest: MicroSquare[];
}

const achievedOf = (rows: MicroRow[]) => rows.filter((r) => r.percentage !== null && r.percentage >= 100).length;

export function microBoard(rows: MicroRow[], previous: MicroRow[]): MicroBoard {
  const squares: MicroSquare[] = rows
    .map((r) => ({
      key: r.key,
      name: r.name,
      unit: r.unit,
      percentage: r.percentage,
      level: r.percentage === null ? null : getLevel(r.percentage),
      average: r.average,
      targetMin: r.targetMin,
    }))
    .sort((a, b) => {
      if (a.percentage === null && b.percentage === null) return 0;
      if (a.percentage === null) return 1;
      if (b.percentage === null) return -1;
      return a.percentage - b.percentage;
    });
  const counts: Record<NutrientLevel, number> = { thieu: 0, trungbinh: 0, ganDu: 0, dat: 0 };
  for (const s of squares) if (s.level) counts[s.level] += 1;
  const achieved = counts.dat;
  const previousKnown = previous.some((r) => r.percentage !== null);
  return {
    total: squares.length,
    achieved,
    change: previousKnown ? achieved - achievedOf(previous) : null,
    segments: squares.length > 0 ? calculateSegments((achieved / squares.length) * 100) : 0,
    counts,
    unknown: squares.filter((s) => s.percentage === null).length,
    squares,
    lowest: squares.filter((s) => s.percentage !== null && s.percentage < 100).slice(0, 3),
  };
}

export interface AttentionRow {
  kind: "protein" | "nutrient";
  /** Nutrient key for kind "nutrient" */
  key?: string;
  title: string;
  line: string;
  number: string;
  /** The number reads as a gap (destructive colour) */
  gap: boolean;
}

/**
 * One "Chưa đạt … vào N ngày" row: the finished logged days of the period below `min` for one metric, their names
 * (weekdays for 7 days, dd/mm for 30; three at most, then "và n ngày khác") and the biggest shortfall as the number.
 */
export function underDaysRow(input: {
  days: DayTotals[];
  key: BoardKey;
  min: number;
  /** "Chưa đạt mục tiêu Đạm"; the day count is appended */
  title: string;
  unit: string;
  todayIso: string;
  length: 7 | 30;
}): AttentionRow | null {
  const { days, key, min, title, unit, todayIso, length } = input;
  const under = days.filter((d) => d.logged && d.date < todayIso && d[key] !== null && (d[key] as number) < min);
  if (under.length === 0) return null;
  const names = under.map((d) => (length === 7 ? getWeekdayName(d.date) : dm(d.date)));
  const rest = names.length - 3;
  const shown = names.slice(0, 3).join(", ");
  const gap = Math.max(...under.map((d) => min - (d[key] as number)));
  return {
    kind: "protein",
    title: `${title} vào ${under.length} ngày`,
    line: rest > 0 ? `${shown} và ${rest} ngày khác` : shown,
    number: `−${formatAmount(gap, unit)} ${unit}`,
    gap: true,
  };
}

/**
 * "Cần chú ý": up to three facts. Protein days under the minimum (finished logged days of the period),
 * then the lowest counted nutrients under their target. Nothing under target → no rows.
 */
export function attentionRows(input: {
  days: DayTotals[];
  proteinMin: number | null;
  todayIso: string;
  micro: MicroRow[];
  length: 7 | 30;
}): AttentionRow[] {
  const { days, proteinMin, todayIso, micro, length } = input;
  const out: AttentionRow[] = [];

  if (proteinMin !== null) {
    const row = underDaysRow({ days, key: "protein", min: proteinMin, title: "Chưa đạt mục tiêu Đạm", unit: "g", todayIso, length });
    if (row) out.push(row);
  }

  const low = micro
    .filter((r) => r.percentage !== null && r.percentage < 100 && r.average !== null && r.targetMin !== null)
    .sort((a, b) => (a.percentage as number) - (b.percentage as number));
  low.slice(0, 2).forEach((r, i) => {
    const average = r.average as number;
    const min = r.targetMin as number;
    out.push({
      kind: "nutrient",
      key: r.key,
      title: `${r.name} ${i === 0 ? "đang thấp nhất" : "cũng đang thấp"}`,
      line: `${formatAmount(average, r.unit)} / ${formatAmount(min, r.unit)} ${r.unit} mỗi ngày · còn thiếu ${formatAmount(min - average, r.unit)} ${r.unit}`,
      number: `${formatNumber(r.percentage as number)}%`,
      gap: false,
    });
  });

  return out.slice(0, 3);
}
