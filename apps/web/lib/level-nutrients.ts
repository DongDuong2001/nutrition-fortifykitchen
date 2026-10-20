import type { Level } from "./coaching-link";
import type { HomeEntry } from "./home";
import { getNutrientDefinition } from "./nutrients";

/**
 * What Hôm nay's nutrient column and the share image show at each Level (cc-28b). The coach decides the Level
 * (lib/coaching-link); this file only maps it to catalogue ids. Macros (kcal, Tinh bột, Đạm, Chất béo, Chất xơ)
 * are the same at every Level and sit in the hero card, so the lists below are the column's: Khoáng chất, Vitamin
 * and, from Level 3, the extras (amount only: no bar, no percent, no colour, never counted).
 * /micros, Tổng quan and /foods/compare always keep all 22.
 */
export interface ColumnGroup {
  title: string;
  ids: string[];
}

export interface LevelNutrients {
  level: Level;
  /** Amount only, under "Chi tiết béo & xơ". Empty below Level 3. */
  extras: string[];
  minerals: string[];
  vitamins: string[];
}

// Ids of the catalogue (lib/nutrients.ts). Selen = selenium, Phốt pho = phosphorus, Đồng = copper, B9 = folate.
const MINERALS_BASIC = ["sodium", "potassium", "calcium", "magnesium", "iron", "zinc"];
const MINERALS_L2 = [...MINERALS_BASIC, "selenium"];
const MINERALS_L3 = ["sodium", "potassium", "calcium", "magnesium", "phosphorus", "iron", "zinc", "copper", "selenium"];
const MINERALS_ALL = ["sodium", "potassium", "calcium", "magnesium", "phosphorus", "iron", "zinc", "copper", "manganese", "selenium"];

const VITAMINS_BASIC = ["vitamin_a", "vitamin_c"];
const VITAMINS_L2 = ["vitamin_a", "vitamin_d", "vitamin_e", "vitamin_k", "b6", "folate", "b12"];
const VITAMINS_L3 = ["vitamin_a", "vitamin_d", "vitamin_e", "vitamin_k", "b1", "b3", "b6", "folate", "b12"];
const VITAMINS_ALL = ["vitamin_a", "vitamin_c", "vitamin_d", "vitamin_e", "vitamin_k", "b1", "b2", "b3", "b5", "b6", "folate", "b12"];

/** MUFA, PUFA, Omega-3, Omega-6 (under Chất béo), then soluble and insoluble fibre (under Chất xơ). */
export const EXTRA_NUTRIENT_IDS = [
  "monounsaturated_fat",
  "polyunsaturated_fat",
  "omega3",
  "omega6",
  "soluble_fiber",
  "insoluble_fiber",
];

export function nutrientsForLevel(level: Level): LevelNutrients {
  if (level <= 1) return { level, extras: [], minerals: MINERALS_BASIC, vitamins: VITAMINS_BASIC };
  if (level === 2) return { level, extras: [], minerals: MINERALS_L2, vitamins: VITAMINS_L2 };
  if (level === 3) return { level, extras: EXTRA_NUTRIENT_IDS, minerals: MINERALS_L3, vitamins: VITAMINS_L3 };
  return { level, extras: EXTRA_NUTRIENT_IDS, minerals: MINERALS_ALL, vitamins: VITAMINS_ALL };
}

/** The ids counted for "x/N đạt" and "Thiếu nhiều nhất": the level's minerals and vitamins, never the extras. */
export function countedForLevel(level: Level): string[] {
  const n = nutrientsForLevel(level);
  return [...n.minerals, ...n.vitamins];
}

/** The groups of the column in order: the extras band first (Level 3 and up), then Khoáng chất, then Vitamin. */
export function columnGroups(level: Level): ColumnGroup[] {
  const n = nutrientsForLevel(level);
  const groups: ColumnGroup[] = [];
  if (n.extras.length > 0) groups.push({ title: "Chi tiết béo & xơ", ids: n.extras });
  groups.push({ title: "Khoáng chất", ids: n.minerals }, { title: "Vitamin", ids: n.vitamins });
  return groups;
}

/** Whether a catalogue id is an extra (amount only). */
export function isExtra(id: string): boolean {
  return EXTRA_NUTRIENT_IDS.includes(id);
}

/**
 * "x/N đạt" and up to two of the level's own micros under their target (below 100 %), lowest first; empty when all
 * are reached. An unknown value is not ranked, never read as 0.
 */
export function levelSummary(
  values: Record<string, number | null | undefined>,
  targets: Record<string, number | null | undefined>,
  ids: readonly string[]
): { reached: number; total: number; lacking: string[] } {
  const known = ids.flatMap((id) => {
    const value = values[id];
    const target = targets[id];
    if (typeof value !== "number" || typeof target !== "number" || target <= 0) return [];
    return [{ id, ratio: value / target }];
  });
  const reached = known.filter((k) => Math.round(k.ratio * 100) >= 100).length;
  const lacking = known
    .filter((k) => Math.round(k.ratio * 100) < 100)
    .sort((a, b) => a.ratio - b.ratio)
    .slice(0, 2)
    .map((k) => getNutrientDefinition(k.id)?.name ?? k.id);
  return { reached, total: ids.length, lacking };
}

/** The names a Level adds over another (what "thêm …" says), in the column's order; extras count as one line. */
export function addedNames(from: Level, to: Level): string[] {
  const a = nutrientsForLevel(from);
  const b = nutrientsForLevel(to);
  const name = (id: string) => getNutrientDefinition(id)?.name ?? id;
  const added = [...b.minerals.filter((id) => !a.minerals.includes(id)), ...b.vitamins.filter((id) => !a.vitamins.includes(id))].map(name);
  if (a.extras.length === 0 && b.extras.length > 0) added.push("chi tiết béo và xơ");
  return added;
}

/**
 * The extras of a set of entries: the sum of the amounts, or unknown (null, shown "—") when ANY entry lacks the
 * value or there is no entry. One unknown makes the day unknown, as in a recipe: a partial sum would read as a
 * complete one, and an unknown is never 0.
 */
export function sumExtras(entries: readonly Pick<HomeEntry, "nutrients">[]): Record<string, number | null> {
  const out: Record<string, number | null> = {};
  for (const id of EXTRA_NUTRIENT_IDS) {
    const values = entries.map((e) => e.nutrients[id]);
    const complete = values.length > 0 && values.every((v): v is number => typeof v === "number");
    out[id] = complete ? Math.round(values.reduce((a, b) => a + b, 0) * 100) / 100 : null;
  }
  return out;
}
