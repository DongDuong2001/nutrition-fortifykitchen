"use client";

import React, { use, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AppHeader } from "@/components/ui/app-header";
import { AppShell } from "@/components/ui/app-shell";
import { useBack } from "@/hooks/use-back";
import { Card } from "@/components/ui/card";
import { LevelBar } from "@/components/ui/level-bar";
import { ContributingFoods } from "@/components/nutrient-detail/contributing-foods";
import { NutrientHistory, type HistoryPoint } from "@/components/nutrient-detail/nutrient-history";
import { pastDayData, useDiary } from "@/lib/diary-store";
import { dayEntries, viewedIsoDate } from "@/lib/day-history";
import { formatDayLabel } from "@/lib/format";
import { nutrientSourcesIn } from "@/lib/nutrient-sources";
import { getLevelLabel } from "@/lib/levels";
import { getNutrientDefinition } from "@/lib/nutrients";
import { targetRangeText } from "@/lib/profile";
import {
  amountLabel,
  historyDays,
  levelFor,
  nutrientOnDay,
} from "@/lib/nutrient-detail";

interface PageProps {
  params: Promise<{ nutrient: string }>;
}

export default function NutrientDetailPage({ params }: PageProps) {
  const { nutrient } = use(params);
  const def = getNutrientDefinition(nutrient);
  const { data, hydrated, todayIso, profile, nutrientSources, isEditable } = useDiary();
  const goBack = useBack();
  const searchParams = useSearchParams();

  // ?date= picks a past day (read-only). Read after mount, so the first render matches the server.
  const viewIso = hydrated && todayIso ? viewedIsoDate(searchParams?.get("date"), todayIso) : null;
  const isPast = viewIso !== null && viewIso !== todayIso;
  const dayData = useMemo(
    () => (isPast && viewIso && todayIso ? pastDayData(viewIso, todayIso, profile) : data),
    [isPast, viewIso, todayIso, profile, data]
  );

  // The day's row. Null until the diary is read after mount, so the server and first client render agree.
  const row = useMemo(() => (def && hydrated ? nutrientOnDay(dayData, def) : undefined), [def, hydrated, dayData]);

  // Seven days ending on the viewed day, oldest first. Today is the live day; earlier days come from the past-day data.
  const history = useMemo<HistoryPoint[]>(() => {
    if (!def || !hydrated || !todayIso || !viewIso) return [];
    return historyDays(viewIso).map((iso) => {
      const day = iso === todayIso ? data : pastDayData(iso, todayIso, profile);
      const dayRow = nutrientOnDay(day, def);
      return { iso, consumed: dayRow?.consumed ?? null, percentage: dayRow?.percentage ?? null };
    });
  }, [def, hydrated, todayIso, viewIso, data, profile]);

  const sources = useMemo(() => {
    if (!def || !hydrated) return [];
    if (isPast && viewIso && todayIso) return nutrientSourcesIn(dayEntries(viewIso, todayIso), {}, def.id, []);
    return nutrientSources(def.id);
  }, [def, hydrated, isPast, viewIso, todayIso, nutrientSources]);

  if (!def) {
    return (
      <div className="min-h-screen bg-page flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-secondary">Không tìm thấy vi chất.</p>
          <Link href="/micros" className="text-blue font-bold">
            Về Vi chất
          </Link>
        </div>
      </div>
    );
  }

  if (!hydrated || !todayIso || !row) {
    return (
      <div className="w-full min-h-screen bg-page text-text font-sans flex flex-col">
        <h1 className="sr-only">Chi tiết vi chất — Đang tải</h1>
        <div className="bg-ink rounded-b-[20px] h-44 motion-safe:animate-pulse" aria-hidden="true" />
        <div className="flex-1 w-full max-w-[560px] mx-auto p-4 flex flex-col gap-3">
          <div className="h-44 rounded-[18px] bg-level-empty motion-safe:animate-pulse" aria-hidden="true" />
          <div className="h-28 rounded-[18px] bg-level-empty motion-safe:animate-pulse" aria-hidden="true" />
        </div>
      </div>
    );
  }

  const hasTarget = def.targetSource !== "none";
  const targetText =
    hasTarget && row.targetMin !== null
      ? targetRangeText({ min: row.targetMin, max: row.targetMax ?? row.targetMin }, def.unit)
      : null;
  const level = levelFor(row.percentage);
  const levelText = level === "dat" ? `✓ ${getLevelLabel(level)}` : level ? getLevelLabel(level) : null;
  const amountText = amountLabel(row.consumed, def.unit);

  return (
    <AppShell>
      <AppHeader
        variant="sub"
        title={def.name}
        subtitle={isPast && viewIso ? `Vi chất · ${formatDayLabel(viewIso, new Date())}${isEditable(viewIso) ? "" : " · Chỉ xem"}` : "Vi chất · Hôm nay"}
        {...(isPast && viewIso ? { backHref: `/micros?date=${viewIso}` } : { onBack: goBack })}
        backLabel="Quay lại"
        summary={
          <div className="flex flex-col gap-3">
            <div data-align-group="nutrient-header" className="flex items-end justify-between gap-3">
              <span className="text-[13px] tabular-nums text-muted-subtitle">
                {targetText ? `${amountText} / ${targetText}` : amountText}
              </span>
              <span className="font-display italic font-black text-[30px] leading-none tabular-nums text-on-dark">
                {row.percentage !== null ? `${row.percentage}%` : "—"}
              </span>
            </div>
            {row.percentage !== null && (
              <LevelBar pct={row.percentage} surface="dark" heightClass="h-[10px]" label={`${def.name} ${row.percentage}%`} />
            )}
            {level && levelText && (
              <span className="text-sm font-bold text-on-dark">{levelText}</span>
            )}
            {targetText && (
              <p data-align-group="nutrient-header" className="m-0 text-[13px] text-muted-subtitle">Mục tiêu: {targetText}/ngày.</p>
            )}
          </div>
        }
      />

      <main className="flex-1 w-full max-w-[560px] mx-auto p-4 flex flex-col gap-3">
        {/* Cards are divs with a region role so the two share the page's container for the edge check */}
        <Card as="div" role="region" data-align-group="nutrient-card" aria-labelledby="nutrient-history-title">
          <h2 id="nutrient-history-title" className="m-0 mb-3 text-base font-bold">
            {targetText ? "7 ngày qua" : `7 ngày qua · ${def.unit}`}
          </h2>
          <NutrientHistory points={history} unit={def.unit} todayIso={todayIso} />
        </Card>

        <Card as="div" role="region" data-align-group="nutrient-card" aria-labelledby="nutrient-sources-title">
          <h2 id="nutrient-sources-title" className="m-0 mb-2 text-base font-bold">
            {isPast ? "Đã có từ món ăn của ngày này" : "Đã có từ món ăn hôm nay"}
          </h2>
          <ContributingFoods sources={sources} unit={def.unit} isToday={!isPast} />
        </Card>
      </main>
    </AppShell>
  );
}
