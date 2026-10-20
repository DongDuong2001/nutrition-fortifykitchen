"use client";

import React, { useMemo, useState } from "react";
import { Sheet } from "@/components/ui/sheet";
import { PillButton } from "@/components/ui/pill-button";
import { ChipGroup } from "@/components/ui/chip-group";
import { FoodList } from "@/components/foods/food-list";
import { FoodSearchField } from "@/components/foods/food-search-field";
import { useFoodBrowse } from "@/hooks/use-food-browse";
import { foodMeta } from "@/lib/food-meta";
import { isCategoryFilter } from "@/lib/food-categories";
import { MAX_COMPARE_FOODS, MIN_COMPARE_FOODS } from "@/lib/food-compare";
import type { FoodItem } from "@/lib/mock/foods";
import { EmptyState } from "@/components/ui/empty-state";

export interface ComparePickerProps {
  open: boolean;
  onClose: () => void;
  /** Foods already in the comparison: shown ticked and locked, they count towards the 3. */
  lockedIds: string[];
  /** The full list to compare (locked foods first, then the new picks). */
  onConfirm: (ids: string[]) => void;
}

/** "So sánh" picker: search and filter the catalogue, tick up to 3 foods in all, then confirm. */
export function ComparePicker({ open, onClose, lockedIds, onConfirm }: ComparePickerProps) {
  return (
    <Sheet open={open} onClose={onClose} title="Chọn món để so sánh" titleId="compare-picker-title" desktopDialog>
      <PickerBody lockedIds={lockedIds} onClose={onClose} onConfirm={onConfirm} />
    </Sheet>
  );
}

// Mounted only while the sheet is open, so each opening starts with a blank search and no new picks
function PickerBody({ lockedIds, onClose, onConfirm }: Omit<ComparePickerProps, "open">) {
  const { query, setQuery, filter, setFilter, list, filterItems, categoryName, isFavouriteFood } = useFoodBrowse();
  const [picked, setPicked] = useState<string[]>([]);

  const selected = useMemo(() => [...lockedIds, ...picked], [lockedIds, picked]);
  const full = selected.length >= MAX_COMPARE_FOODS;
  const disabledIds = useMemo(
    () => [...lockedIds, ...(full ? list.foods.map((f) => f.id).filter((id) => !selected.includes(id)) : [])],
    [lockedIds, full, list.foods, selected]
  );

  const toggle = (food: FoodItem) => {
    if (lockedIds.includes(food.id)) return;
    setPicked((prev) => {
      if (prev.includes(food.id)) return prev.filter((id) => id !== food.id);
      return lockedIds.length + prev.length >= MAX_COMPARE_FOODS ? prev : [...prev, food.id];
    });
  };

  const canConfirm = picked.length > 0 && selected.length >= MIN_COMPARE_FOODS;

  return (
    <div className="flex min-h-0 flex-col gap-3">
      <p aria-live="polite" className="m-0 px-1 text-cap leading-snug text-secondary">
        Đã chọn {selected.length}/{MAX_COMPARE_FOODS} món{full ? ". Bỏ một món để chọn món khác." : "."}
      </p>
      <FoodSearchField value={query} onChange={setQuery} />
      <ChipGroup scroll items={filterItems} ariaLabel="Lọc món theo nhóm" />
      <div data-compare-picker-list className="max-h-[44dvh] overflow-y-auto">
        <FoodList
          list={list}
          selectedIds={selected}
          disabledIds={disabledIds}
          onPick={toggle}
          getMeta={foodMeta}
          categoryName={categoryName}
          showCategory={!isCategoryFilter(filter)}
          isFavourite={isFavouriteFood}
          empty={
            <EmptyState
              title={query.trim() ? `Không có “${query.trim()}”` : "Chưa có món nào"}
              actions={
                filter !== "all" && (
                  <PillButton variant="tertiary" size="md" type="button" onClick={() => setFilter("all")}>
                    Bỏ lọc
                  </PillButton>
                )
              }
            >
              Thử từ ngắn hơn hoặc bỏ dấu.
            </EmptyState>
          }
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <PillButton variant="secondary" onClick={onClose}>
          Hủy
        </PillButton>
        <PillButton variant="primary" disabled={!canConfirm} onClick={() => onConfirm(selected)}>
          So sánh ({selected.length})
        </PillButton>
      </div>
    </div>
  );
}
