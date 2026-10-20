"use client";

import React, { useState } from "react";
import { Sheet } from "@/components/ui/sheet";
import { PillButton } from "@/components/ui/pill-button";
import { ChipGroup } from "@/components/ui/chip-group";
import { FormRow } from "@/components/ui/form-row";
import { CatalogStatus } from "@/components/foods/catalog-status";
import { FoodList } from "@/components/foods/food-list";
import { FoodSearchField } from "@/components/foods/food-search-field";
import { useFoodBrowse } from "@/hooks/use-food-browse";
import { foodMeta } from "@/lib/food-meta";
import { isCategoryFilter } from "@/lib/food-categories";
import { gramsText } from "@/components/training/training-log-sheet";
import type { FoodItem } from "@/lib/mock/foods";
import { formatGramsServingLabel, gramsServingLabel, hidesGrams, parseGramsInput } from "@/lib/portion";
import type { OwnTrainingItem, TrainingPhaseId } from "@/lib/training-prefs";
import { EmptyState } from "@/components/ui/empty-state";

export interface OwnItemTarget {
  phase: TrainingPhaseId;
  /** "Trước tập", "Trong tập" */
  name: string;
}

/**
 * cc-52: "+ Thêm món" on Ngày tập. Pick a catalogue food, then its amount; the item stays on the user's list for every
 * training day (onAdd).
 */
export function OwnItemSheet({
  target,
  onClose,
  onAdd,
}: {
  target: OwnItemTarget | null;
  onClose: () => void;
  onAdd: (item: Omit<OwnTrainingItem, "id">) => void;
}) {
  return (
    <Sheet open={target !== null} onClose={onClose} title={target ? `Thêm món vào ${target.name}` : undefined} titleId="own-item-title" desktopDialog>
      {target && <OwnItemBody target={target} onClose={onClose} onAdd={onAdd} />}
    </Sheet>
  );
}

function OwnItemBody({ target, onClose, onAdd }: { target: OwnItemTarget; onClose: () => void; onAdd: (item: Omit<OwnTrainingItem, "id">) => void }) {
  const [food, setFood] = useState<FoodItem | null>(null);
  return food ? (
    <AmountStep food={food} target={target} onBack={() => setFood(null)} onAdd={onAdd} />
  ) : (
    <PickStep onPick={setFood} onClose={onClose} />
  );
}

function PickStep({ onPick, onClose }: { onPick: (food: FoodItem) => void; onClose: () => void }) {
  const { query, setQuery, filter, setFilter, list, filterItems, categoryName, isFavouriteFood, catalogPending, catalogFailed, retryCatalog } = useFoodBrowse();
  return (
    <div className="flex min-h-0 flex-col gap-3">
      <FoodSearchField value={query} onChange={setQuery} />
      <ChipGroup scroll items={filterItems} ariaLabel="Lọc món theo nhóm" />
      <div className="max-h-[44dvh] overflow-y-auto">
        <FoodList
          list={list}
          onPick={onPick}
          getMeta={foodMeta}
          categoryName={categoryName}
          showCategory={!isCategoryFilter(filter)}
          isFavourite={isFavouriteFood}
          showSourceTag={query.trim() !== ""}
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
      <PillButton variant="secondary" onClick={onClose}>
        Hủy
      </PillButton>
    </div>
  );
}

function AmountStep({ food, target, onBack, onAdd }: { food: FoodItem; target: OwnItemTarget; onBack: () => void; onAdd: (item: Omit<OwnTrainingItem, "id">) => void }) {
  const first = food.servings[0];
  const [gramsInput, setGramsInput] = useState(first ? gramsText(first.grams) : "");
  const [label, setLabel] = useState(first?.label ?? "");
  const grams = parseGramsInput(gramsInput);
  const noGrams = hidesGrams(food);

  return (
    <div className="flex flex-col gap-3">
      <div data-align-group="own-item" className="flex min-h-11 items-center justify-between gap-2">
        <span title={food.nameVi} className="line-clamp-2 min-w-0 break-words text-base font-bold text-text">
          {food.nameVi}
        </span>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex min-h-11 shrink-0 cursor-pointer items-center border-0 bg-transparent text-sm font-semibold text-cobalt active:scale-[0.97] transition-press motion-reduce:active:scale-100"
        >
          Đổi món
        </button>
      </div>
      {food.servings.length > 0 && (
        <div data-align-group="own-item">
          <ChipGroup
            columns={Math.min(food.servings.length, 3)}
            items={food.servings.map((s) => ({
              id: s.label,
              label: s.display ?? s.label,
              active: label === s.label,
              onClick: () => {
                setGramsInput(gramsText(s.grams));
                setLabel(s.label);
              },
            }))}
          />
        </div>
      )}
      {!noGrams && (
        <FormRow label="Số gam" htmlFor="own-item-grams" data-align-group="own-item">
          <input
            id="own-item-grams"
            type="text"
            inputMode="decimal"
            value={gramsInput}
            onChange={(e) => {
              setGramsInput(e.target.value);
              setLabel(formatGramsServingLabel(e.target.value, ""));
            }}
            className="h-11 w-full rounded-xl border border-card-border bg-card px-3 text-base font-bold tabular-nums text-text focus-visible:outline-2 focus-visible:outline-cobalt"
          />
        </FormRow>
      )}
      <PillButton
        disabled={grams <= 0}
        onClick={() => onAdd({ phase: target.phase, foodId: food.id, name: food.nameVi, grams, label: label || gramsServingLabel(grams) })}
      >
        Thêm vào {target.name}
      </PillButton>
    </div>
  );
}
