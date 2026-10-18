import { describe, it, expect } from "vitest";
import {
  TRAINING_CHECKLIST_KEY,
  effectiveTicked,
  isEditableDay,
  logTick,
  loggedAmounts,
  readDay,
  toggleTick,
  untick,
  writeDay,
} from "../training-checklist";

function fakeStorage(initial: Record<string, string> = {}) {
  const data: Record<string, string> = { ...initial };
  return {
    data,
    getItem: (key: string) => (key in data ? data[key] : null),
    setItem: (key: string, value: string) => {
      data[key] = value;
    },
  };
}

describe("training checklist (lib/training-checklist.ts)", () => {
  describe("writeDay and readDay", () => {
    it("saves the minutes and ticked ids under the YYYY-MM-DD key and reads them back", () => {
      const storage = fakeStorage();
      writeDay("2026-10-11", { minutes: 60, ticked: ["intra-salt-0-20", "intra-carb"] }, storage);

      expect(readDay("2026-10-11", storage)).toEqual({ minutes: 60, ticked: ["intra-salt-0-20", "intra-carb"] });
      const stored = JSON.parse(storage.getItem(TRAINING_CHECKLIST_KEY)!);
      expect(stored["2026-10-11"]).toEqual({ minutes: 60, ticked: ["intra-salt-0-20", "intra-carb"] });
    });

    it("keeps each day separate", () => {
      const storage = fakeStorage();
      writeDay("2026-10-11", { minutes: 60, ticked: ["intra-carb"] }, storage);
      writeDay("2026-10-12", { minutes: 0, ticked: [] }, storage);

      expect(readDay("2026-10-11", storage)).toEqual({ minutes: 60, ticked: ["intra-carb"] });
      expect(readDay("2026-10-12", storage)).toEqual({ minutes: 0, ticked: [] });
    });

    it("an unknown date has no record, so nothing is ticked", () => {
      const storage = fakeStorage();
      writeDay("2026-10-11", { minutes: 60, ticked: ["intra-carb"] }, storage);

      expect(readDay("2099-01-01", storage)).toBeNull();
    });

    it("returns null and does not throw when storage is missing, empty or corrupt", () => {
      expect(readDay("2026-10-11", null)).toBeNull();
      expect(readDay("2026-10-11", fakeStorage())).toBeNull();
      expect(readDay("2026-10-11", fakeStorage({ [TRAINING_CHECKLIST_KEY]: "{not json" }))).toBeNull();
    });

    it("does not throw when writing to missing storage", () => {
      expect(() => writeDay("2026-10-11", { minutes: 60, ticked: [] }, null)).not.toThrow();
    });
  });

  describe("toggleTick", () => {
    it("adds an id that is not ticked yet", () => {
      expect(toggleTick(["intra-carb"], "intra-salt-0-20")).toEqual(["intra-carb", "intra-salt-0-20"]);
    });

    it("removes an id that is already ticked", () => {
      expect(toggleTick(["intra-carb", "intra-salt-0-20"], "intra-carb")).toEqual(["intra-salt-0-20"]);
    });

    it("does not change the array it was given", () => {
      const before = ["intra-carb"];
      toggleTick(before, "intra-salt-0-20");
      expect(before).toEqual(["intra-carb"]);
    });
  });

  // cc-52: a tick that logged a diary entry keeps the entry's id, so the tick follows the entry
  describe("ticks linked to diary entries", () => {
    const day = { minutes: 60, ticked: ["pre-cu-den"] };

    it("a logged tick stores the entry ids and the amount, and is saved with the day", () => {
      const storage = fakeStorage();
      const logged = logTick(day, "intra-salt-0-20", ["entry-1"], "1,5 g");
      expect(logged).toEqual({ minutes: 60, ticked: ["pre-cu-den", "intra-salt-0-20"], logged: { "intra-salt-0-20": { entryIds: ["entry-1"], qty: "1,5 g" } } });
      writeDay("2026-10-18", logged, storage);
      expect(readDay("2026-10-18", storage)).toEqual(logged);
    });

    it("an item is ticked while its entry exists; deleted on Hôm nay, it shows unticked", () => {
      const logged = logTick(day, "intra-salt-0-20", ["entry-1"], "1,5 g");
      expect(effectiveTicked(logged, (id) => id === "entry-1")).toEqual(["pre-cu-den", "intra-salt-0-20"]);
      expect(effectiveTicked(logged, () => false)).toEqual(["pre-cu-den"]);
    });

    it("the Red Bull + mật mía mix links two entries: ticked while either is there, unticked once both are gone", () => {
      const mix = logTick(day, "intra-carb", ["rb", "mm"], "1 lon Red Bull + 22 g mật mía");
      expect(effectiveTicked(mix, (id) => id === "mm")).toEqual(["pre-cu-den", "intra-carb"]);
      expect(effectiveTicked(mix, () => false)).toEqual(["pre-cu-den"]);
    });

    it("unticking keeps the link, so Hoàn tác (the entries back) ticks it again", () => {
      const off = untick(logTick(day, "intra-carb", ["entry-2", "entry-3"], "30 g"), "intra-carb");
      expect(off.ticked).toEqual(["pre-cu-den"]);
      expect(effectiveTicked(off, () => false)).toEqual(["pre-cu-den"]);
      expect(effectiveTicked(off, (id) => id === "entry-2" || id === "entry-3")).toEqual(["pre-cu-den", "intra-carb"]);
    });

    it("the amounts shown are those of the ticked, logged items", () => {
      const both = logTick(logTick(day, "intra-salt-0-20", ["e1"], "1 g"), "intra-carb", ["e2"], "30 g");
      expect(loggedAmounts(both, ["intra-salt-0-20", "pre-cu-den"])).toEqual({ "intra-salt-0-20": "1 g" });
    });

    it("reads back a day saved before links existed, and drops a broken link", () => {
      const storage = fakeStorage({
        [TRAINING_CHECKLIST_KEY]: JSON.stringify({ "2026-10-18": { minutes: 60, ticked: ["a"], logged: { a: { entryIds: [] , qty: "1 g" }, c: { qty: "2 g" }, b: { entryIds: ["f"], qty: "1 g" } } } }),
      });
      expect(readDay("2026-10-18", storage)).toEqual({ minutes: 60, ticked: ["a"], logged: { b: { entryIds: ["f"], qty: "1 g" } } });
    });
  });

  describe("isEditableDay", () => {
    it("today is editable", () => {
      expect(isEditableDay("2026-10-13", "2026-10-13")).toBe(true);
    });

    it("a past day is read-only", () => {
      expect(isEditableDay("2026-10-12", "2026-10-13")).toBe(false);
    });
  });
});
