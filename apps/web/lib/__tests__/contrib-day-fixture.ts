import type { AddedDiaryEntry } from "../diary-edits";
import type { MealSlot } from "../meal-slot";

/**
 * A level-2 user's day (the 23/10 report: "103 g fat on the page, 76,9 when I add up the list"), 24 entries over four meals.
 * Rebuilt from the figures in the report: the five rows the card showed (Quả bơ 29,4 · Kefir 13 · Thịt bò nạc 12 + 12 · Trứng gà
 * 10,5) and the foods it hid; the other hidden amounts and the zero-fat entries are filled in so that the day totals 103 g of fat.
 * Kefir is logged twice (360 g, 180 g) and Thịt bò nạc twice (100 g, 100 g).
 */
type Row = [meal: MealSlot, foodId: string, name: string, qty: string, grams: number, fat: number];

const ROWS: Row[] = [
  ["breakfast", "tu-trung", "Trứng gà", "100 g", 100, 10.5],
  ["breakfast", "tu-kefir", "Kefir", "360 g", 360, 12.96],
  ["breakfast", "tu-ca-phe", "Cà phê đen", "200 ml", 200, 0],
  ["breakfast", "tu-nuoc", "Nước lọc", "300 ml", 300, 0],
  ["lunch", "tu-com", "Cơm trắng", "200 g", 200, 0.5],
  ["lunch", "tu-bo-nac", "Thịt bò nạc", "100 g", 100, 12],
  ["lunch", "tu-bo", "Quả bơ", "196 g", 196, 29.4],
  ["lunch", "tu-rau-muong", "Rau muống luộc", "150 g", 150, 0],
  ["lunch", "tu-hau", "Hàu", "100 g", 100, 2.5],
  ["lunch", "tu-nuoc", "Nước lọc", "500 ml", 500, 0],
  ["snack", "tu-hat-bi", "Hạt bí", "20 g", 20, 9.8],
  ["snack", "tu-kefir", "Kefir", "180 g", 180, 6.48],
  ["snack", "tu-flex", "Vinamilk Flex", "200 ml", 200, 2.4],
  ["snack", "tu-pho-mai", "Phô mai", "25 g", 25, 4],
  ["snack", "tu-dua-hau", "Dưa hấu", "200 g", 200, 0],
  ["snack", "tu-tao", "Táo", "150 g", 150, 0],
  ["dinner", "tu-bo-nac", "Thịt bò nạc", "100 g", 100, 12],
  ["dinner", "tu-com", "Cơm trắng", "150 g", 150, 0.4],
  ["dinner", "tu-cai-thia", "Cải thìa", "100 g", 100, 0],
  ["dinner", "tu-canh-bi", "Canh bí", "200 ml", 200, 0],
  ["dinner", "tu-cam", "Cam", "150 g", 150, 0],
  ["dinner", "tu-nuoc", "Nước lọc", "500 ml", 500, 0],
  ["dinner", "tu-buoi", "Bưởi", "100 g", 100, 0],
  ["dinner", "tu-nho", "Nho", "100 g", 100, 0],
];

const round1 = (n: number) => Math.round(n * 10) / 10;

/** The entries as the diary keeps them: `fat` rounded to a tenth (what the day total adds), `nutrients.fat` as scaled (what the sources read). */
export function contribDay(): AddedDiaryEntry[] {
  return ROWS.map(([mealSlot, foodId, foodName, displayQty, grams, fat], i) => ({
    id: `tu-${i + 1}`,
    foodId,
    foodName,
    grams,
    displayQty,
    mealSlot,
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: round1(fat),
    fiber: 0,
    nutrients: { fat },
    addedAt: "2026-10-23T01:00:00.000Z",
  }));
}
