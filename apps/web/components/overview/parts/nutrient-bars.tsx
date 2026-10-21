import React from "react";
import { getLevel, getLevelColor, getLevelLabel } from "@/lib/levels";
import { formatNumber } from "@/lib/format";
import type { MicroBoard } from "@/lib/overview-board";

const LEGEND: { level: keyof MicroBoard["counts"]; label: string }[] = [
  { level: "thieu", label: "Thiếu" },
  { level: "trungbinh", label: "Trung bình" },
  { level: "ganDu", label: "Gần đủ" },
  { level: "dat", label: "Đạt" },
];

/**
 * Every nutrient at a glance on the ink hero (V3 Vi chất): one bar per nutrient, lowest share first, in its level
 * colour and full at 100% of the target, the real % beside it (white, for contrast). No tap needed; a nutrient with no
 * data has an empty track and "—". The legend under it counts the four levels.
 */
export function NutrientBars({ id, board }: { id: string; board: MicroBoard }) {
  return (
    <>
      <ul id={id} aria-label="Từng vi chất, thấp đến cao" className="m-0 flex list-none flex-col gap-1 p-0">
        {board.squares.map((s) => {
          const known = s.percentage !== null && s.level !== null;
          return (
            <li
              key={s.key}
              data-align-group="overview-micro-bars"
              aria-label={`${s.name}${known ? `, ${formatNumber(s.percentage as number)}%, ${getLevelLabel(s.level!)}` : ", chưa có dữ liệu"}`}
              className="grid min-h-4 grid-cols-[96px_minmax(0,1fr)_44px] items-center gap-2"
            >
              <span aria-hidden="true" className="text-xs font-semibold leading-tight text-on-dark">
                {s.name}
              </span>
              <span aria-hidden="true" className="block h-[10px] overflow-hidden rounded-full bg-level-empty-dark">
                {known && (
                  <span
                    className="block h-full rounded-full"
                    style={{ width: `${Math.min(s.percentage as number, 100)}%`, backgroundColor: getLevelColor(getLevel(s.percentage as number), "dark") }}
                  />
                )}
              </span>
              <span aria-hidden="true" className={`text-right font-display text-cap font-extrabold leading-none tabular-nums ${known ? "text-on-dark" : "text-muted-subtitle"}`}>
                {known ? `${formatNumber(s.percentage as number)}%` : "—"}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="m-0 flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold text-muted-subtitle">
        {LEGEND.map((g) => (
          <span key={g.level} className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="inline-block h-[9px] w-[9px] rounded-[3px]" style={{ backgroundColor: getLevelColor(g.level, "dark") }} />
            {g.label} {board.counts[g.level]}
          </span>
        ))}
      </p>
    </>
  );
}
