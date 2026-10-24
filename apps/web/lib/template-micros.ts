import { templateEntries, type DayTemplate } from "./day-templates";
import type { FoodItem } from "./catalog";
import { entriesFromAdded, sumEntries, type HomeValues } from "./home";
import type { Level } from "./coaching-link";
import { columnGroups, countedForLevel, nutrientsForLevel, sumExtras, type ColumnGroup } from "./level-nutrients";

/**
 * What a Ngày ăn mẫu adds up to, for the builder's Tổng: the macros, the 22 counted micros and the extras. It is the sum Hôm nay
 * makes of the same foods after a copy (the entries a copy adds, through sumEntries and sumExtras), so the two screens agree.
 * A food with no value for a micro adds nothing to it; a micro no food has stays null (unknown, never 0).
 */
export function templateNutrition(template: DayTemplate, foods: FoodItem[]): { values: HomeValues; extras: Record<string, number | null> } {
  const entries = entriesFromAdded(templateEntries(template, foods, "t", ""));
  return { values: sumEntries(entries), extras: sumExtras(entries) };
}

/**
 * The rows of the builder's Vi chất (Q15, Hao 24/10): all 22 micros at every Level, as /micros shows them, and "x/22 đạt" counts
 * all 22. Only the extras (Chi tiết béo & xơ) follow the Level, from Level 3, as on Hôm nay.
 */
export function templateList(level: Level): { groups: ColumnGroup[]; counted: string[] } {
  const groups = columnGroups(4);
  return { groups: nutrientsForLevel(level).extras.length > 0 ? groups : groups.slice(1), counted: countedForLevel(4) };
}
