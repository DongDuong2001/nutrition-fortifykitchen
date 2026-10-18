"use client";

import React, { useState } from "react";
import { Sheet } from "@/components/ui/sheet";
import { PillButton } from "@/components/ui/pill-button";
import { NO_ENERGY_MESSAGE } from "@/lib/diary-edits";
import { formatAmount } from "@/lib/format";
import { parseGramsInput, formatGramsServingLabel, hidesGrams, scaleNutrients, unitCountOf } from "@/lib/portion";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import type { TrayItem, TrayTotals } from "@/lib/tray";

const kcalText = (kcal: number | null) => (kcal === null ? "—" : formatAmount(kcal, "kcal"));
const gramsText = (value: number | null) => (value === null ? "—" : `${formatAmount(value, "g")} g`);

export interface TrayBarProps {
  totals: TrayTotals;
  mealName: string;
  canAdd: boolean;
  submitting?: boolean;
  onReview: () => void;
  onAdd: () => void;
  className?: string;
}

/** The bar fixed under the /add list while the tray holds a food: count, total, Xem lại and the one primary action. */
export function TrayBar({ totals, mealName, canAdd, submitting = false, onReview, onAdd, className = "" }: TrayBarProps) {
  return (
    <div
      role="region"
      aria-label={`${totals.count} món · ${kcalText(totals.kcal)} kcal`}
      data-tray-bar
      data-tour="tray-bar"
      className={`flex items-center gap-2 rounded-[18px] bg-ink px-3 py-2 text-on-dark shadow-lg ${className}`}
    >
      <span aria-hidden="true" className="flex h-7 min-w-7 shrink-0 items-center justify-center rounded-full bg-blue px-2 text-sm font-bold text-on-accent tabular-nums">
        {totals.count}
      </span>
      <span aria-hidden="true" className="min-w-0 flex-1 whitespace-nowrap text-[13px] font-semibold leading-tight">
        món · {kcalText(totals.kcal)} kcal
      </span>
      <button
        type="button"
        onClick={onReview}
        className="min-h-11 shrink-0 cursor-pointer rounded-full border-0 bg-transparent px-2 text-[13px] font-bold text-sky active:scale-[0.97] motion-reduce:active:scale-100"
      >
        Xem lại
      </button>
      <button
        type="button"
        onClick={onAdd}
        disabled={!canAdd || submitting}
        className="min-h-11 shrink-0 cursor-pointer rounded-full border-0 bg-blue px-4 text-[13px] font-bold text-on-accent active:scale-[0.97] disabled:cursor-default disabled:opacity-50 motion-reduce:active:scale-100"
      >
        Thêm vào {mealName}
      </button>
    </div>
  );
}

function PortionRow({
  item,
  onRemove,
  onSetPortion,
}: {
  item: TrayItem;
  onRemove: () => void;
  onSetPortion: (grams: number, label: string) => void;
}) {
  const { food } = item;
  const [custom, setCustom] = useState(!food.servings.some((s) => s.label === item.label));
  const [text, setText] = useState(String(item.grams));
  const kcal = scaleNutrients(food.nutrients, item.grams).energy;
  const chipClass = (on: boolean) =>
    `min-h-11 cursor-pointer rounded-full px-3 text-xs active:scale-[0.97] motion-reduce:active:scale-100 ${
      on ? "border-0 bg-ink font-bold text-on-dark" : "border border-card-border bg-card font-medium text-text"
    }`;
  return (
    <li className="flex flex-col gap-2 border-t border-divider py-3 first:border-t-0">
      <div className="flex items-start gap-2">
        <span title={food.nameVi} className="line-clamp-2 min-w-0 flex-1 break-words text-[15px] font-bold leading-snug">
          {food.nameVi}
        </span>
        <span className="shrink-0 pt-0.5 text-[15px] font-bold tabular-nums">
          {typeof kcal === "number" ? formatAmount(kcal, "kcal") : "—"} <span className="text-xs font-medium text-secondary">kcal</span>
        </span>
        <button
          type="button"
          onClick={onRemove}
          aria-label="Bỏ khỏi khay"
          title={`Bỏ khỏi khay: ${food.nameVi}`}
          className="-my-1 -mr-2 flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-secondary active:scale-[0.97] motion-reduce:active:scale-100"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
      <div role="group" aria-label={`Khẩu phần ${food.nameVi}`} className="flex flex-wrap items-center gap-2">
        {food.servings.map((s) => (
          <button
            key={s.label}
            type="button"
            aria-pressed={!custom && (hidesGrams(food) ? unitCountOf(food.servings, item.label, item.grams)?.serving.label : item.label) === s.label}
            onClick={() => {
              setCustom(false);
              setText(String(s.grams));
              onSetPortion(s.grams, s.label);
            }}
            className={chipClass(!custom && (hidesGrams(food) ? unitCountOf(food.servings, item.label, item.grams)?.serving.label : item.label) === s.label)}
          >
            {s.label}
          </button>
        ))}
        {!hidesGrams(food) && (
          <button type="button" aria-pressed={custom} onClick={() => setCustom(true)} className={chipClass(custom)}>
            Nhập g
          </button>
        )}
        {custom && !hidesGrams(food) && (
          <label className="flex h-11 w-28 items-center gap-1 rounded-xl border-2 border-blue bg-surface px-2">
            <span className="sr-only">Số gam {food.nameVi}</span>
            <input
              type="text"
              inputMode="decimal"
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                const g = parseGramsInput(e.target.value);
                if (g > 0) onSetPortion(g, formatGramsServingLabel(e.target.value, `${e.target.value} g`));
              }}
              className="w-full border-0 bg-transparent text-right text-sm font-bold tabular-nums outline-none"
            />
            <span className="text-xs font-semibold text-secondary">g</span>
          </label>
        )}
      </div>
      {hidesGrams(food) && <QuantityStepper servings={food.servings} label={item.label} grams={item.grams} onChange={onSetPortion} />}
    </li>
  );
}

export interface TrayReviewSheetProps {
  open: boolean;
  onClose: () => void;
  items: TrayItem[];
  totals: TrayTotals;
  mealName: string;
  canAdd: boolean;
  submitting?: boolean;
  onRemove: (foodId: string) => void;
  onSetPortion: (foodId: string, grams: number, label: string) => void;
  onChangeMeal: () => void;
  onAdd: () => void;
}

/** "Xem lại": every food of the tray with its portion chips and a ×, the totals, the meal, and the add. */
export function TrayReviewSheet({
  open,
  onClose,
  items,
  totals,
  mealName,
  canAdd,
  submitting = false,
  onRemove,
  onSetPortion,
  onChangeMeal,
  onAdd,
}: TrayReviewSheetProps) {
  return (
    <Sheet open={open} onClose={onClose} title="Khay · xem lại" titleId="tray-review-title" description={`${mealName} · ${items.length} món`} desktopDialog>
      <div data-tray-review className="flex max-h-[62dvh] flex-col gap-2 overflow-y-auto">
        <ul className="m-0 flex list-none flex-col p-0">
          {items.map((item) => (
            <PortionRow
              key={item.food.id}
              item={item}
              onRemove={() => onRemove(item.food.id)}
              onSetPortion={(grams, label) => onSetPortion(item.food.id, grams, label)}
            />
          ))}
        </ul>
        <div data-align-group="tray-review" data-align-edge="left" className="flex items-baseline justify-between gap-3 border-t border-divider pt-3">
          <span className="text-sm font-semibold text-secondary">Tổng bữa ăn</span>
          <span className="font-display text-2xl font-black tabular-nums">
            {kcalText(totals.kcal)} <span className="text-sm font-semibold text-secondary">kcal</span>
          </span>
        </div>
        <p data-align-group="tray-review" data-align-edge="left" className="m-0 text-[13px] text-secondary">
          {gramsText(totals.protein)} đạm · {gramsText(totals.carbs)} tinh bột · {gramsText(totals.fat)} chất béo
        </p>
        <div data-align-group="tray-review" data-align-edge="left" className="flex items-center justify-between gap-3">
          <span className="text-sm font-semibold">Thêm vào</span>
          <button
            type="button"
            onClick={onChangeMeal}
            aria-label={`Thêm vào ${mealName}, đổi bữa`}
            className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-card-border bg-card px-4 text-sm font-bold text-text active:scale-[0.97] motion-reduce:active:scale-100"
          >
            {mealName}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
        </div>
        {items.length > 0 && !canAdd && (
          <p role="alert" className="m-0 rounded-xl bg-warning-bg px-3 py-2 text-[13px] leading-snug text-warning-text">
            {NO_ENERGY_MESSAGE}
          </p>
        )}
      </div>
      <div data-align-group="tray-review" data-align-edge="left" className="flex flex-col gap-2 pt-2">
        <PillButton variant="primary" onClick={onAdd} disabled={!canAdd || submitting}>
          Thêm {items.length} món vào {mealName}
        </PillButton>
        <PillButton variant="secondary" onClick={onClose}>
          Chọn thêm món
        </PillButton>
      </div>
    </Sheet>
  );
}
