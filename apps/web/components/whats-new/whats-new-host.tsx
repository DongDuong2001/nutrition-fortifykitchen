"use client";

import React, { useEffect, useState } from "react";
import { whenIdle } from "@/lib/idle";
import { usePathname } from "next/navigation";
import { stepOnPage } from "@/components/onboarding/spotlight";
import { WhatsNewSheet } from "@/components/whats-new/whats-new-sheet";
import { isDemo } from "@/lib/demo";
import { useDiary } from "@/lib/diary-store";
import { readFirstRunFacts } from "@/lib/first-run";
import { HOME_ROUTE } from "@/lib/nav";
import { tourOpenOn } from "@/lib/onboarding-flags";
import { loadFlags, markWhatsNewSeen, subscribeFlags, whatsNewDisabled } from "@/lib/onboarding-store";
import { latestRelease, shouldShowWhatsNew, tourSteps, unseenReleases, type Release } from "@/lib/releases";
import { claimInterruption, setInterruptionDue } from "@/lib/interruption";
import { isOverlayOpen, readTour, setOverlayOpen, subscribeTour, writeWhatsNewTour } from "@/lib/tour-bus";

/** The install pop-up, the onboarding tour or the what's-new tour is on screen. (A tip is not waited for: Có gì mới comes first, lib/interruption.) */
function useOthersBusy(todayIso: string | null): boolean {
  const [busy, setBusy] = useState(true);
  useEffect(() => {
    if (!todayIso) return;
    const read = () =>
      setBusy(
        isOverlayOpen("install") ||
          isOverlayOpen("whats-new-tour") ||
          readTour().status === "step" ||
          tourOpenOn(loadFlags(), todayIso)
      );
    read();
    const offs = [subscribeTour(read), subscribeFlags(read)];
    return () => offs.forEach((off) => off());
  }, [todayIso]);
  return busy;
}

/**
 * Which tour steps can show on Hôm nay now (the sheet sits over it), as places in tourSteps: a step whose control lives
 * elsewhere is left out before the 8-step cap (lib/tour-bus whatsNewSteps), so it never takes the place of one that can.
 */
function stepsOnPage(releases: readonly Release[]): number[] {
  return tourSteps(releases.map((r) => r.id)).flatMap((step, i) => (stepOnPage(step) ? [i] : []));
}

/**
 * Opens "Có gì mới" by itself on Hôm nay, once per release per account: signed in, setup done, and only when nothing
 * else is open (`busy`: Hôm nay's own sheets and Chọn nhiều món) and no save is on its way (its tour must not stand
 * over a write). It lists every release newer than the last one seen; "Thử ngay" runs their tours oldest first
 * (lib/releases joinedTour). The probes' device switches keep it away (whatsNewDisabled).
 */
/** How long "Có gì mới" waits after Hôm nay shows before it opens by itself (then for an idle moment). */
const WHATS_NEW_DELAY_MS = 600;

export function WhatsNewHost({ busy }: { busy: boolean }) {
  const pathname = usePathname();
  const { hydrated, todayIso, saving } = useDiary();
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState<Release[]>([]);
  const [tourSteps, setTourSteps] = useState<number[]>([]);
  const othersBusy = useOthersBusy(todayIso);
  const latest = latestRelease();

  useEffect(() => {
    if (!hydrated || open || !latest || pathname !== HOME_ROUTE || whatsNewDisabled()) {
      setInterruptionDue("whats-new", false);
      return;
    }
    const demo = isDemo();
    const facts = readFirstRunFacts(demo);
    if (!demo && facts.signedIn !== true) {
      setInterruptionDue("whats-new", false);
      return;
    }
    const seenId = loadFlags().whatsNewSeen;
    // It wants to show (and holds the install pop-up and the tips back) even while something else is busy; it opens when none is
    const wants = shouldShowWhatsNew({ seenId, latestId: latest.id, firstRun: !(demo || facts.profileSaved), busy: false });
    setInterruptionDue("whats-new", wants);
    const show = wants && !(busy || othersBusy || saving);
    if (!show) return;
    // cc-64: it waits until Hôm nay has painted and the page is idle (at least 600 ms), so it never covers the first frame
    let cancelIdle = () => {};
    const timer = window.setTimeout(() => {
      cancelIdle = whenIdle(() => {
        // One interruption per app open: if something else has opened already, it waits for the next one
        if (!claimInterruption("whats-new")) return;
        const releases = unseenReleases(seenId);
        setShown(releases);
        setTourSteps(stepsOnPage(releases));
        setOpen(true);
      });
    }, WHATS_NEW_DELAY_MS);
    return () => {
      window.clearTimeout(timer);
      cancelIdle();
    };
  }, [hydrated, open, latest, pathname, busy, othersBusy, saving]);

  useEffect(() => setOverlayOpen("whats-new", open), [open]);
  useEffect(
    () => () => {
      setOverlayOpen("whats-new", false);
      setInterruptionDue("whats-new", false);
    },
    []
  );

  if (!latest || shown.length === 0) return null;
  return (
    <WhatsNewSheet
      releases={shown}
      canTour={tourSteps.length > 0}
      open={open}
      onClose={(tryTour) => {
        markWhatsNewSeen(latest.id);
        setOpen(false);
        if (tryTour) writeWhatsNewTour({ releaseIds: shown.map((r) => r.id), index: 0, only: stepsOnPage(shown) });
      }}
    />
  );
}
