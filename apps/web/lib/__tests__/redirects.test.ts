import { describe, it, expect } from "vitest";
import { PERMANENT_REDIRECTS, redirectTarget } from "../redirects";

describe("lib/redirects", () => {
  it("lists the five IA-v2 redirects as permanent", () => {
    expect(PERMANENT_REDIRECTS).toEqual([
      { source: "/today", destination: "/diary", permanent: true },
      { source: "/profile", destination: "/settings/profile", permanent: true },
      { source: "/profile/weight", destination: "/settings/profile/weight", permanent: true },
      { source: "/foods", destination: "/explore", permanent: true },
      { source: "/login", destination: "/signin", permanent: true },
    ]);
  });

  it("maps the old routes to the new ones", () => {
    expect(redirectTarget("/today")).toBe("/diary");
    expect(redirectTarget("/profile")).toBe("/settings/profile");
    expect(redirectTarget("/profile/weight")).toBe("/settings/profile/weight");
    expect(redirectTarget("/foods")).toBe("/explore");
    expect(redirectTarget("/login")).toBe("/signin");
  });

  it("keeps the query string", () => {
    expect(redirectTarget("/today?date=2026-10-10")).toBe("/diary?date=2026-10-10");
    expect(redirectTarget("/foods?q=trung")).toBe("/explore?q=trung");
  });

  it("matches exact routes only", () => {
    expect(redirectTarget("/foods/egg")).toBeNull();
    expect(redirectTarget("/foods/new")).toBeNull();
    expect(redirectTarget("/todayx")).toBeNull();
    expect(redirectTarget("/diary")).toBeNull();
    expect(redirectTarget("/settings/profile")).toBeNull();
  });

  it("tolerates a trailing slash", () => {
    expect(redirectTarget("/today/")).toBe("/diary");
  });

  it("has no redirect loops: no destination is itself a source", () => {
    const sources = new Set<string>(PERMANENT_REDIRECTS.map((r) => r.source));
    for (const r of PERMANENT_REDIRECTS) expect(sources.has(r.destination)).toBe(false);
  });
});
