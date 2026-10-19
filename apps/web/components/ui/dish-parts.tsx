"use client";

import React, { useEffect, useId, useMemo, useState } from "react";
import { Expand } from "@/components/ui/expand";
import { ChipGroup } from "@/components/ui/chip-group";
import { useCatalogFoods } from "@/hooks/use-catalog-foods";
import { MOCK_FOODS, type FoodItem } from "@/lib/mock/foods";
import {
  addOnEntries,
  dishViewOf,
  foodsByKey,
  loadDishRecipes,
  scaledAddOn,
  scaledPart,
  servingsOf,
  type AddOnEntry,
  type DishRecipes,
} from "@/lib/dish-recipes";
import { formatAmount } from "@/lib/format";
import { kcalValue } from "@/lib/kcal";

export interface DishPartsProps {
  food: FoodItem;
  /** The chosen portion in grams */
  portionGrams: number;
  /** The add-ons that are on, as the entries a save logs (empty when none). Called when they or the portion change. */
  onAddOns: (entries: AddOnEntry[]) => void;
}

/**
 * cc-54 "Thành phần": what is inside a premade dish, for the portion that is chosen (grams and ×N), collapsed until
 * asked for, and the dish's add-on chips ("+ Bún 100 g"). A chip switched on is logged with the dish, as its own entry in
 * the same meal, when the portion is saved. Nothing shows for a dish without a recipe. The recipes (lib/dish-recipes)
 * load when this mounts, never with the page.
 */
export function DishParts({ food, portionGrams, onAddOns }: DishPartsProps) {
  const [recipes, setRecipes] = useState<DishRecipes | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<ReadonlySet<string>>(() => new Set());
  const panelId = useId();
  // Subscribes to the catalogue: the demo ingredients (or the live load) arrive after this mounts
  const { version } = useCatalogFoods();

  useEffect(() => {
    let current = true;
    loadDishRecipes().then(
      (loaded) => current && setRecipes(loaded),
      () => {}
    );
    return () => {
      current = false;
    };
  }, []);

  const view = useMemo(() => (recipes ? dishViewOf(food, recipes, foodsByKey(MOCK_FOODS)) : null), [recipes, food, version]);
  // No grams yet: one serving of the recipe
  const servings = view ? (portionGrams > 0 ? servingsOf(portionGrams, view.servingGrams) : 1) : 0;
  const entries = useMemo(() => (view ? addOnEntries(view.addOns, active, servings) : []), [view, active, servings]);

  useEffect(() => {
    onAddOns(entries);
  }, [entries, onAddOns]);
  useEffect(() => () => onAddOns([]), [onAddOns]);

  if (!view || view.parts.length === 0) return null;

  const toggle = (label: string) =>
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });

  return (
    <div
      role="group"
      aria-label="Thành phần"
      data-tour="dish-parts"
      data-align-group="portion"
      data-align-edge="left"
      className="flex w-full flex-col gap-3"
    >
      <div className="flex w-full flex-col rounded-2xl border border-card-border bg-card">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((o) => !o)}
          className="flex min-h-[48px] w-full cursor-pointer items-center justify-between gap-3 border-0 bg-transparent px-4 text-left text-text"
        >
          <span className="text-[15px] font-bold">Thành phần</span>
          <span className="flex items-center gap-2 text-[13px] text-secondary">
            {view.parts.length} nguyên liệu
            <svg className="m-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </span>
        </button>
        <Expand open={open} id={panelId}>
          <ul className="m-0 flex list-none flex-col p-0">
            {view.parts.map((part) => {
              const scaled = scaledPart(part, servings);
              return (
                <li
                  key={part.key}
                  data-align-group="dish-parts"
                  className="grid min-h-[40px] grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-3 border-t border-divider px-4 py-2 text-[13px]"
                >
                  <span className="min-w-0 break-words font-semibold leading-snug text-text">{part.name}</span>
                  <span className="text-right tabular-nums text-secondary">{formatAmount(scaled.grams, "g")} g</span>
                  <span className="min-w-[56px] text-right tabular-nums text-text" aria-label={scaled.kcal === null ? "chưa có dữ liệu năng lượng" : undefined}>
                    {scaled.kcal === null ? "—" : `${kcalValue(scaled.kcal)} kcal`}
                  </span>
                </li>
              );
            })}
          </ul>
        </Expand>
      </div>
      {view.addOns.length > 0 && (
        <ChipGroup
          data-align-group="portion"
          columns={view.addOns.length}
          items={view.addOns.map((a) => {
            const { grams } = scaledAddOn(a, servings);
            return {
              id: a.label,
              label: `${a.label} ${formatAmount(grams, "g")} g`,
              active: active.has(a.label),
              onClick: () => toggle(a.label),
            };
          })}
        />
      )}
    </div>
  );
}
