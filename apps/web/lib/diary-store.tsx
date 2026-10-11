"use client";

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import { SAMPLE_DAY, type MockDayData, type MockFoodItem } from "./mock/sample-day";
import { type FoodItem } from "./mock/foods";
import { type MealSlot, getMealSlotNameVi } from "./meal-slot";
import { scaleNutrients } from "./portion";
import { formatNumber } from "./format";
import { DEFAULT_RECENT_FOODS, isRecentFood, pushRecent, type RecentFood } from "./recent-foods";

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

export interface ToastInfo {
  message: string;
  mealSlot: MealSlot;
  foodName: string;
  qty: string;
}

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
  hydrated: boolean;
}

const DiaryContext = createContext<DiaryContextValue | null>(null);

const SESSION_STORAGE_KEY = "h1t_added_entries_v1";
// v2: recents are { foodId, servingLabel } objects. The v1 string list is ignored.
const RECENT_FOODS_KEY = "h1t_recent_foods_v2";

/**
 * Pure aggregation function for daily totals.
 * In production, Dong's backend API will compute and return real aggregated totals.
 */
export function computeCompositeDayData(
  baseDay: MockDayData,
  addedEntries: AddedDiaryEntry[]
): MockDayData {
  if (addedEntries.length === 0) {
    return baseDay;
  }

  // Accumulate nutrient sums from added entries
  let extraCals = 0;
  let extraCarbs = 0;
  let extraProtein = 0;
  let extraFat = 0;
  let extraFiber = 0;

  const extraNutrients: Record<string, number> = {};

  for (const entry of addedEntries) {
    extraCals += entry.calories;
    extraCarbs += entry.carbs;
    extraProtein += entry.protein;
    extraFat += entry.fat;
    extraFiber += entry.fiber;

    for (const [key, val] of Object.entries(entry.nutrients)) {
      if (typeof val === "number") {
        extraNutrients[key] = (extraNutrients[key] ?? 0) + val;
      }
    }
  }

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
    const displayValue =
      m.targetMin !== null
        ? m.targetMax
          ? `${formatNumber(newConsumed)} / ${formatNumber(m.targetMin)}–${formatNumber(m.targetMax)} ${m.unit}`
          : `${formatNumber(newConsumed)} / ${formatNumber(m.targetMin)} ${m.unit}`
        : `${formatNumber(newConsumed)} ${m.unit}`;

    return {
      ...m,
      consumed: newConsumed,
      percentage,
      displayValue,
    };
  });

  // 3. Meals
  const slotMap: Record<MealSlot, string> = {
    breakfast: "breakfast",
    lunch: "lunch",
    pre_workout: "preworkout",
    dinner: "dinner",
    snack: "snack",
  };

  const updatedMeals = baseDay.meals.map((meal) => {
    const addedForThisMeal = addedEntries.filter((e) => slotMap[e.mealSlot] === meal.slot);
    if (addedForThisMeal.length === 0) {
      return meal;
    }

    const newItems: MockFoodItem[] = [
      ...meal.items,
      ...addedForThisMeal.map((e) => ({
        id: e.id,
        name: e.foodName,
        qty: e.displayQty,
        kcal: e.calories,
      })),
    ];

    const newKcal = newItems.reduce((acc, it) => acc + it.kcal, 0);

    return {
      ...meal,
      items: newItems,
      kcal: newKcal,
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
    const displayValue =
      m.targetMin !== null
        ? m.targetMax
          ? `${formatNumber(newConsumed)} / ${formatNumber(m.targetMin)}–${formatNumber(m.targetMax)} ${m.unit}`
          : `${formatNumber(newConsumed)} / ${formatNumber(m.targetMin)} ${m.unit}`
        : `${formatNumber(newConsumed)} ${m.unit}`;

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
        ? `${formatNumber(newConsumed)} / ${formatNumber(v.targetMin)} ${v.unit}`
        : `${formatNumber(newConsumed)} ${v.unit}`;

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

export function DiaryProvider({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [addedEntries, setAddedEntries] = useState<AddedDiaryEntry[]>([]);
  const [recentFoods, setRecentFoods] = useState<RecentFood[]>(DEFAULT_RECENT_FOODS);
  const [toast, setToast] = useState<ToastInfo | null>(null);
  const [highlightedMeal, setHighlightedMeal] = useState<MealSlot | null>(null);

  // Load from sessionStorage on mount (client-only)
  useEffect(() => {
    try {
      const storedEntries = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (storedEntries) {
        setAddedEntries(JSON.parse(storedEntries));
      }
      const storedRecents = sessionStorage.getItem(RECENT_FOODS_KEY);
      if (storedRecents) {
        const parsed: unknown = JSON.parse(storedRecents);
        if (Array.isArray(parsed)) setRecentFoods(parsed.filter(isRecentFood));
      }
    } catch {
      // Ignore sessionStorage access errors
    } finally {
      setHydrated(true);
    }
  }, []);

  // Persist addedEntries to sessionStorage only after hydrated
  useEffect(() => {
    if (!hydrated) return;
    try {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(addedEntries));
    } catch {
      // Ignore quota/access errors
    }
  }, [addedEntries, hydrated]);

  // Persist recent foods only after hydrated
  useEffect(() => {
    if (!hydrated) return;
    try {
      sessionStorage.setItem(RECENT_FOODS_KEY, JSON.stringify(recentFoods));
    } catch {
      // Ignore
    }
  }, [recentFoods, hydrated]);

  // Auto-dismiss toast after 4s
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  // Remember a food with the serving it was logged with
  const addRecentFood = useCallback((food: FoodItem, servingLabel: string) => {
    setRecentFoods((prev) => pushRecent(prev, { foodId: food.id, servingLabel }));
  }, []);

  // Add a food entry
  const addFoodEntry = useCallback(
    async (food: FoodItem, grams: number, mealSlot: MealSlot, servingLabel?: string) => {
      const scaled = scaleNutrients(food.nutrients, grams);
      const calories = Math.round(scaled.energy ?? 0);
      const carbs = Math.round((scaled.carbs ?? 0) * 10) / 10;
      const protein = Math.round((scaled.protein ?? 0) * 10) / 10;
      const fat = Math.round((scaled.fat ?? 0) * 10) / 10;
      const fiber = Math.round((scaled.fiber ?? 0) * 10) / 10;

      const qty = servingLabel || `${formatNumber(grams)} g`;

      const newEntry: AddedDiaryEntry = {
        id: `entry-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        foodId: food.id,
        foodName: food.nameVi,
        grams,
        displayQty: qty,
        mealSlot,
        calories,
        protein,
        carbs,
        fat,
        fiber,
        nutrients: scaled,
        addedAt: new Date().toISOString(),
      };

      setAddedEntries((prev) => [...prev, newEntry]);

      const mealNameVi = getMealSlotNameVi(mealSlot);
      setToast({
        message: `Đã thêm ${food.nameVi} ${qty} vào ${mealNameVi}`,
        mealSlot,
        foodName: food.nameVi,
        qty,
      });

      addRecentFood(food, qty);
    },
    [addRecentFood]
  );

  const dismissToast = useCallback(() => {
    setToast(null);
  }, []);

  const compositeData = useMemo<MockDayData>(() => {
    return computeCompositeDayData(SAMPLE_DAY, addedEntries);
  }, [addedEntries]);

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
        hydrated,
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
