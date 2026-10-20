import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient, getPendingOfflineEntryIds, loadSyncEngine, syncOfflineOutbox } from "../api-client";
import type { AddedDiaryEntry } from "../diary-edits";
import { entriesFromDaySummary, mergeServerDay } from "../server-day";

// cc-65: the real api-client and mergeServerDay against an in-memory API that behaves like apps/api: an add is an upsert
// by the client's uuid (a replay never makes a second row), a day before yesterday answers 409 PAST_DAY_READ_ONLY, an
// expired session answers 401 until GET /auth/session renews it, and the last write to an entry wins.

const BASE = "https://api.test/api/v1";
const TODAY = "2026-10-20";
const FOOD = "22222222-2222-4222-8222-222222222222";
const ID = "44444444-4444-4444-8444-444444444444";

interface Row {
  id: string;
  day: string;
  food_id: string;
  grams: number;
  meal_slot: string;
  created_at: string;
}

function fakeApi() {
  const rows = new Map<string, Row>();
  const calls: string[] = [];
  const api = {
    rows,
    calls,
    sessionExpired: false,
    /** The server saves the next add, then the answer never arrives (a dropped connection). */
    loseNextAnswer: false,
    offline: false,
    /** A write from another device, straight to the server. */
    patchFromElsewhere(id: string, grams: number) {
      rows.get(id)!.grams = grams;
    },
    async handle(url: string, init?: RequestInit): Promise<Response> {
      const method = init?.method ?? "GET";
      const path = url.replace(BASE, "");
      calls.push(`${method} ${path}`);
      if (api.offline) throw new TypeError("Failed to fetch");
      if (path === "/auth/session") {
        api.sessionExpired = false;
        return new Response(null, { status: 204 });
      }
      if (path === "/client-errors") return new Response(null, { status: 204 });
      if (api.sessionExpired) return json(401, { error: { code: "UNAUTHORIZED", message: "expired" } });
      const body = init?.body ? JSON.parse(String(init.body)) : {};

      let m = path.match(/^\/days\/(\d{4}-\d{2}-\d{2})\/entries$/);
      if (m && method === "POST") {
        const day = m[1];
        if (day < "2026-10-19") return json(409, { error: { code: "PAST_DAY_READ_ONLY", message: "read only" } });
        if (!rows.has(body.id)) rows.set(body.id, { id: body.id, day, food_id: body.food_id, grams: body.grams, meal_slot: body.meal_slot, created_at: new Date().toISOString() });
        if (api.loseNextAnswer) {
          api.loseNextAnswer = false;
          throw new TypeError("Failed to fetch");
        }
        return json(201, { data: rows.get(body.id) });
      }
      m = path.match(/^\/entries\/([^/]+)$/);
      if (m && method === "PATCH") {
        const row = rows.get(decodeURIComponent(m[1]));
        if (!row) return json(404, { error: { code: "NOT_FOUND", message: "no entry" } });
        if (typeof body.grams === "number") row.grams = body.grams;
        return json(200, { data: row });
      }
      m = path.match(/^\/days\/(\d{4}-\d{2}-\d{2})$/);
      if (m && method === "GET") {
        const entries = [...rows.values()].filter((r) => r.day === m![1]);
        const meals = [...new Set(entries.map((e) => e.meal_slot))].map((slot) => ({
          meal_slot: slot,
          entries: entries.filter((e) => e.meal_slot === slot).map((e) => ({ ...e, food_name: "Cơm", calories: e.grams })),
        }));
        return json(200, { data: { date: m[1], training_minutes: null, is_read_only: false, summary: {}, meals } });
      }
      return json(404, { error: { code: "NOT_FOUND", message: path } });
    },
  };
  vi.stubGlobal("fetch", vi.fn(api.handle));
  return api;
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

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

/** The device's view of a day after a refetch, the way diary-store merges it. */
async function refetch(local: AddedDiaryEntry[], day: string, keep: Set<string> = new Set()) {
  const summary = await apiClient.getDay(day);
  expect(summary).not.toBeNull();
  return mergeServerDay(local, entriesFromDaySummary(summary!, day), { keep, startedAt: Date.now() });
}

const add = (date = TODAY, id = ID) => apiClient.addEntry({ id, foodId: FOOD, grams: 100, mealSlot: "lunch", date });

beforeEach(async () => {
  vi.stubEnv("NEXT_PUBLIC_API_MODE", "live");
  vi.stubEnv("NEXT_PUBLIC_API_URL", BASE);
  const local = memoryStorage();
  local.setItem("h1t_auth_current_email", "fake-api@example.com");
  vi.stubGlobal("localStorage", local);
  vi.stubGlobal("window", { localStorage: local, sessionStorage: memoryStorage(), location: { search: "", pathname: "/app" } });
  vi.spyOn(console, "warn").mockImplementation(() => {});
  await loadSyncEngine();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("sync against a fake API", () => {
  it("401, then the session is renewed and the add is saved once", async () => {
    const api = fakeApi();
    api.sessionExpired = true;
    expect((await add()).state).toBe("saved");
    expect(api.calls).toEqual([`POST /days/${TODAY}/entries`, "GET /auth/session", `POST /days/${TODAY}/entries`]);
    expect(api.rows.size).toBe(1);
    expect(getPendingOfflineEntryIds()).toEqual([]);
  });

  it("409 PAST_DAY_READ_ONLY is final: the server keeps nothing and the write is never sent again", async () => {
    const api = fakeApi();
    const result = await add("2026-10-17");
    expect(result).toMatchObject({ state: "held", status: 409 });
    expect(api.rows.size).toBe(0);
    await syncOfflineOutbox({ force: true });
    await syncOfflineOutbox({ retryHeld: true });
    expect(api.calls.filter((c) => c.startsWith("POST /days"))).toHaveLength(1);
  });

  it("a replayed uuid (the server saved it, the answer was lost) makes no second row, and the day shows it once", async () => {
    const api = fakeApi();
    api.loseNextAnswer = true;
    expect((await add()).state).toBe("queued");
    expect(api.rows.size).toBe(1);
    expect((await syncOfflineOutbox({ force: true })).saved).toEqual([ID]);
    expect(api.calls.filter((c) => c === `POST /days/${TODAY}/entries`)).toHaveLength(2);
    expect(api.rows.size).toBe(1);

    const local = [{ id: ID, foodId: FOOD, grams: 100, mealSlot: "lunch", addedAt: new Date().toISOString(), day: TODAY } as AddedDiaryEntry];
    const day = await refetch(local, TODAY);
    expect(day.map((e) => e.id)).toEqual([ID]);
  });

  it("the same entry edited on two devices: the device's unsent edit shows until it is sent, then the last write wins everywhere", async () => {
    const api = fakeApi();
    await add();
    const mine = (await refetch([], TODAY))[0];
    expect(mine.grams).toBe(100);

    // Another device saves 300 g; this one edits to 200 g while offline
    api.patchFromElsewhere(ID, 300);
    api.offline = true;
    expect((await apiClient.updateEntry(ID, { grams: 200 }, TODAY)).state).toBe("queued");
    api.offline = false;

    // A refetch while the edit waits keeps this device's 200 g (the entry is in `keep`)
    const edited = { ...mine, grams: 200 };
    const waiting = await refetch([edited], TODAY, new Set(getPendingOfflineEntryIds()));
    expect(waiting.map((e) => e.grams)).toEqual([200]);

    // Sent: the server takes 200 g (last write), and both devices read it back, one row each
    expect((await syncOfflineOutbox({ force: true })).saved).toEqual([ID]);
    expect(api.rows.get(ID)!.grams).toBe(200);
    expect((await refetch(waiting, TODAY)).map((e) => e.grams)).toEqual([200]);
    expect((await refetch([{ ...mine, grams: 300, synced: true }], TODAY)).map((e) => [e.id, e.grams])).toEqual([[ID, 200]]);
  });
});
