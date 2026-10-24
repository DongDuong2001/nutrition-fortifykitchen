import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient, loadSyncEngine, outboxItems, pendingFoodDeleteIds, syncOfflineOutbox } from "../api-client";
import { resetOutboxState } from "../outbox";
import { OWN_FOOD_HOLD_MS, OWN_FOOD_UNDO_MS } from "../own-foods";

// Job C: the DELETE of Xóa món waits OWN_FOOD_HOLD_MS (the toast's 8 s and 1,5 s more) in the outbox (not in a timer held in memory): Hoàn tác takes it back,
// and a reload inside the window still sends it afterwards.

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

const FOOD = "77777777-7777-4777-8777-777777777777";
const OTHER = "88888888-8888-4888-8888-888888888888";
let calls: string[] = [];
let answer = 200;

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
  vi.stubEnv("NEXT_PUBLIC_API_MODE", "live");
  vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.test/api/v1");
  const local = memoryStorage();
  local.setItem("h1t_auth_current_email", "own-food@example.com");
  vi.stubGlobal("localStorage", local);
  vi.stubGlobal("window", { localStorage: local, sessionStorage: memoryStorage(), location: { search: "", pathname: "/app" } });
  calls = [];
  answer = 200;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      calls.push(`${init?.method ?? "GET"} ${String(url).replace("https://api.test/api/v1", "").split("?")[0]}`);
      return new Response(answer === 204 ? null : JSON.stringify({ data: { success: true } }), { status: answer });
    })
  );
  await loadSyncEngine();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

const tick = (ms: number) => vi.advanceTimersByTimeAsync(ms);

describe("apiClient.deleteOwnFood", () => {
  it("is 8 s of undo window", () => {
    expect(OWN_FOOD_UNDO_MS).toBe(8000);
    expect(OWN_FOOD_HOLD_MS).toBe(9500);
  });

  it("sends nothing at once: the DELETE waits in the outbox, with a not-before time", async () => {
    await apiClient.deleteOwnFood(FOOD);
    expect(calls).toEqual([]);
    expect([...pendingFoodDeleteIds()]).toEqual([FOOD]);
    const [item] = outboxItems();
    expect(item).toMatchObject({ kind: "food", method: "DELETE", path: `/foods/custom/${FOOD}`, entity: `food:${FOOD}` });
    expect(item.notBefore).toBe(Date.now() + OWN_FOOD_HOLD_MS);
    // Written for the service worker too, which reads nextAttemptAt
    expect(item.nextAttemptAt).toBe(item.notBefore);
  });

  it("goes out once the window is over, and the outbox is empty after", async () => {
    await apiClient.deleteOwnFood(FOOD);
    await tick(OWN_FOOD_HOLD_MS - 100);
    expect(calls).toEqual([]);
    await tick(1000);
    expect(calls).toEqual([`DELETE /foods/custom/${FOOD}`]);
    expect(pendingFoodDeleteIds().size).toBe(0);
  });

  it("a sync forced early (the network came back) does not cut the window short", async () => {
    await apiClient.deleteOwnFood(FOOD);
    await tick(3000);
    await syncOfflineOutbox({ force: true });
    expect(calls).toEqual([]);
    await tick(OWN_FOOD_HOLD_MS);
    expect(calls).toEqual([`DELETE /foods/custom/${FOOD}`]);
  });

  it("Hoàn tác inside the window takes it out of the outbox: nothing is ever sent", async () => {
    await apiClient.deleteOwnFood(FOOD);
    await tick(5000);
    expect(await apiClient.undoOwnFoodDelete(FOOD)).toBe(true);
    expect(pendingFoodDeleteIds().size).toBe(0);
    await tick(60_000);
    expect(calls).toEqual([]);
  });

  it("Hoàn tác after the DELETE went out has nothing to take back", async () => {
    await apiClient.deleteOwnFood(FOOD);
    await tick(OWN_FOOD_HOLD_MS + 1000);
    expect(await apiClient.undoOwnFoodDelete(FOOD)).toBe(false);
  });

  it("closing the app inside the window: the delete is still in the outbox and goes out when the app opens again", async () => {
    await apiClient.deleteOwnFood(FOOD);
    await tick(2000);
    // A new page: memory is gone, the outbox is read from disk again
    resetOutboxState();
    await loadSyncEngine();
    await syncOfflineOutbox();
    expect(calls).toEqual([]);
    expect([...pendingFoodDeleteIds()]).toEqual([FOOD]);
    await tick(OWN_FOOD_HOLD_MS);
    expect(calls).toEqual([`DELETE /foods/custom/${FOOD}`]);
  });

  it("an app opened long after the window sends it at once", async () => {
    await apiClient.deleteOwnFood(FOOD);
    resetOutboxState();
    await tick(3 * 3600_000);
    await syncOfflineOutbox();
    expect(calls).toEqual([`DELETE /foods/custom/${FOOD}`]);
  });

  it("a 404 (the server has no such food any more) counts as done", async () => {
    answer = 404;
    await apiClient.deleteOwnFood(FOOD);
    await tick(OWN_FOOD_HOLD_MS + 1000);
    expect(calls).toEqual([`DELETE /foods/custom/${FOOD}`]);
    expect(outboxItems()).toEqual([]);
  });

  it("two foods are two writes: undoing one leaves the other", async () => {
    await apiClient.deleteOwnFood(FOOD);
    await apiClient.deleteOwnFood(OTHER);
    expect(await apiClient.undoOwnFoodDelete(FOOD)).toBe(true);
    await tick(OWN_FOOD_HOLD_MS + 1000);
    expect(calls).toEqual([`DELETE /foods/custom/${OTHER}`]);
  });
});
