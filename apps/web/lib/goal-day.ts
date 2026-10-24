import type { GoalDay } from "./goals";
import type { MockDayData } from "./mock/sample-day";

/**
 * feat/sound-goals §3: today's numbers as Hôm nay's hero and column read them (the day's kcal low end, the macros, Chất xơ, the
 * Level's counted nutrients), in the shape lib/goals takes. A nutrient the day does not list is unknown, never reached.
 * `training`: every item of the day's Ngày tập checklist ticked (decided on /training, so the diary's own check passes false).
 */
export function goalDayFrom(day: MockDayData, countedIds: readonly string[], training = false): GoalDay {
  const stats = [...day.macros, ...day.minerals, ...day.vitamins];
  const amount = (key: string) => {
    const stat = stats.find((s) => s.key === key);
    return { value: stat?.consumed ?? null, target: stat?.targetMin ?? null };
  };
  return {
    kcal: { value: day.calories.consumed, target: day.calories.targetMin },
    macros: { carbs: amount("carbs"), protein: amount("protein"), fat: amount("fat") },
    fiber: amount("fiber"),
    column: Object.fromEntries(countedIds.map((id) => [id, amount(id)])),
    training,
  };
}
