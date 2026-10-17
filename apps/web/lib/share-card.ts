import { formatAmount, formatDayLabel, formatRange } from "./format";
import { kcalValue } from "./kcal";
import { cleanDisplayName, validateDisplayName } from "./display-name";
import { DAY_MODE, heroLabel, pctLabel, targetOf, valuesFromDay, type HomeEntry, type HomeMeal, type HomeValues } from "./home";
import type { Level } from "./coaching-link";
import { columnGroups, countedForLevel, levelSummary, sumExtras, type ColumnGroup } from "./level-nutrients";
import { getLevelColor } from "./levels";
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

/** The tallest the PNG may be: a long day (many foods) is drawn smaller instead of failing in canvas limits. */
export const SHARE_MAX_HEIGHT = 12000;

export interface ShareImageSize {
  /** CSS px to image px. SHARE_SCALE normally; lower for a page too tall for SHARE_MAX_HEIGHT. */
  scale: number;
  width: number;
  height: number;
}

/** The PNG size for a drawn page of this CSS height: 1080 wide, up to SHARE_MAX_HEIGHT tall, then smaller overall. */
export function shareImageSize(cssHeight: number): ShareImageSize {
  const height = shareImageHeight(cssHeight);
  if (height <= SHARE_MAX_HEIGHT) return { scale: SHARE_SCALE, width: SHARE_WIDTH, height };
  const scale = SHARE_MAX_HEIGHT / cssHeight;
  return { scale, width: Math.floor(SHARE_CSS_WIDTH * scale), height: SHARE_MAX_HEIGHT };
}

export function shareFilename(isoDate: string): string {
  return `h1t-micro-${isoDate}.png`;
}

export interface ShareKeyItem {
  label: string;
  /** A colour token as `var(--color-x)`. */
  color: string;
}

/** The colour key under the nutrient column: the four levels, today and past days alike. */
export function shareKey(): ShareKeyItem[] {
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

/** The name as the image shows it: cleaned (lib/display-name); null when it is not a usable name (then it is asked for). */
export function shareName(displayName: string | null | undefined): string | null {
  return validateDisplayName(displayName) === null ? cleanDisplayName(displayName) : null;
}

/**
 * The share image always has a name. While the display name is blank the sheet shows a name step and draws
 * nothing; shareName()'s no-name branch (the date on row 1) is only a safety fallback.
 */
export function shareNeedsName(displayName: string | null | undefined): boolean {
  return shareName(displayName) === null;
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
    `${kcalValue(values.kcal)} / ${formatRange(kcalTarget.min, kcalTarget.max)} kcal, ${pctLabel(values.kcal, kcalTarget.min)}`,
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
    key: shareKey(),
    filename: shareFilename(day.date),
    alt,
  };
}

/** The two families the share image is drawn in (app/layout.tsx). */
export const SHARE_FONTS = ["manrope", "saira condensed"];

/**
 * Whether html-to-image's font CSS can draw the picture in its own fonts: both families have a face, and every face's
 * file is inlined as a data URL. A font file that fails to load only warns and leaves `url()` empty, and the picture
 * then falls back to a wider system font that wraps and overlaps inside the sizes measured in the real fonts.
 */
export function shareFontsEmbedded(css: string | undefined): boolean {
  const faces = css?.match(/@font-face\s*{[^}]*}/g) ?? [];
  const families = faces.map((f) => /font-family:\s*([^;]+)/.exec(f)?.[1].replace(/["']/g, "").trim().toLowerCase());
  const inlined = faces.every((f) => {
    const urls = [...f.matchAll(/url\(\s*["']?([^"')]*)/g)].map((m) => m[1]);
    return urls.length > 0 && urls.every((u) => /^data:[^,]+,.+/.test(u));
  });
  return inlined && SHARE_FONTS.every((name) => families.includes(name));
}

/** html-to-image `filter`: a node marked data-export="hide" (the + Thêm buttons) is left out of the share image. */
export function keepInShareImage(node: { dataset?: { export?: string } } | null | undefined): boolean {
  return node?.dataset?.export !== "hide";
}
