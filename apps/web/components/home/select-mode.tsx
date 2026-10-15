"use client";

import React, { useState } from "react";
import { Sheet } from "@/components/ui/sheet";
import { PillButton } from "@/components/ui/pill-button";
import { TARGET_MEALS, actionBarLabel, selectTitle, type CopyTarget } from "@/lib/multi-select";

const HEAD_BUTTON =
  "inline-flex min-h-11 shrink-0 cursor-pointer items-center rounded-full border-0 bg-transparent px-2 text-[15px] font-bold text-on-dark hover:text-sky active:scale-[0.97] motion-reduce:active:scale-100 focus-visible:outline-sky lg:text-blue lg:hover:text-blue";

/** The header of select mode: Hủy · "Đã chọn N" with the date · Chọn hết. It takes the place of the day header. */
export function SelectHeader({
  count,
  dateLabel,
  allSelected,
  onCancel,
  onToggleAll,
}: {
  count: number;
  dateLabel: string;
  allSelected: boolean;
  onCancel: () => void;
  onToggleAll: () => void;
}) {
  return (
    <header className="w-full flex-none select-none rounded-b-[20px] bg-ink text-on-dark lg:rounded-none lg:bg-page lg:text-text">
      <div className="mx-auto flex min-h-[52px] w-full max-w-[560px] items-center gap-2 px-3 pt-[max(4px,env(safe-area-inset-top))] pb-1 lg:max-w-[1100px] lg:px-8 lg:pt-8">
        <button type="button" onClick={onCancel} className={`${HEAD_BUTTON} -ml-2`}>
          Hủy
        </button>
        <div className="min-w-0 flex-1 text-center">
          <h1 aria-live="polite" className="m-0 text-[15px] font-bold leading-tight">
            {selectTitle(count)}
          </h1>
          <p className="m-0 text-xs leading-snug text-muted-subtitle lg:text-secondary">{dateLabel}</p>
        </div>
        <button type="button" onClick={onToggleAll} className={`${HEAD_BUTTON} -mr-2`}>
          {allSelected ? "Bỏ chọn hết" : "Chọn hết"}
        </button>
      </div>
    </header>
  );
}

const ACTION =
  "inline-flex min-h-11 w-full cursor-pointer items-center justify-center rounded-full border px-3 text-[15px] font-bold active:scale-[0.97] disabled:cursor-default disabled:opacity-50 motion-reduce:active:scale-100";

/** The action bar of select mode, in the bottom nav's place: "N món · X kcal" and the buttons. */
export function SelectActionBar({
  count,
  kcal,
  past,
  onCopy,
  onMove,
  onDelete,
  onCopyToToday,
}: {
  count: number;
  kcal: number;
  /** A past day is read-only: the only action is Chép vào hôm nay. */
  past: boolean;
  onCopy: () => void;
  onMove: () => void;
  onDelete: () => void;
  onCopyToToday: () => void;
}) {
  const none = count === 0;
  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-col gap-2 px-3 py-2 lg:max-w-[1100px] lg:px-8">
      <p data-align-group="select-bar" role="status" className="m-0 text-[13px] font-semibold leading-snug text-text tabular-nums">
        {actionBarLabel(count, kcal)}
      </p>
      {past ? (
        <button
          type="button"
          data-align-group="select-bar"
          disabled={none}
          onClick={onCopyToToday}
          className={`${ACTION} border-transparent bg-blue text-on-accent`}
        >
          Chép vào hôm nay
        </button>
      ) : (
        <div data-align-group="select-bar" className="grid grid-cols-3 gap-2">
          <button type="button" disabled={none} onClick={onCopy} className={`${ACTION} border-card-border bg-card text-text`}>
            Chép sang
          </button>
          <button type="button" disabled={none} onClick={onMove} className={`${ACTION} border-card-border bg-card text-text`}>
            Chuyển bữa
          </button>
          <button type="button" disabled={none} onClick={onDelete} className={`${ACTION} border-destructive bg-card text-destructive-text`}>
            Xóa
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Pick the meal the chosen foods go to (Chép sang, Chuyển bữa) or, on a past day, where the copies land
 * ("Giữ nguyên bữa" or one of the four meals). The radios have one 44 px row each.
 */
export function MealTargetSheet({
  open,
  onClose,
  title,
  description,
  withKeep,
  initial,
  confirmLabel,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  /** Offers "Giữ nguyên bữa" first (and as the default). */
  withKeep: boolean;
  /** The meal that starts picked when there is no "Giữ nguyên bữa". */
  initial: CopyTarget;
  confirmLabel: string;
  onConfirm: (target: CopyTarget) => void;
}) {
  return (
    <Sheet open={open} onClose={onClose} title={title} titleId="select-target-title" description={description} desktopDialog>
      <TargetBody withKeep={withKeep} initial={initial} confirmLabel={confirmLabel} onClose={onClose} onConfirm={onConfirm} />
    </Sheet>
  );
}

// Mounted only while the sheet is open, so each opening starts from the default
function TargetBody({
  withKeep,
  initial,
  confirmLabel,
  onClose,
  onConfirm,
}: {
  withKeep: boolean;
  initial: CopyTarget;
  confirmLabel: string;
  onClose: () => void;
  onConfirm: (target: CopyTarget) => void;
}) {
  const [target, setTarget] = useState<CopyTarget>(withKeep ? "keep" : initial === "keep" ? "breakfast" : initial);
  const options: { id: CopyTarget; label: string }[] = [
    ...(withKeep ? [{ id: "keep" as const, label: "Giữ nguyên bữa" }] : []),
    ...TARGET_MEALS.map((m) => ({ id: m.id as CopyTarget, label: m.label })),
  ];
  return (
    <>
      <div role="radiogroup" aria-label="Vào bữa" className="flex flex-col">
        <span className="px-1 pb-1 text-[13px] font-semibold text-secondary">Vào bữa</span>
        {options.map((o) => {
          const checked = target === o.id;
          return (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={checked}
              data-align-group="select-target"
              onClick={() => setTarget(o.id)}
              className="flex min-h-[48px] w-full cursor-pointer items-center gap-3 border-0 border-t border-divider bg-transparent px-1 text-left text-[15px] text-text"
            >
              <span
                aria-hidden="true"
                className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-2 ${checked ? "border-blue" : "border-card-border"}`}
              >
                {checked && <span className="h-[10px] w-[10px] rounded-full bg-blue" />}
              </span>
              <span className={checked ? "font-bold" : "font-medium"}>{o.label}</span>
            </button>
          );
        })}
      </div>
      <PillButton type="button" variant="primary" onClick={() => onConfirm(target)}>
        {confirmLabel}
      </PillButton>
      <PillButton type="button" variant="secondary" onClick={onClose}>
        Hủy
      </PillButton>
    </>
  );
}

/** The ⋯ of the day: for now one option, Chọn nhiều món. */
export function DayMenuSheet({
  open,
  onClose,
  title,
  past,
  hasEntries,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  past: boolean;
  hasEntries: boolean;
  onSelect: () => void;
}) {
  return (
    <Sheet open={open} onClose={onClose} title={title} titleId="day-menu-title" desktopDialog>
      <button
        type="button"
        disabled={!hasEntries}
        onClick={() => {
          onClose();
          onSelect();
        }}
        className="flex min-h-[56px] w-full cursor-pointer flex-col items-start justify-center border-0 bg-transparent px-1 py-2 text-left disabled:cursor-default disabled:opacity-50"
      >
        <span className="text-[15px] font-bold text-text">Chọn nhiều món</span>
        <span className="text-[13px] leading-tight text-secondary">
          {hasEntries ? (past ? "Chép nhiều món vào hôm nay" : "Chép, chuyển bữa hoặc xóa nhiều món cùng lúc") : "Chưa có món nào"}
        </span>
      </button>
      <PillButton type="button" variant="secondary" onClick={onClose}>
        Đóng
      </PillButton>
    </Sheet>
  );
}
