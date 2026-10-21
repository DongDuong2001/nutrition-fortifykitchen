import { accountStorage, type KeyValueStore } from "./storage-keys";

/**
 * A small value kept on this device only, under the signed-in account's key (lib/storage-keys accountStorage; demo has its own
 * twin), like the macro split and Bữa ăn của tôi. Read through useSyncExternalStore: `get` hands back the same object until the
 * stored text changes, so a render never sees a new list for nothing. A write that storage refuses (full or blocked) still holds
 * for this page view. Another tab's write arrives through the storage event.
 */
export interface DeviceStore<T> {
  get: () => T;
  /** What the server draws: the empty value (nothing is read there). */
  getServer: () => T;
  set: (next: T) => void;
  subscribe: (listener: () => void) => () => void;
}

export function createDeviceStore<T>({
  key,
  parse,
  empty,
  storage = accountStorage,
}: {
  key: string;
  parse: (raw: string | null) => T;
  empty: T;
  storage?: () => KeyValueStore | null;
}): DeviceStore<T> {
  let cache: { raw: string | null; value: T } = { raw: null, value: empty };
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((l) => l());
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key.startsWith(key)) notify();
  };

  const readRaw = (): string | null => {
    try {
      return storage()?.getItem(key) ?? null;
    } catch {
      return null;
    }
  };

  return {
    get() {
      const raw = readRaw();
      if (raw !== cache.raw) cache = { raw, value: parse(raw) };
      return cache.value;
    },
    getServer: () => empty,
    set(next) {
      try {
        storage()?.setItem(key, JSON.stringify(next));
      } catch {
        // Full or blocked: the value lasts for this page view only
      }
      // Whatever storage holds now is what get() will compare with, so a refused write keeps `next` in the cache
      cache = { raw: readRaw(), value: next };
      notify();
    },
    subscribe(listener) {
      if (listeners.size === 0 && typeof window !== "undefined") window.addEventListener("storage", onStorage);
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0 && typeof window !== "undefined") window.removeEventListener("storage", onStorage);
      };
    },
  };
}
