import { describe, expect, it } from "vitest";
import { createDeferredWriter } from "../deferred-write";
import { keyedStorage } from "../storage-keys";

function setup() {
  const idleQueue: Array<() => void> = [];
  const listeners = new Map<string, () => void>();
  let hidden = false;
  const writer = createDeferredWriter({
    idle: (fn) => {
      idleQueue.push(fn);
      return () => {
        const i = idleQueue.indexOf(fn);
        if (i >= 0) idleQueue.splice(i, 1);
      };
    },
    listen: (type, fn) => {
      listeners.set(type, fn);
      return () => listeners.delete(type);
    },
    hidden: () => hidden,
  });
  const writes: Array<[string, string]> = [];
  const store = { setItem: (k: string, v: string) => void writes.push([k, v]) };
  return { writer, store, writes, idleQueue, listeners, hide: () => (hidden = true) };
}

describe("deferred localStorage writes (cc-58)", () => {
  it("waits for an idle moment, and writes only the newest value of a key", () => {
    const { writer, store, writes, idleQueue } = setup();
    writer.schedule(store, "entries", () => "1");
    writer.schedule(store, "entries", () => "2");
    writer.schedule(store, "recent", () => "r");
    expect(writes).toEqual([]);
    expect(idleQueue).toHaveLength(1);
    idleQueue[0]();
    expect(writes).toEqual([["entries", "2"], ["recent", "r"]]);
  });

  it("a pending write is flushed on pagehide (nothing is lost when the page closes)", () => {
    const { writer, store, writes, listeners, idleQueue } = setup();
    writer.schedule(store, "entries", () => "saved");
    expect(writes).toEqual([]);
    listeners.get("pagehide")?.();
    expect(writes).toEqual([["entries", "saved"]]);
    // the idle callback that was waiting is gone: no second write
    expect(idleQueue).toHaveLength(0);
  });

  it("is flushed when the page turns hidden, not when it becomes visible", () => {
    const { writer, store, writes, listeners, hide } = setup();
    writer.schedule(store, "entries", () => "a");
    listeners.get("visibilitychange")?.();
    expect(writes).toEqual([]);
    hide();
    listeners.get("visibilitychange")?.();
    expect(writes).toEqual([["entries", "a"]]);
  });

  it("flush() (the provider unmounting) writes at once", () => {
    const { writer, store, writes } = setup();
    writer.schedule(store, "archive", () => "x");
    writer.flush();
    expect(writes).toEqual([["archive", "x"]]);
    writer.flush();
    expect(writes).toHaveLength(1);
  });

  it("the same key for another store is kept apart: each store gets its own newest value", () => {
    const { writer, store, writes, idleQueue } = setup();
    const other = { setItem: (k: string, v: string) => void writes.push([`other:${k}`, v]) };
    writer.schedule(store, "entries", () => "mine");
    writer.schedule(other, "entries", () => "theirs");
    writer.schedule(store, "entries", () => "mine, newer");
    expect(writes).toEqual([]);
    idleQueue[0]();
    expect(writes).toEqual([["entries", "mine, newer"], ["other:entries", "theirs"]]);
  });

  it("an account switch inside the idle window: A's last edit goes to A's key, B's to B's", () => {
    const { writer, idleQueue } = setup();
    const backing = new Map<string, string>();
    const local = {
      getItem: (k: string) => backing.get(k) ?? null,
      setItem: (k: string, v: string) => void backing.set(k, v),
      removeItem: (k: string) => void backing.delete(k),
    };
    const a = keyedStorage(local, false, "acc-a");
    const b = keyedStorage(local, false, "acc-b");
    writer.schedule(a, "entries", () => "a-1");
    writer.schedule(a, "entries", () => "a-last");
    writer.schedule(b, "entries", () => "b-1");
    writer.schedule(a, "entries", () => "a-after-switch-back");
    writer.schedule(b, "entries", () => "b-last");
    expect(backing.size).toBe(0);
    expect(idleQueue).toHaveLength(1);
    idleQueue[0]();
    expect([...backing]).toEqual([
      ["entries_acc-a", "a-after-switch-back"],
      ["entries_acc-b", "b-last"],
    ]);
  });

  it("the account's last edit is written when the page hides right after the switch", () => {
    const { writer, writes, listeners } = setup();
    const a = { setItem: (k: string, v: string) => void writes.push([`a:${k}`, v]) };
    const b = { setItem: (k: string, v: string) => void writes.push([`b:${k}`, v]) };
    writer.schedule(a, "archive", () => "a");
    writer.schedule(b, "archive", () => "b");
    listeners.get("pagehide")?.();
    expect(writes).toEqual([["a:archive", "a"], ["b:archive", "b"]]);
  });

  it("a failing store does not stop the other writes", () => {
    const { writer, writes } = setup();
    const broken = { setItem: () => { throw new Error("quota"); } };
    const ok = { setItem: (k: string, v: string) => void writes.push([k, v]) };
    writer.schedule(broken, "a", () => "1");
    writer.schedule(ok, "b", () => "2");
    writer.flush();
    expect(writes).toEqual([["b", "2"]]);
  });
});
