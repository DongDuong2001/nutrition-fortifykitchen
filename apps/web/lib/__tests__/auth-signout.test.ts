import { beforeEach, describe, expect, it, vi } from "vitest";
import { signOut } from "../auth-actions";

// cc-63, X2: the httpOnly sb-access-token cookie outlives the Supabase session by up to an hour, so every way out of
// signOut ends with the server asked to drop it, and signOut resolves only after that call is done.
vi.stubEnv("NEXT_PUBLIC_API_MODE", "live");

const order: string[] = [];
const state = { loadFails: false, globalError: null as Error | null, globalThrows: false, localThrows: false, syncMs: 0 };

vi.mock("../supabase-client", () => ({
  createClient: () => {
    if (state.loadFails) throw new Error("chunk load failed");
    return {
      auth: {
        signOut: async (options?: { scope?: string }) => {
          const local = options?.scope === "local";
          order.push(local ? "signOut:local" : "signOut");
          if (local && state.localThrows) throw new Error("storage blocked");
          if (!local && state.globalThrows) throw new Error("network");
          return { error: local ? null : state.globalError };
        },
      },
    };
  },
}));

vi.mock("../server-session", () => ({
  syncServerSession: async () => {
    if (state.syncMs) await new Promise((resolve) => setTimeout(resolve, state.syncMs));
    order.push("sync");
  },
}));

beforeEach(() => {
  order.length = 0;
  Object.assign(state, { loadFails: false, globalError: null, globalThrows: false, localThrows: false, syncMs: 0 });
});

describe("signOut asks the server to clear sb-access-token on every path", () => {
  it("signed out: sync after the sign-out", async () => {
    await signOut();
    expect(order).toEqual(["signOut", "sync"]);
  });

  it("the global sign-out answers an error: local fallback, then sync", async () => {
    state.globalError = new Error("server error");
    await signOut();
    expect(order).toEqual(["signOut", "signOut:local", "sync"]);
  });

  it("the global sign-out throws (offline): local fallback, then sync", async () => {
    state.globalThrows = true;
    await signOut();
    expect(order).toEqual(["signOut", "signOut:local", "sync"]);
  });

  it("the local fallback fails too: sync still runs", async () => {
    state.globalThrows = true;
    state.localThrows = true;
    await signOut();
    expect(order).toEqual(["signOut", "signOut:local", "sync"]);
  });

  it("the Supabase client does not load: sync still runs", async () => {
    state.loadFails = true;
    await signOut();
    expect(order).toEqual(["sync"]);
  });

  it("signOut is done only when the cookie call is", async () => {
    state.syncMs = 30;
    const done = signOut().then(() => order.push("resolved"));
    await new Promise((resolve) => setTimeout(resolve, 5));
    expect(order).not.toContain("resolved");
    await done;
    expect(order).toEqual(["signOut", "sync", "resolved"]);
  });
});
