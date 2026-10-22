"use client";

import { Expand } from "@/components/ui/expand";
import { scrollBehavior } from "@/lib/scroll-behavior";
import { getLevel, getLevelLabel } from "@/lib/levels";
import React, { useState, useEffect, useMemo, useRef, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/ui/app-shell";
import { Segmented } from "@/components/ui/segmented";
import { SwitchGlide } from "@/components/ui/switch-glide";
import { AppHeader } from "@/components/ui/app-header";
import { LevelBar } from "@/components/ui/level-bar";
import { getNutrientDefinition, type NutrientGroup } from "@/lib/nutrients";
import { nutrientOnDay } from "@/lib/nutrient-detail";
import { nutrientSourcesIn } from "@/lib/nutrient-sources";
import { ageOf, upperLimits } from "@/lib/rda";
import { supplementAmount, upperLimitNote, type UpperLimitNote } from "@/lib/upper-limits";
import { buildNutrientRows, type NutrientRowData } from "@/lib/nutrient-rows";
import { formatAmount, formatDayLabel, formatDesktopDate, formatNumber } from "@/lib/format";
import { goalName } from "@/lib/onboarding";
import { getTodayIsoVN } from "@/lib/date";
import { pastDayData, useDiary } from "@/lib/diary-store";
import { dayEntries, viewedIsoDate } from "@/lib/day-history";
import { markUsed } from "@/lib/onboarding-store";
import { HOME_ROUTE } from "@/lib/nav";
import { Card } from "@/components/ui/card";
import { nutrientDot } from "@/lib/nutrient-colors";

interface GroupConfig {
  key: NutrientGroup;
  title: string;
}

// Exactly in required order: Vitamin, Khoáng chất, Đạm, Chất béo, Tinh bột, Tổng quan
const GROUPS_CONFIG: GroupConfig[] = [
  { key: "vitamins", title: "Vitamin" },
  { key: "minerals", title: "Khoáng chất" },
  { key: "protein", title: "Đạm" },
  { key: "lipids", title: "Chất béo" },
  { key: "carbs", title: "Tinh bột" },
  { key: "general", title: "Tổng quan" },
];

export default function MicrosPage() {
  return (
    <Suspense fallback={<div className="w-full min-h-dvh bg-page" />}>
      <MicrosContent />
    </Suspense>
  );
}

/** The two groups the phone shows as a segmented pair (V3Micros: Khoáng chất first); the other four are accordions under it. */
type PhoneTab = "minerals" | "vitamins";
const PHONE_TABS: PhoneTab[] = ["minerals", "vitamins"];
const PHONE_OTHERS = GROUPS_CONFIG.filter((g) => g.key !== "vitamins" && g.key !== "minerals");

function MicrosContent() {
  const { data: diaryData, hydrated, profile, todayIso, isEditable, loadDays, nutrientSources } = useDiary();
  const searchParams = useSearchParams();
  // ?date= picks a past day (read-only, as everything about a past day). Read after mount so the first render matches the server.
  const viewIso = hydrated && todayIso ? viewedIsoDate(searchParams?.get("date"), todayIso) : null;
  const isPast = viewIso !== null && viewIso !== todayIso;
  // S5: an older day is read from the server (cached on this device) when it is on screen
  useEffect(() => {
    if (isPast && viewIso) loadDays([viewIso]);
  }, [isPast, viewIso, loadDays]);
  const diaryHref = isPast && viewIso ? `${HOME_ROUTE}?date=${viewIso}` : HOME_ROUTE;
  const dateQuery = isPast && viewIso ? `?date=${viewIso}` : "";
  const pastData = useMemo(
    () => (isPast && viewIso && todayIso ? pastDayData(viewIso, todayIso, profile) : null),
    [isPast, viewIso, todayIso, profile]
  );
  // cc-73b: a calm line on each nutrient whose day total is above its Tolerable Upper Intake Level
  const upperNotes = useMemo(() => {
    const day = pastData || (hydrated ? diaryData : null);
    const notes: Record<string, UpperLimitNote> = {};
    if (!day || !todayIso || !viewIso) return notes;
    for (const [id, ul] of Object.entries(upperLimits(ageOf(profile.birthYear)))) {
      const def = getNutrientDefinition(id);
      if (!def) continue;
      const sources = isPast ? nutrientSourcesIn(dayEntries(viewIso, todayIso), {}, id, []) : nutrientSources(id);
      const note = upperLimitNote({ ul, unit: def.unit, total: nutrientOnDay(day, def)?.consumed ?? null, supplement: supplementAmount(sources) });
      if (note) notes[id] = note;
    }
    return notes;
  }, [pastData, hydrated, diaryData, todayIso, viewIso, isPast, profile.birthYear, nutrientSources]);

  // Phone: the segmented pair picks Khoáng chất or Vitamin; Đạm, Chất béo, Tinh bột and Tổng quan are accordions, closed.
  const [phoneTab, setPhoneTab] = useState<PhoneTab>("minerals");
  const [phoneOpen, setPhoneOpen] = useState<Record<NutrientGroup, boolean>>({
    vitamins: false,
    minerals: false,
    protein: false,
    lipids: false,
    carbs: false,
    general: false,
  });
  // Desktop: the chips scroll to a group, every group is open in two columns.
  const [activeGroup, setActiveGroup] = useState<NutrientGroup>("vitamins");
  const [openGroups, setOpenGroups] = useState<Record<NutrientGroup, boolean>>({
    vitamins: true,
    minerals: true,
    protein: true,
    lipids: true,
    carbs: true,
    general: true,
  });

  const chipRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const chipsContainerRef = useRef<HTMLDivElement>(null);
  const isManualScrolling = useRef(false);
  const manualTimeout = useRef<NodeJS.Timeout | null>(null);

  const [clientNow, setClientNow] = useState<Date | null>(null);

  useEffect(() => {
    setClientNow(new Date());
  }, []);

  // Today comes from the diary store, like the nutrient screen; no separate fetch (it could show the sample day)
  const isLoading = !hydrated;
  const currentData = pastData || (hydrated ? diaryData : null);
  const readOnlyNote = isPast && viewIso && !isEditable(viewIso) ? " · Chỉ xem" : "";
  const phoneDateLabel = (clientNow && currentData?.date ? formatDayLabel(currentData.date, clientNow) : "") + readOnlyNote;
  const profileParts = [goalName(profile.goal), `${formatNumber(profile.weightKg)} kg`];
  const lacking = currentData?.microsSummary.mostLacking ?? [];
  const lackingPart = lacking.length > 0 ? [`Thiếu nhiều nhất: ${lacking.join(", ")}`] : [];
  const desktopSubtitle = clientNow
    ? [formatDesktopDate(currentData?.date || getTodayIsoVN()) + readOnlyNote, ...profileParts, ...lackingPart].join(" · ")
    : [currentData?.desktopDateLabel, ...profileParts, ...lackingPart].filter(Boolean).join(" · ");
  // One header for both widths: the phone's date, or the desktop's date with the profile and the lacking list
  const subtitle = (
    <>
      <span className="lg:hidden">{phoneDateLabel}</span>
      <span className="hidden lg:inline">{desktopSubtitle}</span>
    </>
  );

  // Auto-scroll the active desktop chip into view horizontally so it always stays visible
  useEffect(() => {
    const activeChip = chipRefs.current[activeGroup];
    const container = chipsContainerRef.current;
    if (activeChip && container) {
      const chipLeft = activeChip.offsetLeft;
      const chipWidth = activeChip.offsetWidth;
      const containerWidth = container.clientWidth;
      const targetScroll = chipLeft - (containerWidth - chipWidth) / 2;
      container.scrollTo({ left: Math.max(0, targetScroll), behavior: scrollBehavior() });
    }
  }, [activeGroup]);

  // Desktop scroll-spy: the chip of the group at the top of the page lights up
  useEffect(() => {
    if (isLoading || !currentData) return;

    const groupKeys: NutrientGroup[] = ["vitamins", "minerals", "protein", "lipids", "carbs", "general"];
    const elements = groupKeys
      .map((key) => document.getElementById(`desktop-group-${key}`))
      .filter((el): el is HTMLElement => el !== null);

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (isManualScrolling.current) return;

        const visibleEntries = entries.filter((e) => e.isIntersecting);
        if (visibleEntries.length > 0) {
          visibleEntries.sort((a, b) => Math.abs(a.boundingClientRect.top) - Math.abs(b.boundingClientRect.top));
          const key = visibleEntries[0].target.id.replace("desktop-group-", "") as NutrientGroup;
          if (groupKeys.includes(key)) {
            setActiveGroup(key);
          }
        }
      },
      { rootMargin: "-60px 0px -55% 0px", threshold: [0, 0.1, 0.3, 0.6] }
    );

    elements.forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
    };
  }, [isLoading, currentData]);

  const toggleGroup = (group: NutrientGroup) => {
    setOpenGroups((prev) => ({
      ...prev,
      [group]: !prev[group],
    }));
  };
  const togglePhoneGroup = (group: NutrientGroup) => {
    setPhoneOpen((prev) => ({ ...prev, [group]: !prev[group] }));
  };

  const scrollToGroup = (group: NutrientGroup) => {
    markUsed("micros-filter");
    setActiveGroup(group);
    // Ensure the group is opened when jumped to
    setOpenGroups((prev) => ({
      ...prev,
      [group]: true,
    }));
    isManualScrolling.current = true;
    if (manualTimeout.current) clearTimeout(manualTimeout.current);
    manualTimeout.current = setTimeout(() => {
      isManualScrolling.current = false;
    }, 800);

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const behavior: ScrollBehavior = reduceMotion ? "auto" : "smooth";
    document.getElementById(`desktop-group-${group}`)?.scrollIntoView({ behavior, block: "start" });
  };

  const rowsByGroup = useMemo(() => buildNutrientRows(currentData), [currentData]);

  // Summary counts: 8/22 vi chất đạt (strictly vitamins + minerals with a target)
  const achievedMicrosCount = useMemo(() => {
    if (!currentData) return { achieved: 0, total: 22 };
    const allMicros = [...rowsByGroup.vitamins, ...rowsByGroup.minerals];
    const withTarget = allMicros.filter((m) => m.targetSource !== "none" && m.targetMin !== null);
    const achieved = withTarget.filter((m) => (m.percentage ?? 0) >= 100).length;
    return {
      achieved,
      total: withTarget.length,
    };
  }, [currentData, rowsByGroup]);

  // Group chip counts (e.g. Vitamin · 3/12, Khoáng chất · 5/10)
  const chipLabels = useMemo(() => {
    const vWithTarget = rowsByGroup.vitamins.filter((m) => m.targetSource !== "none" && m.targetMin !== null);
    const vAchieved = vWithTarget.filter((m) => (m.percentage ?? 0) >= 100).length;

    const mWithTarget = rowsByGroup.minerals.filter((m) => m.targetSource !== "none" && m.targetMin !== null);
    const mAchieved = mWithTarget.filter((m) => (m.percentage ?? 0) >= 100).length;

    return {
      vitamins: `Vitamin · ${vAchieved}/${vWithTarget.length}`,
      minerals: `Khoáng chất · ${mAchieved}/${mWithTarget.length}`,
      protein: "Đạm",
      lipids: "Chất béo",
      carbs: "Tinh bột",
      general: "Tổng quan",
    };
  }, [rowsByGroup]);

  const isEmpty = !isLoading && currentData && currentData.meals.every((m) => m.items.length === 0);

  // 1. SKELETON LOADING STATE
  if (isLoading && !currentData) {
    return (
      <AppShell>
        <h1 className="sr-only">Vi chất — Đang tải</h1>
        <div className="w-full max-w-[560px] mx-auto px-4 pt-3 pb-4 flex flex-col gap-3 lg:max-w-[1240px] lg:mx-0 lg:px-8 lg:pt-8">
          <div className="flex items-center gap-3 min-h-11">
            <div className="h-11 w-11 shrink-0 rounded-full bg-level-empty motion-safe:animate-pulse" aria-hidden="true" />
            <div className="h-7 w-32 rounded bg-level-empty motion-safe:animate-pulse" aria-hidden="true" />
          </div>
          <div className="h-[88px] rounded-card bg-ink motion-safe:animate-pulse" aria-hidden="true" />
        </div>
        <div className="flex-1 w-full max-w-[560px] mx-auto px-4 py-4 flex flex-col gap-4 lg:max-w-[1240px] lg:mx-0 lg:px-8">
          <div className="h-11 w-full rounded-xl bg-level-empty motion-safe:animate-pulse" aria-hidden="true" />
          <div className="bg-card rounded-card border border-transparent shadow-ring p-4 flex flex-col gap-3 motion-safe:animate-pulse" aria-hidden="true">
            <div className="h-4 w-1/3 bg-level-empty rounded" />
            <div className="h-8 w-full bg-level-empty rounded" />
            <div className="h-8 w-full bg-level-empty rounded" />
          </div>
        </div>
      </AppShell>
    );
  }

  // 2. EMPTY STATE ("Chưa ghi món nào hôm nay")
  if (isEmpty) {
    return (
      <AppShell alignContainer="micros-page">
        <AppHeader
          variant="sub"
          layout="wide"
          title="Vi chất"
          subtitle={subtitle}
          backHref={diaryHref}
          alignGroup="micros-header"
          summary={
            <div className="flex items-end justify-between pt-1">
              <div className="text-cap text-muted-subtitle">
                Thêm món để xem vi chất
              </div>
              <div className="text-right">
                <div className="font-display italic font-black text-3xl leading-none tabular-nums text-on-dark">
                  0<span className="text-muted-subtitle text-xl">/22</span>
                </div>
                <div className="text-xs text-sky font-medium mt-0.5">đã đạt</div>
              </div>
            </div>
          }
          summaryPhoneOnly
        />

        <main className="flex-1 w-full max-w-[560px] mx-auto px-4 py-4 flex flex-col gap-4 lg:max-w-[1240px] lg:mx-0 lg:px-8">
          <div className="bg-card rounded-card border border-transparent shadow-ring lg:shadow-card p-6 text-center flex flex-col items-center gap-3">
            <h2 className="m-0 text-base font-bold">{isPast ? "Chưa có món ngày này" : "Chưa có món hôm nay"}</h2>
            <p className="m-0 text-sm text-secondary leading-relaxed max-w-[320px]">
              Thêm món vào nhật ký để theo dõi 22 vi chất mỗi ngày.
            </p>
            <Link
              href={diaryHref}
              className="mt-2 h-11 px-6 rounded-full bg-cobalt text-on-accent flex items-center justify-center text-sm font-bold no-underline active:scale-[0.97] transition-press"
            >
              {isPast ? "Về Hôm nay" : "+ Thêm món"}
            </Link>
          </div>
        </main>
      </AppShell>
    );
  }

  // 3. ACTIVE REPORT SCREEN (phone and desktop)
  return (
    <AppShell alignContainer="micros-page">
      {/* One header for both widths (one h1). The ink summary is the phone's; the desktop shows the same figures inline. */}
      <AppHeader
        variant="sub"
        layout="wide"
        title="Vi chất"
        subtitle={subtitle}
        backHref={diaryHref}
        alignGroup="micros-header"
        summaryPhoneOnly
        summary={
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
              {/* Only nutrients under their target are listed; when every one is reached the line is left out */}
              <div>
                {lacking.length > 0 && (
                  <>
                    <div className="text-xs text-muted-subtitle font-normal">Thiếu nhiều nhất</div>
                    <div className="text-sm font-semibold text-on-dark mt-0.5">{lacking.join(", ")}</div>
                  </>
                )}
              </div>
              <div className="text-right shrink-0">
                <div className="font-display italic font-black text-headline leading-none tabular-nums tracking-[0.01em]">
                  <span className="text-on-dark">{achievedMicrosCount.achieved}</span>
                  <span className="text-muted-subtitle">/{achievedMicrosCount.total}</span>
                </div>
                <div className="text-xs text-sky font-semibold mt-1">đã đạt mục tiêu</div>
              </div>
            </div>
            <Link
              href="/trends/micros"
              className="min-h-11 flex items-center justify-between text-sm font-semibold text-sky no-underline active:scale-[0.97] transition-press"
            >
              Xu hướng 7 và 30 ngày
              <span aria-hidden="true">›</span>
            </Link>
          </div>
        }
        desktopStat={
          <div className="flex items-baseline gap-2 mr-2">
            <div className="font-display italic font-black text-display leading-none tabular-nums tracking-display">
              <span className="text-cobalt">{achievedMicrosCount.achieved}</span>
              <span className="text-secondary">/{achievedMicrosCount.total}</span>
            </div>
            <span className="text-sm text-secondary font-semibold">vi chất đạt</span>
            <Link href="/trends/micros" className="ml-2 min-h-11 inline-flex items-center text-sm font-semibold text-cobalt no-underline">
              Xu hướng ›
            </Link>
          </div>
        }
      />

      {/* ============================================================== */}
      {/* PHONE / TABLET (<1024px): segmented pair, one list, then the   */}
      {/* other groups as closed accordions (V3Micros)                   */}
      {/* ============================================================== */}
      <main className="w-full max-w-[560px] mx-auto px-4 pb-6 flex flex-col gap-4 min-w-0 lg:hidden">
        <Legend />

        <div data-tour="micros-groups">
          <Segmented
            label="Nhóm vi chất"
            alignGroup="micros-header"
            value={phoneTab}
            onChange={(key) => {
              markUsed("micros-filter");
              setPhoneTab(key);
            }}
            items={PHONE_TABS.map((key) => ({ key, label: chipLabels[key] }))}
          />
        </div>

        <SwitchGlide id={phoneTab} order={PHONE_TABS.indexOf(phoneTab)}>
          <Card as="section" padding={false} aria-label={phoneTab === "minerals" ? "Khoáng chất" : "Vitamin"} data-align-group="micros-header">
            <NutrientList rows={rowsByGroup[phoneTab]} showDot dateQuery={dateQuery} upperNotes={upperNotes} className="px-0 py-1" />
          </Card>
        </SwitchGlide>

        <div className="flex flex-col gap-4">
          {PHONE_OTHERS.map((group) => (
            <GroupCard
              upperNotes={upperNotes}
              dateQuery={dateQuery}
              key={group.key}
              group={group}
              rows={rowsByGroup[group.key]}
              isOpen={phoneOpen[group.key]}
              onToggle={() => togglePhoneGroup(group.key)}
              idPrefix="group-"
            />
          ))}
        </div>

        <p className="m-0 pb-1 text-xs text-secondary leading-relaxed">
          * Mục tiêu theo cân nặng, giới tính và ngày tập · tham khảo khuyến nghị cho người Việt Nam (2016).
        </p>
      </main>

      {/* ============================================================== */}
      {/* DESKTOP (≥1024px): chips, legend and two columns of groups     */}
      {/* ============================================================== */}
      <main className="hidden lg:flex flex-1 w-full max-w-[1240px] px-8 pb-12 flex-col gap-5 box-border">
        {/* Desktop Filter Chips */}
        <div ref={chipsContainerRef} data-tour="micros-groups" className="sticky top-0 z-sticky flex items-center gap-2 overflow-x-auto bg-page pb-1">
          {GROUPS_CONFIG.map((group) => {
            const isActive = activeGroup === group.key;
            return (
              <button
                key={group.key}
                ref={(el) => {
                  chipRefs.current[group.key] = el;
                }}
                type="button"
                onClick={() => scrollToGroup(group.key)}
                aria-pressed={isActive}
                className="min-h-11 flex items-center shrink-0 cursor-pointer bg-transparent border-0 p-0 active:scale-[0.97] transition-press"
              >
                <span
                  className={`h-9 px-4 rounded-full text-xs font-semibold flex items-center justify-center transition-press ${
                    isActive
                      ? "bg-ink text-on-dark shadow-xs"
                      : "bg-surface text-text border border-card-border hover:bg-paper-dark"
                  }`}
                >
                  {chipLabels[group.key]}
                </span>
              </button>
            );
          })}
        </div>

        {/* 4-column Legend */}
        <Legend />

        {/* Balanced Columns-2 Layout: Vitamin, Khoáng chất, Đạm, Chất béo, Tinh bột, Tổng quan */}
        <div className="columns-2 gap-4 [column-fill:_balance]">
          {GROUPS_CONFIG.map((group, idx) => (
            <div key={group.key} className="break-inside-avoid mb-4">
              <GroupCard
                upperNotes={upperNotes}
                dateQuery={dateQuery}
                group={group}
                rows={rowsByGroup[group.key]}
                isOpen={openGroups[group.key]}
                onToggle={() => toggleGroup(group.key)}
                idPrefix="desktop-group-"
                alignGroup={idx === 0 ? "micros-header" : undefined}
              />
            </div>
          ))}
        </div>

        <p className="m-0 pt-2 text-xs text-secondary leading-relaxed">
          * Mục tiêu theo cân nặng, giới tính và ngày tập · tham khảo khuyến nghị cho người Việt Nam (2016).
        </p>
      </main>
    </AppShell>
  );
}

/**
 * Legend: a 4-column equal grid on the phone, start-aligned like the chips above it from 1024 px:
 * Thiếu <50%, Trung bình 50–79%, Gần đủ 80–99%, Đạt ≥100%
 */
function Legend() {
  const tiers = [
    { name: "Thiếu", range: "<50%", colorClass: "bg-level-thieu" },
    { name: "Trung bình", range: "50–79%", colorClass: "bg-level-trungbinh" },
    { name: "Gần đủ", range: "80–99%", colorClass: "bg-level-gandu" },
    { name: "Đạt", range: "≥100%", colorClass: "bg-level-dat" },
  ];

  return (
    <div
      role="group"
      aria-label="Chú thích màu sắc vi chất"
      className="grid grid-cols-4 gap-2 w-full max-w-[560px] mx-auto py-1 px-1 lg:flex lg:gap-6 lg:max-w-none lg:mx-0 lg:px-0"
    >
      {tiers.map((t) => (
        <div key={t.name} className="flex flex-col items-center text-center gap-0.5 min-w-0 lg:items-start lg:text-left">
          <div className="flex items-center justify-center gap-1 min-w-0">
            <span
              aria-hidden="true"
              className={`h-[9px] w-[9px] rounded-[3px] ${t.colorClass} inline-block shrink-0`}
            />
            <span className="text-xs font-semibold text-text whitespace-nowrap">{t.name}</span>
          </div>
          <span className="text-micro text-secondary tabular-nums truncate text-center lg:text-left">
            {t.range}
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * A group as a white card with a collapsible list: the phone's closed accordions (Đạm, Chất béo, Tinh bột, Tổng quan)
 * and every group on desktop. The header is a 48 px row: the title bold, the count in secondary, a chevron.
 */
function GroupCard({
  group,
  rows,
  isOpen,
  onToggle,
  idPrefix = "group-",
  alignGroup,
  dateQuery = "",
  upperNotes = {},
}: {
  group: GroupConfig;
  rows: NutrientRowData[];
  isOpen: boolean;
  onToggle: () => void;
  idPrefix?: string;
  alignGroup?: string;
  dateQuery?: string;
  upperNotes?: Record<string, UpperLimitNote>;
}) {
  return (
    <Card as="section" padding={false}
      id={`${idPrefix}${group.key}`}
      data-align-group={alignGroup}
      data-align-edge={alignGroup && idPrefix.includes("desktop") ? "left" : undefined}
      className="overflow-clip flex flex-col scroll-mt-2 lg:scroll-mt-6 break-inside-avoid"
    >
      <div className={isOpen ? "border-b border-divider" : ""}>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={isOpen}
          className="w-full min-h-12 px-4 py-3 flex items-center justify-between text-left cursor-pointer bg-transparent border-0 m-tint transition-transform"
        >
          <div className="w-full flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span data-align-group="micros-card" data-align-edge="left" className="font-bold text-base text-text">{group.title}</span>
              <span className="text-xs text-secondary font-sans tabular-nums">({rows.length})</span>
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
              className="m-chevron text-secondary"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </div>
        </button>
      </div>

      {/* cc-64 (P4): a group of more than 6 rows snaps open and fades in */}
      <Expand open={isOpen} fadeOnly={rows.length > 6}>
        <NutrientList rows={rows} showDot={group.key === "vitamins" || group.key === "minerals"} dateQuery={dateQuery} upperNotes={upperNotes} className="py-1" />
      </Expand>
    </Card>
  );
}

/** The rows of one group, divided by inset hairlines (the first has none). */
function NutrientList({
  rows,
  showDot,
  dateQuery,
  upperNotes,
  className = "",
}: {
  rows: NutrientRowData[];
  showDot: boolean;
  dateQuery: string;
  upperNotes: Record<string, UpperLimitNote>;
  className?: string;
}) {
  return (
    <div className={className}>
      {rows.map((row) => (
        <NutrientRow key={row.definition.id} row={row} showDot={showDot} dateQuery={dateQuery} upperNote={upperNotes[row.definition.id]} />
      ))}
    </div>
  );
}

/**
 * Individual nutrient row:
 * Line 1: dot · name | amount / target · % (bold)
 * Line 2: the level bar directly under it (only for nutrients with a target)
 * The link spans the card, so a press tints the whole row; the 16 px inset is the row's own padding and the hairline sits inside it.
 */
function NutrientRow({ row, showDot, dateQuery = "", upperNote }: { row: NutrientRowData; showDot: boolean; dateQuery?: string; upperNote?: UpperLimitNote }) {
  const { definition, consumed, targetMin, targetMax, percentage, formattedAmount, targetSource, isProvisional } = row;
  const hasTarget = targetSource !== "none";
  const indentPx = definition.depth * 16;

  // Format amount / target (e.g. "331 / 1.200 mg" or "2.900 / 2.750–4.130 mg")
  let targetDisplay = "";
  if (hasTarget && targetMin !== null) {
    if (targetMax && targetMax !== targetMin) {
      targetDisplay = `${formatAmount(targetMin, definition.unit)}–${formatAmount(targetMax, definition.unit)} ${definition.unit}`;
    } else {
      targetDisplay = `${formatAmount(targetMin, definition.unit)} ${definition.unit}`;
    }
  }

  const content = (
    <div
      style={{ paddingLeft: `${indentPx}px` }}
      className="min-h-11 py-2 flex flex-col justify-center gap-2 w-full border-t border-divider group-first/row:border-t-0"
    >
      {/* Line 1: Name (* tham khảo) | amount / target · % (bold) */}
      <div className="flex items-baseline justify-between text-sm leading-tight gap-2">
        {/* The leading edge of the row (the dot when there is one, else the name) is what lines up with the group title */}
        <div
          {...(definition.depth === 0 ? { "data-align-group": "micros-card", "data-align-edge": "left" } : {})}
          className="flex items-baseline gap-2 min-w-0"
        >
          {showDot && (
            <span aria-hidden="true" className="h-2 w-2 shrink-0 self-center rounded-full" style={{ backgroundColor: nutrientDot(definition.id) }} />
          )}
          <span className="min-w-0 break-words font-semibold text-text">
            {definition.name}
          </span>
          {isProvisional && (
            <sup
              aria-label="giá trị tham khảo"
              className="text-secondary text-micro font-bold select-none leading-none shrink-0"
            >
              *
            </sup>
          )}
        </div>

        {/* Right side: amount [/ target] [· %] */}
        <div className="min-w-0 text-right flex flex-wrap justify-end items-baseline gap-x-2">
          {consumed === null ? (
            <>
              <span className="sr-only">chưa có dữ liệu</span>
              <span aria-hidden="true" className="text-secondary/60 tabular-nums text-xs">
                —
              </span>
            </>
          ) : hasTarget && targetDisplay ? (
            <>
              <span className="tabular-nums text-xs text-secondary">
                {formatAmount(consumed, definition.unit)} / {targetDisplay}
              </span>
              <span className="font-bold text-text tabular-nums text-xs">
                · {percentage !== null ? `${percentage}%` : "—"}
              </span>
            </>
          ) : (
            <span className="tabular-nums text-xs text-secondary font-normal">
              {formattedAmount}
            </span>
          )}
        </div>
      </div>

      {/* Line 2: the level bar directly under it */}
      {hasTarget && (
        <div className="w-full">
          <LevelBar
            pct={percentage}
            label={`${definition.name} ${percentage !== null ? `${percentage}%, ${getLevelLabel(getLevel(percentage))}` : "chưa có dữ liệu"}`}
            heightClass="h-[9px] lg:h-[10px]"
          />
        </div>
      )}

      {/* Line 3 (cc-73b): above the Tolerable Upper Intake Level, a calm extra line; the detail is on the nutrient's page */}
      {upperNote && (
        <p data-testid="upper-limit-line" className="m-0 text-xs font-semibold leading-snug text-secondary">
          {upperNote.line}
        </p>
      )}
    </div>
  );

  return (
    <Link
      href={`/micros/${definition.id}${dateQuery}`}
      className="group/row no-underline text-inherit block px-4 m-tint transition-press"
    >
      {content}
    </Link>
  );
}
