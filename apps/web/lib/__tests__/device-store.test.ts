import { describe, expect, it, vi } from "vitest";
import { createDeviceStore } from "../device-store";
import type { KeyValueStore } from "../storage-keys";

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

const parse = (raw: string | null): string[] => {
  try {
    const v: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
};

describe("createDeviceStore", () => {
  it("reads the stored value, and the empty one when nothing is stored", () => {
    const empty: string[] = [];
    const store = createDeviceStore({ key: "k", parse, empty, storage: () => memory() });
    expect(store.get()).toBe(empty);
    const filled = createDeviceStore({ key: "k", parse, empty, storage: () => memory({ k: '["a","b"]' }) });
    expect(filled.get()).toEqual(["a", "b"]);
  });

  it("gives the same object until the stored text changes (a render never sees a new list for nothing)", () => {
    const mem = memory({ k: '["a"]' });
    const store = createDeviceStore({ key: "k", parse, empty: [], storage: () => mem });
    const first = store.get();
    expect(store.get()).toBe(first);
    mem.setItem("k", '["a","b"]');
    expect(store.get()).toEqual(["a", "b"]);
  });

  it("set round-trips through storage and tells the subscribers", () => {
    const mem = memory();
    const store = createDeviceStore({ key: "k", parse, empty: [], storage: () => mem });
    const seen = vi.fn();
    const off = store.subscribe(seen);
    store.set(["x", "y"]);
    expect(mem.data.k).toBe('["x","y"]');
    expect(store.get()).toEqual(["x", "y"]);
    expect(seen).toHaveBeenCalledTimes(1);
    off();
    store.set(["z"]);
    expect(seen).toHaveBeenCalledTimes(1);
    // A second store on the same storage reads it back
    expect(createDeviceStore({ key: "k", parse, empty: [], storage: () => mem }).get()).toEqual(["z"]);
  });

  it("keeps the value for this page view when storage refuses the write", () => {
    const mem = memory();
    mem.setItem = () => {
      throw new Error("quota");
    };
    const store = createDeviceStore({ key: "k", parse, empty: [], storage: () => mem });
    store.set(["kept"]);
    expect(store.get()).toEqual(["kept"]);
  });

  it("keeps the value when there is no storage at all", () => {
    const store = createDeviceStore({ key: "k", parse, empty: [], storage: () => null });
    store.set(["kept"]);
    expect(store.get()).toEqual(["kept"]);
  });

  it("follows the account: another storage under the same key is another value", () => {
    let current = memory({ k: '["mine"]' });
    const store = createDeviceStore({ key: "k", parse, empty: [], storage: () => current });
    expect(store.get()).toEqual(["mine"]);
    current = memory({ k: '["theirs"]' });
    expect(store.get()).toEqual(["theirs"]);
  });

  it("the server snapshot is the empty value", () => {
    const empty: string[] = [];
    const store = createDeviceStore({ key: "k", parse, empty, storage: () => memory({ k: '["a"]' }) });
    expect(store.getServer()).toBe(empty);
  });
});
