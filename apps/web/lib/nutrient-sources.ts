import {
  type AddedDiaryEntry,
  SAMPLE_ITEMS,
  type SampleEdits,
  type SampleItemInfo,
  sampleEffect,
} from "./diary-edits";
import { formatAmount, formatNumber } from "./format";
import { portionLabel } from "./home";
import { parsePortionLabel } from "./portion";

/** One food of today that adds to a nutrient: its share in the same unit as the nutrient. Entries of one food and portion form are one source (qty "200 g · 2 lần"). */
export interface NutrientSource {
  id: string;
  name: string;
  qty: string;
  amount: number;
  /** For the portion as Hôm nay shows it (lib/home portionLabel: "2 viên" for a supplement, never its grams) */
  foodId: string;
  grams: number | null;
}

/** The nutrients Hôm nay's hero and Chất xơ row show as macros: a quick kcal entry has no nutrient record, so its typed grams (the entry's own fields, which the day total adds) stand in. */
const MACRO_SOURCES = ["carbs", "protein", "fat", "fiber"] as const;
export type MacroSource = (typeof MACRO_SOURCES)[number];
export const macroSourceOf = (key: string | null): MacroSource | null => MACRO_SOURCES.find((m) => m === key) ?? null;

/** "1.200 g", "2,5 chén đầy": the number and the rest of a portion label. Null without a leading number. */
const AMOUNT_TEXT = /^(\d[\d.]*(?:,\d+)?)\s+(\S.*)$/;

function splitAmount(label: string): { n: number; unit: string } | null {
  const m = AMOUNT_TEXT.exec(label.trim());
  if (!m) return null;
  const n = Number((/^\d{1,3}(?:\.\d{3})+(?:,\d+)?$/.test(m[1]) ? m[1].replace(/\./g, "") : m[1]).replace(",", "."));
  return Number.isFinite(n) ? { n, unit: m[2] } : null;
}

/** What makes two portions of one food the same kind: raw or cooked, an egg size, and the unit Hôm nay shows ("g", "ml", "quả"). */
function formOf(unit: string, qty: string): string {
  const p = parsePortionLabel(qty);
  return `${p ? (p.kind === "egg" ? `egg ${p.size ?? ""}` : `g ${p.state ?? ""}`) : ""}|${unit}`;
}

/**
 * One row per food and portion form: the same food logged at two meals ("Thịt bò nạc" 100 g twice) is "200 g · 2 lần".
 * A quick entry has no food id, so it merges by name. A portion with no number in it stays a row of its own.
 */
function mergeRepeats(sources: NutrientSource[]): NutrientSource[] {
  const groups = new Map<string, { unit: string; rows: { row: NutrientSource; n: number }[] }>();
  const merged: NutrientSource[] = [];
  for (const row of sources) {
    const parts = splitAmount(portionLabel(row));
    if (!parts) {
      merged.push(row);
      continue;
    }
    const key = `${row.foodId || `name:${row.name}`}|${formOf(parts.unit, row.qty)}`;
    const group = groups.get(key) ?? { unit: parts.unit, rows: [] };
    group.rows.push({ row, n: parts.n });
    groups.set(key, group);
  }
  for (const { unit, rows } of groups.values()) {
    const [{ row: first }] = rows;
    if (rows.length === 1) {
      merged.push(first);
      continue;
    }
    const total = rows.reduce((sum, r) => sum + r.n, 0);
    merged.push({
      ...first,
      qty: `${unit === "g" ? formatAmount(total, "g") : formatNumber(total)} ${unit} · ${rows.length} lần`,
      amount: rows.reduce((sum, r) => sum + r.row.amount, 0),
      grams: rows.every((r) => r.row.grams !== null) ? rows.reduce((sum, r) => sum + (r.row.grams ?? 0), 0) : null,
    });
  }
  return merged;
}

/** The unrounded amounts of the rows, added: what the card's rows come to. */
export const sourcesSum = (sources: NutrientSource[]): number => sources.reduce((sum, s) => sum + s.amount, 0);

/**
 * Whether the rows come to the page's total. Both read the same entries, so they differ only by the total's own rounding: macros and
 * minerals are kept as whole numbers (half a unit), the rest to a hundredth; 0.05 of the unit is the slack on top.
 */
export function sourcesAgree(sources: NutrientSource[], total: number): boolean {
  return Math.abs(sourcesSum(sources) - total) <= 0.05 + (Number.isInteger(total) ? 0.5 : 0);
}

/**
 * The foods of today that add to one nutrient, largest first, one row per food and portion form. Deleted sample items, zero and
 * unknown amounts are left out. The sample items are read through their edits, the same as the day total.
 */
export function nutrientSourcesIn(
  added: AddedDiaryEntry[],
  sampleEdits: SampleEdits,
  key: string,
  sampleItems: SampleItemInfo[] = SAMPLE_ITEMS
): NutrientSource[] {
  const macro = macroSourceOf(key);
  const fromSamples = sampleItems.map((info) => {
    const effect = sampleEffect(info, sampleEdits[info.item.id]);
    return {
      id: info.item.id,
      name: info.item.name,
      qty: effect.qty,
      amount: effect.deleted ? null : effect.numbers?.nutrients[key] ?? (macro ? effect.numbers?.[macro] : undefined),
      foodId: info.food?.id ?? "",
      grams: sampleEdits[info.item.id]?.grams ?? info.grams,
    };
  });
  const fromAdded = added.map((entry) => ({
    id: entry.id,
    name: entry.foodName,
    qty: entry.displayQty,
    amount: entry.nutrients[key] ?? (macro ? entry[macro] : null),
    foodId: entry.kind === "quick" ? "" : entry.foodId,
    grams: entry.kind === "quick" ? null : entry.grams,
  }));

  return mergeRepeats(
    [...fromSamples, ...fromAdded].filter((s): s is NutrientSource => typeof s.amount === "number" && s.amount > 0)
  ).sort((a, b) => b.amount - a.amount);
}
