import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient, getPendingOfflineEntryIds, loadSyncEngine, syncOfflineOutbox } from "../api-client";
import type { AddedDiaryEntry } from "../diary-edits";
import { entriesFromDaySummary, mergeServerDay } from "../server-day";

// cc-65: the real api-client and mergeServerDay against an in-memory API that behaves like apps/api: an add is an upsert
// by the client's uuid (a replay never makes a second row), a day before yesterday answers 409 PAST_DAY_READ_ONLY (judged by
// made_at, when the user made the write, within 14 days: hotfix 20/10), an expired session answers 401 until GET /auth/session
// renews it, and the last write to an entry wins.

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
    /** false: a server from before the hotfix, which judges a day by the time the write arrives. */
    knowsMadeAt: true,
    /** A write from another device, straight to the server. */
    patchFromElsewhere(id: string, grams: number) {
      rows.get(id)!.grams = grams;
    },
    /** apps/api's rule: made_at's day (Ho Chi Minh) or the one before, made_at no older than 14 days and not ahead; else the server clock. */
    writable(day: string, madeAt?: string): boolean {
      if (!api.knowsMadeAt || !madeAt) return day >= new Date(Date.now() + 7 * 3600_000 - 86_400_000).toISOString().slice(0, 10);
      const when = Date.parse(madeAt);
      if (when > Date.now() + 5 * 60_000 || Date.now() - when > 14 * 86_400_000) return false;
      return day >= new Date(when + 7 * 3600_000 - 86_400_000).toISOString().slice(0, 10);
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
        if (!api.writable(day, body.made_at)) return json(409, { error: { code: "PAST_DAY_READ_ONLY", message: "read only" } });
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

  it("a server that does not know made_at refuses a two-day-old date: held, not final; the poll leaves it alone, Thử lại sends it again", async () => {
    const api = fakeApi();
    api.knowsMadeAt = false;
    vi.useFakeTimers({ toFake: ["Date"] });
    try {
      // Made on 18/10 for 18/10, reaching the old server on 20/10: it refuses (two days back by its clock)
      vi.setSystemTime(new Date("2026-10-18T05:00:00Z"));
      api.offline = true;
      await add("2026-10-18");
      vi.setSystemTime(new Date("2026-10-20T03:00:00Z"));
      api.offline = false;
      const first = await syncOfflineOutbox({ force: true });
      expect(first.held).toEqual([{ id: ID, status: 409, date: "2026-10-18", final: false }]);
      const sent = api.calls.filter((c) => c.startsWith("POST /days")).length;
      await syncOfflineOutbox({ force: true });
      expect(api.calls.filter((c) => c.startsWith("POST /days"))).toHaveLength(sent);
      // The server learns made_at (the deploy): Thử lại sends it, and it is saved
      api.knowsMadeAt = true;
      expect((await syncOfflineOutbox({ retryHeld: true })).saved).toEqual([ID]);
    } finally {
      vi.useRealTimers();
    }
    expect(api.rows.get(ID)?.day).toBe("2026-10-18");
  });

  it("a write made offline three days ago is judged by when it was made: saved for that day when it reaches the server", async () => {
    const api = fakeApi();
    vi.useFakeTimers({ toFake: ["Date"] });
    try {
      vi.setSystemTime(new Date("2026-10-17T05:00:00Z"));
      api.offline = true;
      expect((await add("2026-10-17")).state).toBe("queued");
      vi.setSystemTime(new Date("2026-10-20T03:00:00Z"));
      api.offline = false;
      expect((await syncOfflineOutbox({ force: true })).saved).toEqual([ID]);
    } finally {
      vi.useRealTimers();
    }
    expect(api.rows.get(ID)?.day).toBe("2026-10-17");
    expect(getPendingOfflineEntryIds()).toEqual([]);
  });

  it("a write made 15 days ago is refused for good: final, not sent by the poll, sent again (and refused again) by Thử lại", async () => {
    const api = fakeApi();
    vi.useFakeTimers({ toFake: ["Date"] });
    try {
      vi.setSystemTime(new Date("2026-10-04T05:00:00Z"));
      api.offline = true;
      await add("2026-10-04");
      vi.setSystemTime(new Date("2026-10-20T03:00:00Z"));
      api.offline = false;
      const first = await syncOfflineOutbox({ force: true });
      expect(first.held).toEqual([{ id: ID, status: 409, date: "2026-10-04", final: true }]);
      const sent = api.calls.filter((c) => c.startsWith("POST /days")).length;
      await syncOfflineOutbox({ force: true });
      expect(api.calls.filter((c) => c.startsWith("POST /days"))).toHaveLength(sent);
      await syncOfflineOutbox({ retryHeld: true });
      expect(api.calls.filter((c) => c.startsWith("POST /days"))).toHaveLength(sent + 1);
    } finally {
      vi.useRealTimers();
    }
    expect(api.rows.size).toBe(0);
    expect(getPendingOfflineEntryIds()).toEqual([ID]);
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
