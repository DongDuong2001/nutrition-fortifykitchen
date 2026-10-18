import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// cc-58: what the middleware asks Supabase for, and when. The live flows (sign-in, refresh after expiry, sign-out, an API
// call after the refresh) need a real project: they are listed in the night report for a check on staging.
const calls: string[] = [];
let session: { access_token: string; expires_at: number } | null = null;

vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: {
      getClaims: async () => {
        calls.push("getClaims");
        return { data: null, error: null };
      },
      getUser: async () => {
        calls.push("getUser");
        return { data: null, error: null };
      },
      getSession: async () => {
        calls.push("getSession");
        return { data: { session } };
      },
    },
  }),
}));

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://abc.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";

const { middleware, config } = await import("../../middleware");

const request = (cookie: string, headers: Record<string, string> = {}) =>
  new NextRequest("http://localhost/app", { headers: { cookie, ...headers } });
const setCookies = (res: Response) => res.headers.getSetCookie();

beforeEach(() => {
  calls.length = 0;
  session = null;
});

describe("middleware (cc-58)", () => {
  it("no Supabase call for a visitor with no session cookie", async () => {
    await middleware(request(""));
    expect(calls).toEqual([]);
  });

  it("and the API token cookie of a session that is gone is deleted", async () => {
    const res = await middleware(request("sb-access-token=old"));
    expect(calls).toEqual([]);
    expect(setCookies(res).join(";")).toMatch(/sb-access-token=;/);
  });

  it("a prefetch makes no Supabase call, even with a session", async () => {
    await middleware(request("sb-abc-auth-token=x", { "next-router-prefetch": "1" }));
    await middleware(request("sb-abc-auth-token=x", { purpose: "prefetch" }));
    expect(calls).toEqual([]);
  });

  it("with a session cookie: verifies with getClaims (never getUser) and issues the API token cookie from the session", async () => {
    session = { access_token: "jwt-123", expires_at: Math.floor(Date.now() / 1000) + 1800 };
    const res = await middleware(request("sb-abc-auth-token=x"));
    expect(calls).toEqual(["getClaims", "getSession"]);
    const cookie = setCookies(res).find((c) => c.startsWith("sb-access-token="));
    expect(cookie).toMatch(/sb-access-token=jwt-123/);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/Max-Age=1[78]\d\d/);
  });

  it("with a session cookie but no session left: the API token cookie is removed", async () => {
    const res = await middleware(request("sb-abc-auth-token.0=x; sb-access-token=stale"));
    expect(calls).toEqual(["getClaims", "getSession"]);
    expect(setCookies(res).join(";")).toMatch(/sb-access-token=;/);
  });

  it("chunked session cookies count as a session", async () => {
    await middleware(request("sb-abc-auth-token.1=x"));
    expect(calls[0]).toBe("getClaims");
  });

  it("the public pages are outside the matcher", () => {
    const re = new RegExp(`^${config.matcher[0]}$`);
    for (const path of ["/landing", "/terms", "/privacy", "/offline", "/install"]) expect([path, re.test(path)]).toEqual([path, false]);
    for (const path of ["/app", "/trends", "/add", "/signin", "/settings/profile", "/"]) expect([path, re.test(path)]).toEqual([path, true]);
  });
});
