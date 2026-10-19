import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { accountKeys, unsyncedCount, wipeAccount } from "../account-wipe";
import { resetIdb } from "../idb";
import { loadOutbox, putItem, readItems, resetOutboxState, scopeFor } from "../outbox";
import { createFakeIdb, type FakeIdb } from "./fake-idb";

// cc-68 X8: Đăng xuất wipes what the device kept for the account when nothing waits to be sent.

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

const A = "a@x.vn";
const B = "b@x.vn";
let idb: FakeIdb;
let local: Storage;

const keysOf = () => Array.from({ length: local.length }, (_, i) => local.key(i) as string).sort();

beforeEach(() => {
  local = memoryStorage();
  idb = createFakeIdb();
  vi.stubGlobal("localStorage", local);
  vi.stubGlobal("indexedDB", idb.factory);
  vi.stubGlobal("window", { localStorage: local, sessionStorage: memoryStorage() });
  resetIdb();
  resetOutboxState();
  for (const account of [A, B]) {
    for (const base of ["h1t_added_entries_v1", "h1t_day_archive_v1", "h1t_profile_v1", "h1t_favourite_foods_v1", "h1t_recent_foods_v2", "h1t_recipes_v1", "h1t_saved_meals_v1", "h1t_settings_v1"]) {
      local.setItem(`${base}_${account}`, "x");
    }
  }
  local.setItem("h1t_added_entries_v1", "legacy");
  local.setItem("h1t_profile_v1", "legacy");
  local.setItem("h1t_auth_current_email", A);
  local.setItem("unrelated", "keep");
});

afterEach(() => vi.unstubAllGlobals());

describe("accountKeys", () => {
  it("is every h1t_ key of the account but the settings (reminders and tips seen hold no health data)", () => {
    const keys = ["h1t_added_entries_v1_a@x.vn", "h1t_settings_v1_a@x.vn", "h1t_profile_v1_b@x.vn", "h1t_recipes_v1_a@x.vn", "other_a@x.vn", "h1t_added_entries_v1"];
    expect(accountKeys(keys, A)).toEqual(["h1t_added_entries_v1_a@x.vn", "h1t_recipes_v1_a@x.vn"]);
  });
});

describe("wipeAccount", () => {
  it("removes the account's diary, history, profile, foods, favourites and recents; B's data and the settings stay", async () => {
    await wipeAccount(A);
    const left = keysOf();
    expect(left.filter((k) => k.endsWith(`_${A}`))).toEqual([`h1t_settings_v1_${A}`]);
    expect(left.filter((k) => k.endsWith(`_${B}`))).toHaveLength(8);
    expect(left).toContain("unrelated");
    expect(left).toContain("h1t_auth_current_email");
  });

  it("deletes the legacy unscoped keys instead of leaving them for the next account", async () => {
    await wipeAccount(A);
    expect(local.getItem("h1t_added_entries_v1")).toBeNull();
    expect(local.getItem("h1t_profile_v1")).toBeNull();
  });

  it("removes the catalogue copy (it holds the foods the person made), the day cache and the outbox of the account only", async () => {
    const dbf = idb.disk;
    void dbf;
    const { idbBatch } = await import("../idb");
    await idbBatch("kv", [{ put: { at: 1, foods: [] }, key: `foods:${A}` }, { put: { at: 1, foods: [] }, key: `foods:${B}` }]);
    await idbBatch("days", [
      { put: { at: 1 }, key: `${A}|2026-10-01` },
      { put: { at: 1 }, key: `${A}|2026-10-02` },
      { put: { at: 1 }, key: `${B}|2026-10-01` },
    ]);
    const scopeA = scopeFor(A, false)!;
    const scopeB = scopeFor(B, false)!;
    await putItem(scopeA, { key: "a1", seq: 1, id: "e1", date: "2026-10-18", payload: {}, createdAt: 1 });
    await putItem(scopeB, { key: "b1", seq: 2, id: "e2", date: "2026-10-18", payload: {}, createdAt: 1 });
    await wipeAccount(A);
    expect(idb.disk.get("h1t")!.stores.get("kv")!.data.has(`foods:${A}`)).toBe(false);
    expect(idb.disk.get("h1t")!.stores.get("kv")!.data.has(`foods:${B}`)).toBe(true);
    expect([...idb.disk.get("h1t")!.stores.get("days")!.data.keys()]).toEqual([`${B}|2026-10-01`]);
    expect(idb.values("outbox")).toMatchObject([{ id: "e2" }]);
    expect(readItems(scopeA)).toEqual([]);
  });

  it("without dropPending the waiting writes stay (Đăng xuất never wipes them silently)", async () => {
    const scopeA = scopeFor(A, false)!;
    await putItem(scopeA, { key: "a1", seq: 1, id: "e1", date: "2026-10-18", payload: {}, createdAt: 1 });
    await wipeAccount(A, { dropPending: false });
    expect(idb.values("outbox")).toHaveLength(1);
  });
});

describe("unsyncedCount (what Đăng xuất would throw away)", () => {
  it("counts every write of the account that has not reached the server, held ones too; nothing for nobody", async () => {
    const scopeA = scopeFor(A, false)!;
    await loadOutbox(scopeA);
    expect(await unsyncedCount(A)).toBe(0);
    await putItem(scopeA, { key: "a1", seq: 1, id: "e1", date: "2026-10-18", payload: {}, createdAt: 1, state: "queued" });
    await putItem(scopeA, { key: "a2", seq: 2, id: "e2", date: "2026-10-18", payload: {}, createdAt: 2, state: "held", held: { status: 400 } });
    await putItem(scopeFor(B, false)!, { key: "b1", seq: 3, id: "e3", date: "2026-10-18", payload: {}, createdAt: 3 });
    expect(await unsyncedCount(A)).toBe(2);
    expect(await unsyncedCount(null)).toBe(0);
  });
});
