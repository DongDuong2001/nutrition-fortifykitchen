import { formatAmount, formatDayLabel, formatRange } from "./format";
import { DAY_MODE, heroLabel, pctLabel, targetOf, valuesFromDay, type HomeEntry, type HomeMeal, type HomeValues } from "./home";
import type { Level } from "./coaching-link";
import { columnGroups, countedForLevel, levelSummary, sumExtras, type ColumnGroup } from "./level-nutrients";
import { getLevelColor, homeBarColor } from "./levels";
import type { MockDayData } from "./mock/sample-day";

/**
 * The share image is the Hôm nay screen itself, drawn at 390 px wide and rasterised at 1080/390 (components/home/
 * share-day.tsx). The model here is what that picture needs, as plain values; the size rules are pure.
 */
export const SHARE_CSS_WIDTH = 390;
export const SHARE_WIDTH = 1080;
export const SHARE_MIN_HEIGHT = 1920;
export const SHARE_SCALE = SHARE_WIDTH / SHARE_CSS_WIDTH;
/** The shortest the drawn page may be, in CSS px: it fills 1080×1920 and the footer sits at its bottom. */
export const SHARE_MIN_CSS_HEIGHT = SHARE_MIN_HEIGHT / SHARE_SCALE;

/** The PNG height for a drawn page of this CSS height: never under 1920, never shorter than the content. */
export function shareImageHeight(cssHeight: number): number {
  if (!Number.isFinite(cssHeight) || cssHeight <= 0) return SHARE_MIN_HEIGHT;
  // 1e-6: a content height that lands exactly on a whole pixel must not gain a row to rounding noise
  return Math.max(SHARE_MIN_HEIGHT, Math.ceil(cssHeight * SHARE_SCALE - 1e-6));
}

export function shareFilename(isoDate: string): string {
  return `h1t-micro-${isoDate}.png`;
}

export interface ShareKeyItem {
  label: string;
  /** A colour token as `var(--color-x)`. */
  color: string;
}

/** The colour key under the nutrient column: one entry today (two-tone bars), four on a past day. */
export function shareKey(finished: boolean): ShareKeyItem[] {
  if (!finished) return [{ label: "Xanh: đạt mục tiêu", color: homeBarColor("dat") }];
  return [
    { label: "Thiếu <50%", color: getLevelColor("thieu") },
    { label: "Trung bình", color: getLevelColor("trungbinh") },
    { label: "Gần đủ", color: getLevelColor("ganDu") },
    { label: "Đạt ≥100%", color: getLevelColor("dat") },
  ];
}

/** Meals with no food are not drawn on the image. */
export function shareMeals(meals: HomeMeal[]): HomeMeal[] {
  return meals.filter((m) => m.entries.length > 0);
}

/** The name as the image shows it: trimmed; null when none is set (then only the date is drawn). */
export function shareName(displayName: string | null | undefined): string | null {
  const name = (displayName ?? "").trim();
  return name === "" ? null : name;
}

export interface ShareModel {
  name: string | null;
  dateLabel: string;
  finished: boolean;
  /** "Cả ngày · 7 món" */
  heroLabel: string;
  values: HomeValues;
  kcalTarget: { min: number; max: number };
  macroTargets: Record<"carbs" | "protein" | "fat" | "fiber", number | null>;
  /** Percent targets of the nutrient column, by catalogue id. */
  nutrientTargets: Record<string, number | null>;
  meals: HomeMeal[];
  /** The Level badge and the column's lists (lib/level-nutrients). */
  level: Level;
  groups: ColumnGroup[];
  extras: Record<string, number | null>;
  /** "x/N đạt" over the Level's own micros. */
  summary: { reached: number; total: number; lacking: string[] };
  key: ShareKeyItem[];
  filename: string;
  /** What a screen reader hears for the image. */
  alt: string;
}

/**
 * The share image of one day, from the day Hôm nay shows. Numbers and rules are Hôm nay's. It holds the display
 * name, the date and the numbers of the day, never weight, email or profile numbers.
 */
export function buildShareModel({
  day,
  entries,
  meals,
  finished,
  now,
  displayName,
  level,
  nutrientIds,
}: {
  day: MockDayData;
  entries: HomeEntry[];
  meals: HomeMeal[];
  finished: boolean;
  now: Date;
  displayName?: string | null;
  level: Level;
  /** The Level's counted micros (countedForLevel); the targets are read for these. */
  nutrientIds: readonly string[];
}): ShareModel {
  const values = valuesFromDay(day);
  const name = shareName(displayName);
  const dateLabel = formatDayLabel(day.date, now);
  const kcalTarget = { min: day.calories.targetMin, max: day.calories.targetMax };
  const macroTargets = {
    carbs: targetOf(day, "carbs"),
    protein: targetOf(day, "protein"),
    fat: targetOf(day, "fat"),
    fiber: targetOf(day, "fiber"),
  };
  const nutrientTargets = Object.fromEntries(nutrientIds.map((id) => [id, targetOf(day, id)]));
  const summary = levelSummary(values.nutrients, nutrientTargets, countedForLevel(level));
  const macro = (label: string, key: keyof typeof macroTargets) => {
    const v = values[key];
    return `${label} ${v === null ? "—" : `${formatAmount(v, "g")} g`}, ${pctLabel(v, macroTargets[key])}`;
  };
  const alt = [
    `Ảnh tóm tắt ${dateLabel}${name ? ` của ${name}` : ""}`,
    `${formatAmount(values.kcal, "kcal")} / ${formatRange(kcalTarget.min, kcalTarget.max)} kcal, ${pctLabel(values.kcal, kcalTarget.min)}`,
    [macro("Tinh bột", "carbs"), macro("Đạm", "protein"), macro("Chất béo", "fat"), macro("Chất xơ", "fiber")].join("; "),
    `Vi chất đạt ${summary.reached}/${summary.total}`,
  ].join(". ");

  return {
    name,
    dateLabel,
    finished,
    heroLabel: heroLabel(DAY_MODE, entries, meals),
    values,
    kcalTarget,
    macroTargets,
    nutrientTargets,
    meals: shareMeals(meals),
    level,
    groups: columnGroups(level),
    extras: sumExtras(entries),
    summary,
    key: shareKey(finished),
    filename: shareFilename(day.date),
    alt,
  };
}
