import { NO_COACHING, toLevel, type CoachRef, type CoachingState, type Level, type Role } from "./coaching-link";

/**
 * Demo mode only: ?as=user0|user2|coach|admin picks one of the four mock accounts and ?level=0..5 overrides the
 * Level. The result is written into the demo profile once, at load, so the app then behaves as that account
 * (leaving the coach or a new Level from the coach still work). Outside demo mode these parameters do nothing.
 *
 * MOCK ACCOUNTS (the real roles come from nutrition.profiles.role on the server):
 *   user0  a user with no coach, Level 0 (the default)
 *   user2  a user followed by HLV Khánh, Level 2
 *   coach  HLV Khánh's own account
 *   admin  an admin
 */
export const MOCK_COACH: CoachRef = { id: "coach-khanh", name: "HLV Khánh" };

export type Persona = "user0" | "user2" | "coach" | "admin";
const PERSONAS: readonly Persona[] = ["user0", "user2", "coach", "admin"];

function personaOf(value: string | null): Persona | null {
  return PERSONAS.find((p) => p === value) ?? null;
}

function levelOf(value: string | null): Level | null {
  if (value === null || !/^[0-5]$/.test(value)) return null;
  return toLevel(Number(value));
}

/** What a mock account carries beyond the coaching state: the name the share image shows. */
export type PersonaPatch = CoachingState & { displayName?: string };

const NAMES: Record<Persona, string> = { user0: "Học viên A", user2: "Học viên B", coach: "HLV Demo", admin: "Admin Demo" };

const state = (role: Role, level: Level): CoachingState => ({
  role,
  level,
  coach: level > 0 ? MOCK_COACH : null,
  levelSeen: level,
  hintSeen: false,
});

/**
 * The coaching fields a URL asks for, or null when it asks for nothing. `as` sets the whole state; `level` then
 * sets the Level (0 = no coach). A Level override is marked seen, so no one-time card covers the screen.
 */
export function personaPatch(search: string, live = false): PersonaPatch | null {
  // Live mode: the role and Level come from the API only, never from the URL
  if (live) return null;
  const params = new URLSearchParams(search);
  const persona = personaOf(params.get("as"));
  const level = levelOf(params.get("level"));
  if (persona === null && level === null) return null;
  let next: CoachingState = NO_COACHING;
  if (persona === "user2") next = state("user", 2);
  else if (persona === "coach") next = state("coach", 0);
  else if (persona === "admin") next = state("admin", 0);
  if (level !== null) next = { ...state(next.role, level), role: next.role };
  // ?as= gives the account its name; ?level= alone keeps whatever name the profile has
  return persona === null ? next : { ...next, displayName: NAMES[persona] };
}
