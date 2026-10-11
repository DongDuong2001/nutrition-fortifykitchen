"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { type FoodItem } from "@/lib/mock/foods";
import { type MealSlot, getMealSlotNameVi } from "@/lib/meal-slot";
import { parseGramsInput, calculateMacroPreview, scaleNutrients } from "@/lib/portion";
import { formatNumber } from "@/lib/format";
import { ChipGroup } from "@/components/ui/chip-group";
import { StatGroup } from "@/components/ui/stat-group";
import { getNutrientDefinition } from "@/lib/nutrients";
import { calculateTargets } from "@/lib/targets";

export interface PortionPanelProps {
  food: FoodItem;
  gramsInput: string;
  setGramsInput: (val: string) => void;
  selectedServingLabel: string;
  setSelectedServingLabel: (val: string) => void;
  mealSlot: MealSlot | null;
  onAdd: () => void;
  isSubmitting?: boolean;
  tone?: "light" | "dark";
  showMicros?: boolean;
  className?: string;
}

export function PortionPanel({
  food,
  gramsInput,
  setGramsInput,
  selectedServingLabel,
  setSelectedServingLabel,
  mealSlot,
  onAdd,
  isSubmitting = false,
  tone = "light",
  showMicros = false,
  className = "",
}: PortionPanelProps) {
  const isDark = tone === "dark";
  const parsedGrams = useMemo(() => parseGramsInput(gramsInput), [gramsInput]);

  // Derive columns = servings.length + 1 (for leading gram input)
  const columns = food.servings.length + 1;

  // Macro preview
  const macroPreview = useMemo(() => {
    return calculateMacroPreview(food.nutrients, parsedGrams);
  }, [food, parsedGrams]);

  // Daily targets for micronutrients % calculation
  const dailyTargets = useMemo(() => {
    return calculateTargets({
      weightKg: 65,
      goal: "maintain",
      trainingMinutes: 60,
      sex: "male",
    });
  }, []);

  // Scaled micros for desktop
  const scaledMicros = useMemo(() => {
    if (!showMicros) return [];
    const scaled = scaleNutrients(food.nutrients, parsedGrams);

    const targetMap: Record<string, number> = {
      potassium: dailyTargets.potassium.min,
      calcium: dailyTargets.calcium.min,
      magnesium: dailyTargets.magnesium.min,
      iron: dailyTargets.iron.min,
      zinc: dailyTargets.zinc.min,
      sodium: dailyTargets.sodium.min,
      copper: 0.9,
      manganese: 2.3,
      vitamin_d: 15,
      vitamin_a: 650,
      vitamin_c: 100,
      vitamin_e: 6.5,
      vitamin_k: 150,
      thiamin: 1.2,
      riboflavin: 1.3,
      niacin: 16,
      pyridoxine: 1.3,
      folate: 400,
      cobalamin: 2.4,
    };

    const list: { name: string; value: string; pct: number | null }[] = [];
    const priorityKeys = [
      "potassium",
      "magnesium",
      "calcium",
      "iron",
      "copper",
      "pyridoxine",
      "zinc",
      "sodium",
    ];

    for (const key of priorityKeys) {
      const val = scaled[key];
      if (val !== null && val !== undefined && val > 0) {
        const def = getNutrientDefinition(key);
        const name = def?.nameVi || key;
        const unit = def?.unit || "mg";
        const target = targetMap[key] || (def?.id ? targetMap[def.id] : undefined);
        const pct = target ? Math.round((val / target) * 100) : null;

        list.push({
          name,
          value: `${formatNumber(val)} ${unit}`,
          pct,
        });
      }
    }
    return list;
  }, [food, parsedGrams, dailyTargets, showMicros]);

  const mealNameVi = mealSlot ? getMealSlotNameVi(mealSlot) : "bữa ăn";

  return (
    <div
      data-align-container="portion-panel"
      className={`rounded-2xl p-4 flex flex-col gap-3 transition-colors ${
        isDark
          ? "bg-ink text-white shadow-lg"
          : "bg-page text-text border border-card-border"
      } ${className}`}
    >
      {/* Row 1: Title row */}
      <div
        data-align-group="portion"
        className="flex items-center justify-between gap-2 min-h-[44px] w-full"
      >
        <span className={`font-bold truncate ${isDark ? "text-lg text-white" : "text-xl text-text"}`}>
          {food.nameVi}
        </span>
        <Link
          href={`/foods/${food.id}${mealSlot ? `?meal=${mealSlot}` : ""}`}
          className={`text-xs font-semibold hover:underline shrink-0 min-h-[44px] inline-flex items-center ${
            isDark ? "text-sky no-underline" : "text-blue"
          }`}
        >
          Xem chi tiết →
        </Link>
      </div>

      {/* Row 2: Tip row */}
      {food.tipVi && (
        <div
          data-align-group="portion"
          className={`text-xs font-medium leading-relaxed line-clamp-2 w-full ${
            isDark ? "text-sky" : "text-blue"
          }`}
        >
          {food.tipVi}
        </div>
      )}

      {/* Row 3: ChipGroup */}
      <div data-align-group="portion" className="w-full">
        <ChipGroup
          columns={columns}
          tone={tone}
          leadingInput={
            <label
              className={`flex items-center justify-center rounded-xl px-2 h-11 w-full cursor-text box-border border-2 ${
                isDark
                  ? "bg-surface-dark border-sky text-white"
                  : "bg-white border-blue text-text"
              }`}
            >
              <span className="sr-only">Khối lượng</span>
              <input
                type="text"
                inputMode="decimal"
                aria-label="Số gam"
                value={gramsInput}
                onChange={(e) => {
                  setGramsInput(e.target.value);
                  setSelectedServingLabel(`${e.target.value} g`);
                }}
                className={`w-full bg-transparent border-0 outline-none font-bold text-sm tabular-nums text-right ${
                  isDark ? "text-white" : "text-text"
                }`}
              />
              <span
                className={`text-xs ml-1 font-semibold ${
                  isDark ? "text-muted-on-dark" : "text-secondary"
                }`}
              >
                g
              </span>
            </label>
          }
          items={food.servings.map((s) => ({
            id: s.label,
            label: s.label,
            active: selectedServingLabel === s.label,
            onClick: () => {
              setGramsInput(s.grams.toString());
              setSelectedServingLabel(s.label);
            },
          }))}
        />
      </div>

      {/* Row 4: StatGroup */}
      <div
        data-align-group="portion"
        className={`w-full pt-1 border-t ${
          isDark ? "border-card-border/20" : "border-card-border"
        }`}
      >
        <StatGroup
          columns={4}
          tone={tone}
          items={[
            { id: "cal", value: formatNumber(macroPreview.calories), label: "kcal" },
            { id: "carb", value: `${formatNumber(macroPreview.carbs)} g`, label: "Carb" },
            { id: "protein", value: `${formatNumber(macroPreview.protein)} g`, label: "Đạm" },
            { id: "fat", value: `${formatNumber(macroPreview.fat)} g`, label: "Béo" },
          ]}
        />
      </div>

      {/* Row 5: CTA button */}
      <button
        type="button"
        data-align-group="portion"
        onClick={onAdd}
        disabled={isSubmitting || parsedGrams <= 0}
        className={`w-full min-h-[52px] rounded-full text-white font-bold text-base cursor-pointer active:scale-[0.98] transition-all border-0 flex items-center justify-center shadow-md disabled:opacity-50 ${
          isDark
            ? "bg-blue hover:bg-blue/90"
            : "bg-blue hover:bg-blue/90"
        }`}
      >
        Thêm vào {mealNameVi}
      </button>

      {/* Desktop Micros Breakdown */}
      {showMicros && scaledMicros.length > 0 && (
        <div className="w-full bg-white rounded-xl p-3 border border-card-border flex flex-col gap-1.5 mt-1">
          <div className="text-xs font-semibold text-secondary pb-1 border-b border-card-border">
            Vi chất trong {gramsInput} g:
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
