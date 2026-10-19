import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BACKOFF_BASE_MS, BACKOFF_CAP_MS, MAX_ATTEMPTS, afterFailure, backoffMs, retryAfterMs } from "../backoff";
import { apiClient, loadSyncEngine, resetWriteMemory, syncOfflineOutbox } from "../api-client";
import { resetIdb } from "../idb";
import { countItems, readItems, resetOutboxState, scopeFor } from "../outbox";
import { getSyncAlerts, resetSyncAlerts } from "../sync-state";
import { createFakeIdb } from "./fake-idb";

// cc-68 Part 4 (S10): backoff with jitter, Retry-After, parking after MAX_ATTEMPTS, and the session banner.

describe("backoffMs", () => {
  it("doubles from 2 s up to 5 min, then stays there", () => {
    const full = () => 1;
    expect([1, 2, 3, 4, 5, 6, 7, 8, 9, 20].map((n) => backoffMs(n, full))).toEqual([2000, 4000, 8000, 16000, 32000, 64000, 128000, 256000, BACKOFF_CAP_MS, BACKOFF_CAP_MS]);
  });

  it("jitters between half and all of the step, so devices that went offline together do not return together", () => {
    expect(backoffMs(3, () => 0)).toBe(4000);
    expect(backoffMs(3, () => 0.5)).toBe(6000);
    expect(backoffMs(3, () => 1)).toBe(8000);
    expect(BACKOFF_BASE_MS).toBe(2000);
  });
});

describe("retryAfterMs", () => {
  const now = Date.parse("2026-10-19T10:00:00Z");
  it("reads seconds and HTTP dates; nothing else", () => {
    expect(retryAfterMs("30", now)).toBe(30_000);
    expect(retryAfterMs("0", now)).toBe(0);
    expect(retryAfterMs("Mon, 19 Oct 2026 10:01:00 GMT", now)).toBe(60_000);
    expect(retryAfterMs("Mon, 19 Oct 2026 09:00:00 GMT", now)).toBe(0);
    expect(retryAfterMs("soon", now)).toBeNull();
    expect(retryAfterMs(null, now)).toBeNull();
    // A server cannot park a write for a day
    expect(retryAfterMs("999999", now)).toBe(60 * 60 * 1000);
  });
});

describe("afterFailure", () => {
  const now = 1_000_000;
  it("counts the failure and says when to try again", () => {
    expect(afterFailure(0, now, null, () => 1)).toEqual({ retries: 1, nextAttemptAt: now + 2000 });
    expect(afterFailure(2, now, null, () => 1)).toEqual({ retries: 3, nextAttemptAt: now + 8000 });
  });

  it("a Retry-After longer than the backoff wins; a shorter one does not shorten it", () => {
    expect(afterFailure(0, now, "60", () => 1).nextAttemptAt).toBe(now + 60_000);
    expect(afterFailure(3, now, "1", () => 1).nextAttemptAt).toBe(now + 16_000);
  });

  it("the MAX_ATTEMPTS-th failure parks it: no next time, it waits for Thử lại", () => {
    expect(afterFailure(MAX_ATTEMPTS - 2, now, null, () => 1)).toMatchObject({ nextAttemptAt: expect.any(Number) });
    expect(afterFailure(MAX_ATTEMPTS - 1, now, null, () => 1)).toEqual({ retries: MAX_ATTEMPTS, parked: true });
  });
});

// ---- through the outbox ----

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

const ACCOUNT = "retry@example.com";
const ID = "11111111-1111-4111-8111-111111111111";
const FOOD = "22222222-2222-4222-8222-222222222222";
const scope = scopeFor(ACCOUNT, false)!;
const add = () => apiClient.addEntry({ id: ID, foodId: FOOD, grams: 100, mealSlot: "lunch", date: "2026-10-19" });
const answering = (status: number, headers: Record<string, string> = {}) => vi.fn(async () => new Response(status === 204 ? null : "{}", { status, headers }));

describe("the outbox waits out a backoff", () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-19T03:00:00Z"));
    vi.stubEnv("NEXT_PUBLIC_API_MODE", "live");
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.test/api/v1");
    const local = memoryStorage();
    local.setItem("h1t_auth_current_email", ACCOUNT);
    vi.stubGlobal("localStorage", local);
    vi.stubGlobal("indexedDB", createFakeIdb().factory);
    vi.stubGlobal("window", { localStorage: local, sessionStorage: memoryStorage(), location: { search: "", pathname: "/app" } });
    resetIdb();
    resetOutboxState();
    resetSyncAlerts();
    await loadSyncEngine();
    resetWriteMemory();
    vi.spyOn(Math, "random").mockReturnValue(1);
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("a failed write is not sent again before its time; the time comes, or the network is back (force)", async () => {
    vi.stubGlobal("fetch", answering(503));
    expect((await add()).state).toBe("queued");
    expect(readItems(scope)[0]).toMatchObject({ retries: 1, nextAttemptAt: Date.parse("2026-10-19T03:00:02Z") });
    const fetchMock = answering(201);
    vi.stubGlobal("fetch", fetchMock);
    // The timer of the poll comes too soon: nothing is sent
    expect(await syncOfflineOutbox()).toEqual({ saved: [], held: [] });
    expect(fetchMock).not.toHaveBeenCalled();
    // Its time has come
    vi.setSystemTime(new Date("2026-10-19T03:00:03Z"));
    expect((await syncOfflineOutbox()).saved).toEqual([ID]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("the network coming back sends it at once, whatever the wait", async () => {
    vi.stubGlobal("fetch", answering(0 + 503));
    await add();
    vi.stubGlobal("fetch", answering(201));
    expect((await syncOfflineOutbox({ force: true })).saved).toEqual([ID]);
  });

  it("a 429 with Retry-After: the write waits that long", async () => {
    vi.stubGlobal("fetch", answering(429, { "Retry-After": "90" }));
    await add();
    expect(readItems(scope)[0].nextAttemptAt).toBe(Date.parse("2026-10-19T03:01:30Z"));
    const fetchMock = answering(201);
    vi.stubGlobal("fetch", fetchMock);
    vi.setSystemTime(new Date("2026-10-19T03:01:00Z"));
    await syncOfflineOutbox();
    expect(fetchMock).not.toHaveBeenCalled();
    vi.setSystemTime(new Date("2026-10-19T03:01:31Z"));
    expect((await syncOfflineOutbox()).saved).toEqual([ID]);
  });

  it("the later writes of an entry wait behind the one that waits", async () => {
    vi.stubGlobal("fetch", answering(503));
    await add();
    await apiClient.updateEntry(ID, { meal_slot: "dinner" }, "2026-10-19");
    const fetchMock = answering(200);
    vi.stubGlobal("fetch", fetchMock);
    await syncOfflineOutbox();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(readItems(scope)).toHaveLength(2);
  });

  it("after MAX_ATTEMPTS failures it is parked: the poll never sends it, the count says failed, and Thử lại sends it with a clean count", async () => {
    vi.stubGlobal("fetch", answering(500));
    await add();
    for (let i = 1; i < MAX_ATTEMPTS; i++) {
      vi.setSystemTime(new Date(Date.now() + BACKOFF_CAP_MS + 1000));
      await syncOfflineOutbox();
    }
    const item = readItems(scope)[0];
    expect(item).toMatchObject({ parked: true, retries: MAX_ATTEMPTS });
    expect(countItems(readItems(scope))).toMatchObject({ pending: 0, failed: 1, parked: 1 });
    // Parked: neither the poll nor "the network is back" sends it
    const fetchMock = answering(201);
    vi.stubGlobal("fetch", fetchMock);
    vi.setSystemTime(new Date(Date.now() + 24 * 3600 * 1000));
    await syncOfflineOutbox();
    await syncOfflineOutbox({ force: true });
    expect(fetchMock).not.toHaveBeenCalled();
    // Thử lại
    expect((await syncOfflineOutbox({ retryHeld: true })).saved).toEqual([ID]);
    expect(readItems(scope)).toEqual([]);
  });

  it("a parked write that fails again after Thử lại starts counting from one", async () => {
    vi.stubGlobal("fetch", answering(500));
    await add();
    for (let i = 1; i < MAX_ATTEMPTS; i++) {
      vi.setSystemTime(new Date(Date.now() + BACKOFF_CAP_MS + 1000));
      await syncOfflineOutbox();
    }
    await syncOfflineOutbox({ retryHeld: true });
    expect(readItems(scope)[0]).toMatchObject({ retries: 1, parked: undefined });
  });
});

describe("a session that ran out (S10)", () => {
  beforeEach(async () => {
    vi.stubEnv("NEXT_PUBLIC_API_MODE", "live");
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.test/api/v1");
    const local = memoryStorage();
    local.setItem("h1t_auth_current_email", ACCOUNT);
    vi.stubGlobal("localStorage", local);
    vi.stubGlobal("indexedDB", createFakeIdb().factory);
    vi.stubGlobal("window", { localStorage: local, sessionStorage: memoryStorage(), location: { search: "", pathname: "/app" } });
    resetIdb();
    resetOutboxState();
    resetSyncAlerts();
    await loadSyncEngine();
    resetWriteMemory();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("two writes that get 401 after the session was renewed raise the lasting banner; one success takes it down", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => (String(url).endsWith("/auth/session") ? new Response(null, { status: 204 }) : new Response("{}", { status: 401 }))));
    await add();
    expect(getSyncAlerts().sessionExpired).toBe(false);
    await apiClient.addEntry({ id: "33333333-3333-4333-8333-333333333333", foodId: FOOD, grams: 50, mealSlot: "dinner", date: "2026-10-19" });
    expect(getSyncAlerts().sessionExpired).toBe(true);
    vi.stubGlobal("fetch", answering(201));
    await syncOfflineOutbox({ force: true });
    expect(getSyncAlerts().sessionExpired).toBe(false);
  });

  it("a network failure is not a session problem", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("Failed to fetch"))));
    await add();
    await apiClient.addEntry({ id: "33333333-3333-4333-8333-333333333333", foodId: FOOD, grams: 50, mealSlot: "dinner", date: "2026-10-19" });
    expect(getSyncAlerts().sessionExpired).toBe(false);
  });
});


describe("outbox_age (S13)", () => {
  const item = (createdAt: number) => ({ key: String(createdAt), id: "e", date: "", payload: {}, createdAt });
  const now = Date.parse("2026-10-19T12:00:00Z");

  beforeEach(async () => {
    vi.stubEnv("NEXT_PUBLIC_API_MODE", "live");
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.test/api/v1");
    const local = memoryStorage();
    vi.stubGlobal("localStorage", local);
    vi.stubGlobal("window", { localStorage: local, sessionStorage: memoryStorage(), location: { search: "", pathname: "/app" } });
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 204 })));
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("reports the age bucket of the oldest write that waits, and nothing for a young outbox or an empty one", async () => {
    const engine = await loadSyncEngine();
    expect(engine.reportOutboxAge([], now)).toBeNull();
    expect(engine.reportOutboxAge([item(now - 5 * 60_000)], now)).toBeNull();
    expect(engine.reportOutboxAge([item(now - 15 * 60_000), item(now - 60_000)], now)).toBe("oldest>=10m");
    expect(engine.reportOutboxAge([item(now - 2 * 3600_000)], now)).toBe("oldest>=1h");
    expect(engine.reportOutboxAge([item(now - 30 * 3600_000)], now)).toBe("oldest>=24h");
  });

  it("a refused (held) write is not 'waiting': it has its own count", async () => {
    const engine = await loadSyncEngine();
    expect(engine.reportOutboxAge([{ ...item(now - 3 * 3600_000), held: { status: 400 } }], now)).toBeNull();
  });
});
