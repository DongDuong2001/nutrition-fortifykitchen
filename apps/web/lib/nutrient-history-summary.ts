import { weekdayShortVi } from "./nutrient-detail";

/** One day of the seven in a nutrient's history: its share of the target, when there is one. */
export interface HistorySummaryPoint {
  iso: string;
  percentage: number | null;
}

/**
 * The line under the "7 ngày qua" title (V3NutrientDetail): how many of the days reached the target and the best day.
 * "Chưa ngày nào đạt 1.000 mg; cao nhất T2 (90%)." or "Đạt 1.000 mg 2/7 ngày; cao nhất T2 (110%)."
 * Null when there is no target text or no day has a share to compare. A tie for the best goes to the later day.
 */
export function nutrientHistorySummary(points: HistorySummaryPoint[], targetText: string | null): string | null {
  if (!targetText) return null;
  const known = points.filter((p): p is HistorySummaryPoint & { percentage: number } => p.percentage !== null);
  if (known.length === 0) return null;
  const best = known.reduce((a, b) => (b.percentage >= a.percentage ? b : a));
  const reached = known.filter((p) => p.percentage >= 100).length;
  const lead = reached === 0 ? `Chưa ngày nào đạt ${targetText}` : `Đạt ${targetText} ${reached}/${points.length} ngày`;
  return `${lead}; cao nhất ${weekdayShortVi(best.iso)} (${best.percentage}%).`;
}
