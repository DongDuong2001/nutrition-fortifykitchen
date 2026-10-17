"use client";

import React, { useEffect, useState } from "react";
import { Toast } from "@/components/ui/toast";
import { useDiary } from "@/lib/diary-store";

const TICK_MS = 100;

/**
 * The app's one toast, from the diary store. "Đã thêm …" offers Xem (jump to the meal), "Đã xóa …",
 * "Đã chép …", "Đã chuyển …" and the one-tap adds (a recent, a Bữa ăn của tôi, Chỉ ghi kcal) offer Hoàn tác, "Đã lưu …" offers
 * Xem (Khám phá), "Chưa lưu được món" offers Thử lại. The store ends it after its duration; this draws the countdown.
 */
export function DiaryToast() {
  const { toast, parkedDelete, undoParkedDelete, undoLastDelete, undoCopy, undoMove, retryUnsaved, setHighlightedMeal } = useDiary();
  const [percent, setPercent] = useState(100);
  // A delete's toast parked under a newer one counts down on its own clock
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!parkedDelete) return;
    const timer = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(timer);
  }, [parkedDelete]);

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

  if (!toast && !parkedDelete) return null;

  const mealSlot = toast?.mealSlot ?? null;
  const showMeal = () => {
    if (!mealSlot) return;
    setHighlightedMeal(mealSlot);
    const el = document.getElementById(`meal-${mealSlot}`) || document.getElementById(`desktop-meal-${mealSlot}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => setHighlightedMeal(null), 2500);
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex flex-col gap-2 px-3 lg:inset-x-auto lg:bottom-8 lg:right-8 lg:w-[400px]">
      {parkedDelete && (
        <div className="pointer-events-auto">
          <Toast
            message={parkedDelete.toast.message}
            actionLabel="Hoàn tác"
            onAction={undoParkedDelete}
            progressPercent={((parkedDelete.expiresAt - now) / parkedDelete.toast.durationMs) * 100}
          />
        </div>
      )}
      {toast && (
        <div className="pointer-events-auto">
          <Toast
            message={toast.message}
            actionLabel={
              toast.kind === "notice"
                ? undefined
                : toast.kind === "unsaved"
                  ? "Thử lại"
                  : toast.kind === "added" || toast.kind === "saved"
                    ? "Xem"
                    : "Hoàn tác"
            }
            actionHref={toast.kind === "saved" ? "/explore" : undefined}
            onAction={
              toast.kind === "deleted"
                ? undoLastDelete
                : toast.kind === "undoable"
                  ? undoCopy
                  : toast.kind === "moved"
                    ? undoMove
                    : toast.kind === "unsaved"
                      ? retryUnsaved
                      : showMeal
            }
            progressPercent={percent}
          />
        </div>
      )}
    </div>
  );
}
