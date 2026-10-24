import React, { useState } from "react";
import type { FoodItem } from "@/lib/catalog";
import { Card } from "@/components/ui/card";
import { SectionTitle } from "@/components/ui/section-title";
import { FoodRowLink } from "./food-row-link";
import { foodRowMeta, foodRowKcal } from "@/lib/food-meta";
import { rowName } from "@/lib/food-rows";

const FOOD_CARD_LIMIT = 50;

export interface FoodListCardProps {
  title?: string;
  /** Optional link or control at the right of the title. */
  action?: React.ReactNode;
  foods: { food: FoodItem; label?: string; grams?: number }[];
  /** Prefix for the meta line, e.g. the category name. */
  withCategory?: (food: FoodItem) => string;
  empty?: React.ReactNode;
  /** Colour of each row's kcal (a group's list page); default: the text colour. */
  valueColor?: string;
  /** A control at the end of each row, outside its link (the ⋯ of Món ăn của tôi). `first` is true for the first row (the tip points at it). */
  rowAction?: (food: FoodItem, first: boolean) => React.ReactNode;
}

/** One Card holding a titled list of food rows with dividers (UI-RULES row pattern). */
export function FoodListCard({ title, action, foods, withCategory, empty, valueColor, rowAction }: FoodListCardProps) {
  // cc-58: the first 50 rows, then "Xem thêm" (a new list, from another query, starts again)
  const listKey = `${foods.length}:${foods[0]?.food.id ?? ""}`;
  const [more, setMore] = useState({ listKey, extra: 0 });
  const extra = more.listKey === listKey ? more.extra : 0;
  const limit = FOOD_CARD_LIMIT + extra;
  return (
    <Card as="section" aria-label={title} className="flex flex-col gap-1">
      {(title || action) && (
        <div className="flex min-h-11 items-center justify-between gap-2">
          {title && <SectionTitle>{title}</SectionTitle>}
          {action}
        </div>
      )}
      {foods.length === 0
        ? empty
        : foods.slice(0, limit).map(({ food, label, grams }, i) => (
            <FoodRowLink
              key={`${food.id}-${i}`}
              href={`/foods/${food.id}`}
              name={rowName(food)}
              meta={`${withCategory ? `${withCategory(food)} · ` : ""}${foodRowMeta(food, label)}`}
              value={foodRowKcal(food, grams)}
              valueColor={valueColor}
              withBorderTop={i > 0 || !!title}
              trailing={rowAction?.(food, i === 0)}
            />
          ))}
      {foods.length > limit && (
        <button
          type="button"
          onClick={() => setMore({ listKey, extra: extra + FOOD_CARD_LIMIT })}
          className="flex min-h-14 w-full cursor-pointer items-center justify-center border-0 border-t border-divider bg-transparent px-4 text-callout font-bold text-cobalt"
        >
          Xem thêm
        </button>
      )}
    </Card>
  );
}
