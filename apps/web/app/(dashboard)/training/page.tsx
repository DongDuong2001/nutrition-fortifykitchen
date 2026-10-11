"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BottomNav } from "@/components/ui/bottom-nav";
import { AppHeader } from "@/components/ui/app-header";
import {
  calculateSaltTarget,
  getTrainingPhases,
  loadTrainingChecks,
  saveTrainingChecks,
} from "@/lib/training";
import { formatDayLabel, formatDesktopDate } from "@/lib/format";
import { getTodayIsoVN } from "@/lib/date";
import { DurationSelector } from "@/components/training/duration-selector";
import { SaltSummaryCard } from "@/components/training/salt-summary-card";
import { SodiumProgressCard } from "@/components/training/sodium-progress-card";
import { PhaseChecklist } from "@/components/training/phase-checklist";
import { RestDayCard } from "@/components/training/rest-day-card";
import { TrainingTipBanner } from "@/components/training/training-tip-banner";

export default function TrainingPage() {
  return (
    <Suspense fallback={<div className="w-full min-h-screen bg-page" />}>
      <TrainingContent />
    </Suspense>
  );
}

function TrainingContent() {
  const searchParams = useSearchParams();
  const initialDuration =
    searchParams?.get("rest") === "1"
      ? "rest"
      : searchParams?.get("duration") || "60";

  const [selectedDuration, setSelectedDuration] = useState<string>(initialDuration);
  const [clientNow, setClientNow] = useState<Date | null>(null);
  const [isDesktop, setIsDesktop] = useState(false);
  const todayIso = useMemo(() => getTodayIsoVN(), []);

  // Pre-configured checked states matching design specs
  const [checkedState, setCheckedState] = useState<Record<string, boolean>>({
    "pre-cha-la": true,
    "pre-cu-den": true,
    "intra-salt-0-20": true,
    "intra-salt-20-40": false,
    "intra-salt-40-60": false,
    "intra-carb": false,
  });

  // Sync state if url changes
  useEffect(() => {
    if (searchParams?.get("rest") === "1") {
      setSelectedDuration("rest");
    } else if (searchParams?.get("duration")) {
      setSelectedDuration(searchParams.get("duration")!);
    }
  }, [searchParams]);

  // Load saved checklist ticks after mount to avoid hydration mismatch
  useEffect(() => {
    setClientNow(new Date());
    const saved = loadTrainingChecks(todayIso);
    if (Object.keys(saved).length > 0) {
      setCheckedState((prev) => ({ ...prev, ...saved }));
    }

    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [todayIso]);

  const trainingMinutes = useMemo(() => {
    if (selectedDuration === "rest") return 0;
    const mins = parseInt(selectedDuration, 10);
    return isNaN(mins) ? 60 : mins;
  }, [selectedDuration]);

  const isRestDay = selectedDuration === "rest";

  const handleToggle = (itemId: string) => {
    setCheckedState((prev) => {
      const next = {
        ...prev,
        [itemId]: !(prev[itemId] ?? false),
      };
      saveTrainingChecks(todayIso, next);
      return next;
    });
  };

  const handleSelectDuration = (id: string) => {
    setSelectedDuration(id);
  };

  const saltTarget = useMemo(
    () => calculateSaltTarget(trainingMinutes),
    [trainingMinutes]
  );

  const phases = useMemo(
    () => getTrainingPhases(trainingMinutes),
    [trainingMinutes]
  );

  // Formatted date labels
  const mobileSubtitle = useMemo(() => {
    if (!clientNow) return "Hôm nay, 10/10";
    return formatDayLabel(todayIso, clientNow);
  }, [todayIso, clientNow]);

  const desktopSubtitle = useMemo(() => {
    if (!clientNow) return "Thứ Bảy, 10/10/2026 · Giữ cân · 65 kg";
    return `${formatDesktopDate(todayIso)} · Giữ cân · 65 kg`;
  }, [todayIso, clientNow]);

  const headerSubtitle = isDesktop ? desktopSubtitle : mobileSubtitle;

  return (
    <div className="w-full min-h-screen bg-page text-text font-sans flex flex-col">
      {/* ============================================================== */}
      {/* MOBILE LAYOUT (<1024px) — Matches Training.dc.html & TrainingRest.dc.html */}
      {/* ============================================================== */}
      <div
        data-align-container="training-mobile"
        className="w-full min-h-screen bg-page flex flex-col relative lg:hidden pb-[88px] overflow-x-hidden"
      >
        <AppHeader
          variant="tab"
          title="NGÀY TẬP"
          subtitle={headerSubtitle}
          alignGroup="training-header"
          summary={
            <div className="flex flex-col gap-2.5 w-full">
              <DurationSelector
                value={selectedDuration}
                onChange={handleSelectDuration}
                variant="mobile"
              />
              <SaltSummaryCard
                saltTarget={saltTarget}
                isRestDay={isRestDay}
                trainingMinutes={trainingMinutes}
                variant="mobile-banner"
              />
            </div>
          }
        />

        <main className="flex-1 w-full max-w-[560px] mx-auto px-4 pt-3 pb-6 flex flex-col gap-2.5">
          {isRestDay ? (
            <RestDayCard />
          ) : (
            <PhaseChecklist
              phases={phases}
              checkedState={checkedState}
              onToggle={handleToggle}
              variant="mobile"
            />
          )}

          <TrainingTipBanner isRestDay={isRestDay} />
        </main>

        <div className="fixed bottom-0 left-0 right-0 z-40 bg-ink">
          <BottomNav currentTab="training" />
        </div>
      </div>

      {/* ============================================================== */}
      {/* DESKTOP LAYOUT (≥1024px) — Matches DesktopTraining.dc.html */}
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
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />
              </svg>
              Hôm nay
            </Link>
            <Link
              href="/micros"
              className="no-underline flex items-center gap-3 min-h-[44px] px-3 rounded-xl text-[15px] font-semibold text-muted-on-dark hover:bg-card/5 hover:text-white transition-colors"
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M5 20V11M12 20V4M19 20v-6" />
              </svg>
              Vi chất
            </Link>
            <Link
              href="/training"
              aria-current="page"
              className="no-underline flex items-center gap-3 min-h-[44px] px-3 rounded-xl text-[15px] font-semibold text-white bg-card/10 transition-colors"
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M6 7v10M3 9.5v5M18 7v10M21 9.5v5M6 12h12" />
              </svg>
              Ngày tập
            </Link>
            <Link
              href="/profile"
              className="no-underline flex items-center gap-3 min-h-[44px] px-3 rounded-xl text-[15px] font-semibold text-muted-on-dark hover:bg-card/5 hover:text-white transition-colors"
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
              </svg>
              Hồ sơ
            </Link>
          </nav>
        </aside>

        {/* Main Content Area */}
        <main
          data-align-container="training-desktop"
          className="flex-1 p-8 pb-12 max-w-[1240px] flex flex-col gap-5 box-border"
        >
          {/* Header */}
          <AppHeader
            variant="tab"
            title="NGÀY TẬP"
            subtitle={desktopSubtitle}
            alignGroup="training-header"
            actions={
              <DurationSelector
                value={selectedDuration}
                onChange={handleSelectDuration}
                variant="desktop"
              />
            }
          />

          {/* Section 1: Salt & Sodium Overview */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SaltSummaryCard
              saltTarget={saltTarget}
              isRestDay={isRestDay}
              trainingMinutes={trainingMinutes}
              variant="desktop-card"
            />
            <SodiumProgressCard
              saltTarget={saltTarget}
              currentSodiumMg={2900}
            />
          </section>

          {/* Section 2: Phase Checklist / Rest Tips + Tip Banner */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
            {isRestDay ? (
              <RestDayCard />
            ) : (
              <PhaseChecklist
                phases={phases}
                checkedState={checkedState}
                onToggle={handleToggle}
                variant="desktop"
              />
            )}
            <TrainingTipBanner isRestDay={isRestDay} />
          </section>
        </main>
      </div>
    </div>
  );
}
