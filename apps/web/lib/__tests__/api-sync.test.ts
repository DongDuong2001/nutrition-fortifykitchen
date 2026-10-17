import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient, getPendingOfflineEntryIds } from "../api-client";

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
