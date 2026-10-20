import type { RecentFood } from "../recent-foods";

/** Demo mode's seeded Gần đây: three sample foods (lib/diary-store). A live build gets lib/mock/live/recent-seed.ts. */
export const DEFAULT_RECENT_FOODS: RecentFood[] = [
  { foodId: "food-yen-mach", servingLabel: "60 g" },
  { foodId: "food-yogurt-kefir", servingLabel: "200 ml" },
  { foodId: "food-chuoi", servingLabel: "100 g" },
];
