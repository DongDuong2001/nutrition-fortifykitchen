import React from "react";
import type { FoodItem } from "@/lib/mock/foods";
import type { FoodList as FoodListData } from "@/lib/food-categories";

export interface FoodListProps {
  list: FoodListData;
  selectedId?: string;
  onPick: (food: FoodItem) => void;
  getMeta: (food: FoodItem) => string;
  categoryName: (food: FoodItem) => string;
  /** Shown when the list has no foods. */
  empty: React.ReactNode;
  /** Shown after the foods, for example the create-food link. */
  footer?: React.ReactNode;
  className?: string;
}

/**
 * Food results. Grouped (Tất cả, no query) shows sticky category headers. Flat shows one ranked
 * list with the category name in each row's meta line. Rows bleed 12 px into the padding (-mx-3 px-3),
 * so the hover and selected background is full width while the text lines up with the search field.
 * The first header and the first row carry data-align-group="add-list" for the alignment check.
 */
export function FoodList({ list, selectedId, onPick, getMeta, categoryName, empty, footer, className = "" }: FoodListProps) {
  const firstHeaderKey = list.grouped ? list.groups[0]?.key : undefined;
  const firstRowId = list.grouped ? list.groups[0]?.foods[0]?.id : list.foods[0]?.id;

  const renderRow = (food: FoodItem, withCategory: boolean) => {
    const selected = selectedId === food.id;
    const meta = withCategory ? `${categoryName(food)} · ${getMeta(food)}` : getMeta(food);
    return (
      <button
        key={food.id}
        type="button"
        data-food-row
        aria-pressed={selected}
        onClick={() => onPick(food)}
        className={`-mx-3 flex min-h-[52px] items-center gap-3 rounded-xl border-0 px-3 py-2.5 text-left text-text cursor-pointer transition-colors ${
          selected ? "bg-blue/10" : "bg-white hover:bg-page"
        }`}
      >
        <div
          data-align-group={food.id === firstRowId ? "add-list" : undefined}
          className="flex min-w-0 flex-1 flex-col gap-0.5"
        >
          <span className="line-clamp-2 text-[15px] font-bold leading-snug">{food.nameVi}</span>
          <span className="line-clamp-2 text-xs text-secondary">{meta}</span>
        </div>
        {selected && (
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="shrink-0 text-blue"
            aria-hidden="true"
          >
            <path d="M5 12l5 5 9-10" />
          </svg>
        )}
      </button>
    );
  };

  return (
    <div className={`flex flex-col gap-1 -mx-3 px-3 ${className}`}>
      {list.foods.length === 0 ? (
        empty
      ) : list.grouped ? (
        list.groups.map((group) => (
          <div key={group.key} role="group" aria-label={group.label} className="flex flex-col gap-1">
            <div
              data-align-group={group.key === firstHeaderKey ? "add-list" : undefined}
              className="sticky top-0 z-10 bg-page py-1.5 text-xs font-bold text-secondary"
            >
              {group.label} · {group.foods.length}
            </div>
            {group.foods.map((food) => renderRow(food, false))}
          </div>
        ))
      ) : (
        list.foods.map((food) => renderRow(food, true))
      )}
      {footer}
    </div>
  );
}
