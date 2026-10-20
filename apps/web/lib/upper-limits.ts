/**
 * cc-73b: the calm note on a nutrient whose day total is above its Tolerable Upper Intake Level (Cronometer's "maximum
 * thresholds"). An extra line in the nutrient's own level colours, never an alarm. A UL that covers supplements only
 * (magnesium, vitamin E, niacin, folate) counts only foods of the supplement category, not ordinary food. A nutrient with
 * no UL never gets a note. Pure.
 */
import { catalogFoodById } from "./mock/foods";
import { formatAmount } from "./format";
import type { NutrientSource } from "./nutrient-sources";
import type { UpperLimit } from "./rda";

export interface UpperLimitNote {
  /** "Vượt mức an toàn (40 mg)" */
  line: string;
  /** What the limit covers and how much of the day counts against it */
  detail: string;
}

/** Whether a food is a supplement: the supplement category of the catalogue (no food carries a "fortified" flag yet). */
export const isSupplementFood = (foodId: string): boolean => (foodId ? catalogFoodById(foodId)?.category === "bo_sung" : false);

/** The part of a nutrient's day total that comes from supplement foods, from the foods that add to it. */
export function supplementAmount(sources: readonly Pick<NutrientSource, "foodId" | "amount">[]): number {
  return sources.reduce((sum, s) => (isSupplementFood(s.foodId) ? sum + s.amount : sum), 0);
}

const sentence = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);

/**
 * The note for one nutrient on one day, or null. `total` is the day's amount (null: unknown), `supplement` the part of it
 * from supplement foods. The limit is passed in, so a nutrient without one is simply left out by the caller.
 */
export function upperLimitNote(input: { ul: UpperLimit | undefined; unit: string; total: number | null; supplement: number }): UpperLimitNote | null {
  const { ul, unit, total, supplement } = input;
  if (!ul || total === null) return null;
  const counted = ul.supplementsOnly ? supplement : total;
  if (!(counted > ul.limit)) return null;
  const limit = `${formatAmount(ul.limit, unit)} ${unit}`;
  const extra = !ul.supplementsOnly && ul.note ? ` ${sentence(ul.note)}.` : "";
  const detail = ul.supplementsOnly
    ? `Mức này chỉ tính cho thực phẩm bổ sung, không tính thức ăn thường. Từ thực phẩm bổ sung bạn đã ghi ${formatAmount(supplement, unit)} ${unit}.`
    : `Bạn đã ghi ${formatAmount(total, unit)} ${unit}. Mức tối đa mỗi ngày để không có hại là ${limit} (DRI của Mỹ và Canada).${extra}`;
  return { line: `Vượt mức an toàn (${limit})`, detail };
}
