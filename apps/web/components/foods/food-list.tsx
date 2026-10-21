import React, { useState } from "react";
import type { FoodItem } from "@/lib/mock/foods";
import type { FoodList as FoodListData } from "@/lib/food-categories";
import { searchTag } from "@/lib/food-source";
import { rowName, twinIdsOf } from "@/lib/food-rows";
import { IconButton } from "@/components/ui/icon-button";
import { prefetchDishParts } from "@/components/ui/dish-parts-prefetch";

function SourceTag({ food }: { food: FoodItem }) {
  const tag = searchTag(food);
  return (
    <span
      className={`inline-flex h-6 shrink-0 items-center rounded-full px-2 text-xs font-bold ${
        tag.warning ? "bg-warning-bg text-warning-text" : "border border-card-border bg-surface text-secondary"
      }`}
    >
      {tag.label}
    </span>
  );
}

/** A list shows this many rows first (the live catalogue has thousands); "Xem thêm" adds as many again. */
export const FOOD_LIST_LIMIT = 50;

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
  /** Search results: a small tag on each row says where the numbers come from (USDA, Nhãn, VN, Ước tính, Của tôi, Chưa rõ). */
  showSourceTag?: boolean;
  /**
   * The add tray: each row also gets a + circle (44 px target) that puts the food in at its default portion and a
   * filled check circle once it is in. The row itself still opens the portion panel (onPick).
   */
  tray?: { ids: readonly string[]; onToggle: (food: FoodItem) => void };
  /** Shown when the list has no foods. */
  empty: React.ReactNode;
  /** Shown after the foods, for example the create-food button. */
  footer?: React.ReactNode;
  className?: string;
  /** data-tour value of the list, for the tour and tips. */
  dataTour?: string;
}

/**
 * Food results, one Card per section (UI-RULES row pattern): rows of 56 px or more with 1 px dividers and a
 * pressed state. Grouped (Tất cả, no query) shows one Card per category with its label as the first line.
 * Flat shows one ranked list in one Card; the category name is in each row's meta line unless a category chip
 * is active. The first Card carries data-align-group="add-list" for the alignment check.
 */
function FoodListView({
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
  tray,
  empty,
  footer,
  className = "",
  dataTour,
}: FoodListProps) {
  // cc-58: rows past the limit wait behind "Xem thêm", per list (a new list, from a query or a filter, starts again)
  const [more, setMore] = useState<{ list: FoodListData; extra: Record<string, number> }>({ list, extra: {} });
  const extra = more.list === list ? more.extra : {};
  const shownOf = (key: string, foods: FoodItem[]) => foods.slice(0, FOOD_LIST_LIMIT + (extra[key] ?? 0));
  const moreRow = (key: string, total: number) =>
    total > FOOD_LIST_LIMIT + (extra[key] ?? 0) ? (
      <li key="more" className="flex border-t border-divider">
        <button
          type="button"
          onClick={() => setMore({ list, extra: { ...extra, [key]: (extra[key] ?? 0) + FOOD_LIST_LIMIT } })}
          className="flex min-h-14 w-full cursor-pointer items-center justify-center border-0 bg-transparent px-4 text-callout font-bold text-cobalt"
        >
          Xem thêm
        </button>
      </li>
    ) : null;
  const firstHeaderKey = list.grouped ? list.groups[0]?.key : undefined;
  // The first row on screen, for the tour: it spotlights the search field and this row together
  const firstFoodId = list.grouped ? list.groups[0]?.foods[0]?.id : list.foods[0]?.id;

  const renderRow = (food: FoodItem, withCategory: boolean) => {
    // cc-67: raw and cooked are one row, so a row stands for every row of its food
    const ids = twinIdsOf(food);
    const selected = (selectedId !== undefined && ids.includes(selectedId)) || !!selectedIds?.some((id) => ids.includes(id));
    const disabled = !!disabledIds?.some((id) => ids.includes(id));
    const name = rowName(food);
    const meta = withCategory ? `${categoryName(food)} · ${getMeta(food)}` : getMeta(food);
    const showHeart = list.grouped && !!isFavourite?.(food);
    const carried = !!tray?.ids.some((id) => ids.includes(id));
    return (
      <li key={food.id} data-tour={dataTour && food.id === firstFoodId ? `${dataTour}-first` : undefined} className={`flex items-center border-t border-divider first:border-t-0 ${carried ? "bg-cobalt/10" : ""}`}>
        <button
          type="button"
          data-food-row
          aria-pressed={selected}
          disabled={disabled}
          onClick={() => onPick(food)}
          onPointerDown={() => prefetchDishParts(food)}
          className={`flex min-h-14 min-w-0 flex-1 items-center gap-3 border-0 py-2 pl-4 text-left text-text transition-colors active:bg-divider motion-reduce:active:bg-transparent disabled:active:bg-transparent ${
            onOpen || tray ? "pr-1" : "pr-4"
          } ${selected && !carried ? "bg-cobalt/10" : "bg-transparent"} ${disabled ? "cursor-default opacity-50" : "cursor-pointer"}`}
        >
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <span title={name} className="line-clamp-2 break-words text-callout font-semibold leading-snug">
              {name}
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
            <span className="line-clamp-2 text-cap leading-tight text-secondary">{meta}</span>
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
              className="shrink-0 text-cobalt"
              aria-hidden="true"
            >
              <path d="M5 12l5 5 9-10" />
            </svg>
          )}
        </button>
        {tray && (
          <button
            type="button"
            role="checkbox"
            aria-checked={carried}
            aria-label={`${carried ? "Bỏ khỏi khay" : "Thêm vào khay"}: ${name}`}
            data-tray-toggle
            data-testid="tray-toggle"
            data-tour="tray-toggle"
            onClick={() => tray.onToggle(food)}
            className="mr-2 inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center border-0 bg-transparent p-0 active:scale-[0.97] transition-press motion-reduce:active:scale-100"
          >
            <span
              // cc-64 (A5): the fill and the glyph colour cross over (the press timing), instead of snapping
              className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors duration-[var(--m-press)] ease-out motion-reduce:transition-none ${carried ? "bg-cobalt text-on-accent" : "bg-cobalt/10 text-cobalt"}`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                {carried ? <path d="m5 12.5 4.5 4.5L19 7.5" /> : <path d="M12 5v14M5 12h14" />}
              </svg>
            </span>
          </button>
        )}
        {onOpen && (
          <IconButton
            onClick={() => onOpen(food)}
            label={`Chọn khẩu phần ${name}`}
            className="mr-1 text-secondary hover:bg-divider"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M9 5l7 7-7 7" />
            </svg>
          </IconButton>
        )}
      </li>
    );
  };

  // No overflow-hidden on the grouped Card: it would stop the category label from sticking while the list scrolls
  const cardClass = "rounded-card border border-transparent shadow-ring lg:shadow-card bg-card";

  return (
    <div data-tour={dataTour} className={`flex flex-col gap-3 ${className}`}>
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
            <div className="sticky top-0 z-sticky rounded-t-card border-b border-divider bg-surface px-4 py-2 text-xs font-bold text-secondary">
              {group.label} · {group.foods.length}
            </div>
            <ul className="m-0 flex list-none flex-col overflow-hidden rounded-b-card p-0">
              {shownOf(group.key, group.foods).map((food) => renderRow(food, false))}
              {moreRow(group.key, group.foods.length)}
            </ul>
          </section>
        ))
      ) : (
        <ul data-align-group="add-list" data-align-edge="left" className={`m-0 flex shrink-0 list-none flex-col overflow-hidden p-0 ${cardClass}`}>
          {shownOf("flat", list.foods).map((food) => renderRow(food, showCategory))}
          {moreRow("flat", list.foods.length)}
        </ul>
      )}
      {footer}
    </div>
  );
}

/** Memoised: the add sheet passes stable props, so a keystroke in its grams field (or any state of the sheet that is not the list's) does not redraw the rows. */
export const FoodList = React.memo(FoodListView);
