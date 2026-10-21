import { getLevel, type NutrientLevel } from "@/lib/levels";
import type { ScoreRowData } from "@/lib/overview-detail";

const LEVEL_BG: Record<NutrientLevel, string> = {
  thieu: "bg-level-thieu",
  trungbinh: "bg-level-trungbinh",
  ganDu: "bg-level-gandu",
  dat: "bg-level-dat",
};

/**
 * The fill of a day's square or bar. Met mode (Tóm tắt): đạt green when the day met the target, thiếu red when not.
 * Level mode (Năng lượng): the level colour of the day's share of the target (lib/levels). A day with nothing logged is
 * grey; a day still being logged is secondary (bars) or an outline (squares), decided by the caller.
 */
export function dayFill(day: ScoreRowData["days"][number], row: ScoreRowData, levels: boolean): string {
  if (day.value === null) return "bg-card-border";
  if (levels && row.target && row.target.min > 0) return LEVEL_BG[getLevel(Math.floor((100 * day.value) / row.target.min))];
  return day.met ? "bg-level-dat" : "bg-level-thieu";
}
