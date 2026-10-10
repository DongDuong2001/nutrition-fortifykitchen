"use client";

import { useState } from "react";
import { useDiaryLog } from "@/hooks/use-diary-log";
import { NutrientSummary } from "@/components/diary/nutrient-summary";
import { MealSlotCard } from "@/components/diary/meal-slot-card";
import { AddFoodModal } from "@/components/diary/add-food-modal";
import { Food } from "@/lib/api-client";
import { CalendarIcon } from "runeicons";

export default function DiaryPage() {
  const [activeDate, setActiveDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [modalSlot, setModalSlot] = useState<"breakfast" | "lunch" | "dinner" | "snack" | null>(null);

  const { logs, progress, logMealOptimistic, error } = useDiaryLog([], {
    log_date: activeDate,
    total_nutrients: {
      calories: 0,
      protein: 0,
      carbohydrates: 0,
      fat: 0,
      fiber: 0,
      sodium: 0,
    },
    target_nutrients: {
      calories: 2200,
      protein: 160,
      carbohydrates: 220,
      fat: 65,
      fiber: 35,
      sodium: 2300,
      calcium: 1000,
      iron: 18,
      potassium: 3500,
      vitamin_a: 900,
      vitamin_c: 90,
      vitamin_d: 20,
      vitamin_e: 15,
    },
    logs_count: 0,
  });

  const handleOpenAddModal = (slot: "breakfast" | "lunch" | "dinner" | "snack") => {
    setModalSlot(slot);
  };

  const handleLogMeal = async (food: Food, quantity: number, servingSizeG: number) => {
    if (!modalSlot) return;
    await logMealOptimistic(food, modalSlot, quantity, servingSizeG, activeDate);
  };

  return (
    <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto">
      {/* Date Header & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b-2 border-black">
        <div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-[#F8FAFC] uppercase tracking-tight">
            Daily Meal Diary
          </h1>
          <p className="text-xs sm:text-sm text-[#94A3B8] font-medium mt-0.5">
            26-nutrient daily intake tracking and meal logging
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-[4px] bg-[#141C2B] border-2 border-black shadow-[3px_3px_0px_0px_#000]">
            <CalendarIcon className="w-4 h-4 text-[#10B981] shrink-0" />
            <input
              type="date"
              value={activeDate}
              onChange={(e) => setActiveDate(e.target.value)}
              className="bg-transparent border-none text-[#F8FAFC] font-mono text-xs sm:text-sm focus:outline-none"
            />
          </div>
          <button
            onClick={() => setActiveDate(new Date().toISOString().split("T")[0])}
            className="neo-btn neo-btn-emerald px-3.5 py-1.5 text-xs text-black border-2 border-black min-h-[38px]"
          >
            Today
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-[4px] bg-rose-500/15 border-2 border-black shadow-[3px_3px_0px_0px_#000] text-rose-300 font-bold text-xs uppercase tracking-wider">
          {error}
        </div>
      )}

      {/* Progress & Target Summary */}
      <NutrientSummary progress={progress} />

      {/* Meal Slots Grid (Responsive across all screen sizes) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        <MealSlotCard
          slot="breakfast"
          title="Breakfast"
          logs={logs}
          onAddFood={handleOpenAddModal}
        />
        <MealSlotCard
          slot="lunch"
          title="Lunch"
          logs={logs}
          onAddFood={handleOpenAddModal}
        />
        <MealSlotCard
          slot="dinner"
          title="Dinner"
          logs={logs}
          onAddFood={handleOpenAddModal}
        />
        <MealSlotCard
          slot="snack"
          title="Snacks & Extras"
          logs={logs}
          onAddFood={handleOpenAddModal}
        />
      </div>

      {/* Modal for adding food */}
      {modalSlot && (
        <AddFoodModal
          slot={modalSlot}
          isOpen={true}
          onClose={() => setModalSlot(null)}
          onLog={handleLogMeal}
        />
      )}
    </div>
  );
}
