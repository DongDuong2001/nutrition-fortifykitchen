"use client";

import React, { useState } from "react";
import Link from "next/link";
import { NutrientGrid } from "@/components/overview/parts/nutrient-grid";
import { Expand } from "@/components/ui/expand";
import { HeroBar } from "@/components/overview/parts/hero-card";
import type { MicroBoard } from "@/lib/overview-board";

function Chevron() {
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
      className="m-chevron shrink-0"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

/**
 * The Vi chất card of Tóm tắt (dark): how many of the Level's nutrients reach their target (the count Hôm nay shows), one
 * continuous bar, and what is lowest. Tapping opens the NutrientGrid of all 22, lowest share first, and "Đủ 22 vi chất ›".
 */
export function MicroCard({ board, allHref }: { board: MicroBoard; allHref: string }) {
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
    <section id="ov-micro" aria-labelledby="ov-micro-title" className="overflow-hidden rounded-card bg-ink text-on-dark">
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
          <span className="text-callout font-bold">Vi chất đạt</span>
          <span>
            <span className="font-display text-4xl font-black leading-none tabular-nums tracking-display">{board.achieved}</span>
            <span className="font-display text-4xl font-black leading-none text-muted-subtitle tracking-display">/{board.total}</span>
            {change !== null && (
              <span className="ml-2 text-cap font-bold text-sky">
                {change > 0 ? `▲ ${change}` : change < 0 ? `▼ ${Math.abs(change)}` : "Không đổi"}
              </span>
            )}
          </span>
        </span>
        <span aria-hidden="true" className="w-full">
          <HeroBar pct={board.total > 0 ? (board.achieved / board.total) * 100 : 0} />
        </span>
        <span className="flex w-full items-center justify-between gap-3 text-cap text-muted-subtitle">
          <span>{open ? "Chạm vào từng ô để xem chi tiết" : hint}</span>
          <Chevron />
        </span>
      </button>

      <Expand open={open} className="px-4 pb-4">
          <NutrientGrid id="ov-micro-grid" squares={board.squares} selected={selected} onSelect={setSelected} />
          <p className="m-0 mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold text-muted-subtitle">
            <span>Thiếu {board.counts.thieu}</span>
            <span>Trung bình {board.counts.trungbinh}</span>
            <span>Gần đủ {board.counts.ganDu}</span>
            <span>Đạt {board.counts.dat}</span>
          </p>
          <Link href={allHref} className="mt-1 inline-flex min-h-11 items-center text-cap font-bold text-sky no-underline">
            Đủ 22 vi chất ›
          </Link>
      </Expand>
    </section>
  );
}
