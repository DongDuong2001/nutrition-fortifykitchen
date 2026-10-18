import { describe, expect, it } from "vitest";
import { TRAINING_PREFS_KEY, addOwnItem, readPrefs, removeOwnItem, writePrefs } from "../training-prefs";
import { keyedStorage } from "../storage-keys";

function memory(initial: Record<string, string> = {}) {
  const data: Record<string, string> = { ...initial };
  return {
    data,
    getItem: (key: string) => (key in data ? data[key] : null),
    setItem: (key: string, value: string) => {
      data[key] = value;
    },
    removeItem: (key: string) => {
      delete data[key];
    },
  };
}

const coconut = { phase: "pre-workout" as const, foodId: "food-dua", name: "Nước dừa", grams: 250, label: "250 g" };

describe("training prefs (lib/training-prefs.ts)", () => {
  it("a new account has no size, has not been asked and has no own items", () => {
    expect(readPrefs(memory())).toEqual({ size: null, asked: false, own: [] });
  });

  it("keeps the size and the asked flag", () => {
    const storage = memory();
    writePrefs({ size: "bu", asked: true, own: [] }, storage);
    expect(readPrefs(storage)).toEqual({ size: "bu", asked: true, own: [] });
  });

  it("is per account: another account on the same browser starts fresh and is asked again", () => {
    const local = memory();
    writePrefs({ size: "be", asked: true, own: [{ id: "own-1", ...coconut }] }, keyedStorage(local, false, "a@x.vn"));
    expect(readPrefs(keyedStorage(local, false, "b@x.vn"))).toEqual({ size: null, asked: false, own: [] });
    expect(readPrefs(keyedStorage(local, false, "a@x.vn")).own.map((i) => i.name)).toEqual(["Nước dừa"]);
    expect(local.data[`${TRAINING_PREFS_KEY}_a@x.vn`]).toBeDefined();
  });

  it("drops a size or item it cannot read instead of failing", () => {
    const storage = memory({ [TRAINING_PREFS_KEY]: JSON.stringify({ size: "xl", asked: true, own: [{ id: 3 }, { id: "own-1", ...coconut }] }) });
    expect(readPrefs(storage)).toEqual({ size: null, asked: true, own: [{ id: "own-1", ...coconut }] });
    expect(readPrefs(memory({ [TRAINING_PREFS_KEY]: "{oops" }))).toEqual({ size: null, asked: false, own: [] });
  });

  it("adds own items per phase in order, and removes one by id", () => {
    const one = addOwnItem([], coconut, "own-1");
    const two = addOwnItem(one, { ...coconut, phase: "intra-workout", name: "Cam", foodId: "food-cam" }, "own-2");
    expect(two.map((i) => [i.id, i.phase, i.name])).toEqual([
      ["own-1", "pre-workout", "Nước dừa"],
      ["own-2", "intra-workout", "Cam"],
    ]);
    expect(removeOwnItem(two, "own-1").map((i) => i.id)).toEqual(["own-2"]);
  });

  it("storage errors are ignored", () => {
    const broken = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("full"); } };
    expect(readPrefs(broken)).toEqual({ size: null, asked: false, own: [] });
    expect(() => writePrefs({ size: "be", asked: true, own: [] }, broken)).not.toThrow();
  });
});
