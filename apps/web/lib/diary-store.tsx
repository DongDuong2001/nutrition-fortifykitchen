"use client";

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from "react";
import { usePathname } from "next/navigation";
import { currentAccountId } from "./auth-actions";
import { SAMPLE_DAY, type MockDayData, type MockFoodItem } from "./mock/sample-day";
import { type FoodItem } from "./mock/foods";
import { type MealSlot, getMealSlotNameVi } from "./meal-slot";
import { formatAmount } from "./format";
import { sumKcal } from "./kcal";
import { getTodayIsoVN, withRuntimeDate } from "./date";
import { DAY_ARCHIVE_KEY, mergeArchive, msUntilNextDay, parseArchive, splitByDay, type DayArchive } from "./day-archive";
import { isDemo, setDemoActive } from "./demo";
import {
  ADDED_ENTRIES_KEY,
  RECENT_FOODS_KEY,
  SAMPLE_EDITS_KEY,
  adoptLegacyKeys,
  browserLocal,
  browserSession,
  keyedStorage,
  type KeyValueStore,
} from "./storage-keys";
import { blankDay, dayEntries, setDayArchive, statDisplay } from "./day-history";
import { totalsFromEntries } from "./day-totals";
import { microsSummaryFor } from "./lacking";
import { nutrientSourcesIn, type NutrientSource } from "./nutrient-sources";
import { DEFAULT_RECENT_FOODS, isRecentFood, pushRecent, type RecentFood } from "./recent-foods";
import { MOCK_FOODS } from "./mock/foods";
import { syncRecipeFoods } from "./recipe-store";
import { personaPatch } from "./demo-persona";
import { isLiveMode } from "./api-mode";
import { apiClient, dropOfflineEntry, syncOfflineOutbox } from "./api-client";
import { syncServerSession } from "./server-session";
import { generateUuid, isUuid } from "./uuid";
import {
  buildSavedMeal,
  defaultMealName,
  itemsFromEntries,
  readSavedMeals,
  removeSavedMeal,
  renameSavedMeal as renameSavedMealIn,
  savedMealEntries,
  savedMealSkipped,
  writeSavedMeals,
  type SavedMeal,
} from "./saved-meals";
import { quickDetail, quickEntryFrom, type QuickEntryInput, type QuickEntryResult } from "./quick-entry";
import { readFavouriteIds, toggleFavouriteId, writeFavouriteIds } from "./favourites";
import {
  SAMPLE_PROFILE,
  applyProfileTargets,
  loadProfile,
  normaliseProfile,
  targetsFor,
  writeStoredProfile,
  type Profile,
} from "./profile";
import type { CompleteTargets } from "./targets";
import {
  type AddedDiaryEntry,
  type Amounts,
  type DiaryEdits,
  type EntryPatch,
  type EntryView,
  type SampleEdits,
  addAmounts,
  amountsOfNumbers,
  deleteEntryIn,
  deleteMealIn,
  deleteEntriesIn,
  moveEntriesIn,
  restoreSlotsIn,
  slotsBeforeMove,
  type SlotMove,
  dismissUndoIn,
  entryNumbers,
  hasEnergy,
  NO_ENERGY_MESSAGE,
  findEntry,
  mealEntryIds,
  mealPortions,
  parseAddedEntries,
  parseSampleEdits,
  removeAddedIn,
  resolveSampleItems,
  SAMPLE_ITEMS,
  SAMPLE_SLOT,
  sampleDelta,
  sampleEffect,
  undoDeleteIn,
  updateEntryIn,
} from "./diary-edits";

export type { AddedDiaryEntry, EntryView, EntryPatch } from "./diary-edits";

/**
 * The one toast of the app. "added" offers Xem (jump to the meal), "deleted" offers Hoàn tác,
 * "undoable" offers Hoàn tác for the entries one action added (undoIds: a copy, a recent, a Bữa ăn của tôi),
 * and "saved" offers Xem (Bữa ăn của tôi in Khám phá).
 */
export interface ToastInfo {
  message: string;
  kind: "added" | "deleted" | "undoable" | "saved" | "moved" | "notice";
  mealSlot: MealSlot | null;
  /** How long it stays. A delete or a copy stays 5 s, which is also the undo window. */
  durationMs: number;
  undoIds?: string[];
  /** "moved": where each moved entry was, for Hoàn tác. */
  undoMoves?: SlotMove[];
}

/** A "deleted" toast kept on screen under a newer one, until `expiresAt` (ms since epoch). */
export interface ParkedToast {
  toast: ToastInfo;
  expiresAt: number;
}

const ADDED_TOAST_MS = 4000;
const UNDO_TOAST_MS = 5000;
const NOTICE_TOAST_MS = 6000;

interface DiaryContextValue {
  data: MockDayData;
  addedEntries: AddedDiaryEntry[];
  /** `undoable` is the one-tap add of a recent: the toast offers Hoàn tác for 5 s instead of Xem. */
  addFoodEntry: (
    food: FoodItem,
    grams: number,
    mealSlot: MealSlot,
    servingLabel?: string,
    options?: { undoable?: boolean }
  ) => Promise<boolean>;
  /** The add tray: every item in one diary update and one toast whose Hoàn tác removes them all. False when an item has no energy figure. */
  addFoodEntries: (items: Array<{ food: FoodItem; grams: number; label: string }>, mealSlot: MealSlot) => boolean;
  recentFoods: RecentFood[];
  addRecentFood: (food: FoodItem, servingLabel: string) => void;
  toast: ToastInfo | null;
  dismissToast: () => void;
  highlightedMeal: MealSlot | null;
  setHighlightedMeal: (meal: MealSlot | null) => void;
  /** Newest favourite first. Loaded after mount from localStorage (see lib/favourites.ts). */
  favouriteIds: string[];
  isFavourite: (foodId: string) => boolean;
  toggleFavourite: (food: FoodItem) => void;
  /** An added entry or a sample item, with its edits applied. Null if unknown or deleted. */
  getEntry: (id: string) => EntryView | null;
  /** Changes the meal, and the portion when the entry can change portion. */
  updateEntry: (id: string, patch: EntryPatch) => void;
  deleteEntry: (id: string) => void;
  /** Removes every entry of a meal of today, with one undo toast (Hoàn tác puts the whole meal back). */
  deleteMeal: (slot: MealSlot) => void;
  /**
   * Removes the chosen entries of today with ONE undo toast (Hoàn tác puts them all back). `dayIso` is the day the ids
   * were picked on: anything but today is a read-only past day and nothing is removed.
   */
  deleteEntries: (ids: string[], dayIso: string) => void;
  /** Moves the chosen entries of today to a meal of today. Like deleteEntries, a past `dayIso` does nothing. */
  moveEntries: (ids: string[], slot: MealSlot, dayIso: string) => void;
  /** Puts the entries of the last Chuyển bữa back. Only works while the "moved" toast is shown. */
  undoMove: () => void;
  /** Puts the last deleted entry back. Only works while the "deleted" toast is shown. */
  undoLastDelete: () => void;
  /** A delete's toast that a Chuyển bữa toast pushed aside: still shown under it with its own time left. */
  parkedDelete: ParkedToast | null;
  /** Hoàn tác of the parked delete. Leaves the toast on top alone. */
  undoParkedDelete: () => void;
  /** Adds copied entries to today in one step, with one undo toast. Existing entries are kept. */
  copyEntries: (entries: AddedDiaryEntry[], message: string) => void;
  /** Takes out the entries of the last add or copy. Only works while the "undoable" toast is shown. */
  undoCopy: () => void;
  /** Bữa ăn của tôi, newest first. Loaded after mount from localStorage (see lib/saved-meals.ts). */
  savedMeals: SavedMeal[];
  /**
   * Saves the foods of a meal (today or a past day) as a Bữa ăn của tôi. Returns false when the meal holds
   * no food to save (empty, or only quick kcal entries).
   */
  saveMealAs: (slot: MealSlot, iso: string, name: string) => boolean;
  /** The foods a meal of that day would save: none for an empty meal or one of only quick kcal entries. */
  mealFoods: (slot: MealSlot, iso: string) => { foodId: string; servingLabel: string; grams: number }[];
  renameSavedMeal: (id: string, name: string) => void;
  deleteSavedMeal: (id: string) => void;
  /** One tap: adds every food of the saved meal to a meal of today, with one undo toast for all of them. */
  addSavedMeal: (meal: SavedMeal, slot: MealSlot) => void;
  /** Chỉ ghi kcal: adds a quick entry with unknown micronutrients, with an undo toast. */
  addQuickEntry: (input: QuickEntryInput, slot: MealSlot) => QuickEntryResult;
  /** Today as YYYY-MM-DD (Asia/Ho_Chi_Minh). Null until mounted. */
  todayIso: string | null;
  /** Earlier days the user logged, by date; memo dependency for anything that calls dayEntries. */
  dayArchive: DayArchive;
  hydrated: boolean;
  /** Demo mode (see lib/demo): the sample day, history and Gần đây are loaded. Off for a real account. */
  demo: boolean;
  /** The profile the targets come from. Loaded after mount (see lib/profile.ts). */
  profile: Profile;
  /** Daily targets for the profile. Today, Micros and the portion panels read these. */
  targets: CompleteTargets;
  /** Changes part of the profile and saves it. Targets and the day follow. */
  updateProfile: (patch: Partial<Profile>) => void;
  /** The foods of today that add to one nutrient, largest first. Read by the Vi chất detail. */
  nutrientSources: (key: string) => NutrientSource[];
}

const DiaryContext = createContext<DiaryContextValue | null>(null);


/**
 * Pure aggregation function for daily totals.
 * In production, Dong's backend API will compute and return real aggregated totals.
 */
export function computeCompositeDayData(
  baseDay: MockDayData,
  addedEntries: AddedDiaryEntry[],
  sampleEdits: SampleEdits = {}
): MockDayData {
  const samples = resolveSampleItems(baseDay);
  const effects = samples.map((info) => ({ info, effect: sampleEffect(info, sampleEdits[info.item.id]) }));
  if (addedEntries.length === 0 && Object.keys(sampleEdits).length === 0) {
    // Untouched sample day: its items still carry their macros for the meta line
    const meals = baseDay.meals.map((meal) => ({
      ...meal,
      items: meal.items.map((it) => {
        const n = effects.find((e) => e.info.item.id === it.id)?.effect.numbers;
        return n ? { ...it, macros: { protein: n.protein, carbs: n.carbs, fat: n.fat } } : it;
      }),
    }));
    return { ...baseDay, meals, microsSummary: microsSummaryFor(baseDay) };
  }

  // What the added entries and the edited sample items add on top of the sample day
  let extra: Amounts = { calories: 0, carbs: 0, protein: 0, fat: 0, fiber: 0, nutrients: {} };
  for (const entry of addedEntries) {
    extra = addAmounts(extra, amountsOfNumbers(entry));
  }
  const addedOnly = extra;
  for (const { info, effect } of effects) {
    extra = addAmounts(extra, sampleDelta(info, effect));
  }
  // Every sample item deleted: the hand-set sample totals no longer stand for anything, so macros and nutrients
  // are the added entries alone (kcal stays base minus what the deleted items held, as before).
  const sampleGone = effects.length > 0 && effects.every((e) => e.effect.deleted);
  if (sampleGone) extra = { ...addedOnly, calories: extra.calories };
  const extraCals = extra.calories;
  const extraCarbs = extra.carbs;
  const extraProtein = extra.protein;
  const extraFat = extra.fat;
  const extraFiber = extra.fiber;
  const extraNutrients = extra.nutrients;

  // The sample day's totals are hand-set, not the sum of its items, so subtracting an item can overshoot. Two rules
  // keep every amount honest: nothing goes below 0, and once no sample item is left, a macro or nutrient that no
  // added entry carries is unknown (null, shown as a dash), not 0 and not a leftover of the hand-set total.
  const remaining = [
    ...effects.filter((e) => !e.effect.deleted).map((e) => e.effect.numbers),
    ...addedEntries,
  ];
  const hasMacro = (key: "protein" | "carbs" | "fat" | "fiber") =>
    !sampleGone || remaining.some((n) => n !== null && typeof n[key] === "number");
  const hasNutrient = (key: string) =>
    !sampleGone || remaining.some((n) => n !== null && typeof n.nutrients[key] === "number");
  const unknown = <S extends MockDayData["macros"][number] | MockDayData["minerals"][number]>(stat: S): S => ({
    ...stat,
    consumed: null,
    percentage: null,
    displayValue: statDisplay(0, stat).replace(/^0/, "—"),
  });

  // 1. Calories
  // Unknown kcal (an entry the server stored with NULL) adds nothing; when every food of the day is unknown the
  // total is unknown too (null, shown as a dash), not 0
  const keptKcals = [...effects.filter((e) => !e.effect.deleted).map((e) => e.effect.kcal), ...addedEntries.map((e) => e.calories)];
  const kcalUnknown = keptKcals.length > 0 && keptKcals.every((k) => k === null);
  const totalConsumedCals = kcalUnknown ? null : Math.max(0, (baseDay.calories.consumed ?? 0) + extraCals);
  const remainingCals = Math.max(0, baseDay.calories.targetMin - (totalConsumedCals ?? 0));
  const calPercentage = totalConsumedCals === null ? 0 : Math.round((totalConsumedCals / baseDay.calories.targetMin) * 100);

  // 2. Macros
  const updatedMacros = baseDay.macros.map((m) => {
    let extra = 0;
    if (m.key === "protein") extra = extraProtein;
    else if (m.key === "carbs") extra = extraCarbs;
    else if (m.key === "fat") extra = extraFat;
    else if (m.key === "fiber") extra = extraFiber;
    // Unknown stays unknown until an entry carries a value for it (a kcal-only entry adds no protein)
    if (m.consumed === null && extra === 0) return m;
    if (m.key === "protein" || m.key === "carbs" || m.key === "fat" || m.key === "fiber") {
      if (!hasMacro(m.key)) return unknown(m);
    }

    const baseConsumed = sampleGone ? 0 : m.consumed ?? 0;
    const newConsumed = Math.max(0, Math.round(baseConsumed + extra));
    const targetMin = m.targetMin ?? 0;
    const percentage = targetMin > 0 ? Math.round((newConsumed / targetMin) * 100) : 0;
    const displayValue = statDisplay(newConsumed, m);

    return {
      ...m,
      consumed: newConsumed,
      percentage,
      displayValue,
    };
  });

  // 3. Meals: sample items that stay (in sample order, with their edited meal, amount and kcal), then added entries
  const itemsBySlot = new Map<MealSlot, MockFoodItem[]>();
  const addItem = (slot: MealSlot, item: MockFoodItem) => {
    const list = itemsBySlot.get(slot);
    if (list) {
      list.push(item);
    } else {
      itemsBySlot.set(slot, [item]);
    }
  };
  for (const { info, effect } of effects) {
    if (!effect.deleted) {
      addItem(effect.mealSlot, {
        id: info.item.id,
        name: info.item.name,
        qty: effect.qty,
        kcal: effect.kcal,
        ...(effect.numbers ? { macros: { protein: effect.numbers.protein, carbs: effect.numbers.carbs, fat: effect.numbers.fat } } : {}),
      });
    }
  }
  for (const e of addedEntries) {
    addItem(e.mealSlot, {
      id: e.id,
      name: e.foodName,
      qty: e.displayQty,
      kcal: e.calories,
      macros: { protein: e.protein, carbs: e.carbs, fat: e.fat },
      ...(e.kind === "quick" ? { detail: quickDetail(e) } : {}),
    });
  }

  const updatedMeals = baseDay.meals.map((meal) => {
    const items = itemsBySlot.get(SAMPLE_SLOT[meal.slot]) ?? [];
    return {
      ...meal,
      items,
      kcal: items.length === 0 ? 0 : sumKcal(items.map((it) => it.kcal)),
    };
  });

  // 4. Nutrients record (for Micros page)
  const compositeNutrients: Record<string, number | null> = { ...(baseDay.nutrients || {}) };
  if (sampleGone) for (const key of Object.keys(compositeNutrients)) compositeNutrients[key] = null;
  for (const [key, extraVal] of Object.entries(extraNutrients)) {
    const current = compositeNutrients[key];
    if (current !== null && current !== undefined) {
      compositeNutrients[key] = Math.max(0, current + extraVal);
    } else if (extraVal > 0) {
      compositeNutrients[key] = extraVal;
    }
  }
  for (const key of Object.keys(compositeNutrients)) {
    if (!hasNutrient(key)) compositeNutrients[key] = null;
  }

  // 5. Update Minerals & Vitamins arrays (e.g. Kali, Vitamin B6)
  const updatedMinerals = baseDay.minerals.map((m) => {
    if (!hasNutrient(m.key)) return m.consumed === null ? m : unknown(m);
    const extra = extraNutrients[m.key] ?? 0;
    if (extra === 0) return m;

    const baseConsumed = sampleGone ? 0 : m.consumed ?? 0;
    const newConsumed = Math.max(0, Math.round(baseConsumed + extra));
    const targetMin = m.targetMin ?? 0;
    const percentage = targetMin > 0 ? Math.round((newConsumed / targetMin) * 100) : 0;
    const displayValue = statDisplay(newConsumed, m);

    return {
      ...m,
      consumed: newConsumed,
      percentage,
      displayValue,
    };
  });

  const updatedVitamins = baseDay.vitamins.map((v) => {
    if (!hasNutrient(v.key)) return v.consumed === null ? v : unknown(v);
    const extra = extraNutrients[v.key] ?? 0;
    if (extra === 0) return v;

    const baseConsumed = sampleGone ? 0 : v.consumed ?? 0;
    const newConsumed = Math.max(0, Math.round((baseConsumed + extra) * 100) / 100);
    const targetMin = v.targetMin ?? 0;
    const percentage = targetMin > 0 ? Math.round((newConsumed / targetMin) * 100) : 0;
    const displayValue =
      v.targetMin !== null
        ? `${formatAmount(newConsumed, v.unit)} / ${formatAmount(v.targetMin, v.unit)} ${v.unit}`
        : `${formatAmount(newConsumed, v.unit)} ${v.unit}`;

    return {
      ...v,
      consumed: newConsumed,
      percentage,
      displayValue,
    };
  });

  return {
    ...baseDay,
    calories: {
      ...baseDay.calories,
      consumed: totalConsumedCals,
      remaining: remainingCals,
      percentage: calPercentage,
    },
    macros: updatedMacros,
    meals: updatedMeals,
    minerals: updatedMinerals,
    vitamins: updatedVitamins,
    nutrients: compositeNutrients,
    microsSummary: microsSummaryFor({ minerals: updatedMinerals, vitamins: updatedVitamins }),
  };
}

/**
 * A past day as the Today screen shows it: nothing logged except the mock entries of that day (see day-history).
 * Targets follow the profile, the same as today.
 */
export function pastDayData(iso: string, todayIso: string, profile: Profile, targets: CompleteTargets): MockDayData {
  const base = blankDay(applyProfileTargets(SAMPLE_DAY, profile, targets));
  const entries = dayEntries(iso, todayIso);
  const day = computeCompositeDayData(base, entries, {});
  // Vitamins and minerals take the day's totals (lib/day-totals), so Nhật ký and Tổng quan show one number per day;
  // a nutrient no food of the day carries is unknown (null), not 0.
  const totals = totalsFromEntries(iso, entries);
  const fromTotals = <S extends MockDayData["minerals"][number]>(stat: S): S => {
    const consumed = totals.nutrients[stat.key] ?? null;
    const percentage =
      consumed !== null && stat.targetMin !== null && stat.targetMin > 0 ? Math.round((consumed / stat.targetMin) * 100) : null;
    return { ...stat, consumed, percentage, displayValue: consumed === null ? "—" : statDisplay(consumed, stat) };
  };
  const minerals = day.minerals.map(fromTotals);
  const vitamins = day.vitamins.map(fromTotals);
  return { ...day, minerals, vitamins, microsSummary: microsSummaryFor({ minerals, vitamins }), date: iso };
}

export function DiaryProvider({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [demo, setDemo] = useState(false);
  const [edits, setEdits] = useState<DiaryEdits>({ added: [], sample: {}, undo: null });
  const addedEntries = edits.added;
  // The sample day exists only in demo mode: without it no sample item can be found, edited or counted
  const samples = useMemo(() => (demo ? SAMPLE_ITEMS : []), [demo]);
  // Empty until mount; the sample recents are seeded only in demo mode
  const [recentFoods, setRecentFoods] = useState<RecentFood[]>([]);
  const [toast, setToast] = useState<ToastInfo | null>(null);
  const [parkedDelete, setParkedDelete] = useState<ParkedToast | null>(null);
  // When the toast on screen was set, so a delete's toast can keep its remaining time when it is parked
  const toastStartedAt = useRef(0);
  const [highlightedMeal, setHighlightedMeal] = useState<MealSlot | null>(null);
  const [favouriteIds, setFavouriteIds] = useState<string[]>([]);
  const [savedMeals, setSavedMeals] = useState<SavedMeal[]>([]);
  // Today's date, read after mount so the server and first client render agree
  const [todayIso, setTodayIso] = useState<string | null>(null);
  // Earlier days the user logged, filed by date (lib/day-archive); read by dayEntries for the history and Tổng quan
  const [archive, setArchive] = useState<DayArchive>({});
  // Same rule for the profile: the sample user until the saved one is read after mount
  const [profile, setProfile] = useState<Profile>(SAMPLE_PROFILE);

  // The signed-in account the data below belongs to; null when nobody is signed in (then nothing is read or
  // written). Demo mode ignores it: demo has its own keys.
  const [accountId, setAccountId] = useState<string | null>(null);
  const pathname = usePathname();

  // Reads one account's (or demo's) data into state. Everything is in localStorage under the account's keys; the
  // old unscoped keys and an old sessionStorage copy move to the first account that loads, once.
  const loadData = useCallback((account: string | null, demoNow: boolean, iso: string) => {
    const local = browserLocal();
    if (!demoNow && account) adoptLegacyKeys(local, browserSession(), account);
    const own = local ? keyedStorage(local, demoNow, account) : null;
    let added: AddedDiaryEntry[] = [];
    let sample: SampleEdits = {};
    let recents: RecentFood[] = demoNow ? DEFAULT_RECENT_FOODS : [];
    try {
      added = parseAddedEntries(own?.getItem(ADDED_ENTRIES_KEY) ?? null);
      sample = parseSampleEdits(own?.getItem(SAMPLE_EDITS_KEY) ?? null);
      const storedRecents = own?.getItem(RECENT_FOODS_KEY) ?? null;
      if (storedRecents) {
        const parsed: unknown = JSON.parse(storedRecents);
        if (Array.isArray(parsed) && parsed.length > 0) recents = parsed.filter(isRecentFood);
      }
    } catch {
      // Ignore storage access errors
    }
    // Entries of earlier days are filed by date in the same step, so today starts with today's entries only
    const split = splitByDay(added, iso);
    setEdits({ added: split.today, sample, undo: null });
    setArchive(mergeArchive(parseArchive(own?.getItem(DAY_ARCHIVE_KEY) ?? null), split.past));
    setRecentFoods(recents);
    setFavouriteIds(readFavouriteIds(own));
    setSavedMeals(readSavedMeals(own));
    // This account's recipes (cc-27b) become foods of the catalogue, so search and entries find them
    syncRecipeFoods();

    if (isLiveMode() && account && !demoNow) {
      // Entries saved while offline go up now (and again whenever the connection returns, see the online listener)
      syncOfflineOutbox().catch(() => {});
      apiClient.getDay(iso).then((daySummary) => {
        if (daySummary && Array.isArray(daySummary.meals)) {
          const serverEntries: AddedDiaryEntry[] = [];
          for (const meal of daySummary.meals) {
            for (const e of meal.entries || []) {
              serverEntries.push({
                id: e.id,
                foodId: e.food_id || "",
                foodName: e.food_name || "Món ăn",
                grams: e.grams,
                displayQty: e.serving_label || `${e.grams} g`,
                mealSlot: (e.meal_slot === "preworkout" ? "pre_workout" : e.meal_slot) as MealSlot,
                // A NULL kcal (unknown, migration 000011) stays null: it adds nothing to a total and is not shown as a measured 0
                calories: typeof e.calories === "number" ? e.calories : null,
                protein: (e.nutrients?.protein as number | null) ?? null,
                carbs: (e.nutrients?.carbs as number | null) ?? null,
                fat: (e.nutrients?.fat as number | null) ?? null,
                fiber: (e.nutrients?.fiber as number | null) ?? null,
                nutrients: (e.nutrients as Record<string, number | null>) ?? {},
                addedAt: e.created_at || new Date().toISOString(),
              });
            }
          }
          if (serverEntries.length > 0) {
            setEdits((prev) => {
              const existingIds = new Set(prev.added.map((it) => it.id));
              const toAdd = serverEntries.filter((se) => !existingIds.has(se.id));
              if (toAdd.length === 0) return prev;
              return {
                ...prev,
                added: [...prev.added, ...toAdd],
              };
            });
          }
        }
      }).catch(() => {});

      apiClient.getFavourites().then((favs) => {
        if (Array.isArray(favs) && favs.length > 0) {
          setFavouriteIds(favs.map((f: any) => (typeof f === "string" ? f : f.food_id || f.id)));
        }
      }).catch(() => {});

      apiClient.getRecents().then((rcnts) => {
        if (Array.isArray(rcnts) && rcnts.length > 0) {
          setRecentFoods(rcnts.map((f: any) => ({
            foodId: f.foodId || f.food_id || f.id,
            servingLabel: f.servingLabel || f.serving_label || f.servings?.[0]?.label || "100 g",
          })));
        }
      }).catch(() => {});

      apiClient.searchFoods("").catch(() => {});
    }
  }, []);

  // Load on mount (client-only)
  useEffect(() => {
    // Before anything that depends on today renders, so history and weights are in place with it
    const demoNow = isDemo();
    setDemoActive(demoNow);
    setDemo(demoNow);
    const account = currentAccountId();
    setAccountId(account);
    const iso = getTodayIsoVN();
    try {
      loadData(account, demoNow, iso);
    } finally {
      setTodayIso(iso);
      const loaded = loadProfile(new Date().getFullYear());
      // Demo mode only: ?as= and ?level= pick a mock account (lib/demo-persona). Applied before anything renders
      // from the role, so a gated page never flashes its 404 for the wrong account.
      const persona = demoNow ? personaPatch(window.location.search, isLiveMode()) : null;
      const seeded = persona ? { ...loaded, ...persona } : loaded;
      if (persona) writeStoredProfile(seeded);
      setProfile(seeded);
      if (isLiveMode() && account && !demoNow) {
        apiClient.getProfile().then((serverProfile) => {
          if (serverProfile) {
            writeStoredProfile(serverProfile);
            setProfile(serverProfile);
          }
        }).catch(() => {});
      }
      setHydrated(true);
    }
  }, [loadData]);

  // The connection came back: the entries queued offline go to the server
  useEffect(() => {
    if (!isLiveMode() || demo) return;
    const onOnline = () => {
      syncServerSession().then(() => syncOfflineOutbox()).catch(() => {});
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [demo]);

  // Another account signed in, or this one signed out (Đăng xuất keeps the data under its account): the
  // state of the account before is dropped and the new one's is read. The persist effects below then write to
  // the new keys, never the old data to the new account.
  useEffect(() => {
    if (!hydrated || demo) return;
    const now = currentAccountId();
    if (now === accountId) return;
    setAccountId(now);
    loadData(now, false, todayIso ?? getTodayIsoVN());
    // The profile is per account too: without this, account B would keep A's targets until a reload
    setProfile(loadProfile(new Date().getFullYear()));
    if (isLiveMode() && now) {
      apiClient.getProfile().then((serverProfile) => {
        if (serverProfile) {
          writeStoredProfile(serverProfile);
          setProfile(serverProfile);
        }
      }).catch(() => {});
    }
  }, [pathname, hydrated, demo, accountId, loadData, todayIso]);

  // The storage this account (or demo) writes to; without an account it reads and writes nothing
  const ownStorage = useCallback((): KeyValueStore | null => {
    const local = browserLocal();
    return local ? keyedStorage(local, demo, accountId) : null;
  }, [demo, accountId]);

  // Persist favourites only after hydrated
  useEffect(() => {
    if (!hydrated) return;
    writeFavouriteIds(favouriteIds, ownStorage());
  }, [favouriteIds, hydrated, ownStorage]);

  // Persist saved meals only after hydrated
  useEffect(() => {
    if (!hydrated) return;
    writeSavedMeals(savedMeals, ownStorage());
  }, [savedMeals, hydrated, ownStorage]);

  // Persist added entries and sample edits only after hydrated
  useEffect(() => {
    if (!hydrated) return;
    try {
      const own = ownStorage();
      own?.setItem(ADDED_ENTRIES_KEY, JSON.stringify(edits.added));
      own?.setItem(SAMPLE_EDITS_KEY, JSON.stringify(edits.sample));
    } catch {
      // Ignore quota/access errors
    }
  }, [edits.added, edits.sample, hydrated, ownStorage]);

  // The latest list and date, for the midnight timer (it must not restart on every added entry)
  const addedRef = useRef(edits.added);
  const todayIsoRef = useRef(todayIso);
  useEffect(() => {
    addedRef.current = edits.added;
    todayIsoRef.current = todayIso;
  }, [edits.added, todayIso]);

  // The date moved on (the app was open at midnight, or closed overnight): yesterday's entries leave today's list
  // and are filed by date, so the new day starts empty and the old one shows in the history
  useEffect(() => {
    if (!hydrated || !todayIso) return;
    const { today, past } = splitByDay(edits.added, todayIso);
    if (today === edits.added) return;
    setEdits((prev) => ({ ...prev, added: splitByDay(prev.added, todayIso).today }));
    setArchive((prev) => mergeArchive(prev, past));
  }, [hydrated, todayIso, edits.added]);

  // Persist the archive only after hydrated
  useEffect(() => {
    if (!hydrated) return;
    try {
      ownStorage()?.setItem(DAY_ARCHIVE_KEY, JSON.stringify(archive));
    } catch {
      // Ignore quota/access errors
    }
  }, [archive, hydrated, ownStorage]);

  // The clock reaches midnight while the app is open, or the tab comes back to the foreground on another day
  useEffect(() => {
    if (!hydrated) return;
    // Filing the earlier days and moving the date are one batch, so no screen sees the new date with old entries
    const refresh = () => {
      const now = getTodayIsoVN();
      if (now === todayIsoRef.current) return;
      const { today, past } = splitByDay(addedRef.current, now);
      if (today !== addedRef.current) {
        setEdits((prev) => ({ ...prev, added: splitByDay(prev.added, now).today }));
        setArchive((prev) => mergeArchive(prev, past));
      }
      setTodayIso(now);
    };
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      // One second after midnight, then again for the next one
      timer = setTimeout(() => {
        refresh();
        schedule();
      }, msUntilNextDay(new Date()) + 1000);
    };
    schedule();
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", refresh);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", refresh);
    };
  }, [hydrated]);

  // Persist recent foods only after hydrated
  useEffect(() => {
    if (!hydrated) return;
    // The sample recents are never saved: a real account must not inherit them when demo mode goes off
    if (recentFoods === DEFAULT_RECENT_FOODS) return;
    try {
      ownStorage()?.setItem(RECENT_FOODS_KEY, JSON.stringify(recentFoods));
    } catch {
      // Ignore
    }
  }, [recentFoods, hydrated, ownStorage]);

  useEffect(() => {
    toastStartedAt.current = Date.now();
  }, [toast]);

  // A parked delete lives until its time is up, or until its undo record is gone (another action dismissed it)
  useEffect(() => {
    if (!parkedDelete) return;
    if (!edits.undo) {
      setParkedDelete(null);
      return;
    }
    const timer = setTimeout(() => {
      setParkedDelete(null);
      setEdits((prev) => dismissUndoIn(prev));
    }, Math.max(0, parkedDelete.expiresAt - Date.now()));
    return () => clearTimeout(timer);
  }, [parkedDelete, edits.undo]);

  // Auto-dismiss the toast. When a "deleted" toast goes, the undo goes with it; a "moved" toast has its own undo
  // (in the toast) and leaves a delete's record alone.
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast(null);
      if (toast.kind !== "moved") setEdits((prev) => dismissUndoIn(prev));
    }, toast.durationMs);
    return () => clearTimeout(timer);
  }, [toast]);

  // Remember a food with the serving it was logged with
  const addRecentFood = useCallback((food: FoodItem, servingLabel: string) => {
    setRecentFoods((prev) => pushRecent(prev, { foodId: food.id, servingLabel }));
  }, []);

  // Add a food entry
  const addFoodEntry = useCallback(
    async (food: FoodItem, grams: number, mealSlot: MealSlot, servingLabel?: string, options?: { undoable?: boolean }) => {
      // Unknown energy is not 0: nothing is logged, and the caller shows NO_ENERGY_MESSAGE
      if (!hasEnergy(food)) return false;
      const numbers = entryNumbers(food, grams);
      const qty = servingLabel || `${formatAmount(grams, "g")} g`;

      const newEntry: AddedDiaryEntry = {
        id: generateUuid(),
        foodId: food.id,
        foodName: food.nameVi,
        grams,
        displayQty: qty,
        mealSlot,
        ...numbers,
        addedAt: new Date().toISOString(),
      };

      setEdits((prev) => ({ ...prev, added: [...prev.added, newEntry] }));

      const mealNameVi = getMealSlotNameVi(mealSlot);
      setEdits((prev) => dismissUndoIn(prev));
      setToast(
        options?.undoable
          ? {
              message: `Đã thêm ${food.nameVi} ${qty} vào ${mealNameVi}`,
              kind: "undoable",
              mealSlot,
              durationMs: UNDO_TOAST_MS,
              undoIds: [newEntry.id],
            }
          : {
              message: `Đã thêm ${food.nameVi} ${qty} vào ${mealNameVi}`,
              kind: "added",
              mealSlot,
              durationMs: ADDED_TOAST_MS,
            }
      );

      addRecentFood(food, qty);

      if (isLiveMode()) {
        apiClient.addEntry({
          id: newEntry.id,
          foodId: food.id,
          grams,
          mealSlot,
          date: todayIso || getTodayIsoVN(),
        }).catch(() => {});
      }

      return true;
    },
    [addRecentFood, todayIso]
  );

  const addFoodEntries = useCallback(
    (items: Array<{ food: FoodItem; grams: number; label: string }>, mealSlot: MealSlot) => {
      if (items.length === 0 || !items.every((i) => hasEnergy(i.food))) return false;
      const addedAt = new Date().toISOString();
      const entries: AddedDiaryEntry[] = items.map(({ food, grams, label }) => ({
        id: generateUuid(),
        foodId: food.id,
        foodName: food.nameVi,
        grams,
        displayQty: label || `${formatAmount(grams, "g")} g`,
        mealSlot,
        ...entryNumbers(food, grams),
        addedAt,
      }));
      setEdits((prev) => dismissUndoIn({ ...prev, added: [...prev.added, ...entries] }));
      setToast({
        message: `Đã thêm ${entries.length} món vào ${getMealSlotNameVi(mealSlot)}`,
        kind: "undoable",
        mealSlot,
        durationMs: UNDO_TOAST_MS,
        undoIds: entries.map((e) => e.id),
      });
      items.forEach(({ food, label }) => addRecentFood(food, label));
      if (isLiveMode()) {
        entries.forEach((e, i) => {
          apiClient.addEntry({ id: e.id, foodId: items[i].food.id, grams: items[i].grams, mealSlot, date: todayIso || getTodayIsoVN() }).catch(() => {});
        });
      }
      return true;
    },
    [addRecentFood, todayIso]
  );

  const dismissToast = useCallback(() => {
    setToast(null);
    setEdits((prev) => dismissUndoIn(prev));
  }, []);

  const isFavourite = useCallback((foodId: string) => favouriteIds.includes(foodId), [favouriteIds]);

  const toggleFavourite = useCallback((food: FoodItem) => {
    const willBeFavourite = !favouriteIds.includes(food.id);
    setFavouriteIds((prev) => toggleFavouriteId(prev, food.id));
    if (isLiveMode()) {
      if (willBeFavourite) {
        apiClient.addFavourite(food.id).catch(() => {});
      } else {
        apiClient.removeFavourite(food.id).catch(() => {});
      }
    }
  }, [favouriteIds]);

  const getEntry = useCallback((id: string) => findEntry(edits, id, samples), [edits, samples]);

  const updateEntry = useCallback((id: string, patch: EntryPatch) => {
    setEdits((prev) => updateEntryIn(prev, id, patch, samples));
    if (isLiveMode()) {
      apiClient.updateEntry(id, {
        meal_slot: patch.mealSlot,
        grams: patch.grams,
        serving_size_g: patch.grams,
        serving_label: patch.servingLabel,
        calories: patch.quick?.calories,
      }).catch(() => {});
    }
  }, [samples]);

  const deleteEntry = useCallback(
    (id: string) => {
      const view = findEntry(edits, id, samples);
      if (!view) return;
      setEdits((prev) => deleteEntryIn(prev, id, samples));
      setParkedDelete(null);
      setToast({ message: `Đã xóa ${view.name}`, kind: "deleted", mealSlot: null, durationMs: UNDO_TOAST_MS });
      if (isLiveMode()) {
        apiClient.deleteEntry(id).catch(() => {});
      }
    },
    [edits, samples]
  );

  const deleteMeal = useCallback(
    (slot: MealSlot) => {
      const count = mealEntryIds(edits, slot, samples).length;
      if (count === 0) return;
      setEdits((prev) => deleteMealIn(prev, slot, samples));
      setParkedDelete(null);
      setToast({
        message: `Đã xóa ${getMealSlotNameVi(slot)} · ${count} món`,
        kind: "deleted",
        mealSlot: null,
        durationMs: UNDO_TOAST_MS,
      });
      if (isLiveMode()) {
        apiClient.deleteMeal(todayIso || getTodayIsoVN(), slot).catch(() => {});
      }
    },
    [edits, samples, todayIso]
  );

  const deleteEntries = useCallback(
    (ids: string[], dayIso: string) => {
      // A past day is read-only: its entries are not in the edits, and nothing here may touch today's
      if (!todayIso || dayIso !== todayIso) return;
      const count = ids.filter((id) => findEntry(edits, id, samples) !== null).length;
      if (count === 0) return;
      setEdits((prev) => deleteEntriesIn(prev, ids, samples));
      setParkedDelete(null);
      setToast({ message: `Đã xóa ${count} món`, kind: "deleted", mealSlot: null, durationMs: UNDO_TOAST_MS });
      if (isLiveMode()) {
        for (const id of ids) {
          apiClient.deleteEntry(id).catch(() => {});
        }
      }
    },
    [edits, samples, todayIso]
  );

  const moveEntries = useCallback(
    (ids: string[], slot: MealSlot, dayIso: string) => {
      if (!todayIso || dayIso !== todayIso) return;
      const count = ids.filter((id) => findEntry(edits, id, samples) !== null).length;
      if (count === 0) return;
      // A move has its own undo (the toast carries it). A delete's toast it replaces is parked under it, so both
      // Hoàn tác stay reachable.
      const undoMoves = slotsBeforeMove(edits, ids, slot, samples);
      if (toast?.kind === "deleted" && edits.undo) {
        const expiresAt = toastStartedAt.current + toast.durationMs;
        if (expiresAt > Date.now()) setParkedDelete({ toast, expiresAt });
      }
      setEdits((prev) => moveEntriesIn(prev, ids, slot, samples));
      setToast({
        message: `Đã chuyển ${count} món sang ${getMealSlotNameVi(slot)}`,
        kind: undoMoves.length > 0 ? "moved" : "added",
        mealSlot: slot,
        durationMs: UNDO_TOAST_MS,
        undoMoves,
      });
      if (isLiveMode()) {
        for (const id of ids) {
          apiClient.updateEntry(id, { meal_slot: slot }).catch(() => {});
        }
      }
    },
    [edits, samples, todayIso, toast]
  );

  const undoMove = useCallback(() => {
    const moves = toast?.undoMoves;
    if (!moves) return;
    setEdits((prev) => restoreSlotsIn(prev, moves, samples));
    if (isLiveMode()) {
      for (const m of moves) {
        apiClient.updateEntry(m.id, { meal_slot: m.slot }).catch(() => {});
      }
    }
    setToast(null);
  }, [toast, samples]);

  const undoLastDelete = useCallback(() => {
    const lastUndo = edits.undo;
    setEdits((prev) => undoDeleteIn(prev));
    if (isLiveMode() && lastUndo) {
      if (lastUndo.kind === "added") {
        apiClient.restoreEntry(lastUndo.entry.id).catch(() => {});
      } else if (lastUndo.kind === "sample") {
        apiClient.restoreEntry(lastUndo.id).catch(() => {});
      }
    }
    setToast(null);
  }, [edits.undo]);

  const undoParkedDelete = useCallback(() => {
    setEdits((prev) => undoDeleteIn(prev));
    setParkedDelete(null);
  }, []);

  const copyEntries = useCallback((entries: AddedDiaryEntry[], message: string) => {
    if (entries.length === 0) return;
    setEdits((prev) => dismissUndoIn({ ...prev, added: [...prev.added, ...entries] }));
    setToast({
      message,
      kind: "undoable",
      mealSlot: null,
      durationMs: UNDO_TOAST_MS,
      undoIds: entries.map((e) => e.id),
    });
  }, []);

  const undoCopy = useCallback(() => {
    const ids = toast?.undoIds;
    if (!ids) return;
    setEdits((prev) => removeAddedIn(prev, ids));
    setToast(null);
    // The entries were already sent: undo removes them on the server too, or they come back on the next load
    if (isLiveMode()) {
      for (const id of ids) {
        dropOfflineEntry(id);
        apiClient.deleteEntry(id).catch(() => {});
      }
    }
  }, [toast]);

  const mealFoods = useCallback(
    (slot: MealSlot, iso: string) => {
      const today = todayIso ?? getTodayIsoVN();
      const items =
        iso === today
          ? mealPortions(edits, slot, samples)
          : itemsFromEntries(dayEntries(iso, today).filter((e) => e.mealSlot === slot));
      // Only foods the catalogue has: what is saved is what one tap can add back
      return items.filter((item) => MOCK_FOODS.some((f) => f.id === item.foodId));
    },
    [edits, samples, todayIso, archive]
  );

  const saveMealAs = useCallback(
    (slot: MealSlot, iso: string, name: string) => {
      const items = mealFoods(slot, iso);
      const meal = buildSavedMeal({
        id: `sm-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name,
        fallbackName: defaultMealName(slot, iso),
        items,
        createdAt: new Date().toISOString(),
      });
      if (!meal) return false;
      setSavedMeals((prev) => [meal, ...prev]);
      setEdits((prev) => dismissUndoIn(prev));
      setToast({
        message: `Đã lưu ${meal.name} vào Bữa ăn của tôi · ${meal.items.length} món`,
        kind: "saved",
        mealSlot: null,
        durationMs: ADDED_TOAST_MS,
      });
      return true;
    },
    [mealFoods]
  );

  const renameSavedMeal = useCallback((id: string, name: string) => {
    setSavedMeals((prev) => renameSavedMealIn(prev, id, name));
  }, []);

  const deleteSavedMeal = useCallback((id: string) => {
    setSavedMeals((prev) => removeSavedMeal(prev, id));
  }, []);

  const addSavedMeal = useCallback(
    (meal: SavedMeal, slot: MealSlot) => {
      const stamp = Date.now();
      const entries = savedMealEntries(meal, MOCK_FOODS, slot, `sm-${stamp}`, new Date(stamp).toISOString());
      const skipped = savedMealSkipped(meal, MOCK_FOODS);
      if (entries.length === 0) {
        // Nothing can be added: say why instead of doing nothing
        if (skipped > 0) setToast({ message: NO_ENERGY_MESSAGE, kind: "notice", mealSlot: null, durationMs: NOTICE_TOAST_MS });
        return;
      }
      // The recents remember each food with the portion the meal used
      setRecentFoods((prev) =>
        [...entries].reverse().reduce((list, e) => pushRecent(list, { foodId: e.foodId, servingLabel: e.displayQty }), prev)
      );
      setEdits((prev) => dismissUndoIn({ ...prev, added: [...prev.added, ...entries] }));
      setToast({
        message: `Đã thêm ${meal.name} · ${entries.length} món vào ${getMealSlotNameVi(slot)}${
          skipped > 0 ? `. ${skipped} món chưa có kcal nên chưa thêm` : ""
        }`,
        kind: "undoable",
        mealSlot: slot,
        durationMs: UNDO_TOAST_MS,
        undoIds: entries.map((e) => e.id),
      });
    },
    []
  );

  const addQuickEntry = useCallback(
    (input: QuickEntryInput, slot: MealSlot): QuickEntryResult => {
      const now = Date.now();
      const entryId = generateUuid();
      const result = quickEntryFrom(input, slot, entryId, new Date(now).toISOString());
      if (!result.ok) return result;
      const { entry } = result;
      setEdits((prev) => dismissUndoIn({ ...prev, added: [...prev.added, entry] }));
      setToast({
        message: `Đã thêm ${entry.foodName} · ${formatAmount(entry.calories, "kcal")} kcal vào ${getMealSlotNameVi(slot)}`,
        kind: "undoable",
        mealSlot: slot,
        durationMs: UNDO_TOAST_MS,
        undoIds: [entry.id],
      });
      if (isLiveMode()) {
        apiClient
          .addEntry({
            id: entry.id,
            kind: "quick",
            calories: entry.calories,
            mealSlot: slot,
            date: todayIso || getTodayIsoVN(),
          })
          .catch(() => {});
      }
      return result;
    },
    [todayIso]
  );

  const targets = useMemo(() => targetsFor(profile), [profile]);
  useMemo(() => setDayArchive(archive), [archive]);

  const nutrientSources = useCallback(
    (key: string) => nutrientSourcesIn(edits.added, edits.sample, key, samples),
    [edits, samples]
  );

  const updateProfile = useCallback(
    (patch: Partial<Profile>) => {
      const next = normaliseProfile({ ...profile, ...patch });
      setProfile(next);
      writeStoredProfile(next);
      if (isLiveMode()) {
        apiClient
          .saveSetup({
            sex: next.sex,
            birthYear: next.birthYear,
            weightKg: next.weightKg,
            goal: next.goal,
            periodMode: next.periodMode,
            trainingMinutesDefault: next.trainingMinutesDefault,
            displayName: next.displayName,
          })
          .catch(() => {});
        if (patch.weightKg !== undefined) {
          apiClient.updateWeight(todayIso || getTodayIsoVN(), patch.weightKg).catch(() => {});
        }
      }
    },
    [profile, todayIso]
  );

  const compositeData = useMemo<MockDayData>(() => {
    // A real account starts from an empty day; only demo mode starts from the sample day
    const start = demo ? SAMPLE_DAY : blankDay(SAMPLE_DAY);
    const base = applyProfileTargets(start, profile, targets);
    const day = computeCompositeDayData(base, edits.added, demo ? edits.sample : {});
    return todayIso ? withRuntimeDate(day, todayIso) : day;
  }, [edits.added, edits.sample, todayIso, profile, targets, demo]);

  // Memoised so a toast or highlight change does not re-render every useDiary() consumer
  const contextValue = useMemo(
    () => ({
      data: compositeData,
      addedEntries,
      addFoodEntry,
      addFoodEntries,
      recentFoods,
      addRecentFood,
      toast,
      dismissToast,
      highlightedMeal,
      setHighlightedMeal,
      favouriteIds,
      isFavourite,
      toggleFavourite,
      getEntry,
      updateEntry,
      deleteEntry,
      deleteMeal,
      deleteEntries,
      moveEntries,
      undoMove,
      undoLastDelete,
      parkedDelete,
      undoParkedDelete,
      copyEntries,
      undoCopy,
      savedMeals,
      saveMealAs,
      mealFoods,
      renameSavedMeal,
      deleteSavedMeal,
      addSavedMeal,
      addQuickEntry,
      todayIso,
      dayArchive: archive,
      hydrated,
      demo,
      profile,
      targets,
      updateProfile,
      nutrientSources,
    }),
    [
      compositeData,
      addedEntries,
      addFoodEntry,
      addFoodEntries,
      recentFoods,
      addRecentFood,
      toast,
      dismissToast,
      highlightedMeal,
      setHighlightedMeal,
      favouriteIds,
      isFavourite,
      toggleFavourite,
      getEntry,
      updateEntry,
      deleteEntry,
      deleteMeal,
      deleteEntries,
      moveEntries,
      undoMove,
      undoLastDelete,
      parkedDelete,
      undoParkedDelete,
      copyEntries,
      undoCopy,
      savedMeals,
      saveMealAs,
      mealFoods,
      renameSavedMeal,
      deleteSavedMeal,
      addSavedMeal,
      addQuickEntry,
      todayIso,
      archive,
      hydrated,
      demo,
      profile,
      targets,
      updateProfile,
      nutrientSources,
    ]
  );

  return <DiaryContext.Provider value={contextValue}>{children}</DiaryContext.Provider>;
}

export function useDiary() {
  const ctx = useContext(DiaryContext);
  if (!ctx) {
    throw new Error("useDiary must be used within a DiaryProvider");
  }
  return ctx;
}
