import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient, callEngine, getPendingOfflineEntryIds, loadSyncEngine, outboxItems, resetWriteMemory, syncOfflineOutbox } from "../api-client";
import { resetIdb } from "../idb";
import { dayLabel, isDiaryAdd, reasonOf, reasonSummary, refusedForGoodItem, retryMessage, stamp } from "../late-writes";
import { countItems, loadOutbox, putItems, readItems, resetOutboxState, scopeFor, type OutboxItem } from "../outbox";
import { syncBeforeSignOut } from "../sign-out-flow";
import { resetSyncAlerts } from "../sync-state";
import { unstickLateWrites } from "../unstick-late-writes";
import { SignOutConfirm } from "../../components/settings/sign-out-confirm";
import { createFakeIdb, type FakeIdb } from "./fake-idb";

// Hotfix 20/10 (late writes): a write is judged by when the user made it. The requests are a mocked fetch; the disk is a fake
// IndexedDB that holds the exact state found on two phones: the 17/10 writes the old rule marked final.

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

const ACCOUNT = "late@example.com";
const FOOD = "22222222-2222-4222-8222-222222222222";
const ids = [1, 2, 3, 4].map((n) => `${n}${n}${n}${n}${n}${n}${n}${n}-1111-4111-8111-111111111111`);
const [ID] = ids;
const scope = scopeFor(ACCOUNT, false)!;
const DAY = 24 * 60 * 60 * 1000;
let idb: FakeIdb;

interface Call {
  method: string;
  path: string;
  query: string;
  body: Record<string, unknown> | undefined;
}

/** A server: records each call with its body and query; answers with the next status of its list (the last repeats). */
function server(statuses: Array<number | "network"> = [200]) {
  const calls: Call[] = [];
  const list = [...statuses];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      const [path, query = ""] = url.replace("https://api.test/api/v1", "").split("?");
      calls.push({ method: init?.method ?? "GET", path, query, body: init?.body ? JSON.parse(String(init.body)) : undefined });
      const status = list.length > 1 ? list.shift()! : list[0];
      if (status === "network") throw new TypeError("Failed to fetch");
      return new Response(status === 204 ? null : "{}", { status });
    })
  );
  return calls;
}

const PAST_DAY = JSON.stringify({ error: { code: "PAST_DAY_READ_ONLY", message: "Cannot write to past dates" } });

function killPage() {
  resetOutboxState();
  resetWriteMemory();
  resetIdb();
}

/** What the logs showed on the two phones: an add for 17/10, made that day, held FINAL by a 409. */
const stuck = (n: number, over: Partial<OutboxItem> = {}): OutboxItem => ({
  key: `${ids[n]}:${n}`,
  seq: n + 1,
  id: ids[n],
  date: "2026-10-17",
  payload: { id: ids[n], kind: "food", meal_slot: "lunch", food_id: FOOD, grams: 100 },
  createdAt: Date.parse("2026-10-17T05:00:00Z") + n * 60_000,
  state: "held",
  attempts: 1,
  retries: 1,
  held: { status: 409, final: true },
  ...over,
});

beforeEach(async () => {
  vi.stubEnv("NEXT_PUBLIC_API_MODE", "live");
  vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.test/api/v1");
  vi.stubEnv("NEXT_PUBLIC_APP_VERSION", "2026-10-20.2");
  const local = memoryStorage();
  local.setItem("h1t_auth_current_email", ACCOUNT);
  idb = createFakeIdb();
  vi.stubGlobal("localStorage", local);
  vi.stubGlobal("indexedDB", idb.factory);
  vi.stubGlobal("window", { localStorage: local, sessionStorage: memoryStorage(), location: { search: "", pathname: "/app" } });
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-20T03:00:00Z"));
  vi.spyOn(console, "warn").mockImplementation(() => {});
  killPage();
  resetSyncAlerts();
  await loadSyncEngine();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("made_at: when the user made the write, on every diary write", () => {
  it("a first send carries the item's createdAt as RFC 3339", async () => {
    const calls = server([201]);
    await apiClient.addEntry({ id: ID, foodId: FOOD, grams: 100, mealSlot: "lunch", date: "2026-10-20" });
    expect(calls[0].body).toMatchObject({ id: ID, made_at: "2026-10-20T03:00:00.000Z" });
  });

  it("a retry sends the ORIGINAL createdAt, never the time of the retry", async () => {
    vi.setSystemTime(new Date("2026-10-17T05:00:00Z"));
    server(["network"]);
    expect((await apiClient.addEntry({ id: ID, foodId: FOOD, grams: 100, mealSlot: "lunch", date: "2026-10-17" })).state).toBe("queued");
    // Three days later the phone reaches the server (and it has a hiccup first)
    vi.setSystemTime(new Date("2026-10-20T03:00:00Z"));
    const calls = server([503, 201]);
    await syncOfflineOutbox({ force: true });
    await syncOfflineOutbox({ force: true });
    const sends = calls.filter((c) => c.path.startsWith("/days/"));
    expect(sends).toHaveLength(2);
    expect(sends.map((c) => c.body?.made_at)).toEqual(["2026-10-17T05:00:00.000Z", "2026-10-17T05:00:00.000Z"]);
    expect(getPendingOfflineEntryIds()).toEqual([]);
  });

  it("an edit and a restore carry it in the body, a delete in the query; a profile or favourite change carries none", async () => {
    const calls = server([200]);
    await apiClient.updateEntry(ID, { meal_slot: "dinner", grams: 150 }, "2026-10-20");
    await apiClient.deleteEntry(ID, "2026-10-20");
    await apiClient.restoreEntry(ID, "2026-10-20");
    await apiClient.setFavourite(FOOD, true);
    const [patch, del, restore, favourite] = calls;
    expect(patch).toMatchObject({ method: "PATCH", body: { made_at: "2026-10-20T03:00:00.000Z" } });
    expect(del).toMatchObject({ method: "DELETE", query: "made_at=2026-10-20T03%3A00%3A00.000Z", body: undefined });
    expect(restore).toMatchObject({ method: "POST", path: `/entries/${ID}/restore`, body: { made_at: "2026-10-20T03:00:00.000Z" } });
    expect(favourite.body).not.toHaveProperty("made_at");
  });

  it("stamp leaves an item with no usable time alone, and adds to a query that has one", () => {
    expect(stamp({ createdAt: 0 }, "POST", "/days/2026-10-17/entries", { id: ID }).body).toBe(JSON.stringify({ id: ID }));
    expect(stamp({ createdAt: 1_700_000_000_000 }, "DELETE", "/entries/x?a=1", {}).path).toBe("/entries/x?a=1&made_at=2023-11-14T22%3A13%3A20.000Z");
  });
});

describe("the writes already on phones: final 409 items from 17/10 go back to queued once per app version", () => {
  const seed = async () => {
    // Four 17/10 adds (final), one made 20 days ago (final, past the 14 days), one the server refused with a 400
    await putItems(scope, [stuck(0), stuck(1), stuck(2), stuck(3), stuck(0, { key: "old", id: "99999999-1111-4111-8111-111111111111", date: "2026-09-30", createdAt: Date.now() - 20 * DAY, held: { status: 409, final: true, at: Date.now() - DAY } }), stuck(1, { key: "bad", id: "88888888-1111-4111-8111-111111111111", date: "2026-10-19", held: { status: 400 } })]);
    killPage();
    await loadOutbox(scope);
  };

  it("sends them again with made_at, they save, and the header would read Đã lưu", async () => {
    await seed();
    expect(countItems(readItems(scope))).toMatchObject({ pending: 0, failed: 6, final: 5 });
    const calls = server([201]);
    await callEngine("loadOfflineOutbox");
    await syncOfflineOutbox({ force: true });
    const posts = calls.filter((c) => c.path === "/days/2026-10-17/entries");
    expect(posts).toHaveLength(4);
    expect(posts.map((c) => c.body?.made_at)).toEqual([0, 1, 2, 3].map((n) => new Date(Date.parse("2026-10-17T05:00:00Z") + n * 60_000).toISOString()));
    // The 20-day-old one and the 400 stay put (sending them again could only be refused again, or is the person's call)
    expect(readItems(scope).map((i) => i.key).sort()).toEqual(["bad", "old"]);
    expect(countItems(readItems(scope))).toMatchObject({ pending: 0, failed: 2 });
  });

  it("runs once per version: a write refused again stays held until the next version", async () => {
    await seed();
    vi.stubGlobal("fetch", vi.fn(async () => new Response(PAST_DAY, { status: 409 })));
    expect(await unstickLateWrites(scope, "2026-10-20.2")).toBe(4);
    await syncOfflineOutbox({ force: true });
    // Refused again by a server that does not know made_at: held, NOT final (they were made 3 days ago, inside 14)
    expect(readItems(scope).filter((i) => i.date === "2026-10-17")).toHaveLength(4);
    expect(readItems(scope).filter((i) => i.date === "2026-10-17").every((i) => i.held && !i.held.final)).toBe(true);
    expect(await unstickLateWrites(scope, "2026-10-20.2")).toBe(0);
    expect(await unstickLateWrites(scope, "2026-10-21.1")).toBe(0);
  });
});

describe("Thử lại sends everything the list shows, and says what happened", () => {
  it("a write refused for good is sent again by Thử lại, with progress", async () => {
    await putItems(scope, [stuck(0, { createdAt: Date.now() - 20 * DAY, date: "2026-09-30" }), stuck(1, { held: { status: 400 } })]);
    killPage();
    await loadOutbox(scope);
    const calls = server([201]);
    const progress: Array<{ done: number; total: number }> = [];
    const result = await syncOfflineOutbox({ retryHeld: true, onProgress: (p) => progress.push(p) });
    expect(calls).toHaveLength(2);
    expect(result.saved).toEqual([ids[0], ids[1]]);
    expect(progress).toEqual([
      { done: 1, total: 2 },
      { done: 2, total: 2 },
    ]);
    expect(outboxItems()).toEqual([]);
  });

  it("the toast words: all saved, some left, none saved", () => {
    expect(retryMessage({ saved: 4, left: 0 })).toBe("Đã lưu 4 món");
    expect(retryMessage({ saved: 0, left: 0 })).toBe("Đã lưu hết");
    expect(retryMessage({ saved: 0, left: 1 })).toBe("Còn 1 món chưa lưu được, xem lý do");
    expect(retryMessage({ saved: 3, left: 1 })).toBe("Đã lưu 3 món, còn 1 món chưa lưu được. Xem lý do");
  });
});

describe("the Chưa lưu list: a plain reason per item", () => {
  const now = Date.parse("2026-10-20T03:00:00Z");
  const queued = (over: Partial<OutboxItem> = {}): OutboxItem => ({ ...stuck(0), state: "queued", held: undefined, ...over });

  it("says why each one waits", () => {
    expect(reasonOf(queued(), { online: false, now })).toBe("Đang chờ mạng");
    expect(reasonOf(queued({ lastStatus: 0 }), { online: true, now })).toBe("Đang chờ mạng");
    expect(reasonOf(queued({ state: "sending" }), { online: true, now })).toBe("Đang gửi");
    expect(reasonOf(queued({ lastStatus: 401 }), { online: true, now })).toBe("Phiên đăng nhập hết hạn");
    expect(reasonOf(queued({ lastStatus: 503 }), { online: true, now })).toBe("Lỗi máy chủ, thử lại sau");
    expect(reasonOf(queued({ held: { status: 409, code: "PAST_DAY_READ_ONLY" } }), { online: true, now })).toBe("Máy chủ từ chối: ngày đã khóa");
    expect(reasonOf(queued({ held: { status: 409, final: true } }), { online: true, now })).toBe("Máy chủ từ chối: ngày đã khóa");
    expect(reasonOf(queued({ held: { status: 400 } }), { online: true, now })).toBe("Máy chủ từ chối (lỗi 400)");
  });

  it("offers Chuyển sang hôm nay and Bỏ món này only for a write refused for good", () => {
    expect(refusedForGoodItem(queued(), now)).toBe(false);
    expect(refusedForGoodItem(queued({ held: { status: 409 }, attempts: 1 }), now)).toBe(false);
    expect(refusedForGoodItem(queued({ held: { status: 409 }, attempts: 2 }), now)).toBe(true);
    expect(refusedForGoodItem(queued({ held: { status: 409 }, createdAt: now - 15 * DAY }), now)).toBe(true);
    expect(refusedForGoodItem(queued({ held: { status: 409, final: true } }), now)).toBe(true);
    expect(isDiaryAdd(queued())).toBe(true);
    expect(isDiaryAdd(queued({ method: "PATCH", path: `/entries/${ID}` }))).toBe(false);
  });

  it("counts: the header number is the number of items in the list", async () => {
    await putItems(scope, [stuck(0), stuck(1, { held: undefined, state: "queued" }), stuck(2, { held: undefined, parked: true })]);
    const counts = countItems(readItems(scope));
    expect(counts.pending + counts.failed).toBe(readItems(scope).length);
    expect(dayLabel("2026-10-17")).toBe("17/10");
    expect(reasonSummary(readItems(scope), { online: false, now })).toBe("đang chờ mạng; máy chủ từ chối: ngày đã khóa");
  });
});

describe("Chuyển sang hôm nay and Bỏ món này", () => {
  it("re-logs the add on today under the same id, made now", async () => {
    await putItems(scope, [stuck(0, { createdAt: Date.now() - 20 * DAY, date: "2026-09-30" })]);
    killPage();
    const calls = server([201]);
    await callEngine("loadOfflineOutbox");
    const key = readItems(scope)[0].key;
    expect(await callEngine("moveAddToToday", key)).toBe(ids[0]);
    await syncOfflineOutbox({ force: true });
    expect(calls.filter((c) => c.method === "POST")).toHaveLength(1);
    expect(calls[0]).toMatchObject({ path: "/days/2026-10-20/entries", body: { id: ids[0], made_at: "2026-10-20T03:00:00.000Z" } });
    expect(outboxItems()).toEqual([]);
  });

  it("does nothing for a write that is not an add", async () => {
    await putItems(scope, [stuck(0, { method: "PATCH", path: `/entries/${ID}`, date: "" })]);
    expect(await callEngine("moveAddToToday", readItems(scope)[0].key)).toBeNull();
  });

  it("Bỏ món này takes the write out of the outbox", async () => {
    await putItems(scope, [stuck(0), stuck(1)]);
    await callEngine("discardOutboxItems", [readItems(scope)[0].key]);
    expect(readItems(scope).map((i) => i.id)).toEqual([ids[1]]);
  });
});

describe("Đồng bộ rồi đăng xuất never does nothing", () => {
  it("everything saved: nothing left, the person can go", async () => {
    await putItems(scope, [stuck(0), stuck(1, { held: { status: 400 } })]);
    server([201]);
    expect(await syncBeforeSignOut(ACCOUNT)).toBeNull();
  });

  it("writes left behind: how many and why, and the sheet offers Xem các món and Vẫn đăng xuất (mất N món)", async () => {
    await putItems(scope, [stuck(0, { createdAt: Date.now() - 20 * DAY, date: "2026-09-30" }), stuck(1)]);
    vi.stubGlobal("navigator", { onLine: true });
    vi.stubGlobal("fetch", vi.fn(async () => new Response(PAST_DAY, { status: 409 })));
    const left = await syncBeforeSignOut(ACCOUNT);
    expect(left).toEqual({ left: 2, reason: "máy chủ từ chối: ngày đã khóa" });
    const html = renderToStaticMarkup(
      React.createElement(SignOutConfirm, { open: true, count: 2, busy: false, progress: null, failure: left, error: null, onSyncThenLeave() {}, onLeave() {}, onSeeItems() {}, onClose() {} })
    );
    expect(html).toContain("Còn 2 món chưa đồng bộ được: máy chủ từ chối: ngày đã khóa.");
    expect(html).toContain("Xem các món");
    expect(html).toContain("Vẫn đăng xuất (mất 2 món)");
  });

  it("while it runs the sheet shows the progress; a failed check is said in words", () => {
    const base = { open: true, count: 4, failure: null, onSyncThenLeave() {}, onLeave() {}, onSeeItems() {}, onClose() {} };
    expect(renderToStaticMarkup(React.createElement(SignOutConfirm, { ...base, busy: true, progress: { done: 2, total: 4 }, error: null }))).toContain("Đang đồng bộ… 2/4");
    const failed = renderToStaticMarkup(React.createElement(SignOutConfirm, { ...base, busy: false, progress: null, error: "Chưa đăng xuất được. Kiểm tra mạng rồi thử lại nhé." }));
    expect(failed).toContain("Chưa đăng xuất được");
    expect(failed).toContain("Xem các món");
  });
});
