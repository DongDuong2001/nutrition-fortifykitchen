import React from "react";
import { formatAmount } from "@/lib/format";
import { getLevel, type NutrientLevel } from "@/lib/levels";
import { weekdayShortVi } from "@/lib/nutrient-detail";

export interface HistoryPoint {
  iso: string;
  consumed: number | null;
  percentage: number | null;
}

export interface NutrientHistoryProps {
  points: HistoryPoint[];
  unit: string;
  todayIso: string;
}

const FILL: Record<NutrientLevel, string> = {
  thieu: "bg-level-red",
  trungbinh: "bg-level-yellow",
  ganDu: "bg-level-green",
  dat: "bg-level-blue",
};

/**
 * Seven days of one nutrient as columns, oldest first. The value on top is the share of target when there
 * is one, else the amount. An unknown day shows "—" and no bar, never an empty bar that reads as 0.
 */
export function NutrientHistory({ points, unit, todayIso }: NutrientHistoryProps) {
  return (
    <ol aria-label="7 ngày qua" className="m-0 p-0 list-none grid grid-cols-7 gap-1">
      {points.map((point) => {
        const level = point.percentage === null ? null : getLevel(point.percentage);
        const value =
          point.percentage !== null
            ? `${point.percentage}%`
            : point.consumed !== null
              ? formatAmount(point.consumed, unit)
              : "—";
        return (
          <li
            key={point.iso}
            aria-current={point.iso === todayIso ? "date" : undefined}
            className="flex flex-col items-center gap-1 min-w-0"
          >
            <span className="text-[11px] font-semibold tabular-nums leading-none text-text">{value}</span>
            {level ? (
              <span aria-hidden="true" className="flex h-16 w-6 flex-col justify-end overflow-hidden rounded-sm bg-level-empty">
                <span className={`block w-full ${FILL[level]}`} style={{ height: `${Math.min(point.percentage ?? 0, 100)}%` }} />
              </span>
            ) : (
              <span aria-hidden="true" className="h-16 w-6" />
            )}
            <span className="text-[11px] leading-none text-secondary">{weekdayShortVi(point.iso)}</span>
            <span className="text-[11px] leading-none tabular-nums text-secondary">{point.iso.slice(8)}</span>
          </li>
        );
      })}
    </ol>
  );
}
