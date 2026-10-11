"use client";

import React, { useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AppHeader } from "@/components/ui/app-header";
import { ChipGroup } from "@/components/ui/chip-group";
import { KcalChart } from "@/components/trends/kcal-chart";
import { NutrientTrendList } from "@/components/trends/nutrient-trend-list";
import { ProteinTrendCard } from "@/components/trends/protein-trend-card";
import { TrendsEmptyState } from "@/components/trends/trends-empty-state";
import { useDiary } from "@/lib/diary-store";
import { MOCK_TRENDS_7_DAYS, MOCK_TRENDS_30_DAYS, type DailyTrendEntry } from "@/lib/mock/trends";
import {
  anchorTrendDays,
  calculateNutrientTrend,
  trendTargetsFrom,
  trendWindowLabel,
  type NutrientTrendResult,
} from "@/lib/trends";

// Shown until the runtime date is known, so the window never renders on the server's date
function TrendsLoading() {
  return (
    <div aria-busy="true" aria-live="polite" className="w-full min-h-screen bg-page">
      <h1 className="sr-only">Xu hướng — Đang tải</h1>
      <div className="w-full max-w-[560px] mx-auto px-4 pt-6 flex flex-col gap-3">
        <div className="h-[220px] rounded-[18px] bg-level-empty motion-safe:animate-pulse" />
        <div className="h-[220px] rounded-[18px] bg-level-empty motion-safe:animate-pulse" />
      </div>
    </div>
  );
}

function TrendsContent() {
  const searchParams = useSearchParams();
  const isEmptyParam = searchParams.get("empty") === "1";
  const [range, setRange] = useState<"7d" | "30d">("7d");
  const { todayIso, targets } = useDiary();
  const trendTargets = useMemo(() => trendTargetsFrom(targets), [targets]);

  // The window ends on today. todayIso is set after mount, so this runs on the client only.
  const rawEntries: DailyTrendEntry[] = useMemo(() => {
    if (!todayIso || isEmptyParam) return [];
    return anchorTrendDays(range === "7d" ? MOCK_TRENDS_7_DAYS : MOCK_TRENDS_30_DAYS, todayIso);
  }, [isEmptyParam, range, todayIso]);

  const isEmpty = rawEntries.length < 3;

  // Subtitle for header
  const subtitle = useMemo(() => {
    if (isEmpty) return "Chưa đủ dữ liệu";
    return `${range === "7d" ? 7 : 30} ngày gần nhất · ${trendWindowLabel(rawEntries)}`;
  }, [isEmpty, range, rawEntries]);

  // Compute nutrient trends
  const { microTrends, proteinTrend } = useMemo(() => {
    if (rawEntries.length === 0) {
      return { microTrends: [], proteinTrend: null };
    }

    // Use completed entries (or all if all are marked) for averages
    const calcEntries = rawEntries.filter((e) => !e.isToday);
    const entriesToUse = calcEntries.length > 0 ? calcEntries : rawEntries;

    // Protein
    const proteinVals = entriesToUse.map((e) => e.protein);
    const pTrend = calculateNutrientTrend(proteinVals, trendTargets.protein);

    // Micros
    const microsDefs = [
      trendTargets.vitamin_d,
      trendTargets.calcium,
      trendTargets.magnesium,
      trendTargets.potassium,
      trendTargets.iron,
    ];

    const mTrends: NutrientTrendResult[] = microsDefs.map((def) => {
      const vals = entriesToUse.map((e) => {
        if (def.key === "calcium") return e.calcium;
        if (def.key === "iron") return e.iron;
        if (def.key === "potassium") return e.potassium;
        if (def.key === "magnesium") return e.magnesium;
        if (def.key === "vitamin_d") return e.vitamin_d;
        return 0;
      });
      return calculateNutrientTrend(vals, def);
    });

    // Sort by averagePercentage ascending (lowest first = most deficient)
    mTrends.sort((a, b) => a.averagePercentage - b.averagePercentage);

    return { microTrends: mTrends, proteinTrend: pTrend };
  }, [rawEntries, trendTargets]);

  if (!todayIso) return <TrendsLoading />;

  return (
    <div className="w-full min-h-screen bg-page text-text flex flex-col justify-between">
      <div className="flex flex-col">
        <AppHeader
          variant="sub"
          title="XU HƯỚNG"
          subtitle={subtitle}
          backHref="/micros"
          backLabel="Quay lại"
          alignGroup="trends-header"
        />

        <main className="w-full max-w-[560px] mx-auto px-4 pt-3.5 pb-8 flex flex-col gap-3">
          {isEmpty ? (
            <TrendsEmptyState />
          ) : (
            <>
              {/* Range toggle */}
              <div
                role="group"
                aria-label="Khoảng thời gian"
                className="w-full"
              >
                <ChipGroup
                  items={[
                    {
                      id: "7d",
                      label: "7 ngày",
                      active: range === "7d",
                      onClick: () => setRange("7d"),
                      ariaLabel: "Xem xu hướng 7 ngày",
                    },
                    {
                      id: "30d",
                      label: "30 ngày",
                      active: range === "30d",
                      onClick: () => setRange("30d"),
                      ariaLabel: "Xem xu hướng 30 ngày",
                    },
                  ]}
                  columns={2}
                />
              </div>

              {/* Kcal Chart */}
              <KcalChart
                entries={rawEntries}
                targetMin={trendTargets.calories.min}
                targetMax={trendTargets.calories.max}
              />

              {/* Micros list */}
              <NutrientTrendList
                title={`Vi chất thường thiếu (${range === "7d" ? "7 ngày" : "30 ngày"})`}
                nutrients={microTrends}
                rangeDays={range === "7d" ? 7 : 30}
              />

              {/* Protein Trend */}
              {proteinTrend && <ProteinTrendCard proteinTrend={proteinTrend} />}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default function TrendsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-page" />}>
      <TrendsContent />
    </Suspense>
  );
}
