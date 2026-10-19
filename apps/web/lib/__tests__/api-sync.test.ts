import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { putItem } from "../outbox";
import { FINAL_OUTBOX_KEEP_MS, loadSyncEngine, apiClient, apiFetch, getPendingOfflineEntryIds, pendingWriteIds, pruneOutbox, syncOfflineOutbox, writeOutcome, writesInFlight } from "../api-client";

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

beforeEach(async () => {
  vi.stubEnv("NEXT_PUBLIC_API_MODE", "live");
  vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.test/api/v1");
  const local = memoryStorage();
  local.setItem("h1t_auth_current_email", "sync@example.com");
  vi.stubGlobal("localStorage", local);
  vi.stubGlobal("window", { localStorage: local, sessionStorage: memoryStorage(), location: { search: "", pathname: "/app" } });
  await loadSyncEngine();
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

describe("addEntry body (cc-51)", () => {
  it("sends the portion as picked, so another device shows 1 chén, not 150 g", async () => {
    const bodies: unknown[] = [];
    vi.stubGlobal("fetch", vi.fn(async (_url: string, init?: RequestInit) => {
      bodies.push(JSON.parse(String(init?.body)));
      return new Response("{}", { status: 201 });
    }));
    await apiClient.addEntry({ id: ID, foodId: FOOD, grams: 150, mealSlot: "lunch", date: "2026-10-18", servingLabel: "1 chén" });
    expect(bodies[0]).toMatchObject({ grams: 150, serving_label: "1 chén" });
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

  it("a 400 is held with its status and not sent again until Thử lại", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const calls = server({ "POST /days/2026-10-18/entries": [201] });
    vi.mocked(fetch).mockImplementationOnce(
      async () => new Response(JSON.stringify({ error: { code: "VALIDATION_FAILED", message: "failed to insert diary entry" } }), { status: 400 })
    );
    const result = await add();
    expect(result).toMatchObject({ state: "held", status: 400 });
    // cc-63, X7: the server's text is not kept; its error code is
    expect(result).not.toHaveProperty("message");
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("400 VALIDATION_FAILED"));
    expect(console.warn).not.toHaveBeenCalledWith(expect.stringContaining("failed to insert"));
    expect(await syncOfflineOutbox({ force: true })).toEqual({ saved: [], held: [] });
    expect(outbox()).toHaveLength(1);
    expect(await syncOfflineOutbox({ retryHeld: true })).toEqual({ saved: [ID], held: [] });
    expect(outbox()).toEqual([]);
    expect(calls.filter((c) => c.startsWith("POST /days"))).toHaveLength(1);
    // cc-50: the refusal is reported once (POST /client-errors), however often it is held again
    expect(calls.filter((c) => c === "POST /client-errors")).toHaveLength(1);
  });

  it("a 500 is sent again on the next sync and leaves the outbox once saved; five failures do not drop it", async () => {
    server({ "POST /days/2026-10-18/entries": [500, 500, 500, 500, 500, 500, 201] });
    expect((await add()).state).toBe("queued");
    for (let i = 0; i < 5; i++) await syncOfflineOutbox({ force: true });
    expect(outbox()).toHaveLength(1);
    expect((await syncOfflineOutbox({ force: true })).saved).toEqual([ID]);
    expect(outbox()).toEqual([]);
  });

  it("an edit and a delete that fail are queued and sent in order after the add", async () => {
    const calls = server({ "POST /days/2026-10-18/entries": ["network", 201] });
    await add();
    expect((await apiClient.updateEntry(ID, { meal_slot: "lunch", grams: 150 })).state).toBe("queued");
    expect(calls.filter((c) => c.startsWith("PATCH"))).toEqual([]);
    expect(outbox().map((i: { method?: string }) => i.method ?? "POST")).toEqual(["POST", "PATCH"]);
    await syncOfflineOutbox({ force: true });
    expect(calls.slice(-2)).toEqual(["POST /days/2026-10-18/entries", `PATCH /entries/${ID}`]);
    expect(outbox()).toEqual([]);
  });

  it("S7: deleting an entry whose add was attempted keeps the add and queues the DELETE behind it", async () => {
    const calls = server({ "POST /days/2026-10-18/entries": [503, 201] });
    await add();
    // The add was attempted (a 503 from a proxy may come after the database saved it): it is not dropped
    expect((await apiClient.deleteEntry(ID)).state).toBe("queued");
    expect(outbox().map((i: { method?: string }) => i.method ?? "POST")).toEqual(["POST", "DELETE"]);
    expect(calls.filter((c) => c.startsWith("DELETE"))).toEqual([]);
    await syncOfflineOutbox({ force: true });
    expect(calls.slice(-2)).toEqual(["POST /days/2026-10-18/entries", `DELETE /entries/${ID}`]);
    expect(outbox()).toEqual([]);
  });

  it("S7: an add that never left the device is dropped with the delete, and nothing is sent", async () => {
    const calls = server({});
    const scope = { id: "sync@example.com", legacyKey: "h1t_offline_outbox_sync@example.com", account: "sync@example.com" };
    await putItem(scope, { key: "k1", seq: 1, id: ID, date: "2026-10-18", payload: { id: ID }, createdAt: Date.now(), state: "queued", attempts: 0 });
    expect((await apiClient.deleteEntry(ID)).state).toBe("saved");
    expect(outbox()).toEqual([]);
    expect(calls).toEqual([]);
  });

  it("a delete that fails is queued; undo of an attempted delete queues the restore behind it", async () => {
    const calls = server({ [`DELETE /entries/${ID}`]: [500], [`POST /entries/${ID}/restore`]: [200] });
    expect((await apiClient.deleteEntry(ID)).state).toBe("queued");
    expect(pendingWriteIds().has(ID)).toBe(true);
    // The delete was attempted (it may have been applied): the restore goes after it
    expect((await apiClient.restoreEntry(ID)).state).toBe("queued");
    expect(outbox().map((i: { method?: string; path?: string }) => `${i.method} ${i.path}`)).toEqual([`DELETE /entries/${ID}`, `POST /entries/${ID}/restore`]);
    expect(calls.filter((c) => c.includes("/restore"))).toEqual([]);
  });

  it("undo of a delete that never left the device takes it back and sends nothing", async () => {
    const calls = server({});
    const scope = { id: "sync@example.com", legacyKey: "h1t_offline_outbox_sync@example.com", account: "sync@example.com" };
    await putItem(scope, { key: "k1", seq: 1, id: ID, date: "", method: "DELETE", path: `/entries/${ID}`, payload: {}, createdAt: Date.now(), state: "queued", attempts: 0 });
    expect((await apiClient.restoreEntry(ID)).state).toBe("saved");
    expect(outbox()).toEqual([]);
    expect(calls).toEqual([]);
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
    const running = syncOfflineOutbox({ force: true });
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
    expect((await syncOfflineOutbox({ force: true })).saved).toEqual([ID]);
    expect(calls).toEqual(["POST /days/2026-10-18/entries"]);
  });

  it("an in-flight write is pending; once it answers it is not", async () => {
    let release: (r: Response) => void = () => {};
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>((resolve) => (release = resolve))));
    const sending = add();
    expect(pendingWriteIds().has(ID)).toBe(true);
    expect(writesInFlight()).toBe(1);
    await vi.waitFor(() => expect(fetch).toHaveBeenCalled());
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

  it("review 07:00: another account signed in during the refresh: not sent again, the write waits in its own outbox", async () => {
    const calls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        const path = url.replace("https://api.test/api/v1", "");
        calls.push(`${init?.method ?? "GET"} ${path}`);
        if (path === "/auth/session") {
          localStorage.setItem("h1t_auth_current_email", "other@example.com");
          return new Response(null, { status: 204 });
        }
        return new Response("{}", { status: 401 });
      })
    );
    const result = await add();
    expect(calls.filter((c) => !c.endsWith("/client-errors"))).toEqual(["POST /days/2026-10-18/entries", "GET /auth/session"]);
    expect(result.state).toBe("queued");
    expect(JSON.parse(localStorage.getItem("h1t_offline_outbox_sync@example.com") || "[]").map((i: { id: string }) => i.id)).toEqual([ID]);
    expect(localStorage.getItem("h1t_offline_outbox_other@example.com")).toBeNull();
  });

  it("two 401s at once share one /auth/session", async () => {
    const calls = server({ "GET /me": [401, 401, 200], "/auth/session": [204] });
    await Promise.all([apiFetch("/me"), apiFetch("/me")]);
    expect(calls.filter((c) => c === "GET /auth/session")).toHaveLength(1);
  });
});

describe("accounts (review 05:30 M2: the outbox is pinned to its account)", () => {
  const outboxOf = (email: string) => JSON.parse(localStorage.getItem(`h1t_offline_outbox_${email}`) || "[]") as Array<{ id: string; method?: string }>;

  it("cc-51: one account's queued writes are never shown or sent for another", async () => {
    server({ "POST /days/2026-10-18/entries": [503] });
    await add();
    expect(getPendingOfflineEntryIds()).toEqual([ID]);
    localStorage.setItem("h1t_auth_current_email", "other@example.com");
    expect(getPendingOfflineEntryIds()).toEqual([]);
    expect(pendingWriteIds().has(ID)).toBe(false);
    localStorage.setItem("h1t_auth_current_email", "sync@example.com");
    expect(getPendingOfflineEntryIds()).toEqual([ID]);
  });

  it("a write that fails after the account changed goes to its own account's outbox, never the new one's", async () => {
    let release: (r: Response) => void = () => {};
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>((resolve) => (release = resolve))));
    const sending = add();
    localStorage.setItem("h1t_auth_current_email", "other@example.com");
    await vi.waitFor(() => expect(fetch).toHaveBeenCalled());
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
    await vi.waitFor(() => expect(fetch).toHaveBeenCalled());
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
      vi.fn(async (url: string, init?: RequestInit) => {
        // (items this old are also reported to /client-errors as outbox_age; that is not a diary write)
        if (String(url).endsWith("/client-errors")) return new Response(null, { status: 204 });
        sent.push(JSON.parse(String(init?.body)).id);
        localStorage.setItem("h1t_auth_current_email", "other@example.com");
        return new Response("{}", { status: 201 });
      })
    );
    await syncOfflineOutbox({ force: true });
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
      JSON.stringify([{ id: ID, date: "2026-10-17", payload: { id: ID }, createdAt: Date.now(), key: "k1" }])
    );
    const fetchMock = vi.fn(async (_url: string) => new Response(JSON.stringify({ error: { code: "PAST_DAY_READ_ONLY", message: "Cannot write to past dates" } }), { status: 409 }));
    vi.stubGlobal("fetch", fetchMock);
    const first = await syncOfflineOutbox({ force: true });
    expect(first.held).toEqual([{ id: ID, status: 409, date: "2026-10-17", final: true }]);
    expect(await syncOfflineOutbox({ retryHeld: true })).toEqual({ saved: [], held: [] });
    // cc-50: the refusal is reported once to /client-errors; the write itself went out once
    expect(fetchMock.mock.calls.filter(([url]) => String(url).includes("/days/"))).toHaveLength(1);
    expect(getPendingOfflineEntryIds()).toEqual([ID]);
  });

  it("another 409 (not a past day) is held as before: sent again on Thử lại", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    server({ "POST /days/2026-10-18/entries": [409, 201] });
    expect((await add()).final).toBe(false);
    expect((await syncOfflineOutbox({ retryHeld: true })).saved).toEqual([ID]);
  });
});

describe("the portion label is stored with the entry", () => {
  it("a food entry sends serving_label (the portion as shown), a quick entry does not", async () => {
    const bodies: Array<Record<string, unknown>> = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: RequestInit) => {
        bodies.push(JSON.parse(String(init?.body ?? "{}")));
        return new Response("{}", { status: 201 });
      })
    );
    await apiClient.addEntry({ id: ID, foodId: FOOD, grams: 2, mealSlot: "breakfast", date: "2026-10-18", servingLabel: "2 viên" });
    await apiClient.addEntry({ id: "44444444-4444-4444-8444-444444444444", kind: "quick", calories: 100, mealSlot: "lunch", date: "2026-10-18", servingLabel: "x" });
    expect(bodies[0]).toMatchObject({ food_id: FOOD, grams: 2, serving_label: "2 viên" });
    expect(bodies[1]).not.toHaveProperty("serving_label");
  });

  it("an entry without a label sends none (the server keeps its empty label)", async () => {
    const bodies: Array<Record<string, unknown>> = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: RequestInit) => {
        bodies.push(JSON.parse(String(init?.body ?? "{}")));
        return new Response("{}", { status: 201 });
      })
    );
    await add();
    expect(bodies[0]).not.toHaveProperty("serving_label");
  });
});

describe("writes refused for good leave the outbox after 7 days (review 07:00)", () => {
  const DAY = 24 * 60 * 60 * 1000;
  const now = Date.parse("2026-10-18T08:00:00Z");
  const final = { status: 409, final: true };

  it("pruneOutbox drops final items older than 7 days, by createdAt; everything else stays", () => {
    const items = [
      { key: "old-final", createdAt: now - 8 * DAY, held: final },
      { key: "new-final", createdAt: now - 6 * DAY, held: final },
      { key: "old-held", createdAt: now - 30 * DAY, held: { status: 400 } },
      { key: "old-queued", createdAt: now - 30 * DAY },
    ];
    expect(pruneOutbox(items, now).map((i) => i.key)).toEqual(["new-final", "old-held", "old-queued"]);
    expect(pruneOutbox([{ createdAt: now - FINAL_OUTBOX_KEEP_MS, held: final }], now)).toHaveLength(1);
  });

  it("a sync writes the outbox back without them, and sends nothing for them", async () => {
    const OTHER = "33333333-3333-4333-8333-333333333333";
    localStorage.setItem(
      "h1t_offline_outbox_sync@example.com",
      JSON.stringify([
        { id: ID, date: "2026-10-01", payload: { id: ID }, createdAt: Date.now() - 8 * DAY, key: "k1", held: final },
        { id: OTHER, date: "2026-10-16", payload: { id: OTHER }, createdAt: Date.now() - DAY, key: "k2", held: final },
      ])
    );
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await syncOfflineOutbox({ retryHeld: true });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(getPendingOfflineEntryIds()).toEqual([OTHER]);
  });
});

describe("the server's body is never shown or sent (cc-63, X7)", () => {
  const PROXY_PAGE = "<html><body><h1>502 Bad Gateway</h1><pre>panic: runtime error at /srv/api/main.go:41</pre></body></html>";
  const STACK = JSON.stringify({ error: { code: "internal error\n at /srv/api/db.go:88", message: "pq: password authentication failed for user postgres" } });

  // Each failure is reported once per page load (by its call), so each case uses its own day
  async function run(status: number, body: string, date: string) {
    const reports: Array<Record<string, unknown>> = [];
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        if (String(url).endsWith("/client-errors")) {
          reports.push(JSON.parse(String(init?.body)));
          return new Response(null, { status: 204 });
        }
        return new Response(body, { status });
      })
    );
    const result = await apiClient.addEntry({ id: ID, foodId: FOOD, grams: 100, mealSlot: "breakfast", date });
    return { result, reports };
  }

  it("a proxy's HTML page in a 400 reaches no notice and no report", async () => {
    const { result, reports } = await run(400, PROXY_PAGE, "2026-10-21");
    expect(result).toMatchObject({ state: "held", status: 400, final: false });
    expect(result).not.toHaveProperty("message");
    expect(JSON.stringify(reports)).not.toMatch(/Bad Gateway|panic|main\.go|<html/);
    expect(reports).toHaveLength(1);
    expect(reports[0]).toMatchObject({ kind: "write", status: 400, message: "" });
  });

  it("a stack trace in an error body: only a well-formed error code is sent, and only the code", async () => {
    const { reports } = await run(400, STACK, "2026-10-22");
    expect(JSON.stringify(reports)).not.toMatch(/pq:|password|db\.go|internal error/);
    expect(reports[0]).toMatchObject({ status: 400, message: "" });
  });

  it("the error code of a real refusal is sent with the status", async () => {
    const { reports } = await run(400, JSON.stringify({ error: { code: "VALIDATION_FAILED", message: "failed to insert diary entry" } }), "2026-10-23");
    expect(reports[0]).toMatchObject({ kind: "write", status: 400, message: "VALIDATION_FAILED" });
    expect(JSON.stringify(reports)).not.toContain("failed to insert");
  });

  it("creating a food shows fixed words, not the server's text", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ error: { message: "pq: duplicate key value violates unique constraint" } }), { status: 409 })));
    await expect(apiClient.createFood({ nameVi: "Món", servingUnit: "g", servingSize: 100, calories: 100 })).rejects.toThrow("Không thể tạo món (409)");
  });
});
