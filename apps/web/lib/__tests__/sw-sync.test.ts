import { readFileSync } from "node:fs";
import { join } from "node:path";
import { runInNewContext } from "node:vm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { idbBatch, idbRun, resetIdb } from "../idb";
import { createFakeIdb, type FakeIdb } from "./fake-idb";

// cc-68 S15: Background Sync. public/sw.js drains the IndexedDB outbox in a sandbox with a fake IndexedDB, fetch and Web Locks.
const source = readFileSync(join(__dirname, "..", "..", "public", "sw.js"), "utf8");
const ACCOUNT = "bg@example.com";
const ID = "11111111-1111-4111-8111-111111111111";
const ID2 = "22222222-2222-4222-8222-222222222222";
let idb: FakeIdb;

type Fetch = (url: string, init?: RequestInit) => Promise<{ status: number }>;

function loadWorker(fetchImpl: Fetch, options: { locks?: unknown } = {}) {
  const calls: Array<{ url: string; method?: string; body?: unknown }> = [];
  const posted: unknown[] = [];
  const listeners = new Map<string, (event: unknown) => void>();
  const sandbox = {
    module: { exports: {} as Record<string, unknown> },
    self: { addEventListener: (type: string, fn: (event: unknown) => void) => void listeners.set(type, fn), location: { origin: "http://x" } },
    indexedDB: idb.factory,
    navigator: { locks: options.locks },
    fetch: async (url: string, init?: RequestInit) => {
      calls.push({ url, method: init?.method, body: init?.body ? JSON.parse(String(init.body)) : undefined });
      return fetchImpl(url, init);
    },
    BroadcastChannel: class {
      postMessage(data: unknown) {
        posted.push(data);
      }
      close() {}
    },
    AbortController,
    setTimeout,
    clearTimeout,
    Promise,
    Set,
    Date,
  };
  runInNewContext(source, sandbox);
  const sw = sandbox.module.exports as { drainOutbox: () => Promise<{ sent: number; offline: boolean }>; drainWithLock: () => Promise<{ sent: number; offline: boolean }>; OUTBOX_TAG: string };
  return { sw, calls, posted, listeners };
}

const record = (over: Record<string, unknown>) => ({ key: `${over.id}:1`, seq: 1, id: ID, date: "2026-10-18", payload: { id: ID, food_id: "22222222-2222-4222-8222-222222222222" }, createdAt: 1, state: "queued", scope: ACCOUNT, ...over });
const seed = async (items: Array<Record<string, unknown>>, meta: unknown = { account: ACCOUNT, apiBase: "https://api.test/api/v1" }) => {
  await idbBatch("outbox", items.map((put) => ({ put })));
  if (meta) await idbRun("kv", "readwrite", (s) => s.put(meta, "sync-meta"));
};
const left = () => idb.values("outbox").map((r) => (r as { key: string }).key);

beforeEach(() => {
  idb = createFakeIdb();
  vi.stubGlobal("indexedDB", idb.factory);
  resetIdb();
});

describe("the service worker's sync event", () => {
  it("sends each write in order with the cookie, removes what the server has, and tells the pages", async () => {
    await seed([record({ id: ID, key: "a", seq: 1 }), record({ id: ID, key: "b", seq: 2, method: "PATCH", path: `/entries/${ID}`, payload: { meal_slot: "dinner" } }), record({ id: ID2, key: "c", seq: 3, payload: { id: ID2, food_id: "x" } })]);
    const t = loadWorker(async () => ({ status: 201 }));
    expect(await t.sw.drainOutbox()).toEqual({ sent: 3, offline: false });
    expect(t.calls.map((c) => `${c.method} ${c.url}`)).toEqual([
      "POST https://api.test/api/v1/days/2026-10-18/entries",
      `PATCH https://api.test/api/v1/entries/${ID}`,
      "POST https://api.test/api/v1/days/2026-10-18/entries",
    ]);
    expect(left()).toEqual([]);
    expect(t.posted).toEqual([{ from: "sw", message: { type: "outbox", scope: ACCOUNT } }, { from: "sw", message: { type: "diary", scope: ACCOUNT } }]);
  });

  it("made_at as the page sends it (lib/late-writes madeAtMs): madeAt, else a plausible createdAt, else the day at 23:00 Ho Chi Minh time, never later than now", async () => {
    const made = Date.parse("2026-10-17T05:00:00Z");
    await seed([
      record({ id: ID, key: "a", seq: 1, date: "2026-10-17", createdAt: Date.now(), madeAt: made }),
      record({ id: ID, key: "b", seq: 2, date: "2026-10-17", createdAt: made }),
      record({ id: ID, key: "c", seq: 3, date: "2026-10-17" }),
      record({ id: ID, key: "d", seq: 4, date: "", day: "2026-10-16", method: "PATCH", path: `/entries/${ID}`, payload: {} }),
      record({ id: ID, key: "e", seq: 5, date: "2999-01-01" }),
    ]);
    const t = loadWorker(async () => ({ status: 201 }));
    const before = Date.now();
    await t.sw.drainOutbox();
    const stamps = t.calls.map((c) => (c.body as { made_at?: string }).made_at);
    expect(stamps.slice(0, 4)).toEqual(["2026-10-17T05:00:00.000Z", "2026-10-17T05:00:00.000Z", "2026-10-17T16:00:00.000Z", "2026-10-16T16:00:00.000Z"]);
    expect(Date.parse(stamps[4]!)).toBeGreaterThanOrEqual(before);
    expect(Date.parse(stamps[4]!)).toBeLessThanOrEqual(Date.now());
  });

  it("a delete the server no longer has (404) is done", async () => {
    await seed([record({ key: "d", method: "DELETE", path: `/entries/${ID}`, payload: {} })]);
    const t = loadWorker(async () => ({ status: 404 }));
    expect((await t.sw.drainOutbox()).sent).toBe(1);
    expect(left()).toEqual([]);
  });

  it("leaves every other outcome to the page: a refusal, a server error and a missing network change nothing", async () => {
    await seed([record({ id: ID, key: "a", seq: 1 }), record({ id: ID, key: "b", seq: 2, method: "PATCH", path: `/entries/${ID}` }), record({ id: ID2, key: "c", seq: 3, payload: { id: ID2 } })]);
    const t = loadWorker(async (url) => ({ status: url.includes("/entries/") ? 200 : 400 }));
    const result = await t.sw.drainOutbox();
    // The first write of the first entry was refused: the later write of that entry waits; the other entry is refused too
    expect(result.sent).toBe(0);
    expect(left()).toEqual(["a", "b", "c"]);
    expect(t.calls).toHaveLength(2);
    // No network: it stops at the first and says so, so the browser tries again
    const gone = loadWorker(async () => Promise.reject(new TypeError("Failed to fetch")));
    expect(await gone.sw.drainOutbox()).toEqual({ sent: 0, offline: true });
    expect(gone.calls).toHaveLength(1);
  });

  it("skips what the page owns: held, parked, waiting out a backoff, being sent, a recipe's local food, another account's", async () => {
    const now = Date.now();
    await seed([
      record({ id: "h", key: "held", seq: 1, held: { status: 400, message: "x" } }),
      record({ id: "p", key: "parked", seq: 2, parked: true }),
      record({ id: "w", key: "waiting", seq: 3, nextAttemptAt: now + 60_000 }),
      record({ id: "s", key: "sending", seq: 4, state: "sending", lastAttemptAt: now }),
      record({ id: "r", key: "recipe", seq: 5, payload: { food_id: "recipe-12" } }),
      record({ id: "o", key: "other", seq: 6, scope: "other@example.com" }),
    ]);
    const t = loadWorker(async () => ({ status: 201 }));
    expect(await t.sw.drainOutbox()).toEqual({ sent: 0, offline: false });
    expect(t.calls).toEqual([]);
    expect(left()).toHaveLength(6);
  });

  it("a write another tab was sending that never answered (older than 30 s) is sent", async () => {
    await seed([record({ key: "stale", state: "sending", lastAttemptAt: Date.now() - 60_000 })]);
    expect((await loadWorker(async () => ({ status: 201 })).sw.drainOutbox()).sent).toBe(1);
  });

  it("without the record that names the account, or without a database, it sends nothing", async () => {
    await seed([record({ key: "a" })], null);
    const t = loadWorker(async () => ({ status: 201 }));
    expect(await t.sw.drainOutbox()).toEqual({ sent: 0, offline: false });
    expect(t.calls).toEqual([]);
    // A browser that never ran the app: nothing is created
    idb = createFakeIdb();
    resetIdb();
    const none = loadWorker(async () => ({ status: 201 }));
    vi.stubGlobal("indexedDB", idb.factory);
    expect(await none.sw.drainOutbox()).toEqual({ sent: 0, offline: false });
    expect(idb.disk.size).toBe(0);
  });

  it("a 401 renews the session once and sends again", async () => {
    await seed([record({ key: "a" })]);
    let first = true;
    const t = loadWorker(async (url) => {
      if (url === "/auth/session") return { status: 204 };
      if (first) {
        first = false;
        return { status: 401 };
      }
      return { status: 201 };
    });
    expect((await t.sw.drainOutbox()).sent).toBe(1);
    expect(t.calls.map((c) => c.url)).toEqual(["https://api.test/api/v1/days/2026-10-18/entries", "/auth/session", "https://api.test/api/v1/days/2026-10-18/entries"]);
  });

  it("takes the page's Web Lock: with the lock held elsewhere it sends nothing", async () => {
    await seed([record({ key: "a" })]);
    const busy = { request: async (_n: string, _o: unknown, cb: (lock: object | null) => unknown) => cb(null) };
    const t = loadWorker(async () => ({ status: 201 }), { locks: busy });
    expect(await t.sw.drainWithLock()).toEqual({ sent: 0, offline: false });
    const free = { request: async (_n: string, _o: unknown, cb: (lock: object | null) => unknown) => cb({}) };
    const u = loadWorker(async () => ({ status: 201 }), { locks: free });
    expect((await u.sw.drainWithLock()).sent).toBe(1);
  });

  it("the sync event runs for its tag only, and rejects when the network was missing so the browser retries", async () => {
    await seed([record({ key: "a" })]);
    const t = loadWorker(async () => Promise.reject(new TypeError("Failed to fetch")));
    const handler = t.listeners.get("sync")!;
    let waited: Promise<unknown> = Promise.resolve();
    handler({ tag: "something-else", waitUntil: (p: Promise<unknown>) => (waited = p) });
    await waited;
    expect(t.calls).toEqual([]);
    handler({ tag: t.sw.OUTBOX_TAG, waitUntil: (p: Promise<unknown>) => (waited = p) });
    await expect(waited).rejects.toThrow("offline");
  });
});
