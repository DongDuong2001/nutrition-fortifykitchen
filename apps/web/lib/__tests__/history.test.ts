import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadSyncEngine } from "../api-client";
import { DAY_CACHE_DAYS, dayKey, pruneDayRecords, readDayRecords, recordEntries, slimEntry, unslimEntry, writeDayRecords, type DayRecord } from "../day-cache";
import type { AddedDiaryEntry } from "../diary-edits";
import { loadHistory, migrateLegacyArchive, resetHistoryMemory, saveHistoryDays } from "../history";
import { quotaError, createFakeIdb, type FakeIdb } from "./fake-idb";
import { resetIdb } from "../idb";

// cc-68 Part 3 (S4, S5): the history is the server's; the device keeps a slim cache, one record per day in IndexedDB.

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

const SCOPE = "hist@example.com";
const TODAY = "2026-10-19";
const FOOD = "22222222-2222-4222-8222-222222222222";
let idb: FakeIdb;
let local: Storage;

const serverEntry = (id: string, grams = 100, extra: Record<string, unknown> = {}) => ({
  id,
  food_id: FOOD,
  food_name: "Cơm",
  kind: "food",
  meal_slot: "lunch",
  serving_label: `${grams} g`,
  grams,
  calories: grams * 1.3,
  nutrients: { protein: 2.7, carbs: 28, fat: 0.3, fiber: 0.4, iron: 0.2, calcium: null, vitamin_c: 0 },
  created_at: "2026-10-01T05:00:00Z",
  ...extra,
});
const summary = (date: string, ...ids: string[]) => ({ date, training_minutes: 0, is_read_only: true, summary: {}, meals: [{ slot: "all", name_vi: "", total_kcal: 0, target_min_kcal: 0, entries: ids.map((id) => serverEntry(id)) }] });

/** A server with some days; `range` says whether GET /days?from&to exists. */
function server(days: Record<string, string[]>, options: { range?: boolean; fail?: string[] } = {}) {
  const calls: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      const path = String(url).replace("https://api.test/api/v1", "");
      calls.push(path);
      const range = /^\/days\?from=([\d-]+)&to=([\d-]+)$/.exec(path);
      if (range) {
        if (!options.range) return new Response("{}", { status: 404 });
        const list = Object.keys(days).filter((d) => d >= range[1] && d <= range[2]).map((d) => summary(d, ...days[d]));
        return new Response(JSON.stringify({ data: { days: list } }), { status: 200 });
      }
      const day = /^\/days\/([\d-]+)$/.exec(path)?.[1] ?? "";
      if (options.fail?.includes(day)) return new Response("boom", { status: 500 });
      return new Response(JSON.stringify({ data: summary(day, ...(days[day] ?? [])) }), { status: 200 });
    })
  );
  return calls;
}

beforeEach(async () => {
  vi.stubEnv("NEXT_PUBLIC_API_MODE", "live");
  vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.test/api/v1");
  local = memoryStorage();
  local.setItem("h1t_auth_current_email", SCOPE);
  idb = createFakeIdb();
  vi.stubGlobal("localStorage", local);
  vi.stubGlobal("indexedDB", idb.factory);
  vi.stubGlobal("window", { localStorage: local, sessionStorage: memoryStorage(), location: { search: "", pathname: "/app" } });
  resetIdb();
  resetHistoryMemory();
  await loadSyncEngine();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("loadHistory: the server's days, cached on this device", () => {
  it("reads the days the cache lacks from the server, files each entry under its day, and caches them", async () => {
    const calls = server({ "2026-10-10": ["a", "b"], "2026-10-11": ["c"] });
    const result = await loadHistory(SCOPE, ["2026-10-10", "2026-10-11"], { fetch: true, today: TODAY });
    expect(Object.keys(result.days)).toEqual(["2026-10-10", "2026-10-11"]);
    expect(result.days["2026-10-10"].map((e) => [e.id, e.day, e.synced])).toEqual([["a", "2026-10-10", true], ["b", "2026-10-10", true]]);
    expect(result.failed).toEqual([]);
    expect(calls.filter((c) => c.startsWith("/days/"))).toHaveLength(2);
    // One record per day, in IndexedDB, and already final (the day can no longer change)
    expect(idb.values("days")).toHaveLength(2);
    expect(idb.values("days")[0]).toMatchObject({ scope: SCOPE, final: true });
  });

  it("a day read once is not read again: the second load is from the cache, offline too", async () => {
    server({ "2026-10-10": ["a"] });
    await loadHistory(SCOPE, ["2026-10-10"], { fetch: true, today: TODAY });
    const calls = server({ "2026-10-10": ["a"] });
    const again = await loadHistory(SCOPE, ["2026-10-10"], { fetch: true, today: TODAY });
    expect(again.days["2026-10-10"].map((e) => e.id)).toEqual(["a"]);
    expect(calls).toEqual([]);
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("Failed to fetch"))));
    expect((await loadHistory(SCOPE, ["2026-10-10"], { fetch: true, today: TODAY })).days["2026-10-10"]).toHaveLength(1);
  });

  it("cache only (fetch false): answers at once and asks the server nothing", async () => {
    const calls = server({ "2026-10-10": ["a"] });
    expect((await loadHistory(SCOPE, ["2026-10-10"], { fetch: false, today: TODAY })).days).toEqual({});
    expect(calls).toEqual([]);
  });

  it("a day the server did not answer for is reported to be asked again, and the others still load", async () => {
    const calls = server({ "2026-10-10": ["a"], "2026-10-11": ["b"] }, { fail: ["2026-10-10"] });
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = await loadHistory(SCOPE, ["2026-10-10", "2026-10-11"], { fetch: true, today: TODAY });
    expect(result.failed).toEqual(["2026-10-10"]);
    expect(Object.keys(result.days)).toEqual(["2026-10-11"]);
    expect(calls.length).toBeGreaterThan(0);
  });

  it("a day cached while it could still change is read once more when it can not", async () => {
    // 18/10 was yesterday when it was cached (final false); on 20/10 it is read-only
    await writeDayRecords([{ scope: SCOPE, date: "2026-10-18", at: 1, final: false, entries: [slimEntry({ ...unslimEntry(slimEntry({ id: "old" } as AddedDiaryEntry), "2026-10-18") })] }]);
    const calls = server({ "2026-10-18": ["server-1"] });
    const result = await loadHistory(SCOPE, ["2026-10-18"], { fetch: true, today: "2026-10-20" });
    expect(calls).toEqual(["/days/2026-10-18"]);
    expect(result.days["2026-10-18"].map((e) => e.id)).toEqual(["server-1"]);
    expect(idb.values("days")[0]).toMatchObject({ final: true });
  });

  it("with a range endpoint, many days cost one request; without one it asks per day and remembers", async () => {
    const days = { "2026-10-05": ["a"], "2026-10-06": ["b"], "2026-10-07": ["c"], "2026-10-08": ["d"] };
    const withRange = server(days, { range: true });
    const dates = Object.keys(days);
    const result = await loadHistory(SCOPE, dates, { fetch: true, today: TODAY });
    expect(withRange).toEqual(["/days?from=2026-10-05&to=2026-10-08"]);
    expect(Object.keys(result.days)).toHaveLength(4);

    // No range endpoint (404): per day, and the range is not tried again
    resetIdb();
    idb.disk.clear();
    resetHistoryMemory();
    const without = server(days, { range: false });
    await loadHistory(SCOPE, dates, { fetch: true, today: TODAY });
    expect(without[0]).toBe("/days?from=2026-10-05&to=2026-10-08");
    expect(without.filter((c) => c.startsWith("/days/"))).toHaveLength(4);
    idb.disk.clear();
    resetIdb();
    const again = server(days, { range: false });
    await loadHistory(SCOPE, dates, { fetch: true, today: TODAY });
    expect(again.filter((c) => c.includes("?from"))).toEqual([]);
  });
});

describe("entries the server never confirmed stay in their day", () => {
  const unsynced: AddedDiaryEntry = { ...unslimEntry(slimEntry({ id: "u1", foodId: FOOD, foodName: "Bún", grams: 200, displayQty: "200 g", mealSlot: "dinner", calories: 300, protein: 8, carbs: 50, fat: 5, fiber: 2, nutrients: {}, addedAt: "2026-10-10T12:00:00Z" } as AddedDiaryEntry), "2026-10-10"), synced: false };

  it("a refresh from the server keeps them whole, and the history shows them next to the server's", async () => {
    await saveHistoryDays(SCOPE, { "2026-10-10": [unsynced] });
    server({ "2026-10-10": ["a"] });
    const result = await loadHistory(SCOPE, ["2026-10-10"], { fetch: true, today: TODAY });
    expect(result.days["2026-10-10"].map((e) => [e.id, e.synced])).toEqual([["a", true], ["u1", false]]);
    expect((idb.values("days")[0] as DayRecord).unsynced?.map((e) => e.id)).toEqual(["u1"]);
  });

  it("once the server lists one, it is the server's and leaves the unsynced list", async () => {
    await saveHistoryDays(SCOPE, { "2026-10-10": [unsynced] });
    server({ "2026-10-10": ["u1"] });
    const result = await loadHistory(SCOPE, ["2026-10-10"], { fetch: true, today: TODAY });
    expect(result.days["2026-10-10"].map((e) => [e.id, e.synced])).toEqual([["u1", true]]);
    expect((idb.values("days")[0] as DayRecord).unsynced).toBeUndefined();
  });
});

describe("the old localStorage archive is moved over without loss", () => {
  const entry = (id: string, synced?: boolean): AddedDiaryEntry => ({ ...(unslimEntry(slimEntry({ id, foodId: FOOD, foodName: "Cơm", grams: 100, displayQty: "100 g", mealSlot: "lunch", calories: 130, protein: 3, carbs: 28, fat: 0.3, fiber: 0.4, nutrients: { iron: 0.2 }, addedAt: "2026-10-05T05:00:00Z" } as AddedDiaryEntry), "2026-10-05")), synced });

  it("every day goes into the cache, the key goes only once they are on disk, and the entries the server never confirmed come back to be sent", async () => {
    local.setItem(`h1t_day_archive_v1_${SCOPE}`, "{}");
    const archive = { "2026-10-05": [entry("s1", true), entry("0aaaaaaa-0000-4000-8000-000000000001", false)], "2026-10-06": [entry("s2", true)] };
    const unsent = await migrateLegacyArchive(SCOPE, archive);
    expect(idb.values("days")).toHaveLength(2);
    expect(local.getItem(`h1t_day_archive_v1_${SCOPE}`)).toBeNull();
    expect(unsent.map((e) => e.id)).toEqual(["0aaaaaaa-0000-4000-8000-000000000001"]);
    const day = (await readDayRecords(SCOPE, ["2026-10-05"])).get("2026-10-05")!;
    expect(day.final).toBe(false);
    expect(recordEntries(day).map((e) => e.id)).toEqual(["s1", "0aaaaaaa-0000-4000-8000-000000000001"]);
  });

  it("a day the server already gave is not overwritten by the old copy", async () => {
    server({ "2026-10-05": ["server"] });
    await loadHistory(SCOPE, ["2026-10-05"], { fetch: true, today: TODAY });
    await migrateLegacyArchive(SCOPE, { "2026-10-05": [entry("old", true)] });
    const day = (await readDayRecords(SCOPE, ["2026-10-05"])).get("2026-10-05")!;
    expect(recordEntries(day).map((e) => e.id)).toEqual(["server"]);
  });

  it("when the disk refuses the records, the old key stays and nothing is lost", async () => {
    local.setItem(`h1t_day_archive_v1_${SCOPE}`, "{\"2026-10-05\":[]}");
    idb.failWrites(quotaError(), 10);
    expect(await migrateLegacyArchive(SCOPE, { "2026-10-05": [entry("s1", true)] })).toEqual([]);
    expect(local.getItem(`h1t_day_archive_v1_${SCOPE}`)).not.toBeNull();
  });

  it("an empty archive just removes the key", async () => {
    local.setItem(`h1t_day_archive_v1_${SCOPE}`, "{}");
    expect(await migrateLegacyArchive(SCOPE, {})).toEqual([]);
    expect(local.getItem(`h1t_day_archive_v1_${SCOPE}`)).toBeNull();
  });
});

describe("the slim copy (S4)", () => {
  const full: AddedDiaryEntry = {
    id: "e1",
    foodId: FOOD,
    foodName: "Cơm trắng",
    grams: 200,
    displayQty: "1 chén",
    mealSlot: "lunch",
    calories: 260,
    protein: 5.4,
    carbs: 56,
    fat: 0.6,
    fiber: 0.8,
    nutrients: { iron: 0.40012345, calcium: null, zinc: 1.2, vitamin_c: 0 },
    addedAt: "2026-10-05T05:00:00.000Z",
    synced: true,
  };

  it("keeps what the history shows and totals, and rounds the rest", () => {
    const back = unslimEntry(slimEntry(full), "2026-10-05");
    expect(back).toMatchObject({ id: "e1", foodId: FOOD, foodName: "Cơm trắng", grams: 200, displayQty: "1 chén", mealSlot: "lunch", calories: 260, protein: 5.4, carbs: 56, fat: 0.6, fiber: 0.8, day: "2026-10-05" });
    expect(back.nutrients).toEqual({ iron: 0.4, zinc: 1.2, vitamin_c: 0 });
  });

  it("is smaller than the entry the archive kept", () => {
    expect(JSON.stringify(slimEntry(full)).length).toBeLessThan(JSON.stringify(full).length * 0.75);
  });

  it("a kcal-only entry stays one, with unknown values unknown", () => {
    const quick: AddedDiaryEntry = { ...full, kind: "quick", foodId: "", calories: 300, protein: null, carbs: null, fat: null, fiber: null, nutrients: {} };
    expect(unslimEntry(slimEntry(quick), "2026-10-05")).toMatchObject({ kind: "quick", calories: 300, protein: null, carbs: null });
  });
});

describe("pruning (S4: the cache does not grow for ever)", () => {
  it("keeps the newest days of the account and none of another's are touched", async () => {
    const day = (scope: string, n: number): DayRecord => ({ scope, date: `2025-01-${String(n).padStart(2, "0")}`, at: 1, final: true, entries: [] });
    await writeDayRecords([...Array.from({ length: 10 }, (_, i) => day(SCOPE, i + 1)), day("other@x.vn", 1)]);
    expect(await pruneDayRecords(SCOPE, 4)).toBe(6);
    const keys = (idb.disk.get("h1t")!.stores.get("days")!.data.keys());
    expect([...keys].sort()).toEqual([dayKey("other@x.vn", "2025-01-01"), ...[7, 8, 9, 10].map((n) => dayKey(SCOPE, `2025-01-${String(n).padStart(2, "0")}`))].sort());
    expect(DAY_CACHE_DAYS).toBe(400);
  });
});
