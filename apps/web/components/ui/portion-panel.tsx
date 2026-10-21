"use client";

import React, { Suspense, lazy, useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { type FoodItem, MOCK_FOODS } from "@/lib/mock/foods";
import { type MealSlot, getMealSlotNameVi } from "@/lib/meal-slot";
import { parseGramsInput, calculateMacroPreview, macroGramsText, scaleNutrients, gramsServingLabel, unitAmountText, parsePortionLabel, portionModeOf, portionNote, portionSummary } from "@/lib/portion";
import { cookSwitchFor, rowName, useRowsReady } from "@/lib/food-rows";
import { PortionArea } from "@/components/ui/portion-area";
import { recipeKnown, type DishEdit } from "@/lib/dish-recipes";
import { loadDishPartsModule, loadedDishParts } from "@/components/ui/dish-parts-prefetch";
import { formatAmount, formatNumber } from "@/lib/format";
import { getNutrientDefinition } from "@/lib/nutrients";
import { useDiary } from "@/lib/diary-store";
import { canLog as canLogFood, energyNotice } from "@/lib/diary-edits";
import { kcalValue } from "@/lib/kcal";
import { IconButton } from "@/components/ui/icon-button";

// cc-54: the Thành phần of a dish (and the recipes with it) is its own chunk, fetched when a Món Việt food's panel opens
const DishParts = lazy(() => loadDishPartsModule().then((m) => ({ default: m.DishParts })));

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
   * cc-54, cc-67: where the Thành phần of a dish reports its parts as the user changed them (the parts added up, and a way
   * to make the one-off food of the changed dish). Without this a dish shows no Thành phần (a screen that cannot log
   * the changed dish does not offer to change it).
   */
  onDishEdit?: (edit: DishEdit | null) => void;
  /** Why the last add did not happen (the changed dish could not be stored on this device) */
  notice?: string | null;
  /** The portion sheet's close: a visible ✕ (44 px, "Đóng") in the header, for a screen that cannot assume the person knows to drag or tap the scrim. */
  onClose?: () => void;
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
  onDishEdit,
  notice: addNotice,
  onClose,
}: PortionPanelProps) {
  const canLog = canLogFood(food);
  const notice = energyNotice(food);
  const parsedGrams = useMemo(() => parseGramsInput(gramsInput), [gramsInput]);
  // cc-67: the parts of a dish changed for this meal: their sum is what is shown and logged
  const [dish, setDish] = useState<DishEdit | null>(null);
  // The Thành phần component when its chunk is already here (read once per food, so it does not switch mid-sheet)
  const LoadedDishParts = useMemo(() => loadedDishParts(), [food.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const changed = dish?.edited ? dish : null;
  const handleDish = useCallback(
    (next: DishEdit | null) => {
      setDish(next);
      onDishEdit?.(next);
    },
    [onDishEdit]
  );

  // How the amount reads: "3 quả lớn", "300 g đã nấu chín"; a unit food keeps its quantity ("2 viên")
  const mode = portionModeOf(food);
  const parsed = mode === "units" ? null : parsePortionLabel(selectedServingLabel);
  // An older "1 quả" of a fruit reads as an egg label: only an egg food takes it as one
  const portion = parsed?.kind === "egg" && mode !== "egg" ? null : parsed;
  const canSwap = !!onFoodChange;
  // The raw / cooked data loads a moment after the first paint: until then the sheet has no switch, and cannot add
  const ready = useRowsReady();
  const sw = useMemo(() => (mode === "grams" ? cookSwitchFor(food, MOCK_FOODS, canSwap) : null), [mode, food, canSwap, ready]);
  const amountText = unitAmountText(food, selectedServingLabel, parsedGrams) ?? (selectedServingLabel.includes("g") ? gramsServingLabel(parsedGrams) : selectedServingLabel);
  const summary = changed ? `${formatNumber(changed.grams)} g · đã chỉnh` : portion ? portionSummary(portion, sw) : amountText;
  const note = portion ? portionNote(portion, sw, parsedGrams, mode === "egg", food.category === "trai_cay") : null;

  const shownGrams = changed ? changed.grams : parsedGrams;
  const macroPreview = useMemo(() => calculateMacroPreview(changed ? changed.per100 : food.nutrients, shownGrams), [food, changed, shownGrams]);

  // Daily targets from the profile, for the micronutrient %
  const { targets: dailyTargets } = useDiary();

  // Scaled micros for desktop
  const scaledMicros = useMemo(() => {
    if (!showMicros) return [];
    const scaled = scaleNutrients(changed ? changed.per100 : food.nutrients, shownGrams);

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
  }, [food, changed, shownGrams, dailyTargets, showMicros]);

  const mealNameVi = mealSlot ? getMealSlotNameVi(mealSlot) : "bữa ăn";
  const cannotAdd = isSubmitting || shownGrams <= 0 || mealSlot === null || !canLog || (!!changed && typeof changed.per100.energy !== "number") || (mode === "grams" && !ready);

  return (
    <div data-align-container="portion-panel" data-tour="portion-panel" className={`flex flex-col gap-4 text-text ${className}`}>
      {/* The meal, the food (a long name wraps to two lines), and its page */}
      <div className="flex w-full items-start justify-between gap-2">
        <div data-align-group="portion" data-align-edge="left" className="flex min-w-0 flex-col gap-0.5">
          {mealSlot && <span className="text-cap font-semibold text-secondary">{mealNameVi}</span>}
          {/* No line-clamp here: its overflow clipping cut the stacked marks of capitals like Ắ, Ẫ, Ổ ("TRẮNG" read
              "TRĂNG"). The line height leaves them room; a long name wraps. */}
          <h2 id={headingId} className="m-0 break-words font-display text-display-sm font-bold uppercase leading-[1.15] tracking-[0.01em]">
            {rowName(food)}
          </h2>
        </div>
        <div className="flex shrink-0 flex-col items-end">
          {onClose && (
            <IconButton onClick={onClose} label="Đóng" tone="surface" className="-mr-1 text-text" data-testid="portion-close">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </IconButton>
          )}
          <Link
            href={`/foods/${food.id}${mealSlot ? `?meal=${mealSlot}` : ""}`}
            className="inline-flex min-h-11 shrink-0 items-center text-xs font-semibold text-cobalt hover:underline"
          >
            Xem chi tiết →
          </Link>
        </div>
      </div>

      {food.tipVi && (
        <div data-align-group="portion" data-align-edge="left" className="line-clamp-2 w-full text-xs font-medium leading-relaxed text-cobalt">
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
          <span className="font-display text-[2.75rem] font-extrabold leading-none tabular-nums tracking-display">
            {kcalValue(macroPreview.calories)} <span className="text-lg text-sky">kcal</span>
          </span>
          <span className="text-right text-cap text-muted-subtitle">{summary}</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            ["Tinh bột", macroPreview.carbs],
            ["Đạm", macroPreview.protein],
            ["Chất béo", macroPreview.fat],
          ].map(([label, value]) => (
            <div key={label as string} className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-subtitle">{label}</span>
              <span className="text-body-lg font-bold tabular-nums">{macroGramsText(value as number | null)}</span>
            </div>
          ))}
        </div>
      </div>

      {note && (
        <p data-align-group="portion" data-align-edge="left" className="m-0 text-cap leading-normal text-secondary-strong">
          {note}
        </p>
      )}

      {/* A food with unknown energy cannot be logged: it would read 0 kcal */}
      {notice && !canLog && (
        <p role="alert" className="m-0 rounded-xl bg-warning-bg px-3 py-2 text-cap leading-snug text-warning-text">
          {notice}
        </p>
      )}
      {notice && canLog && <p role="note" className="m-0 text-cap leading-snug text-secondary">{notice}</p>}
      {/* cc-54: what is inside a premade dish, and its add-ons for this meal */}
      {onDishEdit && food.category === "mon_viet" && (
        // cc-64 (A7): a chunk already loaded (a press on the row started it) renders at once; React holds a revealed
        // Suspense boundary ~300 ms, so it is not used then. While only the chunk is on its way and the recipe is known,
        // a box of the closed block's size holds the place, so the add button does not move when it arrives
        LoadedDishParts ? (
          <LoadedDishParts key={food.id} food={food} portionGrams={parsedGrams} onEdit={handleDish} />
        ) : (
          <Suspense fallback={recipeKnown(food) ? <div aria-hidden="true" className="min-h-[50px] w-full rounded-2xl border border-card-border bg-card" /> : null}>
            <DishParts key={food.id} food={food} portionGrams={parsedGrams} onEdit={handleDish} />
          </Suspense>
        )
      )}
      {addNotice && (
        <p role="alert" className="m-0 rounded-xl bg-warning-bg px-3 py-2 text-cap leading-snug text-warning-text">
          {addNotice}
        </p>
      )}

      {/* Side by side on a phone; stacked in the narrower desktop pane, the add on top */}
      <div data-align-group="portion" data-align-edge="left" className="flex w-full items-center gap-2 lg:flex-col-reverse lg:items-stretch">
        {onAddAndContinue && (
          <button
            type="button"
            onClick={onAddAndContinue}
            disabled={cannotAdd}
            className="flex min-h-14 flex-1 cursor-pointer items-center justify-center rounded-2xl border border-card-border bg-card px-3 py-2 text-center text-callout font-bold leading-snug text-text disabled:opacity-50 lg:flex-none"
          >
            Lưu &amp; chọn tiếp
          </button>
        )}
        <button
          type="button"
          onClick={onAdd}
          data-tour="portion-add"
          data-testid="portion-add"
          disabled={cannotAdd}
          className={`${onAddAndContinue ? "flex-1 lg:flex-none" : "w-full"} flex min-h-14 cursor-pointer items-center justify-center rounded-2xl border-0 bg-cobalt px-3 py-2 text-center text-body-lg font-bold leading-snug text-on-accent hover:bg-cobalt/90 disabled:opacity-50`}
        >
          {`Thêm vào ${mealSlot ? mealNameVi : "—"}`}
        </button>
      </div>

      {/* Desktop Micros Breakdown */}
      {showMicros && scaledMicros.length > 0 && (
        <div className="w-full bg-card rounded-xl p-3 border border-card-border flex flex-col gap-2 mt-1">
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
