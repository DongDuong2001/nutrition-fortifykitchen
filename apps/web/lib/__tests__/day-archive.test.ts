import { describe, expect, it } from "vitest";
import { entryIso, mergeArchive, msUntilNextDay, parseArchive, splitByDay } from "../day-archive";
import type { AddedDiaryEntry } from "../diary-edits";

const entry = (id: string, addedAt: string): AddedDiaryEntry => ({
  id,
  foodId: "f",
  foodName: "Cơm",
  grams: 100,
  displayQty: "100 g",
  mealSlot: "lunch",
  calories: 130,
  protein: 2.7,
  carbs: 28,
  fat: 0.3,
  fiber: 0.4,
  nutrients: {},
  addedAt,
});

describe("entryIso (the Ho Chi Minh date of an entry)", () => {
  it("23:30 on the 12th in UTC+7 is still the 12th, 17:30 UTC is the 13th", () => {
    expect(entryIso(entry("a", "2026-10-12T16:30:00.000Z"))).toBe("2026-10-12");
    expect(entryIso(entry("b", "2026-10-12T17:30:00.000Z"))).toBe("2026-10-13");
  });
  it("an unreadable time has no date", () => {
    expect(entryIso(entry("c", "not a date"))).toBeNull();
  });
});

describe("splitByDay", () => {
  const today = "2026-10-13";
  it("keeps today's entries and files earlier days by date", () => {
    const list = [
      entry("old1", "2026-10-11T05:00:00.000Z"),
      entry("old2", "2026-10-12T16:59:00.000Z"),
      entry("now", "2026-10-13T03:00:00.000Z"),
    ];
    const split = splitByDay(list, today);
    expect(split.today.map((e) => e.id)).toEqual(["now"]);
    expect(Object.keys(split.past).sort()).toEqual(["2026-10-11", "2026-10-12"]);
    expect(split.past["2026-10-12"].map((e) => e.id)).toEqual(["old2"]);
  });
  it("an entry with an unreadable time or a time after today stays in today", () => {
    const list = [entry("bad", "oops"), entry("future", "2026-10-14T03:00:00.000Z")];
    expect(splitByDay(list, today).today.map((e) => e.id)).toEqual(["bad", "future"]);
  });
  it("nothing to move: the same list comes back", () => {
    const list = [entry("a", "2026-10-13T03:00:00.000Z")];
    const split = splitByDay(list, today);
    expect(split.today).toBe(list);
    expect(split.past).toEqual({});
  });
});

describe("mergeArchive and parseArchive", () => {
  it("adds entries per day without duplicating an id", () => {
    const a = { "2026-10-12": [entry("x", "2026-10-12T03:00:00.000Z")] };
    const b = { "2026-10-12": [entry("x", "2026-10-12T03:00:00.000Z"), entry("y", "2026-10-12T04:00:00.000Z")], "2026-10-11": [entry("z", "2026-10-11T04:00:00.000Z")] };
    const merged = mergeArchive(a, b);
    expect(merged["2026-10-12"].map((e) => e.id)).toEqual(["x", "y"]);
    expect(merged["2026-10-11"].map((e) => e.id)).toEqual(["z"]);
  });
  it("a bad stored value is an empty archive", () => {
    expect(parseArchive(null)).toEqual({});
    expect(parseArchive("{oops")).toEqual({});
    expect(parseArchive("[]")).toEqual({});
  });
  it("keeps only days with a list of entries", () => {
    const raw = JSON.stringify({ "2026-10-12": [entry("x", "2026-10-12T03:00:00.000Z")], "2026-10-11": "nope", bad: [] });
    expect(Object.keys(parseArchive(raw))).toEqual(["2026-10-12"]);
  });
});

describe("msUntilNextDay", () => {
  it("counts to the next midnight in Ho Chi Minh (17:00 UTC)", () => {
    // 23:00 on the 12th in UTC+7 is 16:00 UTC: one hour to go
    expect(msUntilNextDay(new Date("2026-10-12T16:00:00.000Z"))).toBe(60 * 60 * 1000);
  });
  it("just after midnight it is almost a full day", () => {
    expect(msUntilNextDay(new Date("2026-10-12T17:00:01.000Z"))).toBe(24 * 60 * 60 * 1000 - 1000);
  });
  it("exactly at midnight it waits a full day, never 0", () => {
    expect(msUntilNextDay(new Date("2026-10-12T17:00:00.000Z"))).toBe(24 * 60 * 60 * 1000);
  });
});

describe("parseArchive entry shape", () => {
  it("drops items without an id or a time, and days left empty", () => {
    const raw = JSON.stringify({
      "2026-10-12": [{ id: "a", addedAt: "2026-10-12T01:00:00.000Z" }, { foo: 1 }],
      "2026-10-11": [null],
    });
    expect(Object.keys(parseArchive(raw))).toEqual(["2026-10-12"]);
    expect(parseArchive(raw)["2026-10-12"]).toHaveLength(1);
  });
});


describe("cc-68: an entry's own day", () => {
  it("entryIso takes the entry's day when it has one (added to yesterday today, or listed by the server under a day)", () => {
    expect(entryIso({ addedAt: "2026-10-19T03:00:00.000Z", day: "2026-10-18" })).toBe("2026-10-18");
    expect(entryIso({ addedAt: "2026-10-19T03:00:00.000Z" })).toBe("2026-10-19");
    // A day that is not a date is ignored
    expect(entryIso({ addedAt: "2026-10-19T03:00:00.000Z", day: "hôm qua" })).toBe("2026-10-19");
  });

  it("splitByDay files by that day", () => {
    const today = { id: "a", addedAt: "2026-10-19T03:00:00.000Z" } as AddedDiaryEntry;
    const yesterdayAddedToday = { id: "b", addedAt: "2026-10-19T03:00:00.000Z", day: "2026-10-18" } as AddedDiaryEntry;
    const split = splitByDay([today, yesterdayAddedToday], "2026-10-19");
    expect(split.today).toEqual([today]);
    expect(split.past["2026-10-18"]).toEqual([yesterdayAddedToday]);
  });
});
