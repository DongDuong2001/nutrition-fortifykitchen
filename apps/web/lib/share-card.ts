import { formatAmount, formatDayLabel, formatRange } from "./format";
import { pctLabel, pctOf, targetOf, valuesFromDay } from "./home";
import { lowestMicros, microsSummaryFor } from "./lacking";
import { getLevel, getLevelLabel, homeBarTone, homeSegments, type HomeBarTone } from "./levels";
import type { MockDayData } from "./mock/sample-day";

/** Everything the share image says, as strings and numbers: the canvas only draws this. */
export interface ShareBar {
  label: string;
  /** "62 g", or a dash when the amount is unknown. */
  amount: string;
  pct: number | null;
  pctText: string;
  /** The level in words, so colour never stands alone ("Chưa có số liệu" when unknown). */
  level: string;
  segments: number;
  tone: HomeBarTone;
}

export interface ShareCardModel {
  dateLabel: string;
  kcal: { value: string; target: string; pctText: string; level: string; segments: number; tone: HomeBarTone };
  bars: ShareBar[];
  micros: { reached: number; total: number; text: string };
  lacking: { name: string; pctText: string }[];
  filename: string;
}

/** Same macros as the Hôm nay hero, in the order of the share card. */
const BARS: { key: "protein" | "carbs" | "fat" | "fiber"; label: string }[] = [
  { key: "protein", label: "Đạm" },
  { key: "carbs", label: "Tinh bột" },
  { key: "fat", label: "Chất béo" },
  { key: "fiber", label: "Chất xơ" },
];

const LOWEST_COUNT = 3;
const UNKNOWN_LEVEL = "Chưa có số liệu";

export function shareFilename(isoDate: string): string {
  return `h1t-micro-${isoDate}.png`;
}

const levelWord = (pct: number | null) => (pct === null ? UNKNOWN_LEVEL : getLevelLabel(getLevel(pct)));

/**
 * The share image of one day, from the day Hôm nay shows (`finished` is a past day: four levels instead of two
 * tones). Numbers and rules are Hôm nay's (lib/home, lib/levels, lib/lacking). It holds no name, weight, email or meal.
 */
export function buildShareCard({ day, finished, now }: { day: MockDayData; finished: boolean; now: Date }): ShareCardModel {
  const values = valuesFromDay(day);
  const kcalPct = pctOf(values.kcal, day.calories.targetMin);
  const kcalValue = kcalPct ?? 0;

  const bars = BARS.map(({ key, label }): ShareBar => {
    const value = values[key];
    const target = targetOf(day, key);
    const pct = pctOf(value, target);
    return {
      label,
      amount: value === null ? "—" : `${formatAmount(value, "g")} g`,
      pct,
      pctText: pctLabel(value, target),
      level: levelWord(pct),
      segments: pct === null ? 0 : homeSegments(pct),
      tone: homeBarTone(pct ?? 0, finished),
    };
  });

  const summary = microsSummaryFor(day);

  return {
    dateLabel: formatDayLabel(day.date, now),
    kcal: {
      value: formatAmount(values.kcal, "kcal"),
      target: `${formatRange(day.calories.targetMin, day.calories.targetMax)} kcal`,
      pctText: pctLabel(values.kcal, day.calories.targetMin),
      level: levelWord(kcalPct),
      segments: homeSegments(kcalValue),
      tone: homeBarTone(kcalValue, finished),
    },
    bars,
    micros: { reached: summary.achieved, total: summary.total, text: `Vi chất đạt ${summary.achieved}/${summary.total}` },
    lacking: lowestMicros(day, LOWEST_COUNT).map((s) => ({ name: s.name, pctText: pctLabel(s.consumed, s.targetMin) })),
    filename: shareFilename(day.date),
  };
}

/** What a screen reader hears for the image: the same numbers the card draws, in one sentence per block. */
export function shareCardAlt(model: ShareCardModel): string {
  const bars = model.bars.map((b) => `${b.label} ${b.amount}, ${b.pctText}, ${b.level}`).join("; ");
  const lacking = model.lacking.map((l) => `${l.name} ${l.pctText}`).join(", ");
  return [
    `Ảnh tóm tắt ${model.dateLabel}`,
    `${model.kcal.value} / ${model.kcal.target}, ${model.kcal.pctText}, ${model.kcal.level}`,
    bars,
    model.micros.text,
    lacking ? `Thiếu nhiều nhất: ${lacking}` : "",
  ]
    .filter(Boolean)
    .join(". ");
}
