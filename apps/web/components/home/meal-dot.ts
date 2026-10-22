import type { MealSlot } from "@/lib/meal-slot";

// V3-SPEC §3.7: the meal dot, in the deep shade of the meal's colour (Sáng orange, Trưa yellow, Trước tập pink, Tối indigo, Bữa phụ mint)
export const MEAL_DOT: Record<MealSlot, string> = {
  breakfast: "bg-deep-orange",
  lunch: "bg-deep-yellow",
  pre_workout: "bg-deep-pink",
  dinner: "bg-deep-indigo",
  snack: "bg-deep-mint",
};
