import { formatAmount } from "./format";

/** One meta line for an entry: "Đạm 12 g · Tinh bột 30 g · Béo 5 g". An unknown macro is a dash, never 0. */
export function macroLine(macros: { protein: number | null; carbs: number | null; fat: number | null }): string | null {
  const { protein, carbs, fat } = macros;
  if (protein === null && carbs === null && fat === null) return null;
  const part = (label: string, v: number | null) => `${label} ${v === null ? "—" : `${formatAmount(v, "g")} g`}`;
  return `${part("Đạm", protein)} · ${part("Tinh bột", carbs)} · ${part("Béo", fat)}`;
}

export interface DayTile {
  /** The big number, in Saira */
  value: string;
  label: string;
  line: string;
}

/** The Vi chất tile of Nhật ký: "8/22" and what is lacking most. */
export function microsTile(
  summary: { achieved: number; total: number; mostLacking: string[] },
  nothingLogged: boolean
): DayTile & { pct: number } {
  if (nothingLogged) return { value: "—", label: "vi chất", line: "Chưa có món", pct: 0 };
  return {
    value: `${summary.achieved}/${summary.total}`,
    label: "vi chất",
    line: summary.mostLacking.length > 0 ? `Thiếu: ${summary.mostLacking.join(", ")}` : "Không thiếu chất nào",
    pct: summary.total > 0 ? Math.round((summary.achieved / summary.total) * 100) : 0,
  };
}

/** The Ngày tập tile of Nhật ký: minutes (or "Nghỉ") and the salt range. A past day is view only. */
export function trainingTile(input: { minutes: number; saltText: string; past: boolean }): DayTile {
  const { minutes, saltText, past } = input;
  return {
    value: minutes > 0 ? `${minutes}′` : "Nghỉ",
    label: "Ngày tập",
    line: past ? "Chỉ xem" : `muối ${saltText} g`,
  };
}
