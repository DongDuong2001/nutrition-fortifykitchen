import { describe, expect, it } from "vitest";
import { ADDED_ENTRIES_KEY, RECENT_FOODS_KEY, keyedStorage, loadMigrated, storageKey, type KeyValueStore } from "../storage-keys";

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
  it("keeps the real key outside demo mode and adds _demo in demo mode", () => {
    expect(storageKey(ADDED_ENTRIES_KEY, false)).toBe("h1t_added_entries_v1");
    expect(storageKey(ADDED_ENTRIES_KEY, true)).toBe("h1t_added_entries_v1_demo");
    expect(storageKey(RECENT_FOODS_KEY, true)).toBe("h1t_recent_foods_v2_demo");
  });

  it("a keyed storage reads and writes the demo keys only", () => {
    const real = memory({ h1t_favourite_foods_v1: '["a"]' });
    const demo = keyedStorage(real, true);
    expect(demo.getItem("h1t_favourite_foods_v1")).toBeNull();
    demo.setItem("h1t_favourite_foods_v1", '["b"]');
    expect(real.data).toEqual({ h1t_favourite_foods_v1: '["a"]', h1t_favourite_foods_v1_demo: '["b"]' });
    expect(keyedStorage(real, false).getItem("h1t_favourite_foods_v1")).toBe('["a"]');
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
