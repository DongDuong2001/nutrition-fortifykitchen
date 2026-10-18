"use client";

import React, { useEffect, useState } from "react";
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
import { isOverlayOpen, isTipBusy, readTour, setOverlayOpen, subscribeTipBusy, subscribeTour, writeWhatsNewTour } from "@/lib/tour-bus";

/** A tip (open or due), the install pop-up, the onboarding tour or the what's-new tour is on screen. */
function useOthersBusy(todayIso: string | null): boolean {
  const [busy, setBusy] = useState(true);
  useEffect(() => {
    if (!todayIso) return;
    const read = () =>
      setBusy(
        isOverlayOpen("install") ||
          isOverlayOpen("whats-new-tour") ||
          readTour().status === "step" ||
          isTipBusy() !== false ||
          tourOpenOn(loadFlags(), todayIso)
      );
    read();
    const offs = [subscribeTour(read), subscribeFlags(read), subscribeTipBusy(read)];
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
export function WhatsNewHost({ busy }: { busy: boolean }) {
  const pathname = usePathname();
  const { hydrated, todayIso, saving } = useDiary();
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState<Release[]>([]);
  const [tourSteps, setTourSteps] = useState<number[]>([]);
  const othersBusy = useOthersBusy(todayIso);
  const latest = latestRelease();

  useEffect(() => {
    if (!hydrated || open || !latest || pathname !== HOME_ROUTE || whatsNewDisabled()) return;
    const demo = isDemo();
    const facts = readFirstRunFacts(demo);
    if (!demo && facts.signedIn !== true) return;
    const seenId = loadFlags().whatsNewSeen;
    const show = shouldShowWhatsNew({
      seenId,
      latestId: latest.id,
      firstRun: !(demo || facts.profileSaved),
      busy: busy || othersBusy || saving,
    });
    if (!show) return;
    const releases = unseenReleases(seenId);
    setShown(releases);
    setTourSteps(stepsOnPage(releases));
    setOpen(true);
  }, [hydrated, open, latest, pathname, busy, othersBusy, saving]);

  useEffect(() => setOverlayOpen("whats-new", open), [open]);
  useEffect(() => () => setOverlayOpen("whats-new", false), []);

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
