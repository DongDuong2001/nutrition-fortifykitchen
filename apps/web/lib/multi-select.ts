import type { AddedDiaryEntry } from "./diary-edits";
import { kcalLabel, sumKcal } from "./kcal";
import type { HomeEntry } from "./home";
import { MEAL_SLOTS, type MealSlot } from "./meal-slot";

/** Hôm nay multi-select (cc-27a): pure helpers for the chosen set, the copies and the texts. */

/** The chosen ids with this one flipped. A new set: the old one is not changed. */
export function toggleId(selected: ReadonlySet<string>, id: string): Set<string> {
  const next = new Set(selected);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

/** Every entry of a meal chosen? A meal with no entry is never "all chosen". */
export function mealFullySelected(selected: ReadonlySet<string>, mealEntries: readonly Pick<HomeEntry, "id">[]): boolean {
  return mealEntries.length > 0 && mealEntries.every((e) => selected.has(e.id));
}

/** Chọn cả bữa / Bỏ chọn bữa: all of the meal's entries chosen when any is missing, else all of them dropped. */
export function toggleMealSelection(selected: ReadonlySet<string>, mealEntries: readonly Pick<HomeEntry, "id">[]): Set<string> {
  const next = new Set(selected);
  if (mealFullySelected(selected, mealEntries)) for (const e of mealEntries) next.delete(e.id);
  else for (const e of mealEntries) next.add(e.id);
  return next;
}

export function selectAll(entries: readonly Pick<HomeEntry, "id">[]): Set<string> {
  return new Set(entries.map((e) => e.id));
}

/** The chosen entries, in the order of the day. Ids that are no longer there are dropped. */
export function chosenEntries<T extends Pick<HomeEntry, "id">>(entries: readonly T[], selected: ReadonlySet<string>): T[] {
  return entries.filter((e) => selected.has(e.id));
}

export function chosenKcal(entries: readonly Pick<HomeEntry, "id" | "kcal">[], selected: ReadonlySet<string>): number | null {
  const chosen = chosenEntries(entries, selected);
  // Nothing chosen is 0; entries chosen but none with a kcal value is unknown (null)
  return chosen.length === 0 ? 0 : sumKcal(chosen.map((e) => e.kcal));
}

/** "3 món · 1.041 kcal" */
export function actionBarLabel(count: number, kcal: number | null): string {
  return `${count} món · ${kcalLabel(kcal)}`;
}

export function selectTitle(count: number): string {
  return `Đã chọn ${count}`;
}

/** The meal a copy goes to: a slot, or keep each entry's own meal. */
export type CopyTarget = MealSlot | "keep";

/** The four meals offered as targets, in the order of Hôm nay. Trước tập is not a target. */
export const TARGET_MEALS: { id: MealSlot; name: string; label: string }[] = [
  { id: "breakfast", label: "Sáng" },
  { id: "lunch", label: "Trưa" },
  { id: "snack", label: "Bữa phụ" },
  { id: "dinner", label: "Tối" },
].map((m) => ({ ...m, id: m.id as MealSlot, name: MEAL_SLOTS.find((s) => s.id === m.id)?.nameVi ?? m.label }));

/**
 * The meals the ⋯ menu's Chuyển sang bữa… offers: the meals the day shows, in its own order, so on a day that shows Trước tập a
 * food can be moved out of it and into it, as the hold-and-drag does. Chọn nhiều món keeps TARGET_MEALS (the four), where Trước tập
 * is not a copy target.
 */
export function moveTargets(meals: readonly { slot: MealSlot; label: string }[]): { id: MealSlot; label: string }[] {
  return meals.map((m) => ({ id: m.slot, label: m.label }));
}

/** The entries as new added entries (new ids and time), into one meal or each in its own meal. */
export function copyHomeEntries(entries: readonly HomeEntry[], target: CopyTarget, idPrefix: string, addedAt: string): AddedDiaryEntry[] {
  return entries.map((e, i) => ({
    id: `${idPrefix}-${i}`,
    ...(e.quick ? { kind: "quick" as const } : {}),
    foodId: e.foodId ?? "",
    foodName: e.name,
    grams: e.grams ?? 0,
    displayQty: e.qty,
    mealSlot: target === "keep" ? e.slot : target,
    calories: e.kcal,
    protein: e.protein,
    carbs: e.carbs,
    fat: e.fat,
    fiber: e.fiber,
    nutrients: { ...e.nutrients },
    addedAt,
  }));
}

export function pastCopyTitle(count: number): string {
  return `Chép ${count} món vào hôm nay`;
}

/** "Từ Hôm qua 14/10 · 1.532 kcal. Ngày đã qua chỉ xem, nên món được chép vào hôm nay 15/10." */
export function pastCopySubtitle(dayLabel: string, kcal: number | null, todayDdMm: string): string {
  return `Từ ${dayLabel} · ${kcalLabel(kcal)}. Ngày đã qua chỉ xem, nên món được chép vào hôm nay ${todayDdMm}.`;
}

export function pastCopyToast(count: number): string {
  return `Đã chép ${count} món vào hôm nay`;
}

/** "15/10" from YYYY-MM-DD. */
export function ddMm(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}
