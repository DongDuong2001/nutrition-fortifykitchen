"use client";

import React from "react";
import { Carousel } from "@/components/ui/carousel";
import { QuickAddRow } from "@/components/add/quick-add-row";
import type { FoodItem } from "@/lib/mock/foods";
import type { SavedMeal } from "@/lib/saved-meals";
import { formatAmount } from "@/lib/format";
import { foodRowKcal } from "@/lib/food-meta";

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
  favourites: RecentShortcut[];
  savedMeals: SavedMealShortcut[];
  /** The + of a card: add with the portion it shows (an undo toast follows). */
  onAddRecent: (item: RecentShortcut) => void;
  /** The body of a card: open the portion panel on that food and portion. */
  onOpenRecent: (item: RecentShortcut) => void;
  onAddSavedMeal: (meal: SavedMeal) => void;
  onQuickKcal: () => void;
}

/** One small card of a carousel: the body opens the portion panel (or says what it is), the + adds in one tap. */
function ShortcutCard({
  name,
  meta,
  addLabel,
  onAdd,
  openLabel,
  onOpen,
}: {
  name: string;
  meta: string;
  addLabel: string;
  onAdd: () => void;
  openLabel?: string;
  onOpen?: () => void;
}) {
  const body = (
    <>
      <span title={name} className="line-clamp-2 break-words text-[15px] font-semibold leading-snug">
        {name}
      </span>
      <span className="line-clamp-2 text-[13px] leading-tight text-secondary">{meta}</span>
    </>
  );
  return (
    <li className="flex w-[11rem] shrink-0 snap-start flex-col overflow-hidden rounded-[18px] border border-card-border bg-card">
      {onOpen ? (
        <button
          type="button"
          onClick={onOpen}
          aria-label={openLabel}
          className="flex min-h-[72px] flex-1 cursor-pointer flex-col gap-1 border-0 bg-transparent p-3 text-left text-text active:bg-page motion-reduce:active:bg-transparent"
        >
          {body}
        </button>
      ) : (
        <div className="flex min-h-[72px] flex-1 flex-col gap-1 p-3 text-text">{body}</div>
      )}
      <button
        type="button"
        onClick={onAdd}
        aria-label={addLabel}
        className="flex min-h-[44px] w-full cursor-pointer items-center justify-center gap-2 border-0 border-t border-divider bg-transparent text-[15px] font-bold text-blue active:bg-page motion-reduce:active:bg-transparent"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
        Thêm
      </button>
    </li>
  );
}

/**
 * Faster logging in the add sheet, above the food list: Gần đây and Yêu thích (card body = portion panel,
 * + = add with that portion) and Bữa ăn của tôi (+ adds every food), as carousels; then Chỉ thêm kcal.
 * Nothing here is shown while searching.
 */
export function AddShortcuts({ recents, favourites, savedMeals, onAddRecent, onOpenRecent, onAddSavedMeal, onQuickKcal }: AddShortcutsProps) {
  const foodCard = (r: RecentShortcut) => {
    const kcal = foodRowKcal(r.food, r.grams);
    return (
      <ShortcutCard
        key={r.key}
        name={r.food.nameVi}
        meta={`${r.label}${kcal ? ` · ${kcal}` : ""}`}
        addLabel={`Thêm ${r.food.nameVi} ${r.label}`}
        onAdd={() => onAddRecent(r)}
        openLabel={`Chọn khẩu phần ${r.food.nameVi}`}
        onOpen={() => onOpenRecent(r)}
      />
    );
  };

  return (
    <div className="flex shrink-0 flex-col gap-3">
      {recents.length > 0 && <Carousel title="Gần đây">{recents.map(foodCard)}</Carousel>}
      {favourites.length > 0 && <Carousel title="Yêu thích">{favourites.map(foodCard)}</Carousel>}
      {savedMeals.length > 0 && (
        <Carousel title="Bữa ăn của tôi">
          {savedMeals.map(({ meal, itemCount, kcal }) => (
            <ShortcutCard
              key={meal.id}
              name={meal.name}
              meta={`${itemCount} món · ${formatAmount(kcal, "kcal")} kcal`}
              addLabel={`Thêm ${meal.name}, ${itemCount} món`}
              onAdd={() => onAddSavedMeal(meal)}
            />
          ))}
        </Carousel>
      )}

      <QuickAddRow
        name="Chỉ thêm kcal"
        meta="Nhập kcal, không cần chọn món"
        addLabel="Chỉ thêm kcal"
        onAdd={onQuickKcal}
        withBorderTop={false}
      />
    </div>
  );
}
