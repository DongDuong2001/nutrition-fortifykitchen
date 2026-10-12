"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { BottomNav } from "@/components/ui/bottom-nav";
import { DesktopSidebar } from "@/components/ui/desktop-sidebar";
import { AppHeader } from "@/components/ui/app-header";
import {
  calculateSaltTarget,
  getTrainingPhases,
  loadTrainingChecks,
  saveTrainingChecks,
} from "@/lib/training";
import { formatDayLabel, formatDesktopDate, formatNumber } from "@/lib/format";
import { goalName } from "@/lib/onboarding";
import { getTodayIsoVN } from "@/lib/date";
import { viewedIsoDate } from "@/lib/day-history";
import { DurationSelector } from "@/components/training/duration-selector";
import { useDiary } from "@/lib/diary-store";
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
  if (searchParams?.get("error") === "1") {
    throw new Error("Simulated server error");
  }
  const initialDuration =
    searchParams?.get("rest") === "1"
      ? "rest"
      : searchParams?.get("duration") || "60";

  const [selectedDuration, setSelectedDuration] = useState<string>(initialDuration);
  // The profile's default training time (Hồ sơ) applies until the URL names a duration
  const { profile, hydrated } = useDiary();
  const profileDuration = profile.trainingMinutesDefault === 0 ? "rest" : String(profile.trainingMinutesDefault);
  const [clientNow, setClientNow] = useState<Date | null>(null);
  const [isDesktop, setIsDesktop] = useState(false);
  const todayIso = useMemo(() => getTodayIsoVN(), []);
  // ?date= picks a past day, which is read-only: no minutes change, no ticks, and no minutes are shown because
  // the mock does not store them for that day.
  const viewIso = viewedIsoDate(searchParams?.get("date"), todayIso);
  const isPast = viewIso !== todayIso;
  const diaryHref = isPast ? `/diary?date=${viewIso}` : "/diary";

  // Pre-configured checked states matching design specs
  const [checkedState, setCheckedState] = useState<Record<string, boolean>>({
    "pre-cha-la": true,
    "pre-cu-den": true,
    "intra-salt-0-20": true,
    "intra-salt-20-40": false,
    "intra-salt-40-60": false,
    "intra-carb": false,
  });

  // Sync state if url changes; with no duration in the url, the profile's default once it is read
  useEffect(() => {
    if (searchParams?.get("rest") === "1") {
      setSelectedDuration("rest");
    } else if (searchParams?.get("duration")) {
      setSelectedDuration(searchParams.get("duration")!);
    } else if (hydrated) {
      setSelectedDuration(profileDuration);
    }
  }, [searchParams, hydrated, profileDuration]);

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
    if (isPast) return;
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
    if (isPast) return;
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

  // Formatted date labels. Empty until the clock is read after mount, so no date is shown before the real one
  // and the server and first client render agree.
  const mobileSubtitle = useMemo(() => {
    if (!clientNow) return "";
    return `${formatDayLabel(viewIso, clientNow)}${isPast ? " · Chỉ xem" : ""}`;
  }, [viewIso, isPast, clientNow]);

  const desktopSubtitle = useMemo(() => {
    if (!clientNow) return "";
    return `${formatDesktopDate(viewIso)}${isPast ? " · Chỉ xem" : ` · ${goalName(profile.goal)} · ${formatNumber(profile.weightKg)} kg`}`;
  }, [viewIso, isPast, clientNow, profile.goal, profile.weightKg]);

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
          variant="sub"
          title="NGÀY TẬP"
          subtitle={headerSubtitle}
          backHref={diaryHref}
          alignGroup="training-header"
          summary={
            <div className="flex flex-col gap-3 w-full">
              <DurationSelector
                value={isPast ? "" : selectedDuration}
                onChange={handleSelectDuration}
                variant="mobile"
                disabled={isPast}
              />
              {isPast ? (
                <p className="m-0 pt-1 text-[13px] leading-snug text-muted-on-dark">
                  Muối: —<br />
                  Ngày này chưa có thời lượng tập đã ghi. Chỉ xem.
                </p>
              ) : (
                <SaltSummaryCard
                  saltTarget={saltTarget}
                  isRestDay={isRestDay}
                  trainingMinutes={trainingMinutes}
                  variant="mobile-banner"
                />
              )}
            </div>
          }
        />

        <main className="flex-1 w-full max-w-[560px] mx-auto px-4 pt-4 pb-6 flex flex-col gap-3">
          {isPast ? null : isRestDay ? (
            <RestDayCard />
          ) : (
            <PhaseChecklist
              phases={phases}
              checkedState={checkedState}
              onToggle={handleToggle}
              variant="mobile"
            />
          )}

          {!isPast && <TrainingTipBanner isRestDay={isRestDay} />}
        </main>

        <div className="fixed bottom-0 left-0 right-0 z-40 bg-ink">
          <BottomNav />
        </div>
      </div>

      {/* ============================================================== */}
      {/* DESKTOP LAYOUT (≥1024px) — Matches DesktopTraining.dc.html */}
      {/* ============================================================== */}
      <div className="hidden lg:flex min-h-[980px] bg-page text-text font-sans">
        {/* Left Sidebar */}
        <DesktopSidebar />

        {/* Main Content Area */}
        <main
          data-align-container="training-desktop"
          className="flex-1 p-8 pb-12 max-w-[1240px] flex flex-col gap-5 box-border"
        >
          {/* Header */}
          <AppHeader
            variant="tab"
            title="NGÀY TẬP"
            flush
            subtitle={desktopSubtitle}
            backHref={diaryHref}
            alignGroup="training-header"
            actions={
              <DurationSelector
                value={isPast ? "" : selectedDuration}
                onChange={handleSelectDuration}
                variant="desktop"
                disabled={isPast}
              />
            }
          />

          {isPast ? (
            <section aria-labelledby="past-training" className="bg-card border border-card-border rounded-[18px] p-5 flex flex-col gap-2">
              <h2 id="past-training" className="m-0 text-lg font-bold text-text">Muối</h2>
              <p className="m-0 font-display italic font-extrabold text-[40px] leading-none text-text">—</p>
              <p className="m-0 text-sm text-secondary">Ngày này chưa có thời lượng tập đã ghi. Chỉ xem.</p>
            </section>
          ) : (
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
          )}

          {/* Section 2: Phase Checklist / Rest Tips + Tip Banner */}
          {!isPast && (
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
          )}
        </main>
      </div>
    </div>
  );
}
