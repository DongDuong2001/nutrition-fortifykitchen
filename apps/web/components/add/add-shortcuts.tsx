"use client";

import React from "react";
import { Carousel } from "@/components/ui/carousel";
import { QuickAddRow } from "@/components/add/quick-add-row";
import type { FoodItem } from "@/lib/mock/foods";
import type { SavedMeal } from "@/lib/saved-meals";
import { formatAmount } from "@/lib/format";
import { foodRowKcal } from "@/lib/food-meta";
import { rowName } from "@/lib/food-rows";
import { Card } from "@/components/ui/card";

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
  /** cc-51 D1: the foods logged most in the last 14 days (Hay ăn) */
  frequent?: RecentShortcut[];
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
      <span title={name} className="line-clamp-2 break-words text-callout font-semibold leading-snug">
        {name}
      </span>
      <span className="line-clamp-2 text-cap leading-tight text-secondary">{meta}</span>
    </>
  );
  return (
    <Card as="li" padding={false} className="flex w-[11rem] shrink-0 snap-start overflow-hidden">
      {onOpen ? (
        <button
          type="button"
          onClick={onOpen}
          aria-label={openLabel}
          className="flex min-w-0 flex-1 cursor-pointer flex-col justify-center gap-0.5 border-0 bg-transparent p-3 text-left text-text active:bg-surface motion-reduce:active:bg-transparent"
        >
          {body}
        </button>
      ) : (
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 p-3 text-text">{body}</div>
      )}
      <button
        type="button"
        onClick={onAdd}
        aria-label={addLabel}
        className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center self-center rounded-full border-0 bg-transparent text-cobalt active:bg-surface motion-reduce:active:bg-transparent"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>
    </Card>
  );
}

/**
 * Faster logging in the add sheet, above the food list: Gần đây and Yêu thích (card body = portion panel,
 * + = add with that portion) and Bữa ăn của tôi (+ adds every food), as carousels; then Chỉ thêm kcal.
 * Nothing here is shown while searching.
 */
export function AddShortcuts({ recents, frequent = [], favourites, savedMeals, onAddRecent, onOpenRecent, onAddSavedMeal, onQuickKcal }: AddShortcutsProps) {
  const foodCard = (r: RecentShortcut) => {
    const kcal = foodRowKcal(r.food, r.grams);
    const name = rowName(r.food);
    return (
      <ShortcutCard
        key={r.key}
        name={name}
        meta={`${r.label}${kcal ? ` · ${kcal}` : ""}`}
        addLabel={`Thêm ${name} ${r.label}`}
        onAdd={() => onAddRecent(r)}
        openLabel={`Chọn khẩu phần ${name}`}
        onOpen={() => onOpenRecent(r)}
      />
    );
  };

  return (
    <div className="flex shrink-0 flex-col gap-3">
      {recents.length > 0 && (
        <Carousel title="Gần đây" id="add-recents">
          {recents.map(foodCard)}
        </Carousel>
      )}
      {frequent.length > 0 && <Carousel title="Hay ăn">{frequent.map(foodCard)}</Carousel>}
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
