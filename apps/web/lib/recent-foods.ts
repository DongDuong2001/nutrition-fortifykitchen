import type { FoodItem } from "./catalog";
import { MAX_UNIT_COUNT, unitPortionText, parseUnitAmount, parseUnitServing } from "./portion";

/** A recently logged food, with the serving it was logged with. */
export interface RecentFood {
  foodId: string;
  servingLabel: string;
}

export interface ResolvedRecent {
  food: FoodItem;
  grams: number;
  label: string;
}

export const DEFAULT_RECENT_FOODS: RecentFood[] = [
  { foodId: "food-yen-mach", servingLabel: "60 g" },
  { foodId: "food-yogurt-kefir", servingLabel: "200 ml" },
  { foodId: "food-chuoi", servingLabel: "100 g" },
];

/** Guards values read back from sessionStorage. */
export function isRecentFood(value: unknown): value is RecentFood {
  if (typeof value !== "object" || value === null) return false;
  const r = value as Record<string, unknown>;
  return typeof r.foodId === "string" && typeof r.servingLabel === "string";
}

const MAX_RECENTS = 8;
const GRAMS_LABEL = /^(\d+(?:[.,]\d+)?)\s*g$/;

/**
 * Turns a saved recent back into a food and an amount. Returns null if the food no longer exists.
 * A serving label the food does not list is read as grams ("45 g"), or else falls back to its first serving.
 */
export function resolveRecent(recent: RecentFood, foods: FoodItem[]): ResolvedRecent | null {
  const food = foods.find((f) => f.id === recent.foodId);
  if (!food) return null;

  const serving = food.servings.find((s) => s.label === recent.servingLabel);
  if (serving) return { food, grams: serving.grams, label: serving.label };

  // Parse arbitrary unit amounts, e.g. "2 trái vừa", "1,5 chén đầy", "3 cuốn"
  const parsedAmt = parseUnitAmount(recent.servingLabel.trim());
  if (parsedAmt) {
    const isUnit = (unit: string) =>
      unit === parsedAmt.unit || ((parsedAmt.unit === "quả" || parsedAmt.unit === "trái") && (unit === "quả" || unit === "trái"));
    const s =
      food.servings.find((item) => {
        const p = parseUnitServing(item.label);
        if (!p || !isUnit(p.unit)) return false;
        return parsedAmt.size ? p.size === parsedAmt.size : (p.size === "vừa" || !p.size);
      }) ??
      food.servings.find((item) => {
        const p = parseUnitServing(item.label);
        return p && isUnit(p.unit);
      });
    if (s) {
      return { food, grams: Math.round(s.grams * parsedAmt.amount * 10) / 10, label: recent.servingLabel.trim() };
    }
  }

  // A count of a unit portion ("2 viên" = 2 × "1 viên", a supplement's stepper): that many of the serving
  for (const s of food.servings) {
    for (let n = 2; n <= MAX_UNIT_COUNT; n++) {
      if (unitPortionText(s.label, n) === recent.servingLabel.trim()) return { food, grams: s.grams * n, label: recent.servingLabel.trim() };
    }
  }

  const match = GRAMS_LABEL.exec(recent.servingLabel.trim());
  if (match) {
    const grams = Number(match[1].replace(",", "."));
    return { food, grams, label: `${grams} g` };
  }

  const first = food.servings[0] ?? { label: "100 g", grams: 100 };
  return { food, grams: first.grams, label: first.label };
}

/**
 * The portion a food was last logged with, from the recents (newest first). Null when the food has no history
 * (or no longer exists): the caller then opens the portion panel instead of adding. `foodId` can be every row id of a
 * food whose raw and cooked rows share a list row (lib/food-twins twinIdsOf): the newest of them wins, so the food
 * opens in the state it was last logged in.
 */
export function lastPortionOf(foodId: string | readonly string[], recents: RecentFood[], foods: FoodItem[]): ResolvedRecent | null {
  const ids = typeof foodId === "string" ? [foodId] : foodId;
  const last = recents.find((r) => ids.includes(r.foodId));
  return last ? resolveRecent(last, foods) : null;
}

/** Newest first. The same food and serving appears once. At most 8 are kept. */
export function pushRecent(list: RecentFood[], recent: RecentFood): RecentFood[] {
  const rest = list.filter((r) => !(r.foodId === recent.foodId && r.servingLabel === recent.servingLabel));
  return [recent, ...rest].slice(0, MAX_RECENTS);
}
