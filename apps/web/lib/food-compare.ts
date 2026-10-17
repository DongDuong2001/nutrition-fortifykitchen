import { COUNTED_NUTRIENT_KEYS } from "./day-totals";
import { formatAmount } from "./format";
import type { FoodItem } from "./mock/foods";
import { getNutrientDefinition } from "./nutrients";

/** Compare foods (/foods/compare?ids=a,b,c): pure helpers, no React. Data is read-only from the food catalogue. */
export const MAX_COMPARE_FOODS = 3;
export const MIN_COMPARE_FOODS = 2;

/** "per100": every food per 100 g. "serving": every food in its own default (first) serving. */
export type CompareBasis = "per100" | "serving";

/** The ids of a ?ids= value: trimmed, deduped (first place wins), unknown ids skipped, at most 3 valid ones. */
export function parseCompareIds(raw: string | null | undefined, isKnown: (id: string) => boolean): string[] {
  if (!raw) return [];
  const ids: string[] = [];
  for (const part of raw.split(",")) {
    const id = part.trim();
    if (!id || ids.includes(id) || !isKnown(id)) continue;
    ids.push(id);
    if (ids.length === MAX_COMPARE_FOODS) break;
  }
  return ids;
}

/** The compare route for these ids (the first 3), or the bare route when there are none. */
export function compareHref(ids: readonly string[]): string {
  const list = ids.slice(0, MAX_COMPARE_FOODS);
  return list.length > 0 ? `/foods/compare?ids=${list.join(",")}` : "/foods/compare";
}

/** The amount a basis reads for one food, and the label shown under its name (null on the per 100 g basis). */
export function basisPortion(food: FoodItem, basis: CompareBasis): { grams: number; label: string | null } {
  if (basis === "per100") return { grams: 100, label: null };
  const serving = food.servings[0];
  if (!serving) return { grams: 100, label: "100 g" };
  // The same wording as the serving chips on the food page: "1 chén · 40 g", or just "30 g"
  const grams = formatAmount(serving.grams, "g");
  return { grams: serving.grams, label: serving.label === `${grams} g` ? serving.label : `${serving.label} · ${grams} g` };
}

/**
 * Which cells in a row carry the highest known value. Unknown (null) cells never count. Nothing is marked when
 * fewer than two values are known, or when the highest is shared (judged on the number as shown, so 2,04 and 2,0
 * g are a tie).
 */
export function markHighest(values: readonly (number | null)[], unit: string): boolean[] {
  const known = values.filter((v): v is number => v !== null);
  const none = values.map(() => false);
  if (known.length < 2) return none;
  const top = Math.max(...known);
  const shown = formatAmount(top, unit);
  const sharing = known.filter((v) => formatAmount(v, unit) === shown).length;
  if (sharing > 1) return none;
  return values.map((v) => v === top);
}

export interface CompareColumn {
  id: string;
  name: string;
  grams: number;
  /** Under the name on the serving basis: "30 g" or "1 chén · 40 g". Null on the 100 g basis. */
  portion: string | null;
}

export interface CompareRow {
  id: string;
  name: string;
  unit: string;
  /** One per column: the amount for the basis, or null (no data for this food, never 0). */
  values: (number | null)[];
  /** One per column: the cell that holds the highest known value. */
  highest: boolean[];
}

export interface CompareSection {
  key: "macros" | "vitamins" | "minerals";
  title: string;
  /** Only the rows where at least one column has a value. */
  rows: CompareRow[];
  /** Names of the nutrients no column has data for, in catalogue order: "Chưa có dữ liệu: …" under the group. */
  missing: string[];
}

/** Kcal, đạm, chất béo, tinh bột, chất xơ: the order of the rows on top. */
const MACRO_KEYS = ["energy", "protein", "fat", "carbs", "fiber"] as const;

function rowFor(id: string, foods: readonly FoodItem[], grams: readonly number[]): CompareRow {
  const def = getNutrientDefinition(id);
  const unit = def?.unit ?? "g";
  const values = foods.map((food, i) => {
    const per100 = food.nutrients[id];
    return per100 === null || per100 === undefined ? null : (per100 * grams[i]) / 100;
  });
  return { id, name: def?.name ?? id, unit, values, highest: markHighest(values, unit) };
}

/** Rows where every column is unknown are not drawn; their names go to `missing`. */
function sectionOf(key: CompareSection["key"], title: string, rows: CompareRow[]): CompareSection {
  const known = rows.filter((r) => r.values.some((v) => v !== null));
  const missing = rows.filter((r) => r.values.every((v) => v === null)).map((r) => r.name);
  return { key, title, rows: known, missing };
}

/** The columns and the rows to show: macros, then the 22 counted micros as on Vi chất (Vitamin, Khoáng chất). */
export function buildCompare(
  foods: readonly FoodItem[],
  basis: CompareBasis
): { columns: CompareColumn[]; sections: CompareSection[] } {
  const portions = foods.map((f) => basisPortion(f, basis));
  const grams = portions.map((p) => p.grams);
  const columns: CompareColumn[] = foods.map((f, i) => ({
    id: f.id,
    name: f.nameVi,
    grams: grams[i],
    portion: portions[i].label,
  }));
  const microsOf = (group: "vitamins" | "minerals") =>
    COUNTED_NUTRIENT_KEYS.filter((id) => getNutrientDefinition(id)?.group === group).map((id) => rowFor(id, foods, grams));
  return {
    columns,
    sections: [
      sectionOf("macros", "Năng lượng và đa lượng", MACRO_KEYS.map((id) => rowFor(id, foods, grams))),
      sectionOf("vitamins", "Vitamin", microsOf("vitamins")),
      sectionOf("minerals", "Khoáng chất", microsOf("minerals")),
    ],
  };
}
