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
  thieu: "bg-level-thieu",
  trungbinh: "bg-level-trungbinh",
  ganDu: "bg-level-gandu",
  dat: "bg-level-dat",
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
            <span className="text-xs font-semibold tabular-nums leading-none text-text">{value}</span>
            {level ? (
              <span
                role="img"
                aria-label={`${weekdayShortVi(point.iso)} ${point.iso.slice(8)}/${point.iso.slice(5, 7)}: ${value}${point.percentage !== null ? " mục tiêu" : ""}`}
                className="flex h-16 w-6 flex-col justify-end overflow-hidden rounded-sm bg-level-empty">
                <span className={`block w-full ${FILL[level]}`} style={{ height: `${Math.min(point.percentage ?? 0, 100)}%` }} />
              </span>
            ) : (
              <span aria-hidden="true" className="h-16 w-6" />
            )}
            <span className={`text-xs leading-none ${point.iso === todayIso ? "font-bold text-text" : "text-secondary"}`}>{weekdayShortVi(point.iso)}</span>
            <span className="text-xs leading-none tabular-nums text-secondary">{point.iso.slice(8)}</span>
          </li>
        );
      })}
    </ol>
  );
}
