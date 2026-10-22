"use client";

import React, { use, useEffect, useMemo } from "react";
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
import { formatAmount, formatDayLabel } from "@/lib/format";
import { nutrientSourcesIn } from "@/lib/nutrient-sources";
import { getLevelColor, getLevelLabel } from "@/lib/levels";
import { nutrientHistorySummary } from "@/lib/nutrient-history-summary";
import { nutrientFill } from "@/lib/nutrient-colors";
import { getNutrientDefinition } from "@/lib/nutrients";
import { targetRangeText } from "@/lib/profile";
import { CUSTOM_TARGETS_ENABLED, isCustom } from "@/lib/custom-targets";
import { ageOf, upperLimits } from "@/lib/rda";
import { supplementAmount, upperLimitNote } from "@/lib/upper-limits";
import {
  amountLabel,
  historyDays,
  levelFor,
  nutrientOnDay,
} from "@/lib/nutrient-detail";

/** V3-SPEC §3.2: the nutrient's 4 px accent bar between Back and the title. */
function AccentBar({ color }: { color: string }) {
  return <span aria-hidden="true" className="h-7 w-1 shrink-0 rounded-sm" style={{ backgroundColor: color }} />;
}

interface PageProps {
  params: Promise<{ nutrient: string }>;
}

export default function NutrientDetailPage({ params }: PageProps) {
  const { nutrient } = use(params);
  const def = getNutrientDefinition(nutrient);
  const { data, hydrated, todayIso, profile, nutrientSources, isEditable, loadDays } = useDiary();
  const goBack = useBack();
  const searchParams = useSearchParams();

  // ?date= picks a past day (read-only). Read after mount, so the first render matches the server.
  const viewIso = hydrated && todayIso ? viewedIsoDate(searchParams?.get("date"), todayIso) : null;
  const isPast = viewIso !== null && viewIso !== todayIso;
  // S5: an older day is read from the server (cached on this device) when it is on screen
  useEffect(() => {
    if (isPast && viewIso) loadDays([viewIso]);
  }, [isPast, viewIso, loadDays]);
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

  // cc-73b: above the Tolerable Upper Intake Level a calm extra line says so; no UL, no note
  const upperNote = useMemo(
    () =>
      def && row
        ? upperLimitNote({ ul: upperLimits(ageOf(profile.birthYear))[def.id], unit: def.unit, total: row.consumed, supplement: supplementAmount(sources) })
        : null,
    [def, row, profile.birthYear, sources]
  );

  if (!def) {
    return (
      <div className="min-h-dvh bg-page flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-secondary">Không tìm thấy vi chất.</p>
          <Link href="/micros" className="text-cobalt font-bold">
            Về Vi chất
          </Link>
        </div>
      </div>
    );
  }

  if (!hydrated || !todayIso || !row) {
    return (
      <div className="w-full min-h-dvh bg-page text-text font-sans flex flex-col">
        <h1 className="sr-only">Chi tiết vi chất — Đang tải</h1>
        <div className="w-full max-w-[560px] mx-auto px-4 pt-3 flex flex-col gap-4 lg:pt-8" aria-hidden="true">
          <div className="flex items-center gap-3 min-h-11">
            <div className="h-11 w-11 shrink-0 rounded-full bg-level-empty motion-safe:animate-pulse" />
            <div className="h-7 w-32 rounded bg-level-empty motion-safe:animate-pulse" />
          </div>
          <div className="h-40 rounded-card bg-ink motion-safe:animate-pulse" />
        </div>
        <div className="flex-1 w-full max-w-[560px] mx-auto p-4 flex flex-col gap-3">
          <div className="h-44 rounded-card bg-level-empty motion-safe:animate-pulse" aria-hidden="true" />
          <div className="h-28 rounded-card bg-level-empty motion-safe:animate-pulse" aria-hidden="true" />
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

  const subtitle =
    isPast && viewIso ? `Vi chất · ${formatDayLabel(viewIso, new Date())}${isEditable(viewIso) ? "" : " · Chỉ xem"}` : "Vi chất · Hôm nay";
  // The end of the meter: the target the bar is measured against (a range is measured against its lower end)
  const meterEnd = hasTarget && row.targetMin !== null ? `${formatAmount(row.targetMin, def.unit)} ${def.unit}` : null;
  const summary = nutrientHistorySummary(history, targetText);

  return (
    <AppShell>
      <AppHeader
        variant="sub"
        title={def.name}
        subtitle={subtitle}
        {...(isPast && viewIso ? { backHref: `/micros?date=${viewIso}` } : { onBack: goBack })}
        backLabel="Quay lại"
        lead={<AccentBar color={nutrientFill(def.id)} />}
        summary={
          <div role="region" aria-label={`${def.name} ${isPast ? "ngày này" : "hôm nay"}`} className="flex flex-col gap-3">
            <div data-align-group="nutrient-header" className="flex items-end justify-between gap-3">
              <span className="text-cap tabular-nums text-muted-subtitle">
                {targetText ? `${amountText} / ${targetText}` : amountText}
              </span>
              <span className="font-display italic font-black text-[1.875rem] leading-none tabular-nums text-on-dark">
                {row.percentage !== null ? `${row.percentage}%` : "—"}
              </span>
            </div>
            {row.percentage !== null && (
              <div>
                <LevelBar pct={row.percentage} surface="dark" heightClass="h-[10px]" label={`${def.name} ${row.percentage}%`} />
                {meterEnd && (
                  <div aria-hidden="true" className="mt-1.5 flex justify-between text-xs tabular-nums text-muted-subtitle">
                    <span>0</span>
                    <span>{meterEnd}</span>
                  </div>
                )}
              </div>
            )}
            {level && levelText && (
              <span className="flex items-center gap-2 text-sm font-bold text-on-dark">
                <span aria-hidden="true" className="h-[9px] w-[9px] rounded-[3px]" style={{ backgroundColor: getLevelColor(level, "dark") }} />
                {levelText}
              </span>
            )}
            {targetText && (
              <p data-align-group="nutrient-header" className="m-0 text-cap text-muted-subtitle">
                Mục tiêu: {targetText}/ngày{CUSTOM_TARGETS_ENABLED && isCustom(profile.customTargets, def.id) ? " · tự đặt" : ""}.
              </p>
            )}
            {upperNote && (
              <div data-align-group="nutrient-header" data-testid="upper-limit-note" className="flex flex-col gap-1">
                <span className="text-sm font-bold text-on-dark">{upperNote.line}</span>
                <p className="m-0 text-cap text-muted-subtitle">{upperNote.detail}</p>
              </div>
            )}
          </div>
        }
      />

      <main className="flex-1 w-full max-w-[560px] mx-auto p-4 flex flex-col gap-3">
        {/* Cards are divs with a region role so the two share the page's container for the edge check */}
        <Card as="div" role="region" data-align-group="nutrient-card" aria-labelledby="nutrient-history-title" className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <h2 id="nutrient-history-title" className="m-0 text-base font-bold">
              {targetText ? "7 ngày qua" : `7 ngày qua · ${def.unit}`}
            </h2>
            {summary && <p className="m-0 text-cap leading-snug text-secondary">{summary}</p>}
          </div>
          <NutrientHistory points={history} unit={def.unit} todayIso={todayIso} />
          {targetText && <p className="m-0 text-xs text-secondary">Cột đầy là đủ mục tiêu {targetText}.</p>}
        </Card>

        <Card as="div" role="region" data-align-group="nutrient-card" aria-labelledby="nutrient-sources-title" className="flex flex-col gap-1">
          <h2 id="nutrient-sources-title" className="m-0 text-base font-bold">
            {isPast ? "Đã có từ món ăn của ngày này" : "Đã có từ món ăn hôm nay"}
          </h2>
          <ContributingFoods sources={sources} unit={def.unit} isToday={!isPast} />
        </Card>
      </main>
    </AppShell>
  );
}
