"use client";

import React, { useMemo } from "react";
import { NotEnoughData } from "@/components/overview/overview-parts";
import { PeriodControl, useOverview } from "@/components/overview/overview-frame";
import { AttentionList, type AttentionItem } from "@/components/overview/attention-list";
import { MicroCard } from "@/components/overview/micro-card";
import { Scoreboard } from "@/components/overview/scoreboard";
import { useDiary } from "@/lib/diary-store";
import { microRows } from "@/lib/overview";
import { attentionRows, microBoard, periodHeading } from "@/lib/overview-board";
import { macroScoreRow, weightScoreRow } from "@/lib/overview-detail";
import { targetMinFor } from "@/lib/period";
import { countedForLevel } from "@/lib/level-nutrients";
import { useCoaching } from "@/hooks/use-coaching";

/**
 * Tóm tắt (/trends, cc2-31b), direction B: the period row, the scoreboard (Kcal, Đạm, Cân nặng; tap a row for
 * its seven days), the Vi chất card and "Cần chú ý". Today has its own screen (/), so there is no today hero here.
 * Phone: one column in that order. Desktop: scoreboard left, Vi chất + Cần chú ý right.
 */
export function SummaryTab() {
  const { overview, todayIso, targets, hrefWithPeriod } = useOverview();
  const { profile, demo } = useDiary();
  const { averages, previousAverages, targetDays, period } = overview;
  const length = period.length;

  const micro = useMemo(() => microRows(averages, targetDays, targets), [averages, targetDays, targets]);
  const microPrevious = useMemo(() => microRows(previousAverages, targetDays, targets), [previousAverages, targetDays, targets]);
  // The count is over the Level's nutrients, as Hôm nay's "x/N đạt"; the card's grid keeps all 22
  const { level } = useCoaching();
  const board = useMemo(() => microBoard(micro, microPrevious, countedForLevel(level)), [micro, microPrevious, level]);
  // Cần chú ý names the Level's nutrients, as the card above and Hôm nay
  const attention = useMemo(
    () => attentionRows({ days: overview.days, proteinMin: targetMinFor("protein", targets), todayIso, micro: micro.filter((r) => countedForLevel(level).includes(r.key)), length }),
    [overview.days, targets, todayIso, micro, length, level]
  );

  const periodRow = <PeriodControl compact heading={periodHeading(period)} period={period} length={length} />;

  if (!overview.enough) {
    return (
      <div className="flex flex-col gap-3 lg:max-w-[720px] lg:gap-5">
        {periodRow}
        <NotEnoughData />
      </div>
    );
  }

  const rows = [
    macroScoreRow({ key: "calories", overview, targets, todayIso }),
    macroScoreRow({ key: "protein", overview, targets, todayIso }),
    weightScoreRow({ overview, profileKg: profile.weightKg, demo, todayIso }),
  ];

  const items: AttentionItem[] = attention.map((row) => ({
    id: `${row.kind}-${row.key ?? "protein"}`,
    href: row.kind === "protein" ? hrefWithPeriod("/trends/energy") : `/micros/${row.key}`,
    title: row.title,
    line: row.line,
    number: row.number,
    gap: row.gap,
    dotKey: row.kind === "nutrient" ? row.key : undefined,
    percentage: row.kind === "nutrient" ? (micro.find((r) => r.key === row.key)?.percentage ?? null) : null,
  }));

  return (
    <div className="flex flex-col gap-3 lg:grid lg:grid-cols-12 lg:items-start lg:gap-5">
      <div className="flex flex-col gap-3 lg:col-span-7 lg:gap-5">
        {periodRow}
        <Scoreboard key={`${length}-${period.offset}`} rows={rows} />
      </div>
      <div className="flex flex-col gap-3 lg:col-span-5 lg:gap-5">
        <MicroCard key={`${length}-${period.offset}`} board={board} allHref={hrefWithPeriod("/trends/micros")} />
        <AttentionList items={items} large />
      </div>
    </div>
  );
}
