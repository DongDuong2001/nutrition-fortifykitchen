import { NUTRIENT_CATALOG, getNutrientDefinition, nutrientName, type NutrientDefinition } from "./nutrients";
import { parseNumberInput } from "./parse-number";
import { removeVietnameseTones } from "./search";

/**
 * The fields of Tạo món mới › Tự nhập: everything a nutrition label can state. Each field carries the key the API takes
 * (apps/api/internal/nutrition/service.go ValidNutrients) and that key's unit, from the catalogue. Pure.
 */
export interface LabelField {
  /** The input's id */
  id: string;
  /** The ValidNutrients key */
  key: string;
  label: string;
  unit: NutrientDefinition["unit"];
  /** A sub-row of the row above it (Chất xơ and Đường under Tinh bột, Bão hòa and Trans under Chất béo) */
  indent?: boolean;
  required?: boolean;
  group?: "vitamins" | "minerals";
}

const unitOf = (key: string) => getNutrientDefinition(key)!.unit;
const main = (id: string, key: string, label: string, extra: Partial<LabelField> = {}): LabelField => ({ id, key, label, unit: unitOf(key), ...extra });

/** The main block, in nutrition-label order. Vietnamese names for the macro rows, the catalogue's English name for Sodium. */
export const MAIN_FIELDS: readonly LabelField[] = [
  main("cf-kcal", "energy", "Năng lượng", { required: true }),
  main("cf-pro", "protein", "Đạm"),
  main("cf-carbs", "carbs", "Tinh bột"),
  main("cf-fiber", "fiber", "Chất xơ", { indent: true }),
  main("cf-sugars", "sugars", "Đường", { indent: true }),
  main("cf-fat", "fat", "Chất béo"),
  main("cf-satfat", "saturated_fat", "Bão hòa", { indent: true }),
  main("cf-trans", "trans_fat", "Trans", { indent: true }),
  main("cf-chol", "cholesterol", "Cholesterol"),
  main("cf-na", "sodium", nutrientName("sodium")),
];

/** Shown first in + Thêm vi chất khác: the ones most labels state. */
export const PINNED_EXTRA_KEYS = ["calcium", "iron", "potassium", "vitamin_d"] as const;

const mainKeys = new Set(MAIN_FIELDS.map((f) => f.key));
const pinnedRank = (key: string) => {
  const i = (PINNED_EXTRA_KEYS as readonly string[]).indexOf(key);
  return i === -1 ? PINNED_EXTRA_KEYS.length : i;
};

/** Every other tracked vitamin and mineral, the pinned four first, then the catalogue order (vitamins, then minerals). */
export const EXTRA_FIELDS: readonly LabelField[] = NUTRIENT_CATALOG.filter(
  (n) => (n.group === "vitamins" || n.group === "minerals") && !mainKeys.has(n.id)
)
  .map((n, order) => ({ n, order }))
  .sort((a, b) => pinnedRank(a.n.id) - pinnedRank(b.n.id) || a.order - b.order)
  .map(({ n }) => ({ id: `cf-${n.id}`, key: n.id, label: n.name, unit: n.unit, group: n.group as "vitamins" | "minerals" }));

const BY_KEY = new Map([...MAIN_FIELDS, ...EXTRA_FIELDS].map((f) => [f.key, f]));
const BY_ID = new Map([...MAIN_FIELDS, ...EXTRA_FIELDS].map((f) => [f.id, f]));

export const fieldForKey = (key: string): LabelField | undefined => BY_KEY.get(key);

/** What the sheet lists: the extra fields not added yet whose English or Vietnamese name holds the query (marks ignored). */
export function extraFieldsFor({ added, query }: { added: readonly string[]; query: string }): LabelField[] {
  const q = removeVietnameseTones(query);
  return EXTRA_FIELDS.filter((f) => {
    if (added.includes(f.key)) return false;
    if (!q) return true;
    const def = getNutrientDefinition(f.key)!;
    return [def.nameEn, def.nameVi].some((name) => removeVietnameseTones(name).includes(q));
  });
}

export interface CustomFoodValues {
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  micros: Record<string, number>;
}

const TOP_LEVEL: Record<string, keyof Omit<CustomFoodValues, "micros">> = { energy: "calories", protein: "protein", carbs: "carbs", fat: "fat" };

/**
 * The typed values (input id → text) as createFood takes them: kcal and the three macros as before, every other value in
 * `micros` under its ValidNutrients key. Per serving, as typed: the API turns them into per 100 g. Blank or unreadable is
 * left out (no data), never 0.
 */
export function customFoodPayload(values: Readonly<Record<string, string>>): CustomFoodValues {
  const out: CustomFoodValues = { calories: null, protein: null, carbs: null, fat: null, micros: {} };
  for (const [id, text] of Object.entries(values)) {
    const field = BY_ID.get(id);
    const value = parseNumberInput(text);
    if (!field || value === null) continue;
    const top = TOP_LEVEL[field.key];
    if (top) out[top] = value;
    else out.micros[field.key] = value;
  }
  return out;
}
