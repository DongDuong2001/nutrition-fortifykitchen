import { describe, it, expect } from "vitest";
import { PERMANENT_REDIRECTS, redirectTarget } from "../redirects";

describe("lib/redirects", () => {
  it("lists the IA-v2 redirects as permanent; Nhật ký (/diary) and /today both land on Hôm nay (/app)", () => {
    expect(PERMANENT_REDIRECTS).toEqual([
      { source: "/today", destination: "/app", permanent: true },
      { source: "/diary", destination: "/app", permanent: true },
      { source: "/profile", destination: "/settings/profile", permanent: true },
      { source: "/profile/weight", destination: "/settings/profile/weight", permanent: true },
      { source: "/foods", destination: "/explore", permanent: true },
      { source: "/login", destination: "/signin", permanent: true },
    ]);
  });

  it("maps the old routes to the new ones", () => {
    expect(redirectTarget("/today")).toBe("/app");
    expect(redirectTarget("/diary")).toBe("/app");
    expect(redirectTarget("/profile")).toBe("/settings/profile");
    expect(redirectTarget("/profile/weight")).toBe("/settings/profile/weight");
    expect(redirectTarget("/foods")).toBe("/explore");
    expect(redirectTarget("/login")).toBe("/signin");
  });

  it("keeps the query string, so a past day lands on Hôm nay for that day", () => {
    expect(redirectTarget("/diary?date=2026-10-10")).toBe("/app?date=2026-10-10");
    expect(redirectTarget("/today?date=2026-10-10")).toBe("/app?date=2026-10-10");
    expect(redirectTarget("/foods?q=trung")).toBe("/explore?q=trung");
  });

  it("matches exact routes only", () => {
    expect(redirectTarget("/foods/egg")).toBeNull();
    expect(redirectTarget("/foods/new")).toBeNull();
    expect(redirectTarget("/todayx")).toBeNull();
    expect(redirectTarget("/diaryx")).toBeNull();
    expect(redirectTarget("/diary/anything")).toBeNull();
    expect(redirectTarget("/settings/profile")).toBeNull();
  });

  it("tolerates a trailing slash", () => {
    expect(redirectTarget("/today/")).toBe("/app");
    expect(redirectTarget("/diary/")).toBe("/app");
  });

  it("has no redirect loops: no destination is itself a source", () => {
    const sources = new Set<string>(PERMANENT_REDIRECTS.map((r) => r.source));
    for (const r of PERMANENT_REDIRECTS) expect(sources.has(r.destination)).toBe(false);
  });
});
