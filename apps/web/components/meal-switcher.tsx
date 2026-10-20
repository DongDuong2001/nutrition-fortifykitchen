"use client";

import React from "react";
import { Sheet } from "@/components/ui/sheet";
import { MEAL_SLOTS, type MealSlot, getMealSlotNameVi } from "@/lib/meal-slot";
import { formatAmount } from "@/lib/format";

export interface MealSwitcherProps {
  open: boolean;
  onClose: () => void;
  selectedSlot: MealSlot | null;
  onSelectSlot: (slot: MealSlot) => void;
  mealCalories?: Partial<Record<MealSlot, number>>;
  defaultHint?: string;
}

export function MealSwitcher({
  open,
  onClose,
  selectedSlot,
  onSelectSlot,
  mealCalories = {},
  defaultHint = "Tự chọn theo giờ trong ngày",
}: MealSwitcherProps) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Thêm vào bữa nào?"
      titleId="meal-switcher-title"
    >
      <div
        role="listbox"
        aria-labelledby="meal-switcher-title"
        className="flex flex-col gap-2 py-1"
      >
        {MEAL_SLOTS.map((slot) => {
          const isSelected = selectedSlot === slot.id;
          const cals = mealCalories[slot.id];
          const calsText = cals && cals > 0 ? `${formatAmount(cals, "kcal")} kcal` : "trống";

          return (
            <button
              key={slot.id}
              role="option"
              aria-selected={isSelected}
              type="button"
              onClick={() => {
                onSelectSlot(slot.id);
                onClose();
              }}
              className={`w-full min-h-[52px] px-4 rounded-xl flex items-center gap-3 cursor-pointer text-left transition-colors m-tint border-0 ${
                isSelected
                  ? "bg-cobalt/10 text-text font-bold"
                  : "bg-surface hover:bg-paper-dark text-text font-medium"
              }`}
            >
              {/* Radio checkmark circle */}
              <span
                aria-hidden="true"
                className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                  isSelected
                    ? "bg-cobalt text-on-accent ring-4 ring-sky/40"
                    : "border-2 border-grabber bg-surface"
                }`}
              >
                {isSelected && (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M5 12l5 5 9-10" />
                  </svg>
                )}
              </span>

              {/* Meal Name */}
              <span className="flex-1 text-[1rem]">{slot.nameVi}</span>

              {/* Current Calories */}
              <span
                className={`text-sm tabular-nums ${
                  isSelected ? "text-secondary font-semibold" : "text-secondary"
                }`}
              >
                {calsText}
              </span>
            </button>
          );
        })}
      </div>

      {defaultHint && (
        <div className="text-xs text-secondary px-2 pt-2 pb-1 font-medium">
          {defaultHint}
        </div>
      )}
    </Sheet>
  );
}
