"use client";

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import { SAMPLE_DAY, type MockDayData, type MockFoodItem } from "./mock/sample-day";
import { type FoodItem } from "./mock/foods";
import { type MealSlot, getMealSlotNameVi } from "./meal-slot";
import { scaleNutrients } from "./portion";
import { formatNumber } from "./format";

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
  recentSearches: string[];
  addRecentSearch: (query: string) => void;
  toast: ToastInfo | null;
  dismissToast: () => void;
  highlightedMeal: MealSlot | null;
  setHighlightedMeal: (meal: MealSlot | null) => void;
}

const DiaryContext = createContext<DiaryContextValue | null>(null);

const SESSION_STORAGE_KEY = "h1t_added_entries_v1";
const RECENT_SEARCHES_KEY = "h1t_recent_searches_v1";

const DEFAULT_RECENTS = ["Yến mạch 60 g", "Kefir 200 ml", "Chuối 1 quả"];

export function DiaryProvider({ children }: { children: React.ReactNode }) {
  const [addedEntries, setAddedEntries] = useState<AddedDiaryEntry[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    if (typeof window === "undefined") return DEFAULT_RECENTS;
    try {
      const stored = sessionStorage.getItem(RECENT_SEARCHES_KEY);
      return stored ? JSON.parse(stored) : DEFAULT_RECENTS;
    } catch {
      return DEFAULT_RECENTS;
    }
  });

  const [toast, setToast] = useState<ToastInfo | null>(null);
  const [highlightedMeal, setHighlightedMeal] = useState<MealSlot | null>(null);

  // Persist addedEntries to sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(addedEntries));
    } catch {
      // Ignore quota/access errors
    }
  }, [addedEntries]);

  // Persist recent searches
  useEffect(() => {
    try {
      sessionStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(recentSearches));
    } catch {
      // Ignore
    }
  }, [recentSearches]);

  // Auto-dismiss toast after 4s
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  // Add recent search query
  const addRecentSearch = useCallback((query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setRecentSearches((prev) => {
      const filtered = prev.filter((q) => q.toLowerCase() !== trimmed.toLowerCase());
      return [trimmed, ...filtered].slice(0, 8);
    });
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

      addRecentSearch(`${food.nameVi} ${qty}`);
    },
    [addRecentSearch]
  );

  const dismissToast = useCallback(() => {
    setToast(null);
  }, []);

  /**
   * NOTE: This totals calculation is mock-only. In production, Dong's backend API
   * will compute and return real aggregated totals for the day.
   */
  const compositeData = useMemo<MockDayData>(() => {
    if (addedEntries.length === 0) {
      return SAMPLE_DAY;
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
    const totalConsumedCals = SAMPLE_DAY.calories.consumed + extraCals;
    const remainingCals = Math.max(0, SAMPLE_DAY.calories.targetMin - totalConsumedCals);
    const calPercentage = Math.round((totalConsumedCals / SAMPLE_DAY.calories.targetMin) * 100);

    // 2. Macros
    const updatedMacros = SAMPLE_DAY.macros.map((m) => {
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
    // Map internal slots to SAMPLE_DAY slot identifiers
    // breakfast -> breakfast, lunch -> lunch, pre_workout -> preworkout, dinner -> dinner, snack -> snack
    const slotMap: Record<MealSlot, string> = {
      breakfast: "breakfast",
      lunch: "lunch",
      pre_workout: "preworkout",
      dinner: "dinner",
      snack: "snack",
    };

    const updatedMeals = SAMPLE_DAY.meals.map((meal) => {
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
    const compositeNutrients: Record<string, number | null> = { ...(SAMPLE_DAY.nutrients || {}) };
    for (const [key, extraVal] of Object.entries(extraNutrients)) {
      const current = compositeNutrients[key];
      if (current !== null && current !== undefined) {
        compositeNutrients[key] = current + extraVal;
      } else if (extraVal > 0) {
        compositeNutrients[key] = extraVal;
      }
    }

    // 5. Update Minerals & Vitamins arrays (e.g. Kali)
    const updatedMinerals = SAMPLE_DAY.minerals.map((m) => {
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

    const updatedVitamins = SAMPLE_DAY.vitamins.map((v) => {
      let extra = 0;
      if (v.key === "a") extra = extraNutrients["vitamin_a"] ?? 0;
      else if (v.key === "c") extra = extraNutrients["vitamin_c"] ?? 0;
      else if (v.key === "d") extra = extraNutrients["vitamin_d"] ?? 0;
      else if (v.key === "e") extra = extraNutrients["vitamin_e"] ?? 0;
      else if (v.key === "k") extra = extraNutrients["vitamin_k"] ?? 0;
      else if (v.key === "b9") extra = extraNutrients["folate"] ?? 0;
      else extra = extraNutrients[v.key] ?? 0;

      if (extra === 0) return v;

      const baseConsumed = v.consumed ?? 0;
      const newConsumed = Math.round((baseConsumed + extra) * 10) / 10;
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
    const achievedMicros =
      [...updatedVitamins, ...updatedMinerals].filter((m) => (m.percentage ?? 0) >= 100).length;

    return {
      ...SAMPLE_DAY,
      calories: {
        ...SAMPLE_DAY.calories,
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
        ...SAMPLE_DAY.microsSummary,
        achievedCount: achievedMicros,
      },
    };
  }, [addedEntries]);

  return (
    <DiaryContext.Provider
      value={{
        data: compositeData,
        addedEntries,
        addFoodEntry,
        recentSearches,
        addRecentSearch,
        toast,
        dismissToast,
        highlightedMeal,
        setHighlightedMeal,
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
