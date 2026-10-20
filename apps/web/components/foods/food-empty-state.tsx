import React from "react";
import { rowName } from "@/lib/food-rows";
import type { FoodItem } from "@/lib/mock/foods";
import { CreateFoodButton } from "@/components/foods/create-food-button";
import { EmptyState } from "@/components/ui/empty-state";
import { PillButton } from "@/components/ui/pill-button";
import { categoryLabel, isCategoryFilter, type FoodFilter } from "@/lib/food-categories";

export interface FoodEmptyStateProps {
  query: string;
  filter: FoodFilter;
  /** The Yêu thích filter is on, there is no query, and nothing is saved. */
  noFavourites: boolean;
  /** Close matches shown when a search finds nothing. */
  similarFoods: FoodItem[];
  getMeta: (food: FoodItem) => string;
  onPickSimilar: (food: FoodItem) => void;
  onClearFilter: () => void;
  newFoodHref: string;
}

/** Empty results for the food list: no favourites yet, or a search with no match (with fuzzy suggestions). */
export function FoodEmptyState({
  query,
  filter,
  noFavourites,
  similarFoods,
  getMeta,
  onPickSimilar,
  onClearFilter,
  newFoodHref,
}: FoodEmptyStateProps) {
  const clearFilterButton = (
    <PillButton variant="tertiary" size="md" type="button" onClick={onClearFilter}>
      Bỏ lọc
    </PillButton>
  );

  // No saved favourite still shows: an id whose food is gone must not show a blank "Không có “”"
  if (noFavourites) {
    return (
      <EmptyState title="Chưa có món yêu thích" actions={clearFilterButton}>
        Bấm ♡ ở trang chi tiết món để lưu.
      </EmptyState>
    );
  }

  // A category chip with no foods (Đồ uống until a drink has a sourced value): say so and offer to create one
  if (!query.trim() && isCategoryFilter(filter)) {
    const drink = filter === "do_uong";
    return (
      <EmptyState
        gap={3}
        title={drink ? "Chưa có đồ uống nào" : `Chưa có món nào trong ${categoryLabel(filter)}`}
        actions={
          <>
            <div className="w-full">
              <CreateFoodButton href={newFoodHref} helper={null} />
            </div>
            {clearFilterButton}
          </>
        }
      >
        {drink ? "Chưa có đồ uống có sẵn dữ liệu phân tích. Bạn có thể tự tạo đồ uống từ nhãn bao bì." : "Bạn có thể tự tạo món cho nhóm này."}
      </EmptyState>
    );
  }

  return (
    <EmptyState
      icon={
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="text-secondary" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5M8 8l6 6M14 8l-6 6" />
        </svg>
      }
      title={<>Không có “{query}”</>}
      actions={
        <>
          {filter !== "all" && clearFilterButton}
          <div className="mt-2 w-full">
            <CreateFoodButton href={newFoodHref} helper={null} />
          </div>

          {/* Fuzzy matches */}
          {similarFoods.length > 0 && (
            <div className="w-full text-left mt-4 flex flex-col gap-1">
              <div className="text-xs font-semibold text-secondary">Gợi ý gần giống:</div>
              {similarFoods.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onPickSimilar(s)}
                  className="text-left py-3 px-3 rounded-xl hover:bg-surface text-sm font-semibold text-text border-0 bg-card cursor-pointer flex justify-between items-center min-h-12"
                >
                  <span>{rowName(s)}</span>
                  <span className="text-xs text-secondary font-normal">{getMeta(s)}</span>
                </button>
              ))}
            </div>
          )}
        </>
      }
    >
      Thử từ ngắn hơn, bỏ dấu, hoặc tự tạo món.
    </EmptyState>
  );
}
