"use client";

import React from "react";
import Link from "next/link";
import { getLevelLabel, type NutrientLevel } from "@/lib/levels";
import { formatNumber } from "@/lib/format";
import type { MicroSquare } from "@/lib/overview-board";

const SQUARE_BG: Record<NutrientLevel, string> = {
  thieu: "bg-level-red",
  trungbinh: "bg-level-yellow",
  ganDu: "bg-level-green",
  dat: "bg-level-blue",
};

/**
 * The 22 nutrients as squares coloured by level (dark tokens), in the order given (lowest share first). A
 * square is a button; the line below names the selected nutrient, its share and level, and with `detailLink`
 * links to /micros/[nutrient]. Meant for a dark card.
 */
export function NutrientGrid({
  id,
  squares,
  selected,
  onSelect,
  detailLink = false,
}: {
  id: string;
  squares: MicroSquare[];
  selected: number;
  onSelect: (i: number) => void;
  detailLink?: boolean;
}) {
  const square = squares[Math.min(selected, squares.length - 1)] ?? null;
  return (
    <div id={id} className="flex flex-col gap-3">
      <ul className="m-0 grid list-none grid-cols-6 gap-1 p-0 lg:grid-cols-8">
        {squares.map((s, i) => {
          const isSel = i === selected;
          const level = s.level ? getLevelLabel(s.level) : "chưa có dữ liệu";
          return (
            <li key={s.key}>
              <button
                type="button"
                aria-pressed={isSel}
                aria-label={`${s.name}${s.percentage === null ? "" : ` ${s.percentage}%`} · ${level}`}
                onClick={() => onSelect(i)}
                className={`block h-11 w-full cursor-pointer rounded-lg border-0 p-0 active:scale-[0.97] transition-press motion-reduce:active:scale-100 ${
                  s.level ? SQUARE_BG[s.level] : "bg-level-empty-dark"
                } ${isSel ? "opacity-100 ring-2 ring-on-dark" : "opacity-85"}`}
              />
            </li>
          );
        })}
      </ul>
      <p aria-live="polite" className="m-0 flex items-baseline justify-between gap-3 rounded-xl bg-level-empty-dark px-3 py-3">
        <span className="text-callout font-bold">{square?.name}</span>
        <span className="text-right">
          {square && square.percentage !== null && square.level ? (
            <>
              <span className="font-display text-2xl font-extrabold tabular-nums text-on-dark tracking-display">
                {formatNumber(square.percentage)}%
              </span>
              <span className="ml-2 text-xs font-bold text-muted-subtitle">{getLevelLabel(square.level)}</span>
            </>
          ) : (
            <span className="text-xs font-bold text-muted-subtitle">Chưa có dữ liệu</span>
          )}
        </span>
      </p>
      {detailLink && square && (
        <Link
          href={`/micros/${square.key}`}
          className="inline-flex min-h-11 items-center self-start rounded-full px-1 text-callout font-bold text-sky no-underline active:scale-[0.97] transition-press motion-reduce:active:scale-100"
        >
          Xem chi tiết {square.name}
        </Link>
      )}
    </div>
  );
}
