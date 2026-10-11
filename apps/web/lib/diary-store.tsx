"use client";

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import { SAMPLE_DAY, type MockDayData, type MockFoodItem } from "./mock/sample-day";
import { type FoodItem } from "./mock/foods";
import { type MealSlot, getMealSlotNameVi } from "./meal-slot";
import { formatAmount } from "./format";
import { getTodayIsoVN, withRuntimeDate } from "./date";
import { blankDay, dayEntries, statDisplay } from "./day-history";
import { DEFAULT_RECENT_FOODS, isRecentFood, pushRecent, type RecentFood } from "./recent-foods";
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
  dismissUndoIn,
  entryNumbers,
  findEntry,
  parseAddedEntries,
  parseSampleEdits,
  removeAddedIn,
  resolveSampleItems,
  SAMPLE_SLOT,
  sampleDelta,
  sampleEffect,
  undoDeleteIn,
  updateEntryIn,
} from "./diary-edits";

export type { AddedDiaryEntry, EntryView, EntryPatch } from "./diary-edits";

/**
 * The one toast of the app. "added" offers Xem (jump to the meal), "deleted" offers Hoàn tác,
 * and "copied" offers Hoàn tác for the entries it added (undoIds).
 */
export interface ToastInfo {
  message: string;
  kind: "added" | "deleted" | "copied";
  mealSlot: MealSlot | null;
  /** How long it stays. A delete or a copy stays 5 s, which is also the undo window. */
  durationMs: number;
  undoIds?: string[];
}

const ADDED_TOAST_MS = 4000;
const UNDO_TOAST_MS = 5000;

interface DiaryContextValue {
  data: MockDayData;
  addedEntries: AddedDiaryEntry[];
  addFoodEntry: (food: FoodItem, grams: number, mealSlot: MealSlot, servingLabel?: string) => Promise<void>;
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
  /** Puts the last deleted entry back. Only works while the "deleted" toast is shown. */
  undoLastDelete: () => void;
  /** Adds copied entries to today in one step, with one undo toast. Existing entries are kept. */
  copyEntries: (entries: AddedDiaryEntry[], message: string) => void;
  /** Takes out the entries of the last copy. Only works while the "copied" toast is shown. */
  undoCopy: () => void;
  /** Today as YYYY-MM-DD (Asia/Ho_Chi_Minh). Null until mounted. */
  todayIso: string | null;
  hydrated: boolean;
  /** The profile the targets come from. Loaded after mount (see lib/profile.ts). */
  profile: Profile;
  /** Daily targets for the profile. Today, Micros and the portion panels read these. */
  targets: CompleteTargets;
  /** Changes part of the profile and saves it. Targets and the day follow. */
  updateProfile: (patch: Partial<Profile>) => void;
}

const DiaryContext = createContext<DiaryContextValue | null>(null);

const SESSION_STORAGE_KEY = "h1t_added_entries_v1";
// Edits to sample-day items (portion, meal, deleted), kept next to the added entries
const SAMPLE_EDITS_KEY = "h1t_sample_edits_v1";
// v2: recents are { foodId, servingLabel } objects. The v1 string list is ignored.
const RECENT_FOODS_KEY = "h1t_recent_foods_v2";

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
    return baseDay;
  }

  // What the added entries and the edited sample items add on top of the sample day
  let extra: Amounts = { calories: 0, carbs: 0, protein: 0, fat: 0, fiber: 0, nutrients: {} };
  for (const entry of addedEntries) {
    extra = addAmounts(extra, amountsOfNumbers(entry));
  }
  for (const { info, effect } of effects) {
    extra = addAmounts(extra, sampleDelta(info, effect));
  }
  const extraCals = extra.calories;
  const extraCarbs = extra.carbs;
  const extraProtein = extra.protein;
  const extraFat = extra.fat;
  const extraFiber = extra.fiber;
  const extraNutrients = extra.nutrients;

  // 1. Calories
  const totalConsumedCals = baseDay.calories.consumed + extraCals;
  const remainingCals = Math.max(0, baseDay.calories.targetMin - totalConsumedCals);
  const calPercentage = Math.round((totalConsumedCals / baseDay.calories.targetMin) * 100);

  // 2. Macros
  const updatedMacros = baseDay.macros.map((m) => {
    let extra = 0;
    if (m.key === "protein") extra = extraProtein;
    else if (m.key === "carbs") extra = extraCarbs;
    else if (m.key === "fat") extra = extraFat;
    else if (m.key === "fiber") extra = extraFiber;

    const baseConsumed = m.consumed ?? 0;
    const newConsumed = Math.round(baseConsumed + extra);
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
    itemsBySlot.set(slot, [...(itemsBySlot.get(slot) ?? []), item]);
  };
  for (const { info, effect } of effects) {
    if (!effect.deleted) {
      addItem(effect.mealSlot, { id: info.item.id, name: info.item.name, qty: effect.qty, kcal: effect.kcal });
    }
  }
  for (const e of addedEntries) {
    addItem(e.mealSlot, { id: e.id, name: e.foodName, qty: e.displayQty, kcal: e.calories });
  }

  const updatedMeals = baseDay.meals.map((meal) => {
    const items = itemsBySlot.get(SAMPLE_SLOT[meal.slot]) ?? [];
    return {
      ...meal,
      items,
      kcal: items.reduce((acc, it) => acc + it.kcal, 0),
    };
  });

  // 4. Nutrients record (for Micros page)
  const compositeNutrients: Record<string, number | null> = { ...(baseDay.nutrients || {}) };
  for (const [key, extraVal] of Object.entries(extraNutrients)) {
    const current = compositeNutrients[key];
    if (current !== null && current !== undefined) {
      compositeNutrients[key] = current + extraVal;
    } else if (extraVal > 0) {
      compositeNutrients[key] = extraVal;
    }
  }

  // 5. Update Minerals & Vitamins arrays (e.g. Kali, Vitamin B6)
  const updatedMinerals = baseDay.minerals.map((m) => {
    const extra = extraNutrients[m.key] ?? 0;
    if (extra === 0) return m;

    const baseConsumed = m.consumed ?? 0;
    const newConsumed = Math.round(baseConsumed + extra);
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
    const extra = extraNutrients[v.key] ?? 0;
    if (extra === 0) return v;

    const baseConsumed = v.consumed ?? 0;
    const newConsumed = Math.round((baseConsumed + extra) * 100) / 100;
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

  // Count vitamins & minerals reached
  const vitaminsAchieved = updatedVitamins.filter((m) => (m.percentage ?? 0) >= 100).length;
  const mineralsAchieved = updatedMinerals.filter((m) => (m.percentage ?? 0) >= 100).length;
  const achievedMicros = vitaminsAchieved + mineralsAchieved;

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
    microsSummary: {
      ...baseDay.microsSummary,
      achieved: achievedMicros,
      vitaminsAchieved,
      mineralsAchieved,
    },
  };
}

/**
 * A past day as the Today screen shows it: nothing logged except the mock entries of that day (see day-history).
 * Targets follow the profile, the same as today.
 */
export function pastDayData(iso: string, todayIso: string, profile: Profile, targets: CompleteTargets): MockDayData {
  const base = blankDay(applyProfileTargets(SAMPLE_DAY, profile, targets));
  return { ...computeCompositeDayData(base, dayEntries(iso, todayIso), {}), date: iso };
}

export function DiaryProvider({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [edits, setEdits] = useState<DiaryEdits>({ added: [], sample: {}, undo: null });
  const addedEntries = edits.added;
  const [recentFoods, setRecentFoods] = useState<RecentFood[]>(DEFAULT_RECENT_FOODS);
  const [toast, setToast] = useState<ToastInfo | null>(null);
  const [highlightedMeal, setHighlightedMeal] = useState<MealSlot | null>(null);
  const [favouriteIds, setFavouriteIds] = useState<string[]>([]);
  // Today's date, read after mount so the server and first client render agree
  const [todayIso, setTodayIso] = useState<string | null>(null);
  // Same rule for the profile: the sample user until the saved one is read after mount
  const [profile, setProfile] = useState<Profile>(SAMPLE_PROFILE);

  // Load from sessionStorage on mount (client-only)
  useEffect(() => {
    try {
      const storedEntries = sessionStorage.getItem(SESSION_STORAGE_KEY);
      const storedSample = sessionStorage.getItem(SAMPLE_EDITS_KEY);
      setEdits((prev) => ({
        ...prev,
        added: parseAddedEntries(storedEntries),
        sample: parseSampleEdits(storedSample),
      }));
      const storedRecents = sessionStorage.getItem(RECENT_FOODS_KEY);
      if (storedRecents) {
        const parsed: unknown = JSON.parse(storedRecents);
        if (Array.isArray(parsed)) setRecentFoods(parsed.filter(isRecentFood));
      }
    } catch {
      // Ignore sessionStorage access errors
    } finally {
      setFavouriteIds(readFavouriteIds());
      setTodayIso(getTodayIsoVN());
      setProfile(loadProfile(new Date().getFullYear()));
      setHydrated(true);
    }
  }, []);

  // Persist favourites to localStorage only after hydrated
  useEffect(() => {
    if (!hydrated) return;
    writeFavouriteIds(favouriteIds);
  }, [favouriteIds, hydrated]);

  // Persist added entries and sample edits to sessionStorage only after hydrated
  useEffect(() => {
    if (!hydrated) return;
    try {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(edits.added));
      sessionStorage.setItem(SAMPLE_EDITS_KEY, JSON.stringify(edits.sample));
    } catch {
      // Ignore quota/access errors
    }
  }, [edits.added, edits.sample, hydrated]);

  // Persist recent foods only after hydrated
  useEffect(() => {
    if (!hydrated) return;
    try {
      sessionStorage.setItem(RECENT_FOODS_KEY, JSON.stringify(recentFoods));
    } catch {
      // Ignore
    }
  }, [recentFoods, hydrated]);

  // Auto-dismiss the toast. When a "deleted" toast goes, the undo goes with it.
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast(null);
      setEdits((prev) => dismissUndoIn(prev));
    }, toast.durationMs);
    return () => clearTimeout(timer);
  }, [toast]);

  // Remember a food with the serving it was logged with
  const addRecentFood = useCallback((food: FoodItem, servingLabel: string) => {
    setRecentFoods((prev) => pushRecent(prev, { foodId: food.id, servingLabel }));
  }, []);

  // Add a food entry
  const addFoodEntry = useCallback(
    async (food: FoodItem, grams: number, mealSlot: MealSlot, servingLabel?: string) => {
      const numbers = entryNumbers(food, grams);
      const qty = servingLabel || `${formatAmount(grams, "g")} g`;

      const newEntry: AddedDiaryEntry = {
        id: `entry-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
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
      setToast({
        message: `Đã thêm ${food.nameVi} ${qty} vào ${mealNameVi}`,
        kind: "added",
        mealSlot,
        durationMs: ADDED_TOAST_MS,
      });

      addRecentFood(food, qty);
    },
    [addRecentFood]
  );

  const dismissToast = useCallback(() => {
    setToast(null);
    setEdits((prev) => dismissUndoIn(prev));
  }, []);

  const isFavourite = useCallback((foodId: string) => favouriteIds.includes(foodId), [favouriteIds]);

  const toggleFavourite = useCallback((food: FoodItem) => {
    setFavouriteIds((prev) => toggleFavouriteId(prev, food.id));
  }, []);

  const getEntry = useCallback((id: string) => findEntry(edits, id), [edits]);

  const updateEntry = useCallback((id: string, patch: EntryPatch) => {
    setEdits((prev) => updateEntryIn(prev, id, patch));
  }, []);

  const deleteEntry = useCallback(
    (id: string) => {
      const view = findEntry(edits, id);
      if (!view) return;
      setEdits((prev) => deleteEntryIn(prev, id));
      setToast({ message: `Đã xoá ${view.name}`, kind: "deleted", mealSlot: null, durationMs: UNDO_TOAST_MS });
    },
    [edits]
  );

  const undoLastDelete = useCallback(() => {
    setEdits((prev) => undoDeleteIn(prev));
    setToast(null);
  }, []);

  const copyEntries = useCallback((entries: AddedDiaryEntry[], message: string) => {
    if (entries.length === 0) return;
    setEdits((prev) => dismissUndoIn({ ...prev, added: [...prev.added, ...entries] }));
    setToast({
      message,
      kind: "copied",
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
  }, [toast]);

  const targets = useMemo(() => targetsFor(profile), [profile]);

  const updateProfile = useCallback(
    (patch: Partial<Profile>) => {
      const next = normaliseProfile({ ...profile, ...patch });
      setProfile(next);
      writeStoredProfile(next);
    },
    [profile]
  );

  const compositeData = useMemo<MockDayData>(() => {
    const base = applyProfileTargets(SAMPLE_DAY, profile, targets);
    const day = computeCompositeDayData(base, edits.added, edits.sample);
    return todayIso ? withRuntimeDate(day, todayIso) : day;
  }, [edits.added, edits.sample, todayIso, profile, targets]);

  return (
    <DiaryContext.Provider
      value={{
        data: compositeData,
        addedEntries,
        addFoodEntry,
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
        undoLastDelete,
        copyEntries,
        undoCopy,
        todayIso,
        hydrated,
        profile,
        targets,
        updateProfile,
      }}
    >
      {children}
    </DiaryContext.Provider>
  );
}

export function useDiary() {
  const ctx = useContext(DiaryContext);
  if (!ctx) {
    throw new Error("useDiary must be used within a DiaryProvider");
  }
  return ctx;
}
