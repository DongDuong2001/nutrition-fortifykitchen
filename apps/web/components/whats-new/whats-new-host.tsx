"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { WhatsNewSheet } from "@/components/whats-new/whats-new-sheet";
import { isDemo } from "@/lib/demo";
import { useDiary } from "@/lib/diary-store";
import { readFirstRunFacts } from "@/lib/first-run";
import { HOME_ROUTE } from "@/lib/nav";
import { tourOpenOn } from "@/lib/onboarding-flags";
import { loadFlags, markWhatsNewSeen, subscribeFlags, whatsNewDisabled } from "@/lib/onboarding-store";
import { latestRelease, shouldShowWhatsNew } from "@/lib/releases";
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
 * Opens "Có gì mới" by itself on Hôm nay, once per release per account: signed in, setup done, and only when nothing
 * else is open (`busy`: Hôm nay's own sheets and Chọn nhiều món) and no save is on its way (its tour must not stand
 * over a write). The probes' device switches keep it away (whatsNewDisabled).
 */
export function WhatsNewHost({ busy }: { busy: boolean }) {
  const pathname = usePathname();
  const { hydrated, todayIso, saving } = useDiary();
  const [open, setOpen] = useState(false);
  const othersBusy = useOthersBusy(todayIso);
  const release = latestRelease();

  useEffect(() => {
    if (!hydrated || open || !release || pathname !== HOME_ROUTE || whatsNewDisabled()) return;
    const demo = isDemo();
    const facts = readFirstRunFacts(demo);
    if (!demo && facts.signedIn !== true) return;
    const show = shouldShowWhatsNew({
      seenId: loadFlags().whatsNewSeen,
      latestId: release.id,
      firstRun: !(demo || facts.profileSaved),
      busy: busy || othersBusy || saving,
    });
    if (show) setOpen(true);
  }, [hydrated, open, release, pathname, busy, othersBusy, saving]);

  useEffect(() => setOverlayOpen("whats-new", open), [open]);
  useEffect(() => () => setOverlayOpen("whats-new", false), []);

  if (!release) return null;
  return (
    <WhatsNewSheet
      release={release}
      open={open}
      onClose={(tryTour) => {
        markWhatsNewSeen(release.id);
        setOpen(false);
        if (tryTour) writeWhatsNewTour({ releaseId: release.id, index: 0 });
      }}
    />
  );
}
