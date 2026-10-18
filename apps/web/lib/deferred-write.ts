import { whenIdle } from "./idle";

/** The part of a Storage the writer uses (lib/storage-keys KeyValueStore has it too). */
export interface WriteTarget {
  setItem(key: string, value: string): void;
}

interface Pending {
  store: WriteTarget;
  produce: () => string;
}

export interface DeferredWriter {
  /** Writes `produce()` to `store[key]` when the browser is idle. A newer call for the same key replaces the waiting one. */
  schedule(store: WriteTarget, key: string, produce: () => string): void;
  /** Writes everything that is waiting, now. */
  flush(): void;
}

/**
 * cc-58: localStorage writes are synchronous and the diary writes its lists after every change. They wait for an idle
 * moment instead (one write per key, the newest value), and go out at once when the page is hidden or closed
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

  const pending = new Map<string, Pending>();
  let cancelIdle: (() => void) | null = null;
  let listening = false;

  function flush() {
    cancelIdle?.();
    cancelIdle = null;
    for (const [key, { store, produce }] of pending) {
      try {
        store.setItem(key, produce());
      } catch {
        // Quota or storage blocked: the same as an immediate write that failed
      }
    }
    pending.clear();
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
      const waiting = pending.get(key);
      // The same key for another store (the account changed): the old value is written first
      if (waiting && waiting.store !== store) {
        try {
          waiting.store.setItem(key, waiting.produce());
        } catch {
          // Ignore
        }
      }
      pending.set(key, { store, produce });
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
