"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { type FoodItem, MOCK_FOODS } from "@/lib/mock/foods";
import { type MealSlot, getMealSlotNameVi } from "@/lib/meal-slot";
import { parseGramsInput, calculateMacroPreview, macroGramsText, scaleNutrients, gramsServingLabel, unitAmountText, parsePortionLabel, portionModeOf, portionNote, portionSummary } from "@/lib/portion";
import { cookSwitchFor } from "@/lib/yield";
import { PortionArea } from "@/components/ui/portion-area";
import { DishParts } from "@/components/ui/dish-parts";
import { isDishFood, type AddOnEntry } from "@/lib/dish-recipes";
import { formatAmount } from "@/lib/format";
import { getNutrientDefinition } from "@/lib/nutrients";
import { useDiary } from "@/lib/diary-store";
import { canLog as canLogFood, energyNotice } from "@/lib/diary-edits";
import { kcalValue } from "@/lib/kcal";

export interface PortionPanelProps {
  food: FoodItem;
  gramsInput: string;
  setGramsInput: (val: string) => void;
  selectedServingLabel: string;
  setSelectedServingLabel: (val: string) => void;
  mealSlot: MealSlot | null;
  onAdd: () => void;
  onAddAndContinue?: () => void;
  isSubmitting?: boolean;
  showMicros?: boolean;
  className?: string;
  onFoodChange?: (food: FoodItem) => void;
  /** The heading's id, for a sheet that is named by it */
  headingId?: string;
  /**
   * cc-54: where the add-ons of a dish ("+ Bún") that are switched on are reported, as entries to log with it. Without
   * this a dish shows no Thành phần (a screen that cannot log the extras does not offer them).
   */
  onExtrasChange?: (entries: AddOnEntry[]) => void;
}

/**
 * The portion sheet (design/portion-mockup/Main.dc.html, cc-53b): the food, its portion area, a dark card with kcal
 * and macros, a note on how the amount is read, and the cobalt add. Phone: in a sheet; desktop: the add dialog's
 * right pane; Ngày tập: in the tick sheet.
 */
export function PortionPanel({
  food,
  gramsInput,
  setGramsInput,
  selectedServingLabel,
  setSelectedServingLabel,
  mealSlot,
  onAdd,
  onAddAndContinue,
  isSubmitting = false,
  showMicros = false,
  className = "",
  onFoodChange,
  headingId,
  onExtrasChange,
}: PortionPanelProps) {
  const canLog = canLogFood(food);
  const notice = energyNotice(food);
  const parsedGrams = useMemo(() => parseGramsInput(gramsInput), [gramsInput]);

  // How the amount reads: "3 quả lớn", "300 g đã nấu chín"; a unit food keeps its quantity ("2 viên")
  const mode = portionModeOf(food);
  const parsed = mode === "units" ? null : parsePortionLabel(selectedServingLabel);
  // An older "1 quả" of a fruit reads as an egg label: only an egg food takes it as one
  const portion = parsed?.kind === "egg" && mode !== "egg" ? null : parsed;
  const canSwap = !!onFoodChange;
  const sw = useMemo(() => (mode === "grams" ? cookSwitchFor(food, MOCK_FOODS, canSwap) : null), [mode, food, canSwap]);
  const amountText = unitAmountText(food, selectedServingLabel, parsedGrams) ?? (selectedServingLabel.includes("g") ? gramsServingLabel(parsedGrams) : selectedServingLabel);
  const summary = portion ? portionSummary(portion, sw) : amountText;
  const note = portion ? portionNote(portion, sw, parsedGrams, mode === "egg") : null;

  const macroPreview = useMemo(() => calculateMacroPreview(food.nutrients, parsedGrams), [food, parsedGrams]);

  // Daily targets from the profile, for the micronutrient %
  const { targets: dailyTargets } = useDiary();

  // Scaled micros for desktop
  const scaledMicros = useMemo(() => {
    if (!showMicros) return [];
    const scaled = scaleNutrients(food.nutrients, parsedGrams);

    const list: { name: string; value: string; pct: number | null }[] = [];

    for (const [key, val] of Object.entries(scaled)) {
      if (val !== null && val !== undefined && val > 0) {
        // Exclude general macros from micros breakdown
        if (key === "energy" || key === "carbs" || key === "protein" || key === "fat" || key === "fiber" || key === "net_carbs") {
          continue;
        }

        const def = getNutrientDefinition(key);
        const name = def?.name || key;
        const unit = def?.unit || "mg";
        const target = dailyTargets[key]?.min ?? (def?.id ? dailyTargets[def.id]?.min : undefined);
        const pct = target ? Math.round((val / target) * 100) : null;

        list.push({
          name,
          value: `${formatAmount(val, unit)} ${unit}`,
          pct,
        });
      }
    }
    return list;
  }, [food, parsedGrams, dailyTargets, showMicros]);

  const mealNameVi = mealSlot ? getMealSlotNameVi(mealSlot) : "bữa ăn";
  const cannotAdd = isSubmitting || parsedGrams <= 0 || mealSlot === null || !canLog;

  return (
    <div data-align-container="portion-panel" data-tour="portion-panel" className={`flex flex-col gap-4 text-text ${className}`}>
      {/* The meal, the food (a long name wraps to two lines), and its page */}
      <div className="flex w-full items-start justify-between gap-2">
        <div data-align-group="portion" data-align-edge="left" className="flex min-w-0 flex-col gap-0.5">
          {mealSlot && <span className="text-[13px] font-semibold text-secondary">{mealNameVi}</span>}
          {/* No line-clamp here: its overflow clipping cut the stacked marks of capitals like Ắ, Ẫ, Ổ ("TRẮNG" read
              "TRĂNG"). The line height leaves them room; a long name wraps. */}
          <h2 id={headingId} className="m-0 break-words font-display text-[32px] font-bold uppercase leading-[1.15] tracking-[0.01em]">
            {food.nameVi}
          </h2>
        </div>
        <Link
          href={`/foods/${food.id}${mealSlot ? `?meal=${mealSlot}` : ""}`}
          className="inline-flex min-h-11 shrink-0 items-center text-xs font-semibold text-blue hover:underline"
        >
          Xem chi tiết →
        </Link>
      </div>

      {food.tipVi && (
        <div data-align-group="portion" data-align-edge="left" className="line-clamp-2 w-full text-xs font-medium leading-relaxed text-blue">
          {food.tipVi}
        </div>
      )}

      <PortionArea
        food={food}
        gramsInput={gramsInput}
        setGramsInput={setGramsInput}
        selectedServingLabel={selectedServingLabel}
        setSelectedServingLabel={setSelectedServingLabel}
        onFoodChange={onFoodChange}
        disabled={isSubmitting}
        data-align-group="portion"
      />

      {/* kcal and macros of the portion, on a dark card */}
      <div data-align-group="portion" data-align-edge="left" className="flex w-full flex-col gap-3 rounded-2xl bg-ink p-4 text-on-dark">
        <div className="flex items-baseline justify-between gap-3">
          <span className="font-display text-[44px] font-bold leading-none tabular-nums">
            {kcalValue(macroPreview.calories)} <span className="text-lg text-sky">kcal</span>
          </span>
          <span className="text-right text-[13px] text-muted-subtitle">{summary}</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            ["Tinh bột", macroPreview.carbs],
            ["Đạm", macroPreview.protein],
            ["Chất béo", macroPreview.fat],
          ].map(([label, value]) => (
            <div key={label as string} className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-subtitle">{label}</span>
              <span className="text-[17px] font-bold tabular-nums">{macroGramsText(value as number | null)}</span>
            </div>
          ))}
        </div>
      </div>

      {note && (
        <p data-align-group="portion" data-align-edge="left" className="m-0 text-[13px] leading-normal text-secondary-strong">
          {note}
        </p>
      )}

      {/* A food with unknown energy cannot be logged: it would read 0 kcal */}
      {notice && !canLog && (
        <p role="alert" className="m-0 rounded-xl bg-warning-bg px-3 py-2 text-[13px] leading-snug text-warning-text">
          {notice}
        </p>
      )}
      {notice && canLog && <p role="note" className="m-0 text-[13px] leading-snug text-secondary">{notice}</p>}
      {/* cc-54: what is inside a premade dish, and its add-ons for this meal */}
      {onExtrasChange && isDishFood(food) && <DishParts key={food.id} food={food} portionGrams={parsedGrams} onAddOns={onExtrasChange} />}

      {/* Side by side on a phone; stacked in the narrower desktop pane, the add on top */}
      <div data-align-group="portion" data-align-edge="left" className="flex w-full items-center gap-2 lg:flex-col-reverse lg:items-stretch">
        {onAddAndContinue && (
          <button
            type="button"
            onClick={onAddAndContinue}
            disabled={cannotAdd}
            className="flex h-14 flex-1 cursor-pointer items-center justify-center rounded-2xl border border-card-border bg-card text-[15px] font-bold text-text disabled:opacity-50 lg:flex-none"
          >
            Lưu &amp; chọn tiếp
          </button>
        )}
        <button
          type="button"
          onClick={onAdd}
          data-tour="portion-add"
          disabled={cannotAdd}
          className={`${onAddAndContinue ? "flex-1 lg:flex-none" : "w-full"} flex h-14 cursor-pointer items-center justify-center rounded-2xl border-0 bg-blue text-[17px] font-bold text-on-accent   hover:bg-blue/90    disabled:opacity-50`}
        >
          {`Thêm vào ${mealSlot ? mealNameVi : "—"}`}
        </button>
      </div>

      {/* Desktop Micros Breakdown */}
      {showMicros && scaledMicros.length > 0 && (
        <div className="w-full bg-card rounded-xl p-3 border border-card-border flex flex-col gap-1.5 mt-1">
          <div className="text-xs font-semibold text-secondary pb-1 border-b border-card-border">
            Vi chất trong {summary}:
          </div>
          {scaledMicros.map((m) => (
            <div key={m.name} className="flex justify-between items-center text-xs py-0.5">
              <span className="font-semibold text-text">{m.name}</span>
              <div className="flex items-center gap-2 tabular-nums">
                <span className="text-secondary font-medium text-right">{m.value}</span>
                {m.pct !== null && (
                  <span className="font-bold text-text min-w-[36px] text-right">
                    {m.pct}%
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
