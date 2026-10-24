"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { cue, TIER_CUE } from "@/lib/cue";
import { runMoment } from "@/lib/goal-fx";
import { ANNOUNCE_MS, GOAL_LABEL_HOLD_MS, clearQueuedMoment, momentText, queuedMoment, subscribeMoment } from "@/lib/goal-moments";
import { FIRST_FOOD, momentGate, type Moment } from "@/lib/goals";
import { HOME_ROUTE } from "@/lib/nav";
import { isOverlayOpen, subscribeTipBusy } from "@/lib/tour-bus";
import type { HeroMoment } from "./home-hero";

const whatsNewOpen = () => isOverlayOpen("whats-new") || isOverlayOpen("whats-new-tour");
const noMoment = () => null;

/**
 * feat/sound-goals §4: plays the moment an add queued (lib/goal-moments) once Hôm nay shows today and nothing is in the way, 150 ms
 * after the + sheet's exit ends (the add's own sound already played at the tap). It waits (like the Level-up) for Có gì mới or a tour,
 * a sheet on Hôm nay, choosing foods and the Level-up celebration; it is not an interruption itself and never covers anything. A moment
 * of an earlier day is dropped. Returns the hero's label for 2,4 s and the polite line for the goals that change no label.
 */
export function useGoalMoment({
  todayIso,
  viewingToday,
  sheetOpen,
  selecting,
  levelUpPlaying,
  onPlayed,
}: {
  todayIso: string | null;
  /** Hôm nay is the page and shows today */
  viewingToday: boolean;
  sheetOpen: boolean;
  selecting: boolean;
  levelUpPlaying: boolean;
  /** The moment just played (the share nudge listens for Đủ chất) */
  onPlayed?: (moment: Moment) => void;
}): { heroMoment: HeroMoment | null; announce: string } {
  const pathname = usePathname();
  const queued = useSyncExternalStore(subscribeMoment, queuedMoment, noMoment);
  const wnOpen = useSyncExternalStore(subscribeTipBusy, whatsNewOpen, () => false);
  const onHome = pathname === HOME_ROUTE;
  // When the + sheet's exit ended: the address is Hôm nay's again
  const exitEndedAt = useRef<number | null>(null);
  useEffect(() => {
    if (onHome) exitEndedAt.current = performance.now();
  }, [onHome]);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const sync = () => setVisible(!document.hidden);
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);

  const [heroMoment, setHeroMoment] = useState<HeroMoment | null>(null);
  const [announce, setAnnounce] = useState("");
  const seq = useRef(0);
  const played = useRef(onPlayed);
  played.current = onPlayed;
  const holdTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const announceTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(
    () => () => {
      clearTimeout(holdTimer.current);
      clearTimeout(announceTimer.current);
    },
    []
  );

  useEffect(() => {
    if (!queued || !todayIso) return;
    const gate = momentGate({
      queuedFor: queued.date,
      today: todayIso,
      homeToday: onHome && viewingToday && visible,
      waitingOn: { addSheet: false, whatsNewOrTour: wnOpen, homeSheet: sheetOpen, choosing: selecting, levelUp: levelUpPlaying },
      sheetExitEndedAt: exitEndedAt.current,
      now: performance.now(),
    });
    if (gate === "drop") {
      clearQueuedMoment();
      return;
    }
    if (gate === "wait") return;
    const timer = setTimeout(() => {
      const current = queuedMoment();
      if (!current) return;
      clearQueuedMoment();
      const { lead, tier } = current.moment;
      runMoment(current.moment);
      played.current?.(current.moment);
      cue(lead === FIRST_FOOD ? "goal" : TIER_CUE[tier]);
      const text = momentText(lead);
      if (text.label) {
        // The h2 is aria-live: its text says it. The usual label glides back after the hold.
        setHeroMoment({ key: ++seq.current, text: text.label });
        clearTimeout(holdTimer.current);
        holdTimer.current = setTimeout(() => setHeroMoment({ key: ++seq.current, text: null }), GOAL_LABEL_HOLD_MS);
      } else {
        setAnnounce(text.announce);
        clearTimeout(announceTimer.current);
        announceTimer.current = setTimeout(() => setAnnounce(""), ANNOUNCE_MS);
      }
    }, gate);
    return () => clearTimeout(timer);
  }, [queued, todayIso, onHome, viewingToday, visible, wnOpen, sheetOpen, selecting, levelUpPlaying]);

  return { heroMoment, announce };
}
