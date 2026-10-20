"use client";

import React, { useState } from "react";
import { Sheet } from "@/components/ui/sheet";
import { PillButton } from "@/components/ui/pill-button";
import { CatalogStatus } from "@/components/foods/catalog-status";
import { Toast } from "@/components/ui/toast";
import { Presence } from "@/components/ui/presence";
import { ChipGroup } from "@/components/ui/chip-group";
import { FoodList } from "@/components/foods/food-list";
import { FoodSearchField } from "@/components/foods/food-search-field";
import { useFoodBrowse } from "@/hooks/use-food-browse";
import { isLiveMode } from "@/lib/api-mode";
import { foodMeta } from "@/lib/food-meta";
import { isCategoryFilter } from "@/lib/food-categories";
import { saveFoodRequest } from "@/lib/food-requests";
import type { FoodItem } from "@/lib/catalog";
import { EmptyState } from "@/components/ui/empty-state";

/** "Chọn nguyên liệu": the food search in a sheet; tick several foods (the + circle) and add them to the dish together. */
export function IngredientPicker({
  open,
  onClose,
  onConfirm,
  disabledIds = [],
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (foods: FoodItem[]) => void;
  disabledIds?: string[];
}) {
  return (
    <Sheet open={open} onClose={onClose} title="Chọn nguyên liệu" titleId="ingredient-picker-title" desktopDialog>
      <PickerBody onClose={onClose} onConfirm={onConfirm} disabledIds={disabledIds} />
    </Sheet>
  );
}

// Mounted only while the sheet is open, so each opening starts with a blank search and nothing ticked
function PickerBody({ onClose, onConfirm, disabledIds }: { onClose: () => void; onConfirm: (foods: FoodItem[]) => void; disabledIds: string[] }) {
  const { query, setQuery, filter, setFilter, list, filterItems, categoryName, isFavouriteFood, catalogPending, catalogFailed, retryCatalog } = useFoodBrowse({ oneRowPerFood: false });
  const [picked, setPicked] = useState<FoodItem[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const toggle = (food: FoodItem) =>
    setPicked((p) => (p.some((f) => f.id === food.id) ? p.filter((f) => f.id !== food.id) : [...p, food]));

  const sendRequest = () => {
    const result = saveFoodRequest(query);
    setNotice(
      result === "blank"
        ? "Gõ tên nguyên liệu vào ô tìm kiếm rồi gửi yêu cầu."
        : result === "failed"
          ? "Chưa gửi được yêu cầu. Bạn thử lại nhé."
          : "Đã gửi yêu cầu. Chúng tôi sẽ xem xét thêm nguyên liệu này."
    );
    window.setTimeout(() => setNotice(null), 3500);
  };

  return (
    <div className="flex min-h-0 flex-col gap-3">
      <FoodSearchField value={query} onChange={setQuery} />
      <ChipGroup scroll items={filterItems} ariaLabel="Lọc món theo nhóm" />
      <div data-ingredient-picker-list className="max-h-[44dvh] overflow-y-auto">
        <FoodList
          list={list}
          disabledIds={disabledIds}
          onPick={toggle}
          tray={{ ids: picked.map((f) => f.id), onToggle: toggle }}
          getMeta={foodMeta}
          categoryName={categoryName}
          showCategory={!isCategoryFilter(filter)}
          isFavourite={isFavouriteFood}
          showSourceTag={query.trim() !== ""}
          footer={
            // The request goes nowhere in live mode until the API has POST /food-requests
            !isLiveMode() && (
              <div data-align-group="ingredient-picker" data-align-edge="left" className="flex flex-col items-center gap-2 py-3 text-center">
                <p className="m-0 text-sm font-semibold text-text">Không tìm thấy nguyên liệu?</p>
                <button
                  type="button"
                  onClick={sendRequest}
                  className="min-h-11 cursor-pointer rounded-full border border-card-border bg-card px-5 text-sm font-semibold text-cobalt active:scale-[0.97] transition-press motion-reduce:active:scale-100"
                >
                  Gửi yêu cầu thêm món
                </button>
              </div>
            )
          }
          empty={
            catalogPending || catalogFailed ? (
              <CatalogStatus failed={catalogFailed} onRetry={retryCatalog} />
            ) : (
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
            )
          }
        />
      </div>
      <Presence>{notice && <Toast message={notice} />}</Presence>
      {picked.length > 0 ? (
        <div
          role="region"
          aria-label={`${picked.length} nguyên liệu`}
          data-tour="ingredient-bar"
          className="flex items-center gap-3 rounded-card bg-ink px-3 py-2 text-on-dark"
        >
          <span aria-hidden="true" className="flex h-7 min-w-7 items-center justify-center rounded-full bg-cobalt px-2 text-sm font-bold text-on-accent tabular-nums">
            {picked.length}
          </span>
          <span className="min-w-0 flex-1 text-cap font-semibold">nguyên liệu</span>
          <button
            type="button"
            onClick={() => onConfirm(picked)}
            className="min-h-11 shrink-0 cursor-pointer rounded-full border-0 bg-cobalt px-4 text-cap font-bold text-on-accent active:scale-[0.97] transition-press motion-reduce:active:scale-100"
          >
            Thêm vào món
          </button>
        </div>
      ) : (
        <PillButton variant="secondary" onClick={onClose}>
          Hủy
        </PillButton>
      )}
    </div>
  );
}
