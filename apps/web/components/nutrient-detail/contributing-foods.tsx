import React from "react";
import { amountLabel } from "@/lib/nutrient-detail";
import { type NutrientSource } from "@/lib/nutrient-sources";

/** How many foods the card lists. The largest contributors come first. */
const SHOWN = 5;

export interface ContributingFoodsProps {
  sources: NutrientSource[];
  unit: string;
  isToday?: boolean;
}

export function ContributingFoods({ sources, unit, isToday = true }: ContributingFoodsProps) {
  if (sources.length === 0) {
    return (
      <p className="m-0 text-sm leading-relaxed text-secondary">
        {isToday ? "Chưa có món nào có chất này hôm nay." : "Chưa có món nào có chất này."}
      </p>
    );
  }

  return (
    <ul className="m-0 p-0 list-none flex flex-col">
      {sources.slice(0, SHOWN).map((source) => (
        <li
          key={source.id}
          className="flex items-center justify-between gap-3 min-h-10 py-2 border-t border-card-border first:border-t-0 text-sm"
        >
          <span className="min-w-0 font-semibold">
            {source.name} <span className="font-medium text-secondary">· {source.qty}</span>
          </span>
          <span className="shrink-0 font-semibold tabular-nums">{amountLabel(source.amount, unit)}</span>
        </li>
      ))}
    </ul>
  );
}
