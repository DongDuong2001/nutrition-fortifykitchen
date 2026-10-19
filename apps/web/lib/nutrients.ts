import { getLevel, type NutrientLevel } from "./levels";

export type NutrientGroup = "general" | "carbs" | "lipids" | "protein" | "vitamins" | "minerals";

export type TargetSource = "coach" | "coach-provisional" | "vn2016" | "none";

export type NutrientValueSource = "usda" | "cnf" | "vn-fct" | "custom";

export interface FoodNutrientValue {
  value: number | null;
  source: NutrientValueSource;
  sourceId?: string;
}

export interface NutrientDefinition {
  id: string;
  /** The name every screen shows: English for minerals and vitamins (Hao, 17/10), Vietnamese for the rest. */
  name: string;
  /** The Vietnamese name ("Canxi", "Sắt", "Vitamin B9"), kept for search. */
  nameVi: string;
  nameEn: string;
  unit: "kcal" | "g" | "mg" | "µg";
  group: NutrientGroup;
  depth: number;
  parentId?: string;
  targetSource: TargetSource;
}

const CATALOG: Omit<NutrientDefinition, "name">[] = [
  // 1. General (6)
  { id: "energy", nameVi: "Năng lượng", nameEn: "Energy", unit: "kcal", group: "general", depth: 0, targetSource: "coach" },
  { id: "water", nameVi: "Nước", nameEn: "Water", unit: "g", group: "general", depth: 0, targetSource: "none" },
  { id: "alcohol", nameVi: "Cồn", nameEn: "Alcohol", unit: "g", group: "general", depth: 0, targetSource: "none" },
  { id: "caffeine", nameVi: "Caffeine", nameEn: "Caffeine", unit: "mg", group: "general", depth: 0, targetSource: "none" },
  { id: "oxalate", nameVi: "Oxalat", nameEn: "Oxalate", unit: "mg", group: "general", depth: 0, targetSource: "none" },
  { id: "phytate", nameVi: "Phytat", nameEn: "Phytate", unit: "mg", group: "general", depth: 0, targetSource: "none" },

  // 2. Carbohydrates (8)
  { id: "carbs", nameVi: "Tinh bột", nameEn: "Carbs", unit: "g", group: "carbs", depth: 0, targetSource: "coach-provisional" },
  { id: "net_carbs", nameVi: "Tinh bột ròng", nameEn: "Net carbs", unit: "g", group: "carbs", depth: 1, parentId: "carbs", targetSource: "none" },
  { id: "fiber", nameVi: "Chất xơ", nameEn: "Fiber", unit: "g", group: "carbs", depth: 1, parentId: "carbs", targetSource: "coach-provisional" },
  { id: "insoluble_fiber", nameVi: "Xơ không tan", nameEn: "Insoluble fiber", unit: "g", group: "carbs", depth: 2, parentId: "fiber", targetSource: "none" },
  { id: "soluble_fiber", nameVi: "Xơ hòa tan", nameEn: "Soluble fiber", unit: "g", group: "carbs", depth: 2, parentId: "fiber", targetSource: "none" },
  { id: "starch", nameVi: "Tinh bột phức", nameEn: "Starch", unit: "g", group: "carbs", depth: 1, parentId: "carbs", targetSource: "none" },
  { id: "sugars", nameVi: "Đường", nameEn: "Sugars", unit: "g", group: "carbs", depth: 1, parentId: "carbs", targetSource: "none" },
  { id: "added_sugars", nameVi: "Đường bổ sung", nameEn: "Added sugars", unit: "g", group: "carbs", depth: 1, parentId: "carbs", targetSource: "none" },

  // 3. Lipids (11)
  { id: "fat", nameVi: "Chất béo", nameEn: "Fat", unit: "g", group: "lipids", depth: 0, targetSource: "coach" },
  { id: "monounsaturated_fat", nameVi: "Béo không bão hòa đơn", nameEn: "Monounsaturated", unit: "g", group: "lipids", depth: 1, parentId: "fat", targetSource: "none" },
  { id: "polyunsaturated_fat", nameVi: "Béo không bão hòa đa", nameEn: "Polyunsaturated", unit: "g", group: "lipids", depth: 1, parentId: "fat", targetSource: "none" },
  { id: "omega3", nameVi: "Omega-3", nameEn: "Omega-3", unit: "g", group: "lipids", depth: 2, parentId: "polyunsaturated_fat", targetSource: "none" },
  { id: "ala", nameVi: "ALA", nameEn: "ALA", unit: "g", group: "lipids", depth: 3, parentId: "omega3", targetSource: "none" },
  { id: "dha", nameVi: "DHA", nameEn: "DHA", unit: "g", group: "lipids", depth: 3, parentId: "omega3", targetSource: "none" },
  { id: "epa", nameVi: "EPA", nameEn: "EPA", unit: "g", group: "lipids", depth: 3, parentId: "omega3", targetSource: "none" },
  { id: "omega6", nameVi: "Omega-6", nameEn: "Omega-6", unit: "g", group: "lipids", depth: 2, parentId: "polyunsaturated_fat", targetSource: "none" },
  { id: "saturated_fat", nameVi: "Béo bão hòa", nameEn: "Saturated", unit: "g", group: "lipids", depth: 1, parentId: "fat", targetSource: "none" },
  { id: "trans_fat", nameVi: "Béo chuyển hóa", nameEn: "Trans fat", unit: "g", group: "lipids", depth: 1, parentId: "fat", targetSource: "none" },
  { id: "cholesterol", nameVi: "Cholesterol", nameEn: "Cholesterol", unit: "mg", group: "lipids", depth: 0, targetSource: "none" },

  // 4. Protein (12)
  { id: "protein", nameVi: "Đạm", nameEn: "Protein", unit: "g", group: "protein", depth: 0, targetSource: "coach" },
  { id: "cystine", nameVi: "Cystine", nameEn: "Cystine", unit: "g", group: "protein", depth: 1, parentId: "protein", targetSource: "none" },
  { id: "histidine", nameVi: "Histidine", nameEn: "Histidine", unit: "g", group: "protein", depth: 1, parentId: "protein", targetSource: "none" },
  { id: "isoleucine", nameVi: "Isoleucine", nameEn: "Isoleucine", unit: "g", group: "protein", depth: 1, parentId: "protein", targetSource: "none" },
  { id: "leucine", nameVi: "Leucine", nameEn: "Leucine", unit: "g", group: "protein", depth: 1, parentId: "protein", targetSource: "none" },
  { id: "lysine", nameVi: "Lysine", nameEn: "Lysine", unit: "g", group: "protein", depth: 1, parentId: "protein", targetSource: "none" },
  { id: "methionine", nameVi: "Methionine", nameEn: "Methionine", unit: "g", group: "protein", depth: 1, parentId: "protein", targetSource: "none" },
  { id: "phenylalanine", nameVi: "Phenylalanine", nameEn: "Phenylalanine", unit: "g", group: "protein", depth: 1, parentId: "protein", targetSource: "none" },
  { id: "threonine", nameVi: "Threonine", nameEn: "Threonine", unit: "g", group: "protein", depth: 1, parentId: "protein", targetSource: "none" },
  { id: "tryptophan", nameVi: "Tryptophan", nameEn: "Tryptophan", unit: "g", group: "protein", depth: 1, parentId: "protein", targetSource: "none" },
  { id: "tyrosine", nameVi: "Tyrosine", nameEn: "Tyrosine", unit: "g", group: "protein", depth: 1, parentId: "protein", targetSource: "none" },
  { id: "valine", nameVi: "Valine", nameEn: "Valine", unit: "g", group: "protein", depth: 1, parentId: "protein", targetSource: "none" },

  // 5. Vitamin (12)
  { id: "b1", nameVi: "Vitamin B1", nameEn: "Vitamin B1", unit: "mg", group: "vitamins", depth: 0, targetSource: "vn2016" },
  { id: "b2", nameVi: "Vitamin B2", nameEn: "Vitamin B2", unit: "mg", group: "vitamins", depth: 0, targetSource: "vn2016" },
  { id: "b3", nameVi: "Vitamin B3", nameEn: "Vitamin B3", unit: "mg", group: "vitamins", depth: 0, targetSource: "vn2016" },
  { id: "b5", nameVi: "Vitamin B5", nameEn: "Vitamin B5", unit: "mg", group: "vitamins", depth: 0, targetSource: "vn2016" },
  { id: "b6", nameVi: "Vitamin B6", nameEn: "Vitamin B6", unit: "mg", group: "vitamins", depth: 0, targetSource: "vn2016" },
  { id: "folate", nameVi: "Vitamin B9", nameEn: "Folate", unit: "µg", group: "vitamins", depth: 0, targetSource: "vn2016" },
  { id: "b12", nameVi: "Vitamin B12", nameEn: "Vitamin B12", unit: "µg", group: "vitamins", depth: 0, targetSource: "vn2016" },
  { id: "vitamin_a", nameVi: "Vitamin A", nameEn: "Vitamin A", unit: "µg", group: "vitamins", depth: 0, targetSource: "vn2016" },
  { id: "vitamin_c", nameVi: "Vitamin C", nameEn: "Vitamin C", unit: "mg", group: "vitamins", depth: 0, targetSource: "vn2016" },
  { id: "vitamin_d", nameVi: "Vitamin D", nameEn: "Vitamin D", unit: "µg", group: "vitamins", depth: 0, targetSource: "vn2016" },
  { id: "vitamin_e", nameVi: "Vitamin E", nameEn: "Vitamin E", unit: "mg", group: "vitamins", depth: 0, targetSource: "vn2016" },
  { id: "vitamin_k", nameVi: "Vitamin K", nameEn: "Vitamin K", unit: "µg", group: "vitamins", depth: 0, targetSource: "vn2016" },

  // 6. Minerals (10)
  { id: "calcium", nameVi: "Canxi", nameEn: "Calcium", unit: "mg", group: "minerals", depth: 0, targetSource: "vn2016" },
  { id: "copper", nameVi: "Đồng", nameEn: "Copper", unit: "mg", group: "minerals", depth: 0, targetSource: "vn2016" },
  { id: "iron", nameVi: "Sắt", nameEn: "Iron", unit: "mg", group: "minerals", depth: 0, targetSource: "vn2016" },
  { id: "magnesium", nameVi: "Magie", nameEn: "Magnesium", unit: "mg", group: "minerals", depth: 0, targetSource: "vn2016" },
  { id: "manganese", nameVi: "Mangan", nameEn: "Manganese", unit: "mg", group: "minerals", depth: 0, targetSource: "vn2016" },
  { id: "phosphorus", nameVi: "Phốt pho", nameEn: "Phosphorus", unit: "mg", group: "minerals", depth: 0, targetSource: "vn2016" },
  { id: "potassium", nameVi: "Kali", nameEn: "Potassium", unit: "mg", group: "minerals", depth: 0, targetSource: "vn2016" },
  { id: "selenium", nameVi: "Selen", nameEn: "Selenium", unit: "µg", group: "minerals", depth: 0, targetSource: "vn2016" },
  { id: "sodium", nameVi: "Natri", nameEn: "Sodium", unit: "mg", group: "minerals", depth: 0, targetSource: "coach" },
  { id: "zinc", nameVi: "Kẽm", nameEn: "Zinc", unit: "mg", group: "minerals", depth: 0, targetSource: "vn2016" },
];

/** Minerals and vitamins show their English name, everything else its Vietnamese name. */
export const NUTRIENT_CATALOG: NutrientDefinition[] = CATALOG.map((n) => ({
  ...n,
  name: n.group === "minerals" || n.group === "vitamins" ? n.nameEn : n.nameVi,
}));

const CATALOG_BY_ID = new Map<string, NutrientDefinition>(
  NUTRIENT_CATALOG.map((n) => [n.id, n])
);

export function getNutrientDefinition(id: string): NutrientDefinition | undefined {
  return CATALOG_BY_ID.get(id);
}

/** The name a screen shows for a catalogue id (English for minerals and vitamins); the id when it is not in the catalogue. */
export function nutrientName(id: string): string {
  return CATALOG_BY_ID.get(id)?.name ?? id;
}

/**
 * Calculates percentage of target achieved.
 * Missing / unknown value (null) is excluded (returns null).
 */
export function calculateNutrientPercentage(
  consumed: number | null,
  targetMin: number | null
): number | null {
  if (consumed === null || targetMin === null || !Number.isFinite(consumed) || !Number.isFinite(targetMin) || targetMin <= 0) {
    return null;
  }
  return Math.round((consumed / targetMin) * 100);
}

/**
 * Calculates nutrient level: null when percentage is null.
 */
export function calculateNutrientLevel(pct: number | null): NutrientLevel | null {
  if (pct === null) return null;
  return getLevel(pct);
}

export interface NutrientItemForCount {
  id?: string;
  consumed: number | null;
  targetMin: number | null;
  targetSource?: TargetSource;
}

/**
 * Counts "đạt" (reached >= 100%) nutrients.
 * Only nutrients with an active target (targetSource !== 'none' and targetMin > 0) are counted.
 * Unknown / null consumed values are excluded from reaching target.
 */
export function countAchievedNutrients(items: NutrientItemForCount[]): {
  achieved: number;
  totalWithTarget: number;
} {
  let achieved = 0;
  let totalWithTarget = 0;

  for (const item of items) {
    // If targetSource is explicitly 'none', or targetMin is null/<=0, this nutrient has no target.
    if (item.targetSource === "none" || item.targetMin === null || item.targetMin <= 0) {
      continue;
    }

    totalWithTarget++;

    if (item.consumed !== null) {
      const pct = (item.consumed / item.targetMin) * 100;
      if (pct >= 100) {
        achieved++;
      }
    }
  }

  return { achieved, totalWithTarget };
}
