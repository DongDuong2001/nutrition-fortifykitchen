import { serverStorage } from "./mock-store";

/**
 * MOCK COACH SERVER: stands in for Dong's backend until it exists (see OPEN_QUESTIONS: coach_clients, invite codes,
 * POST /coaches/join, DELETE /coaches/link, GET /coach/clients, PATCH /coach/clients/{id}). It keeps the coach
 * directory and each coach's clients in this browser's localStorage so the Level flow can be walked end to end.
 * Delete this file when the API replaces it; the screens only call the functions below.
 */
export interface MockCoach {
  id: string;
  name: string;
  /** The invite code the coach hands out. */
  code: string;
}

export interface MockClient {
  id: string;
  name: string;
  level: 1 | 2 | 3 | 4 | 5;
  /** Whole days since the client last logged a food; null = never. */
  lastLoggedDaysAgo: number | null;
}

export const MOCK_COACHES: MockCoach[] = [{ id: "coach-khanh", name: "HLV Khánh", code: "H1T-KHANH" }];

export const SEED_CLIENTS: MockClient[] = [
  { id: "client-1", name: "Nguyễn Minh Anh", level: 2, lastLoggedDaysAgo: 0 },
  { id: "client-2", name: "Trần Quốc Bảo", level: 1, lastLoggedDaysAgo: 1 },
  { id: "client-3", name: "Lê Thu Hà", level: 4, lastLoggedDaysAgo: 0 },
  { id: "client-4", name: "Phạm Gia Huy", level: 3, lastLoggedDaysAgo: null },
];

export const CLIENTS_KEY = "h1t_mock_coach_clients_v1";

/** The coach whose code this is (any case, spaces ignored), or null. */
export function findCoachByCode(code: string, coaches: readonly MockCoach[] = MOCK_COACHES): MockCoach | null {
  const wanted = code.trim().toUpperCase().replace(/\s+/g, "");
  return coaches.find((c) => c.code === wanted) ?? null;
}

export function findCoach(id: string, coaches: readonly MockCoach[] = MOCK_COACHES): MockCoach | null {
  return coaches.find((c) => c.id === id) ?? null;
}

function isClient(value: unknown): value is MockClient {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.name === "string" &&
    typeof v.level === "number" &&
    Number.isInteger(v.level) &&
    v.level >= 1 &&
    v.level <= 5 &&
    (v.lastLoggedDaysAgo === null || (typeof v.lastLoggedDaysAgo === "number" && v.lastLoggedDaysAgo >= 0))
  );
}

/** The stored clients; nothing stored (or unreadable) gives the four mock clients. */
export function parseClients(raw: string | null): MockClient[] {
  if (!raw) return SEED_CLIENTS.map((c) => ({ ...c }));
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.filter(isClient);
  } catch {
    // Fall through to the seed
  }
  return SEED_CLIENTS.map((c) => ({ ...c }));
}

/** A client list with one client's Level changed (1 to 5). Unknown id: the same list. */
export function withClientLevel(list: readonly MockClient[], id: string, level: number): MockClient[] {
  const next = Math.min(5, Math.max(1, Math.round(level))) as MockClient["level"];
  return list.map((c) => (c.id === id ? { ...c, level: next } : c));
}

/** The client list with a user who joined added at Level 1 (once; joining again keeps the Level). */
export function withJoined(list: readonly MockClient[], user: { id: string; name: string }): MockClient[] {
  if (list.some((c) => c.id === user.id)) return [...list];
  return [...list, { id: user.id, name: user.name, level: 1, lastLoggedDaysAgo: 0 }];
}

export function withoutClient(list: readonly MockClient[], id: string): MockClient[] {
  return list.filter((c) => c.id !== id);
}

export function clientById(list: readonly MockClient[], id: string): MockClient | null {
  return list.find((c) => c.id === id) ?? null;
}

// ---- storage (client only) ----

export function readClients(): MockClient[] {
  try {
    return parseClients(serverStorage().getItem(CLIENTS_KEY));
  } catch {
    return parseClients(null);
  }
}

export function writeClients(list: MockClient[]): void {
  try {
    serverStorage().setItem(CLIENTS_KEY, JSON.stringify(list));
  } catch {
    // Storage blocked: the change lasts for this page view only
  }
}
