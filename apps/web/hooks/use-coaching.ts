"use client";

import { useCallback, useEffect, useMemo } from "react";
import { currentAccountId } from "@/lib/auth-actions";
import { isLiveMode } from "@/lib/api-mode";
import { useDiary } from "@/lib/diary-store";
import {
  coachingAvailable,
  dismissLevelZeroHint,
  effectiveCoaching,
  leaveCoach,
  levelNotice,
  levelUp,
  linkCoach,
  seenPatch,
  showLevelZeroHint,
  type CoachRef,
  type CoachingState,
  type Level,
  type LevelNotice,
  type Role,
} from "@/lib/coaching-link";
import { clientById, clientIdFor, findCoachByCode, readClients, withJoined, withoutClient, writeClients, type MockCoach } from "@/lib/mock-coach-server";
import { clearPendingCoachCode } from "@/lib/pending-coach";

export interface Coaching {
  /** The profile is read. Before this, role and Level are the defaults and must not be used to hide or 404 a page. */
  hydrated: boolean;
  role: Role;
  level: Level;
  coach: CoachRef | null;
  /** A lower Level than the one seen: the calm card. */
  notice: LevelNotice | null;
  /** A higher Level than the one seen: the celebration plays once (0 → 1 too). */
  levelUp: { from: Level; to: Level } | null;
  showHint: boolean;
  /** False in live mode: there is no coaching API yet, so its screens are hidden and Level is 0. */
  available: boolean;
  /** Joins the coach with this code (any case). Null when the code is not one. Level becomes 1. */
  joinByCode: (code: string) => MockCoach | null;
  leave: () => void;
  /** The current Level is now seen (the card or the celebration closed): the profile in mock mode, the API's profile in live mode. */
  seeLevel: () => void;
  dismissHint: () => void;
}

/** The id this user has on the mock coach server: a random one per account, never the email. */
function serverId(): string {
  return clientIdFor(currentAccountId());
}

/** The signed-in user's role, Level and coach (from the profile), and the actions that change them. */
export function useCoaching(): Coaching {
  const { profile, hydrated, updateProfile } = useDiary();
  const live = isLiveMode();
  const available = coachingAvailable(live);
  const state: CoachingState = useMemo(
    () =>
      effectiveCoaching(
        { role: profile.role, level: profile.level, coach: profile.coach, levelSeen: profile.levelSeen, hintSeen: profile.hintSeen },
        live,
        profile.serverLevel
      ),
    [profile.role, profile.level, profile.coach, profile.levelSeen, profile.hintSeen, profile.serverLevel, live]
  );
  const apply = useCallback((next: CoachingState) => updateProfile(next), [updateProfile]);

  // The coach sets the Level on the (mock) server; this user reads it back when they have a coach and a row there.
  // A higher Level then plays the celebration, a lower one shows the card (levelSeen stays).
  useEffect(() => {
    if (!available || !hydrated || !state.coach) return;
    const row = clientById(readClients(), serverId());
    if (row && row.level !== state.level) updateProfile({ level: row.level });
  }, [available, hydrated, state.coach, state.level, updateProfile]);

  return {
    hydrated,
    role: state.role,
    level: state.level,
    coach: state.coach,
    notice: levelNotice(state),
    levelUp: levelUp(state),
    showHint: available && showLevelZeroHint(state),
    available,
    joinByCode: (code) => {
      if (!available) return null;
      const coach = findCoachByCode(code);
      if (!coach) return null;
      writeClients(withJoined(readClients(), { id: serverId(), name: profile.displayName.trim() || "Bạn" }));
      apply(linkCoach(state, { id: coach.id, name: coach.name }));
      clearPendingCoachCode();
      return coach;
    },
    leave: () => {
      if (!available) return;
      writeClients(withoutClient(readClients(), serverId()));
      apply(leaveCoach(state));
    },
    seeLevel: () => {
      const patch = seenPatch(state, live, profile.serverLevel);
      if (patch) updateProfile(patch);
    },
    dismissHint: () => available && apply(dismissLevelZeroHint(state)),
  };
}
