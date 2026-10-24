"use client";

import { useEffect, useRef, useState } from "react";
import { cue } from "@/lib/cue";
import { ANNOUNCE_MS, GOAL_LABEL_HOLD_MS, momentText } from "@/lib/goal-moments";
import { emitGoal, loadGoalRecord, momentFor, saveGoalRecord, seenToday, withGoals } from "@/lib/goals";
import { dayCompletedBy, trainingGoalDue, type DayPhase } from "@/lib/training-day-done";

/** The phase header during Ngày tập's moment: the words for 2,4 s (`text`), then the phase name glides back; its "x / y" pops once. */
export interface DayDone {
  phaseId: string;
  key: number;
  text: string | null;
  pop: boolean;
}

/**
 * feat/sound-goals RA1: Ngày tập done. The tick that completes the day (every item of the checklist ticked, today, the first time today:
 * the `training` goal through lib/goals and the day's record) plays on /training: the completing phase's "x / y" pops and its header
 * glides to "Xong Ngày tập hôm nay" for 2,4 s, with the `day` cue and a polite line. No ring. `finish` is called with the ticked ids the
 * change leads to and the wait before it plays: 0 for a plain tick, a portion sheet's exit plus 150 ms after its Thêm.
 */
export function useTrainingMoment(phases: readonly DayPhase[], ticked: readonly string[], todayIso: string, isPast: boolean) {
  const [dayDone, setDayDone] = useState<DayDone | null>(null);
  const [announce, setAnnounce] = useState("");
  const now = useRef({ phases, ticked });
  now.current = { phases, ticked };
  const seq = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const finish = (after: readonly string[], waitMs: number) => {
    if (isPast) return;
    const phaseId = dayCompletedBy(now.current.phases, now.current.ticked, after);
    if (!phaseId) return;
    const record = loadGoalRecord();
    if (!trainingGoalDue(seenToday(record, todayIso))) return;
    saveGoalRecord(withGoals(record, todayIso, ["training"]));
    const moment = momentFor(["training"]);
    if (moment) emitGoal({ date: todayIso, keys: ["training"], moment });
    timers.current.push(
      setTimeout(() => {
        cue("day");
        setAnnounce(momentText("training").announce);
        timers.current.push(setTimeout(() => setAnnounce(""), ANNOUNCE_MS));
        setDayDone({ phaseId, key: ++seq.current, text: momentText("training").announce, pop: true });
        timers.current.push(setTimeout(() => setDayDone({ phaseId, key: ++seq.current, text: null, pop: false }), GOAL_LABEL_HOLD_MS));
      }, waitMs)
    );
  };

  return { dayDone, announce, finish, popEnded: () => setDayDone((d) => (d ? { ...d, pop: false } : d)) };
}
