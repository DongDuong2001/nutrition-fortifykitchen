"use client";

import { Expand } from "@/components/ui/expand";
import React, { useId, useMemo, useState } from "react";
import Link from "next/link";
import { NotEnoughData } from "@/components/overview/overview-parts";
import { useOverview } from "@/components/overview/overview-frame";
import { AttentionList, type AttentionItem } from "@/components/overview/attention-list";
import { HeroCard, HeroNumber, HeroBar, HeroNote } from "@/components/overview/parts/hero-card";
import { NutrientBars } from "@/components/overview/parts/nutrient-bars";
import { dayEntries } from "@/lib/day-history";
import { formatAmount, formatNumber, formatRange } from "@/lib/format";
import type { NutrientLevel } from "@/lib/levels";
import { nutrientDot } from "@/lib/nutrient-colors";
import { microRows } from "@/lib/overview";
import { microBoard } from "@/lib/overview-board";
import { microSections, nutrientAttention } from "@/lib/overview-detail";
import { Card } from "@/components/ui/card";
import { SectionTitle } from "@/components/ui/section-title";
import { countedForLevel } from "@/lib/level-nutrients";
import { useCoaching } from "@/hooks/use-coaching";

/** A level as text on a white card: the deep shade (V3-SPEC §1) */
const LEVEL_TEXT: Record<NutrientLevel, string> = {
  thieu: "text-deep-red",
  trungbinh: "text-deep-yellow",
  ganDu: "text-deep-mint",
  dat: "text-deep-green",
};

const DOT: Record<NutrientLevel, string> = {
  thieu: "bg-level-thieu",
  trungbinh: "bg-level-trungbinh",
  ganDu: "bg-level-gandu",
  dat: "bg-level-dat",
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
      className="m-chevron shrink-0 text-secondary"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function RowChevron() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0 text-secondary">
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

/** A collapsible list (cc-57): a button with aria-expanded and the shared Expand motion, so it opens and closes smoothly. */
function Accordion({
  defaultOpen,
  dot,
  title,
  count,
  children,
}: {
  defaultOpen: boolean;
  dot: string;
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return (
    <Card padding={false} data-align-group="overview-micro" className="overflow-hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-14 w-full cursor-pointer items-center justify-between gap-3 border-0 bg-transparent p-4 text-left text-inherit"
      >
        <span className="flex items-center gap-3">
          <span aria-hidden="true" className={`inline-block h-[9px] w-[9px] shrink-0 rounded-[3px] ${dot}`} />
          <span className="text-body-lg font-bold">{title}</span>
        </span>
        <span className="flex items-center gap-3">
          <span className="font-display text-xl font-extrabold leading-none tabular-nums">{count}</span>
          <Chevron />
        </span>
      </button>
      <Expand open={open} id={id}>
        {children}
      </Expand>
    </Card>
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
  
  const rows = useMemo(() => microRows(averages, targetDays, targets), [averages, targetDays, targets]);
  const previousRows = useMemo(() => microRows(previousAverages, targetDays, targets), [previousAverages, targetDays, targets]);
  // "x/N" is over the Level's nutrients, as on Hôm nay; the bars and the lists below keep all 22 (Đủ 22 vi chất)
  const { level } = useCoaching();
  const board = useMemo(() => microBoard(rows, previousRows, countedForLevel(level)), [rows, previousRows, level]);
  const sections = useMemo(() => microSections(board), [board]);
  const byKey = useMemo(() => new Map(rows.map((r) => [r.key, r])), [rows]);

  // The finished logged days the averages cover, and what was eaten on them
  const finished = useMemo(() => days.filter((d) => d.logged && d.date < todayIso), [days, todayIso]);
  const entries = useMemo(() => finished.flatMap((d) => dayEntries(d.date, todayIso)), [finished, todayIso]);
  // The lowest of the Level's nutrients, as Hôm nay's "Thiếu nhiều nhất"
  const attention = useMemo(
    () => nutrientAttention({ micro: rows.filter((r) => countedForLevel(level).includes(r.key)), entries, loggedDays: finished.length }),
    [rows, entries, finished.length, level]
  );

  if (!overview.enough) return <NotEnoughData />;

  const achievedPct = board.total > 0 ? (board.achieved / board.total) * 100 : 0;
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
    dotKey: row.key,
    percentage: byKey.get(row.key ?? "")?.percentage ?? null,
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
          <div
            data-tour="trends-summary"
            role="meter"
            aria-label={`${board.achieved} trên ${board.total} vi chất đạt mục tiêu`}
            aria-valuemin={0}
            aria-valuemax={board.total}
            aria-valuenow={board.achieved}
            aria-valuetext={`${board.achieved} trên ${board.total} vi chất đạt mục tiêu`}
          >
            <HeroBar pct={achievedPct} level scale={{ from: "0", to: `${board.total} vi chất` }} />
          </div>
          <HeroNote>
            {board.achieved} trên {board.total} vi chất đạt mục tiêu; {board.levelCounts.thieu} đang thiếu.
          </HeroNote>
          {/* The Level's nutrients, as the count above and Hôm nay's column; all 22 are in the lists of Đủ 22 vi chất */}
          <NutrientBars id="mi-grid" squares={board.levelSquares} counts={board.levelCounts} />
        </HeroCard>

        <AttentionList items={items} title="Cần chú ý: thấp nhất kỳ này" />
      </div>

      <section id="mi-sections" aria-labelledby="mi-sections-title" className="flex flex-col gap-3 lg:col-span-7">
        <SectionTitle id="mi-sections-title" className="px-1">
          Đủ 22 vi chất
        </SectionTitle>
        {sections.map((section) => (
          <Accordion key={section.level} defaultOpen={section.level !== "dat"} dot={DOT[section.level]} title={section.label} count={section.items.length}>
            {section.items.length === 0 ? (
              <p className="m-0 border-t border-divider px-4 py-4 text-cap text-secondary">Không có vi chất nào ở mức này.</p>
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
                        className="grid min-h-14 grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 px-4 py-3 text-text no-underline active:bg-surface motion-reduce:active:bg-transparent"
                      >
                        <span className="min-w-0">
                          <span className="block text-callout font-semibold">
                            <span aria-hidden="true" className="mr-2 inline-block h-2 w-2 rounded-full align-[1px]" style={{ backgroundColor: nutrientDot(item.key) }} />
                            {item.name}
                          </span>
                          <span className="block text-cap leading-snug text-secondary">
                            {item.average === null ? "Chưa có dữ liệu" : `TB ${formatAmount(item.average, item.unit)} ${item.unit}`}
                            {range ? ` · mục tiêu ${range} ${item.unit}` : ""}
                            {row && row.of > 0 ? ` · ${row.met}/${row.of} ngày đạt` : ""}
                          </span>
                        </span>
                        <span className={`font-display text-title font-extrabold leading-none tabular-nums ${LEVEL_TEXT[section.level]}`}>
                          {item.percentage === null ? "—" : `${formatNumber(item.percentage)}%`}
                        </span>
                        <RowChevron />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Accordion>
        ))}
        {board.unknown > 0 && (
          <Accordion defaultOpen={false} dot="bg-level-empty" title="Chưa có dữ liệu" count={board.unknown}>
            <ul className="m-0 list-none p-0">
              {board.squares
                .filter((s) => s.level === null)
                .map((s) => (
                  <li key={s.key} className="border-t border-divider">
                    <Link
                      href={`/micros/${s.key}`}
                      className="grid min-h-14 grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 px-4 py-3 text-text no-underline active:bg-surface motion-reduce:active:bg-transparent"
                    >
                      <span className="min-w-0">
                        <span className="block text-callout font-semibold">
                          <span aria-hidden="true" className="mr-2 inline-block h-2 w-2 rounded-full align-[1px]" style={{ backgroundColor: nutrientDot(s.key) }} />
                          {s.name}
                        </span>
                        <span className="block text-cap leading-snug text-secondary">Chưa có món nào có dữ liệu chất này trong kỳ</span>
                      </span>
                      <span className="font-display text-title font-extrabold leading-none text-secondary">—</span>
                      <RowChevron />
                    </Link>
                  </li>
                ))}
            </ul>
          </Accordion>
        )}
      </section>
    </div>
  );
}
