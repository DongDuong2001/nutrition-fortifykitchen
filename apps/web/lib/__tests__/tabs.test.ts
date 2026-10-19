import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeIdb, type FakeIdb } from "./fake-idb";

// cc-68 S8: two tabs of one browser. Each "tab" is its own copy of the modules (vi.resetModules); they share the disk
// (a fake IndexedDB), localStorage, the Web Locks and the BroadcastChannel, which is what real tabs share.

function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key: string) => data.get(key) ?? null,
    key: (index: number) => Array.from(data.keys())[index] ?? null,
    removeItem: (key: string) => void data.delete(key),
    setItem: (key: string, value: string) => void data.set(key, String(value)),
  } as Storage;
}

/** A channel hub: every instance gets what any other instance posts (never its own). */
function broadcastHub() {
  const channels: Array<{ onmessage: ((e: { data: unknown }) => void) | null }> = [];
  class FakeChannel {
    onmessage: ((e: { data: unknown }) => void) | null = null;
    constructor() {
      channels.push(this);
    }
    postMessage(data: unknown) {
      const copy = structuredClone(data);
      queueMicrotask(() => {
        for (const other of channels) if (other !== this) other.onmessage?.({ data: copy });
      });
    }
    close() {}
  }
  return FakeChannel;
}

/** Web Locks with ifAvailable: a second request for a held lock gets null. */
function lockManager() {
  const held = new Set<string>();
  return {
    request: async (name: string, options: { ifAvailable?: boolean }, callback: (lock: object | null) => Promise<unknown>) => {
      if (held.has(name) && options.ifAvailable) return callback(null);
      held.add(name);
      try {
        return await callback({ name });
      } finally {
        held.delete(name);
      }
    },
  };
}

const ACCOUNT = "tabs@example.com";
const ID = "11111111-1111-4111-8111-111111111111";
const FOOD = "22222222-2222-4222-8222-222222222222";
let idb: FakeIdb;

async function openTab() {
  vi.resetModules();
  const api = await import("../api-client");
  const outbox = await import("../outbox");
  const idbModule = await import("../idb");
  const tabs = await import("../tab-sync");
  idbModule.resetIdb();
  await api.loadSyncEngine();
  return { api, outbox, tabs, scope: outbox.scopeFor(ACCOUNT, false)! };
}

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_API_MODE", "live");
  vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.test/api/v1");
  const local = memoryStorage();
  local.setItem("h1t_auth_current_email", ACCOUNT);
  idb = createFakeIdb();
  vi.stubGlobal("localStorage", local);
  vi.stubGlobal("indexedDB", idb.factory);
  vi.stubGlobal("window", { localStorage: local, sessionStorage: memoryStorage(), location: { search: "", pathname: "/app" } });
  vi.stubGlobal("BroadcastChannel", broadcastHub());
  vi.stubGlobal("navigator", { onLine: true, locks: lockManager() });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("one drainer at a time", () => {
  it("two tabs draining the same outbox send each write once: the second finds the lock held and leaves it", async () => {
    const a = await openTab();
    const b = await openTab();
    await a.outbox.putItem(a.scope, { key: "k1", seq: 1, id: ID, date: "2026-10-18", payload: { id: ID, food_id: FOOD }, createdAt: Date.now() - 1000, state: "queued" });
    await a.outbox.loadOutbox(a.scope);
    await b.outbox.loadOutbox(b.scope);
    let release: (r: Response) => void = () => {};
    const sent: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string, init?: RequestInit) => {
        sent.push(`${init?.method} ${url}`);
        return new Promise<Response>((resolve) => (release = resolve));
      })
    );
    const first = a.api.syncOfflineOutbox();
    await vi.waitFor(() => expect(sent).toHaveLength(1));
    // Tab B asks while A holds the lock
    expect(await b.api.syncOfflineOutbox()).toEqual({ saved: [], held: [] });
    expect(sent).toHaveLength(1);
    release(new Response("{}", { status: 201 }));
    expect((await first).saved).toEqual([ID]);
    expect(sent).toHaveLength(1);
    expect(idb.values("outbox")).toEqual([]);
  });

  it("a write another tab queued is sent by the tab that drains: it reads the disk first", async () => {
    const a = await openTab();
    const b = await openTab();
    await a.outbox.loadOutbox(a.scope);
    await b.outbox.loadOutbox(b.scope);
    // B queues a write that fails; A has never seen it in memory
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 503 })));
    await b.api.apiClient.addEntry({ id: ID, foodId: FOOD, grams: 100, mealSlot: "lunch", date: "2026-10-18" });
    const calls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        calls.push(`${init?.method} ${String(url).replace("https://api.test/api/v1", "")}`);
        return new Response("{}", { status: 201 });
      })
    );
    expect((await a.api.syncOfflineOutbox()).saved).toEqual([ID]);
    expect(calls).toEqual(["POST /days/2026-10-18/entries"]);
  });
});

describe("other tabs follow", () => {
  it("what one tab queues shows in the other's outbox without a reload", async () => {
    const a = await openTab();
    const b = await openTab();
    await b.outbox.loadOutbox(b.scope);
    b.api.watchOutbox(() => {});
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 503 })));
    await a.api.apiClient.addEntry({ id: ID, foodId: FOOD, grams: 100, mealSlot: "lunch", date: "2026-10-18" });
    await vi.waitFor(() => expect(b.outbox.readItems(b.scope).map((i) => i.id)).toEqual([ID]));
  });

  it("a write one tab saved tells the other to read the server's day again", async () => {
    const a = await openTab();
    const b = await openTab();
    const onDiary = vi.fn();
    b.api.watchOutbox(() => {}, onDiary);
    await vi.waitFor(() => expect(onDiary).not.toHaveBeenCalled());
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 201 })));
    await a.api.apiClient.addEntry({ id: ID, foodId: FOOD, grams: 100, mealSlot: "lunch", date: "2026-10-18" });
    await vi.waitFor(() => expect(onDiary).toHaveBeenCalledTimes(1));
  });

  it("a tab does not hear itself", async () => {
    const a = await openTab();
    const onDiary = vi.fn();
    a.api.watchOutbox(() => {}, onDiary);
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 201 })));
    await a.api.apiClient.addEntry({ id: ID, foodId: FOOD, grams: 100, mealSlot: "lunch", date: "2026-10-18" });
    await new Promise((r) => setTimeout(r, 30));
    expect(onDiary).not.toHaveBeenCalled();
  });
});
