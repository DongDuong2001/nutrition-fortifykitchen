import { templateEntries, type DayTemplate } from "./day-templates";
import type { FoodItem } from "./catalog";
import { entriesFromAdded, sumEntries, type HomeValues } from "./home";
import { sumExtras } from "./level-nutrients";

/**
 * What a Ngày ăn mẫu adds up to, for the builder's Tổng: the macros, the 22 counted micros and the extras. It is the sum Hôm nay
 * makes of the same foods after a copy (the entries a copy adds, through sumEntries and sumExtras), so the two screens agree.
 * A food with no value for a micro adds nothing to it; a micro no food has stays null (unknown, never 0).
 */
export function templateNutrition(template: DayTemplate, foods: FoodItem[]): { values: HomeValues; extras: Record<string, number | null> } {
  const entries = entriesFromAdded(templateEntries(template, foods, "t", ""));
  return { values: sumEntries(entries), extras: sumExtras(entries) };
}
