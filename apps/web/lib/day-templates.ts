import type { FoodItem } from "./catalog";
import { NO_ENERGY_MESSAGE, type AddedDiaryEntry } from "./diary-edits";
import { shiftIsoDate } from "./day-history";
import { formatAmount } from "./format";
import { SLOT_LABEL } from "./home";
import { sumKcal } from "./kcal";
import { MEAL_SLOTS, type MealSlot } from "./meal-slot";
import { savedMealEntries, savedMealSkipped, type SavedMealItem } from "./saved-meals";
import { DAY_TEMPLATES_KEY, TEMPLATE_PILL_HIDDEN_KEY } from "./storage-keys";
import { isUuid } from "./uuid";

export { DAY_TEMPLATES_KEY, TEMPLATE_PILL_HIDDEN_KEY };

/**
 * Ngày ăn mẫu (feat/ngay-mau): a whole day saved and copied back into an empty day in one tap. A copy goes through the same add
 * path as Chép hôm qua (diary-store copyEntries). The foods and portions are the shape saved meals use. The list is kept on the
 * device and follows the account through the API (/day-templates, migration 000016): the rules for that are at the end of this
 * file (pure), the reads and writes in lib/day-template-store.
 */
export type DayTemplateTag = "tap" | "nghi" | "khac";

export const DAY_TEMPLATE_TAGS: { key: DayTemplateTag; label: string }[] = [
  { key: "tap", label: "Ngày tập" },
  { key: "nghi", label: "Ngày nghỉ" },
  { key: "khac", label: "Khác" },
];

export function tagLabel(tag: DayTemplateTag): string {
  return DAY_TEMPLATE_TAGS.find((t) => t.key === tag)?.label ?? "Khác";
}

/** One food of a template: the food, the portion label it was logged with and the grams (a saved meal's item). */
export type DayTemplateItem = SavedMealItem;

/** The foods of one meal of the day. A meal with no food is not part of a template. */
export interface DayTemplateMeal {
  slot: MealSlot;
  items: DayTemplateItem[];
}

export interface DayTemplate {
  id: string;
  name: string;
  tag: DayTemplateTag;
  meals: DayTemplateMeal[];
  createdAt: string;
}

/** The meals in the order Hôm nay lists them (Trước tập right after Trưa). */
export const TEMPLATE_SLOT_ORDER: MealSlot[] = ["breakfast", "lunch", "pre_workout", "snack", "dinner"];

/** The name field's start on a training day: "Ngày tập". Otherwise empty (the person names it). */
export function defaultTemplateName(trainingMinutes: number): string {
  return trainingMinutes > 0 ? tagLabel("tap") : "";
}

/** The tag that starts picked: Ngày tập on a training day, otherwise Ngày nghỉ. */
export function defaultTemplateTag(trainingMinutes: number): DayTemplateTag {
  return trainingMinutes > 0 ? "tap" : "nghi";
}

/** The name given to a template saved with a blank name: its tag, or "Ngày 13/10" for Khác. */
export function fallbackTemplateName(tag: DayTemplateTag, iso: string): string {
  if (tag !== "khac") return tagLabel(tag);
  const [, month, day] = iso.split("-");
  return `Ngày ${day}/${month}`;
}

/** The meals of a day as a template's meals: Hôm nay's order, a meal with no food left out. */
export function dayTemplateMeals(itemsFor: (slot: MealSlot) => DayTemplateItem[]): DayTemplateMeal[] {
  return TEMPLATE_SLOT_ORDER.flatMap((slot) => {
    const items = itemsFor(slot);
    return items.length > 0 ? [{ slot, items }] : [];
  });
}

function withoutEmptyMeals(meals: DayTemplateMeal[]): DayTemplateMeal[] {
  return meals.filter((m) => m.items.length > 0);
}

/** A trimmed name (the fallback when blank) and the meals that hold food. A day with no food cannot be saved: null. */
export function buildDayTemplate(input: {
  id: string;
  name: string;
  tag: DayTemplateTag;
  fallbackName: string;
  meals: DayTemplateMeal[];
  createdAt: string;
}): DayTemplate | null {
  const meals = withoutEmptyMeals(input.meals);
  if (meals.length === 0) return null;
  return { id: input.id, name: input.name.trim() || input.fallbackName, tag: input.tag, meals, createdAt: input.createdAt };
}

/**
 * Changes one template. A blank name keeps the old one, empty meals are dropped, and meals that would leave the template with no
 * food at all are refused (the whole change to the meals is ignored).
 */
export function updateDayTemplate(
  list: DayTemplate[],
  id: string,
  patch: { name?: string; tag?: DayTemplateTag; meals?: DayTemplateMeal[] }
): DayTemplate[] {
  return list.map((t) => {
    if (t.id !== id) return t;
    const name = patch.name?.trim();
    const meals = patch.meals ? withoutEmptyMeals(patch.meals) : null;
    return {
      ...t,
      name: name ? name : t.name,
      tag: patch.tag ?? t.tag,
      meals: meals && meals.length > 0 ? meals : t.meals,
    };
  });
}

export function removeDayTemplate(list: DayTemplate[], id: string): DayTemplate[] {
  return list.filter((t) => t.id !== id);
}

/** The meals without one food (by its place in the meal); a meal left with no food goes too. */
export function removeTemplateItem(meals: DayTemplateMeal[], slot: MealSlot, index: number): DayTemplateMeal[] {
  return withoutEmptyMeals(meals.map((m) => (m.slot === slot ? { ...m, items: m.items.filter((_, i) => i !== index) } : m)));
}

// ---- reading what storage holds ----

const SLOTS = new Set<string>(MEAL_SLOTS.map((s) => s.id));
const TAGS = new Set<string>(DAY_TEMPLATE_TAGS.map((t) => t.key));

function isItem(value: unknown): value is DayTemplateItem {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.foodId === "string" && typeof v.servingLabel === "string" && typeof v.grams === "number" && Number.isFinite(v.grams) && v.grams > 0;
}

function parseMeal(value: unknown): DayTemplateMeal | null {
  if (typeof value !== "object" || value === null) return null;
  const v = value as Record<string, unknown>;
  if (typeof v.slot !== "string" || !SLOTS.has(v.slot) || !Array.isArray(v.items)) return null;
  const items = v.items.filter(isItem).map((i) => ({ foodId: i.foodId, servingLabel: i.servingLabel, grams: i.grams }));
  return items.length > 0 ? { slot: v.slot as MealSlot, items } : null;
}

/** Reads the saved days. Bad JSON gives an empty list; a bad meal or food is dropped, and a template left with no food goes too. */
export function parseDayTemplates(raw: string | null): DayTemplate[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((t): DayTemplate[] => {
      if (typeof t !== "object" || t === null) return [];
      const v = t as Record<string, unknown>;
      if (typeof v.id !== "string" || typeof v.name !== "string" || typeof v.createdAt !== "string" || !Array.isArray(v.meals)) return [];
      const meals = v.meals.flatMap((m) => {
        const meal = parseMeal(m);
        return meal ? [meal] : [];
      });
      if (meals.length === 0) return [];
      const tag: DayTemplateTag = typeof v.tag === "string" && TAGS.has(v.tag) ? (v.tag as DayTemplateTag) : "khac";
      return [{ id: v.id, name: v.name, tag, meals, createdAt: v.createdAt }];
    });
  } catch {
    return [];
  }
}

// ---- what a copy adds, and what the cards show ----

/** The saved foods of one meal as a saved meal, so the add path and its rules (no energy, gone from the catalogue) are the one Bữa ăn đã lưu uses. */
const asSavedMeal = (template: DayTemplate, meal: DayTemplateMeal) => ({ id: template.id, name: template.name, items: meal.items, createdAt: template.createdAt });

/** The entries one copy adds: one per food that still exists and has energy, in each meal's own slot, in the template's order. */
export function templateEntries(template: DayTemplate, foods: FoodItem[], idPrefix: string, addedAt: string): AddedDiaryEntry[] {
  return template.meals.flatMap((meal) => savedMealEntries(asSavedMeal(template, meal), foods, meal.slot, `${idPrefix}-${meal.slot}`, addedAt));
}

/** How many foods are in the catalogue but have no known energy: a copy leaves them out and says so. */
export function templateSkipped(template: DayTemplate, foods: FoodItem[]): number {
  return template.meals.reduce((n, meal) => n + savedMealSkipped(asSavedMeal(template, meal), foods), 0);
}

/** What a copy adds ("N món · X kcal"): the foods' own kcal, never a guess. */
export function templateTotals(template: DayTemplate, foods: FoodItem[]): { itemCount: number; kcal: number; skipped: number } {
  const entries = templateEntries(template, foods, "t", "");
  return { itemCount: entries.length, kcal: sumKcal(entries.map((e) => e.calories)) ?? 0, skipped: templateSkipped(template, foods) };
}

/** The kcal of each meal a copy adds, in the template's order ("Sáng 459 · Trưa 488"). */
export function templateMealKcal(template: DayTemplate, foods: FoodItem[]): { slot: MealSlot; kcal: number }[] {
  return template.meals.map((meal) => ({
    slot: meal.slot,
    kcal: sumKcal(savedMealEntries(asSavedMeal(template, meal), foods, meal.slot, "t", "").map((e) => e.calories)) ?? 0,
  }));
}

/** "Đã chép Ngày tập · 7 món", with how many foods were left out when some were. */
export function templateCopyMessage(name: string, count: number, skipped: number): string {
  return `Đã chép ${name} · ${count} món${skipped > 0 ? `. ${skipped} món chưa có kcal nên chưa chép` : ""}`;
}

/** "Sáng · Trưa · Trước tập": the meals that hold food, in Hôm nay's short names. */
export function mealNamesLine(meals: { slot: MealSlot }[]): string {
  return meals.map((m) => SLOT_LABEL[m.slot]).join(" · ");
}

/** "Sáng 459 · Trưa 488": each meal with its kcal. */
export function mealsKcalLine(meals: { slot: MealSlot; kcal: number }[]): string {
  return meals.map((m) => `${SLOT_LABEL[m.slot]} ${formatAmount(m.kcal, "kcal")}`).join(" · ");
}

/** The toast after Lưu mẫu. */
export function templateSavedMessage(name: string, itemCount: number, kcal: number): string {
  return `Đã lưu ${name} · ${itemCount} món · ${formatAmount(kcal, "kcal")} kcal`;
}

/** The toast after copying Hôm qua (Hôm kia, into yesterday): the words the copy sheet of Chép hôm qua has always used. */
export function yesterdayCopyMessage(mealCount: number, intoToday: boolean): string {
  return `Đã chép ${mealCount} bữa từ ${intoToday ? "hôm qua" : "hôm kia"}${intoToday ? "" : " vào hôm qua"}`;
}

/** Said when a template has no food a copy can add (every food gone from the catalogue). */
export const TEMPLATE_GONE_MESSAGE = "Các món của mẫu này không còn trong danh sách.";

/** Applying a template to a day: the entries to hand to the diary's copy (with the toast and its Hoàn tác), and the toast's words. */
export function applyTemplate(
  template: DayTemplate,
  foods: FoodItem[],
  { idPrefix, addedAt }: { idPrefix: string; addedAt: string }
): { entries: AddedDiaryEntry[]; message: string } {
  const entries = templateEntries(template, foods, idPrefix, addedAt);
  const skipped = templateSkipped(template, foods);
  if (entries.length === 0) return { entries, message: skipped > 0 ? NO_ENERGY_MESSAGE : TEMPLATE_GONE_MESSAGE };
  return { entries, message: templateCopyMessage(template.name, entries.length, skipped) };
}

/** Meals that start unticked in the copy sheet of Chép hôm qua; the card in the picker copies what that sheet starts with. */
const YESTERDAY_UNTICKED: MealSlot[] = ["snack"];

/**
 * The meals "Hôm qua" copies from the picker: the ones Chép hôm qua starts with ticked (every meal with food but the snack). When
 * the snack is all there was, it is copied rather than nothing.
 */
export function yesterdayCopySlots(entries: AddedDiaryEntry[]): MealSlot[] {
  const withFood = MEAL_SLOTS.map((s) => s.id).filter((slot) => entries.some((e) => e.mealSlot === slot));
  const ticked = withFood.filter((slot) => !YESTERDAY_UNTICKED.includes(slot));
  return ticked.length > 0 ? ticked : withFood;
}

// ---- the pill's × ----

/** How long a hidden date is remembered: only today and yesterday can be added to, so older ones are not needed. */
export const PILL_KEEP_DAYS = 7;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function parsePillHidden(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((d): d is string => typeof d === "string" && ISO_DATE.test(d)) : [];
  } catch {
    return [];
  }
}

export function isPillHidden(hidden: readonly string[], iso: string): boolean {
  return hidden.includes(iso);
}

/** The dates whose pill is hidden, with `iso` added (once) and the dates older than PILL_KEEP_DAYS before today dropped. */
export function hidePillFor(hidden: readonly string[], iso: string, todayIso: string): string[] {
  const oldest = shiftIsoDate(todayIso, -PILL_KEEP_DAYS);
  return [...new Set([...hidden, iso])].filter((d) => d >= oldest).sort();
}

// ---- following the account (the API's /day-templates) ----

const sameTemplate = (a: DayTemplate, b: DayTemplate): boolean => JSON.stringify(a) === JSON.stringify(b);

/** What a change of the list sends: each template that is new or changed (PUT), and the ids that are gone (DELETE). */
export function templateWrites(prev: readonly DayTemplate[], next: readonly DayTemplate[]): { put: DayTemplate[]; remove: string[] } {
  const before = new Map(prev.map((t) => [t.id, t]));
  const after = new Set(next.map((t) => t.id));
  return {
    put: next.filter((t) => !before.has(t.id) || !sameTemplate(before.get(t.id)!, t)),
    remove: prev.filter((t) => !after.has(t.id)).map((t) => t.id),
  };
}

/** Ids the server can take: a template saved before they were uuids ("dt-…") gets a new one. The same list when none had to change. */
export function withUuidIds(list: DayTemplate[], newId: () => string): DayTemplate[] {
  return list.some((t) => !isUuid(t.id)) ? list.map((t) => (isUuid(t.id) ? t : { ...t, id: newId() })) : list;
}

// By time, not by text: the server may write the same moment with another offset or more digits
const newestFirst = (a: DayTemplate, b: DayTemplate): number => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0);

/**
 * The server's list against this device's. The server's is the truth, except for a template with a write still waiting (`pending`:
 * its save is kept, its delete wins). On the first sync of the device (`firstSync`), a template only the device has was made here
 * before the list followed the account: it is kept and sent (`upload`). After that, one the server no longer has was deleted on
 * another device and goes. Newest first.
 */
export function mergeDayTemplates(
  server: readonly DayTemplate[],
  local: readonly DayTemplate[],
  pending: ReadonlyMap<string, "put" | "delete">,
  firstSync: boolean
): { list: DayTemplate[]; upload: DayTemplate[] } {
  const localById = new Map(local.map((t) => [t.id, t]));
  const onServer = new Set(server.map((t) => t.id));
  const kept = server.flatMap((t) => {
    const op = pending.get(t.id);
    if (op === "delete") return [];
    return [op === "put" ? (localById.get(t.id) ?? t) : t];
  });
  const onlyHere = local.filter((t) => !onServer.has(t.id) && pending.get(t.id) !== "delete");
  const upload = firstSync ? onlyHere.filter((t) => !pending.has(t.id)) : [];
  const stay = onlyHere.filter((t) => pending.has(t.id) || firstSync);
  return { list: [...kept, ...stay].sort(newestFirst), upload };
}
