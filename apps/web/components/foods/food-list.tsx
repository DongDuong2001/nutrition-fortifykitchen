import React from "react";
import type { FoodItem } from "@/lib/mock/foods";
import type { FoodList as FoodListData } from "@/lib/food-categories";

export interface FoodListProps {
  list: FoodListData;
  selectedId?: string;
  onPick: (food: FoodItem) => void;
  getMeta: (food: FoodItem) => string;
  categoryName: (food: FoodItem) => string;
  /** Grouped rows show a small heart after the name for saved favourites. */
  isFavourite?: (food: FoodItem) => boolean;
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
export function FoodList({
  list,
  selectedId,
  onPick,
  getMeta,
  categoryName,
  isFavourite,
  empty,
  footer,
  className = "",
}: FoodListProps) {
  const firstHeaderKey = list.grouped ? list.groups[0]?.key : undefined;
  const firstRowId = list.grouped ? list.groups[0]?.foods[0]?.id : list.foods[0]?.id;

  const renderRow = (food: FoodItem, withCategory: boolean) => {
    const selected = selectedId === food.id;
    const meta = withCategory ? `${categoryName(food)} · ${getMeta(food)}` : getMeta(food);
    const showHeart = list.grouped && !!isFavourite?.(food);
    return (
      <button
        key={food.id}
        type="button"
        data-food-row
        aria-pressed={selected}
        onClick={() => onPick(food)}
        className={`-mx-3 flex min-h-[52px] items-center gap-3 rounded-xl border-0 px-3 py-2.5 text-left text-text cursor-pointer transition-colors ${
          selected ? "bg-blue/10" : "bg-card hover:bg-page"
        }`}
      >
        <div
          data-align-group={food.id === firstRowId ? "add-list" : undefined}
          data-align-edge={food.id === firstRowId ? "left" : undefined}
          className="flex min-w-0 flex-1 flex-col gap-0.5"
        >
          <span className="line-clamp-2 text-[15px] font-bold leading-snug">
            {food.nameVi}
            {showHeart && (
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="ml-1.5 inline-block align-[-2px] text-secondary"
                aria-hidden="true"
              >
                <path d="M12 21s-7.5-4.6-9.5-9.1C1 8.6 3.1 5.5 6.3 5.5c2 0 3.4 1.1 4.2 2.4.8-1.3 2.2-2.4 4.2-2.4 3.2 0 5.3 3.1 3.8 6.4C19.5 16.4 12 21 12 21z" />
              </svg>
            )}
          </span>
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
            {/* -mx-3 px-3: the header covers the same 12 px bleed as the rows, so no row shows beside it */}
            <div className="sticky top-0 z-10 -mx-3 border-b border-divider bg-card px-3 py-1.5 text-xs font-bold text-secondary">
              <span
                data-align-group={group.key === firstHeaderKey ? "add-list" : undefined}
                data-align-edge={group.key === firstHeaderKey ? "left" : undefined}
              >
                {group.label} · {group.foods.length}
              </span>
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
