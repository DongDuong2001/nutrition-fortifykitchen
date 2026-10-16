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

/** The mock coaches without their codes: a code is made once per browser (readCoaches), never derived from the name. */
export const MOCK_COACH_BASE: ReadonlyArray<Omit<MockCoach, "code">> = [{ id: "coach-khanh", name: "HLV Khánh" }];

export const SEED_CLIENTS: MockClient[] = [
  { id: "client-1", name: "Học viên A", level: 2, lastLoggedDaysAgo: 0 },
  { id: "client-2", name: "Học viên B", level: 1, lastLoggedDaysAgo: 1 },
  { id: "client-3", name: "Học viên C", level: 4, lastLoggedDaysAgo: 0 },
  { id: "client-4", name: "Học viên D", level: 3, lastLoggedDaysAgo: null },
];

export const CLIENTS_KEY = "h1t_mock_coach_clients_v1";
export const CODES_KEY = "h1t_mock_coach_codes_v1";
export const CLIENT_IDS_KEY = "h1t_mock_client_ids_v1";

export const CODE_LENGTH = 10;
// No 0, O, 1, I or L: a code read aloud or copied by hand stays unambiguous.
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** A code of CODE_LENGTH symbols from random bytes (one byte each). Pure; `randomBytes` supplies the bytes. */
export function codeFromBytes(bytes: ArrayLike<number>): string {
  return Array.from({ length: CODE_LENGTH }, (_, i) => CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length]).join("");
}

export function randomBytes(n: number): Uint8Array {
  const out = new Uint8Array(n);
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") crypto.getRandomValues(out);
  else for (let i = 0; i < n; i++) out[i] = Math.floor(Math.random() * 256);
  return out;
}

export const randomCode = (): string => codeFromBytes(randomBytes(CODE_LENGTH));

/** The coaches with a code each: the stored code, or a new random one (written back in `stored`) when missing. */
export function withCodes(
  base: ReadonlyArray<Omit<MockCoach, "code">>,
  stored: Record<string, string>,
  make: () => string = randomCode
): MockCoach[] {
  return base.map((c) => {
    const code = stored[c.id] && /^[A-Z0-9]{10}$/.test(stored[c.id]) ? stored[c.id] : (stored[c.id] = make());
    return { ...c, code };
  });
}

/** An opaque id for a user on this server: new random one when the key has none. Never built from an email. */
export function opaqueIdFor(key: string, stored: Record<string, string>, make: () => string = () => `c-${randomCode().toLowerCase()}`): string {
  return (stored[key] ??= make());
}

function readMap(key: string): Record<string, string> {
  try {
    const parsed: unknown = JSON.parse(serverStorage().getItem(key) ?? "{}");
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed) ? (parsed as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function writeMap(key: string, map: Record<string, string>): void {
  try {
    serverStorage().setItem(key, JSON.stringify(map));
  } catch {
    // Storage blocked: the code lasts for this page view only
  }
}

/** The mock coaches with their codes, made on first use and kept. Client only. */
export function readCoaches(): MockCoach[] {
  const stored = readMap(CODES_KEY);
  const before = JSON.stringify(stored);
  const coaches = withCodes(MOCK_COACH_BASE, stored);
  if (JSON.stringify(stored) !== before) writeMap(CODES_KEY, stored);
  return coaches;
}

/** This account's id on the mock server: random and opaque, so the email never reaches a URL. Client only. */
export function clientIdFor(account: string | null): string {
  const stored = readMap(CLIENT_IDS_KEY);
  const key = account ?? "me";
  const had = key in stored;
  const id = opaqueIdFor(key, stored);
  if (!had) writeMap(CLIENT_IDS_KEY, stored);
  return id;
}

/** The coach whose code this is (any case, spaces ignored), or null. */
export function findCoachByCode(code: string, coaches: readonly MockCoach[] = readCoaches()): MockCoach | null {
  const wanted = code.trim().toUpperCase().replace(/\s+/g, "");
  if (wanted === "") return null;
  return coaches.find((c) => c.code === wanted) ?? null;
}

export function findCoach(id: string, coaches: readonly MockCoach[] = readCoaches()): MockCoach | null {
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
