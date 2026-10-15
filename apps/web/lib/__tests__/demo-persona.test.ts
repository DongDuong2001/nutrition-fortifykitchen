import { describe, expect, it } from "vitest";
import { personaPatch } from "../demo-persona";

describe("personaPatch", () => {
  it("asks for nothing without the parameters", () => {
    expect(personaPatch("")).toBeNull();
    expect(personaPatch("?date=2026-10-14")).toBeNull();
    expect(personaPatch("?as=owner&level=9")).toBeNull();
  });

  it("the four mock accounts", () => {
    expect(personaPatch("?as=user0")).toMatchObject({ role: "user", level: 0, coach: null });
    expect(personaPatch("?as=user2")).toMatchObject({ role: "user", level: 2, coach: { id: "coach-khanh" }, levelSeen: 2 });
    expect(personaPatch("?as=coach")).toMatchObject({ role: "coach", level: 0, coach: null });
    expect(personaPatch("?as=admin")).toMatchObject({ role: "admin" });
  });

  it("?level= sets the Level, with the coach, and marks it seen", () => {
    expect(personaPatch("?level=3")).toMatchObject({ role: "user", level: 3, levelSeen: 3, coach: { name: "HLV Khánh" } });
    expect(personaPatch("?level=0")).toMatchObject({ level: 0, coach: null });
    expect(personaPatch("?level=5&as=user0")).toMatchObject({ level: 5, role: "user" });
  });

  it("the Level keeps the role of the account asked for", () => {
    expect(personaPatch("?as=coach&level=2")).toMatchObject({ role: "coach", level: 2 });
  });

  it("every state it returns keeps Level 0 if and only if no coach", () => {
    for (const q of ["?level=0", "?level=1", "?level=5", "?as=user2", "?as=coach", "?as=admin&level=4"]) {
      const s = personaPatch(q)!;
      expect(s.level === 0).toBe(s.coach === null);
    }
  });
});
