"use client";

import React, { use, useMemo } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/ui/app-header";
import { AppShell } from "@/components/ui/app-shell";
import { useBack } from "@/hooks/use-back";
import { Card } from "@/components/ui/card";
import { SegmentedBar } from "@/components/ui/segmented-bar";
import { ContributingFoods } from "@/components/nutrient-detail/contributing-foods";
import { NutrientHistory, type HistoryPoint } from "@/components/nutrient-detail/nutrient-history";
import { pastDayData, useDiary } from "@/lib/diary-store";
import { getLevelLabel, type NutrientLevel } from "@/lib/levels";
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

// Level text on the ink header uses the dark-surface level tokens
const LEVEL_TEXT: Record<NutrientLevel, string> = {
  thieu: "text-level-red-dark",
  trungbinh: "text-level-yellow-dark",
  ganDu: "text-level-green-dark",
  dat: "text-level-blue-dark",
};

export default function NutrientDetailPage({ params }: PageProps) {
  const { nutrient } = use(params);
  const def = getNutrientDefinition(nutrient);
  const { data, hydrated, todayIso, profile, targets, nutrientSources } = useDiary();
  const goBack = useBack();

  // Today's row. Null until the diary is read after mount, so the server and first client render agree.
  const row = useMemo(() => (def && hydrated ? nutrientOnDay(data, def) : undefined), [def, hydrated, data]);

  // Seven days, oldest first. Today is the live day; the days before it come from the past-day data.
  const history = useMemo<HistoryPoint[]>(() => {
    if (!def || !hydrated || !todayIso) return [];
    return historyDays(todayIso).map((iso) => {
      const day = iso === todayIso ? data : pastDayData(iso, todayIso, profile, targets);
      const dayRow = nutrientOnDay(day, def);
      return { iso, consumed: dayRow?.consumed ?? null, percentage: dayRow?.percentage ?? null };
    });
  }, [def, hydrated, todayIso, data, profile, targets]);

  const sources = useMemo(
    () => (def && hydrated ? nutrientSources(def.id) : []),
    [def, hydrated, nutrientSources]
  );

  if (!def) {
    return (
      <div className="min-h-screen bg-page flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-secondary">Không tìm thấy vi chất.</p>
          <Link href="/micros" className="text-blue font-bold">
            Quay lại Vi chất
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
        title={def.nameVi}
        subtitle="Vi chất · Hôm nay"
        onBack={goBack}
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
              <SegmentedBar
                percentage={row.percentage}
                tone="dark"
                aria-label={`${def.nameVi} ${row.percentage}%`}
              />
            )}
            {level && levelText && (
              <span className={`text-sm font-bold ${LEVEL_TEXT[level]}`}>{levelText}</span>
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
            Đã có từ món ăn hôm nay
          </h2>
          <ContributingFoods sources={sources} unit={def.unit} />
        </Card>
      </main>
    </AppShell>
  );
}
