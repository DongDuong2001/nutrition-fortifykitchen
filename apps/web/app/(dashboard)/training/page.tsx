"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { BottomNav } from "@/components/ui/bottom-nav";
import { DesktopSidebar } from "@/components/ui/desktop-sidebar";
import { AppHeader } from "@/components/ui/app-header";
import { calculateSaltTarget, getTrainingPhases } from "@/lib/training";
import { type DayChecklist, isEditableDay, readDay, toggleTick, writeDay } from "@/lib/training-checklist";
import { formatDayLabel, formatDesktopDate, formatNumber } from "@/lib/format";
import { goalName } from "@/lib/onboarding";
import { getTodayIsoVN } from "@/lib/date";
import { viewedIsoDate } from "@/lib/day-history";
import { dayTotals } from "@/lib/day-totals";
import { targetsFor } from "@/lib/profile";
import { DurationSelector } from "@/components/training/duration-selector";
import { useDiary } from "@/lib/diary-store";
import { isLiveMode } from "@/lib/api-mode";
import { apiClient } from "@/lib/api-client";
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
  const { profile, hydrated, data: diaryData } = useDiary();
  const profileDuration = profile.trainingMinutesDefault === 0 ? "rest" : String(profile.trainingMinutesDefault);
  const [clientNow, setClientNow] = useState<Date | null>(null);
  const [isDesktop, setIsDesktop] = useState(false);
  const todayIso = useMemo(() => getTodayIsoVN(), []);
  // ?date= picks a past day, which is read-only: its saved minutes and ticks show, and nothing can change.
  const viewIso = viewedIsoDate(searchParams?.get("date"), todayIso);
  const isPast = !isEditableDay(viewIso, todayIso);
  // Sodium logged on the viewed day (today's diary, or a past day's entries); nothing logged reads as 0
  const sodiumMg = useMemo(() => dayTotals(viewIso, todayIso, diaryData).nutrients.sodium ?? 0, [viewIso, todayIso, diaryData]);
  const diaryHref = isPast ? `/?date=${viewIso}` : "/";

  // The viewed day's saved record (null when nothing was saved for that date). Read after mount.
  const [saved, setSaved] = useState<DayChecklist | null>(null);
  const [ticked, setTicked] = useState<string[]>([]);

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

  useEffect(() => {
    setClientNow(new Date());
    const day = readDay(viewIso);
    setSaved(day);
    setTicked(day?.ticked ?? []);

    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [viewIso]);

  // A past day shows the duration it was saved with; a day with no record shows none.
  const pastDuration = saved === null ? "" : saved.minutes === 0 ? "rest" : String(saved.minutes);
  const activeDuration = isPast ? pastDuration : selectedDuration;

  const trainingMinutes = useMemo(() => {
    if (activeDuration === "rest") return 0;
    const mins = parseInt(activeDuration, 10);
    return isNaN(mins) ? 60 : mins;
  }, [activeDuration]);

  const isRestDay = activeDuration === "rest";
  // Today always shows its checklist (or the rest card). A past day shows its saved checklist only if it logged minutes.
  const showChecklist = !isRestDay && (!isPast || saved !== null);

  // Saves the day's minutes and ticks together, so a past view can show them later.
  const handleToggle = (itemId: string) => {
    if (isPast) return;
    const next = toggleTick(ticked, itemId);
    setTicked(next);
    writeDay(todayIso, { minutes: trainingMinutes, ticked: next });
  };

  const handleSelectDuration = (id: string, minutes: number) => {
    if (isPast) return;
    setSelectedDuration(id);
    writeDay(todayIso, { minutes, ticked });
    if (isLiveMode() && todayIso) {
      apiClient.setTraining(todayIso, minutes).catch(() => {});
    }
  };

  const saltTarget = useMemo(
    () => calculateSaltTarget(trainingMinutes),
    [trainingMinutes]
  );

  const phases = useMemo(
    () => getTrainingPhases(trainingMinutes, ticked),
    [trainingMinutes, ticked]
  );
  // The rest-day tips quote this user's protein and energy targets (from Hồ sơ), not a sample profile's
  const restTargets = useMemo(() => targetsFor(profile), [profile]);

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

  const pastNote = saved
    ? isRestDay
      ? "Ngày nghỉ. Chỉ xem."
      : "Tick đã lưu của ngày này. Chỉ xem."
    : "Ngày này chưa lưu thời lượng tập · Chỉ xem";

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
          title="Ngày tập"
          subtitle={headerSubtitle}
          backHref={diaryHref}
          alignGroup="training-header"
          summary={
            <div className="flex flex-col gap-3 w-full">
              <DurationSelector value={activeDuration} onChange={handleSelectDuration} variant="mobile" disabled={isPast} />
              {isPast ? (
                <p className="m-0 pt-1 text-[13px] leading-snug text-muted-on-dark">
                  Muối: —<br />
                  {pastNote}
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
          {isRestDay && !isPast && <RestDayCard targets={restTargets} />}

          {showChecklist && (
            <PhaseChecklist
              phases={phases}
              ticked={ticked}
              onToggle={handleToggle}
              readOnly={isPast}
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
            title="Ngày tập"
            flush
            subtitle={desktopSubtitle}
            backHref={diaryHref}
            alignGroup="training-header"
            actions={
              <DurationSelector value={activeDuration} onChange={handleSelectDuration} variant="desktop" disabled={isPast} />
            }
          />

          {isPast ? (
            <section aria-labelledby="past-training" className="bg-card border border-card-border rounded-[18px] p-5 flex flex-col gap-2">
              <h2 id="past-training" className="m-0 text-lg font-bold text-text">Muối</h2>
              <p className="m-0 font-display italic font-extrabold text-[40px] leading-none text-text">—</p>
              <p className="m-0 text-sm text-secondary">{pastNote}</p>
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
              currentSodiumMg={sodiumMg}
            />
          </section>
          )}

          {/* Section 2: Phase Checklist / Rest Tips + Tip Banner */}
          {(!isPast || showChecklist) && (
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
            {isRestDay ? (
              <RestDayCard targets={restTargets} />
            ) : (
              <PhaseChecklist
                phases={phases}
                ticked={ticked}
                onToggle={handleToggle}
                readOnly={isPast}
                variant="desktop"
              />
            )}
            {!isPast && <TrainingTipBanner isRestDay={isRestDay} />}
          </section>
          )}
        </main>
      </div>
    </div>
  );
}
