"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/ui/app-shell";
import { AppHeader } from "@/components/ui/app-header";
import { calculateSaltTarget, getTrainingPhases, type TrainingCheckItem, type TrainingPhase, type TrainingSize } from "@/lib/training";
import { TrainingMinutesPicker } from "@/components/training/minutes-picker";
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
import { trainingChanged } from "@/lib/training-minutes";
import { type OwnTrainingItem, type TrainingPhaseId, type TrainingPrefs, addOwnItem, readPrefs, removeOwnItem, writePrefs } from "@/lib/training-prefs";
import { generateUuid } from "@/lib/uuid";
import { useCatalogFoods } from "@/hooks/use-catalog-foods";
import { TrainingSizeChip, TrainingSizeSheet } from "@/components/training/training-size-sheet";
import { TrainingLogSheet, tickAction } from "@/components/training/training-log-sheet";
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
import { MOMENT_AFTER_SHEET_MS, SHEET_EXIT_MS } from "@/lib/goals";
import { useTrainingMoment } from "@/hooks/use-training-moment";

export default function TrainingPage() {
  return (
    <Suspense fallback={<div className="w-full min-h-dvh bg-page" />}>
      <TrainingContent />
    </Suspense>
  );
}

function TrainingContent() {
  const searchParams = useSearchParams();
  if (searchParams?.get("error") === "1") {
    throw new Error("Simulated server error");
  }
  // Today's minutes (lib/training-minutes: chosen here, else the server's, else Hồ sơ) apply until the URL names a duration.
  // diaryData.user.trainingMinutes is that value, read again whenever a day's minutes change.
  const { profile, hydrated, data: diaryData, getEntry, deleteEntry, deleteEntries } = useDiary();
  const { foods, pending: catalogPending } = useCatalogFoods();
  const todayMinutes = diaryData.user.trainingMinutes;
  const todayDuration = todayMinutes === 0 ? "rest" : String(todayMinutes);
  const urlDuration = searchParams?.get("rest") === "1" ? "rest" : searchParams?.get("duration") || null;
  const [selectedDuration, setSelectedDuration] = useState<string>(urlDuration ?? todayDuration);
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
  // An item tapped while the live catalogue is still loading: its row shows it is busy until the sheet can open
  const [waitingId, setWaitingId] = useState<string | null>(null);
  const [ownTarget, setOwnTarget] = useState<OwnItemTarget | null>(null);

  // ?duration / ?rest win when the url names one; else today's minutes once they are read
  useEffect(() => {
    if (urlDuration) setSelectedDuration(urlDuration);
  }, [urlDuration]);
  useEffect(() => {
    if (!urlDuration && hydrated) setSelectedDuration(todayDuration);
  }, [urlDuration, hydrated, todayDuration]);

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
    return isNaN(mins) ? profile.trainingMinutesDefault : mins;
  }, [activeDuration, profile.trainingMinutesDefault]);

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

  // Saves the day's minutes, ticks and links together, so a past view can show them later. Hôm nay reads the minutes again.
  const saveDay = (next: DayChecklist) => {
    writeDay(todayIso, next);
    setSaved(next);
    trainingChanged();
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
    const action = tickAction(item, ticked, foods, catalogPending);
    setWaitingId(action === "wait" ? item.id : null);
    if (action === "untick") {
      // Untick: the linked entries go (both of the Red Bull + mật mía mix) with one Hoàn tác, which ticks the item again
      const ids = (day.logged?.[item.id]?.entryIds ?? []).filter((id) => getEntry(id) !== null);
      if (ids.length === 1) deleteEntry(ids[0]);
      else if (ids.length > 1) deleteEntries(ids, todayIso);
      saveDay(untick(day, item.id));
    } else if (action === "sheet") {
      setLogItem(item);
    } else if (action === "tick") {
      // No catalogue food for it (OPEN_QUESTIONS): a plain tick
      saveDay({ ...day, ticked: [...ticked, item.id] });
      finishDay([...ticked, item.id], 0);
    }
  };

  // The catalogue has arrived: the tapped item goes on, as if tapped now (its sheet, or a plain tick if it has no food)
  useEffect(() => {
    if (!waitingId || catalogPending) return;
    const item = phases.flatMap((p) => p.items).find((i) => i.id === waitingId);
    setWaitingId(null);
    if (item) handleToggle(item);
    // Only when the load ends: handleToggle reads this render's ticks and foods
  }, [waitingId, catalogPending]);

  const handleLogged = (itemId: string, entryIds: string[], qty: string) => {
    saveDay(logTick({ ...record, minutes: trainingMinutes, ticked }, itemId, entryIds, qty));
    setLogItem(null);
    // 150 ms after the portion sheet's exit (the add's own sound played at Thêm)
    finishDay([...ticked, itemId], SHEET_EXIT_MS + MOMENT_AFTER_SHEET_MS);
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
  const [customOpen, setCustomOpen] = useState(false);
  const openCustom = () => {
    markUsed("training-minutes");
    if (!isPast) setCustomOpen(true);
  };

  const saltTarget = useMemo(
    () => calculateSaltTarget(trainingMinutes, size),
    [trainingMinutes, size]
  );

  const phases = useMemo(
    () => getTrainingPhases(trainingMinutes, ticked, { size, logged: loggedAmounts(record, ticked), own: prefs?.own ?? [] }),
    [trainingMinutes, ticked, size, record, prefs]
  );
  // feat/sound-goals RA1: the tick that completes the day pops its phase's "x / y" and the header says "Xong Ngày tập hôm nay" for 2,4 s
  const { dayDone, announce, finish: finishDay, popEnded } = useTrainingMoment(phases, ticked, todayIso, isPast);

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
    <AppShell>
      {/* One header for both widths (one h1). A phone has the duration and the salt card under it; from 1024 px they sit in the header and the cards row. */}
      <AppHeader
        variant="sub"
        title="Ngày tập"
        subtitle={headerSubtitle}
        backHref={diaryHref}
        layout="wide"
        alignGroup="training-header"
        actions={
          <div className="hidden items-center gap-3 lg:flex">
            {!isPast && prefs && <TrainingSizeChip size={size} onClick={openSizeFromChip} className="shrink-0" />}
            <DurationSelector value={activeDuration} onChange={handleSelectDuration} onCustom={openCustom} variant="desktop" disabled={isPast} />
          </div>
        }
      />

      {/* ============================================================== */}
      {/* MOBILE LAYOUT (<1024px): V3Training.dc.html */}
      {/* ============================================================== */}
      <main
        data-align-container="training-mobile"
        className="mx-auto flex w-full max-w-[560px] flex-col gap-3 px-4 pt-4 pb-6 lg:hidden"
      >
        <div className="flex flex-col gap-4 pb-1">
          <DurationSelector value={activeDuration} onChange={handleSelectDuration} onCustom={openCustom} variant="mobile" disabled={isPast} />
          {isPast ? (
            <p className="m-0 rounded-card bg-ink p-4 text-cap leading-snug text-muted-on-dark">
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
            busyId={waitingId}
            readOnly={isPast}
            variant="mobile"
            dayDone={dayDone}
            onPopEnd={popEnded}
          />
        )}

        {!isPast && <TrainingTipBanner isRestDay={isRestDay} />}
      </main>

      {/* ============================================================== */}
      {/* DESKTOP LAYOUT (>=1024px): DesktopTraining.dc.html */}
      {/* ============================================================== */}
      <main
        data-align-container="training-desktop"
        className="hidden w-full max-w-[1240px] flex-col gap-5 px-8 pt-5 pb-12 box-border lg:flex"
      >
        {isPast ? (
          <section aria-labelledby="past-training" className="bg-card rounded-card border border-transparent shadow-ring lg:shadow-card p-5 flex flex-col gap-2">
            <h2 id="past-training" className="m-0 text-lg font-bold text-text">Muối</h2>
            <p className="m-0 font-display italic font-extrabold text-[2.5rem] leading-none text-text tracking-display">—</p>
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
                busyId={waitingId}
                readOnly={isPast}
                variant="desktop"
                dayDone={dayDone}
                onPopEnd={popEnded}
              />
            )}
            {!isPast && <TrainingTipBanner isRestDay={isRestDay} />}
          </section>
        )}
      </main>

      {/* D-MOT-02: the moment also says it in words, for a screen reader */}
      <p aria-live="polite" className="sr-only">
        {announce}
      </p>
      <TrainingSizeSheet open={sizeOpen} value={size} onChoose={chooseSize} onClose={() => setSizeOpen(false)} />
      <TrainingLogSheet item={logItem} foods={foods} onClose={() => setLogItem(null)} onLogged={handleLogged} />
      <OwnItemSheet target={ownTarget} onClose={() => setOwnTarget(null)} onAdd={addOwn} />
      <TrainingMinutesPicker
        open={customOpen}
        initial={trainingMinutes > 0 ? trainingMinutes : 150}
        onClose={() => setCustomOpen(false)}
        onPick={(minutes) => {
          setCustomOpen(false);
          handleSelectDuration(String(minutes), minutes);
        }}
      />
    </AppShell>
  );
}
