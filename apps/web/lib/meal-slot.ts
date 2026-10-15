export type MealSlot = "breakfast" | "lunch" | "pre_workout" | "dinner" | "snack";

export const MEAL_SLOTS: { id: MealSlot; nameVi: string }[] = [
  { id: "breakfast", nameVi: "Bữa sáng" },
  { id: "lunch", nameVi: "Bữa trưa" },
  { id: "pre_workout", nameVi: "Trước tập" },
  { id: "dinner", nameVi: "Bữa tối" },
  { id: "snack", nameVi: "Bữa phụ" },
];

/**
 * Returns the default meal slot according to time of day:
 * - 05:00–09:59 Bữa sáng (breakfast)
 * - 10:00–13:59 Bữa trưa (lunch)
 * - 14:00–16:59 Trước tập (pre_workout) on a training day, otherwise Bữa phụ (snack)
 * - 17:00–20:59 Bữa tối (dinner)
 * - otherwise Bữa phụ (snack)
 */
export function getDefaultMealSlot(date = new Date(), isTrainingDay = true): MealSlot {
  // Compute hours and minutes in Asia/Ho_Chi_Minh timezone
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(date);

  let hours = 0;
  let minutes = 0;
  for (const part of parts) {
    if (part.type === "hour") {
      hours = parseInt(part.value, 10);
      if (hours === 24) hours = 0;
    } else if (part.type === "minute") {
      minutes = parseInt(part.value, 10);
    }
  }

  const timeInMinutes = hours * 60 + minutes;

  // 05:00 to 09:59 -> 300 to 599
  if (timeInMinutes >= 5 * 60 && timeInMinutes <= 9 * 60 + 59) {
    return "breakfast";
  }

  // 10:00 to 13:59 -> 600 to 839
  if (timeInMinutes >= 10 * 60 && timeInMinutes <= 13 * 60 + 59) {
    return "lunch";
  }

  // 14:00 to 16:59 -> 840 to 1019
  if (timeInMinutes >= 14 * 60 && timeInMinutes <= 16 * 60 + 59) {
    return isTrainingDay ? "pre_workout" : "snack";
  }

  // 17:00 to 20:59 -> 1020 to 1259
  if (timeInMinutes >= 17 * 60 && timeInMinutes <= 20 * 60 + 59) {
    return "dinner";
  }

  // otherwise
  return "snack";
}

export function getMealSlotNameVi(slot: MealSlot): string {
  switch (slot) {
    case "breakfast":
      return "Bữa sáng";
    case "lunch":
      return "Bữa trưa";
    case "pre_workout":
      return "Trước tập";
    case "dinner":
      return "Bữa tối";
    case "snack":
      return "Bữa phụ";
    default:
      return "Bữa ăn";
  }
}

export function parseMealSlot(val: string | null | undefined): MealSlot | null {
  if (
    val === "breakfast" ||
    val === "lunch" ||
    val === "pre_workout" ||
    val === "dinner" ||
    val === "snack"
  ) {
    return val;
  }
  return null;
}

export function resolveMealSlot(
  param?: string | null,
  date = new Date(),
  isTrainingDay = true
): MealSlot {
  const parsed = parseMealSlot(param);
  if (parsed) return parsed;
  return getDefaultMealSlot(date, isTrainingDay);
}
