"use client";

import React from "react";
import { SectionTitle } from "@/components/ui/section-title";
import { QuickAddRow, RowChevronButton } from "@/components/add/quick-add-row";
import type { FoodItem } from "@/lib/mock/foods";
import type { SavedMeal } from "@/lib/saved-meals";
import { formatAmount } from "@/lib/format";
import { foodRowKcal } from "@/lib/food-meta";

// Rows without a chevron keep the width of one, so every + sits on the same right edge
const TRAILING_SPACER = <span aria-hidden="true" className="h-11 w-11 shrink-0" />;

export interface RecentShortcut {
  key: string;
  food: FoodItem;
  label: string;
  grams: number;
}

export interface SavedMealShortcut {
  meal: SavedMeal;
  itemCount: number;
  kcal: number;
}

export interface AddShortcutsProps {
  recents: RecentShortcut[];
  savedMeals: SavedMealShortcut[];
  /** Tap a recent: add with the portion it was last logged with. */
  onAddRecent: (recent: RecentShortcut) => void;
  /** Chevron of a recent: open the portion panel on that food and portion. */
  onOpenRecent: (recent: RecentShortcut) => void;
  onAddSavedMeal: (meal: SavedMeal) => void;
  onQuickKcal: () => void;
}

/**
 * Faster logging in the add sheet, above the food list: Chỉ ghi kcal, Gần đây (tap = add with the last portion,
 * chevron = portion panel) and Bữa ăn của tôi (tap = add every food). Nothing here is shown while searching.
 */
export function AddShortcuts({ recents, savedMeals, onAddRecent, onOpenRecent, onAddSavedMeal, onQuickKcal }: AddShortcutsProps) {
  return (
    <div className="flex shrink-0 flex-col gap-3">
      {recents.length > 0 && (
        <section aria-label="Gần đây" className="flex flex-col">
          <SectionTitle as="h3" className="flex min-h-[44px] items-center">
            Gần đây
          </SectionTitle>
          {recents.map((r, i) => {
            const kcal = foodRowKcal(r.food, r.grams);
            return (
              <QuickAddRow
                key={r.key}
                name={r.food.nameVi}
                meta={`${r.label}${kcal ? ` · ${kcal}` : ""}`}
                addLabel={`Thêm ${r.food.nameVi} ${r.label}`}
                onAdd={() => onAddRecent(r)}
                trailing={<RowChevronButton label={`Chọn khẩu phần ${r.food.nameVi}`} onClick={() => onOpenRecent(r)} />}
                withBorderTop={i > 0}
              />
            );
          })}
        </section>
      )}

      {savedMeals.length > 0 && (
        <section aria-label="Bữa ăn của tôi" className="flex flex-col">
          <SectionTitle as="h3" className="flex min-h-[44px] items-center">
            Bữa ăn của tôi
          </SectionTitle>
          {savedMeals.map(({ meal, itemCount, kcal }, i) => (
            <QuickAddRow
              key={meal.id}
              name={meal.name}
              meta={`${itemCount} món · ${formatAmount(kcal, "kcal")} kcal`}
              addLabel={`Thêm ${meal.name}, ${itemCount} món`}
              onAdd={() => onAddSavedMeal(meal)}
              trailing={TRAILING_SPACER}
              withBorderTop={i > 0}
            />
          ))}
        </section>
      )}

      <QuickAddRow
        name="Chỉ thêm kcal"
        meta="Nhập kcal, không cần chọn món"
        addLabel="Chỉ thêm kcal"
        onAdd={onQuickKcal}
        trailing={TRAILING_SPACER}
        withBorderTop={false}
      />
    </div>
  );
}
