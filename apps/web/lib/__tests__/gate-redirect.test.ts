import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Live mode, a mocked Supabase client: the session that Google's callback leaves in cookies has no email in
// localStorage yet. The gate (gateRedirect) and the sign-in page (homeIfSignedIn) must still see the account.
const getUser = vi.hoisted(() => vi.fn());
const signOutCalls = vi.hoisted(() => ({ calls: [] as unknown[], globalFails: false, signInWithOAuth: vi.fn() }));
vi.mock("../supabase-client", () => ({
  createClient: () => ({
    auth: {
      getUser,
      signOut: async (options?: { scope?: string }) => {
        signOutCalls.calls.push(options);
        if (signOutCalls.globalFails && options?.scope !== "local") throw new Error("network");
        return { error: null };
      },
      signInWithOAuth: signOutCalls.signInWithOAuth,
      signInWithPassword: async () => ({ data: { user }, error: null }),
    },
  }),
}));

function memory() {
  const data: Record<string, string> = {};
  return {
    data,
    getItem: (k: string) => (k in data ? data[k] : null),
    setItem: (k: string, v: string) => void (data[k] = v),
    removeItem: (k: string) => void delete data[k],
  };
}

const EMAIL = "new.user@example.com";
const user = { email: "New.User@Example.com", app_metadata: { provider: "google", providers: ["google"] }, user_metadata: {}, identities: [{ provider: "google" }] };

let desktopNow = false;
// matchMedia answers the viewport once per call: it reads desktopNow when the gate asks, so a later change is a resize
function setViewport(desktop: boolean, local = memory()) {
  desktopNow = desktop;
  vi.stubGlobal("window", {
    localStorage: local,
    sessionStorage: memory(),
    location: { search: "" },
    matchMedia: (query: string) => ({ matches: query === "(min-width: 1024px)" && desktopNow }),
  });
}

describe("the sign-in gate with a session that only Supabase knows", () => {
  let local: ReturnType<typeof memory>;
  let gate: typeof import("../first-run");

  beforeEach(async () => {
    vi.resetModules();
    getUser.mockReset();
    signOutCalls.calls = [];
    signOutCalls.globalFails = false;
    signOutCalls.signInWithOAuth.mockReset().mockResolvedValue({ error: null });
    local = memory();
    vi.stubEnv("NEXT_PUBLIC_API_MODE", "live");
    vi.stubGlobal("localStorage", local);
    setViewport(false, local);
    gate = await import("../first-run");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  const withProfile = () => local.setItem(`h1t_profile_v1_${EMAIL}`, JSON.stringify({ sex: "male", birthYear: 2003, weightKg: 65, goal: "maintain", periodMode: false, trainingMinutesDefault: 60 }));

  it("(a) empty storage and a valid session: the gate lets the user through and keeps the email", async () => {
    getUser.mockResolvedValue({ data: { user }, error: null });
    withProfile();
    expect(await gate.gateRedirect("/", false)).toBeNull();
    expect(local.getItem("h1t_auth_current_email")).toBe(EMAIL);
  });

  it("(b) no session: /signin", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect(await gate.gateRedirect("/", false)).toBe("/signin");
    expect(local.getItem("h1t_auth_current_email")).toBeNull();
  });

  it("(b3) a desktop Google-OAuth return with empty localStorage stays on / (the landing never takes a live session)", async () => {
    setViewport(true, local);
    getUser.mockResolvedValue({ data: { user }, error: null });
    withProfile();
    expect(await gate.gateRedirect("/", false)).toBeNull();
    expect(local.getItem("h1t_auth_current_email")).toBe(EMAIL);
  });

  it("(b4) a signed-out desktop visitor goes to /landing, a signed-out phone to /signin", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });
    setViewport(true, local);
    expect(await gate.gateRedirect("/", false)).toBe("/landing");
    setViewport(false, local);
    expect(await gate.gateRedirect("/", false)).toBe("/signin");
  });

  it("(b5) only the root goes to /landing: another tab route on desktop is /signin", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });
    setViewport(true, local);
    expect(await gate.gateRedirect("/explore", false)).toBe("/signin");
  });

  it("(b6) the viewport is read once per call, so a resize after the check never changes the route", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });
    setViewport(true, local);
    const pending = gate.gateRedirect("/", false);
    setViewport(false, local); // the window shrinks while Supabase is answering
    expect(await pending).toBe("/landing");
  });

  it("(b7) /setup never opens without a session in live mode, and does with one", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect(await gate.gateRedirect("/setup/profile", false)).toBe("/signin");
    getUser.mockResolvedValue({ data: { user }, error: null });
    expect(await gate.gateRedirect("/setup/profile", false)).toBeNull();
    expect(await gate.gateRedirect("/setup/done", true)).toBeNull();
  });

  it("(b2) Supabase failing to answer is /signin, not a stuck gate", async () => {
    getUser.mockRejectedValue(new Error("offline"));
    expect(await gate.gateRedirect("/", false)).toBe("/signin");
  });

  it("(c) after Đăng xuất a surviving session is not adopted: /signin, and the flag stays until an explicit sign-in", async () => {
    local.setItem("h1t_auth_signed_out", "true");
    getUser.mockResolvedValue({ data: { user }, error: null });
    withProfile();
    expect(await gate.gateRedirect("/explore", false)).toBe("/signin");
    expect(local.getItem("h1t_auth_signed_out")).toBe("true");
    expect(local.getItem("h1t_auth_current_email")).toBeNull();
    expect(getUser).not.toHaveBeenCalled();
    // An explicit sign-in (the password form stores the email) clears the flag; then the same session passes
    const { signInWithPassword } = await import("../auth-actions");
    expect(await signInWithPassword("new.user@example.com", "abcdef12")).toEqual({ ok: true });
    expect(local.getItem("h1t_auth_signed_out")).toBeNull();
    expect(await gate.gateRedirect("/explore", false)).toBeNull();
    expect(local.getItem("h1t_auth_current_email")).toBe(EMAIL);
  });

  it("(d) no profile and a valid session: a first-time Google user goes to /setup/profile, not /", async () => {
    getUser.mockResolvedValue({ data: { user }, error: null });
    expect(await gate.gateRedirect("/", false)).toBe("/setup/profile");
    expect(await gate.gateRedirect("/add", false)).toBe("/setup/profile");
  });

  it("resolves the account BEFORE deciding setup: the profile is read under the email's keys, never unscoped", async () => {
    const events: string[] = [];
    const setItem = local.setItem;
    local.setItem = (k, v) => {
      if (k === "h1t_auth_current_email") events.push(`email stored: ${v}`);
      setItem(k, v);
    };
    const getItem = local.getItem;
    local.getItem = (k) => {
      if (k.startsWith("h1t_profile_v1")) events.push(`read ${k}`);
      return getItem(k);
    };
    getUser.mockImplementation(async () => {
      events.push("getUser");
      return { data: { user }, error: null };
    });
    expect(await gate.gateRedirect("/", false)).toBe("/setup/profile");
    expect(events[0]).toBe("getUser");
    expect(events[1]).toBe(`email stored: ${EMAIL}`);
    // Every profile read comes after the email is stored; the one an account's setup needs is its own key (the bare
    // key is read once to move an old unscoped profile to the account, which is the migration, not a lookup)
    const reads = events.filter((e) => e.startsWith("read "));
    expect(reads).toContain(`read h1t_profile_v1_${EMAIL}`);
    for (const read of reads) expect(events.indexOf(read)).toBeGreaterThan(1);
    expect(reads.some((r) => /_(null|undefined)$/.test(r))).toBe(false);
  });

  it("with no session the old rule stands: /signin from a tab route", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect(await gate.gateRedirect("/settings", false)).toBe("/signin");
    expect(await gate.gateRedirect("/", false)).toBe("/signin");
  });

  it("does not ask Supabase when the email is already known, and never in demo mode", async () => {
    local.setItem("h1t_auth_current_email", EMAIL);
    withProfile();
    expect(await gate.gateRedirect("/", false)).toBeNull();
    expect(getUser).not.toHaveBeenCalled();
    local.removeItem("h1t_auth_current_email");
    expect(await gate.gateRedirect("/", true)).toBeNull();
    expect(getUser).not.toHaveBeenCalled();
  });

  it("per-account storage is scoped to the resolved email: the diary reads this account's keys", async () => {
    getUser.mockResolvedValue({ data: { user }, error: null });
    await gate.gateRedirect("/", false);
    const { currentAccountId } = await import("../auth-actions");
    expect(currentAccountId()).toBe(EMAIL);
  });

  it("(e) the sign-in page goes to / when a session exists, and shows the form when there is none", async () => {
    getUser.mockResolvedValue({ data: { user }, error: null });
    expect(await gate.homeIfSignedIn()).toBe("/");
    getUser.mockResolvedValue({ data: { user: null }, error: null });
    vi.resetModules();
    const fresh = await import("../first-run");
    expect(await fresh.homeIfSignedIn()).toBeNull();
  });

  it("mock mode: the sign-in page never redirects", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_MODE", "");
    expect(await gate.homeIfSignedIn()).toBeNull();
    expect(getUser).not.toHaveBeenCalled();
  });

  describe("sign-out that cannot reach the server", () => {
    it("falls back to a local sign-out, so the cookie is cleared", async () => {
      signOutCalls.globalFails = true;
      const { signOut } = await import("../auth-actions");
      await signOut();
      expect(signOutCalls.calls).toEqual([undefined, { scope: "local" }]);
      expect(local.getItem("h1t_auth_signed_out")).toBe("true");
    });

    it("a session that survives is not adopted: /signin stays, and the gate sends a tab route to /signin", async () => {
      signOutCalls.globalFails = true;
      // Even a cookie that survived both calls (getUser still answers with the user) must not bring the user back
      getUser.mockResolvedValue({ data: { user }, error: null });
      const { signOut, currentAccountId, currentAccount } = await import("../auth-actions");
      local.setItem("h1t_auth_current_email", EMAIL);
      await signOut();
      expect(currentAccountId()).toBeNull();
      expect(await gate.homeIfSignedIn()).toBeNull();
      expect(await gate.gateRedirect("/", false)).toBe("/signin");
      expect(await gate.gateRedirect("/add", false)).toBe("/signin");
      expect(await currentAccount()).toBeNull();
      expect(getUser).not.toHaveBeenCalled();
      expect(local.getItem("h1t_auth_current_email")).toBeNull();
    });

    it("the next explicit sign-in (Google) clears the flag, and its session is adopted again", async () => {
      getUser.mockResolvedValue({ data: { user }, error: null });
      const { signOut, signInWithGoogle } = await import("../auth-actions");
      await signOut();
      expect(await gate.homeIfSignedIn()).toBeNull();
      expect(await signInWithGoogle()).toEqual({ ok: true });
      expect(local.getItem("h1t_auth_signed_out")).toBeNull();
      expect(await gate.homeIfSignedIn()).toBe("/");
    });
  });
});
