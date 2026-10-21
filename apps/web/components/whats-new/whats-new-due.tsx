"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { isDemo } from "@/lib/demo";
import { useDiary } from "@/lib/diary-store";
import { readFirstRunFacts } from "@/lib/first-run";
import { HOME_ROUTE } from "@/lib/nav";
import { loadFlags, subscribeFlags, whatsNewDisabled } from "@/lib/onboarding-store";
import { interruptionShown, setInterruptionDue } from "@/lib/interruption";
import { latestRelease, shouldShowWhatsNew } from "@/lib/releases";

/**
 * Tells lib/interruption whether "Có gì mới" is due. Not lazy, unlike the sheet (components/whats-new/whats-new-host): the sheet's
 * chunk and its hydration can come late on a slow start, and the install pop-up and the tips must not take the one place of an app
 * open in the meantime. This part is small and mounts with Hôm nay; it says "due" (or "not due") as soon as the diary is read, and
 * the other two wait for that report on Hôm nay (mayInterrupt).
 */
export function WhatsNewDue() {
  const pathname = usePathname();
  const { hydrated } = useDiary();

  useEffect(() => {
    const latest = latestRelease();
    const compute = () => {
      if (!hydrated) return; // not reported yet: the others still wait
      const demo = isDemo();
      const facts = readFirstRunFacts(demo);
      const eligible = !!latest && pathname === HOME_ROUTE && !whatsNewDisabled() && (demo || facts.signedIn === true);
      const wants = eligible && shouldShowWhatsNew({ seenId: loadFlags().whatsNewSeen, latestId: latest.id, firstRun: !(demo || facts.profileSaved), busy: false });
      // Something has opened already this app open (it may be this very sheet): nothing is due any more
      setInterruptionDue("whats-new", wants && interruptionShown() === null);
    };
    compute();
    const off = subscribeFlags(compute);
    return () => {
      off();
      setInterruptionDue("whats-new", false);
    };
  }, [hydrated, pathname]);

  return null;
}
