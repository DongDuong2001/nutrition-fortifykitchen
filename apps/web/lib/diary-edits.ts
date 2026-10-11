import { MOCK_FOODS, type FoodItem } from "./mock/foods";
import { SAMPLE_DAY, type MockDayData, type MockFoodItem } from "./mock/sample-day";
import { MEAL_SLOTS, type MealSlot } from "./meal-slot";
import { scaleNutrients } from "./portion";

/** A diary entry the user added (from /add or the food detail page). */
export interface AddedDiaryEntry {
  id: string;
  foodId: string;
  foodName: string;
  grams: number;
  displayQty: string;
  mealSlot: MealSlot;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  nutrients: Record<string, number | null>;
  addedAt: string;
}

/** Nutrition for one portion of a food. Added entries and sample edits round the same way. */
export interface EntryNumbers {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  nutrients: Record<string, number | null>;
}

export function entryNumbers(food: FoodItem, grams: number): EntryNumbers {
  const scaled = scaleNutrients(food.nutrients, grams);
  return {
    calories: Math.round(scaled.energy ?? 0),
    carbs: Math.round((scaled.carbs ?? 0) * 10) / 10,
    protein: Math.round((scaled.protein ?? 0) * 10) / 10,
    fat: Math.round((scaled.fat ?? 0) * 10) / 10,
    fiber: Math.round((scaled.fiber ?? 0) * 10) / 10,
    nutrients: scaled,
  };
}

/** Sample day meal slots (as written in sample-day.ts) to the app's meal slots. */
export const SAMPLE_SLOT: Record<MockDayData["meals"][number]["slot"], MealSlot> = {
  breakfast: "breakfast",
  lunch: "lunch",
  preworkout: "pre_workout",
  dinner: "dinner",
  snack: "snack",
};

const GRAMS_LABEL = /^(\d+(?:[.,]\d+)?)\s*g$/;

/** Grams for a sample quantity: a serving label of the food ("1 quả"), or a plain "45 g". Null if neither. */
function sampleGrams(food: FoodItem, qty: string): number | null {
  const serving = food.servings.find((s) => s.label === qty);
  if (serving) return serving.grams;
  const match = GRAMS_LABEL.exec(qty.trim());
  return match ? Number(match[1].replace(",", ".")) : null;
}

/** A sample item, with the food it matches by name. The sample day file itself is not changed. */
export interface SampleItemInfo {
  item: MockFoodItem;
  mealSlot: MealSlot;
  food: FoodItem | null;
  grams: number | null;
}

export function resolveSampleItems(day: Pick<MockDayData, "meals">, foods: FoodItem[] = MOCK_FOODS): SampleItemInfo[] {
  return day.meals.flatMap((meal) =>
    meal.items.map((item) => {
      const food = foods.find((f) => f.nameVi === item.name) ?? null;
      return { item, mealSlot: SAMPLE_SLOT[meal.slot], food, grams: food ? sampleGrams(food, item.qty) : null };
    })
  );
}

export const SAMPLE_ITEMS = resolveSampleItems(SAMPLE_DAY);

/** What the user changed on a sample item. Only the fields that changed are stored. */
export interface SampleEdit {
  grams?: number;
  servingLabel?: string;
  mealSlot?: MealSlot;
  deleted?: boolean;
}

export type SampleEdits = Record<string, SampleEdit>;

const MEAL_IDS = new Set<string>(MEAL_SLOTS.map((s) => s.id));

/** Reads the saved added entries. Bad JSON, or a value that is not a list of entries, gives an empty list. */
export function parseAddedEntries(raw: string | null): AddedDiaryEntry[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e): e is AddedDiaryEntry => typeof e === "object" && e !== null && typeof (e as { id?: unknown }).id === "string"
    );
  } catch {
    return [];
  }
}

/** Reads the saved edits. Bad JSON gives no edits, and a bad value drops only that field. */
export function parseSampleEdits(raw: string | null): SampleEdits {
  if (!raw) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {};
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {};

  const out: SampleEdits = {};
  for (const [id, value] of Object.entries(parsed)) {
    if (typeof value !== "object" || value === null) continue;
    const v = value as Record<string, unknown>;
    const edit: SampleEdit = {};
    if (typeof v.grams === "number" && Number.isFinite(v.grams) && v.grams > 0) edit.grams = v.grams;
    if (typeof v.servingLabel === "string" && v.servingLabel.trim()) edit.servingLabel = v.servingLabel;
    if (typeof v.mealSlot === "string" && MEAL_IDS.has(v.mealSlot)) edit.mealSlot = v.mealSlot as MealSlot;
    if (v.deleted === true) edit.deleted = true;
    if (Object.keys(edit).length > 0) out[id] = edit;
  }
  return out;
}

/** How a sample item looks after its edit. */
export interface SampleEffect {
  deleted: boolean;
  mealSlot: MealSlot;
  qty: string;
  kcal: number;
  /** Nutrition as it now stands. Null when it cannot be read, or the item is deleted. */
  numbers: EntryNumbers | null;
}

export function sampleEffect(info: SampleItemInfo, edit: SampleEdit = {}): SampleEffect {
  const mealSlot = edit.mealSlot ?? info.mealSlot;
  if (edit.deleted) return { deleted: true, mealSlot, qty: info.item.qty, kcal: 0, numbers: null };
  if (info.food && info.grams !== null && edit.grams !== undefined) {
    const numbers = entryNumbers(info.food, edit.grams);
    return { deleted: false, mealSlot, qty: edit.servingLabel ?? `${edit.grams} g`, kcal: numbers.calories, numbers };
  }
  const numbers = info.food && info.grams !== null ? entryNumbers(info.food, info.grams) : null;
  return { deleted: false, mealSlot, qty: info.item.qty, kcal: info.item.kcal, numbers };
}

/** The part of a day total that one entry or item adds: calories, macros and the full nutrient record. */
export interface Amounts {
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
  fiber: number;
  nutrients: Record<string, number>;
}

const NO_AMOUNTS: Amounts = { calories: 0, carbs: 0, protein: 0, fat: 0, fiber: 0, nutrients: {} };

function numericNutrients(nutrients: Record<string, number | null>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [key, val] of Object.entries(nutrients)) {
    if (typeof val === "number") out[key] = val;
  }
  return out;
}

export function amountsOfNumbers(n: EntryNumbers | null): Amounts {
  if (!n) return NO_AMOUNTS;
  return {
    calories: n.calories,
    carbs: n.carbs,
    protein: n.protein,
    fat: n.fat,
    fiber: n.fiber,
    nutrients: numericNutrients(n.nutrients),
  };
}

export function addAmounts(a: Amounts, b: Amounts, sign = 1): Amounts {
  const nutrients = { ...a.nutrients };
  for (const [key, val] of Object.entries(b.nutrients)) {
    nutrients[key] = (nutrients[key] ?? 0) + sign * val;
  }
  return {
    calories: a.calories + sign * b.calories,
    carbs: a.carbs + sign * b.carbs,
    protein: a.protein + sign * b.protein,
    fat: a.fat + sign * b.fat,
    fiber: a.fiber + sign * b.fiber,
    nutrients,
  };
}

/**
 * How much a sample item moves the day total from its sample amount: the edited amount minus the sample amount.
 * Calories are measured against the item's kcal, so the day total always equals the sum of its meal items.
 */
export function sampleDelta(info: SampleItemInfo, effect: SampleEffect): Amounts {
  const before = amountsOfNumbers(info.food && info.grams !== null ? entryNumbers(info.food, info.grams) : null);
  const after = amountsOfNumbers(effect.numbers);
  return { ...addAmounts(after, before, -1), calories: effect.kcal - info.item.kcal };
}

export const NOT_IN_CATALOG = "Món này chưa có trong danh mục, nên không đổi khẩu phần được.";

/** One entry as the edit screen sees it. */
export interface EntryView {
  id: string;
  name: string;
  food: FoodItem | null;
  grams: number | null;
  servingLabel: string;
  mealSlot: MealSlot;
  kcal: number;
  canChangePortion: boolean;
  portionNote: string | null;
}

export interface DiaryEdits {
  added: AddedDiaryEntry[];
  sample: SampleEdits;
  /** The last delete, kept only until the undo toast goes. */
  undo: UndoRecord | null;
}

export type UndoRecord =
  | { kind: "added"; name: string; entry: AddedDiaryEntry; index: number }
  | { kind: "sample"; name: string; id: string };

export interface EntryPatch {
  grams?: number;
  servingLabel?: string;
  mealSlot?: MealSlot;
}

export function findEntry(edits: DiaryEdits, id: string, samples: SampleItemInfo[] = SAMPLE_ITEMS): EntryView | null {
  const added = edits.added.find((e) => e.id === id);
  if (added) {
    const food = MOCK_FOODS.find((f) => f.id === added.foodId) ?? null;
    return {
      id,
      name: added.foodName,
      food,
      grams: added.grams,
      servingLabel: added.displayQty,
      mealSlot: added.mealSlot,
      kcal: added.calories,
      canChangePortion: food !== null,
      portionNote: food ? null : NOT_IN_CATALOG,
    };
  }

  const info = samples.find((s) => s.item.id === id);
  if (!info) return null;
  const edit = edits.sample[id];
  const effect = sampleEffect(info, edit);
  if (effect.deleted) return null;
  const canChangePortion = info.food !== null && info.grams !== null;
  return {
    id,
    name: info.item.name,
    food: info.food,
    grams: edit?.grams ?? info.grams,
    servingLabel: effect.qty,
    mealSlot: effect.mealSlot,
    kcal: effect.kcal,
    canChangePortion,
    portionNote: canChangePortion ? null : NOT_IN_CATALOG,
  };
}

/** Changes the meal, and the portion when it can change. A portion change on an item that cannot change is ignored. */
export function updateEntryIn(edits: DiaryEdits, id: string, patch: EntryPatch, samples: SampleItemInfo[] = SAMPLE_ITEMS): DiaryEdits {
  const view = findEntry(edits, id, samples);
  if (!view) return edits;

  const mealSlot = patch.mealSlot ?? view.mealSlot;
  const grams = view.canChangePortion && patch.grams !== undefined && patch.grams > 0 ? patch.grams : null;

  const added = edits.added.find((e) => e.id === id);
  if (added) {
    const updated: AddedDiaryEntry =
      grams !== null && view.food
        ? { ...added, mealSlot, grams, displayQty: patch.servingLabel ?? `${grams} g`, ...entryNumbers(view.food, grams) }
        : { ...added, mealSlot };
    return { ...edits, added: edits.added.map((e) => (e.id === id ? updated : e)) };
  }

  const edit: SampleEdit = { ...edits.sample[id], mealSlot };
  if (grams !== null) {
    edit.grams = grams;
    edit.servingLabel = patch.servingLabel ?? `${grams} g`;
  }
  return { ...edits, sample: { ...edits.sample, [id]: edit } };
}

/** Removes the entry, and keeps it for one undo. A new delete replaces the last one. */
export function deleteEntryIn(edits: DiaryEdits, id: string, samples: SampleItemInfo[] = SAMPLE_ITEMS): DiaryEdits {
  const view = findEntry(edits, id, samples);
  if (!view) return edits;

  const added = edits.added.find((e) => e.id === id);
  if (added) {
    return {
      ...edits,
      added: edits.added.filter((e) => e.id !== id),
      undo: { kind: "added", name: added.foodName, entry: added, index: edits.added.indexOf(added) },
    };
  }
  return {
    ...edits,
    sample: { ...edits.sample, [id]: { ...edits.sample[id], deleted: true } },
    undo: { kind: "sample", name: view.name, id },
  };
}

/** Puts the last deleted entry back where it was. Does nothing once the undo is gone. */
export function undoDeleteIn(edits: DiaryEdits): DiaryEdits {
  const undo = edits.undo;
  if (!undo) return edits;

  if (undo.kind === "added") {
    const added = [...edits.added];
    added.splice(Math.min(undo.index, added.length), 0, undo.entry);
    return { ...edits, added, undo: null };
  }

  const sample = { ...edits.sample };
  const restored: SampleEdit = { ...sample[undo.id] };
  delete restored.deleted;
  if (Object.keys(restored).length > 0) {
    sample[undo.id] = restored;
  } else {
    delete sample[undo.id];
  }
  return { ...edits, sample, undo: null };
}

export function dismissUndoIn(edits: DiaryEdits): DiaryEdits {
  return edits.undo ? { ...edits, undo: null } : edits;
}
