"use client";

import { useState, useEffect } from "react";
import { type MealSlot, resolveMealSlot } from "./meal-slot";

/**
 * Hook that resolves the meal slot on the client side based on URL param or current time.
 * Returns null until resolved on the client to avoid SSR hydration mismatches.
 */
export function useMealSlot(param?: string | null): MealSlot | null {
  const [mealSlot, setMealSlot] = useState<MealSlot | null>(null);

  useEffect(() => {
    setMealSlot(resolveMealSlot(param));
  }, [param]);

  return mealSlot;
}
