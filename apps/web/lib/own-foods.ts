import type { FoodItem } from "./catalog";
import { EXTRA_FIELDS, MAIN_FIELDS } from "./custom-food-fields";
import type { DayTemplate } from "./day-templates";
import type { SavedMeal } from "./saved-meals";

/**
 * Món ăn của tôi: Sửa món and Xóa món (Job C, overnight 23→24/10). Pure rules; the screens and the stores call these.
 */

/** Xóa món has no confirm: Hoàn tác stays this long, and the DELETE is held in the outbox as long (8 s, as every delete's undo). */
export const OWN_FOOD_UNDO_MS = 8000;

export type ServingUnit = "g" | "ml" | "cái";

export interface EditForm {
  nameVi: string;
  servingSize: string;
  servingUnit: ServingUnit;
  /** Input id → text, per portion, as the Tự nhập form shows them (blank: no data) */
  values: Record<string, string>;
  /** The vitamin and mineral keys the food has, to show as added fields */
  added: string[];
}

const UNITS: readonly ServingUnit[] = ["g", "ml", "cái"];
const round2 = (n: number) => Math.round(n * 100) / 100;
const asText = (n: number) => String(round2(n)).replace(".", ",");

/**
 * What Sửa món starts with: the form of Tự nhập filled from the food. The API keeps a food per 100 g, so each value is turned back
 * into the portion the person typed (the first serving, whose grams are that typed number). A value the food has no number for
 * stays blank, never 0. The unit is read from the serving's label ("150 g", "250 ml", "2 cái"); anything else is grams.
 */
export function editFormOf(food: FoodItem): EditForm {
  const serving = food.servings[0] ?? { label: "100 g", grams: 100 };
  const unit = UNITS.find((u) => serving.label.trim().endsWith(` ${u}`)) ?? "g";
  const size = serving.grams > 0 ? serving.grams : 100;
  const per100 = food.nutrients;
  const values: Record<string, string> = {};
  const added: string[] = [];
  for (const field of [...MAIN_FIELDS, ...EXTRA_FIELDS]) {
    const n = per100[field.key];
    if (typeof n !== "number" || !Number.isFinite(n)) continue;
    values[field.id] = asText((n * size) / 100);
    if (!MAIN_FIELDS.includes(field)) added.push(field.key);
  }
  return { nameVi: food.nameVi, servingSize: asText(size), servingUnit: unit, values, added };
}

/** How many saved meals and Ngày ăn mẫu hold the food (each counted once): Xóa món asks for a confirm only when this is above 0. */
export function foodUses(foodId: string, meals: readonly SavedMeal[], templates: readonly DayTemplate[]): number {
  return (
    meals.filter((m) => m.items.some((i) => i.foodId === foodId)).length +
    templates.filter((t) => t.meals.some((m) => m.items.some((i) => i.foodId === foodId))).length
  );
}

/** The line of the confirm sheet of Xóa món. */
export const usedNote = (uses: number): string => `${uses} mẫu / bữa đã lưu có món này · Món đã ghi trong nhật ký vẫn giữ số liệu cũ`;
