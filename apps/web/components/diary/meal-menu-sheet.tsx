"use client";

import React, { useEffect, useState } from "react";
import { Sheet } from "@/components/ui/sheet";
import { formatAmount } from "@/lib/format";

export interface MealMenuSheetProps {
  open: boolean;
  onClose: () => void;
  mealName: string;
  /** What the meal holds today */
  itemCount: number;
  kcal: number;
  /** What yesterday's same meal holds. 0 items: nothing to copy. */
  yesterdayItemCount: number;
  yesterdayKcal: number;
  onCopyYesterday: () => void;
  onDelete: () => void;
}

const optionClass =
  "w-full min-h-[56px] px-1 py-2 flex flex-col items-start justify-center text-left bg-transparent border-0 border-t border-divider first:border-t-0 enabled:cursor-pointer enabled:active:scale-[0.99] disabled:cursor-default";

/**
 * The ⋯ menu of one meal (today only): Chép hôm qua, Lưu thành Bữa của tôi (not built until step 5, so it is a
 * disabled item with a note) and Xoá bữa này, which asks for a confirm step first. A bottom sheet on a phone,
 * a centred dialog on desktop.
 */
export function MealMenuSheet({
  open,
  onClose,
  mealName,
  itemCount,
  kcal,
  yesterdayItemCount,
  yesterdayKcal,
  onCopyYesterday,
  onDelete,
}: MealMenuSheetProps) {
  const [confirming, setConfirming] = useState(false);

  // Every opening starts at the menu, never at a stale confirm step
  useEffect(() => {
    if (!open) setConfirming(false);
  }, [open]);

  const canCopy = yesterdayItemCount > 0;
  const canDelete = itemCount > 0;

  return (
    <Sheet open={open} onClose={onClose} title={confirming ? `Xoá ${mealName}?` : mealName} titleId="meal-menu-title" desktopDialog>
      {confirming ? (
        <>
          <p className="m-0 px-1 text-sm leading-snug text-secondary">
            {itemCount} món · {formatAmount(kcal, "kcal")} kcal sẽ bị xoá khỏi {mealName}. Bạn có 5 giây để hoàn tác.
          </p>
          <button
            type="button"
            onClick={() => {
              onDelete();
              onClose();
            }}
            className="mt-2 min-h-[52px] w-full cursor-pointer rounded-full border border-destructive bg-card text-[15px] font-bold text-destructive-text active:scale-[0.97] motion-reduce:active:scale-100"
          >
            Xoá bữa này
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="min-h-[52px] w-full cursor-pointer rounded-full border border-card-border bg-card text-[15px] font-bold text-text active:scale-[0.97] motion-reduce:active:scale-100"
          >
            Huỷ
          </button>
        </>
      ) : (
        <>
          <div className="flex flex-col">
            <button
              type="button"
              disabled={!canCopy}
              onClick={() => {
                onCopyYesterday();
                onClose();
              }}
              className={optionClass}
            >
              <span className={`text-base font-bold ${canCopy ? "text-text" : "text-secondary"}`}>Chép hôm qua</span>
              <span className="text-[13px] text-secondary">
                {canCopy
                  ? `Chép ${yesterdayItemCount} món · ${formatAmount(yesterdayKcal, "kcal")} kcal từ hôm qua`
                  : "Hôm qua chưa ghi bữa này"}
              </span>
            </button>
            <button type="button" disabled aria-disabled="true" className={optionClass}>
              <span className="text-base font-bold text-secondary">Lưu thành Bữa của tôi</span>
              <span className="text-[13px] text-secondary">Sẽ có ở bản sau</span>
            </button>
            <button type="button" disabled={!canDelete} onClick={() => setConfirming(true)} className={optionClass}>
              <span className={`text-base font-bold ${canDelete ? "text-destructive-text" : "text-secondary"}`}>Xoá bữa này</span>
              <span className="text-[13px] text-secondary">
                {canDelete ? `Xoá ${itemCount} món, có thể hoàn tác` : "Bữa này chưa có món"}
              </span>
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="mt-1 min-h-[52px] w-full cursor-pointer rounded-full border border-card-border bg-card text-[15px] font-bold text-text active:scale-[0.97] motion-reduce:active:scale-100"
          >
            Đóng
          </button>
        </>
      )}
    </Sheet>
  );
}
