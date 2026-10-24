"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { claimLevelUp, interruptionVersion, setInterruptionDue, subscribeInterruption } from "@/lib/interruption";
import type { LevelStep } from "@/lib/level-copy";
import { levelUpReady } from "@/lib/level-up";
import { HOME_ROUTE } from "@/lib/nav";
import { isOverlayOpen, subscribeTipBusy } from "@/lib/tour-bus";
import { useHasUnsavedWork } from "@/lib/unsaved-work";

type LevelUpComponent = typeof import("./level-up").LevelUp;

const whatsNewOpen = () => isOverlayOpen("whats-new") || isOverlayOpen("whats-new-tour");

/**
 * Plays the Level-up celebration once there is a promotion (`step`) and nothing is in the way (lib/level-up levelUpReady), in its
 * place among the app open's interruptions (lib/interruption claimLevelUp: after Có gì mới, before the install pop-up and the tips).
 * The celebration is its own chunk: nothing of it loads until it will play.
 */
export function LevelUpHost({
  step,
  coachName,
  busy,
  onStart,
  onClose,
}: {
  step: LevelStep | null;
  coachName: string | null;
  /** Hôm nay has a sheet open or is choosing foods. */
  busy: boolean;
  /** It is about to play this step: the header keeps the old Level until the badge lands. */
  onStart: (step: LevelStep) => void;
  /** It closed: the Level is seen; `explain` when the person chose "Xem chỉ số mới". */
  onClose: (explain: boolean) => void;
}) {
  const pathname = usePathname();
  const unsavedWork = useHasUnsavedWork();
  const wnOpen = useSyncExternalStore(subscribeTipBusy, whatsNewOpen, () => false);
  // Looks again when another interruption opens, closes or reports
  const version = useSyncExternalStore(subscribeInterruption, interruptionVersion, () => 0);
  const [playing, setPlaying] = useState<{ step: LevelStep; LevelUp: LevelUpComponent } | null>(null);
  const claimed = useRef(false);

  const due = step !== null;
  useEffect(() => {
    setInterruptionDue("level-up", due && !claimed.current);
  }, [due]);
  useEffect(() => () => setInterruptionDue("level-up", false), []);

  useEffect(() => {
    if (claimed.current || !step) return;
    if (!levelUpReady({ step, onHome: pathname === HOME_ROUTE, unsavedWork, whatsNewOpen: wnOpen, busy })) return;
    if (!claimLevelUp()) return;
    claimed.current = true;
    import("./level-up")
      .then(({ LevelUp }) => {
        onStart(step);
        setPlaying({ step, LevelUp });
      })
      // The chunk did not load (offline): nothing is marked seen, so it plays at the next app open
      .catch(() => {});
    // onStart is the screen's, stable enough: the claim happens once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, pathname, unsavedWork, wnOpen, busy, version]);

  if (!playing) return null;
  return (
    <playing.LevelUp
      step={playing.step}
      coachName={coachName}
      onClose={(explain) => {
        setPlaying(null);
        onClose(explain);
      }}
    />
  );
}
