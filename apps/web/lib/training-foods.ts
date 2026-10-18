import type { FoodItem } from "./mock/foods";

/**
 * cc-52: the catalogue foods behind the coach's Ngày tập items. A food is found by its exact name (and brand where the
 * coach names one), never by a look-alike; one missing from the catalogue leaves its item tick-only (OPEN_QUESTIONS).
 */
export type CoachFoodKey = "cha-la" | "cu-den" | "muoi" | "redbull" | "mat-mia";

const COACH_FOODS: Record<CoachFoodKey, { name: string; brand?: string; label: string }> = {
  "cha-la": { name: "Chà là", label: "Chà là" },
  "cu-den": { name: "Bột củ dền", brand: "Dalahouse", label: "Bột củ dền Dalahouse" },
  muoi: { name: "Muối ăn", label: "Muối ăn" },
  redbull: { name: "Redbull", label: "Redbull" },
  "mat-mia": { name: "Mật mía", brand: "Golden Barrel", label: "Mật mía Golden Barrel" },
};

/** What a checklist item can log: one food, or a mix the user picks in the sheet (Tinh bột nhanh). */
const CHOICES: Record<string, { label: string; foods: CoachFoodKey[] }> = {
  "cha-la": { label: "Chà là", foods: ["cha-la"] },
  "cu-den": { label: "Bột củ dền Dalahouse", foods: ["cu-den"] },
  muoi: { label: "Muối ăn", foods: ["muoi"] },
  redbull: { label: "Redbull", foods: ["redbull"] },
  // Two foods in one dose: the split between them is not in the coach's rules yet (OPEN_QUESTIONS), so it logs nothing
  "redbull-mat-mia": { label: "Redbull + mật mía", foods: ["redbull", "mat-mia"] },
  "mat-mia": { label: "Mật mía Golden Barrel", foods: ["mat-mia"] },
};

const norm = (s: string | undefined) => (s ?? "").normalize("NFC").toLocaleLowerCase("vi").replace(/\s+/g, "");

/** The catalogue food for a coach food, or null when the catalogue has none. */
export function findCoachFood(key: CoachFoodKey, foods: readonly FoodItem[]): FoodItem | null {
  const ref = COACH_FOODS[key];
  return foods.find((f) => norm(f.nameVi) === norm(ref.name) && (!ref.brand || norm(f.brand) === norm(ref.brand))) ?? null;
}

export interface ResolvedChoice {
  key: string;
  label: string;
  /** The one food this choice logs; null when a food is missing or the choice mixes two */
  food: FoodItem | null;
  /** Coach foods the catalogue does not have */
  missing: string[];
}

export function resolveChoices(keys: readonly string[], foods: readonly FoodItem[]): ResolvedChoice[] {
  return keys.flatMap((key) => {
    const choice = CHOICES[key];
    if (!choice) return [];
    const found = choice.foods.map((k) => findCoachFood(k, foods));
    const missing = choice.foods.filter((_, i) => !found[i]).map((k) => COACH_FOODS[k].label);
    return [{ key, label: choice.label, food: found.length === 1 ? found[0] : null, missing }];
  });
}
