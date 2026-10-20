import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient, loadSyncEngine, syncOfflineOutbox } from "../api-client";
import { getTodayIsoVN } from "../date";
import { splitByDay } from "../day-archive";
import type { AddedDiaryEntry } from "../diary-edits";
import { formatDayLabel } from "../format";
import { getDefaultMealSlot } from "../meal-slot";
import { msUntilNextDay, vnClock, vnDateParts, vnDayKey, vnNoon } from "../vn-time";

// cc-65: the app's day is the Ho Chi Minh day, whatever zone the phone is in. The same instants give the same answers
// with the machine in Ho Chi Minh and in Los Angeles (UTC−7/−8, a day behind for most of the Vietnamese evening), and the
// day moves at Ho Chi Minh midnight: entries are filed under the day they were added, and an add queued offline before
// midnight is saved to that day when it is sent after midnight.

const INSTANTS = [
  "2026-10-11T16:59:50Z", // 23:59:50 on the 11th in Ho Chi Minh, 09:59 on the 11th in Los Angeles
  "2026-10-11T17:00:00Z", // midnight: the 12th in Ho Chi Minh
  "2026-10-12T07:30:00Z", // 14:30 on the 12th, 00:30 on the 12th in Los Angeles
  "2026-12-31T17:30:00Z", // 00:30 on 1 January 2027
  "2026-03-08T10:00:00Z", // the day Los Angeles moves its clocks
];

function answersAt(instant: string) {
  const at = new Date(instant);
  return {
    key: vnDayKey(at),
    parts: vnDateParts(at),
    clock: vnClock(at),
    untilMidnight: msUntilNextDay(at),
    label: formatDayLabel(vnDayKey(at), at),
    slot: getDefaultMealSlot(at, true),
  };
}

function inZone<T>(zone: string, run: () => T): T {
  const before = process.env.TZ;
  process.env.TZ = zone;
  try {
    return run();
  } finally {
    process.env.TZ = before;
  }
}

describe("vn-time", () => {
  it("23:59:50 is still the 11th, midnight is the 12th, and the clock reads Ho Chi Minh time", () => {
    expect(vnDayKey(new Date("2026-10-11T16:59:50Z"))).toBe("2026-10-11");
    expect(vnDayKey(new Date("2026-10-11T17:00:00Z"))).toBe("2026-10-12");
    expect(vnClock(new Date("2026-10-11T16:59:50Z"))).toEqual({ hours: 23, minutes: 59 });
    expect(vnClock(new Date("2026-10-11T17:00:00Z"))).toEqual({ hours: 0, minutes: 0 });
    expect(vnDateParts(new Date("2026-10-11T17:00:00Z"))).toEqual({ year: "2026", month: "10", day: "12", weekday: "Mon" });
    expect(msUntilNextDay(new Date("2026-10-11T16:59:50Z"))).toBe(10_000);
    expect(vnDayKey(vnNoon("2026-10-12"))).toBe("2026-10-12");
  });

  it("gives the same answers with the machine in Ho Chi Minh and in Los Angeles", () => {
    for (const instant of INSTANTS) {
      const here = inZone("Asia/Ho_Chi_Minh", () => answersAt(instant));
      const there = inZone("America/Los_Angeles", () => answersAt(instant));
      expect(there, instant).toEqual(here);
    }
  });

  it("the switch to Los Angeles really changes the machine's local day (so the test above means something)", () => {
    const at = new Date("2026-10-11T16:59:50Z");
    expect(inZone("America/Los_Angeles", () => at.getHours())).toBe(9);
    expect(inZone("Asia/Ho_Chi_Minh", () => at.getHours())).toBe(23);
  });
});

describe("midnight rollover", () => {
  const entry = (id: string, addedAt: string): AddedDiaryEntry => ({ id, addedAt }) as AddedDiaryEntry;

  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  for (const zone of ["Asia/Ho_Chi_Minh", "America/Los_Angeles"]) {
    it(`the date moves at Ho Chi Minh midnight and the day before is filed (machine in ${zone})`, () => {
      inZone(zone, () => {
        vi.setSystemTime(new Date("2026-10-11T16:59:50Z"));
        const today = getTodayIsoVN();
        expect(today).toBe("2026-10-11");
        const list = [entry("a", "2026-10-11T01:00:00Z"), entry("b", "2026-10-11T16:59:40Z")];

        // The store re-reads the date one second after the next midnight
        let moved = "";
        setTimeout(() => (moved = getTodayIsoVN()), msUntilNextDay(new Date()) + 1000);
        vi.advanceTimersByTime(10_000);
        expect(moved).toBe("");
        vi.advanceTimersByTime(1_000);
        expect(moved).toBe("2026-10-12");

        // Yesterday stays editable (it stays in the list); the day before that is filed in the archive
        const kept = splitByDay(list, moved, "2026-10-11");
        expect(kept.today.map((e) => e.id)).toEqual(["a", "b"]);
        const filed = splitByDay(list, moved, moved);
        expect(filed.today).toEqual([]);
        expect(Object.keys(filed.past)).toEqual(["2026-10-11"]);
      });
    });
  }
});

describe("an add queued offline before midnight, sent after it", () => {
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

  beforeEach(async () => {
    vi.stubEnv("NEXT_PUBLIC_API_MODE", "live");
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.test/api/v1");
    const local = memoryStorage();
    local.setItem("h1t_auth_current_email", "night@example.com");
    vi.stubGlobal("localStorage", local);
    vi.stubGlobal("window", { localStorage: local, sessionStorage: memoryStorage(), location: { search: "", pathname: "/app" } });
    await loadSyncEngine();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  for (const zone of ["Asia/Ho_Chi_Minh", "America/Los_Angeles"]) {
    it(`is saved to the day it was added on, not the day it was sent (machine in ${zone})`, async () => {
      await inZone(zone, async () => {
        vi.useFakeTimers({ toFake: ["Date"] });
        vi.setSystemTime(new Date("2026-10-11T16:59:50Z"));
        const calls: string[] = [];
        let online = false;
        vi.stubGlobal(
          "fetch",
          vi.fn(async (url: string, init?: RequestInit) => {
            calls.push(`${init?.method ?? "GET"} ${url.replace("https://api.test/api/v1", "")}`);
            if (!online) throw new TypeError("Failed to fetch");
            return new Response("{}", { status: 201 });
          }),
        );
        const id = "33333333-3333-4333-8333-333333333333";
        const result = await apiClient.addEntry({ id, foodId: "22222222-2222-4222-8222-222222222222", grams: 100, mealSlot: "snack", date: getTodayIsoVN() });
        expect(result.state).toBe("queued");

        vi.setSystemTime(new Date("2026-10-11T17:05:00Z"));
        expect(getTodayIsoVN()).toBe("2026-10-12");
        online = true;
        expect((await syncOfflineOutbox({ force: true })).saved).toEqual([id]);
        expect(calls.filter((c) => c.startsWith("POST /days")).at(-1)).toBe("POST /days/2026-10-11/entries");
      });
    });
  }
});
