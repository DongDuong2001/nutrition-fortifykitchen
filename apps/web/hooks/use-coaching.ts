"use client";

import { useCallback, useMemo } from "react";
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

export interface Coaching {
  /** The profile is read. Before this, role and Level are the defaults and must not be used to hide or 404 a page. */
  hydrated: boolean;
  role: Role;
  level: Level;
  coach: CoachRef | null;
  notice: LevelNotice | null;
  showHint: boolean;
  link: (coach: CoachRef) => void;
  leave: () => void;
  dismissNotice: () => void;
  dismissHint: () => void;
}

/** The signed-in user's role, Level and coach (from the profile), and the actions that change them. */
export function useCoaching(): Coaching {
  const { profile, hydrated, updateProfile } = useDiary();
  const state: CoachingState = useMemo(
    () => ({ role: profile.role, level: profile.level, coach: profile.coach, levelSeen: profile.levelSeen, hintSeen: profile.hintSeen }),
    [profile.role, profile.level, profile.coach, profile.levelSeen, profile.hintSeen]
  );
  const apply = useCallback((next: CoachingState) => updateProfile(next), [updateProfile]);
  return {
    hydrated,
    role: state.role,
    level: state.level,
    coach: state.coach,
    notice: levelNotice(state),
    showHint: showLevelZeroHint(state),
    link: (coach) => apply(linkCoach(state, coach)),
    leave: () => apply(leaveCoach(state)),
    dismissNotice: () => apply(dismissLevelNotice(state)),
    dismissHint: () => apply(dismissLevelZeroHint(state)),
  };
}
