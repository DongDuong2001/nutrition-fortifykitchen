"use client";

import { useState, useCallback } from "react";
import { apiClient, DiaryLog, Food, DailyProgress, NutrientValues } from "@/lib/api-client";

function calculateSnapshot(food: Food, quantity: number, servingSizeG: number): NutrientValues {
  const grams = quantity * servingSizeG;
  const ratio = grams / 100.0;
  const p = food.per_100g_nutrients;

  const r = (val?: number) => (val !== undefined ? Math.round(val * ratio * 100) / 100 : 0);

  return {
    calories: r(p.calories),
    protein: r(p.protein),
    carbohydrates: r(p.carbohydrates),
    fat: r(p.fat),
    fiber: r(p.fiber),
    sodium: r(p.sodium),
    saturated_fat: r(p.saturated_fat),
    trans_fat: r(p.trans_fat),
    monounsaturated_fat: r(p.monounsaturated_fat),
    polyunsaturated_fat: r(p.polyunsaturated_fat),
    sugar: r(p.sugar),
    added_sugar: r(p.added_sugar),
    cholesterol: r(p.cholesterol),
    potassium: r(p.potassium),
    calcium: r(p.calcium),
    iron: r(p.iron),
    phosphorus: r(p.phosphorus),
    magnesium: r(p.magnesium),
    zinc: r(p.zinc),
    copper: r(p.copper),
    manganese: r(p.manganese),
    selenium: r(p.selenium),
    vitamin_a: r(p.vitamin_a),
    vitamin_c: r(p.vitamin_c),
    vitamin_d: r(p.vitamin_d),
    vitamin_e: r(p.vitamin_e),
  };
}

export function useDiaryLog(initialLogs: DiaryLog[] = [], initialProgress?: DailyProgress) {
  const [logs, setLogs] = useState<DiaryLog[]>(initialLogs);
  const [progress, setProgress] = useState<DailyProgress | undefined>(initialProgress);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const logMealOptimistic = useCallback(
    async (
      food: Food,
      mealSlot: "breakfast" | "lunch" | "dinner" | "snack" | "preworkout" | "intraworkout" | "postworkout",
      quantity: number,
      servingSizeG = food.serving_size_g || 100,
      logDate?: string
    ) => {
      // 1. Generate client-side UUID for idempotency
      const clientLogId = crypto.randomUUID();
      const todayStr = logDate || new Date().toISOString().split("T")[0];

      // 2. Pre-calculate nutrients snapshot for optimistic UI
      const nutrientsSnapshot = calculateSnapshot(food, quantity, servingSizeG);

      const optimisticEntry: DiaryLog = {
        id: clientLogId,
        user_id: "current-user",
        food_id: food.id,
        meal_slot: mealSlot,
        quantity,
        serving_size_g: servingSizeG,
        nutrients_snapshot: nutrientsSnapshot,
        log_date: todayStr,
        created_at: new Date().toISOString(),
      };

      // 3. Apply optimistic state update immediately
      setLogs((prev) => [...prev, optimisticEntry]);
      setIsLoading(true);
      setError(null);

      try {
        // 4. Fire API request with the client-generated UUID
        const res = await apiClient.logMeal({
          id: clientLogId,
          food_id: food.id,
          meal_slot: mealSlot,
          quantity,
          serving_size_g: servingSizeG,
          log_date: todayStr,
        });

        // 5. Reconcile with authoritative server data
        setLogs((prev) => prev.map((l) => (l.id === clientLogId ? res.log : l)));
        if (res.today_progress) {
          setProgress(res.today_progress);
        }
        return res.log;
      } catch (err: any) {
        // 6. Rollback optimistic update on failure
        setLogs((prev) => prev.filter((l) => l.id !== clientLogId));
        setError(err.message || "Failed to log meal");
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return {
    logs,
    progress,
    setLogs,
    setProgress,
    logMealOptimistic,
    isLoading,
    error,
  };
}
