"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { BottomNav } from "@/components/ui/bottom-nav";
import { DesktopSidebar } from "@/components/ui/desktop-sidebar";
import { AppHeader } from "@/components/ui/app-header";
import { calculateSaltTarget, getTrainingPhases, type TrainingCheckItem, type TrainingPhase, type TrainingSize } from "@/lib/training";
import {
  type DayChecklist,
  effectiveTicked,
  isEditableDay,
  logTick,
  loggedAmounts,
  readDay,
  untick,
  writeDay,
} from "@/lib/training-checklist";
import { type OwnTrainingItem, type TrainingPhaseId, type TrainingPrefs, addOwnItem, readPrefs, removeOwnItem, writePrefs } from "@/lib/training-prefs";
import { generateUuid } from "@/lib/uuid";
import { useCatalogFoods } from "@/hooks/use-catalog-foods";
import { TrainingSizeChip, TrainingSizeSheet } from "@/components/training/training-size-sheet";
import { TrainingLogSheet, canLogItem } from "@/components/training/training-log-sheet";
import { OwnItemSheet, type OwnItemTarget } from "@/components/training/own-item-sheet";
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
import { markUsed } from "@/lib/onboarding-store";
import { HOME_ROUTE } from "@/lib/nav";

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
  const { profile, hydrated, data: diaryData, getEntry, deleteEntry } = useDiary();
  const { foods, pending: catalogPending } = useCatalogFoods();
  const profileDuration = profile.trainingMinutesDefault === 0 ? "rest" : String(profile.trainingMinutesDefault);
  const [clientNow, setClientNow] = useState<Date | null>(null);
  const [isDesktop, setIsDesktop] = useState(false);
  const todayIso = useMemo(() => getTodayIsoVN(), []);
  // ?date= picks a past day, which is read-only: its saved minutes and ticks show, and nothing can change.
  const viewIso = viewedIsoDate(searchParams?.get("date"), todayIso);
  const isPast = !isEditableDay(viewIso, todayIso);
  // Sodium logged on the viewed day (today's diary, or a past day's entries); nothing logged reads as 0
  const sodiumMg = useMemo(() => dayTotals(viewIso, todayIso, diaryData).nutrients.sodium ?? 0, [viewIso, todayIso, diaryData]);
  const diaryHref = isPast ? `${HOME_ROUTE}?date=${viewIso}` : HOME_ROUTE;

  // The viewed day's saved record (null when nothing was saved for that date). Read after mount.
  const [saved, setSaved] = useState<DayChecklist | null>(null);
  // cc-52: Bự / Bé and the user's own items (per account, on this device), read after mount
  const [prefs, setPrefs] = useState<TrainingPrefs | null>(null);
  const [sizeOpen, setSizeOpen] = useState(false);
  const [logItem, setLogItem] = useState<TrainingCheckItem | null>(null);
  const [ownTarget, setOwnTarget] = useState<OwnItemTarget | null>(null);

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
    setSaved(readDay(viewIso));

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

  // The first open of Ngày tập (today, once the account is known) asks Bự or Bé, once per account
  useEffect(() => {
    if (!hydrated) return;
    const read = readPrefs();
    if (!read.asked && !isPast) {
      const asked = { ...read, asked: true };
      writePrefs(asked);
      setPrefs(asked);
      setSizeOpen(true);
    } else {
      setPrefs(read);
    }
  }, [hydrated, isPast]);
  const size = prefs?.size ?? null;

  const savePrefs = (next: TrainingPrefs) => {
    writePrefs(next);
    setPrefs(next);
  };
  const chooseSize = (next: TrainingSize) => {
    savePrefs({ ...(prefs ?? readPrefs()), size: next });
    setSizeOpen(false);
  };
  // The chip's tip is done once the user has found the chip (the first-open answer does not count)
  const openSizeFromChip = () => {
    markUsed("training-size");
    setSizeOpen(true);
  };

  // Today's ticks follow the diary: a logged item is ticked while its entry exists (lib/training-checklist).
  // A past day shows its saved ticks.
  const record = useMemo<DayChecklist>(() => saved ?? { minutes: trainingMinutes, ticked: [] }, [saved, trainingMinutes]);
  const ticked = useMemo(
    () => (isPast || !hydrated ? record.ticked : effectiveTicked(record, (id) => getEntry(id) !== null)),
    [isPast, hydrated, record, getEntry]
  );

  // Saves the day's minutes, ticks and links together, so a past view can show them later.
  const saveDay = (next: DayChecklist) => {
    writeDay(todayIso, next);
    setSaved(next);
  };

  // An entry deleted on Hôm nay (or put back with Hoàn tác) changes the ticks: keep the saved day in step
  useEffect(() => {
    if (isPast || !hydrated || !saved) return;
    if (ticked.length !== saved.ticked.length || ticked.some((id) => !saved.ticked.includes(id))) {
      const next = { ...saved, ticked };
      writeDay(todayIso, next);
      setSaved(next);
    }
  }, [ticked, saved, isPast, hydrated, todayIso]);

  const handleToggle = (item: TrainingCheckItem) => {
    if (isPast) return;
    const day = { ...record, minutes: trainingMinutes, ticked };
    if (ticked.includes(item.id)) {
      // Untick: the linked entry goes, with the usual Hoàn tác (which ticks the item again)
      const link = day.logged?.[item.id];
      if (link && getEntry(link.entryId)) deleteEntry(link.entryId);
      saveDay(untick(day, item.id));
    } else if (canLogItem(item, foods)) {
      setLogItem(item);
    } else if (!catalogPending) {
      // No catalogue food for it (OPEN_QUESTIONS): a plain tick
      saveDay({ ...day, ticked: [...ticked, item.id] });
    }
  };

  const handleLogged = (itemId: string, entryId: string, qty: string) => {
    saveDay(logTick({ ...record, minutes: trainingMinutes, ticked }, itemId, entryId, qty));
    setLogItem(null);
  };

  const addOwn = (item: Omit<OwnTrainingItem, "id">) => {
    const current = prefs ?? readPrefs();
    savePrefs({ ...current, own: addOwnItem(current.own, item, `own-${generateUuid()}`) });
    setOwnTarget(null);
  };
  const removeOwn = (item: TrainingCheckItem) => {
    const current = prefs ?? readPrefs();
    savePrefs({ ...current, own: removeOwnItem(current.own, item.id) });
  };
  const openOwn = (phase: TrainingPhase) => {
    markUsed("training-add-item");
    setOwnTarget({ phase: phase.id as TrainingPhaseId, name: phase.id === "pre-workout" ? "Trước tập" : "Trong tập" });
  };

  const handleSelectDuration = (id: string, minutes: number) => {
    markUsed("training-minutes");
    if (isPast) return;
    setSelectedDuration(id);
    saveDay({ ...record, minutes, ticked });
    if (isLiveMode() && todayIso) {
      apiClient.setTraining(todayIso, minutes).catch(() => {});
    }
  };

  const saltTarget = useMemo(
    () => calculateSaltTarget(trainingMinutes, size),
    [trainingMinutes, size]
  );

  const phases = useMemo(
    () => getTrainingPhases(trainingMinutes, ticked, { size, logged: loggedAmounts(record, ticked), own: prefs?.own ?? [] }),
    [trainingMinutes, ticked, size, record, prefs]
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
          {!isPast && prefs && (
            <div className="flex items-center gap-2">
              <TrainingSizeChip size={size} onClick={openSizeFromChip} />
            </div>
          )}

          {isRestDay && !isPast && <RestDayCard targets={restTargets} />}

          {showChecklist && (
            <PhaseChecklist
              phases={phases}
              ticked={ticked}
              onToggle={handleToggle}
              onAddItem={openOwn}
              onRemoveItem={removeOwn}
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
              <div className="flex items-center gap-3">
                {!isPast && prefs && <TrainingSizeChip size={size} onClick={openSizeFromChip} className="shrink-0" />}
                <DurationSelector value={activeDuration} onChange={handleSelectDuration} variant="desktop" disabled={isPast} />
              </div>
            }
          />

          {isPast ? (
            <section aria-labelledby="past-training" className="bg-card border border-card-border rounded-[18px] lg:shadow-card p-5 flex flex-col gap-2">
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
                onAddItem={openOwn}
                onRemoveItem={removeOwn}
                readOnly={isPast}
                variant="desktop"
              />
            )}
            {!isPast && <TrainingTipBanner isRestDay={isRestDay} />}
          </section>
          )}
        </main>
      </div>

      <TrainingSizeSheet open={sizeOpen} value={size} onChoose={chooseSize} onClose={() => setSizeOpen(false)} />
      <TrainingLogSheet item={logItem} foods={foods} onClose={() => setLogItem(null)} onLogged={handleLogged} />
      <OwnItemSheet target={ownTarget} onClose={() => setOwnTarget(null)} onAdd={addOwn} />
    </div>
  );
}
