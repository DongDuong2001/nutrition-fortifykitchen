import React from "react";
import type { FoodItem } from "@/lib/mock/foods";
import type { FoodList as FoodListData } from "@/lib/food-categories";
import { searchTag } from "@/lib/food-source";

function SourceTag({ food }: { food: FoodItem }) {
  const tag = searchTag(food);
  return (
    <span
      className={`inline-flex h-6 shrink-0 items-center rounded-full px-2 text-xs font-bold ${
        tag.warning ? "bg-warning-bg text-warning-text" : "border border-card-border bg-page text-secondary"
      }`}
    >
      {tag.label}
    </span>
  );
}

export interface FoodListProps {
  list: FoodListData;
  selectedId?: string;
  /** Several selected rows (the compare picker): each shows the check, and the row is aria-pressed. */
  selectedIds?: readonly string[];
  /** Rows that cannot be picked (a food already in the comparison, or the limit reached). */
  disabledIds?: readonly string[];
  onPick: (food: FoodItem) => void;
  /** When set, each row also gets a chevron that calls this (the row itself then adds in one tap). */
  onOpen?: (food: FoodItem) => void;
  getMeta: (food: FoodItem) => string;
  categoryName: (food: FoodItem) => string;
  /** The flat list names each food's category in its meta line, unless a category chip is active. */
  showCategory?: boolean;
  /** Grouped rows show a small heart after the name for saved favourites. */
  isFavourite?: (food: FoodItem) => boolean;
  /** Search results: a small tag on each row says where the numbers come from (USDA, VN, Ước tính, Của tôi). */
  showSourceTag?: boolean;
  /** Shown when the list has no foods. */
  empty: React.ReactNode;
  /** Shown after the foods, for example the create-food button. */
  footer?: React.ReactNode;
  className?: string;
}

/**
 * Food results, one Card per section (UI-RULES row pattern): rows of 56 px or more with 1 px dividers and a
 * pressed state. Grouped (Tất cả, no query) shows one Card per category with its label as the first line.
 * Flat shows one ranked list in one Card; the category name is in each row's meta line unless a category chip
 * is active. The first Card carries data-align-group="add-list" for the alignment check.
 */
export function FoodList({
  list,
  selectedId,
  selectedIds,
  disabledIds,
  onPick,
  onOpen,
  getMeta,
  categoryName,
  showCategory = true,
  isFavourite,
  showSourceTag = false,
  empty,
  footer,
  className = "",
}: FoodListProps) {
  const firstHeaderKey = list.grouped ? list.groups[0]?.key : undefined;

  const renderRow = (food: FoodItem, withCategory: boolean) => {
    const selected = selectedId === food.id || !!selectedIds?.includes(food.id);
    const disabled = !!disabledIds?.includes(food.id);
    const meta = withCategory ? `${categoryName(food)} · ${getMeta(food)}` : getMeta(food);
    const showHeart = list.grouped && !!isFavourite?.(food);
    return (
      <li key={food.id} className="flex items-center border-t border-divider first:border-t-0">
        <button
          type="button"
          data-food-row
          aria-pressed={selected}
          disabled={disabled}
          onClick={() => onPick(food)}
          className={`flex min-h-[56px] min-w-0 flex-1 items-center gap-3 border-0 py-2 pl-4 text-left text-text transition-colors active:bg-divider motion-reduce:active:bg-transparent disabled:active:bg-transparent ${
            onOpen ? "pr-1" : "pr-4"
          } ${selected ? "bg-blue/10" : "bg-transparent"} ${disabled ? "cursor-default opacity-50" : "cursor-pointer"}`}
        >
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <span title={food.nameVi} className="line-clamp-2 break-words text-[15px] font-semibold leading-snug">
              {food.nameVi}
              {showHeart && (
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="ml-1 inline-block align-[-2px] text-secondary"
                  aria-hidden="true"
                >
                  <path d="M12 21s-7.5-4.6-9.5-9.1C1 8.6 3.1 5.5 6.3 5.5c2 0 3.4 1.1 4.2 2.4.8-1.3 2.2-2.4 4.2-2.4 3.2 0 5.3 3.1 3.8 6.4C19.5 16.4 12 21 12 21z" />
                </svg>
              )}
            </span>
            <span className="line-clamp-2 text-[13px] leading-tight text-secondary">{meta}</span>
          </span>
          {showSourceTag && <SourceTag food={food} />}
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
        {onOpen && (
          <button
            type="button"
            onClick={() => onOpen(food)}
            aria-label={`Chọn khẩu phần ${food.nameVi}`}
            className="mr-1 inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-secondary hover:bg-divider active:scale-[0.97] motion-reduce:active:scale-100"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </li>
    );
  };

  // No overflow-hidden on the grouped Card: it would stop the category label from sticking while the list scrolls
  const cardClass = "rounded-[18px] border border-card-border bg-card";

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {list.foods.length === 0 ? (
        empty
      ) : list.grouped ? (
        list.groups.map((group) => (
          <section
            key={group.key}
            role="group"
            aria-label={group.label}
            data-align-group={group.key === firstHeaderKey ? "add-list" : undefined}
            data-align-edge={group.key === firstHeaderKey ? "left" : undefined}
            className={cardClass}
          >
            <div className="sticky top-0 z-10 rounded-t-[18px] border-b border-divider bg-page px-4 py-2 text-xs font-bold text-secondary">
              {group.label} · {group.foods.length}
            </div>
            <ul className="m-0 flex list-none flex-col overflow-hidden rounded-b-[18px] p-0">{group.foods.map((food) => renderRow(food, false))}</ul>
          </section>
        ))
      ) : (
        <ul data-align-group="add-list" data-align-edge="left" className={`m-0 flex shrink-0 list-none flex-col overflow-hidden p-0 ${cardClass}`}>
          {list.foods.map((food) => renderRow(food, showCategory))}
        </ul>
      )}
      {footer}
    </div>
  );
}
