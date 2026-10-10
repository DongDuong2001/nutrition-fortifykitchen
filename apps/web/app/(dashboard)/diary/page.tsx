"use client";

import { useState } from "react";
import Link from "next/link";
import { useDiaryLog } from "@/hooks/use-diary-log";
import { Food } from "@/lib/api-client";
import { CalorieDial } from "@/components/ui/calorie-dial";
import { SegmentedBar } from "@/components/ui/segmented-bar";
import { BottomDock } from "@/components/layout/bottom-dock";
import { AddFoodSheet } from "@/components/diary/add-food-sheet";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
} from "@/lib/runeicons";

export default function DiaryPage() {
  const [activeDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  const [targetSlot, setTargetSlot] = useState("breakfast");

  const initialLogs = [
    {
      id: "initial-log-1",
      user_id: "demo-user",
      food_id: "food-4",
      meal_slot: "breakfast" as const,
      quantity: 1,
      serving_size_g: 60,
      nutrients_snapshot: {
        calories: 228,
        protein: 8.1,
        carbohydrates: 40.2,
        fat: 3.9,
        fiber: 6.0,
        sodium: 4,
      },
      log_date: activeDate,
      created_at: new Date().toISOString(),
    },
    {
      id: "initial-log-2",
      user_id: "demo-user",
      food_id: "food-5",
      meal_slot: "breakfast" as const,
      quantity: 1,
      serving_size_g: 200,
      nutrients_snapshot: {
        calories: 126,
        protein: 7.0,
        carbohydrates: 9.6,
        fat: 6.6,
        fiber: 0.0,
        sodium: 80,
      },
      log_date: activeDate,
      created_at: new Date().toISOString(),
    },
    {
      id: "initial-log-3",
      user_id: "demo-user",
      food_id: "food-6",
      meal_slot: "breakfast" as const,
      quantity: 1,
      serving_size_g: 100,
      nutrients_snapshot: {
        calories: 105,
        protein: 1.3,
        carbohydrates: 27.0,
        fat: 0.4,
        fiber: 3.1,
        sodium: 1,
      },
      log_date: activeDate,
      created_at: new Date().toISOString(),
    },
    {
      id: "initial-log-4",
      user_id: "demo-user",
      food_id: "food-rice",
      meal_slot: "lunch" as const,
      quantity: 1,
      serving_size_g: 150,
      nutrients_snapshot: {
        calories: 168,
        protein: 3.9,
        carbohydrates: 34.5,
        fat: 1.4,
        fiber: 2.7,
        sodium: 5,
      },
      log_date: activeDate,
      created_at: new Date().toISOString(),
    },
    {
      id: "initial-log-5",
      user_id: "demo-user",
      food_id: "food-beef",
      meal_slot: "lunch" as const,
      quantity: 1,
      serving_size_g: 150,
      nutrients_snapshot: {
        calories: 320,
        protein: 39.0,
        carbohydrates: 0.0,
        fat: 17.5,
        fiber: 0.0,
        sodium: 90,
      },
      log_date: activeDate,
      created_at: new Date().toISOString(),
    },
  ];

  const { logs, progress, logMealOptimistic } = useDiaryLog(initialLogs, {
    log_date: activeDate,
    total_nutrients: {
      calories: 1041,
      protein: 62,
      carbohydrates: 133,
      fat: 21,
      fiber: 14,
      sodium: 180,
    },
    target_nutrients: {
      calories: 2000,
      protein: 104,
      carbohydrates: 254,
      fat: 65,
      fiber: 30,
      sodium: 2300,
    },
    logs_count: 5,
  });

  const handleOpenAdd = (slot = "breakfast") => {
    setTargetSlot(slot);
    setIsAddSheetOpen(true);
  };

  const handleLogFood = async (
    food: Food,
    quantity: number,
    servingSizeG: number,
    slot: any
  ) => {
    await logMealOptimistic(food, slot, quantity, servingSizeG, activeDate);
  };

  const totalCalories = progress?.total_nutrients?.calories || 1041;
  const targetCalories = progress?.target_nutrients?.calories || 2000;
  const remainingCalories = Math.max(targetCalories - totalCalories, 0);

  const proteinConsumed = progress?.total_nutrients?.protein || 62;
  const proteinTarget = progress?.target_nutrients?.protein || 104;

  const carbConsumed = progress?.total_nutrients?.carbohydrates || 133;
  const carbTarget = progress?.target_nutrients?.carbohydrates || 254;

  const fatConsumed = progress?.total_nutrients?.fat || 21;
  const fatTarget = progress?.target_nutrients?.fat || 65;

  const fiberConsumed = progress?.total_nutrients?.fiber || 14;
  const fiberTarget = progress?.target_nutrients?.fiber || 30;

  const mealSlots = [
    { key: "breakfast", title: "Bữa sáng" },
    { key: "lunch", title: "Bữa trưa" },
    { key: "dinner", title: "Bữa tối" },
    { key: "snack", title: "Ăn vặt" },
  ];

  return (
    <div className="min-h-screen bg-[#F3F4F6] pb-24 md:pb-12">
      {/* Mobile Header Bar */}
      <div className="md:hidden bg-[#0A0A0A] text-white px-4 pt-3 pb-2 flex items-center justify-between">
        <span className="text-xl font-black italic tracking-tighter uppercase font-mono">
          H1T <span className="text-[#2563EB]">MICRO</span>
        </span>
        <div className="flex items-center gap-2 text-xs font-bold text-neutral-300">
          <ChevronLeftIcon className="w-4 h-4 cursor-pointer" />
          <span>Hôm nay, 10/10</span>
          <ChevronRightIcon className="w-4 h-4 cursor-pointer" />
        </div>
      </div>

      {/* Top Black Summary Card (H1T MICRO Identity) */}
      <div className="bg-[#0A0A0A] text-white rounded-b-3xl md:rounded-3xl p-5 md:p-8 shadow-md">
        <div className="hidden md:flex items-center justify-between mb-6 pb-4 border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black italic uppercase tracking-tight">
              HÔM NAY
            </h1>
            <span className="text-neutral-400 font-bold text-sm">
              10/10/2026
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleOpenAdd("breakfast")}
              className="px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <PlusIcon className="w-4 h-4 stroke-[3]" />
              Thêm món ăn
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          {/* Calorie Dial Column */}
          <div className="md:col-span-4 flex items-center justify-center md:justify-start gap-4">
            <CalorieDial current={totalCalories} target={targetCalories} />
            <div className="md:hidden">
              <div className="text-xs font-medium text-neutral-400">
                Mục tiêu <strong className="text-white">{targetCalories} kcal</strong>
              </div>
              <div className="text-xs font-medium text-neutral-400 mt-0.5">
                Còn <strong className="text-[#2563EB]">{remainingCalories} kcal</strong> · Ngày tập 60&apos;
              </div>
            </div>
          </div>

          {/* Macro Segmented Bars Column */}
          <div className="md:col-span-8 space-y-3">
            {/* Đạm (Protein) */}
            <div>
              <div className="flex justify-between items-center text-xs font-bold mb-1">
                <span className="text-neutral-200">Đạm</span>
                <span className="text-neutral-300 font-mono">
                  {proteinConsumed} / {proteinTarget} g
                </span>
              </div>
              <SegmentedBar
                totalSegments={8}
                filledSegments={Math.round((proteinConsumed / proteinTarget) * 8)}
                color="gold"
              />
            </div>

            {/* Tinh bột (Carbohydrates) */}
            <div>
              <div className="flex justify-between items-center text-xs font-bold mb-1">
                <span className="text-neutral-200">Tinh bột</span>
                <span className="text-neutral-300 font-mono">
                  {carbConsumed} / {carbTarget} g
                </span>
              </div>
              <SegmentedBar
                totalSegments={8}
                filledSegments={Math.round((carbConsumed / carbTarget) * 8)}
                color="gold"
              />
            </div>

            {/* Béo (Fat) */}
            <div>
              <div className="flex justify-between items-center text-xs font-bold mb-1">
                <span className="text-neutral-200">Béo</span>
                <span className="text-neutral-300 font-mono">
                  {fatConsumed} / {fatTarget} g
                </span>
              </div>
              <SegmentedBar
                totalSegments={8}
                filledSegments={Math.round((fatConsumed / fatTarget) * 8)}
                color="gold"
              />
            </div>

            {/* Chất xơ (Fiber) */}
            <div>
              <div className="flex justify-between items-center text-xs font-bold mb-1">
                <span className="text-neutral-200">Chất xơ</span>
                <span className="text-neutral-300 font-mono">
                  {fiberConsumed} / {fiberTarget} g
                </span>
              </div>
              <SegmentedBar
                totalSegments={8}
                filledSegments={Math.round((fiberConsumed / fiberTarget) * 8)}
                color="coral"
              />
            </div>

            <div className="hidden md:flex justify-between text-xs text-neutral-400 pt-2 border-t border-neutral-800">
              <span>Mục tiêu: {targetCalories} kcal</span>
              <span>Còn lại: {remainingCalories} kcal</span>
              <span>Thời gian tập luyện: 60 phút</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Body */}
      <div className="px-4 md:px-0 mt-4 md:mt-6 space-y-4">
        {/* Micronutrient Progress Banner (Direct navigation to /micros) */}
        <Link
          href="/micros"
          className="block bg-white rounded-2xl p-4 border border-neutral-100 shadow-xs hover:border-blue-200 transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl font-black italic tracking-tighter text-[#2563EB] font-mono leading-none">
                8/21
              </span>
              <div>
                <div className="font-bold text-sm text-neutral-900 group-hover:text-blue-600 transition-colors">
                  Vi chất đã đạt mục tiêu
                </div>
                <div className="text-xs text-neutral-500 mt-0.5">
                  Thiếu nhiều nhất: Vitamin D, Canxi
                </div>
              </div>
            </div>
            <ChevronRightIcon className="w-5 h-5 text-neutral-400 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </Link>

        {/* Meal Logs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {mealSlots.map((slot) => {
            const slotLogs = logs.filter(
              (l) => l.meal_slot.toLowerCase() === slot.key.toLowerCase()
            );
            const slotCalories = slotLogs.reduce(
              (sum, l) => sum + (l.nutrients_snapshot.calories || 0),
              0
            );

            return (
              <div
                key={slot.key}
                className="bg-white rounded-2xl p-4 sm:p-5 border border-neutral-100 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-neutral-100 mb-3">
                    <h3 className="font-black text-base text-neutral-900">
                      {slot.title}
                    </h3>
                    <div className="flex items-center gap-3">
                      <span className="font-bold font-mono text-sm text-neutral-700">
                        {slotCalories} kcal
                      </span>
                      <button
                        onClick={() => handleOpenAdd(slot.key)}
                        className="w-7 h-7 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-700 transition-colors"
                        aria-label={`Thêm vào ${slot.title}`}
                      >
                        <PlusIcon className="w-4 h-4 stroke-[2.5]" />
                      </button>
                    </div>
                  </div>

                  {slotLogs.length === 0 ? (
                    <div className="py-6 text-center text-xs font-semibold text-neutral-400 bg-neutral-50 rounded-xl my-2">
                      Chưa ghi món cho {slot.title}
                    </div>
                  ) : (
                    <div className="space-y-3 my-2">
                      {slotLogs.map((log) => (
                        <div
                          key={log.id}
                          className="flex items-center justify-between text-sm py-1"
                        >
                          <div className="flex items-center gap-1.5 min-w-0 pr-2">
                            <span className="font-bold text-neutral-800 truncate">
                              Món ăn
                            </span>
                            <span className="text-neutral-400">·</span>
                            <span className="text-neutral-500 font-medium text-xs truncate">
                              {Math.round(log.quantity * log.serving_size_g)} g
                            </span>
                          </div>
                          <span className="font-mono text-neutral-600 font-bold shrink-0 text-xs">
                            {log.nutrients_snapshot.calories} kcal
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Floating Bottom Navigation Dock for Mobile */}
      <BottomDock onAddClick={() => handleOpenAdd("breakfast")} />

      {/* Add Food Modal Sheet */}
      <AddFoodSheet
        isOpen={isAddSheetOpen}
        onClose={() => setIsAddSheetOpen(false)}
        defaultSlot={targetSlot}
        onLogFood={handleLogFood}
      />
    </div>
  );
}
