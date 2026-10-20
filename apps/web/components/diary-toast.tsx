"use client";

import React, { useRef } from "react";
import { Presence } from "@/components/ui/presence";
import { Toast } from "@/components/ui/toast";
import { useToastSwipe } from "@/components/ui/use-toast-swipe";
import { useDiary, useDiaryToast, type ToastInfo } from "@/lib/diary-store";
import { scrollBehavior } from "@/lib/scroll-behavior";
import { openSyncList } from "@/lib/sync-ui";
import { usePathname } from "next/navigation";

/**
 * The app's one toast, from the diary store. "Đã thêm …" offers Xem (jump to the meal), "Đã xóa …",
 * "Đã chép …", "Đã chuyển …" and the one-tap adds (a recent, a Bữa ăn của tôi, Chỉ ghi kcal) offer Hoàn tác, "Đã lưu …" offers
 * Xem (Khám phá), "Chưa lưu được món" offers Thử lại. The store ends it after its duration. cc-55: the countdown bar is
 * CSS (no timer re-rendering the toast), and each toast rises in and fades away (Presence).
 */
export function DiaryToast() {
  const { undoParkedDelete, undoLastDelete, undoCopy, undoMove, retryUnsaved, setHighlightedMeal, pauseToast, resumeToast, dismissToast } = useDiary();
  const { toast, parkedDelete } = useDiaryToast();
  const swipe = useToastSwipe(dismissToast);
  // A new toast is a new element: its countdown starts over
  const ids = useRef({ map: new WeakMap<ToastInfo, number>(), next: 0 });
  const idOf = (t: ToastInfo) => {
    const { map } = ids.current;
    if (!map.has(t)) map.set(t, ++ids.current.next);
    return map.get(t);
  };

  // The nav is 72 px high plus the home-indicator inset: the toast sits 12 px above it. /add has no nav: the toast clears the Khay bar.
  const onAdd = usePathname() === "/add";

  const mealSlot = toast?.mealSlot ?? null;
  const showMeal = () => {
    if (!mealSlot) return;
    setHighlightedMeal(mealSlot);
    const el = document.getElementById(`meal-${mealSlot}`) || document.getElementById(`desktop-meal-${mealSlot}`);
    el?.scrollIntoView({ behavior: scrollBehavior(), block: "center" });
    setTimeout(() => setHighlightedMeal(null), 2500);
  };

  return (
    // cc-58: one live region that stays mounted: a toast put into it is announced, one that came with its own region often is not
    <div role="status" className={`pointer-events-none fixed inset-x-0 z-sheet flex flex-col gap-2 px-3 lg:inset-x-auto lg:bottom-8 lg:right-8 lg:w-[400px] ${
        onAdd ? "bottom-[calc(138px+env(safe-area-inset-bottom))]" : "bottom-[calc(72px+env(safe-area-inset-bottom)+12px)]"
      }`}>
      <Presence>
        {parkedDelete && (
          <div className="pointer-events-auto">
            <Toast
              announce={false}
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
            announce={false}
            onPause={pauseToast}
            onResume={resumeToast}
            swipe={swipe}
            // cc-64 (2b): repeated adds into one meal are one toast that updates in place (same element, text and clock renewed)
            key={toast.groupId !== undefined ? `g${toast.groupId}` : idOf(toast)}
            message={toast.message}
            actionLabel={
              toast.kind === "notice"
                ? undefined
                : toast.kind === "unsaved"
                  ? "Thử lại"
                  : toast.kind === "left"
                    ? "Xem lý do"
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
                      ? () => void retryUnsaved()
                      : toast.kind === "left"
                        ? openSyncList
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
