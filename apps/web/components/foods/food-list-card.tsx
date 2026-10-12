import React from "react";
import type { FoodItem } from "@/lib/mock/foods";
import { Card } from "@/components/ui/card";
import { SectionTitle } from "@/components/ui/section-title";
import { FoodRowLink } from "./food-row-link";
import { foodRowMeta, foodRowKcal } from "@/lib/food-meta";

export interface FoodListCardProps {
  title?: string;
  /** Optional link or control at the right of the title. */
  action?: React.ReactNode;
  foods: { food: FoodItem; label?: string; grams?: number }[];
  /** Prefix for the meta line, e.g. the category name. */
  withCategory?: (food: FoodItem) => string;
  empty?: React.ReactNode;
}

/** One Card holding a titled list of food rows with dividers (UI-RULES row pattern). */
export function FoodListCard({ title, action, foods, withCategory, empty }: FoodListCardProps) {
  return (
    <Card as="section" aria-label={title} className="flex flex-col gap-1">
      {(title || action) && (
        <div className="flex min-h-[44px] items-center justify-between gap-2">
          {title && <SectionTitle>{title}</SectionTitle>}
          {action}
        </div>
      )}
      {foods.length === 0
        ? empty
        : foods.map(({ food, label, grams }, i) => (
            <FoodRowLink
              key={`${food.id}-${i}`}
              href={`/foods/${food.id}`}
              name={food.nameVi}
              meta={`${withCategory ? `${withCategory(food)} · ` : ""}${foodRowMeta(food, label)}`}
              value={foodRowKcal(food, grams)}
              withBorderTop={i > 0 || !!title}
            />
          ))}
    </Card>
  );
}
