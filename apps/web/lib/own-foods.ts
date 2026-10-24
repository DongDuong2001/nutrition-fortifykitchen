import type { FoodItem } from "./catalog";
import { EXTRA_FIELDS, MAIN_FIELDS } from "./custom-food-fields";
import type { DayTemplate } from "./day-templates";
import type { SavedMeal } from "./saved-meals";

/**
 * Món ăn của tôi: Sửa món and Xóa món (Job C, overnight 23→24/10). Pure rules; the screens and the stores call these.
 */

/** Xóa món has no confirm: Hoàn tác stays this long, and the DELETE is held in the outbox as long (8 s, as every delete's undo). */
export const OWN_FOOD_UNDO_MS = 8000;
/** The DELETE waits 1,5 s longer than the toast: a Hoàn tác in the toast's last moment, or a slow tap, still finds it in the outbox. */
export const OWN_FOOD_HOLD_MS = OWN_FOOD_UNDO_MS + 1500;

export type ServingUnit = "g" | "ml" | "cái";

export interface EditForm {
  nameVi: string;
  servingSize: string;
  servingUnit: ServingUnit;
  /** Input id → text, per portion, as the Tự nhập form shows them (blank: no data) */
  values: Record<string, string>;
  /** The vitamin and mineral keys the food has, to show as added fields */
  added: string[];
  /** Input id → the same value per portion at full precision: what a field the person never touched is saved with */
  exact: Record<string, number>;
}

const UNITS: readonly ServingUnit[] = ["g", "ml", "cái"];
/** What a field shows: 4 significant digits, never 2 decimals (0,015 mg stays 0,015). */
const asText = (n: number) => String(Number(n.toPrecision(4))).replace(".", ",");
/** A number as text a form field parses back to the same number, with no exponent. */
const exactText = (n: number) => n.toFixed(12).replace(/\.?0+$/, "").replace(".", ",");

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
  const exact: Record<string, number> = {};
  const added: string[] = [];
  for (const field of [...MAIN_FIELDS, ...EXTRA_FIELDS]) {
    const n = per100[field.key];
    if (typeof n !== "number" || !Number.isFinite(n)) continue;
    const perPortion = (n * size) / 100;
    values[field.id] = asText(perPortion);
    exact[field.id] = perPortion;
    if (!MAIN_FIELDS.includes(field)) added.push(field.key);
  }
  return { nameVi: food.nameVi, servingSize: String(Number(size.toFixed(6))).replace(".", ","), servingUnit: unit, values, added, exact };
}

/** How many saved meals and Ngày ăn mẫu hold the food (each counted once): Xóa món asks for a confirm only when this is above 0. */
export function foodUses(foodId: string, meals: readonly SavedMeal[], templates: readonly DayTemplate[]): number {
  return (
    meals.filter((m) => m.items.some((i) => i.foodId === foodId)).length +
    templates.filter((t) => t.meals.some((m) => m.items.some((i) => i.foodId === foodId))).length
  );
}

/** The line of the confirm sheet of Xóa món. */
export const usedNote = (uses: number): string => `Món này đang có trong ${uses} bữa đã lưu hoặc ngày ăn mẫu. Các lần đã ghi trong nhật ký vẫn giữ nguyên.`;

/**
 * The values the form sends. The form shows each value with 4 significant digits; a field whose text is still what the form started
 * with was not touched, so it is sent at full precision and comes out per 100 g exactly as the food had it. A changed or added field
 * sends what was typed; an emptied one is gone from `typed` and stays out.
 */
export function editedValues(form: EditForm, typed: Readonly<Record<string, string>>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [id, text] of Object.entries(typed)) out[id] = id in form.exact && text === form.values[id] ? exactText(form.exact[id]) : text;
  return out;
}
