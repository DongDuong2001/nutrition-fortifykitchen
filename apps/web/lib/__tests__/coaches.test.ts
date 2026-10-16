import { describe, expect, it } from "vitest";
import {
  FEATURED_COACHES,
  getCoachById,
  filterCoachesBySpecialty,
  COACH_SPECIALTIES,
} from "../coaches";

describe("coaches", () => {
  it("provides active featured coaches list", () => {
    expect(FEATURED_COACHES.length).toBeGreaterThanOrEqual(3);
    const khanh = FEATURED_COACHES.find((c) => c.id === "coach-khanh");
    expect(khanh).toBeDefined();
    expect(khanh?.name).toBe("Lê Hồng Khánh");
    expect(khanh?.title).toContain("H1T");
  });

  it("claims no credentials, years or client counts that nobody has supplied", () => {
    for (const c of FEATURED_COACHES) {
      expect(c.credentials, c.id).toEqual([]);
      expect(c.experienceYears, c.id).toBeUndefined();
      expect(c.clientsHelped, c.id).toBeUndefined();
      expect(c.social, c.id).toEqual({});
    }
    // Khánh's specialties wait for the real ones too
    expect(getCoachById("coach-khanh")?.specialties).toEqual([]);
  });

  it("names the sample coaches as placeholders, not as people", () => {
    expect(getCoachById("coach-ha")?.name).toBe("HLV Demo A");
    expect(getCoachById("coach-duc")?.name).toBe("HLV Demo B");
  });

  it("retrieves a coach by id", () => {
    const coach = getCoachById("coach-ha");
    expect(coach).toBeDefined();
    expect(coach?.specialties).toContain("Dinh dưỡng nữ giới");
  });

  it("returns null for unknown coach id", () => {
    const coach = getCoachById("unknown-coach");
    expect(coach).toBeNull();
  });

  it("filters coaches by specialty", () => {
    const muscleCoaches = filterCoachesBySpecialty("Tăng cơ");
    expect(muscleCoaches.some((c) => c.id === "coach-duc")).toBe(true);
    expect(muscleCoaches.some((c) => c.id === "coach-khanh")).toBe(false);
    expect(filterCoachesBySpecialty("Tất cả").some((c) => c.id === "coach-khanh")).toBe(true);

    const womenCoaches = filterCoachesBySpecialty("Dinh dưỡng nữ giới");
    expect(womenCoaches.some((c) => c.id === "coach-ha")).toBe(true);
  });

  it("includes all main coach specialties", () => {
    expect(COACH_SPECIALTIES).toContain("Tất cả");
    expect(COACH_SPECIALTIES).toContain("Tăng cơ");
    expect(COACH_SPECIALTIES).toContain("Giảm mỡ bền vững");
  });
});
