import type { FoodItem, FoodServing } from "./mock/foods";
import { isUnitServingLabel } from "./portion";

/**
 * cc-52: the catalogue foods behind the coach's Ngày tập items. A live food is found by its (source, source_id), the
 * row food-research imported; the demo catalogue has no such ids, so the exact name (and brand where the coach names
 * one) is the fallback. Never a look-alike: a coach food found in neither form leaves its item tick-only.
 */
export type CoachFoodKey = "cha-la" | "cu-den" | "muoi" | "redbull" | "mat-mia";

interface CoachFood {
  source: string;
  sourceId: string;
  /** Exact names for the fallback, with the brand where it must match */
  names: { name: string; brand?: string }[];
  label: string;
}

const COACH_FOODS: Record<CoachFoodKey, CoachFood> = {
  "cha-la": { source: "usda_foundation", sourceId: "food-cha-la", names: [{ name: "Chà là" }], label: "Chà là" },
  "cu-den": {
    source: "usda_foundation",
    sourceId: "food-bot-cu-den",
    names: [{ name: "Bột củ dền", brand: "Dalahouse" }],
    label: "Bột củ dền Dalahouse",
  },
  muoi: { source: "usda_sr_legacy", sourceId: "FDC 173468", names: [{ name: "Muối ăn" }], label: "Muối ăn" },
  redbull: {
    source: "label",
    sourceId: "Red Bull S.r.l. 25 cl can label (Italy)",
    // The demo catalogue's row (cc-53) is plain "Red Bull"
    names: [{ name: "Red Bull (nước tăng lực)" }, { name: "Red Bull", brand: "Red Bull" }],
    label: "Red Bull",
  },
  "mat-mia": {
    source: "label",
    sourceId: "Golden Barrel Blackstrap Molasses (label panel image not retrievable)",
    names: [{ name: "Mật mía Golden Barrel (blackstrap)" }, { name: "Mật mía", brand: "Golden Barrel" }],
    label: "Mật mía Golden Barrel",
  },
};

/** What a checklist item can log: one food, or the mix the user picks in the sheet (Tinh bột nhanh). */
const CHOICES: Record<string, { label: string; short: string; foods: CoachFoodKey[] }> = {
  "cha-la": { label: "Chà là", short: "chà là", foods: ["cha-la"] },
  "cu-den": { label: "Bột củ dền Dalahouse", short: "bột củ dền", foods: ["cu-den"] },
  muoi: { label: "Muối ăn", short: "muối", foods: ["muoi"] },
  redbull: { label: "Red Bull", short: "Red Bull", foods: ["redbull"] },
  "redbull-mat-mia": { label: "Red Bull + mật mía", short: "Red Bull + mật mía", foods: ["redbull", "mat-mia"] },
  "mat-mia": { label: "Mật mía Golden Barrel", short: "mật mía", foods: ["mat-mia"] },
};

const norm = (s: string | undefined) => (s ?? "").normalize("NFC").toLocaleLowerCase("vi").replace(/\s+/g, "");

/** The catalogue food for a coach food, or null when the catalogue has none. */
export function findCoachFood(key: CoachFoodKey, foods: readonly FoodItem[]): FoodItem | null {
  const ref = COACH_FOODS[key];
  const bySource = foods.find((f) => f.source === ref.source && f.sourceId === ref.sourceId);
  if (bySource) return bySource;
  for (const n of ref.names) {
    const byName = foods.find((f) => norm(f.nameVi) === norm(n.name) && (!n.brand || norm(f.brand) === norm(n.brand)));
    if (byName) return byName;
  }
  return null;
}

export interface ResolvedChoice {
  key: string;
  label: string;
  /** The name inside a sentence ("≈ 40 g mật mía") */
  short: string;
  /** The foods this choice logs, in order (Red Bull before mật mía); empty when one is missing */
  foods: FoodItem[];
  /** Coach foods the catalogue does not have */
  missing: string[];
}

export function resolveChoices(keys: readonly string[], foods: readonly FoodItem[]): ResolvedChoice[] {
  return keys.flatMap((key) => {
    const choice = CHOICES[key];
    if (!choice) return [];
    const found = choice.foods.map((k) => findCoachFood(k, foods));
    const missing = choice.foods.filter((_, i) => !found[i]).map((k) => COACH_FOODS[k].label);
    return [{ key, label: choice.label, short: choice.short, foods: missing.length > 0 ? [] : (found as FoodItem[]), missing }];
  });
}

// ---- Tinh bột nhanh: the coach's 30–45 g are grams of carbs (Hao 18/10); the food amount comes from its carbs

/** Red Bull is logged by the can, in half cans. */
export const LON_STEP = 0.5;

/** Grams of carbs in an amount of a food (0 when the food has no carb figure). */
export const carbsIn = (food: FoodItem, grams: number): number => ((food.nutrients.carbs ?? 0) * grams) / 100;

/** The grams of a food that hold this many grams of carbs, to the gram; null when the food has no carb figure. */
export function gramsForCarbs(food: FoodItem, carbs: number): number | null {
  const per100 = food.nutrients.carbs ?? 0;
  return per100 > 0 ? Math.round((carbs / per100) * 100) : null;
}

/** The food's unit portion ("1 lon (250 ml)"), when it has one. */
export const unitServing = (food: FoodItem): FoodServing | null => food.servings.find((s) => isUnitServingLabel(s.label)) ?? null;

/** Cans of Red Bull for this many grams of carbs, in half cans, at least half a can. */
export function lonsForCarbs(food: FoodItem, carbs: number): number {
  const can = unitServing(food);
  const perCan = can ? carbsIn(food, can.grams) : 0;
  if (perCan <= 0) return 1;
  return Math.max(LON_STEP, Math.round(carbs / perCan / LON_STEP) * LON_STEP);
}

/** The mix: 1 can of Red Bull, and mật mía tops up to the target (none when the can already reaches it). */
export function mixPrefill(redBull: FoodItem, matMia: FoodItem, carbs: number): { lons: number; grams: number } {
  const can = unitServing(redBull);
  const rest = carbs - (can ? carbsIn(redBull, can.grams) : 0);
  return { lons: 1, grams: rest > 0 ? gramsForCarbs(matMia, rest) ?? 0 : 0 };
}
