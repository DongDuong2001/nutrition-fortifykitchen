"use client";

import React from "react";
import { Sheet } from "@/components/ui/sheet";
import { PillButton } from "@/components/ui/pill-button";
import { ChipRow } from "@/components/foods/chip-row";
import { FoodList } from "@/components/foods/food-list";
import { FoodSearchField } from "@/components/foods/food-search-field";
import { useFoodBrowse } from "@/hooks/use-food-browse";
import { foodMeta } from "@/lib/food-meta";
import { isCategoryFilter } from "@/lib/food-categories";
import type { FoodItem } from "@/lib/mock/foods";

/** "Thêm nguyên liệu": the food search in a sheet; tapping a food picks it and closes. */
export function IngredientPicker({
  open,
  onClose,
  onPick,
  disabledIds = [],
}: {
  open: boolean;
  onClose: () => void;
  onPick: (food: FoodItem) => void;
  disabledIds?: string[];
}) {
  return (
    <Sheet open={open} onClose={onClose} title="Thêm nguyên liệu" titleId="ingredient-picker-title" desktopDialog>
      <PickerBody onClose={onClose} onPick={onPick} disabledIds={disabledIds} />
    </Sheet>
  );
}

// Mounted only while the sheet is open, so each opening starts with a blank search
function PickerBody({ onClose, onPick, disabledIds }: { onClose: () => void; onPick: (food: FoodItem) => void; disabledIds: string[] }) {
  const { query, setQuery, filter, setFilter, list, filterItems, categoryName, isFavouriteFood } = useFoodBrowse();
  return (
    <div className="flex min-h-0 flex-col gap-3">
      <FoodSearchField value={query} onChange={setQuery} />
      <ChipRow items={filterItems} ariaLabel="Lọc món theo nhóm" />
      <div data-ingredient-picker-list className="max-h-[44dvh] overflow-y-auto">
        <FoodList
          list={list}
          disabledIds={disabledIds}
          onPick={onPick}
          getMeta={foodMeta}
          categoryName={categoryName}
          showCategory={!isCategoryFilter(filter)}
          isFavourite={isFavouriteFood}
          showSourceTag={query.trim() !== ""}
          empty={
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <div className="text-base font-bold">{query.trim() ? `Không có “${query.trim()}”` : "Chưa có món nào"}</div>
              <div className="text-sm text-secondary">Thử từ ngắn hơn hoặc bỏ dấu.</div>
              {filter !== "all" && (
                <button
                  type="button"
                  onClick={() => setFilter("all")}
                  className="min-h-[44px] cursor-pointer rounded-full border-0 bg-page px-5 text-sm font-semibold text-text active:scale-[0.97]"
                >
                  Bỏ lọc
                </button>
              )}
            </div>
          }
        />
      </div>
      <PillButton variant="secondary" onClick={onClose}>
        Hủy
      </PillButton>
    </div>
  );
}
