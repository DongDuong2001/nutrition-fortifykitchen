import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient, getPendingOfflineEntryIds, hasPendingWrite, loadSyncEngine, pendingFavouriteOps, resetWriteMemory, syncOfflineOutbox } from "../api-client";
import { resetIdb } from "../idb";
import { STALE_SENDING_MS, countItems, loadOutbox, putItem, readItems, resetOutboxState, scopeFor } from "../outbox";
import { getSyncAlerts, resetSyncAlerts } from "../sync-state";
import { createFakeIdb, quotaError, type FakeIdb } from "./fake-idb";

// cc-68 Part 1: the write-ahead outbox in IndexedDB. The requests are a mocked fetch; the disk is a fake IndexedDB that
// outlives the modules' memory, so a test can "kill the page" by forgetting the memory and loading again.

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

const ACCOUNT = "sync@example.com";
const ID = "11111111-1111-4111-8111-111111111111";
const FOOD = "22222222-2222-4222-8222-222222222222";
const scope = scopeFor(ACCOUNT, false)!;
let idb: FakeIdb;
let local: Storage;

/** The server: records each call; `answers` gives the status for "METHOD /path" (the last one repeats). */
function server(answers: Record<string, number[]> = {}) {
  const calls: string[] = [];
  const bodies: Record<string, unknown[]> = {};
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const path = url.replace("https://api.test/api/v1", "");
    const key = `${init?.method ?? "GET"} ${path}`;
    calls.push(key);
    if (init?.body) (bodies[key] ??= []).push(JSON.parse(String(init.body)));
    const list = answers[key] ?? [200];
    const status = list.length > 1 ? list.shift()! : list[0];
    return new Response(status === 204 ? null : "{}", { status });
  });
  vi.stubGlobal("fetch", fetchMock);
  return { calls, bodies, fetchMock };
}

/** A page life ends: the modules forget everything in memory; the disk stays. */
function killPage() {
  resetOutboxState();
  resetWriteMemory();
  resetIdb();
}

const add = (date = "2026-10-18") => apiClient.addEntry({ id: ID, foodId: FOOD, grams: 100, mealSlot: "breakfast", date });

beforeEach(async () => {
  vi.stubEnv("NEXT_PUBLIC_API_MODE", "live");
  vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.test/api/v1");
  local = memoryStorage();
  local.setItem("h1t_auth_current_email", ACCOUNT);
  idb = createFakeIdb();
  vi.stubGlobal("localStorage", local);
  vi.stubGlobal("indexedDB", idb.factory);
  vi.stubGlobal("window", { localStorage: local, sessionStorage: memoryStorage(), location: { search: "", pathname: "/app" } });
  killPage();
  resetSyncAlerts();
  await loadSyncEngine();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("S2: the write is in the outbox before the request goes out", () => {
  it("the record is on disk, marked sending, at the moment the fetch starts", async () => {
    let onDiskAtFetch: unknown[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        onDiskAtFetch = idb.values("outbox");
        return new Response("{}", { status: 201 });
      })
    );
    await add();
    expect(onDiskAtFetch).toHaveLength(1);
    expect(onDiskAtFetch[0]).toMatchObject({ id: ID, state: "sending", attempts: 1, scope: ACCOUNT });
    // Saved: it leaves the outbox
    expect(idb.values("outbox")).toEqual([]);
    expect(getPendingOfflineEntryIds()).toEqual([]);
  });

  it("app killed during the fetch: the write is in the outbox on the next start and is sent once, by the same id", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-18T10:00:00Z"));
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(() => {})));
    void add();
    await vi.waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(idb.values("outbox")).toHaveLength(1);

    killPage();
    const { calls, bodies } = server({ "POST /days/2026-10-18/entries": [201] });
    // Less than 30 s later another tab may still be sending it: it is not taken over yet
    vi.setSystemTime(new Date("2026-10-18T10:00:10Z"));
    await loadOutbox(scope);
    expect(readItems(scope)).toMatchObject([{ id: ID, state: "sending" }]);
    expect((await syncOfflineOutbox()).saved).toEqual([]);
    expect(calls).toEqual([]);

    vi.setSystemTime(new Date(Date.parse("2026-10-18T10:00:00Z") + STALE_SENDING_MS + 1000));
    expect((await syncOfflineOutbox()).saved).toEqual([ID]);
    expect(calls).toEqual(["POST /days/2026-10-18/entries"]);
    expect((bodies["POST /days/2026-10-18/entries"][0] as { id: string }).id).toBe(ID);
    expect(idb.values("outbox")).toEqual([]);
  });

  it("a failed write stays in the outbox on disk (queued), and an edit made while it waits goes after it", async () => {
    const { calls } = server({ "POST /days/2026-10-18/entries": [500, 201] });
    expect((await add()).state).toBe("queued");
    expect(idb.values("outbox")).toMatchObject([{ id: ID, state: "queued", attempts: 1, retries: 1 }]);
    expect((await apiClient.updateEntry(ID, { meal_slot: "lunch" })).state).toBe("queued");
    expect(calls.filter((c) => c.startsWith("PATCH"))).toEqual([]);
    expect(idb.values("outbox")).toHaveLength(2);
    await syncOfflineOutbox();
    expect(calls.slice(-2)).toEqual(["POST /days/2026-10-18/entries", `PATCH /entries/${ID}`]);
  });
});

describe("S8: one record per write; the old localStorage array is moved over without loss", () => {
  const legacy = [
    { id: ID, date: "2026-10-18", payload: { id: ID }, createdAt: 1000, key: "k1", retries: 2 },
    { id: "33333333-3333-4333-8333-333333333333", date: "2026-10-18", payload: { id: "x" }, createdAt: 2000, key: "k2", held: { status: 400, message: "bad" } },
    // Before cc-49: no key, no method
    { id: "44444444-4444-4444-8444-444444444444", date: "2026-10-17", payload: {}, createdAt: 3000 },
  ];

  it("moves each record into IndexedDB, keeps the hold, and removes the localStorage key only once they are on disk", async () => {
    local.setItem(`h1t_offline_outbox_${ACCOUNT}`, JSON.stringify(legacy));
    await loadOutbox(scope);
    expect(idb.values("outbox")).toHaveLength(3);
    expect(readItems(scope).map((i) => i.id)).toEqual(legacy.map((i) => i.id));
    expect(readItems(scope)[1].held).toEqual({ status: 400, message: "bad" });
    expect(local.getItem(`h1t_offline_outbox_${ACCOUNT}`)).toBeNull();
    // A second load changes nothing
    killPage();
    await loadOutbox(scope);
    expect(readItems(scope)).toHaveLength(3);
  });

  it("when IndexedDB refuses the records, the localStorage array stays and nothing is lost", async () => {
    local.setItem(`h1t_offline_outbox_${ACCOUNT}`, JSON.stringify(legacy));
    idb.failWrites(quotaError(), 5);
    await loadOutbox(scope);
    expect(local.getItem(`h1t_offline_outbox_${ACCOUNT}`)).not.toBeNull();
    expect(readItems(scope)).toHaveLength(3);
    // The session carries on from the array: a new write is kept there too
    const { calls } = server({ "POST /days/2026-10-18/entries": [201] });
    await syncOfflineOutbox({ retryHeld: true });
    expect(calls.length).toBeGreaterThan(0);
  });

  it("an outbox is its account's: another account's records are neither read nor sent", async () => {
    await putItem(scope, { key: "a", seq: 1, id: ID, date: "2026-10-18", payload: {}, createdAt: 1, state: "queued" });
    killPage();
    local.setItem("h1t_auth_current_email", "other@example.com");
    const other = scopeFor("other@example.com", false)!;
    await loadOutbox(other);
    expect(readItems(other)).toEqual([]);
    const { calls } = server();
    await syncOfflineOutbox();
    expect(calls).toEqual([]);
  });
});

describe("S3: storage errors are never swallowed", () => {
  it("a full disk: the lasting alert is raised, the failure is reported once as kind storage, and the write is still sent", async () => {
    const { calls, bodies } = server({ "POST /days/2026-10-18/entries": [201] });
    idb.failWrites(quotaError(), 10);
    expect((await add()).state).toBe("saved");
    expect(getSyncAlerts().storage).toBe("quota");
    expect(calls).toContain("POST /client-errors");
    expect(bodies["POST /client-errors"][0]).toMatchObject({ kind: "storage", message: expect.stringContaining("quota") });
    // Room again: the next write that is kept clears it
    idb.fixDisk();
    await apiClient.addEntry({ id: "55555555-5555-4555-8555-555555555555", foodId: FOOD, grams: 100, mealSlot: "lunch", date: "2026-10-18" });
    expect(getSyncAlerts().storage).toBeNull();
  });

  it("a write that cannot be kept and cannot be sent is still in memory for this session, and the alert stays", async () => {
    server({ "POST /days/2026-10-18/entries": [503] });
    idb.failWrites(quotaError(), 10);
    expect((await add()).state).toBe("queued");
    expect(getSyncAlerts().storage).toBe("quota");
    expect(getPendingOfflineEntryIds()).toEqual([ID]);
  });
});

describe("one request per write", () => {
  it("a sync run that reaches a write while its own turn is sending it does not send it again", async () => {
    let release: (r: Response) => void = () => {};
    const sent: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string, init?: RequestInit) => {
        sent.push(`${init?.method} ${url}`);
        return new Promise<Response>((resolve) => (release = resolve));
      })
    );
    const adding = add();
    await vi.waitFor(() => expect(sent).toHaveLength(1));
    const running = syncOfflineOutbox({ retryHeld: true });
    await new Promise((r) => setTimeout(r, 20));
    release(new Response("{}", { status: 201 }));
    await adding;
    await running;
    expect(sent).toHaveLength(1);
    expect(idb.values("outbox")).toEqual([]);
  });

  it("an edit made right after a restart goes after the add the last page life left in the outbox", async () => {
    await putItem(scope, { key: "k1", seq: 1, id: ID, date: "2026-10-18", payload: { id: ID, food_id: FOOD }, createdAt: Date.now() - 5000, state: "queued", attempts: 1 });
    killPage();
    await loadSyncEngine();
    const { calls } = server({ "POST /days/2026-10-18/entries": [201], [`PATCH /entries/${ID}`]: [200] });
    // Nothing loaded the outbox yet: the edit must still wait for the add that is on disk
    const edit = await apiClient.updateEntry(ID, { meal_slot: "lunch" });
    expect(edit.state).toBe("queued");
    await vi.waitFor(() => expect(calls).toHaveLength(2));
    expect(calls).toEqual(["POST /days/2026-10-18/entries", `PATCH /entries/${ID}`]);
  });
});

describe("S7: delete racing an add", () => {
  it("the add is in the air: the DELETE waits for it and goes after it", async () => {
    const order: string[] = [];
    let releaseAdd: (r: Response) => void = () => {};
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string, init?: RequestInit) => {
        const key = `${init?.method ?? "GET"} ${String(url).replace("https://api.test/api/v1", "")}`;
        order.push(key);
        if (key.startsWith("POST")) return new Promise<Response>((resolve) => (releaseAdd = resolve));
        return Promise.resolve(new Response(null, { status: 204 }));
      })
    );
    const adding = add();
    await vi.waitFor(() => expect(order).toHaveLength(1));
    const deleting = apiClient.deleteEntry(ID);
    // The delete is committed too, but nothing is sent for it yet
    await vi.waitFor(() => expect(idb.values("outbox")).toHaveLength(2));
    expect(order).toEqual(["POST /days/2026-10-18/entries"]);
    releaseAdd(new Response("{}", { status: 201 }));
    expect((await adding).state).toBe("saved");
    expect((await deleting).state).toBe("saved");
    expect(order).toEqual(["POST /days/2026-10-18/entries", `DELETE /entries/${ID}`]);
    expect(idb.values("outbox")).toEqual([]);
  });
});

describe("S6: profile, weight and favourites go through the outbox, newest wins", () => {
  const profile = { sex: "male" as const, birthYear: 2000, weightKg: 70, goal: "maintain" as const };

  it("offline edits: one request per thing, with the newest values, sent when the network is back", async () => {
    server({ "PUT /me/profile": [503], "PUT /me/weight/2026-10-19": [503] });
    await apiClient.queueProfile({ ...profile, weightKg: 70 });
    await apiClient.queueProfile({ ...profile, weightKg: 71 });
    await apiClient.queueProfile({ ...profile, weightKg: 72 });
    await apiClient.queueWeight("2026-10-19", 70);
    await apiClient.queueWeight("2026-10-19", 72);
    expect(readItems(scope).map((i) => i.entity).sort()).toEqual(["profile", "weight:2026-10-19"]);
    expect(hasPendingWrite("profile")).toBe(true);

    const { calls, bodies } = server({ "PUT /me/profile": [200], "PUT /me/weight/2026-10-19": [200] });
    await syncOfflineOutbox();
    expect(calls).toEqual(["PUT /me/profile", "PUT /me/weight/2026-10-19"]);
    expect(bodies["PUT /me/profile"][0]).toMatchObject({ weight_kg: 72 });
    expect(bodies["PUT /me/weight/2026-10-19"][0]).toEqual({ weight_kg: 72 });
    expect(hasPendingWrite("profile")).toBe(false);
  });

  it("a favourite toggled on and off offline is one DELETE; the pending ones can be applied on top of a server list", async () => {
    server({ "POST /favourites": [503], [`DELETE /favourites/${FOOD}`]: [503] });
    await apiClient.setFavourite(FOOD, true);
    expect(pendingFavouriteOps()).toEqual([[FOOD, true]]);
    await apiClient.setFavourite(FOOD, false);
    expect(pendingFavouriteOps()).toEqual([[FOOD, false]]);
    const { calls } = server({ [`DELETE /favourites/${FOOD}`]: [204] });
    await syncOfflineOutbox();
    expect(calls).toEqual([`DELETE /favourites/${FOOD}`]);
  });

  it("a profile write the server refuses (400) is held and reported to the caller, not dropped", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    server({ "PUT /me/profile": [400] });
    const result = await apiClient.queueProfile(profile);
    expect(result.state).toBe("held");
    expect(readItems(scope)).toMatchObject([{ entity: "profile", held: { status: 400 } }]);
  });

  it("the sides survive a kill like diary writes do", async () => {
    server({ "PUT /me/profile": [503] });
    await apiClient.queueProfile(profile);
    killPage();
    await loadOutbox(scope);
    expect(hasPendingWrite("profile")).toBe(true);
  });
});

describe("S14: the day of a write is worked out when the write is made", () => {
  it("an add made at 23:59 VN goes to that day even when the request is sent after midnight", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    // 16:59:30 UTC = 23:59:30 in Ho Chi Minh on 18/10
    vi.setSystemTime(new Date("2026-10-18T16:59:30Z"));
    let release: (r: Response) => void = () => {};
    const paths: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        paths.push(String(url).replace("https://api.test/api/v1", ""));
        return new Promise<Response>((resolve) => (release = resolve));
      })
    );
    const adding = apiClient.addEntry({ id: ID, foodId: FOOD, grams: 100, mealSlot: "dinner" });
    // Midnight passes before the network answers
    vi.setSystemTime(new Date("2026-10-18T17:00:30Z"));
    await vi.waitFor(() => expect(paths).toHaveLength(1));
    release(new Response("{}", { status: 201 }));
    await adding;
    expect(paths).toEqual(["/days/2026-10-18/entries"]);
  });

  it("a queued add keeps the day it was made for after midnight", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-18T16:50:00Z"));
    server({ "POST /days/2026-10-18/entries": [503] });
    await apiClient.addEntry({ id: ID, foodId: FOOD, grams: 100, mealSlot: "dinner" });
    vi.setSystemTime(new Date("2026-10-18T18:00:00Z"));
    const { calls } = server({ "POST /days/2026-10-18/entries": [201] });
    await syncOfflineOutbox();
    expect(calls).toEqual(["POST /days/2026-10-18/entries"]);
  });
});

describe("cc-68 Part 2: a write for yesterday", () => {
  const PAST_DAY = JSON.stringify({ error: { code: "PAST_DAY_READ_ONLY", message: "Cannot write to past dates" } });
  // Today is 2026-10-19 (VN) in these cases
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-19T03:00:00Z"));
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });
  const answer409 = () => vi.fn(async () => new Response(PAST_DAY, { status: 409 }));

  it("add, edit and delete for yesterday are sent like today's", async () => {
    const { calls } = server({ "POST /days/2026-10-18/entries": [201], [`PATCH /entries/${ID}`]: [200], [`DELETE /entries/${ID}`]: [204] });
    expect((await add("2026-10-18")).state).toBe("saved");
    expect((await apiClient.updateEntry(ID, { meal_slot: "lunch" }, "2026-10-18")).state).toBe("saved");
    expect((await apiClient.deleteEntry(ID, "2026-10-18")).state).toBe("saved");
    expect(calls).toEqual(["POST /days/2026-10-18/entries", `PATCH /entries/${ID}`, `DELETE /entries/${ID}`]);
    expect(idb.values("outbox")).toEqual([]);
  });

  it("while the API does not allow yesterday yet (409 PAST_DAY), the write is held, not final, and goes on Thử lại", async () => {
    vi.stubGlobal("fetch", answer409());
    const result = await add("2026-10-18");
    expect(result).toMatchObject({ state: "held", status: 409, final: false });
    expect(readItems(scope)[0]).toMatchObject({ state: "held", held: { status: 409, final: false } });
    // The API allows it now: Thử lại sends it
    const { calls } = server({ "POST /days/2026-10-18/entries": [201] });
    expect((await syncOfflineOutbox({ retryHeld: true })).saved).toEqual([ID]);
    expect(calls).toEqual(["POST /days/2026-10-18/entries"]);
  });

  it("an edit or delete of yesterday's entry that gets 409 is held the same way", async () => {
    vi.stubGlobal("fetch", answer409());
    expect(await apiClient.updateEntry(ID, { meal_slot: "lunch" }, "2026-10-18")).toMatchObject({ state: "held", final: false });
    expect(await apiClient.deleteEntry(FOOD, "2026-10-18")).toMatchObject({ state: "held", final: false });
  });

  it("two days back and older stay read-only: 409 is final, kept as a lasting marker and never sent again", async () => {
    vi.stubGlobal("fetch", answer409());
    expect(await add("2026-10-17")).toMatchObject({ state: "held", status: 409, final: true });
    expect(await apiClient.deleteEntry(FOOD, "2026-10-01")).toMatchObject({ state: "held", final: true });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect(await syncOfflineOutbox({ retryHeld: true })).toEqual({ saved: [], held: [] });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(countItems(readItems(scope))).toMatchObject({ failed: 2, final: 2 });
  });

  it("an offline add made before midnight reaches the server after it, for the day it was made (yesterday by then)", async () => {
    vi.setSystemTime(new Date("2026-10-18T16:50:00Z"));
    server({ "POST /days/2026-10-18/entries": [503] });
    await apiClient.addEntry({ id: ID, foodId: FOOD, grams: 100, mealSlot: "dinner" });
    vi.setSystemTime(new Date("2026-10-19T03:00:00Z"));
    const { calls } = server({ "POST /days/2026-10-18/entries": [201] });
    expect((await syncOfflineOutbox()).saved).toEqual([ID]);
    expect(calls).toEqual(["POST /days/2026-10-18/entries"]);
  });
});

describe("countItems", () => {
  it("pending, failed, final and parked are counted apart, with the age of the oldest pending write", () => {
    const base = { id: "x", date: "", payload: {} };
    const counts = countItems([
      { ...base, key: "a", createdAt: 500 },
      { ...base, key: "b", createdAt: 100, state: "sending" },
      { ...base, key: "c", createdAt: 50, held: { status: 400, message: "" } },
      { ...base, key: "d", createdAt: 60, held: { status: 409, message: "", final: true } },
      { ...base, key: "e", createdAt: 70, parked: true },
    ]);
    expect(counts).toEqual({ pending: 2, failed: 3, final: 1, parked: 1, oldestPendingAt: 100 });
  });
});
