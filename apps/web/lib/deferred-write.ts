import { whenIdle } from "./idle";

/** The part of a Storage the writer uses (lib/storage-keys KeyValueStore has it too). */
export interface WriteTarget {
  setItem(key: string, value: string): void;
}

export interface DeferredWriter {
  /** Writes `produce()` to `store[key]` when the browser is idle. A newer call for the same store and key replaces the waiting one. */
  schedule(store: WriteTarget, key: string, produce: () => string): void;
  /** Writes everything that is waiting, now. */
  flush(): void;
}

/**
 * cc-58: localStorage writes are synchronous and the diary writes its lists after every change. They wait for an idle
 * moment instead (one write per store and key, the newest value), and go out at once when the page is hidden or closed
 * (visibilitychange to hidden, pagehide) or when the provider unmounts, so nothing is lost.
 * `idle`, `listen` and `hidden` are for tests; the defaults are the browser's.
 */
export function createDeferredWriter(deps?: {
  idle?: (fn: () => void) => () => void;
  listen?: (type: "pagehide" | "visibilitychange", fn: () => void) => () => void;
  hidden?: () => boolean;
}): DeferredWriter {
  const idle = deps?.idle ?? ((fn) => whenIdle(fn));
  const hidden = deps?.hidden ?? (() => typeof document !== "undefined" && document.visibilityState === "hidden");
  const listen =
    deps?.listen ??
    ((type, fn) => {
      if (typeof window === "undefined") return () => {};
      const target: EventTarget = type === "pagehide" ? window : document;
      target.addEventListener(type, fn);
      return () => target.removeEventListener(type, fn);
    });

  // Per store, then per key: the account's own storage is a store of its own, so one account's waiting write is
  // never replaced by another's for the same key
  const pending = new Map<WriteTarget, Map<string, () => string>>();
  let cancelIdle: (() => void) | null = null;
  let listening = false;

  function flush() {
    cancelIdle?.();
    cancelIdle = null;
    const waiting = [...pending];
    pending.clear();
    for (const [store, keys] of waiting) {
      for (const [key, produce] of keys) {
        try {
          store.setItem(key, produce());
        } catch {
          // Quota or storage blocked: the same as an immediate write that failed
        }
      }
    }
  }

  function ensureListening() {
    if (listening) return;
    listening = true;
    listen("pagehide", flush);
    listen("visibilitychange", () => {
      if (hidden()) flush();
    });
  }

  return {
    schedule(store, key, produce) {
      ensureListening();
      let keys = pending.get(store);
      if (!keys) pending.set(store, (keys = new Map()));
      keys.set(key, produce);
      if (!cancelIdle) {
        cancelIdle = idle(() => {
          cancelIdle = null;
          flush();
        });
      }
    },
    flush,
  };
}

/** The app's one writer. */
export const deferredWrites = createDeferredWriter();
