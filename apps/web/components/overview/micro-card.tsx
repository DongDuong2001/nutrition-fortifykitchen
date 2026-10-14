"use client";

import React, { useState } from "react";
import { NutrientGrid } from "@/components/overview/parts/nutrient-grid";
import { Segments } from "@/components/overview/parts/hero-card";
import type { MicroBoard } from "@/lib/overview-board";

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
 * segments, and what is lowest. Tapping opens the NutrientGrid, lowest share first.
 */
export function MicroCard({ board }: { board: MicroBoard }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(0);
  const hint =
    board.lowest.length > 0
      ? `Thiếu nhiều nhất: ${board.lowest.map((l) => l.name).join(", ")}`
      : board.unknown === board.total
        ? "Chưa có dữ liệu vi chất trong kỳ này"
        : "Không có vi chất nào dưới mục tiêu";
  const change = board.change;

  return (
    <section id="ov-micro" aria-labelledby="ov-micro-title" className="overflow-hidden rounded-[18px] bg-surface-dark text-on-dark">
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
        <span aria-hidden="true" className="w-full">
          <Segments filled={board.segments} />
        </span>
        <span className="flex w-full items-center justify-between gap-3 text-[13px] text-muted-subtitle">
          <span>{open ? "Chạm vào từng ô để xem chi tiết" : hint}</span>
          <Chevron open={open} />
        </span>
      </button>

      {open && (
        <div className="px-4 pb-4">
          <NutrientGrid id="ov-micro-grid" squares={board.squares} selected={selected} onSelect={setSelected} />
          <p className="m-0 mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold text-muted-subtitle">
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
