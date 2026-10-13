import { demoActive } from "../demo";
import type { MealSlot } from "../meal-slot";
import { YESTERDAY_ITEMS, type MockHistoryItem } from "./yesterday";

/** Days before today that the mock history covers: yesterday is 1, the oldest logged day is 29. */
export const HISTORY_DAYS = 29;

/** Days (counted back from today) with nothing logged, so averages and streaks have gaps to skip. */
const UNLOGGED_DAYS_AGO = new Set([8, 15, 22]);

type MenuLine = [MealSlot, string, number];

/**
 * Four menus built from the food catalog. A day's kcal and nutrients come out of the catalog (see
 * lib/day-history dayEntries), never from this file. Days rotate through the menus and scale the portions,
 * so the 30-day series has ups and downs: some days under the kcal minimum, some above the range.
 */
const MENUS: MenuLine[][] = [
  [
    ["breakfast", "food-trung-ga", 100],
    ["breakfast", "food-yen-mach", 60],
    ["breakfast", "food-chuoi", 100],
    ["lunch", "food-com-gao-lut", 200],
    ["lunch", "food-uc-ga", 150],
    ["lunch", "food-rau-muong", 100],
    ["dinner", "food-ca-hoi", 150],
    ["dinner", "food-khoai-lang", 150],
    ["dinner", "food-bong-cai-xanh", 100],
    ["snack", "food-sua-tuoi", 200],
  ],
  [
    ["breakfast", "food-banh-mi-thit", 150],
    ["breakfast", "food-yogurt-kefir", 200],
    ["lunch", "food-com-tam-suon", 350],
    ["lunch", "food-dau-hu", 100],
    ["lunch", "food-cai-bo-xoi", 100],
    ["dinner", "food-bun-cha", 350],
    ["dinner", "food-buoi", 100],
    ["snack", "food-hat-dieu", 30],
    ["snack", "food-tao", 150],
  ],
  [
    ["breakfast", "food-yen-mach", 60],
    ["breakfast", "food-sua-tuoi", 250],
    ["breakfast", "food-chuoi", 100],
    ["lunch", "food-bun-bo-hue", 400],
    ["pre_workout", "food-cha-la", 30],
    ["dinner", "food-thit-bo-nac", 150],
    ["dinner", "food-com-gao-lut", 150],
    ["dinner", "food-bong-cai-xanh", 100],
    ["snack", "food-whey-protein", 30],
  ],
  [
    ["breakfast", "food-pho-bo", 400],
    ["lunch", "food-com-gao-lut", 180],
    ["lunch", "food-thit-bo-nac", 120],
    ["lunch", "food-rau-muong", 100],
    ["pre_workout", "food-cha-la", 30],
    ["pre_workout", "food-hanh-nhan", 20],
    ["dinner", "food-ca-hoi", 120],
    ["dinner", "food-khoai-lang", 200],
    ["dinner", "food-cai-bo-xoi", 100],
    ["snack", "food-yogurt-kefir", 200],
  ],
];

/** Overall portion factor, so a typical day lands near the kcal range of the sample profile (1.950–2.275) */
const PORTION_FACTOR = 1.2;

/** Portion scale per day back from today (index = days ago). Varies from 0,8 to 1,2. */
const SCALES = [1, 1, 0.95, 1.15, 0.8, 1.05, 1.2, 0.9, 1, 1.1, 0.85, 1, 1.15, 0.95, 1.05, 1, 0.9, 1.2, 1, 0.85, 1.1, 1.05, 1, 0.95, 1.15, 0.9, 1, 1.1, 0.8, 1];

/**
 * What was logged `daysAgo` days before today, as history items; null for a day with nothing logged or older
 * than the history. Yesterday is the original mock "yesterday" (1.532 kcal). Null for every day outside demo mode.
 */
export function historyItems(daysAgo: number): MockHistoryItem[] | null {
  if (!demoActive()) return null;
  if (!Number.isInteger(daysAgo) || daysAgo < 1 || daysAgo > HISTORY_DAYS) return null;
  if (UNLOGGED_DAYS_AGO.has(daysAgo)) return null;
  if (daysAgo === 1) return YESTERDAY_ITEMS;
  const menu = MENUS[daysAgo % MENUS.length];
  const scale = SCALES[daysAgo % SCALES.length] * PORTION_FACTOR;
  return menu.map(([mealSlot, foodId, grams]) => {
    const scaled = Math.round((grams * scale) / 5) * 5;
    return { mealSlot, foodId, grams: scaled, qty: `${scaled} g` };
  });
}
