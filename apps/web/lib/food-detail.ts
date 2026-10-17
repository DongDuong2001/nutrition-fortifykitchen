import { COUNTED_NUTRIENT_KEYS } from "./day-totals";
import { getNutrientDefinition } from "./nutrients";
import type { CompleteTargets } from "./targets";

export interface MicroRow {
  id: string;
  name: string;
  unit: string;
  group: "minerals" | "vitamins";
  /** Amount in the chosen portion. Null = no data for this food, never 0. */
  value: number | null;
  /** Exact share of the daily minimum (not rounded). Null without a value or a target. */
  share: number | null;
  /** Whole percent for display. */
  pct: number | null;
}

/** Nutrients a portion gives at 20 % of the daily target or more. */
export const GOOD_SOURCE_SHARE = 20;

const targetMin = (targets: CompleteTargets, id: string): number | null => {
  const min = targets[id]?.min;
  return typeof min === "number" && min > 0 ? min : null;
};

/** Whole percent for display. Never rounds up across 20 % or 100 %, so the row agrees with the good-source rule. */
export function displayPercent(share: number): number {
  const r = Math.round(share);
  if (share < GOOD_SOURCE_SHARE && r >= GOOD_SOURCE_SHARE) return GOOD_SOURCE_SHARE - 1;
  if (share < 100 && r >= 100) return 99;
  return r;
}

/** The 22 counted nutrients for a food at `grams`, minerals first (as the Vi chất sheet), and how many are unknown. */
export function microRowsFor(
  per100: Record<string, number | null>,
  grams: number,
  targets: CompleteTargets
): { rows: MicroRow[]; unknown: number } {
  const rows: MicroRow[] = COUNTED_NUTRIENT_KEYS.map((id) => {
    const def = getNutrientDefinition(id);
    const raw = per100[id];
    const value = raw === null || raw === undefined ? null : (raw * grams) / 100;
    const min = targetMin(targets, id);
    const share = value !== null && min !== null ? (value / min) * 100 : null;
    return {
      id,
      name: def?.name ?? id,
      unit: def?.unit ?? "mg",
      group: def?.group === "vitamins" ? "vitamins" : "minerals",
      value,
      share,
      pct: share === null ? null : displayPercent(share),
    };
  });
  const ordered = [...rows.filter((r) => r.group === "minerals"), ...rows.filter((r) => r.group === "vitamins")];
  return { rows: ordered, unknown: ordered.filter((r) => r.value === null).length };
}

/** "Nguồn tốt của": counted nutrients at 20 % of the target or more for the portion, highest share first. */
export function goodSourcesOf(
  per100: Record<string, number | null>,
  grams: number,
  targets: CompleteTargets
): MicroRow[] {
  return microRowsFor(per100, grams, targets)
    .rows.filter((r) => r.share !== null && r.share >= GOOD_SOURCE_SHARE)
    .sort((a, b) => (b.share ?? 0) - (a.share ?? 0));
}
