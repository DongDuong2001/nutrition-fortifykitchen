"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { InstallSheet, type InstallSheetResult } from "@/components/pwa/install-sheet";
import { readFirstRunFacts } from "@/lib/first-run";
import { installShownThisSession, markInstallDone, markInstallShown, readInstallDevice, snoozeInstall } from "@/lib/install-browser";
import { isDemo } from "@/lib/demo";
import { useDiary } from "@/lib/diary-store";
import { noteInstallOpen, shouldShowInstallPrompt } from "@/lib/pwa";
import { loadInstallPrompt, saveInstallPrompt } from "@/lib/settings";

/**
 * The install pop-up on Hôm nay: opens by itself when lib/pwa shouldShowInstallPrompt says so. `busy` is true while
 * another overlay, sheet, tour or tip is open; the pop-up then waits.
 */
export function InstallPromptHost({ busy }: { busy: boolean }) {
  const pathname = usePathname();
  const { hydrated, todayIso, addedEntries, dayArchive } = useDiary();
  const [open, setOpen] = useState(false);
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
      busy,
    });
    if (!show) return;
    markInstallShown();
    setOpen(true);
  }, [hydrated, todayIso, loggedEver, pathname, busy, open]);

  const close = (result: InstallSheetResult) => {
    setOpen(false);
    if (result === "done") markInstallDone();
    else snoozeInstall();
  };

  return <InstallSheet open={open} onClose={close} />;
}
