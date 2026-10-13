"use client";

import React, { useState } from "react";
import { getLevelLabel, type NutrientLevel } from "@/lib/levels";
import { formatNumber } from "@/lib/format";
import type { MicroBoard } from "@/lib/overview-board";

const SQUARE_BG: Record<NutrientLevel, string> = {
  thieu: "bg-level-red-dark",
  trungbinh: "bg-level-yellow-dark",
  ganDu: "bg-level-green-dark",
  dat: "bg-level-blue-dark",
};

const LEVEL_TEXT: Record<NutrientLevel, string> = {
  thieu: "text-level-red-dark",
  trungbinh: "text-level-yellow-dark",
  ganDu: "text-level-green-dark",
  dat: "text-level-blue-dark",
};

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`shrink-0 transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

/**
 * The Vi chất card of Tóm tắt (dark): how many of the 22 counted nutrients reach their target, ten slanted
 * segments, and what is lowest. Tapping opens the 22 squares, lowest share first; a square names the nutrient.
 */
export function MicroCard({ board }: { board: MicroBoard }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(0);
  const square = board.squares[Math.min(selected, board.squares.length - 1)] ?? null;
  const hint =
    board.lowest.length > 0
      ? `Thiếu nhiều nhất: ${board.lowest.map((l) => l.name).join(", ")}`
      : board.unknown === board.total
        ? "Chưa có số liệu vi chất trong kỳ"
        : "Không có vi chất nào dưới mục tiêu";
  const change = board.change;

  return (
    <section
      id="ov-micro"
      aria-labelledby="ov-micro-title"
      className="overflow-hidden rounded-[18px] bg-surface-dark text-on-dark"
    >
      <h2 id="ov-micro-title" className="sr-only">
        Vi chất đạt {board.achieved} trên {board.total}
      </h2>
      <button
        type="button"
        aria-expanded={open}
        aria-controls="ov-micro-grid"
        aria-label={`Vi chất đạt ${board.achieved} trên ${board.total}. ${hint}`}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full cursor-pointer flex-col gap-3 border-0 bg-transparent p-4 text-left font-sans text-on-dark active:opacity-90 motion-reduce:active:opacity-100"
      >
        <span aria-hidden="true" className="flex w-full items-baseline justify-between">
          <span className="text-[15px] font-bold">Vi chất đạt</span>
          <span>
            <span className="font-display text-4xl font-bold leading-none tabular-nums">{board.achieved}</span>
            <span className="font-display text-4xl font-bold leading-none text-muted-subtitle">/{board.total}</span>
            {change !== null && (
              <span className="ml-2 text-[13px] font-bold text-sky">
                {change > 0 ? `▲ ${change}` : change < 0 ? `▼ ${Math.abs(change)}` : "Không đổi"}
              </span>
            )}
          </span>
        </span>
        {change !== null && change !== 0 && (
          <span className="sr-only">
            {change > 0 ? "Tăng" : "Giảm"} {Math.abs(change)} so với kỳ trước
          </span>
        )}
        <span aria-hidden="true" className="grid w-full gap-1" style={{ gridTemplateColumns: "repeat(10, minmax(0, 1fr))" }}>
          {Array.from({ length: 10 }).map((_, i) => (
            <span
              key={i}
              className={`h-3 rounded-[1px] ${i < board.segments ? "bg-sky" : "bg-level-empty-dark"}`}
              style={{ transform: "skewX(-14deg)" }}
            />
          ))}
        </span>
        <span className="flex w-full items-center justify-between gap-3 text-[13px] text-muted-subtitle">
          <span>{open ? "Chạm vào từng ô để xem chi tiết" : hint}</span>
          <Chevron open={open} />
        </span>
      </button>

      {open && (
        <div id="ov-micro-grid" className="flex flex-col gap-3 px-4 pb-4">
          <ul className="m-0 grid list-none grid-cols-6 gap-1 p-0 lg:grid-cols-8">
            {board.squares.map((s, i) => {
              const isSel = i === selected;
              const level = s.level ? getLevelLabel(s.level) : "chưa có số liệu";
              return (
                <li key={s.key}>
                  <button
                    type="button"
                    aria-pressed={isSel}
                    aria-label={`${s.name}${s.percentage === null ? "" : ` ${s.percentage}%`} · ${level}`}
                    onClick={() => setSelected(i)}
                    className={`block h-11 w-full cursor-pointer rounded-lg border-0 p-0 active:scale-[0.97] motion-reduce:active:scale-100 ${
                      s.level ? SQUARE_BG[s.level] : "bg-level-empty-dark"
                    } ${isSel ? "opacity-100 ring-2 ring-on-dark" : "opacity-85"}`}
                  />
                </li>
              );
            })}
          </ul>
          <p aria-live="polite" className="m-0 flex items-baseline justify-between gap-3 rounded-xl bg-level-empty-dark px-3 py-3">
            <span className="text-[15px] font-bold">{square?.name}</span>
            <span className="text-right">
              {square && square.percentage !== null && square.level ? (
                <>
                  <span className={`font-display text-2xl font-bold tabular-nums ${LEVEL_TEXT[square.level]}`}>
                    {formatNumber(square.percentage)}%
                  </span>
                  <span className="ml-2 text-xs font-bold text-muted-subtitle">{getLevelLabel(square.level)}</span>
                </>
              ) : (
                <span className="text-xs font-bold text-muted-subtitle">Chưa có số liệu</span>
              )}
            </span>
          </p>
          <p className="m-0 flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold text-muted-subtitle">
            <span>Thiếu {board.counts.thieu}</span>
            <span>Trung bình {board.counts.trungbinh}</span>
            <span>Gần đủ {board.counts.ganDu}</span>
            <span>Đạt {board.counts.dat}</span>
          </p>
        </div>
      )}
    </section>
  );
}
