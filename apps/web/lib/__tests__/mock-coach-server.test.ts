import { describe, expect, it } from "vitest";
import {
  CODE_LENGTH,
  MOCK_COACH_BASE,
  SEED_CLIENTS,
  clientById,
  codeFromBytes,
  findCoach,
  findCoachByCode,
  opaqueIdFor,
  parseClients,
  randomCode,
  withClientLevel,
  withCodes,
  withJoined,
  withoutClient,
} from "../mock-coach-server";

const COACHES = withCodes(MOCK_COACH_BASE, { "coach-khanh": "QWERTY2345" });

describe("coach directory", () => {
  it("has HLV Khánh, whose code is not made from the name", () => {
    expect(COACHES).toEqual([{ id: "coach-khanh", name: "HLV Khánh", code: "QWERTY2345" }]);
    const made = withCodes(MOCK_COACH_BASE, {});
    expect(made[0].code).toMatch(/^[A-Z2-9]{10}$/);
    expect(made[0].code.toUpperCase()).not.toContain("KHANH");
  });

  it("makes a random 10-character code once and keeps the stored one", () => {
    const stored: Record<string, string> = {};
    const first = withCodes(MOCK_COACH_BASE, stored)[0].code;
    expect(stored["coach-khanh"]).toBe(first);
    expect(withCodes(MOCK_COACH_BASE, stored)[0].code).toBe(first);
    // A damaged stored value is replaced, not trusted
    const bad = { "coach-khanh": "h1t-khanh" };
    expect(withCodes(MOCK_COACH_BASE, bad)[0].code).toMatch(/^[A-Z2-9]{10}$/);
    expect(new Set(Array.from({ length: 20 }, randomCode)).size).toBeGreaterThan(18);
    expect(randomCode()).toHaveLength(CODE_LENGTH);
  });

  it("turns bytes into symbols without 0, O, 1, I or L", () => {
    const code = codeFromBytes(Array.from({ length: 10 }, (_, i) => i * 25));
    expect(code).toHaveLength(10);
    expect(code).not.toMatch(/[01OIL]/);
  });

  it("finds a coach by code in any case, with spaces ignored", () => {
    expect(findCoachByCode("qwerty2345", COACHES)?.id).toBe("coach-khanh");
    expect(findCoachByCode("  QWERT Y2345 ", COACHES)?.id).toBe("coach-khanh");
    expect(findCoachByCode("H1T-KHANH", COACHES)).toBeNull();
    expect(findCoachByCode("", COACHES)).toBeNull();
    expect(findCoach("coach-khanh", COACHES)?.name).toBe("HLV Khánh");
    expect(findCoach("x", COACHES)).toBeNull();
  });
});

describe("opaque client ids", () => {
  it("gives each account a random id that is not its email, and keeps it", () => {
    const stored: Record<string, string> = {};
    const a = opaqueIdFor("an@example.com", stored);
    expect(a).toMatch(/^c-[a-z2-9]{10}$/);
    expect(a).not.toContain("example");
    expect(opaqueIdFor("an@example.com", stored)).toBe(a);
    expect(opaqueIdFor("binh@example.com", stored)).not.toBe(a);
  });
});

describe("clients", () => {
  it("starts with four mock clients, Levels 1 to 5 and one who never logged", () => {
    expect(SEED_CLIENTS).toHaveLength(4);
    expect(SEED_CLIENTS.every((c) => c.level >= 1 && c.level <= 5)).toBe(true);
    expect(SEED_CLIENTS.some((c) => c.lastLoggedDaysAgo === null)).toBe(true);
  });

  it("reads the seed when nothing or garbage is stored", () => {
    expect(parseClients(null)).toEqual(SEED_CLIENTS);
    expect(parseClients("not json")).toEqual(SEED_CLIENTS);
    expect(parseClients("{}")).toEqual(SEED_CLIENTS);
  });

  it("keeps stored clients and drops bad rows", () => {
    const raw = JSON.stringify([{ ...SEED_CLIENTS[0], level: 5 }, { id: "x", name: "y", level: 9, lastLoggedDaysAgo: 0 }]);
    expect(parseClients(raw)).toEqual([{ ...SEED_CLIENTS[0], level: 5 }]);
  });

  it("changes one client's Level, clamped to 1 to 5, and leaves the rest", () => {
    const next = withClientLevel(SEED_CLIENTS, "client-2", 5);
    expect(clientById(next, "client-2")?.level).toBe(5);
    expect(clientById(next, "client-1")?.level).toBe(2);
    expect(clientById(withClientLevel(SEED_CLIENTS, "client-2", 9), "client-2")?.level).toBe(5);
    expect(clientById(withClientLevel(SEED_CLIENTS, "client-2", 0), "client-2")?.level).toBe(1);
    expect(SEED_CLIENTS[1].level).toBe(1);
  });

  it("a user who joins is added at Level 1, once", () => {
    const once = withJoined(SEED_CLIENTS, { id: "me", name: "Học viên A" });
    expect(clientById(once, "me")).toMatchObject({ level: 1, name: "Học viên A" });
    expect(withJoined(withClientLevel(once, "me", 3), { id: "me", name: "Học viên A" }).filter((c) => c.id === "me")).toHaveLength(1);
    expect(clientById(withJoined(withClientLevel(once, "me", 3), { id: "me", name: "Học viên A" }), "me")?.level).toBe(3);
  });

  it("removes a client who leaves", () => {
    const once = withJoined(SEED_CLIENTS, { id: "me", name: "Học viên A" });
    expect(clientById(withoutClient(once, "me"), "me")).toBeNull();
  });
});
