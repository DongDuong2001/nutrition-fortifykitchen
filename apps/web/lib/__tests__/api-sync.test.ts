import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient, apiFetch, getPendingOfflineEntryIds, pendingWriteIds, syncOfflineOutbox, writeOutcome, writesInFlight } from "../api-client";

// cc-49: a diary write must never live only on the device. These run the real apiClient against a mocked fetch.

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

type Answer = number | "network";
/** A server that answers each call to `path` with the next status in its list (the last one repeats). */
function server(answers: Record<string, Answer[]>) {
  const calls: string[] = [];
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const path = url.replace("https://api.test/api/v1", "");
    const key = `${init?.method ?? "GET"} ${path}`;
    calls.push(key);
    const list = answers[key] ?? answers[path] ?? [200];
    const answer = list.length > 1 ? list.shift()! : list[0];
    if (answer === "network") throw new TypeError("Failed to fetch");
    return new Response(answer === 204 ? null : JSON.stringify({ data: {} }), { status: answer });
  });
  vi.stubGlobal("fetch", fetchMock);
  return calls;
}

const ID = "11111111-1111-4111-8111-111111111111";
const FOOD = "22222222-2222-4222-8222-222222222222";
const add = () => apiClient.addEntry({ id: ID, foodId: FOOD, grams: 100, mealSlot: "breakfast", date: "2026-10-18" });

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_API_MODE", "live");
  vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.test/api/v1");
  const local = memoryStorage();
  local.setItem("h1t_auth_current_email", "sync@example.com");
  vi.stubGlobal("localStorage", local);
  vi.stubGlobal("window", { localStorage: local, sessionStorage: memoryStorage(), location: { search: "", pathname: "/app" } });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("cause a: a non-2xx answer to a diary write is not dropped", () => {
  it("a 401 that stays 401 leaves the entry in the outbox", async () => {
    server({ "POST /days/2026-10-18/entries": [401] });
    await add();
    expect(getPendingOfflineEntryIds()).toContain(ID);
  });

  it("a 500 leaves the entry in the outbox", async () => {
    server({ "POST /days/2026-10-18/entries": [500] });
    await add();
    expect(getPendingOfflineEntryIds()).toContain(ID);
  });
});

describe("cause b: an expired session cookie is refreshed and the request sent again", () => {
  it("POST 401 → GET /auth/session → POST again → 201: saved, nothing queued", async () => {
    const calls = server({ "POST /days/2026-10-18/entries": [401, 201], "/auth/session": [204] });
    await add();
    expect(calls).toEqual(["POST /days/2026-10-18/entries", "GET /auth/session", "POST /days/2026-10-18/entries"]);
    expect(getPendingOfflineEntryIds()).not.toContain(ID);
  });
});

describe("writeOutcome", () => {
  it("saved on 2xx, sent again without an answer, on 401, 408, 429 and 5xx, held on any other 4xx", () => {
    expect([200, 201, 204].map((s) => writeOutcome(s, "POST"))).toEqual(["saved", "saved", "saved"]);
    expect([0, 401, 408, 429, 500, 503].map((s) => writeOutcome(s, "POST"))).toEqual(Array(6).fill("retry"));
    expect([400, 403, 404, 409, 422].map((s) => writeOutcome(s, "PATCH"))).toEqual(Array(5).fill("held"));
  });

  it("a DELETE that finds nothing (404) is done: the entry is gone already", () => {
    expect(writeOutcome(404, "DELETE")).toBe("saved");
  });
});

describe("the outbox", () => {
  const outbox = () => JSON.parse(localStorage.getItem("h1t_offline_outbox_sync@example.com") || "[]");

  it("a 400 is held with the server's message and not sent again until Thử lại", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const calls = server({ "POST /days/2026-10-18/entries": [201] });
    vi.mocked(fetch).mockImplementationOnce(
      async () => new Response(JSON.stringify({ error: { code: "VALIDATION_FAILED", message: "failed to insert diary entry" } }), { status: 400 })
    );
    const result = await add();
    expect(result).toMatchObject({ state: "held", status: 400, message: "failed to insert diary entry" });
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("400 failed to insert diary entry"));
    expect(await syncOfflineOutbox()).toEqual({ saved: [], held: [] });
    expect(outbox()).toHaveLength(1);
    expect(await syncOfflineOutbox({ retryHeld: true })).toEqual({ saved: [ID], held: [] });
    expect(outbox()).toEqual([]);
    expect(calls.filter((c) => c.startsWith("POST"))).toHaveLength(1);
  });

  it("a 500 is sent again on the next sync and leaves the outbox once saved; five failures do not drop it", async () => {
    server({ "POST /days/2026-10-18/entries": [500, 500, 500, 500, 500, 500, 201] });
    expect((await add()).state).toBe("queued");
    for (let i = 0; i < 5; i++) await syncOfflineOutbox();
    expect(outbox()).toHaveLength(1);
    expect((await syncOfflineOutbox()).saved).toEqual([ID]);
    expect(outbox()).toEqual([]);
  });

  it("an edit and a delete that fail are queued and sent in order after the add", async () => {
    const calls = server({ "POST /days/2026-10-18/entries": ["network", 201] });
    await add();
    expect((await apiClient.updateEntry(ID, { meal_slot: "lunch", grams: 150 })).state).toBe("queued");
    expect(calls.filter((c) => c.startsWith("PATCH"))).toEqual([]);
    expect(outbox().map((i: { method?: string }) => i.method ?? "POST")).toEqual(["POST", "PATCH"]);
    await syncOfflineOutbox();
    expect(calls.slice(-2)).toEqual(["POST /days/2026-10-18/entries", `PATCH /entries/${ID}`]);
    expect(outbox()).toEqual([]);
  });

  it("deleting an entry the server never had drops its queued writes and sends nothing", async () => {
    const calls = server({ "POST /days/2026-10-18/entries": [503] });
    await add();
    expect((await apiClient.deleteEntry(ID)).state).toBe("saved");
    expect(outbox()).toEqual([]);
    expect(calls.filter((c) => c.startsWith("DELETE"))).toEqual([]);
  });

  it("a delete that fails is queued; undo takes the queued delete back", async () => {
    const calls = server({ [`DELETE /entries/${ID}`]: [500] });
    expect((await apiClient.deleteEntry(ID)).state).toBe("queued");
    expect(pendingWriteIds().has(ID)).toBe(true);
    expect((await apiClient.restoreEntry(ID)).state).toBe("saved");
    expect(outbox()).toEqual([]);
    expect(calls.filter((c) => c.includes("/restore"))).toEqual([]);
  });

  it("a write queued while a sync runs is kept", async () => {
    const OTHER = "33333333-3333-4333-8333-333333333333";
    // The first add fails once, then saves; the other one always fails
    let first = true;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: RequestInit) => {
        const id = JSON.parse(String(init?.body ?? "{}")).id;
        const ok = id === ID && !first;
        if (id === ID) first = false;
        return new Response("{}", { status: ok ? 201 : 500 });
      })
    );
    await add();
    const running = syncOfflineOutbox();
    await apiClient.addEntry({ id: OTHER, foodId: FOOD, grams: 50, mealSlot: "lunch", date: "2026-10-18" });
    await running;
    expect(outbox().map((i: { id: string }) => i.id)).toEqual([OTHER]);
  });

  it("an add queued before cc-49 (no method, no key) is still sent", async () => {
    localStorage.setItem(
      "h1t_offline_outbox_sync@example.com",
      JSON.stringify([{ id: ID, date: "2026-10-18", payload: { id: ID }, createdAt: 1, retries: 2 }])
    );
    const calls = server({ "POST /days/2026-10-18/entries": [201] });
    expect((await syncOfflineOutbox()).saved).toEqual([ID]);
    expect(calls).toEqual(["POST /days/2026-10-18/entries"]);
  });

  it("an in-flight write is pending; once it answers it is not", async () => {
    let release: (r: Response) => void = () => {};
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>((resolve) => (release = resolve))));
    const sending = add();
    expect(pendingWriteIds().has(ID)).toBe(true);
    expect(writesInFlight()).toBe(1);
    await Promise.resolve();
    release(new Response("{}", { status: 201 }));
    await sending;
    await Promise.resolve();
    expect(writesInFlight()).toBe(0);
    expect(pendingWriteIds().has(ID)).toBe(false);
  });
});

describe("apiFetch", () => {
  it("a second 401 after the refresh is returned as it is (no loop)", async () => {
    const calls = server({ "GET /me": [401], "/auth/session": [204] });
    const res = await apiFetch("/me");
    expect(res.status).toBe(401);
    expect(calls).toEqual(["GET /me", "GET /auth/session", "GET /me"]);
  });

  it("two 401s at once share one /auth/session", async () => {
    const calls = server({ "GET /me": [401, 401, 200], "/auth/session": [204] });
    await Promise.all([apiFetch("/me"), apiFetch("/me")]);
    expect(calls.filter((c) => c === "GET /auth/session")).toHaveLength(1);
  });
});

describe("accounts (review 05:30 M2: the outbox is pinned to its account)", () => {
  const outboxOf = (email: string) => JSON.parse(localStorage.getItem(`h1t_offline_outbox_${email}`) || "[]") as Array<{ id: string; method?: string }>;

  it("a write that fails after the account changed goes to its own account's outbox, never the new one's", async () => {
    let release: (r: Response) => void = () => {};
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>((resolve) => (release = resolve))));
    const sending = add();
    localStorage.setItem("h1t_auth_current_email", "other@example.com");
    await Promise.resolve();
    release(new Response("{}", { status: 500 }));
    await sending;
    expect(localStorage.getItem("h1t_offline_outbox_other@example.com")).toBeNull();
    expect(outboxOf("sync@example.com").map((i) => i.id)).toEqual([ID]);
  });

  it("a DELETE failing after the switch is in A's outbox (it is not lost)", async () => {
    let release: (r: Response) => void = () => {};
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>((resolve) => (release = resolve))));
    const deleting = apiClient.deleteEntry(ID);
    localStorage.setItem("h1t_auth_current_email", "other@example.com");
    await Promise.resolve();
    release(new Response("{}", { status: 503 }));
    await deleting;
    expect(outboxOf("sync@example.com")).toMatchObject([{ id: ID, method: "DELETE" }]);
    expect(localStorage.getItem("h1t_offline_outbox_other@example.com")).toBeNull();
  });

  it("an account switch between two outbox items: the second is not sent, and stays in A's outbox", async () => {
    const OTHER = "33333333-3333-4333-8333-333333333333";
    localStorage.setItem(
      "h1t_offline_outbox_sync@example.com",
      JSON.stringify([
        { id: ID, date: "2026-10-18", payload: { id: ID }, createdAt: 1, key: "k1" },
        { id: OTHER, date: "2026-10-18", payload: { id: OTHER }, createdAt: 2, key: "k2" },
      ])
    );
    const sent: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: RequestInit) => {
        sent.push(JSON.parse(String(init?.body)).id);
        localStorage.setItem("h1t_auth_current_email", "other@example.com");
        return new Response("{}", { status: 201 });
      })
    );
    await syncOfflineOutbox();
    expect(sent).toEqual([ID]);
    expect(outboxOf("sync@example.com").map((i) => i.id)).toEqual([OTHER]);
    expect(localStorage.getItem("h1t_offline_outbox_other@example.com")).toBeNull();
  });
});

describe("writes that can never succeed (review 05:30 M1)", () => {
  it("a recipe (no server food row) is never sent: state local, no request", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const result = await apiClient.addEntry({ id: ID, foodId: "recipe-1729", grams: 200, mealSlot: "lunch", date: "2026-10-18" });
    expect(result.state).toBe("local");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(getPendingOfflineEntryIds()).toEqual([]);
  });

  it("409 PAST_DAY_READ_ONLY is final: reported once, never sent again, not even on app open or Thử lại", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    localStorage.setItem(
      "h1t_offline_outbox_sync@example.com",
      JSON.stringify([{ id: ID, date: "2026-10-17", payload: { id: ID }, createdAt: 1, key: "k1" }])
    );
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ error: { code: "PAST_DAY_READ_ONLY", message: "Cannot write to past dates" } }), { status: 409 }));
    vi.stubGlobal("fetch", fetchMock);
    const first = await syncOfflineOutbox();
    expect(first.held).toEqual([{ id: ID, status: 409, message: "Cannot write to past dates", date: "2026-10-17", final: true }]);
    expect(await syncOfflineOutbox({ retryHeld: true })).toEqual({ saved: [], held: [] });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(getPendingOfflineEntryIds()).toEqual([ID]);
  });

  it("another 409 (not a past day) is held as before: sent again on Thử lại", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    server({ "POST /days/2026-10-18/entries": [409, 201] });
    expect((await add()).final).toBe(false);
    expect((await syncOfflineOutbox({ retryHeld: true })).saved).toEqual([ID]);
  });
});
