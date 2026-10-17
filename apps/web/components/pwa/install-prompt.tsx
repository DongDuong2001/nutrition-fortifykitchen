"use client";

import React, { useEffect, useState } from "react";
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
import { isOverlayOpen, isTipBusy, readTour, setOverlayOpen, subscribeTipBusy, subscribeTour } from "@/lib/tour-bus";

/**
 * True while the first-run tour is running (or was started today and is not finished or skipped), or a first-visit
 * tip is open or still due (the layer has not looked yet, or found one), or "Có gì mới" or its tour is open. The pop-up
 * waits for all of them.
 */
function useOnboardingBusy(todayIso: string | null): boolean {
  const [busy, setBusy] = useState(true);
  useEffect(() => {
    if (!todayIso) return;
    const read = () =>
      setBusy(
        isOverlayOpen("whats-new") ||
          isOverlayOpen("whats-new-tour") ||
          (!onboardingDisabled() && (readTour().status === "step" || isTipBusy() !== false || tourOpenOn(loadFlags(), todayIso)))
      );
    read();
    const offs = [subscribeTour(read), subscribeFlags(read), subscribeTipBusy(read)];
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
  const loggedEver = addedEntries.length > 0 || Object.keys(dayArchive).length > 0;

  useEffect(() => {
    if (!hydrated || !todayIso || open) return;
    const demo = isDemo();
    const facts = readFirstRunFacts(demo);
    const saved = loadInstallPrompt();
    const state = noteInstallOpen(saved, todayIso);
    if (state !== saved) saveInstallPrompt(state);
    const device = readInstallDevice();
    const show = shouldShowInstallPrompt({
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
      busy: busy || onboardingBusy,
    });
    if (!show) return;
    markInstallShown();
    setOpen(true);
  }, [hydrated, todayIso, loggedEver, pathname, busy, onboardingBusy, open]);

  useEffect(() => setOverlayOpen("install", open), [open]);
  useEffect(() => () => setOverlayOpen("install", false), []);

  const close = (result: InstallSheetResult) => {
    setOpen(false);
    if (result === "done") markInstallDone();
    else snoozeInstall();
  };

  return <InstallSheet open={open} onClose={close} />;
}
