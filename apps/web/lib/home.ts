import { COUNTED_NUTRIENT_KEYS } from "./day-totals";
import { SAMPLE_SLOT, entryNumbers, type AddedDiaryEntry, type EntryView } from "./diary-edits";
import { formatAmount, formatNumber } from "./format";
import { catalogFoodById } from "./mock/foods";
import { portionAmountText, portionDetail, unitAmountText, withoutServingHint } from "./portion";
import { isAmount } from "./amount";
import { sumKcal } from "./kcal";
import { MEAL_SLOTS, type MealSlot } from "./meal-slot";
import type { MockDayData } from "./mock/sample-day";

/** One food of the day as the home list shows it: its numbers, whichever way the day was built. */
export interface HomeEntry {
  id: string;
  /** The catalogue food behind the entry, when it has one (a copy keeps it). */
  foodId?: string;
  name: string;
  /** The portion as typed or picked ("1 chén"), shown when there are no grams. */
  qty: string;
  grams: number | null;
  slot: MealSlot;
  /** null = unknown energy: shown as "—", skipped by every total. */
  kcal: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  fiber: number | null;
  nutrients: Record<string, number | null>;
  /** A kcal-only entry (Chỉ ghi kcal). */
  quick: boolean;
}

export interface HomeMeal {
  slot: MealSlot;
  /** The short header label: Sáng, Trưa, Bữa phụ, Tối. */
  label: string;
  /** Bữa sáng, Bữa trưa … */
  fullName: string;
  entries: HomeEntry[];
  /** null when the meal has entries and none has a kcal value. */
  kcal: number | null;
}

export interface HomeValues {
  kcal: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  fiber: number | null;
  nutrients: Record<string, number | null>;
}

export type HomeMode = { kind: "day" } | { kind: "food"; id: string } | { kind: "meal"; slot: MealSlot };

export const DAY_MODE: HomeMode = { kind: "day" };

const SLOT_LABEL: Record<MealSlot, string> = {
  breakfast: "Sáng",
  lunch: "Trưa",
  pre_workout: "Trước tập",
  snack: "Bữa phụ",
  dinner: "Tối",
};

const FIXED_SLOTS: MealSlot[] = ["breakfast", "lunch", "snack", "dinner"];

const fullName = (slot: MealSlot) => MEAL_SLOTS.find((s) => s.id === slot)?.nameVi ?? SLOT_LABEL[slot];

/**
 * The meals of the list: Sáng, Trưa, Bữa phụ, Tối always; Trước tập (a slot the app still has) only when it
 * holds a food, right after Trưa.
 */
export function groupMeals(entries: HomeEntry[]): HomeMeal[] {
  const hasPre = entries.some((e) => e.slot === "pre_workout");
  const slots: MealSlot[] = hasPre ? ["breakfast", "lunch", "pre_workout", "snack", "dinner"] : FIXED_SLOTS;
  return slots.map((slot) => {
    const own = entries.filter((e) => e.slot === slot);
    return { slot, label: SLOT_LABEL[slot], fullName: fullName(slot), entries: own, kcal: own.length === 0 ? 0 : sumKcal(own.map((e) => e.kcal)) };
  });
}

/** Known values only: an unknown stays unknown (null) until some entry carries a number. Never 0. */
function knownSum(values: (number | null | undefined)[]): number | null {
  const known = values.filter(isAmount);
  return known.length === 0 ? null : known.reduce((a, b) => a + b, 0);
}

export function sumEntries(entries: HomeEntry[]): HomeValues {
  const nutrients: Record<string, number | null> = {};
  for (const key of COUNTED_NUTRIENT_KEYS) {
    const total = knownSum(entries.map((e) => e.nutrients[key]));
    nutrients[key] = total === null ? null : Math.round(total * 100) / 100;
  }
  const macro = (pick: (e: HomeEntry) => number | null) => {
    const total = knownSum(entries.map(pick));
    return total === null ? null : Math.round(total * 10) / 10;
  };
  return {
    kcal: sumKcal(entries.map((e) => e.kcal)),
    protein: macro((e) => e.protein),
    carbs: macro((e) => e.carbs),
    fat: macro((e) => e.fat),
    fiber: macro((e) => e.fiber),
    nutrients,
  };
}

/** True when any of the 22 counted micronutrients has no value for this food. */
export function missingMicros(entry: HomeEntry): boolean {
  return COUNTED_NUTRIENT_KEYS.some((key) => typeof entry.nutrients[key] !== "number");
}

/** Tap a food: it shows alone; tap it again and the day is back. A meal gives way to the food. */
export function toggleFood(mode: HomeMode, id: string): HomeMode {
  return mode.kind === "food" && mode.id === id ? DAY_MODE : { kind: "food", id };
}

export function toggleMeal(mode: HomeMode, slot: MealSlot): HomeMode {
  return mode.kind === "meal" && mode.slot === slot ? DAY_MODE : { kind: "meal", slot };
}

/** The entries whose sum the hero and the nutrient column show. */
export function modeEntries(mode: HomeMode, entries: HomeEntry[]): HomeEntry[] {
  if (mode.kind === "food") return entries.filter((e) => e.id === mode.id);
  if (mode.kind === "meal") return entries.filter((e) => e.slot === mode.slot);
  return entries;
}

const VOLUME_QTY = /^\d+(?:[.,]\d+)?\s*(?:ml|l)$/i;

/**
 * The portion a home row shows: a food logged in ml or l keeps "200 ml" as logged; a supplement shows its unit
 * quantity ("2 viên", see lib/portion); everything else shows its grams ("60 g" for "1 quả"), or the typed portion
 * when there are no grams. Never a serving label's "(…)" part: "1 phần (495 g, gồm 46 g mắm tôm)" shows "1 phần", the
 * rest is the line under the name (portionDetailOf).
 */
export function portionLabel(entry: Pick<HomeEntry, "qty" | "grams" | "foodId">): string {
  // cc-53b: what the user set ("150 g" of cooked chicken, never the 203 g of raw it was logged as; "3 quả")
  const set = portionAmountText(entry.qty);
  if (set) return set;
  // A supplement logged by the unit shows its quantity ("2 viên"), never its nominal grams
  const unit = unitAmountText(catalogFoodById(entry.foodId), entry.qty, entry.grams);
  if (unit) return withoutServingHint(unit);
  if (VOLUME_QTY.test(entry.qty.trim())) return entry.qty.trim();
  return entry.grams !== null ? `${formatAmount(entry.grams, "g")} g` : withoutServingHint(entry.qty);
}

/** The line under a home row: how it was weighed ("Đã nấu chín · 100 g × 3", "Cỡ lớn"), the label's "(…)" part, or null. */
export function portionDetailOf(entry: Pick<HomeEntry, "qty" | "grams" | "foodId">): string | null {
  // "1 phần (495 g, …)" shown as "2 phần": the label's hint is for one of the two
  const shown = leadingNumber(portionLabel(entry));
  const own = leadingNumber(entry.qty);
  return portionDetail(entry.qty, entry.grams, shown && own ? shown / own : 1);
}

/** "2 dĩa 8 cái" is 2, "1,5 phần" 1.5; null without a leading number. */
const leadingNumber = (text: string): number | null => {
  const m = /^(\d+(?:,\d+)?)\s/.exec(text.trim());
  return m ? Number(m[1].replace(",", ".")) : null;
};

/** First line of the hero card, in sentence case: "Cả ngày · 16 món", "Cá hồi nướng · 120 g", "Yogurt kefir · 200 ml", "Bữa trưa · 3 món". */
export function heroLabel(mode: HomeMode, entries: HomeEntry[], meals: HomeMeal[]): string {
  if (mode.kind === "food") {
    const e = entries.find((x) => x.id === mode.id);
    if (!e) return `Cả ngày · ${entries.length} món`;
    // No grams and no volume: the name alone (a typed "1 chén" is not a measure the hero repeats)
    if (e.grams === null && !VOLUME_QTY.test(e.qty.trim())) return e.name;
    return `${e.name} · ${portionLabel(e)}`;
  }
  if (mode.kind === "meal") {
    const meal = meals.find((m) => m.slot === mode.slot);
    return `${meal?.fullName ?? ""} · ${meal?.entries.length ?? 0} món`;
  }
  return `Cả ngày · ${entries.length} món`;
}

/** Percent of a target, rounded; null when the value or the target is unknown. */
export function pctOf(value: number | null, target: number | null): number | null {
  if (value === null || target === null || target <= 0 || !Number.isFinite(value) || !Number.isFinite(target)) return null;
  return Math.round((value / target) * 100);
}

/** The most a percent shows: 20.833% (a supplement against a small target) reads "999+%", so it fits its column. */
export const MAX_PCT_SHOWN = 999;

export function homeEntryFromAdded(e: AddedDiaryEntry): HomeEntry {
  const quick = e.kind === "quick";
  return {
    id: e.id,
    foodId: e.foodId,
    name: e.foodName,
    qty: e.displayQty,
    grams: quick ? null : e.grams,
    slot: e.mealSlot,
    kcal: e.calories,
    protein: e.protein,
    carbs: e.carbs,
    fat: e.fat,
    fiber: e.fiber,
    nutrients: e.nutrients,
    quick,
  };
}

export function entriesFromAdded(entries: AddedDiaryEntry[]): HomeEntry[] {
  return entries.map(homeEntryFromAdded);
}

const SPOKEN_GRAMS = /^(\d+(?:[.,]\d+)?)\s*g$/;

/**
 * Today's entries from the diary store's day (its meal items, with the user's edits applied).
 * Numbers come from the food and grams of `getEntry`, or from the added quick entry; an item the catalogue
 * does not know keeps its macros and has no micronutrient values.
 */
export function entriesFromDay(
  day: MockDayData,
  getEntry: (id: string) => EntryView | null,
  added: AddedDiaryEntry[]
): HomeEntry[] {
  return day.meals.flatMap((meal) =>
    meal.items.map((item): HomeEntry => {
      const slot = SAMPLE_SLOT[meal.slot];
      const addedEntry = added.find((a) => a.id === item.id);
      if (addedEntry) return { ...homeEntryFromAdded(addedEntry), name: item.name, qty: item.qty, kcal: item.kcal, slot };
      const view = getEntry(item.id);
      const numbers = view?.food && view.grams !== null ? entryNumbers(view.food, view.grams) : null;
      const spoken = SPOKEN_GRAMS.exec(item.qty);
      const grams = view?.grams ?? (spoken ? Number(spoken[1].replace(",", ".")) : null);
      return {
        id: item.id,
        foodId: view?.food?.id,
        name: item.name,
        qty: item.qty,
        grams,
        slot: view?.mealSlot ?? slot,
        kcal: item.kcal,
        protein: numbers ? numbers.protein : item.macros?.protein ?? null,
        carbs: numbers ? numbers.carbs : item.macros?.carbs ?? null,
        fat: numbers ? numbers.fat : item.macros?.fat ?? null,
        fiber: numbers ? numbers.fiber : null,
        nutrients: numbers ? numbers.nutrients : {},
        quick: false,
      };
    })
  );
}

/** The day as the store holds it (today with the user's edits, or a past day), in the same shape as a sum of entries. */
export function valuesFromDay(day: MockDayData): HomeValues {
  const macro = (key: string) => day.macros.find((m) => m.key === key)?.consumed ?? null;
  const nutrients: Record<string, number | null> = {};
  for (const stat of [...day.minerals, ...day.vitamins]) nutrients[stat.key] = stat.consumed;
  return {
    kcal: day.calories.consumed,
    protein: macro("protein"),
    carbs: macro("carbs"),
    fat: macro("fat"),
    fiber: macro("fiber"),
    nutrients,
  };
}

/** The daily target (low end) of a macro or a counted nutrient; null when the profile gives none. */
export function targetOf(day: MockDayData, key: string): number | null {
  const stat = [...day.macros, ...day.minerals, ...day.vitamins].find((s) => s.key === key);
  return stat?.targetMin ?? null;
}

/** The percent text: a dash when unknown, "<1%" for a value above 0 that rounds to 0%, "999+%" above 999, else the rounded percent. */
export function pctLabel(value: number | null, target: number | null): string {
  const pct = pctOf(value, target);
  if (pct === null) return "—";
  if (pct === 0 && value !== null && value > 0) return "<1%";
  if (pct > MAX_PCT_SHOWN) return `${MAX_PCT_SHOWN}+%`;
  return `${formatNumber(pct)}%`;
}

/**
 * What a screen reader says for one row of the nutrient column: the name, the amount against the real target, the share and the
 * level. It names the target itself ("mục tiêu 1.000 mg"), and leaves out what is unknown: the row used to say "— mục tiêu" (a dash
 * read aloud) when the value or the target was missing.
 */
export function nutrientRowLabel(input: { name: string; unit: string; value: number | null; target: number | null; level: string | null }): string {
  const { name, unit, value, target, level } = input;
  const amount = value === null ? "chưa có dữ liệu" : `${formatAmount(value, unit)} ${unit}`;
  const goal = target === null || target <= 0 ? "" : value === null ? `, mục tiêu ${formatAmount(target, unit)} ${unit}` : ` trên mục tiêu ${formatAmount(target, unit)} ${unit}`;
  const pct = pctOf(value, target);
  const share = pct === null ? "" : `, ${pctLabel(value, target)}`;
  return `${name}, ${amount}${goal}${share}${level ? `, ${level}` : ""}. Xem món góp phần`;
}

/** "2 món chưa rõ kcal": the foods of the shown set whose energy is unknown. Null when every food has a value. */
export function unknownKcalNote(entries: readonly Pick<HomeEntry, "kcal">[]): string | null {
  const n = entries.filter((e) => e.kcal === null).length;
  return n === 0 ? null : `${n} món chưa rõ kcal`;
}
