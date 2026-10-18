"use client";

import React, { useRef } from "react";
import { Presence } from "@/components/ui/presence";
import { Toast } from "@/components/ui/toast";
import { useDiary, type ToastInfo } from "@/lib/diary-store";

/**
 * The app's one toast, from the diary store. "Đã thêm …" offers Xem (jump to the meal), "Đã xóa …",
 * "Đã chép …", "Đã chuyển …" and the one-tap adds (a recent, a Bữa ăn của tôi, Chỉ ghi kcal) offer Hoàn tác, "Đã lưu …" offers
 * Xem (Khám phá), "Chưa lưu được món" offers Thử lại. The store ends it after its duration. cc-55: the countdown bar is
 * CSS (no timer re-rendering the toast), and each toast rises in and fades away (Presence).
 */
export function DiaryToast() {
  const { toast, parkedDelete, undoParkedDelete, undoLastDelete, undoCopy, undoMove, retryUnsaved, setHighlightedMeal } = useDiary();
  // A new toast is a new element: its countdown starts over
  const ids = useRef({ map: new WeakMap<ToastInfo, number>(), next: 0 });
  const idOf = (t: ToastInfo) => {
    const { map } = ids.current;
    if (!map.has(t)) map.set(t, ++ids.current.next);
    return map.get(t);
  };

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
      <Presence>
        {parkedDelete && (
          <div className="pointer-events-auto">
            <Toast
              key={idOf(parkedDelete.toast)}
              message={parkedDelete.toast.message}
              actionLabel="Hoàn tác"
              onAction={undoParkedDelete}
              countdown={{ totalMs: parkedDelete.toast.durationMs, leftMs: parkedDelete.expiresAt - Date.now() }}
            />
          </div>
        )}
      </Presence>
      <Presence>
        {toast && (
        <div className="pointer-events-auto">
          <Toast
            key={idOf(toast)}
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
            countdown={{ totalMs: toast.durationMs, leftMs: toast.durationMs }}
          />
        </div>
        )}
      </Presence>
    </div>
  );
}
