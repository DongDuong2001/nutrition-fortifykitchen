/**
 * Coaching link and Level (cc-28): who the user is (role), which coach follows them and the Level the coach set.
 * Pure: no React, no storage. The invariant everything keeps: Level 0 if and only if there is no coach.
 * - linking to a coach sets Level 1; leaving sets Level 0 (and no coach);
 * - only the coach changes a Level afterwards, between 1 and 5;
 * - `levelSeen` is the Level the user was last told about, so one card can say what changed (cards are shown once).
 * The UI word is "Level", never "Mức".
 */
export type Role = "user" | "coach" | "admin";
export const ROLES: readonly Role[] = ["user", "coach", "admin"];

export type Level = 0 | 1 | 2 | 3 | 4 | 5;
export const LEVELS: readonly Level[] = [0, 1, 2, 3, 4, 5];
export const MAX_LEVEL: Level = 5;

export interface CoachRef {
  id: string;
  name: string;
}

export interface CoachingState {
  role: Role;
  level: Level;
  coach: CoachRef | null;
  /** The Level last shown to the user (their one-time card was dismissed at it). */
  levelSeen: Level;
  /** The Level 0 hint ("Có huấn luyện viên? …") was dismissed. */
  hintSeen: boolean;
}

export const NO_COACHING: CoachingState = { role: "user", level: 0, coach: null, levelSeen: 0, hintSeen: false };

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

/** A whole number from 0 to 5; anything else is 0. */
export function toLevel(value: unknown): Level {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= MAX_LEVEL ? (value as Level) : 0;
}

function toCoachRef(value: unknown): CoachRef | null {
  if (typeof value !== "object" || value === null) return null;
  const v = value as Record<string, unknown>;
  return typeof v.id === "string" && v.id !== "" && typeof v.name === "string" && v.name !== "" ? { id: v.id, name: v.name } : null;
}

/** Level 0 if and only if there is no coach. */
export function isConsistent(state: Pick<CoachingState, "level" | "coach">): boolean {
  return (state.level === 0) === (state.coach === null);
}

/**
 * Reads what was stored. A profile saved before Level existed loads as user, Level 0, no coach. A stored state that
 * breaks the invariant is repaired: a Level without a coach drops to 0, a coach with Level 0 starts at Level 1.
 */
export function normaliseCoaching(raw: unknown): CoachingState {
  if (typeof raw !== "object" || raw === null) return NO_COACHING;
  const v = raw as Record<string, unknown>;
  const coach = toCoachRef(v.coach);
  let level = toLevel(v.level);
  if (coach === null) level = 0;
  else if (level === 0) level = 1;
  const seen = toLevel(v.levelSeen);
  return {
    role: isRole(v.role) ? v.role : "user",
    level,
    coach,
    levelSeen: coach === null ? 0 : seen,
    hintSeen: v.hintSeen === true,
  };
}

/** Joining a coach: Level 1, and the "linked" card is still to be shown (levelSeen stays). */
export function linkCoach(state: CoachingState, coach: CoachRef): CoachingState {
  return { ...state, coach, level: 1, levelSeen: state.coach?.id === coach.id ? state.levelSeen : 0 };
}

/** Leaving the coach: Level 0, no coach, nothing left to announce. */
export function leaveCoach(state: CoachingState): CoachingState {
  return { ...state, coach: null, level: 0, levelSeen: 0 };
}

/** The coach sets a client's Level, 1 to 5. Without a coach nothing changes (Level 0 stays 0). */
export function setClientLevel(state: CoachingState, level: number): CoachingState {
  if (state.coach === null) return state;
  const next = Math.min(MAX_LEVEL, Math.max(1, Math.round(level))) as Level;
  return { ...state, level: next };
}

export type LevelNotice = { kind: "linked" | "raised" | "lowered"; from: Level; to: Level };

/**
 * The one-time card the user should see: just linked (first time at Level 1+), raised, or lowered. None once they
 * have dismissed it (levelSeen equals the Level) and none at Level 0.
 */
export function levelNotice(state: CoachingState): LevelNotice | null {
  if (state.coach === null || state.level === 0 || state.level === state.levelSeen) return null;
  if (state.levelSeen === 0) return { kind: "linked", from: 0, to: state.level };
  return { kind: state.level > state.levelSeen ? "raised" : "lowered", from: state.levelSeen, to: state.level };
}

export function dismissLevelNotice(state: CoachingState): CoachingState {
  return { ...state, levelSeen: state.level };
}

/** The Level 0 card ("Có huấn luyện viên?") shows once, to a user with no coach. */
export function showLevelZeroHint(state: CoachingState): boolean {
  return state.role === "user" && state.coach === null && !state.hintSeen;
}

export function dismissLevelZeroHint(state: CoachingState): CoachingState {
  return { ...state, hintSeen: true };
}

/** Coach and admin see the client list. */
export function canManageClients(role: Role): boolean {
  return role === "coach" || role === "admin";
}

/** Only the admin sees the review queue. */
export function canReview(role: Role): boolean {
  return role === "admin";
}

/** Whether a coach code is well formed: "H1T-" and letters or digits, any case. */
export function normaliseCode(input: string): string {
  return input.trim().toUpperCase().replace(/\s+/g, "");
}
