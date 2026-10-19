import { readFileSync } from "node:fs";
import { join } from "node:path";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";

// cc-58: public/sw.js networkFirst. The worker is loaded in a sandbox with a fake cache, fetch and a clock the test drives.
const settle = () => new Promise<void>((resolve) => setImmediate(resolve));
const source = readFileSync(join(__dirname, "..", "..", "public", "sw.js"), "utf8");

function load() {
  const stored = new Map<string, unknown>();
  const timers: Array<() => void> = [];
  let fetches = 0;
  const listeners = new Map<string, (event: unknown) => void>();
  const cache = {
    match: async (key: string) => stored.get(key),
    put: async (key: string, res: unknown) => void stored.set(key, res),
    keys: async () => [],
    delete: async () => true,
  };
  const sandbox = {
    module: { exports: {} as Record<string, unknown> },
    self: { addEventListener: (type: string, fn: (event: unknown) => void) => void listeners.set(type, fn), location: { origin: "http://x" } },
    caches: { open: async () => cache, match: async () => undefined },
    setTimeout: (fn: () => void) => void timers.push(fn),
    fetch: async (): Promise<unknown> => {
      fetches++;
      throw new Error("no fetch wired");
    },
    Response: class {
      constructor(public body: string, public init?: unknown) {}
    },
    URL,
  };
  runInNewContext(source, sandbox);
  const sw = sandbox.module.exports as { networkFirst: (r: unknown, p: string, preload?: unknown, e?: unknown) => Promise<unknown>; NAVIGATION_TIMEOUT_MS: number };
  const page = (name: string) => ({ ok: true, redirected: false, type: "basic", name, clone() { return this; } });
  return { sw, sandbox, stored, timers, listeners, fetches: () => fetches, page };
}

describe("sw networkFirst (cc-58)", () => {
  it("waits 3 s at most", () => {
    expect(load().sw.NAVIGATION_TIMEOUT_MS).toBe(3000);
  });

  it("a fast network answers, and the page is cached", async () => {
    const t = load();
    const fresh = t.page("fresh");
    t.sandbox.fetch = async () => fresh;
    expect(await t.sw.networkFirst({}, "/app")).toBe(fresh);
    expect(t.stored.get("/app")).toBe(fresh);
  });

  it("a slow network (past 3 s) with a cached copy serves the copy, and the network still refreshes the cache", async () => {
    const t = load();
    const old = t.page("old");
    const fresh = t.page("fresh");
    t.stored.set("/app", old);
    let release!: (res: unknown) => void;
    t.sandbox.fetch = () => new Promise((resolve) => (release = resolve));
    const waited: Promise<unknown>[] = [];
    const served = t.sw.networkFirst({}, "/app", undefined, { waitUntil: (p: Promise<unknown>) => waited.push(p) });
    await settle();
    t.timers.forEach((fn) => fn()); // 3 s pass
    expect(await served).toBe(old);
    release(fresh);
    await Promise.all(waited);
    expect(t.stored.get("/app")).toBe(fresh);
  });

  it("a slow network with no copy is waited for", async () => {
    const t = load();
    const fresh = t.page("fresh");
    let release!: (res: unknown) => void;
    t.sandbox.fetch = () => new Promise((resolve) => (release = resolve));
    const served = t.sw.networkFirst({}, "/trends");
    await settle();
    t.timers.forEach((fn) => fn());
    await settle();
    release(fresh);
    expect(await served).toBe(fresh);
  });

  it("offline: the cached copy, else the offline page", async () => {
    const t = load();
    const old = t.page("old");
    t.stored.set("/app", old);
    t.sandbox.fetch = async () => {
      throw new Error("offline");
    };
    expect(await t.sw.networkFirst({}, "/app")).toBe(old);
    const none = (await t.sw.networkFirst({}, "/explore")) as { init?: { status: number } };
    expect(none.init?.status).toBe(503);
  });

  it("navigation preload is used in place of a second fetch", async () => {
    const t = load();
    const early = t.page("preloaded");
    t.sandbox.fetch = async () => {
      throw new Error("must not fetch");
    };
    expect(await t.sw.networkFirst({}, "/app", Promise.resolve(early))).toBe(early);
    // Nothing preloaded (undefined): the worker fetches itself
    const own = t.page("own");
    t.sandbox.fetch = async () => own;
    expect(await t.sw.networkFirst({}, "/trends", Promise.resolve(undefined))).toBe(own);
  });

  it("enables navigation preload when it activates", () => {
    expect(source).toContain("navigationPreload.enable()");
    expect(source).toContain("event.preloadResponse");
  });

  // The fetch listener itself: a page load of an auth route makes one network request, never two
  async function navigate(t: ReturnType<typeof load>, path: string, preloadResponse: Promise<unknown>) {
    let answer: Promise<unknown> | undefined;
    t.listeners.get("fetch")?.({
      request: { url: `http://x${path}`, mode: "navigate", method: "GET" },
      preloadResponse,
      respondWith: (p: Promise<unknown>) => void (answer = p),
      waitUntil() {},
    });
    return answer;
  }

  describe.each(["/signin", "/signup", "/reset-password", "/auth/callback", "/join/ABC123"])("%s (never cached)", (path) => {
    it("uses the navigation preload: the page is the one request the browser started, no second fetch", async () => {
      const t = load();
      const early = t.page("preloaded");
      let calls = 0;
      t.sandbox.fetch = async () => {
        calls++;
        throw new Error("must not fetch");
      };
      expect(await navigate(t, path, Promise.resolve(early))).toBe(early);
      expect(calls).toBe(0);
      // and nothing is cached
      expect(t.stored.size).toBe(0);
    });

    it("with no preload it fetches exactly once", async () => {
      const t = load();
      const own = t.page("own");
      let calls = 0;
      t.sandbox.fetch = async () => (calls++, own);
      expect(await navigate(t, path, Promise.resolve(undefined))).toBe(own);
      expect(calls).toBe(1);
      expect(t.stored.size).toBe(0);
    });

    it("offline: the offline page, from the preload failing or the fetch failing", async () => {
      const t = load();
      t.sandbox.fetch = async () => {
        throw new Error("offline");
      };
      const viaFetch = (await navigate(t, path, Promise.resolve(undefined))) as { init?: { status: number } };
      expect(viaFetch.init?.status).toBe(503);
      const viaPreload = (await navigate(t, path, Promise.reject(new Error("offline")))) as { init?: { status: number } };
      expect(viaPreload.init?.status).toBe(503);
    });
  });
});
