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

/** The card's body: a line naming the largest source, then the rows (V3NutrientDetail). Sits in a column with a 4 px gap under the card's title. */
export function ContributingFoods({ sources, unit, isToday = true }: ContributingFoodsProps) {
  if (sources.length === 0) {
    return (
      <p className="m-0 text-sm leading-relaxed text-secondary">
        {isToday ? "Chưa có món nào có chất này hôm nay." : "Chưa có món nào có chất này."}
      </p>
    );
  }

  const top = sources[0];
  return (
    <>
      <p className="m-0 mb-1 text-cap leading-snug text-secondary">
        Nhiều nhất từ {top.name}: {amountLabel(top.amount, unit)}.
      </p>
      <ul className="m-0 p-0 list-none flex flex-col">
        {sources.slice(0, SHOWN).map((source) => (
          <li
            key={source.id}
            data-align-group="nutrient-source"
            className="flex items-center justify-between gap-3 min-h-12 py-2 border-t border-divider first:border-t-0"
          >
            <span className="min-w-0 text-callout font-semibold leading-snug">
              {source.name} <span className="font-normal text-secondary">· {source.qty}</span>
            </span>
            <span className="shrink-0 text-callout font-bold tabular-nums">{amountLabel(source.amount, unit)}</span>
          </li>
        ))}
      </ul>
    </>
  );
}
