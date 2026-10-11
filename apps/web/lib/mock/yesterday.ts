import type { MealSlot } from "../meal-slot";

/** One logged item of the mock "yesterday". Its kcal and macros come from the food catalog, not from this file. */
export interface MockHistoryItem {
  mealSlot: MealSlot;
  foodId: string;
  grams: number;
  /** The quantity as the diary shows it */
  qty: string;
}

/**
 * Mock "yesterday": the only past day with entries. Other past days are empty.
 * Breakfast is the same as the sample day's breakfast. Totals come out of the catalog.
 */
export const YESTERDAY_ITEMS: MockHistoryItem[] = [
  { mealSlot: "breakfast", foodId: "food-yen-mach", grams: 60, qty: "60 g" },
  { mealSlot: "breakfast", foodId: "food-yogurt-kefir", grams: 200, qty: "200 ml" },
  { mealSlot: "breakfast", foodId: "food-chuoi", grams: 100, qty: "1 quả" },
  { mealSlot: "lunch", foodId: "food-com-gao-lut", grams: 150, qty: "150 g" },
  { mealSlot: "lunch", foodId: "food-thit-bo-nac", grams: 150, qty: "150 g" },
  { mealSlot: "dinner", foodId: "food-ca-hoi", grams: 150, qty: "150 g" },
  { mealSlot: "dinner", foodId: "food-khoai-lang", grams: 150, qty: "1 củ" },
  { mealSlot: "dinner", foodId: "food-bong-cai-xanh", grams: 100, qty: "1 chén hấp" },
  { mealSlot: "snack", foodId: "food-whey-protein", grams: 30, qty: "1 muỗng (30 g)" },
];
