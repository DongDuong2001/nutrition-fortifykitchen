import { describe, expect, it } from "vitest";
import { MOCK_COACHES, SEED_CLIENTS, clientById, findCoach, findCoachByCode, parseClients, withClientLevel, withJoined, withoutClient } from "../mock-coach-server";

describe("coach directory", () => {
  it("has HLV Khánh with the code H1T-KHANH", () => {
    expect(MOCK_COACHES).toEqual([{ id: "coach-khanh", name: "HLV Khánh", code: "H1T-KHANH" }]);
  });

  it("finds a coach by code in any case, with spaces ignored", () => {
    expect(findCoachByCode("h1t-khanh")?.id).toBe("coach-khanh");
    expect(findCoachByCode("  H1T- KHANH ")?.id).toBe("coach-khanh");
    expect(findCoachByCode("H1T-NOPE")).toBeNull();
    expect(findCoachByCode("")).toBeNull();
    expect(findCoach("coach-khanh")?.name).toBe("HLV Khánh");
    expect(findCoach("x")).toBeNull();
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
    const once = withJoined(SEED_CLIENTS, { id: "me", name: "Hào" });
    expect(clientById(once, "me")).toMatchObject({ level: 1, name: "Hào" });
    expect(withJoined(withClientLevel(once, "me", 3), { id: "me", name: "Hào" }).filter((c) => c.id === "me")).toHaveLength(1);
    expect(clientById(withJoined(withClientLevel(once, "me", 3), { id: "me", name: "Hào" }), "me")?.level).toBe(3);
  });

  it("removes a client who leaves", () => {
    const once = withJoined(SEED_CLIENTS, { id: "me", name: "Hào" });
    expect(clientById(withoutClient(once, "me"), "me")).toBeNull();
  });
});
