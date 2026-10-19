/**
 * A small in-memory IndexedDB for the tests: databases that outlive a "page life" (a test can drop the modules'
 * memory and read the same disk again), object stores with keyPath or out-of-line keys, put / get / delete / getAll /
 * getAllKeys / clear, and transactions that complete after their requests. A write can be made to fail the way a full
 * disk does (QuotaExceededError), and every put can be observed.
 */
type Handler = ((event?: unknown) => void) | null;

interface StoreData {
  keyPath: string | null;
  data: Map<string, unknown>;
}

interface DbData {
  version: number;
  stores: Map<string, StoreData>;
}

export interface FakeIdb {
  factory: IDBFactory;
  /** Everything on "disk": database → store → key → value. */
  disk: Map<string, DbData>;
  /** The next write transaction fails with this error (the data is not written). */
  failWrites(error: unknown, times?: number): void;
  /** Writes work again. */
  fixDisk(): void;
  /** Values currently in a store of "h1t". */
  values(store: string): unknown[];
  /** Called with every put (store, value), at the moment it is applied. */
  onPut(fn: (store: string, value: unknown) => void): void;
}

export function quotaError(): DOMException {
  return new DOMException("The quota has been exceeded.", "QuotaExceededError");
}

export function createFakeIdb(): FakeIdb {
  const disk = new Map<string, DbData>();
  let failure: { error: unknown; times: number } | null = null;
  const putListeners: Array<(store: string, value: unknown) => void> = [];

  const later = (fn: () => void) => setTimeout(fn, 0);

  function transaction(db: DbData, names: string | string[], mode: IDBTransactionMode) {
    let pending = 0;
    let done = false;
    let failed: unknown = null;
    const doomed = mode === "readwrite" && failure !== null && failure.times > 0;
    if (doomed && failure) {
      failed = failure.error;
      failure.times--;
      if (failure.times <= 0) failure = null;
    }
    const tx: {
      oncomplete: Handler;
      onerror: Handler;
      onabort: Handler;
      error: unknown;
      objectStore: (name: string) => unknown;
    } = {
      oncomplete: null,
      onerror: null,
      onabort: null,
      error: null,
      objectStore(name: string) {
        const store = db.stores.get(name);
        if (!store) throw new DOMException("No such store", "NotFoundError");
        const request = <T,>(work: () => T) => {
          const req: { result: T | undefined; error: unknown; onsuccess: Handler; onerror: Handler } = { result: undefined, error: null, onsuccess: null, onerror: null };
          pending++;
          later(() => {
            if (!doomed) req.result = work();
            req.onsuccess?.();
            pending--;
            finish();
          });
          return req;
        };
        const keyOf = (value: unknown, key?: unknown) => String(store.keyPath ? (value as Record<string, unknown>)[store.keyPath] : key);
        return {
          put: (value: unknown, key?: unknown) =>
            request(() => {
              store.data.set(keyOf(value, key), structuredClone(value));
              for (const fn of putListeners) fn(name, value);
              return keyOf(value, key);
            }),
          get: (key: unknown) => request(() => structuredClone(store.data.get(String(key)))),
          delete: (key: unknown) => request(() => void store.data.delete(String(key))),
          getAll: () => request(() => [...store.data.values()].map((v) => structuredClone(v))),
          getAllKeys: () => request(() => [...store.data.keys()]),
          clear: () => request(() => void store.data.clear()),
        };
      },
    };
    const finish = () => {
      if (done || pending > 0) return;
      done = true;
      if (doomed) {
        tx.error = failed;
        tx.onabort?.();
      } else {
        tx.oncomplete?.();
      }
    };
    later(finish);
    void names;
    return tx;
  }

  const factory = {
    open(name: string, version = 1) {
      const req: { result: unknown; error: unknown; onsuccess: Handler; onerror: Handler; onblocked: Handler; onupgradeneeded: Handler } = {
        result: undefined,
        error: null,
        onsuccess: null,
        onerror: null,
        onblocked: null,
        onupgradeneeded: null,
      };
      later(() => {
        let data = disk.get(name);
        const upgrading = !data || data.version < version;
        if (!data) {
          data = { version, stores: new Map() };
          disk.set(name, data);
        }
        const dbData = data;
        const db = {
          objectStoreNames: { contains: (n: string) => dbData.stores.has(n) },
          createObjectStore: (n: string, options?: { keyPath?: string }) => {
            dbData.stores.set(n, { keyPath: options?.keyPath ?? null, data: new Map() });
          },
          transaction: (names: string | string[], mode: IDBTransactionMode = "readonly") => transaction(dbData, names, mode),
          close: () => {},
          onversionchange: null as Handler,
        };
        req.result = db;
        if (upgrading) {
          dbData.version = version;
          req.onupgradeneeded?.();
        }
        req.onsuccess?.();
      });
      return req as unknown as IDBOpenDBRequest;
    },
  } as unknown as IDBFactory;

  return {
    factory,
    disk,
    failWrites(error, times = 1) {
      failure = { error, times };
    },
    fixDisk() {
      failure = null;
    },
    values(store) {
      return [...(disk.get("h1t")?.stores.get(store)?.data.values() ?? [])];
    },
    onPut(fn) {
      putListeners.push(fn);
    },
  };
}
