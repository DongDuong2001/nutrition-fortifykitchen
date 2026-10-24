/**
 * Coaching link and Level (cc-28): who the user is (role), which coach follows them and the Level the coach set.
 * Pure: no React, no storage. The invariant everything keeps: Level 0 if and only if there is no coach.
 * - linking to a coach sets Level 1; leaving sets Level 0 (and no coach);
 * - only the coach changes a Level afterwards, between 1 and 5;
 * - `levelSeen` is the Level the user was last told about: a higher Level plays the celebration once, a lower one shows a card once.
 * Live mode has no coach object: the Level comes from the API's profile (`level`, `levelSeen`, ServerLevel) when it sends them.
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

/** `level` and `levelSeen` of GET /me (migration 000021). The coach or an admin sets the level; the web only ever writes levelSeen. */
export interface ServerLevel {
  level: Level;
  levelSeen: Level;
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

export type LevelNotice = { kind: "lowered"; from: Level; to: Level };

/** The calm one-time card: the Level went down since the user last saw it. A higher Level is the celebration instead (levelUp). */
export function levelNotice(state: Pick<CoachingState, "level" | "levelSeen">): LevelNotice | null {
  return state.level < state.levelSeen ? { kind: "lowered", from: state.levelSeen, to: state.level } : null;
}

/** The Level-up celebration plays once when the Level is above the one seen (0 → 1 too). No coach object is needed. */
export function levelUp(state: Pick<CoachingState, "level" | "levelSeen">): { from: Level; to: Level } | null {
  return state.level > state.levelSeen ? { from: state.levelSeen, to: state.level } : null;
}


/** The Level 0 card ("Có huấn luyện viên?") shows once, to a user with no coach. */
export function showLevelZeroHint(state: CoachingState): boolean {
  return state.role === "user" && state.coach === null && !state.hintSeen;
}

export function dismissLevelZeroHint(state: CoachingState): CoachingState {
  return { ...state, hintSeen: true };
}

/**
 * Live mode (NEXT_PUBLIC_API_MODE=live) has no coaching API yet: every coaching screen is hidden and the Level is 0.
 * The mock coach server is for mock and demo mode only.
 */
export function coachingAvailable(live: boolean): boolean {
  return !live;
}

/** The Level fields of the API's profile; undefined when it does not send `level` (an API from before migration 000021). */
export function serverLevelOf(raw: unknown): ServerLevel | undefined {
  if (typeof raw !== "object" || raw === null || typeof (raw as Record<string, unknown>).level !== "number") return undefined;
  const v = raw as Record<string, unknown>;
  return { level: toLevel(v.level), levelSeen: toLevel(v.levelSeen) };
}

/**
 * What the screens read. In live mode the role can only come from the API, which does not return it yet, so it is
 * "user" whatever the browser's stored profile holds (that is editable by the user), with no coach; the Level is the
 * API's (`server`) when it sends one, else 0.
 */
export function effectiveCoaching(state: CoachingState, live: boolean, server?: ServerLevel): CoachingState {
  if (coachingAvailable(live)) return state;
  return { ...state, role: "user", coach: null, level: server?.level ?? 0, levelSeen: server?.levelSeen ?? 0 };
}

/**
 * Where "seen at this Level" is written: the stored profile in mock mode; in live mode the profile's server Level, which the
 * next profile save sends as levelSeen. Null when there is nothing to write (live mode without the API's Level).
 */
export function seenPatch(state: CoachingState, live: boolean, server?: ServerLevel): { levelSeen: Level } | { serverLevel: ServerLevel } | null {
  if (!live) return { levelSeen: state.level };
  return server ? { serverLevel: { level: server.level, levelSeen: state.level } } : null;
}

/** Coach and admin see the client list. */
export function canManageClients(role: Role): boolean {
  return role === "coach" || role === "admin";
}

/** Only the admin sees the review queue. */
export function canReview(role: Role): boolean {
  return role === "admin";
}

/** A coach code as compared: upper case, spaces removed ("ab3d 5fgh" and "AB3D5FGH" are the same code). */
export function normaliseCode(input: string): string {
  return input.trim().toUpperCase().replace(/\s+/g, "");
}

/** A route parameter decoded; "" when it is not valid percent-encoding (a stray "%"), so a bad link is a not-found, not a crash. */
export function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return "";
  }
}
