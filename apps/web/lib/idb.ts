/**
 * cc-68: the one IndexedDB database of the app ("h1t"). Three stores:
 *  - kv:     the food catalogue copy (lib/catalog-cache), out-of-line keys
 *  - outbox: the writes waiting for the server, one record per write (lib/outbox), keyPath "key"
 *  - days:   the slim cache of past days read from the server (lib/day-cache), out-of-line keys "<scope>|<YYYY-MM-DD>"
 * Every module opens it through here: two modules opening the same database at different versions would make the
 * second one fail. Every call resolves (no throw): without IndexedDB (a private window, blocked storage) the callers
 * fall back to what they did before.
 */
export const DB_NAME = "h1t";
export const DB_VERSION = 2;
export type StoreName = "kv" | "outbox" | "days";

export { storageErrorKind } from "./storage-error";

let opening: Promise<IDBDatabase | null> | null = null;
let openedWith: IDBFactory | undefined;

/** Forget the open connection (tests give each case its own database). */
export function resetIdb(): void {
  opening = null;
  openedWith = undefined;
}

export function hasIndexedDb(): boolean {
  return typeof indexedDB !== "undefined" && indexedDB !== null;
}

export function openDb(): Promise<IDBDatabase | null> {
  if (openedWith !== (hasIndexedDb() ? indexedDB : undefined)) {
    opening = null;
    openedWith = hasIndexedDb() ? indexedDB : undefined;
  }
  opening ??= new Promise((resolve) => {
    try {
      if (!hasIndexedDb()) return resolve(null);
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains("kv")) db.createObjectStore("kv");
        if (!db.objectStoreNames.contains("outbox")) db.createObjectStore("outbox", { keyPath: "key" });
        if (!db.objectStoreNames.contains("days")) db.createObjectStore("days");
      };
      request.onsuccess = () => {
        const db = request.result;
        // Another tab upgrades the database: let go, the next call opens it again
        db.onversionchange = () => {
          db.close();
          opening = null;
        };
        resolve(db);
      };
      request.onerror = () => resolve(null);
      request.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return opening;
}

export type IdbResult<T> = { ok: true; value: T | null } | { ok: false; error: unknown };

const unavailable: IdbResult<never> = { ok: false, error: new Error("IndexedDB unavailable") };

/** One request; resolves with its result once the transaction has completed (the write is on disk). */
export async function idbRun<T>(store: StoreName, mode: IDBTransactionMode, work: (s: IDBObjectStore) => IDBRequest<T>): Promise<IdbResult<T>> {
  const db = await openDb();
  if (!db) return unavailable;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(store, mode);
      const request = work(tx.objectStore(store));
      let value: T | null = null;
      request.onsuccess = () => {
        value = request.result ?? null;
      };
      tx.oncomplete = () => resolve({ ok: true, value });
      tx.onerror = () => resolve({ ok: false, error: tx.error ?? request.error });
      tx.onabort = () => resolve({ ok: false, error: tx.error ?? request.error ?? new Error("aborted") });
    } catch (error) {
      resolve({ ok: false, error });
    }
  });
}

export type IdbOp = { put: unknown; key?: IDBValidKey } | { delete: IDBValidKey };

/** Several writes in one transaction: all of them are on disk when it resolves ok, or none. */
export async function idbBatch(store: StoreName, ops: IdbOp[]): Promise<IdbResult<true>> {
  if (ops.length === 0) return { ok: true, value: true };
  const db = await openDb();
  if (!db) return unavailable;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(store, "readwrite");
      const s = tx.objectStore(store);
      for (const op of ops) {
        if ("delete" in op) s.delete(op.delete);
        else if (op.key !== undefined) s.put(op.put, op.key);
        else s.put(op.put);
      }
      tx.oncomplete = () => resolve({ ok: true, value: true });
      tx.onerror = () => resolve({ ok: false, error: tx.error });
      tx.onabort = () => resolve({ ok: false, error: tx.error ?? new Error("aborted") });
    } catch (error) {
      resolve({ ok: false, error });
    }
  });
}

/** Every record of a store (the outbox and the day cache are small: a few hundred records at most). */
export async function idbAll<T>(store: StoreName): Promise<IdbResult<T[]>> {
  return idbRun<T[]>(store, "readonly", (s) => s.getAll() as IDBRequest<T[]>);
}

/** Every key of a store. */
export async function idbKeys(store: StoreName): Promise<IdbResult<IDBValidKey[]>> {
  return idbRun<IDBValidKey[]>(store, "readonly", (s) => s.getAllKeys() as IDBRequest<IDBValidKey[]>);
}
