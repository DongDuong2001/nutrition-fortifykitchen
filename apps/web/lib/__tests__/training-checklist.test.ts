import { describe, it, expect } from "vitest";
import {
  TRAINING_CHECKLIST_KEY,
  isEditableDay,
  readDay,
  toggleTick,
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

  describe("isEditableDay", () => {
    it("today is editable", () => {
      expect(isEditableDay("2026-10-13", "2026-10-13")).toBe(true);
    });

    it("a past day is read-only", () => {
      expect(isEditableDay("2026-10-12", "2026-10-13")).toBe(false);
    });
  });
});
