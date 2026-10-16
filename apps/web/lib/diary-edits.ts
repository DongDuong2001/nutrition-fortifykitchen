import { MOCK_FOODS, type FoodItem } from "./mock/foods";
import { SAMPLE_DAY, type MockDayData, type MockFoodItem } from "./mock/sample-day";
import { MEAL_SLOTS, getMealSlotNameVi, type MealSlot } from "./meal-slot";
import { scaleNutrients } from "./portion";
import { formatAmount } from "./format";

/** A diary entry the user added (from /add or the food detail page). */
export interface AddedDiaryEntry {
  id: string;
  /** "quick": a kcal-only entry (Chỉ ghi kcal) with no food and no micronutrient values. */
  kind?: "quick";
  foodId: string;
  foodName: string;
  grams: number;
  displayQty: string;
  mealSlot: MealSlot;
  calories: number;
  /** Macros and fibre are null (unknown) on a quick kcal entry that left them blank. */
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  fiber: number | null;
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

/** Shown when a food with unknown energy is about to be logged: its kcal would read 0, which is not true. */
export const NO_ENERGY_MESSAGE = "Món này chưa có số kcal (một nguyên liệu chưa có dữ liệu năng lượng), nên chưa thể ghi vào nhật ký.";

/** Whether a food can be logged: its energy is a number. Unknown (null or missing) is never read as 0. */
export function hasEnergy(food: Pick<FoodItem, "nutrients">): boolean {
  return typeof food.nutrients.energy === "number";
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
    return { deleted: false, mealSlot, qty: edit.servingLabel ?? `${formatAmount(edit.grams, "g")} g`, kcal: numbers.calories, numbers };
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

/** An unknown (null) macro adds nothing to a total: totals sum known values only. */
export function amountsOfNumbers(
  n: (Omit<EntryNumbers, "protein" | "carbs" | "fat" | "fiber"> & Record<"protein" | "carbs" | "fat" | "fiber", number | null>) | null
): Amounts {
  if (!n) return NO_AMOUNTS;
  return {
    calories: n.calories,
    carbs: n.carbs ?? 0,
    protein: n.protein ?? 0,
    fat: n.fat ?? 0,
    fiber: n.fiber ?? 0,
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
  /** A kcal-only entry (Chỉ ghi kcal): its name and numbers are edited directly, there is no portion. */
  quick: { protein: number | null; carbs: number | null; fat: number | null } | null;
}

export interface DiaryEdits {
  added: AddedDiaryEntry[];
  sample: SampleEdits;
  /** The last delete, kept only until the undo toast goes. */
  undo: UndoRecord | null;
}

export type UndoRecord =
  | { kind: "added"; name: string; entry: AddedDiaryEntry; index: number }
  | { kind: "sample"; name: string; id: string }
  /** A whole meal: the added entries with their positions, and the sample items that were flagged deleted. */
  | { kind: "meal"; name: string; count: number; added: { entry: AddedDiaryEntry; index: number }[]; sampleIds: string[] };

export interface EntryPatch {
  grams?: number;
  servingLabel?: string;
  mealSlot?: MealSlot;
  /** New name and numbers of a quick entry. Ignored for any other entry. */
  quick?: { name: string; calories: number; protein: number | null; carbs: number | null; fat: number | null };
}

export function findEntry(edits: DiaryEdits, id: string, samples: SampleItemInfo[] = SAMPLE_ITEMS): EntryView | null {
  const added = edits.added.find((e) => e.id === id);
  if (added) {
    const isQuick = added.kind === "quick";
    const food = isQuick ? null : MOCK_FOODS.find((f) => f.id === added.foodId) ?? null;
    return {
      id,
      name: added.foodName,
      food,
      grams: isQuick ? null : added.grams,
      servingLabel: added.displayQty,
      mealSlot: added.mealSlot,
      kcal: added.calories,
      canChangePortion: food !== null,
      portionNote: isQuick || food ? null : NOT_IN_CATALOG,
      quick: isQuick ? { protein: added.protein, carbs: added.carbs, fat: added.fat } : null,
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
    quick: null,
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
    let updated: AddedDiaryEntry =
      grams !== null && view.food && hasEnergy(view.food)
        ? { ...added, mealSlot, grams, displayQty: patch.servingLabel ?? `${formatAmount(grams, "g")} g`, ...entryNumbers(view.food, grams) }
        : { ...added, mealSlot };
    if (added.kind === "quick" && patch.quick) {
      const { name, calories, protein, carbs, fat } = patch.quick;
      updated = { ...updated, foodName: name.trim() || added.foodName, calories, protein, carbs, fat };
    }
    return { ...edits, added: edits.added.map((e) => (e.id === id ? updated : e)) };
  }

  const edit: SampleEdit = { ...edits.sample[id], mealSlot };
  if (grams !== null) {
    edit.grams = grams;
    edit.servingLabel = patch.servingLabel ?? `${formatAmount(grams, "g")} g`;
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

/** The ids of the entries that are in a meal now (sample items with their edits applied, then added entries). */
export function mealEntryIds(edits: DiaryEdits, slot: MealSlot, samples: SampleItemInfo[] = SAMPLE_ITEMS): string[] {
  const fromSamples = samples.flatMap((info) => {
    const effect = sampleEffect(info, edits.sample[info.item.id]);
    return !effect.deleted && effect.mealSlot === slot ? [info.item.id] : [];
  });
  return [...fromSamples, ...edits.added.filter((e) => e.mealSlot === slot).map((e) => e.id)];
}

/** Removes every entry of a meal, and keeps them for one undo (a new delete replaces it). Nothing to remove: no change. */
export function deleteMealIn(edits: DiaryEdits, slot: MealSlot, samples: SampleItemInfo[] = SAMPLE_ITEMS): DiaryEdits {
  const ids = mealEntryIds(edits, slot, samples);
  if (ids.length === 0) return edits;

  const added = edits.added.flatMap((entry, index) => (entry.mealSlot === slot ? [{ entry, index }] : []));
  const addedIds = new Set(added.map((a) => a.entry.id));
  const sampleIds = ids.filter((id) => !addedIds.has(id));
  const sample = { ...edits.sample };
  for (const id of sampleIds) sample[id] = { ...sample[id], deleted: true };

  return {
    ...edits,
    added: edits.added.filter((e) => e.mealSlot !== slot),
    sample,
    undo: { kind: "meal", name: getMealSlotNameVi(slot), count: ids.length, added, sampleIds },
  };
}

/**
 * Removes the chosen entries (unknown or already deleted ids are skipped) and keeps them for ONE undo, which puts
 * them all back where they were. Nothing to remove: no change.
 */
export function deleteEntriesIn(edits: DiaryEdits, ids: readonly string[], samples: SampleItemInfo[] = SAMPLE_ITEMS): DiaryEdits {
  const wanted = new Set(ids);
  const live = [...wanted].filter((id) => findEntry(edits, id, samples) !== null);
  if (live.length === 0) return edits;
  const liveSet = new Set(live);

  const added = edits.added.flatMap((entry, index) => (liveSet.has(entry.id) ? [{ entry, index }] : []));
  const addedIds = new Set(added.map((a) => a.entry.id));
  const sampleIds = live.filter((id) => !addedIds.has(id));
  const sample = { ...edits.sample };
  for (const id of sampleIds) sample[id] = { ...sample[id], deleted: true };

  return {
    ...edits,
    added: edits.added.filter((e) => !liveSet.has(e.id)),
    sample,
    undo: { kind: "meal", name: "Các món đã chọn", count: live.length, added, sampleIds },
  };
}

/** Where the entries that a move would change are now: one record per entry, so a move can be put back. */
export interface SlotMove {
  id: string;
  slot: MealSlot;
}

/** The current meal of each chosen entry that is not in `target` yet (unknown ids are skipped). */
export function slotsBeforeMove(edits: DiaryEdits, ids: readonly string[], target: MealSlot, samples: SampleItemInfo[] = SAMPLE_ITEMS): SlotMove[] {
  return [...new Set(ids)].flatMap((id) => {
    const view = findEntry(edits, id, samples);
    return view && view.mealSlot !== target ? [{ id, slot: view.mealSlot }] : [];
  });
}

/** Puts each entry back in the meal it came from. Entries that have since been deleted are skipped. */
export function restoreSlotsIn(edits: DiaryEdits, moves: readonly SlotMove[], samples: SampleItemInfo[] = SAMPLE_ITEMS): DiaryEdits {
  return moves.reduce((acc, m) => updateEntryIn(acc, m.id, { mealSlot: m.slot }, samples), edits);
}

/** Moves the chosen entries to another meal of the day. Ids that are unknown are skipped. */
export function moveEntriesIn(edits: DiaryEdits, ids: readonly string[], slot: MealSlot, samples: SampleItemInfo[] = SAMPLE_ITEMS): DiaryEdits {
  return ids.reduce((acc, id) => updateEntryIn(acc, id, { mealSlot: slot }, samples), edits);
}

/** Puts the last deleted entry back where it was. Does nothing once the undo is gone. */
export function undoDeleteIn(edits: DiaryEdits): DiaryEdits {
  const undo = edits.undo;
  if (!undo) return edits;

  if (undo.kind === "meal") {
    // Positions were taken from the list before the delete, so put them back from the front
    const added = [...edits.added];
    for (const { entry, index } of undo.added) added.splice(Math.min(index, added.length), 0, entry);
    const sample = { ...edits.sample };
    for (const id of undo.sampleIds) {
      const restored: SampleEdit = { ...sample[id] };
      delete restored.deleted;
      if (Object.keys(restored).length > 0) sample[id] = restored;
      else delete sample[id];
    }
    return { ...edits, added, sample, undo: null };
  }

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

/** Takes out the added entries with these ids. Used to undo a copy. */
export function removeAddedIn(edits: DiaryEdits, ids: string[]): DiaryEdits {
  const drop = new Set(ids);
  return { ...edits, added: edits.added.filter((e) => !drop.has(e.id)) };
}

/** A food of a meal with the portion it holds now. Quick kcal entries and items outside the catalogue have none. */
export interface MealPortion {
  foodId: string;
  servingLabel: string;
  grams: number;
}

/** The foods of a meal of today as they stand now (sample items with edits applied, then added entries). */
export function mealPortions(edits: DiaryEdits, slot: MealSlot, samples: SampleItemInfo[] = SAMPLE_ITEMS): MealPortion[] {
  const fromSamples = samples.flatMap((info): MealPortion[] => {
    const edit = edits.sample[info.item.id];
    const effect = sampleEffect(info, edit);
    if (effect.deleted || effect.mealSlot !== slot || !info.food) return [];
    const grams = edit?.grams ?? info.grams;
    return grams === null ? [] : [{ foodId: info.food.id, servingLabel: effect.qty, grams }];
  });
  const fromAdded = edits.added
    .filter((e) => e.mealSlot === slot && e.kind !== "quick")
    .map((e) => ({ foodId: e.foodId, servingLabel: e.displayQty, grams: e.grams }));
  return [...fromSamples, ...fromAdded];
}
