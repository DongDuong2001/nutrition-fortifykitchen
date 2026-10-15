"use client";

import { useCallback, useEffect, useMemo } from "react";
import { currentAccountId } from "@/lib/auth-actions";
import { useDiary } from "@/lib/diary-store";
import {
  dismissLevelNotice,
  dismissLevelZeroHint,
  leaveCoach,
  levelNotice,
  linkCoach,
  showLevelZeroHint,
  type CoachRef,
  type CoachingState,
  type Level,
  type LevelNotice,
  type Role,
} from "@/lib/coaching-link";
import { clientById, findCoachByCode, readClients, withJoined, withoutClient, writeClients, type MockCoach } from "@/lib/mock-coach-server";
import { clearPendingCoachCode } from "@/lib/pending-coach";

export interface Coaching {
  /** The profile is read. Before this, role and Level are the defaults and must not be used to hide or 404 a page. */
  hydrated: boolean;
  role: Role;
  level: Level;
  coach: CoachRef | null;
  notice: LevelNotice | null;
  showHint: boolean;
  /** Joins the coach with this code (any case). Null when the code is not one. Level becomes 1. */
  joinByCode: (code: string) => MockCoach | null;
  leave: () => void;
  dismissNotice: () => void;
  dismissHint: () => void;
}

/** The id this user has on the mock coach server: their account, or "me" when there is none. */
function serverId(): string {
  return currentAccountId() ?? "me";
}

/** The signed-in user's role, Level and coach (from the profile), and the actions that change them. */
export function useCoaching(): Coaching {
  const { profile, hydrated, updateProfile } = useDiary();
  const state: CoachingState = useMemo(
    () => ({ role: profile.role, level: profile.level, coach: profile.coach, levelSeen: profile.levelSeen, hintSeen: profile.hintSeen }),
    [profile.role, profile.level, profile.coach, profile.levelSeen, profile.hintSeen]
  );
  const apply = useCallback((next: CoachingState) => updateProfile(next), [updateProfile]);

  // The coach sets the Level on the (mock) server; this user reads it back when they have a coach and a row there.
  // A different Level then raises or lowers the one-time card (levelSeen stays).
  useEffect(() => {
    if (!hydrated || !state.coach) return;
    const row = clientById(readClients(), serverId());
    if (row && row.level !== state.level) updateProfile({ level: row.level });
  }, [hydrated, state.coach, state.level, updateProfile]);

  return {
    hydrated,
    role: state.role,
    level: state.level,
    coach: state.coach,
    notice: levelNotice(state),
    showHint: showLevelZeroHint(state),
    joinByCode: (code) => {
      const coach = findCoachByCode(code);
      if (!coach) return null;
      writeClients(withJoined(readClients(), { id: serverId(), name: profile.displayName.trim() || "Bạn" }));
      apply(linkCoach(state, { id: coach.id, name: coach.name }));
      clearPendingCoachCode();
      return coach;
    },
    leave: () => {
      writeClients(withoutClient(readClients(), serverId()));
      apply(leaveCoach(state));
    },
    dismissNotice: () => apply(dismissLevelNotice(state)),
    dismissHint: () => apply(dismissLevelZeroHint(state)),
  };
}
