import { describe, expect, it } from "vitest";
import { FEATURED_COACHES, getCoachById, filterCoachesBySpecialty, COACH_SPECIALTIES } from "../coaches";

describe("coaches", () => {
  it("provides active featured coaches list", () => {
    expect(FEATURED_COACHES.length).toBeGreaterThanOrEqual(3);
    const khanh = FEATURED_COACHES.find((c) => c.id === "coach-khanh");
    expect(khanh).toBeDefined();
    expect(khanh?.name).toBe("Lê Hồng Khánh");
    expect(khanh?.title).toContain("H1T");
  });

  it("retrieves a coach by id", () => {
    const coach = getCoachById("coach-ha");
    expect(coach).toBeDefined();
    expect(coach?.name).toBe("Nguyễn Thu Hà");
    expect(coach?.specialties).toContain("Dinh dưỡng nữ giới");
  });

  it("returns null for unknown coach id", () => {
    const coach = getCoachById("unknown-coach");
    expect(coach).toBeNull();
  });

  it("filters coaches by specialty", () => {
    const muscleCoaches = filterCoachesBySpecialty("Tăng cơ");
    expect(muscleCoaches.some((c) => c.name === "Lê Hồng Khánh")).toBe(true);

    const womenCoaches = filterCoachesBySpecialty("Dinh dưỡng nữ giới");
    expect(womenCoaches.some((c) => c.name === "Nguyễn Thu Hà")).toBe(true);
  });

  it("includes all main coach specialties", () => {
    expect(COACH_SPECIALTIES).toContain("Tất cả");
    expect(COACH_SPECIALTIES).toContain("Tăng cơ");
    expect(COACH_SPECIALTIES).toContain("Giảm mỡ bền vững");
  });
});
