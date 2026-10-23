"use client";

import React, { useEffect, useId, useState } from "react";
import { Expand } from "@/components/ui/expand";
import { demoActive } from "@/lib/demo";
import { amountLabel } from "@/lib/nutrient-detail";
import { sourcesAgree, sourcesSum, type NutrientSource } from "@/lib/nutrient-sources";

/** How many foods the card lists before "Món khác". The largest contributors come first. */
const SHOWN = 5;

export interface ContributingFoodsProps {
  sources: NutrientSource[];
  unit: string;
  /** The page's hero total for the same day: the footer reads it, the rows are checked against it. Null when the day's amount is unknown. */
  total: number | null;
  isToday?: boolean;
}

function SourceRow({ source, unit, first = false }: { source: NutrientSource; unit: string; first?: boolean }) {
  return (
    <li
      data-align-group="nutrient-source"
      className={`flex items-center justify-between gap-3 min-h-12 py-2 border-t border-divider ${first ? "first:border-t-0" : ""}`}
    >
      <span className="min-w-0 text-callout font-semibold leading-snug">
        {source.name} <span className="font-normal text-secondary">· {source.qty}</span>
      </span>
      <span className="shrink-0 text-callout font-bold tabular-nums">{amountLabel(source.amount, unit)}</span>
    </li>
  );
}

/**
 * The card's body: a line naming the largest source, the five largest rows, "Món khác · N món" (a button that opens the rest in
 * place, so no food is ever left out), and the page's total (V3NutrientDetail). Sits in a column with a 4 px gap under the card's title.
 */
export function ContributingFoods({ sources, unit, total, isToday = true }: ContributingFoodsProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  // The rows and the hero read the same entries; if they ever drift apart the card would look wrong again. Not in demo: the sample day's totals are hand-set.
  useEffect(() => {
    if (process.env.NODE_ENV === "production" || total === null || demoActive() || sourcesAgree(sources, total)) return;
    console.warn(`ContributingFoods: the rows add up to ${sourcesSum(sources)} ${unit}, the page total is ${total} ${unit}`);
  }, [sources, total, unit]);

  if (sources.length === 0) {
    return (
      <p className="m-0 text-sm leading-relaxed text-secondary">
        {isToday ? "Chưa có món nào có chất này hôm nay." : "Chưa có món nào có chất này."}
      </p>
    );
  }

  const top = sources[0];
  const rest = sources.slice(SHOWN);
  return (
    <>
      <p className="m-0 mb-1 text-cap leading-snug text-secondary">
        Nhiều nhất từ {top.name}: {amountLabel(top.amount, unit)}.
      </p>
      <div className="flex flex-col">
        <ul className="m-0 p-0 list-none flex flex-col">
          {sources.slice(0, SHOWN).map((source) => (
            <SourceRow key={source.id} source={source} unit={unit} first />
          ))}
        </ul>
        {rest.length > 0 && (
          <>
            <Expand open={open} id={panelId}>
              <ul className="m-0 p-0 list-none flex flex-col">
                {rest.map((source) => (
                  <SourceRow key={source.id} source={source} unit={unit} />
                ))}
              </ul>
            </Expand>
            <button
              type="button"
              aria-expanded={open}
              aria-controls={panelId}
              data-align-group="nutrient-source"
              onClick={() => setOpen(!open)}
              className="flex w-full min-h-12 cursor-pointer items-center justify-between gap-3 border-0 border-t border-solid border-divider bg-transparent py-2 text-left text-callout font-bold text-cobalt"
            >
              <span>{open ? "Thu gọn" : `Món khác · ${rest.length} món`}</span>
              <span className="flex items-center gap-2 tabular-nums">
                {!open && amountLabel(sourcesSum(rest), unit)}
                <svg className="m-chevron shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </span>
            </button>
          </>
        )}
      </div>
      {total !== null && (
        <p className="m-0 mt-2 text-cap leading-snug text-secondary tabular-nums">
          Tổng {amountLabel(total, unit)} từ {sources.length} món
        </p>
      )}
    </>
  );
}
