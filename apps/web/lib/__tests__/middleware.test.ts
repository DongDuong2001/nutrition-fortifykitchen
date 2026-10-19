import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// cc-58: what the middleware asks Supabase for, and when. The live flows (sign-in, refresh after expiry, sign-out, an API
// call after the refresh) need a real project: they are listed in the night report for a check on staging.
const calls: string[] = [];
let session: { access_token: string; expires_at: number } | null = null;
// What getClaims answers: verified claims (with the token's own exp), a failed check, or no session
let claimsAnswer: { data: { claims: { exp: number } } | null; error: Error | null } = { data: null, error: null };

vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: {
      getClaims: async () => {
        calls.push("getClaims");
        return claimsAnswer;
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
  claimsAnswer = { data: null, error: null };
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

  it("with a session cookie: verifies with getClaims (never getUser) and issues the API token cookie, living as long as the claims' exp", async () => {
    session = { access_token: "jwt-123", expires_at: Math.floor(Date.now() / 1000) + 9999 };
    claimsAnswer = { data: { claims: { exp: Math.floor(Date.now() / 1000) + 1800 } }, error: null };
    const res = await middleware(request("sb-abc-auth-token=x"));
    expect(calls).toEqual(["getClaims", "getSession"]);
    const cookie = setCookies(res).find((c) => c.startsWith("sb-access-token="));
    expect(cookie).toMatch(/sb-access-token=jwt-123/);
    expect(cookie).toMatch(/HttpOnly/i);
    // From claims.exp (about 1.800 s), not from the session's expires_at (9.999 s)
    expect(cookie).toMatch(/Max-Age=1[78]\d\d/);
  });

  it("a failed getClaims issues no API token cookie, and removes one that is there (cc-63, X3)", async () => {
    session = { access_token: "forged", expires_at: Math.floor(Date.now() / 1000) + 1800 };
    claimsAnswer = { data: null, error: new Error("Invalid JWT signature") };
    const none = await middleware(request("sb-abc-auth-token=x"));
    expect(calls).toEqual(["getClaims"]);
    expect(setCookies(none).find((c) => c.startsWith("sb-access-token="))).toBeUndefined();
    const stale = await middleware(request("sb-abc-auth-token=x; sb-access-token=old"));
    expect(setCookies(stale).join(";")).toMatch(/sb-access-token=;/);
  });

  it("claims without an exp are not trusted either", async () => {
    session = { access_token: "jwt-123", expires_at: Math.floor(Date.now() / 1000) + 1800 };
    claimsAnswer = { data: { claims: {} as { exp: number } }, error: null };
    const res = await middleware(request("sb-abc-auth-token=x"));
    expect(setCookies(res).find((c) => c.startsWith("sb-access-token="))).toBeUndefined();
  });

  it("with a session cookie but no session left: the API token cookie is removed", async () => {
    const res = await middleware(request("sb-abc-auth-token.0=x; sb-access-token=stale"));
    expect(calls).toEqual(["getClaims"]);
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

  it("the public names are anchored: a page below them is outside, a longer name is not (cc-63, X4)", () => {
    const re = new RegExp(`^${config.matcher[0]}$`);
    for (const path of ["/terms/", "/terms/x", "/landing/pricing", "/install/ios", "/icons/icon-192.png", "/privacy", "/offline"]) {
      expect([path, re.test(path)]).toEqual([path, false]);
    }
    for (const path of ["/installer", "/terms-x", "/termsx", "/landing-page", "/privacy-policy", "/offlined", "/iconsx", "/installation/x"]) {
      expect([path, re.test(path)]).toEqual([path, true]);
    }
  });
});
