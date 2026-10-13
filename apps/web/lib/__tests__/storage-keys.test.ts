import { describe, expect, it } from "vitest";
import {
  ADDED_ENTRIES_KEY,
  RECENT_FOODS_KEY,
  SAMPLE_EDITS_KEY,
  adoptLegacyKeys,
  keyedStorage,
  loadMigrated,
  storageKey,
  type KeyValueStore,
} from "../storage-keys";
import { FAVOURITES_KEY } from "../favourites";
import { SAVED_MEALS_KEY } from "../saved-meals";

function memory(initial: Record<string, string> = {}): KeyValueStore & { data: Record<string, string> } {
  const data = { ...initial };
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => {
      data[k] = v;
    },
    removeItem: (k) => {
      delete data[k];
    },
  };
}

describe("storageKey", () => {
  it("scopes a key to the account, and demo keeps its own _demo twin", () => {
    expect(storageKey(ADDED_ENTRIES_KEY, false, "a@x.vn")).toBe("h1t_added_entries_v1_a@x.vn");
    expect(storageKey(ADDED_ENTRIES_KEY, true, "a@x.vn")).toBe("h1t_added_entries_v1_demo");
    expect(storageKey(RECENT_FOODS_KEY, true, null)).toBe("h1t_recent_foods_v2_demo");
  });

  it("has no key without an account (outside demo)", () => {
    expect(storageKey(ADDED_ENTRIES_KEY, false, null)).toBeNull();
  });
});

describe("keyedStorage", () => {
  it("two accounts do not see each other's entries", () => {
    const real = memory();
    const a = keyedStorage(real, false, "a@x.vn");
    const b = keyedStorage(real, false, "b@x.vn");
    a.setItem(ADDED_ENTRIES_KEY, '[{"id":"a1"}]');
    expect(b.getItem(ADDED_ENTRIES_KEY)).toBeNull();
    b.setItem(ADDED_ENTRIES_KEY, '[{"id":"b1"}]');
    expect(a.getItem(ADDED_ENTRIES_KEY)).toBe('[{"id":"a1"}]');
    expect(b.getItem(ADDED_ENTRIES_KEY)).toBe('[{"id":"b1"}]');
    // signing A back in finds A's data again
    expect(keyedStorage(real, false, "a@x.vn").getItem(ADDED_ENTRIES_KEY)).toBe('[{"id":"a1"}]');
  });

  it("demo reads and writes the _demo keys only, whatever the account", () => {
    const real = memory({ h1t_favourite_foods_v1_a: '["a"]' });
    const demo = keyedStorage(real, true, "a");
    expect(demo.getItem(FAVOURITES_KEY)).toBeNull();
    demo.setItem(FAVOURITES_KEY, '["b"]');
    expect(real.data).toEqual({ h1t_favourite_foods_v1_a: '["a"]', h1t_favourite_foods_v1_demo: '["b"]' });
    expect(keyedStorage(real, true, null).getItem(FAVOURITES_KEY)).toBe('["b"]');
    expect(keyedStorage(real, false, "a").getItem(FAVOURITES_KEY)).toBe('["a"]');
  });

  it("without an account nothing is read or written", () => {
    const real = memory({ [ADDED_ENTRIES_KEY]: "[1]" });
    const none = keyedStorage(real, false, null);
    expect(none.getItem(ADDED_ENTRIES_KEY)).toBeNull();
    none.setItem(ADDED_ENTRIES_KEY, "[2]");
    none.removeItem(ADDED_ENTRIES_KEY);
    expect(real.data).toEqual({ [ADDED_ENTRIES_KEY]: "[1]" });
  });
});

describe("adoptLegacyKeys (the old unscoped keys move to the first account, once)", () => {
  const legacy = () => ({
    [ADDED_ENTRIES_KEY]: '[{"id":"old"}]',
    [SAMPLE_EDITS_KEY]: '{"s":1}',
    [RECENT_FOODS_KEY]: '[{"foodId":"f","servingLabel":"1 g"}]',
    [FAVOURITES_KEY]: '["f"]',
    [SAVED_MEALS_KEY]: '[{"id":"m"}]',
  });

  it("moves every old key to the account and deletes the old keys", () => {
    const local = memory(legacy());
    adoptLegacyKeys(local, null, "a@x.vn");
    expect(local.data).toEqual({
      [`${ADDED_ENTRIES_KEY}_a@x.vn`]: '[{"id":"old"}]',
      [`${SAMPLE_EDITS_KEY}_a@x.vn`]: '{"s":1}',
      [`${RECENT_FOODS_KEY}_a@x.vn`]: '[{"foodId":"f","servingLabel":"1 g"}]',
      [`${FAVOURITES_KEY}_a@x.vn`]: '["f"]',
      [`${SAVED_MEALS_KEY}_a@x.vn`]: '[{"id":"m"}]',
    });
  });

  it("a second account gets nothing: the old keys moved once", () => {
    const local = memory(legacy());
    adoptLegacyKeys(local, null, "a@x.vn");
    adoptLegacyKeys(local, null, "b@x.vn");
    expect(keyedStorage(local, false, "b@x.vn").getItem(ADDED_ENTRIES_KEY)).toBeNull();
    expect(keyedStorage(local, false, "a@x.vn").getItem(ADDED_ENTRIES_KEY)).toBe('[{"id":"old"}]');
  });

  it("an account that already has data keeps it and the old keys stay untouched", () => {
    const local = memory({ ...legacy(), [`${ADDED_ENTRIES_KEY}_a@x.vn`]: '[{"id":"mine"}]' });
    adoptLegacyKeys(local, null, "a@x.vn");
    expect(local.data[`${ADDED_ENTRIES_KEY}_a@x.vn`]).toBe('[{"id":"mine"}]');
    expect(local.data[ADDED_ENTRIES_KEY]).toBe('[{"id":"old"}]');
  });

  it("empty scoped values count as no data", () => {
    const local = memory({ ...legacy(), [`${ADDED_ENTRIES_KEY}_a@x.vn`]: "[]", [`${SAMPLE_EDITS_KEY}_a@x.vn`]: "{}" });
    adoptLegacyKeys(local, null, "a@x.vn");
    expect(local.data[`${ADDED_ENTRIES_KEY}_a@x.vn`]).toBe('[{"id":"old"}]');
    expect(local.data[ADDED_ENTRIES_KEY]).toBeUndefined();
  });

  it("an old sessionStorage copy goes to the account too", () => {
    const local = memory();
    const session = memory({ [ADDED_ENTRIES_KEY]: '[{"id":"s"}]' });
    adoptLegacyKeys(local, session, "a@x.vn");
    expect(local.data).toEqual({ [`${ADDED_ENTRIES_KEY}_a@x.vn`]: '[{"id":"s"}]' });
    expect(session.data).toEqual({});
  });

  it("leaves demo keys alone", () => {
    const local = memory({ ...legacy(), [`${ADDED_ENTRIES_KEY}_demo`]: '[{"id":"d"}]' });
    adoptLegacyKeys(local, null, "a@x.vn");
    expect(local.data[`${ADDED_ENTRIES_KEY}_demo`]).toBe('[{"id":"d"}]');
  });

  it("does nothing with no storage", () => {
    expect(() => adoptLegacyKeys(null, null, "a@x.vn")).not.toThrow();
  });
});

describe("loadMigrated (session values move to local storage once)", () => {
  const KEY = "k";

  it("nothing anywhere: null", () => {
    expect(loadMigrated(KEY, memory(), memory())).toBeNull();
  });

  it("local only: returned, nothing else changes", () => {
    const local = memory({ k: "L" });
    expect(loadMigrated(KEY, local, memory())).toBe("L");
    expect(local.data).toEqual({ k: "L" });
  });

  it("session only: copied to local, then removed from session", () => {
    const local = memory();
    const session = memory({ k: "S" });
    expect(loadMigrated(KEY, local, session)).toBe("S");
    expect(local.data).toEqual({ k: "S" });
    expect(session.data).toEqual({});
    // A second load reads the local copy
    expect(loadMigrated(KEY, local, session)).toBe("S");
  });

  it("both: local wins and the session value is removed", () => {
    const local = memory({ k: "L" });
    const session = memory({ k: "S" });
    expect(loadMigrated(KEY, local, session)).toBe("L");
    expect(local.data).toEqual({ k: "L" });
    expect(session.data).toEqual({});
  });

  it("a local write that fails keeps the session value and still returns it", () => {
    const local: KeyValueStore = {
      getItem: () => null,
      setItem: () => {
        throw new Error("quota");
      },
      removeItem: () => {},
    };
    const session = memory({ k: "S" });
    expect(loadMigrated(KEY, local, session)).toBe("S");
    expect(session.data).toEqual({ k: "S" });
  });

  it("blocked storages are not fatal", () => {
    const blocked: KeyValueStore = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
      removeItem: () => {
        throw new Error("blocked");
      },
    };
    expect(loadMigrated(KEY, blocked, blocked)).toBeNull();
    expect(loadMigrated(KEY, null, null)).toBeNull();
    expect(loadMigrated(KEY, null, memory({ k: "S" }))).toBe("S");
  });
});
