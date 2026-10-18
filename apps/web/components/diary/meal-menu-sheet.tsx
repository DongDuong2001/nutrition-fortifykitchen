"use client";

import React, { useEffect, useState } from "react";
import { Sheet } from "@/components/ui/sheet";
import { FormRow } from "@/components/ui/form-row";
import { PillButton } from "@/components/ui/pill-button";
import { kcalLabel } from "@/lib/kcal";

export interface MealMenuSheetProps {
  open: boolean;
  onClose: () => void;
  mealName: string;
  /** A past day is read-only: only Lưu thành Bữa ăn của tôi is offered. */
  readOnly?: boolean;
  /** What the meal holds on the day shown */
  itemCount: number;
  kcal: number | null;
  /** How many foods Lưu thành Bữa ăn của tôi would keep. 0 disables it. */
  savableCount: number;
  /** The name the save step starts with, "<Bữa> <dd/mm>". */
  defaultSaveName: string;
  /** What yesterday's same meal holds. 0 items: nothing to copy. */
  yesterdayItemCount: number;
  yesterdayKcal: number | null;
  onCopyYesterday: () => void;
  onSave: (name: string) => void;
  onDelete: () => void;
}

const optionClass =
  "w-full min-h-[56px] px-1 py-2 flex flex-col items-start justify-center text-left bg-transparent border-0 border-t border-divider first:border-t-0 enabled:cursor-pointer m-tint disabled:cursor-default";

type Step = "menu" | "confirm" | "name" | "copy";

/**
 * The ⋯ menu of one meal: Chép hôm qua (today), Lưu thành Bữa ăn của tôi (any day, asks for a name) and
 * Xóa bữa này (today), which asks for a confirm step first. A bottom sheet on a phone, a centred dialog on desktop.
 */
export function MealMenuSheet({
  open,
  onClose,
  mealName,
  readOnly = false,
  itemCount,
  kcal,
  savableCount,
  defaultSaveName,
  yesterdayItemCount,
  yesterdayKcal,
  onCopyYesterday,
  onSave,
  onDelete,
}: MealMenuSheetProps) {
  const [step, setStep] = useState<Step>("menu");
  const [name, setName] = useState(defaultSaveName);

  // Every opening starts at the menu, never at a stale confirm or name step
  useEffect(() => {
    if (!open) setStep("menu");
  }, [open]);

  const canCopy = yesterdayItemCount > 0;
  const canDelete = itemCount > 0;
  const canSave = savableCount > 0;

  const title =
    step === "confirm"
      ? `Xóa ${mealName}?`
      : step === "name"
        ? "Lưu thành Bữa ăn của tôi"
        : step === "copy"
          ? `Thêm ${yesterdayItemCount} món như hôm qua?`
          : mealName;

  return (
    <Sheet open={open} onClose={onClose} title={title} titleId="meal-menu-title" desktopDialog>
      {step === "copy" ? (
        <>
          <p className="m-0 px-1 text-sm leading-snug text-secondary">
            {yesterdayItemCount} món · {kcalLabel(yesterdayKcal)} của {mealName} hôm qua sẽ được thêm vào hôm nay. Bạn có 5 giây để hoàn tác.
          </p>
          <button
            type="button"
            onClick={() => {
              onCopyYesterday();
              onClose();
            }}
            className="mt-2 min-h-[52px] w-full cursor-pointer rounded-full border-0 bg-blue text-[15px] font-bold text-on-accent m-tint"
          >
            Thêm {yesterdayItemCount} món
          </button>
          <button
            type="button"
            onClick={() => setStep("menu")}
            className="min-h-[52px] w-full cursor-pointer rounded-full border border-card-border bg-card text-[15px] font-bold text-text m-tint"
          >
            Hủy
          </button>
        </>
      ) : step === "confirm" ? (
        <>
          <p className="m-0 px-1 text-sm leading-snug text-secondary">
            {itemCount} món · {kcalLabel(kcal)} sẽ bị xóa khỏi {mealName}. Bạn có 5 giây để hoàn tác.
          </p>
          <button
            type="button"
            onClick={() => {
              onDelete();
              onClose();
            }}
            className="mt-2 min-h-[52px] w-full cursor-pointer rounded-full border border-destructive bg-card text-[15px] font-bold text-destructive-text m-tint"
          >
            Xóa bữa này
          </button>
          <button
            type="button"
            onClick={() => setStep("menu")}
            className="min-h-[52px] w-full cursor-pointer rounded-full border border-card-border bg-card text-[15px] font-bold text-text m-tint"
          >
            Hủy
          </button>
        </>
      ) : step === "name" ? (
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            onSave(name);
            onClose();
          }}
          className="flex flex-col gap-3"
        >
          <p className="m-0 px-1 text-[13px] leading-snug text-secondary">
            {savableCount} món từ {mealName}, mỗi món giữ khẩu phần hiện tại.
          </p>
          <FormRow label="Tên bữa" htmlFor="save-meal-name">
            <input
              id="save-meal-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onFocus={(e) => e.currentTarget.select()}
              placeholder={defaultSaveName}
              autoComplete="off"
              className="h-12 w-full rounded-xl border-2 border-card-border bg-surface px-3 text-base text-text outline-none transition-colors focus:border-blue"
            />
          </FormRow>
          <PillButton type="submit" variant="primary">
            Lưu
          </PillButton>
          <PillButton type="button" variant="secondary" onClick={() => setStep("menu")}>
            Hủy
          </PillButton>
        </form>
      ) : (
        <>
          <div className="flex flex-col">
            {!readOnly && (
              <button
                type="button"
                disabled={!canCopy}
                onClick={() => setStep("copy")}
                className={optionClass}
              >
                <span className={`text-base font-bold ${canCopy ? "text-text" : "text-secondary"}`}>Như hôm qua</span>
                <span className="text-[13px] text-secondary">
                  {canCopy
                    ? `Thêm ${yesterdayItemCount} món · ${kcalLabel(yesterdayKcal)} như hôm qua`
                    : "Hôm qua chưa ghi bữa này"}
                </span>
              </button>
            )}
            <button
              type="button"
              disabled={!canSave}
              onClick={() => {
                setName(defaultSaveName);
                setStep("name");
              }}
              className={optionClass}
            >
              <span className={`text-base font-bold ${canSave ? "text-text" : "text-secondary"}`}>Lưu thành Bữa ăn của tôi</span>
              <span className="text-[13px] text-secondary">
                {canSave ? `Lưu ${savableCount} món để thêm lại bằng một chạm` : "Bữa này chưa có món để lưu"}
              </span>
            </button>
            {!readOnly && (
              <button type="button" disabled={!canDelete} onClick={() => setStep("confirm")} className={optionClass}>
                <span className={`text-base font-bold ${canDelete ? "text-destructive-text" : "text-secondary"}`}>Xóa bữa này</span>
                <span className="text-[13px] text-secondary">
                  {canDelete ? `Xóa ${itemCount} món, có thể hoàn tác` : "Bữa này chưa có món"}
                </span>
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="mt-1 min-h-[52px] w-full cursor-pointer rounded-full border border-card-border bg-card text-[15px] font-bold text-text m-tint"
          >
            Đóng
          </button>
        </>
      )}
    </Sheet>
  );
}
