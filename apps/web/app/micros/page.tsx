"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import { BottomNav } from "@/components/ui/bottom-nav";
import { SegmentedBar } from "@/components/ui/segmented-bar";
import { apiClient } from "@/lib/api-client";
import {
  NUTRIENT_CATALOG,
  calculateNutrientPercentage,
  calculateNutrientLevel,
  type NutrientGroup,
  type NutrientDefinition,
  type TargetSource,
} from "@/lib/nutrients";
import { formatNumber } from "@/lib/format";
import type { MockDayData } from "@/lib/mock/sample-day";

interface GroupConfig {
  key: NutrientGroup;
  title: string;
  defaultOpen: boolean;
}

const GROUPS_CONFIG: GroupConfig[] = [
  { key: "general", title: "Tổng quan", defaultOpen: false },
  { key: "carbs", title: "Tinh bột", defaultOpen: false },
  { key: "lipids", title: "Chất béo", defaultOpen: false },
  { key: "protein", title: "Đạm", defaultOpen: false },
  { key: "vitamins", title: "Vitamin", defaultOpen: true },
  { key: "minerals", title: "Khoáng chất", defaultOpen: true },
];

export interface NutrientRowData {
  definition: NutrientDefinition;
  consumed: number | null;
  targetMin: number | null;
  targetMax?: number;
  percentage: number | null;
  formattedAmount: string;
  targetSource: TargetSource;
  isProvisional: boolean;
}

function buildNutrientRows(data: MockDayData | null): Record<NutrientGroup, NutrientRowData[]> {
  const result: Record<NutrientGroup, NutrientRowData[]> = {
    general: [],
    carbs: [],
    lipids: [],
    protein: [],
    vitamins: [],
    minerals: [],
  };

  if (!data) return result;

  // Build lookup from sample-day data
  const consumedMap: Record<string, { consumed: number | null; targetMin: number | null; targetMax?: number }> = {};

  // 1. General: Energy
  consumedMap["energy"] = {
    consumed: data.calories.consumed,
    targetMin: data.calories.targetMin,
    targetMax: data.calories.targetMax,
  };

  // 2. Macros: protein, carbs, fat, fiber
  data.macros.forEach((m) => {
    if (m.key === "protein") {
      consumedMap["protein"] = { consumed: m.consumed, targetMin: m.targetMin, targetMax: m.targetMax };
    } else if (m.key === "carbs") {
      consumedMap["carbs"] = { consumed: m.consumed, targetMin: m.targetMin, targetMax: m.targetMax };
    } else if (m.key === "fat") {
      consumedMap["fat"] = { consumed: m.consumed, targetMin: m.targetMin, targetMax: m.targetMax };
    } else if (m.key === "fiber") {
      consumedMap["fiber"] = { consumed: m.consumed, targetMin: m.targetMin, targetMax: m.targetMax };
    }
  });

  // 3. Minerals
  data.minerals.forEach((min) => {
    consumedMap[min.key] = {
      consumed: min.consumed,
      targetMin: min.targetMin,
      targetMax: min.targetMax,
    };
  });

  // 4. Vitamins
  data.vitamins.forEach((vit) => {
    // Map keys like 'a', 'c', 'd', 'e', 'k', 'b9' to catalog ids if needed
    let catId = vit.key;
    if (vit.key === "a") catId = "vitamin_a";
    else if (vit.key === "c") catId = "vitamin_c";
    else if (vit.key === "d") catId = "vitamin_d";
    else if (vit.key === "e") catId = "vitamin_e";
    else if (vit.key === "k") catId = "vitamin_k";
    else if (vit.key === "b9") catId = "folate";

    consumedMap[catId] = {
      consumed: vit.consumed,
      targetMin: vit.targetMin,
      targetMax: vit.targetMax,
    };
  });

  // Assemble according to catalog order
  for (const def of NUTRIENT_CATALOG) {
    const stat = consumedMap[def.id];
    const consumed = stat ? stat.consumed : null;
    const targetMin = stat ? stat.targetMin : null;
    const targetMax = stat ? stat.targetMax : undefined;

    let percentage: number | null = null;
    if (def.targetSource !== "none" && targetMin !== null) {
      percentage = calculateNutrientPercentage(consumed, targetMin);
    }

    let formattedAmount = "—";
    if (consumed !== null) {
      formattedAmount = `${formatNumber(consumed)} ${def.unit}`;
    }

    const isProvisional = def.targetSource === "coach-provisional" || def.targetSource === "vn2016";

    result[def.group].push({
      definition: def,
      consumed,
      targetMin,
      targetMax,
      percentage,
      formattedAmount,
      targetSource: def.targetSource,
      isProvisional,
    });
  }

  return result;
}

export default function MicrosPage() {
  return (
    <Suspense fallback={<div className="w-full min-h-screen bg-page" />}>
      <MicrosContent />
    </Suspense>
  );
}

function MicrosContent() {
  const [data, setData] = useState<MockDayData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [openGroups, setOpenGroups] = useState<Record<NutrientGroup, boolean>>({
    general: false,
    carbs: false,
    lipids: false,
    protein: false,
    vitamins: true,
    minerals: true,
  });

  useEffect(() => {
    let isMounted = true;
    apiClient.getTodayData().then((res) => {
      if (isMounted) {
        setData(res);
        setIsLoading(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const toggleGroup = (group: NutrientGroup) => {
    setOpenGroups((prev) => ({
      ...prev,
      [group]: !prev[group],
    }));
  };

  const rowsByGroup = useMemo(() => buildNutrientRows(data), [data]);

  // Compute summary: 8/22 vi chất đạt (counts only vitamins + minerals with a target)
  const achievedMicrosCount = useMemo(() => {
    if (!data) return { achieved: 0, total: 22 };
    const allMicros = [...rowsByGroup.vitamins, ...rowsByGroup.minerals];
    const withTarget = allMicros.filter((m) => m.targetSource !== "none" && m.targetMin !== null);
    const achieved = withTarget.filter((m) => (m.percentage ?? 0) >= 100).length;
    return {
      achieved,
      total: withTarget.length,
    };
  }, [data, rowsByGroup]);

  const isEmpty = !isLoading && data && data.meals.every((m) => m.items.length === 0);

  // 1. SKELETON LOADING STATE
  if (isLoading && !data) {
    return (
      <div className="w-full min-h-screen bg-page text-text font-sans flex flex-col pb-[88px] lg:pb-0">
        <h1 className="sr-only">Vi chất — Đang tải</h1>
        {/* Mobile Header Skeleton */}
        <div className="bg-ink text-white rounded-b-[20px]">
          <div className="w-full max-w-[560px] mx-auto px-4 pt-3 pb-4 flex flex-col gap-2.5">
            <div className="flex items-center justify-between min-h-[44px]">
              <div className="h-6 w-24 bg-surface-dark rounded animate-pulse" />
              <div className="h-4 w-28 bg-surface-dark rounded animate-pulse" />
            </div>
            <div className="h-4 w-40 bg-surface-dark rounded animate-pulse" />
          </div>
        </div>

        {/* Body Skeleton */}
        <div className="flex-1 w-full max-w-[560px] mx-auto px-4 py-4 flex flex-col gap-4">
          <div className="bg-card border border-card-border rounded-[18px] p-4 flex flex-col gap-3 animate-pulse">
            <div className="h-4 w-1/3 bg-level-empty rounded" />
            <div className="h-8 w-full bg-level-empty rounded" />
            <div className="h-8 w-full bg-level-empty rounded" />
            <div className="h-8 w-full bg-level-empty rounded" />
          </div>
        </div>

        {/* Bottom Nav */}
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-ink lg:hidden">
          <BottomNav currentTab="micros" />
        </div>
      </div>
    );
  }

  // 2. EMPTY STATE ("Chưa ghi món nào hôm nay")
  if (isEmpty) {
    return (
      <div className="w-full min-h-screen bg-page text-text font-sans flex flex-col pb-[88px] lg:pb-0">
        <div className="bg-ink text-white rounded-b-[20px]">
          <div className="w-full max-w-[560px] mx-auto px-4 pt-3 pb-4 flex flex-col gap-2.5">
            <div className="flex items-center justify-between min-h-[44px]">
              <h1 className="m-0 font-display italic font-black text-2xl uppercase tracking-tight">
                VI CHẤT
              </h1>
              <div className="text-sm font-semibold text-muted-subtitle">
                {data?.dateLabel || "Hôm nay, 10/10"}
              </div>
            </div>
            <div className="text-[13px] text-muted-subtitle">
              0/22 vi chất đạt
            </div>
          </div>
        </div>

        <main className="flex-1 w-full max-w-[560px] mx-auto px-4 py-6 flex flex-col gap-4">
          <div className="bg-card border border-card-border rounded-[18px] p-6 text-center flex flex-col items-center gap-3">
            <h2 className="m-0 font-display italic font-bold text-xl">CHƯA GHI MÓN NÀO HÔM NAY</h2>
            <p className="m-0 text-sm text-secondary leading-relaxed max-w-[320px]">
              Bắt đầu ghi nhận món ăn để theo dõi 58 chỉ số vi chất và hoàn thành mục tiêu ngày.
            </p>
            <Link
              href="/today"
              className="mt-2 h-11 px-6 rounded-full bg-blue text-white flex items-center justify-center text-sm font-bold no-underline active:scale-[0.97] transition-transform"
            >
              + Ghi món ngay
            </Link>
          </div>
        </main>

        <div className="fixed bottom-0 left-0 right-0 z-40 bg-ink lg:hidden">
          <BottomNav currentTab="micros" />
        </div>
      </div>
    );
  }

  // 3. ACTIVE REPORT SCREEN (Mobile & Desktop)
  return (
    <div className="w-full min-h-screen bg-page text-text font-sans flex flex-col">
      {/* ============================================================== */}
      {/* MOBILE / TABLET LAYOUT (<1024px)                               */}
      {/* ============================================================== */}
      <div className="w-full min-h-screen bg-page flex flex-col relative lg:hidden pb-[88px] overflow-x-hidden">
        {/* Header (Ink) */}
        <header className="bg-ink text-white rounded-b-[20px]">
          <div className="w-full max-w-[560px] mx-auto px-4 pt-2.5 pb-4 flex flex-col gap-1.5">
            <div className="flex items-center justify-between min-h-[44px]">
              <div>
                <h1 className="m-0 font-display italic font-black text-2xl uppercase tracking-tight leading-none">
                  VI CHẤT
                </h1>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className="font-display italic font-bold text-base text-sky tabular-nums">
                    {achievedMicrosCount.achieved}/{achievedMicrosCount.total}
                  </span>
                  <span className="text-xs text-muted-subtitle font-normal">vi chất đạt</span>
                </div>
              </div>

              {/* Date with prev / next arrows */}
              <div className="flex items-center">
                <button
                  type="button"
                  aria-label="Ngày trước"
                  className="w-10 h-10 rounded-lg bg-transparent border-0 text-white flex items-center justify-center cursor-pointer hover:text-sky transition-colors active:scale-[0.97]"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                    <path d="M15 5l-7 7 7 7" />
                  </svg>
                </button>
                <div className="text-xs font-semibold whitespace-nowrap px-0.5">{data?.dateLabel}</div>
                <button
                  type="button"
                  aria-label="Ngày sau"
                  className="w-10 h-10 rounded-lg bg-transparent border-0 text-white flex items-center justify-center cursor-pointer hover:text-sky transition-colors active:scale-[0.97]"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                    <path d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Content Container (max-w-[560px] mx-auto px-4) */}
        <main className="flex-1 w-full max-w-[560px] mx-auto px-4 pt-3 pb-6 flex flex-col gap-3">
          {/* Legend under header */}
          <Legend />

          {/* Six groups in catalogue order */}
          <div className="flex flex-col gap-3">
            {GROUPS_CONFIG.map((group) => (
              <GroupCard
                key={group.key}
                group={group}
                rows={rowsByGroup[group.key]}
                isOpen={openGroups[group.key]}
                onToggle={() => toggleGroup(group.key)}
              />
            ))}
          </div>

          {/* Footnote */}
          <footer className="pt-2 pb-1 text-xs text-secondary leading-relaxed">
            Mục tiêu theo cân nặng, giới tính và ngày tập · tham khảo khuyến nghị cho người Việt Nam (2016).
          </footer>
        </main>

        {/* Fixed Mobile Dock */}
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-ink">
          <BottomNav currentTab="micros" />
        </div>
      </div>

      {/* ============================================================== */}
      {/* DESKTOP LAYOUT (≥1024px) — 2 Columns (Cronometer style)        */}
      {/* ============================================================== */}
      <div className="hidden lg:flex min-h-[980px] bg-page text-text font-sans">
        {/* Left Sidebar */}
        <aside className="w-60 shrink-0 bg-ink text-white p-6 flex flex-col gap-6 box-border">
          <div className="px-2 font-display italic font-black text-2xl">
            H1T <span className="text-sky">MICRO</span>
          </div>
          <nav aria-label="Điều hướng chính" className="flex flex-col gap-1">
            <Link
              href="/today"
              className="no-underline flex items-center gap-3 min-h-[44px] px-3 rounded-xl text-[15px] font-semibold text-muted-on-dark hover:bg-card/5 hover:text-white transition-colors"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />
              </svg>
              Hôm nay
            </Link>
            <Link
              href="/micros"
              aria-current="page"
              className="no-underline flex items-center gap-3 min-h-[44px] px-3 rounded-xl text-[15px] font-semibold text-white bg-card/10 transition-colors"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 20V11M12 20V4M19 20v-6" />
              </svg>
              Vi chất
            </Link>
            <Link
              href="/training"
              className="no-underline flex items-center gap-3 min-h-[44px] px-3 rounded-xl text-[15px] font-semibold text-muted-on-dark hover:bg-card/5 hover:text-white transition-colors"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M6 7v10M3 9.5v5M18 7v10M21 9.5v5M6 12h12" />
              </svg>
              Ngày tập
            </Link>
            <Link
              href="/profile"
              className="no-underline flex items-center gap-3 min-h-[44px] px-3 rounded-xl text-[15px] font-semibold text-muted-on-dark hover:bg-card/5 hover:text-white transition-colors"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
              </svg>
              Hồ sơ
            </Link>
          </nav>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-8 pb-12 max-w-[1240px] flex flex-col gap-5 box-border">
          {/* Header */}
          <header className="flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[260px]">
              <h1 className="m-0 font-display italic font-extrabold text-[34px] leading-tight text-text">
                VI CHẤT
              </h1>
              <div className="text-sm text-secondary">
                {data?.desktopDateLabel || "Thứ Bảy, 10/10/2026 · Giữ cân · 65 kg"}
              </div>
            </div>

            <div className="flex items-baseline gap-2 mr-2">
              <span className="font-display italic font-black text-2xl text-blue tabular-nums">
                {achievedMicrosCount.achieved}/{achievedMicrosCount.total}
              </span>
              <span className="text-sm text-secondary font-semibold">vi chất đạt</span>
            </div>

            <button
              type="button"
              aria-label="Ngày trước"
              className="w-11 h-11 border border-card-border rounded-xl bg-card text-ink cursor-pointer flex items-center justify-center hover:bg-divider transition-colors active:scale-[0.97]"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M15 5l-7 7 7 7" />
              </svg>
            </button>
            <button
              type="button"
              aria-label="Ngày sau"
              className="w-11 h-11 border border-card-border rounded-xl bg-card text-ink cursor-pointer flex items-center justify-center hover:bg-divider transition-colors active:scale-[0.97]"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </header>

          {/* Legend */}
          <Legend />

          {/* 2 Columns Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
            {/* Left Column: Tổng quan, Tinh bột, Chất béo, Đạm */}
            <div className="flex flex-col gap-4">
              {GROUPS_CONFIG.slice(0, 4).map((group) => (
                <GroupCard
                  key={group.key}
                  group={group}
                  rows={rowsByGroup[group.key]}
                  isOpen={openGroups[group.key]}
                  onToggle={() => toggleGroup(group.key)}
                />
              ))}
            </div>

            {/* Right Column: Vitamin, Khoáng chất */}
            <div className="flex flex-col gap-4">
              {GROUPS_CONFIG.slice(4).map((group) => (
                <GroupCard
                  key={group.key}
                  group={group}
                  rows={rowsByGroup[group.key]}
                  isOpen={openGroups[group.key]}
                  onToggle={() => toggleGroup(group.key)}
                />
              ))}
            </div>
          </div>

          <footer className="pt-2 text-xs text-secondary leading-relaxed">
            Mục tiêu theo cân nặng, giới tính và ngày tập · tham khảo khuyến nghị cho người Việt Nam (2016).
          </footer>
        </main>
      </div>
    </div>
  );
}

/**
 * Legend: Thiếu <50% · Trung bình 50–79% · Gần đủ 80–99% · Đạt ≥100%
 */
function Legend() {
  return (
    <div
      aria-label="Chú thích màu sắc vi chất"
      className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-secondary leading-tight py-1"
    >
      <span className="inline-flex items-center gap-1.5">
        <span
          aria-hidden="true"
          className="w-3.5 h-2 rounded-[1px] bg-level-red -skew-x-[14deg] inline-block"
        />
        Thiếu (&lt;50%)
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span
          aria-hidden="true"
          className="w-3.5 h-2 rounded-[1px] bg-level-yellow -skew-x-[14deg] inline-block"
        />
        Trung bình (50–79%)
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span
          aria-hidden="true"
          className="w-3.5 h-2 rounded-[1px] bg-level-green -skew-x-[14deg] inline-block"
        />
        Gần đủ (80–99%)
      </span>
      <span className="inline-flex items-center gap-1.5 font-bold text-blue">
        <span
          aria-hidden="true"
          className="w-3.5 h-2 rounded-[1px] bg-level-blue -skew-x-[14deg] inline-block"
        />
        Đạt (≥100%)
      </span>
    </div>
  );
}

/**
 * Group Card component with sticky header and collapsible list
 */
function GroupCard({
  group,
  rows,
  isOpen,
  onToggle,
}: {
  group: GroupConfig;
  rows: NutrientRowData[];
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <section className="bg-card border border-card-border rounded-[18px] overflow-hidden flex flex-col">
      {/* Sticky group header */}
      <div className="sticky top-0 z-10 bg-card border-b border-card-border">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={isOpen}
          className="w-full min-h-[48px] px-4 py-2.5 flex items-center justify-between text-left cursor-pointer bg-transparent border-0 active:scale-[0.99] transition-transform"
        >
          <div className="flex items-center gap-2">
            <span className="font-bold text-base text-text">{group.title}</span>
            <span className="text-xs text-secondary font-mono">({rows.length})</span>
          </div>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className={`text-secondary transform transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      </div>

      {/* Rows */}
      {isOpen && (
        <div className="px-4 py-1 divide-y divide-divider">
          {rows.map((row) => (
            <NutrientRow key={row.definition.id} row={row} />
          ))}
        </div>
      )}
    </section>
  );
}

/**
 * Individual nutrient row
 */
function NutrientRow({ row }: { row: NutrientRowData }) {
  const { definition, consumed, percentage, formattedAmount, targetSource, isProvisional } = row;
  const hasTarget = targetSource !== "none";
  const indentPx = definition.depth * 16;

  const content = (
    <div
      style={{ paddingLeft: `${indentPx}px` }}
      className="min-h-[44px] py-2 flex flex-col justify-center gap-1.5 w-full"
    >
      <div className="flex items-center justify-between text-sm leading-tight gap-3">
        {/* Name and provisional label */}
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="font-semibold text-text truncate">
            {definition.nameVi}
          </span>
          {isProvisional && (
            <span className="text-xs text-secondary font-normal shrink-0">
              (tham khảo)
            </span>
          )}
        </div>

        {/* Amount */}
        <div className="shrink-0 text-right">
          <span
            className={`tabular-nums text-xs ${consumed === null ? "text-secondary italic" : "text-secondary font-normal"}`}
          >
            {consumed === null ? "chưa có dữ liệu" : formattedAmount}
          </span>
        </div>
      </div>

      {/* Progress visual: Slanted Bar with right-aligned % for targets, dashed line for tracked-only */}
      {hasTarget ? (
        <div className="flex items-center gap-2.5 w-full">
          <div className="flex-1 min-w-0">
            <SegmentedBar
              percentage={percentage ?? 0}
              aria-label={`${definition.nameVi} ${percentage !== null ? `${percentage}%` : "chưa có dữ liệu"}`}
              tone="light"
            />
          </div>
          <span className="font-display italic font-black text-sm tabular-nums text-text w-12 text-right shrink-0">
            {percentage !== null ? `${percentage}%` : "—"}
          </span>
        </div>
      ) : (
        <div className="w-full py-0.5">
          <div className="w-full border-b border-dashed border-card-border" />
        </div>
      )}
    </div>
  );

  if (hasTarget) {
    return (
      <Link
        href={`/micros/${definition.id}`}
        className="no-underline text-inherit block hover:bg-page/50 active:scale-[0.99] transition-all -mx-2 px-2 rounded-lg"
      >
        {content}
      </Link>
    );
  }

  return <div className="-mx-2 px-2">{content}</div>;
}
