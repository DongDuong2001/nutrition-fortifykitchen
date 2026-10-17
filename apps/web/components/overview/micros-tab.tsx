"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { NotEnoughData } from "@/components/overview/overview-parts";
import { useOverview } from "@/components/overview/overview-frame";
import { AttentionList, type AttentionItem } from "@/components/overview/attention-list";
import { HeroCard, HeroNumber, HeroBar } from "@/components/overview/parts/hero-card";
import { NutrientGrid } from "@/components/overview/parts/nutrient-grid";
import { dayEntries } from "@/lib/day-history";
import { formatAmount, formatNumber, formatRange } from "@/lib/format";
import type { NutrientLevel } from "@/lib/levels";
import { microRows } from "@/lib/overview";
import { microBoard } from "@/lib/overview-board";
import { microSections, nutrientAttention } from "@/lib/overview-detail";
import { SectionTitle } from "@/components/ui/section-title";

const DOT: Record<NutrientLevel, string> = {
  thieu: "bg-level-red",
  trungbinh: "bg-level-yellow",
  ganDu: "bg-level-green",
  dat: "bg-level-blue",
};

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
      className="shrink-0 text-secondary transition-transform motion-reduce:transition-none group-open:rotate-180"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

/**
 * Vi chất (/trends/micros): "x/22 đạt" with the 22 squares (tap one for its name, share and level, and a link
 * to its detail), the nutrients grouped Thiếu, Trung bình, Gần đủ, Đạt as collapsible lists, and the three
 * lowest with amount / target, the gap per day and which logged foods gave the most.
 */
export function MicrosTab() {
  const { overview, targets, todayIso } = useOverview();
  const { averages, previousAverages, targetDays, days } = overview;
  // The selected nutrient by key, so a new period (a different order) keeps naming the same nutrient
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const rows = useMemo(() => microRows(averages, targetDays, targets), [averages, targetDays, targets]);
  const previousRows = useMemo(() => microRows(previousAverages, targetDays, targets), [previousAverages, targetDays, targets]);
  const board = useMemo(() => microBoard(rows, previousRows), [rows, previousRows]);
  const sections = useMemo(() => microSections(board), [board]);
  const selected = Math.max(0, board.squares.findIndex((s) => s.key === selectedKey));
  const byKey = useMemo(() => new Map(rows.map((r) => [r.key, r])), [rows]);

  // The finished logged days the averages cover, and what was eaten on them
  const finished = useMemo(() => days.filter((d) => d.logged && d.date < todayIso), [days, todayIso]);
  const entries = useMemo(() => finished.flatMap((d) => dayEntries(d.date, todayIso)), [finished, todayIso]);
  const attention = useMemo(
    () => nutrientAttention({ micro: rows, entries, loggedDays: finished.length }),
    [rows, entries, finished.length]
  );

  if (!overview.enough) return <NotEnoughData />;

  const change = board.change;
  const changeText =
    change === null ? null : change === 0 ? "Không đổi so với kỳ trước" : `${change > 0 ? "Tăng" : "Giảm"} ${Math.abs(change)} so với kỳ trước`;
  const items: AttentionItem[] = attention.map((row) => ({
    id: row.key ?? row.title,
    href: `/micros/${row.key}`,
    title: row.title,
    line: row.line,
    extra: row.foods,
    number: row.number,
  }));

  return (
    <div className="flex flex-col gap-3 lg:grid lg:grid-cols-12 lg:items-start lg:gap-5">
      <div className="flex flex-col gap-3 lg:col-span-5 lg:gap-5">
        <HeroCard id="mi-hero" label="Vi chất đạt mục tiêu">
          <HeroNumber
            id="mi-hero-number"
            value={String(board.achieved)}
            unit={`/${board.total}`}
            side={
              <p className="m-0">
                {changeText ?? "Chưa có kỳ trước"}
                <br />
                {board.unknown > 0 ? `${board.unknown} chất chưa có dữ liệu` : "Đủ dữ liệu cả 22 chất"}
              </p>
            }
          />
          <div data-tour="trends-summary" role="img" aria-label={`${board.achieved} trên ${board.total} vi chất đạt mục tiêu`}>
            <HeroBar pct={board.total > 0 ? (board.achieved / board.total) * 100 : 0} />
          </div>
          <NutrientGrid id="mi-grid" squares={board.squares} selected={selected} onSelect={(i) => setSelectedKey(board.squares[i]?.key ?? null)} detailLink />
          <p className="m-0 flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold text-muted-subtitle">
            <span>Thiếu {board.counts.thieu}</span>
            <span>Trung bình {board.counts.trungbinh}</span>
            <span>Gần đủ {board.counts.ganDu}</span>
            <span>Đạt {board.counts.dat}</span>
          </p>
        </HeroCard>

        <AttentionList items={items} title="Cần chú ý: thấp nhất kỳ này" />
      </div>

      <section id="mi-sections" aria-label="Vi chất theo mức" className="flex flex-col gap-3 lg:col-span-7">
        {sections.map((section) => (
          <details
            key={section.level}
            open={section.level !== "dat"}
            data-align-group="overview-micro"
            className="group overflow-hidden rounded-[18px] lg:shadow-card border border-card-border bg-card text-text"
          >
            <summary className="flex min-h-[56px] cursor-pointer list-none items-center justify-between gap-3 p-4 [&::-webkit-details-marker]:hidden">
              <span className="flex items-center gap-3">
                <span aria-hidden="true" className={`inline-block h-[9px] w-[9px] shrink-0 rounded-[3px] ${DOT[section.level]}`} />
                <SectionTitle as="p">{section.label}</SectionTitle>
              </span>
              <span className="flex items-center gap-3">
                <span className="font-display text-xl font-bold tabular-nums">{section.items.length}</span>
                <Chevron />
              </span>
            </summary>
            {section.items.length === 0 ? (
              <p className="m-0 border-t border-divider px-4 py-4 text-[13px] text-secondary">Không có vi chất nào ở mức này.</p>
            ) : (
              <ul className="m-0 list-none p-0">
                {section.items.map((item) => {
                  const row = byKey.get(item.key);
                  const range =
                    item.targetMin === null
                      ? null
                      : row?.targetMax
                        ? formatRange(item.targetMin, row.targetMax)
                        : formatAmount(item.targetMin, item.unit);
                  return (
                    <li key={item.key} className="border-t border-divider">
                      <Link
                        href={`/micros/${item.key}`}
                        className="grid min-h-[56px] grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 text-text no-underline active:bg-surface motion-reduce:active:bg-transparent"
                      >
                        <span className="min-w-0">
                          <span className="block text-[15px] font-semibold">{item.name}</span>
                          <span className="block text-[13px] leading-snug text-secondary">
                            {item.average === null ? "Chưa có dữ liệu" : `TB ${formatAmount(item.average, item.unit)} ${item.unit}`}
                            {range ? ` · mục tiêu ${range} ${item.unit}` : ""}
                            {row && row.of > 0 ? ` · ${row.met}/${row.of} ngày đạt` : ""}
                          </span>
                        </span>
                        <span className="font-display text-[26px] font-bold leading-none tabular-nums">
                          {item.percentage === null ? "—" : `${formatNumber(item.percentage)}%`}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </details>
        ))}
        {board.unknown > 0 && (
          <details data-align-group="overview-micro" className="group overflow-hidden rounded-[18px] lg:shadow-card border border-card-border bg-card text-text">
            <summary className="flex min-h-[56px] cursor-pointer list-none items-center justify-between gap-3 p-4 [&::-webkit-details-marker]:hidden">
              <span className="flex items-center gap-3">
                <span aria-hidden="true" className="inline-block h-[9px] w-[9px] shrink-0 rounded-[3px] bg-level-empty" />
                <SectionTitle as="p">Chưa có dữ liệu</SectionTitle>
              </span>
              <span className="flex items-center gap-3">
                <span className="font-display text-xl font-bold tabular-nums">{board.unknown}</span>
                <Chevron />
              </span>
            </summary>
            <ul className="m-0 list-none p-0">
              {board.squares
                .filter((s) => s.level === null)
                .map((s) => (
                  <li key={s.key} className="border-t border-divider">
                    <Link
                      href={`/micros/${s.key}`}
                      className="grid min-h-[56px] grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 text-text no-underline active:bg-surface motion-reduce:active:bg-transparent"
                    >
                      <span className="min-w-0">
                        <span className="block text-[15px] font-semibold">{s.name}</span>
                        <span className="block text-[13px] leading-snug text-secondary">Chưa có món nào có dữ liệu chất này trong kỳ</span>
                      </span>
                      <span className="font-display text-[26px] font-bold leading-none text-secondary">—</span>
                    </Link>
                  </li>
                ))}
            </ul>
          </details>
        )}
      </section>
    </div>
  );
}
