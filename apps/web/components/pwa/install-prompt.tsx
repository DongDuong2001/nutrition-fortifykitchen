"use client";

import React, { useEffect, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { InstallSheet, type InstallSheetResult } from "@/components/pwa/install-sheet";
import { readFirstRunFacts } from "@/lib/first-run";
import { installShownThisSession, markInstallDone, markInstallShown, readInstallDevice, snoozeInstall } from "@/lib/install-browser";
import { isDemo } from "@/lib/demo";
import { useDiary } from "@/lib/diary-store";
import { tourOpenOn } from "@/lib/onboarding-flags";
import { loadFlags, onboardingDisabled, subscribeFlags } from "@/lib/onboarding-store";
import { noteInstallOpen, shouldShowInstallPrompt } from "@/lib/pwa";
import { loadInstallPrompt, saveInstallPrompt } from "@/lib/settings";
import { claimInterruption, interruptionVersion, setInterruptionDue, subscribeInterruption } from "@/lib/interruption";
import { isOverlayOpen, readTour, setOverlayOpen, subscribeTour } from "@/lib/tour-bus";

/**
 * True while the first-run tour is running (or was started today and is not finished or skipped), or "Có gì mới" or its
 * tour is open. The pop-up waits for all of them. (A first-visit tip does not hold it back: the pop-up comes first,
 * lib/interruption.)
 */
function useOnboardingBusy(todayIso: string | null): boolean {
  const [busy, setBusy] = useState(true);
  useEffect(() => {
    if (!todayIso) return;
    const read = () =>
      setBusy(
        isOverlayOpen("whats-new") ||
          isOverlayOpen("whats-new-tour") ||
          (!onboardingDisabled() && (readTour().status === "step" || tourOpenOn(loadFlags(), todayIso)))
      );
    read();
    const offs = [subscribeTour(read), subscribeFlags(read)];
    return () => offs.forEach((off) => off());
  }, [todayIso]);
  return busy;
}

/**
 * The install pop-up on Hôm nay: opens by itself when lib/pwa shouldShowInstallPrompt says so. `busy` is true while
 * another overlay, sheet, tour or tip is open; the pop-up then waits.
 */
export function InstallPromptHost({ busy }: { busy: boolean }) {
  const pathname = usePathname();
  const { hydrated, todayIso, addedEntries, dayArchive } = useDiary();
  const [open, setOpen] = useState(false);
  const onboardingBusy = useOnboardingBusy(todayIso);
  // Looks again when Có gì mới becomes due or something else has opened (lib/interruption)
  const interruptions = useSyncExternalStore(subscribeInterruption, interruptionVersion, () => 0);
  const loggedEver = addedEntries.length > 0 || Object.keys(dayArchive).length > 0;

  useEffect(() => {
    if (!hydrated || !todayIso || open) return;
    const demo = isDemo();
    const facts = readFirstRunFacts(demo);
    const saved = loadInstallPrompt();
    const state = noteInstallOpen(saved, todayIso);
    if (state !== saved) saveInstallPrompt(state);
    const device = readInstallDevice();
    const input = {
      touchPhone: device.touchPhone,
      standalone: device.standalone,
      signedIn: demo || facts.signedIn === true,
      setupDone: demo || facts.profileSaved,
      pathname: pathname ?? "",
      hasLoggedFood: demo || loggedEver,
      todayIso,
      state,
      now: Date.now(),
      shownThisSession: installShownThisSession(),
    };
    // It wants to show (and holds the tips back) even while something else is busy; it opens when none is
    const wants = shouldShowInstallPrompt({ ...input, busy: false });
    setInterruptionDue("install", wants);
    if (!wants || busy || onboardingBusy) return;
    // One interruption per app open, and Có gì mới first: when it may not, the pop-up waits for another open
    if (!claimInterruption("install")) return;
    markInstallShown();
    setOpen(true);
  }, [hydrated, todayIso, loggedEver, pathname, busy, onboardingBusy, open, interruptions]);

  useEffect(() => setOverlayOpen("install", open), [open]);
  useEffect(
    () => () => {
      setOverlayOpen("install", false);
      setInterruptionDue("install", false);
    },
    []
  );

  const close = (result: InstallSheetResult) => {
    setOpen(false);
    if (result === "done") markInstallDone();
    else snoozeInstall();
  };

  return <InstallSheet open={open} onClose={close} />;
}
