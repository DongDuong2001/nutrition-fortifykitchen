"use client";

import React, { useEffect, useState } from "react";
import { Toast } from "@/components/ui/toast";
import { useDiary } from "@/lib/diary-store";

const TICK_MS = 100;

/**
 * The app's one toast, from the diary store. "Đã thêm …" offers Xem (jump to the meal) and
 * "Đã xoá …" offers Hoàn tác. The store ends it after its duration; this draws the countdown.
 */
export function DiaryToast() {
  const { toast, undoLastDelete, setHighlightedMeal } = useDiary();
  const [percent, setPercent] = useState(100);

  useEffect(() => {
    if (!toast) return;
    const started = Date.now();
    const timer = setInterval(() => {
      setPercent(Math.max(0, 100 - ((Date.now() - started) / toast.durationMs) * 100));
    }, TICK_MS);
    return () => {
      clearInterval(timer);
      setPercent(100);
    };
  }, [toast]);

  if (!toast) return null;

  const showMeal = () => {
    if (!toast.mealSlot) return;
    setHighlightedMeal(toast.mealSlot);
    const el = document.getElementById(`meal-${toast.mealSlot}`) || document.getElementById(`desktop-meal-${toast.mealSlot}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => setHighlightedMeal(null), 2500);
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-50 px-3 lg:inset-x-auto lg:bottom-8 lg:right-8 lg:w-[400px]">
      <div className="pointer-events-auto">
        <Toast
          message={toast.message}
          actionLabel={toast.kind === "deleted" ? "Hoàn tác" : "Xem"}
          onAction={toast.kind === "deleted" ? undoLastDelete : showMeal}
          progressPercent={percent}
        />
      </div>
    </div>
  );
}
