import { COUNTED_NUTRIENT_KEYS, type DayTotals } from "./day-totals";
import { shiftIsoDate } from "./day-history";
import { formatAmount, formatNumber, formatPercent, formatPeriodRange, formatSigned } from "./format";
import { NUTRIENT_CATALOG } from "./nutrients";
import type { CompleteTargets } from "./targets";

export type PeriodLength = 7 | 30;

/** One period of Tổng quan: `length` days ending `offset` whole periods before today. */
export interface Period {
  length: PeriodLength;
  /** 0 is the current period (ends today); 1 is the one before it, and so on. Never negative. */
  offset: number;
  start: string;
  end: string;
  /** Every date of the period, oldest first */
  days: string[];
  /** The period that ends today. The › step is disabled on it, so nothing is in the future. */
  isCurrent: boolean;
  /** "06–12/10" */
  label: string;
}

export function period(todayIso: string, length: PeriodLength, offset = 0): Period {
  const safeOffset = Number.isFinite(offset) ? Math.max(0, Math.floor(offset)) : 0;
  const end = shiftIsoDate(todayIso, -safeOffset * length);
  const start = shiftIsoDate(end, -(length - 1));
  const days = Array.from({ length }, (_, i) => shiftIsoDate(start, i));
  return {
    length,
    offset: safeOffset,
    start,
    end,
    days,
    isCurrent: safeOffset === 0,
    label: formatPeriodRange(start, end),
  };
}

/** Reads ?p=7|30 and ?o=<offset>. A missing or bad value is 7 days, current period. */
export function parsePeriodParams(p: string | null | undefined, o: string | null | undefined): { length: PeriodLength; offset: number } {
  const length: PeriodLength = p === "30" ? 30 : 7;
  const offset = o !== null && o !== undefined && /^\d+$/.test(o) ? Number(o) : 0;
  return { length, offset };
}

/** The query string that remembers the period across sub-tabs: "" for the default (7 days, current). */
export function periodQuery(length: PeriodLength, offset: number): string {
  const parts: string[] = [];
  if (length !== 7) parts.push(`p=${length}`);
  if (offset > 0) parts.push(`o=${offset}`);
  return parts.length > 0 ? `?${parts.join("&")}` : "";
}

/** Averages over the logged days of a period. A value no logged day knows is null, never 0. */
export interface PeriodAverages {
  loggedDays: number;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  fiber: number | null;
  nutrients: Record<string, number | null>;
}

/** Finished days that have entries. Today is in progress, so it never counts. */
function finishedLoggedDays(days: DayTotals[], todayIso: string): DayTotals[] {
  return days.filter((d) => d.logged && d.date < todayIso);
}

function averageOf(values: (number | null)[]): number | null {
  const known = values.filter((v): v is number => v !== null);
  return known.length === 0 ? null : known.reduce((sum, v) => sum + v, 0) / known.length;
}

export function periodAverages(days: DayTotals[], todayIso: string): PeriodAverages {
  const logged = finishedLoggedDays(days, todayIso);
  return {
    loggedDays: logged.length,
    calories: averageOf(logged.map((d) => d.calories)),
    protein: averageOf(logged.map((d) => d.protein)),
    carbs: averageOf(logged.map((d) => d.carbs)),
    fat: averageOf(logged.map((d) => d.fat)),
    fiber: averageOf(logged.map((d) => d.fiber)),
    nutrients: Object.fromEntries(
      COUNTED_NUTRIENT_KEYS.map((key) => [key, averageOf(logged.map((d) => d.nutrients[key] ?? null))])
    ),
  };
}

/** Days that reached a target, out of the days where the value is known. */
export interface TargetCount {
  met: number;
  of: number;
}

/** The minimum of a target from the profile, or null when the metric has none. */
export function targetMinFor(key: string, targets: CompleteTargets): number | null {
  const range = targets[key];
  return range && range.min > 0 ? range.min : null;
}

function countDays(values: (number | null)[], min: number | null): TargetCount {
  if (min === null) return { met: 0, of: 0 };
  const known = values.filter((v): v is number => v !== null);
  // Product rule: a day above the range is on target too, so only the minimum matters
  return { met: known.filter((v) => v >= min).length, of: known.length };
}

/** Days on target for kcal, protein and each counted nutrient, over finished logged days. */
export function periodTargetDays(
  days: DayTotals[],
  todayIso: string,
  targets: CompleteTargets
): { calories: TargetCount; protein: TargetCount; nutrients: Record<string, TargetCount> } {
  const logged = finishedLoggedDays(days, todayIso);
  return {
    calories: countDays(logged.map((d) => d.calories), targetMinFor("calories", targets)),
    protein: countDays(logged.map((d) => d.protein), targetMinFor("protein", targets)),
    nutrients: Object.fromEntries(
      COUNTED_NUTRIENT_KEYS.map((key) => [key, countDays(logged.map((d) => d.nutrients[key] ?? null), targetMinFor(key, targets))])
    ),
  };
}

const KCAL_PER_GRAM = { protein: 4, carbs: 4, fat: 9 } as const;

/**
 * Share of energy from đạm, tinh bột and béo, in whole percents that add up to 100 (largest remainder).
 * Null when a macro is unknown or nothing was eaten.
 */
export function macroComposition(macros: {
  protein: number | null;
  carbs: number | null;
  fat: number | null;
}): { protein: number; carbs: number; fat: number } | null {
  const { protein, carbs, fat } = macros;
  if (protein === null || carbs === null || fat === null) return null;
  const kcal = [protein * KCAL_PER_GRAM.protein, carbs * KCAL_PER_GRAM.carbs, fat * KCAL_PER_GRAM.fat];
  const total = kcal[0] + kcal[1] + kcal[2];
  if (total <= 0) return null;

  const exact = kcal.map((k) => (k / total) * 100);
  const floors = exact.map(Math.floor);
  let left = 100 - floors.reduce((sum, v) => sum + v, 0);
  const order = exact.map((v, i) => ({ i, rest: v - floors[i] })).sort((a, b) => b.rest - a.rest || a.i - b.i);
  for (const { i } of order) {
    if (left <= 0) break;
    floors[i] += 1;
    left -= 1;
  }
  return { protein: floors[0], carbs: floors[1], fat: floors[2] };
}

/** One metric that moved between two periods. */
export interface PeriodChange {
  key: string;
  label: string;
  unit: string;
  current: number;
  previous: number;
  delta: number;
  /** Relative change in percent (not rounded) */
  deltaPct: number;
}

const MACRO_METRICS: { key: "calories" | "protein" | "carbs" | "fat"; label: string; unit: string }[] = [
  { key: "calories", label: "Năng lượng", unit: "kcal" },
  { key: "protein", label: "Đạm", unit: "g" },
  { key: "carbs", label: "Tinh bột", unit: "g" },
  { key: "fat", label: "Chất béo", unit: "g" },
];

const NUTRIENT_INFO = new Map(NUTRIENT_CATALOG.map((n) => [n.id, { label: n.name, unit: n.unit as string }]));

/**
 * What changed from the previous period to the current one, biggest relative change first. Facts only:
 * a metric that is unknown in either period, or did not change, is left out.
 */
export function comparePeriods(current: PeriodAverages, previous: PeriodAverages): PeriodChange[] {
  const metrics = [
    ...MACRO_METRICS.map((m) => ({ ...m, now: current[m.key], before: previous[m.key] })),
    ...COUNTED_NUTRIENT_KEYS.map((key) => ({
      key,
      label: NUTRIENT_INFO.get(key)?.label ?? key,
      unit: NUTRIENT_INFO.get(key)?.unit ?? "",
      now: current.nutrients[key] ?? null,
      before: previous.nutrients[key] ?? null,
    })),
  ];

  const changes: PeriodChange[] = [];
  for (const m of metrics) {
    if (m.now === null || m.before === null || m.before <= 0) continue;
    const delta = m.now - m.before;
    if (delta === 0) continue;
    changes.push({ key: m.key, label: m.label, unit: m.unit, current: m.now, previous: m.before, delta, deltaPct: (delta * 100) / m.before });
  }
  return changes.sort((a, b) => Math.abs(b.deltaPct) - Math.abs(a.deltaPct));
}

/**
 * Days in a row with entries, ending today when today has entries, otherwise yesterday.
 * `isLogged` answers for any date; the count stops at the first day without entries.
 */
export function loggingStreak(isLogged: (iso: string) => boolean, todayIso: string, maxDays = 365): number {
  let cursor = isLogged(todayIso) ? todayIso : shiftIsoDate(todayIso, -1);
  let streak = 0;
  while (streak < maxDays && isLogged(cursor)) {
    streak += 1;
    cursor = shiftIsoDate(cursor, -1);
  }
  return streak;
}


/** Enough logged days for the averages to mean something. Under this, Tóm tắt shows "Chưa đủ dữ liệu". */
export const MIN_LOGGED_DAYS = 3;

export function hasEnoughData(averages: PeriodAverages): boolean {
  return averages.loggedDays >= MIN_LOGGED_DAYS;
}

export interface WeightPoint {
  date: string;
  kg: number;
}

export interface WeightSummary {
  /** The latest weight up to the end of the period */
  latest: number | null;
  /** Last minus first entry inside the period; null with fewer than two entries */
  change: number | null;
  /** Latest minus the very first entry of the log (up to the end of the period) */
  sinceStart: number | null;
  startDate: string | null;
  /** The entries inside the period, oldest first (for the chart) */
  points: WeightPoint[];
}

export function weightSummary(log: WeightPoint[], p: Pick<Period, "start" | "end">): WeightSummary {
  const upToEnd = log.filter((e) => e.date <= p.end).sort((a, b) => a.date.localeCompare(b.date));
  if (upToEnd.length === 0) return { latest: null, change: null, sinceStart: null, startDate: null, points: [] };
  const points = upToEnd.filter((e) => e.date >= p.start);
  const first = upToEnd[0];
  const latest = upToEnd[upToEnd.length - 1];
  return {
    latest: latest.kg,
    change: points.length >= 2 ? points[points.length - 1].kg - points[0].kg : null,
    sinceStart: upToEnd.length >= 2 ? latest.kg - first.kg : null,
    startDate: first.date,
    points,
  };
}
