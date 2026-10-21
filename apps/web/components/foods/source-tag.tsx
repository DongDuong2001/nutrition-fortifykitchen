import React from "react";
import type { FoodItem } from "@/lib/mock/foods";
import { searchTag } from "@/lib/food-source";

/** The small pill with a food's source ("USDA", "Fortify Kitchen"): a search result's tag and a carousel card's. Its own module, so a card does not pull the whole food list with it. */
export function SourceTag({ food }: { food: FoodItem }) {
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
