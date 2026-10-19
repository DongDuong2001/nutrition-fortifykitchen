import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { watchAccount } from "../account-guard";
import { currentAccountId } from "../auth-actions";
import { apiClient, loadSyncEngine, resetWriteMemory, syncOfflineOutbox, watchAccountChange } from "../api-client";
import { resetIdb } from "../idb";
import { putItem, readItems, resetOutboxState, scopeFor } from "../outbox";
import { resetTabSync } from "../tab-sync";

// cc-68 X1: two tabs, two accounts. These use an EventTarget for window and document, and a map for localStorage.

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

const KEY = "h1t_auth_current_email";
let local: Storage;
let win: EventTarget & Record<string, unknown>;
let doc: EventTarget & { visibilityState: string };

const storageEvent = (key: string | null) => {
  const event = new Event("storage") as Event & { key: string | null };
  event.key = key;
  win.dispatchEvent(event);
};

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_API_MODE", "live");
  vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.test/api/v1");
  local = memoryStorage();
  local.setItem(KEY, "a@x.vn");
  win = Object.assign(new EventTarget(), { localStorage: local, sessionStorage: memoryStorage(), location: { search: "", pathname: "/app", reload: vi.fn() } }) as never;
  doc = Object.assign(new EventTarget(), { visibilityState: "visible" });
  vi.stubGlobal("localStorage", local);
  vi.stubGlobal("window", win);
  vi.stubGlobal("document", doc);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  resetTabSync();
});

describe("who is signed in is read from the shared key each time", () => {
  it("a change made by another tab shows at once, with no event and no reload (the old in-memory copy could not)", () => {
    expect(currentAccountId()).toBe("a@x.vn");
    local.setItem(KEY, "b@x.vn");
    expect(currentAccountId()).toBe("b@x.vn");
    local.removeItem(KEY);
    expect(currentAccountId()).toBeNull();
  });
});

describe("watchAccount", () => {
  it("one browser, two accounts: when another tab signs in as someone else, this tab is told once", () => {
    const onMismatch = vi.fn();
    const stop = watchAccount("a@x.vn", onMismatch);
    local.setItem(KEY, "b@x.vn");
    storageEvent(KEY);
    storageEvent(KEY);
    expect(onMismatch).toHaveBeenCalledTimes(1);
    expect(onMismatch).toHaveBeenCalledWith("b@x.vn");
    stop();
  });

  it("the same account signing in again, or an unrelated key, is not a change", () => {
    const onMismatch = vi.fn();
    watchAccount("a@x.vn", onMismatch);
    storageEvent(KEY);
    storageEvent("h1t_added_entries_v1_a@x.vn");
    expect(onMismatch).not.toHaveBeenCalled();
  });

  it("another tab signing out (the key goes) is a change to nobody", () => {
    const onMismatch = vi.fn();
    watchAccount("a@x.vn", onMismatch);
    local.removeItem(KEY);
    storageEvent(KEY);
    expect(onMismatch).toHaveBeenCalledWith(null);
  });

  it("localStorage.clear() in another tab (event key null) is checked too", () => {
    const onMismatch = vi.fn();
    watchAccount("a@x.vn", onMismatch);
    local.clear();
    storageEvent(null);
    expect(onMismatch).toHaveBeenCalledWith(null);
  });

  it("a tab that was in the background looks when it is shown or focused again, even with no event", () => {
    const onMismatch = vi.fn();
    watchAccount("a@x.vn", onMismatch);
    local.setItem(KEY, "b@x.vn");
    doc.visibilityState = "hidden";
    doc.dispatchEvent(new Event("visibilitychange"));
    expect(onMismatch).not.toHaveBeenCalled();
    doc.visibilityState = "visible";
    doc.dispatchEvent(new Event("visibilitychange"));
    expect(onMismatch).toHaveBeenCalledWith("b@x.vn");
  });

  it("focus does the same", () => {
    const onMismatch = vi.fn();
    watchAccount("a@x.vn", onMismatch);
    local.setItem(KEY, "b@x.vn");
    win.dispatchEvent(new Event("focus"));
    expect(onMismatch).toHaveBeenCalledWith("b@x.vn");
  });

  it("this tab's own Đăng xuất is not another tab's change", () => {
    const onMismatch = vi.fn();
    watchAccount("a@x.vn", onMismatch, { skip: () => true });
    local.removeItem(KEY);
    storageEvent(KEY);
    win.dispatchEvent(new Event("focus"));
    expect(onMismatch).not.toHaveBeenCalled();
  });

  it("stopping it removes the listeners", () => {
    const onMismatch = vi.fn();
    const stop = watchAccount("a@x.vn", onMismatch);
    stop();
    local.setItem(KEY, "b@x.vn");
    storageEvent(KEY);
    win.dispatchEvent(new Event("focus"));
    expect(onMismatch).not.toHaveBeenCalled();
  });

  it("another tab saying the account changed (BroadcastChannel) makes this tab look", async () => {
    const channels: Array<{ onmessage: ((e: { data: unknown }) => void) | null; postMessage: (data: unknown) => void }> = [];
    class FakeChannel {
      onmessage: ((e: { data: unknown }) => void) | null = null;
      constructor() {
        channels.push(this);
      }
      postMessage(data: unknown) {
        for (const other of channels) if (other !== this) other.onmessage?.({ data });
      }
      close() {}
    }
    vi.stubGlobal("BroadcastChannel", FakeChannel);
    resetTabSync();
    const { postTab } = await import("../tab-sync");
    const onMismatch = vi.fn();
    watchAccount("a@x.vn", onMismatch);
    local.setItem(KEY, "b@x.vn");
    // The other tab is a second channel instance
    const other = new FakeChannel();
    other.postMessage({ from: "other-tab", message: { type: "account", account: "b@x.vn" } });
    expect(onMismatch).toHaveBeenCalledWith("b@x.vn");
    void postTab;
  });
});

describe("a tab whose account changed writes and sends nothing (the diary reloads to the gate)", () => {
  const ID = "11111111-1111-4111-8111-111111111111";
  const FOOD = "22222222-2222-4222-8222-222222222222";
  beforeEach(async () => {
    resetIdb();
    resetOutboxState();
    await loadSyncEngine();
    resetWriteMemory();
  });

  it("after the guard fires, an add is not made, not queued for anyone, and a sync sends nothing", async () => {
    const fetchMock = vi.fn(async () => new Response("{}", { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);
    const onMismatch = vi.fn();
    const stop = watchAccountChange("a@x.vn", onMismatch);
    await loadSyncEngine();
    local.setItem(KEY, "b@x.vn");
    win.dispatchEvent(new Event("focus"));
    await vi.waitFor(() => expect(onMismatch).toHaveBeenCalledWith("b@x.vn"));
    const result = await apiClient.addEntry({ id: ID, foodId: FOOD, grams: 100, mealSlot: "lunch", date: "2026-10-18" });
    expect(result.state).toBe("queued");
    expect(fetchMock).not.toHaveBeenCalled();
    // Neither account's outbox got it
    expect(readItems(scopeFor("a@x.vn", false))).toEqual([]);
    expect(readItems(scopeFor("b@x.vn", false))).toEqual([]);
    expect(await syncOfflineOutbox()).toEqual({ saved: [], held: [] });
    stop();
  });

  it("A's waiting write is never sent with B's cookie: the run compares the account for every write", async () => {
    const scopeA = scopeFor("a@x.vn", false)!;
    await putItem(scopeA, { key: "k1", seq: 1, id: ID, date: "2026-10-18", payload: { id: ID }, createdAt: Date.now() - 1000, state: "queued" });
    // Another tab signed in as B before this run starts
    local.setItem(KEY, "b@x.vn");
    const fetchMock = vi.fn(async () => new Response("{}", { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);
    expect(await syncOfflineOutbox()).toEqual({ saved: [], held: [] });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(readItems(scopeA)).toHaveLength(1);
  });
});
