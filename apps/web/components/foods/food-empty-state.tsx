import React from "react";
import Link from "next/link";
import type { FoodItem } from "@/lib/mock/foods";
import type { FoodFilter } from "@/lib/food-categories";

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
    <button
      type="button"
      onClick={onClearFilter}
      className="min-h-[44px] px-5 rounded-full bg-page text-text font-semibold text-sm border-0 cursor-pointer active:scale-[0.97]"
    >
      Bỏ lọc
    </button>
  );

  // No saved favourite still shows: an id whose food is gone must not show a blank "Không có “”"
  if (noFavourites) {
    return (
      <div className="flex flex-col items-center text-center py-6 gap-2">
        <div className="text-base font-bold">Chưa có món yêu thích</div>
        <div className="text-sm text-secondary">Bấm ♡ ở trang chi tiết món để lưu.</div>
        {clearFilterButton}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center text-center py-6 gap-2">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="text-secondary" aria-hidden="true">
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-3.5-3.5M8 8l6 6M14 8l-6 6" />
      </svg>
      <div className="text-base font-bold">Không có “{query}”</div>
      <div className="text-sm text-secondary">Thử từ ngắn hơn, bỏ dấu, hoặc tự tạo món.</div>
      {filter !== "all" && clearFilterButton}
      <Link
        href={newFoodHref}
        className="mt-2 min-h-[52px] px-7 rounded-full bg-blue text-on-accent font-bold text-base flex items-center justify-center no-underline active:scale-[0.97]"
      >
        + Tạo món mới
      </Link>

      {/* Fuzzy matches */}
      {similarFoods.length > 0 && (
        <div className="w-full text-left mt-4 flex flex-col gap-1">
          <div className="text-xs font-semibold text-secondary">Gợi ý gần giống:</div>
          {similarFoods.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onPickSimilar(s)}
              className="text-left py-2.5 px-3 rounded-xl hover:bg-page text-sm font-semibold text-text border-0 bg-card cursor-pointer flex justify-between items-center min-h-[48px]"
            >
              <span>{s.nameVi}</span>
              <span className="text-xs text-secondary font-normal">{getMeta(s)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
