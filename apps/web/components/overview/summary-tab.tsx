"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { ChevronRight, NotEnoughData, OverviewCard, periodNote } from "@/components/overview/overview-parts";
import { useOverview } from "@/components/overview/overview-frame";
import { rememberAddOpener } from "@/components/ui/add-opener";
import { useDiary } from "@/lib/diary-store";
import { shiftIsoDate } from "@/lib/day-history";
import { formatDayLabel, formatNumber, formatRange, formatSigned } from "@/lib/format";
import { getMealSlotNameVi, nextMeal } from "@/lib/meal-slot";
import { summaryMeals } from "@/lib/overview";
import { changeText } from "@/lib/period";
import { COUNTED_NUTRIENT_KEYS } from "@/lib/day-totals";

const COUNTED = new Set(COUNTED_NUTRIENT_KEYS);

/**
 * Tóm tắt (/): the slim "Hôm nay" line, the period in three rows, what changed from the previous period, and
 * at most three facts. Never a food list. Each block links to its sub-tab.
 */
export function SummaryTab() {
  const { overview, todayIso, today, targets, hrefWithPeriod } = useOverview();
  const { profile } = useDiary();
  const { averages, targetDays, weight, changes, insights, period, previous } = overview;

  // Read on the client only: the overview exists after mount, so the clock never reaches the server render
  const now = useMemo(() => new Date(), []);
  const meal = useMemo(
    () => nextMeal(summaryMeals(today), now, today.user.trainingMinutes > 0),
    [today, now]
  );
  const remaining = today.calories.remaining;
  const dayLabel = formatDayLabel(todayIso, now);

  const energyHref = hrefWithPeriod("/trends");
  const microsHref = hrefWithPeriod("/trends/micros");
  const bodyHref = hrefWithPeriod("/trends/body");
  const factHref = (key: string) => (COUNTED.has(key) ? microsHref : energyHref);

  const insightHref = (kind: string) =>
    kind === "protein_gap" ? energyHref : kind === "lowest_nutrient" ? microsHref : "/diary";

  const todayCard = (
    <div
      data-align-group="overview-rows"
      className="bg-card border border-card-border rounded-[18px] p-4 flex items-center justify-between gap-3 text-text"
    >
      <p className="m-0 text-[15px] font-bold leading-snug">
        {remaining > 0 ? `Còn ${formatNumber(remaining)} kcal` : "Đã đủ kcal tối thiểu"}{" "}
        <span className="text-[13px] font-normal text-secondary">· {dayLabel}</span>
      </p>
      {meal ? (
        <Link
          id="overview-next-meal"
          href={`/add?meal=${meal}`}
          onClick={() => rememberAddOpener("overview-next-meal")}
          className="inline-flex min-h-[44px] shrink-0 items-center rounded-full border border-card-border bg-card px-4 text-sm font-bold text-text no-underline whitespace-nowrap active:scale-[0.97] motion-reduce:active:scale-100"
        >
          Thêm vào {getMealSlotNameVi(meal).toLowerCase()}
        </Link>
      ) : (
        <Link
          href="/diary"
          className="inline-flex min-h-[44px] shrink-0 items-center rounded-full border border-card-border bg-card px-4 text-sm font-bold text-text no-underline whitespace-nowrap active:scale-[0.97] motion-reduce:active:scale-100"
        >
          Xem nhật ký
        </Link>
      )}
    </div>
  );

  if (!overview.enough) {
    return (
      <>
        {todayCard}
        <NotEnoughData />
      </>
    );
  }

  const yesterday = shiftIsoDate(todayIso, -1);
  const kcal = targets.calories;
  const protein = targets.protein;

  const periodRows: { key: string; title: string; sub: string; value: string; caption: string; href: string }[] = [
    {
      key: "kcal",
      title: "Kcal",
      sub: `Mục tiêu ${formatRange(kcal.min, kcal.max)} kcal`,
      value: averages.calories === null ? "—" : formatNumber(Math.round(averages.calories)),
      caption: `${targetDays.calories.met}/${targetDays.calories.of} ngày đạt`,
      href: energyHref,
    },
    {
      key: "protein",
      title: "Đạm",
      sub: `Mục tiêu ${formatRange(protein.min, protein.max)} g`,
      value: averages.protein === null ? "—" : `${formatNumber(Math.round(averages.protein))} g`,
      caption: `${targetDays.protein.met}/${targetDays.protein.of} ngày đạt`,
      href: energyHref,
    },
    {
      key: "weight",
      title: "Cân nặng",
      sub: `Dữ liệu mẫu · hồ sơ ${formatNumber(profile.weightKg)} kg`,
      value: weight.latest === null ? "—" : `${formatNumber(weight.latest, { decimals: 1 })} kg`,
      caption: weight.change === null ? "Chưa đủ số cân trong kỳ" : `${formatSigned(weight.change, { decimals: 1 })} kg trong kỳ`,
      href: bodyHref,
    },
  ];

  const shownChanges = changes.slice(0, 3);

  return (
    <>
      {todayCard}

      <div className="flex flex-col gap-3 lg:grid lg:grid-cols-12 lg:items-start lg:gap-5">
        <div className="flex flex-col gap-3 lg:col-span-7 lg:gap-5">
          <OverviewCard id="ov-period" title="Kỳ này">
            <ul className="m-0 flex list-none flex-col p-0">
              {periodRows.map((row, i) => (
                <li key={row.key}>
                  <Link
                    href={row.href}
                    data-align-group="overview-rows"
                    className={`flex min-h-[56px] items-center justify-between gap-3 py-2 text-text no-underline active:scale-[0.99] ${
                      i > 0 ? "border-t border-divider" : ""
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block text-[15px] font-semibold">{row.title}</span>
                      <span className="block text-[13px] text-secondary">{row.sub}</span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-0.5 text-right">
                      <span className="text-[15px] font-bold tabular-nums">{row.value}</span>
                      <span className="text-[13px] font-semibold text-secondary">{row.caption}</span>
                    </span>
                    <ChevronRight />
                  </Link>
                </li>
              ))}
            </ul>
            <p className="m-0 text-[13px] leading-snug text-secondary">
              {periodNote(period, averages.loggedDays, todayIso, yesterday)}
            </p>
          </OverviewCard>
        </div>

        <div className="flex flex-col gap-3 lg:col-span-5 lg:gap-5">
          {shownChanges.length > 0 && (
            <OverviewCard id="ov-prev" title="So với kỳ trước" aside={previous.label}>
              <ul className="m-0 flex list-none flex-col gap-1 p-0">
                {shownChanges.map((change) => (
                  <li key={change.key}>
                    <Link
                      href={factHref(change.key)}
                      className="flex min-h-[44px] items-center border-l-[3px] border-blue pl-3 text-sm leading-snug text-text no-underline"
                    >
                      {changeText(change)}
                    </Link>
                  </li>
                ))}
              </ul>
            </OverviewCard>
          )}

          {insights.length > 0 && (
            <OverviewCard id="ov-insights" title="Nhận xét">
              <ul className="m-0 flex list-none flex-col gap-1 p-0">
                {insights.map((insight) => (
                  <li key={insight.kind}>
                    <Link
                      href={insightHref(insight.kind)}
                      className="flex min-h-[44px] items-center border-l-[3px] border-blue pl-3 text-sm leading-snug text-text no-underline"
                    >
                      {insight.text}
                    </Link>
                  </li>
                ))}
              </ul>
            </OverviewCard>
          )}
        </div>
      </div>
    </>
  );
}

