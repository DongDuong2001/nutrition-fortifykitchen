"use client";

import React, { useMemo } from "react";
import { NotEnoughData } from "@/components/overview/overview-parts";
import { PeriodControl, useOverview } from "@/components/overview/overview-frame";
import { AttentionList } from "@/components/overview/attention-list";
import { HeroCard } from "@/components/overview/hero-card";
import { MicroCard } from "@/components/overview/micro-card";
import { Scoreboard, type ScoreRowData } from "@/components/overview/scoreboard";
import { useDiary } from "@/lib/diary-store";
import { formatNumber, formatRange, formatSigned } from "@/lib/format";
import { nextMeal } from "@/lib/meal-slot";
import { microRows, summaryMeals } from "@/lib/overview";
import {
  attentionRows,
  boardDays,
  changeLine,
  heroState,
  mealBars,
  microBoard,
  periodHeading,
  weightDays,
  type AttentionRow,
} from "@/lib/overview-board";
import { targetMinFor } from "@/lib/period";

/**
 * Tóm tắt (/), direction B: a dark hero (today's kcal still missing, or per meal), the period row, the
 * scoreboard (Kcal, Đạm, Cân nặng; tap a row for its seven days), the Vi chất card and "Cần chú ý".
 * Phone: one column in that order. Desktop: hero + scoreboard left, Vi chất + Cần chú ý right.
 */
export function SummaryTab() {
  const { overview, todayIso, today, targets, hrefWithPeriod } = useOverview();
  const { profile, demo } = useDiary();
  const { averages, previousAverages, targetDays, weight, period } = overview;
  const length = period.length;

  // Read on the client only: the overview exists after mount, so the clock never reaches the server render
  const now = useMemo(() => new Date(), []);
  const meal = useMemo(
    () => nextMeal(summaryMeals(today), now, today.user.trainingMinutes > 0),
    [today, now]
  );
  const hero = heroState(today.calories.consumed, targets.calories.min);
  const bars = useMemo(() => mealBars(today.meals), [today.meals]);

  const micro = useMemo(() => microRows(averages, targetDays, targets), [averages, targetDays, targets]);
  const microPrevious = useMemo(() => microRows(previousAverages, targetDays, targets), [previousAverages, targetDays, targets]);
  const board = useMemo(() => microBoard(micro, microPrevious), [micro, microPrevious]);
  const attention = useMemo(
    () =>
      attentionRows({
        days: overview.days,
        proteinMin: targetMinFor("protein", targets),
        todayIso,
        micro,
        length,
      }),
    [overview.days, targets, todayIso, micro, length]
  );

  const heroCard = <HeroCard hero={hero} meals={bars} nextMeal={meal} />;
  const periodRow = <PeriodControl compact heading={periodHeading(period)} period={period} length={length} />;

  if (!overview.enough) {
    return (
      <div className="flex flex-col gap-3 lg:max-w-[720px] lg:gap-5">
        {heroCard}
        {periodRow}
        <NotEnoughData />
      </div>
    );
  }

  const kcal = targets.calories;
  const protein = targets.protein;
  const kcalDays = boardDays(overview.days, "calories", kcal.min, todayIso);
  const proteinDays = boardDays(overview.days, "protein", protein.min, todayIso);
  const metOf = (days: { met: boolean | null }[]) => days.filter((d) => d.met === true).length;

  const rows: ScoreRowData[] = [
    {
      key: "calories",
      title: "Kcal",
      value: averages.calories === null ? "—" : formatNumber(Math.round(averages.calories)),
      sub: `kcal / ${formatRange(kcal.min, kcal.max)}`,
      change: changeLine(averages.calories, previousAverages.calories, "kcal", length),
      days: kcalDays,
      unit: "kcal",
      target: { min: kcal.min, max: kcal.max },
      caption: `${metOf(kcalDays)}/${kcalDays.length} ngày đạt`,
      decimals: 0,
    },
    {
      key: "protein",
      title: "Đạm",
      value: averages.protein === null ? "—" : formatNumber(Math.round(averages.protein)),
      sub: `g / ${formatRange(protein.min, protein.max)}`,
      change: changeLine(averages.protein, previousAverages.protein, "g", length),
      days: proteinDays,
      unit: "g",
      target: { min: protein.min, max: protein.max },
      caption: `${metOf(proteinDays)}/${proteinDays.length} ngày đạt`,
      decimals: 0,
    },
    {
      key: "weight",
      title: "Cân nặng",
      value: weight.latest === null ? "—" : formatNumber(weight.latest, { decimals: 1 }),
      sub: "kg",
      change: `${demo ? "Dữ liệu mẫu · hồ sơ" : "Hồ sơ"} ${formatNumber(profile.weightKg, { decimals: 1 })} kg`,
      days: weightDays(period.days, overview.weightLog, todayIso),
      unit: "kg",
      target: null,
      caption:
        weight.latest === null
          ? "Chưa có số cân"
          : weight.change === null
            ? "Chưa đủ số cân trong kỳ"
            : `${formatSigned(weight.change, { decimals: 1 })} kg trong ${length} ngày`,
      weightLog: overview.weightLog,
      decimals: 1,
    },
  ];

  const hrefFor = (row: AttentionRow) => (row.kind === "protein" ? hrefWithPeriod("/trends") : `/micros/${row.key}`);

  return (
    <div className="flex flex-col gap-3 lg:grid lg:grid-cols-12 lg:items-start lg:gap-5">
      <div className="flex flex-col gap-3 lg:col-span-7 lg:gap-5">
        {heroCard}
        {periodRow}
        <Scoreboard key={`${length}-${period.offset}`} rows={rows} />
      </div>
      <div className="flex flex-col gap-3 lg:col-span-5 lg:gap-5">
        <MicroCard key={`${length}-${period.offset}`} board={board} />
        <AttentionList rows={attention} hrefFor={hrefFor} />
      </div>
    </div>
  );
}
