import { describe, expect, it } from "vitest";
import { createDeferredWriter } from "../deferred-write";

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

  it("the same key for another store (the account changed) writes the old value first", () => {
    const { writer, store, writes } = setup();
    const other = { setItem: (k: string, v: string) => void writes.push([`other:${k}`, v]) };
    writer.schedule(store, "entries", () => "mine");
    writer.schedule(other, "entries", () => "theirs");
    expect(writes).toEqual([["entries", "mine"]]);
    writer.flush();
    expect(writes).toEqual([["entries", "mine"], ["other:entries", "theirs"]]);
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
