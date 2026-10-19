import { hasIndexedDb, idbAll, idbBatch, openDb, storageErrorKind } from "./idb";
import { OFFLINE_OUTBOX_KEY, browserLocal, dropLegacyPersonal, storageKey } from "./storage-keys";
import { postTab, onTab } from "./tab-sync";

/**
 * cc-68 (S2, S8): the outbox, the writes that have not reached the server. One record per write, in IndexedDB (the
 * old localStorage array is moved over once, without loss; where IndexedDB is missing the localStorage array is kept
 * as before). A write is committed here BEFORE its request goes out, so a kill during the fetch loses nothing.
 *
 * The state lives in memory too (`items`), so the screens read it without waiting; every change updates the memory
 * at once and then the disk. A commit that fails (quota, storage blocked) is never swallowed: `onStorageFailure`
 * listeners hear it, and the caller gets { ok: false }.
 */

export type OutboxState = "queued" | "sending" | "held";
export type OutboxKind = "diary" | "profile" | "weight" | "favourite";

export interface OutboxItem {
  /** This one write (an entry can have several queued). Absent before cc-49: `${id}:${createdAt}`. */
  key: string;
  /** Global order of creation (milliseconds × 1000 + a counter); absent on an item from the localStorage array. */
  seq?: number;
  /** The entry the write is about (diary), or the thing it changes (profile, weight, favourite). */
  id: string;
  /** Absent = a diary write. */
  kind?: OutboxKind;
  /** A side write that replaces the one before it for the same thing (last write wins): "profile", "weight:<date>", "fav:<foodId>". */
  entity?: string;
  /** The day an add is for. "" for an edit or delete (they name the entry by id). */
  date: string;
  /** The day of the entry an edit or delete is about, so a 409 can be told from a refusal of an old day. */
  day?: string;
  payload: Record<string, unknown>;
  /** Absent on an add queued before cc-49: POST /days/{date}/entries. */
  method?: "POST" | "PATCH" | "DELETE" | "PUT";
  path?: string;
  createdAt: number;
  /** When a side write was last changed by the user: the newest wins. */
  updatedAt?: number;
  /** Absent = queued. "sending": its request is out (or the app was killed during it). */
  state?: OutboxState;
  /** How many times a request for it was started: 0 = it never left the device. */
  attempts?: number;
  lastAttemptAt?: number;
  /** How many requests failed without being final (kept under its first name). */
  retries?: number;
  /** Not sent before this time (ms), backoff with jitter. */
  nextAttemptAt?: number;
  /** Stopped retrying after MAX_ATTEMPTS: waits for Thử lại. */
  parked?: boolean;
  /**
   * The server refused it with a 4xx: not sent again until Thử lại or the next app open. `final`: refused for good (a
   * day too old), never sent again.
   */
  held?: { status: number; final?: boolean };
}

/** The outbox of one account (or of demo): the id in memory and the old localStorage key it came from. */
export interface OutboxScope {
  id: string;
  legacyKey: string;
  account: string | null;
}

export function scopeFor(account: string | null, demo: boolean): OutboxScope | null {
  const legacyKey = storageKey(OFFLINE_OUTBOX_KEY, demo, account);
  if (legacyKey === null) return null;
  return { id: demo ? "demo" : (account as string), legacyKey, account };
}

export type CommitResult = { ok: true } | { ok: false; error: unknown; kind: "quota" | "blocked" | "other" };

export interface StorageFailure {
  scope: string;
  kind: "quota" | "blocked" | "other";
  error: unknown;
}

/** A request that started this long ago and never answered is taken for dead (the app was killed): it is sent again. */
export const STALE_SENDING_MS = 30 * 1000;

interface Backend {
  kind: "idb" | "local";
}

interface ScopeState {
  scope: OutboxScope;
  /** What this state was made for: a different localStorage or indexedDB (a test) is a different outbox. */
  localRef: unknown;
  idbRef: unknown;
  items: Map<string, OutboxItem>;
  backend: Backend;
  loaded: Promise<void> | null;
  /** Keys whose write to disk has not finished: a reload from disk must not drop them. */
  inflightKeys: Set<string>;
  /** When each key was last changed in this tab (a counter): a read of the disk that started before it must not undo it. */
  touched: Map<string, number>;
  clock: number;
}

const states = new Map<string, ScopeState>();
const listeners = new Set<(scope: string) => void>();
// Listeners that hear only what another tab changed (a read of the disk), not this tab's own commits
const remoteListeners = new Set<(scope: string) => void>();
const failureListeners = new Set<(failure: StorageFailure) => void>();
const okListeners = new Set<() => void>();
/** The last commit failed: the next one that works tells the okListeners (the "no room" banner goes). */
let failing = false;
let lastSeq = 0;

const nextSeq = (): number => (lastSeq = Math.max(lastSeq + 1, Date.now() * 1000));

export function newSeq(): number {
  return nextSeq();
}

function stateOf(scope: OutboxScope): ScopeState {
  const localRef = browserLocal();
  const idbRef = hasIndexedDb() ? indexedDB : null;
  const found = states.get(scope.id);
  if (found && found.localRef === localRef && found.idbRef === idbRef) return found;
  const state: ScopeState = {
    scope,
    localRef,
    idbRef,
    items: new Map(),
    backend: { kind: idbRef ? "idb" : "local" },
    loaded: null,
    inflightKeys: new Set(),
    touched: new Map(),
    clock: 0,
  };
  states.set(scope.id, state);
  // The old unscoped outbox (before it was per account) goes to the first account that loads: writes never lost. The other legacy keys are deleted.
  if (scope.account && scope.id !== "demo") dropLegacyPersonal(localRef as Parameters<typeof dropLegacyPersonal>[0], scope.account);
  // Without IndexedDB the array in localStorage is the outbox, and it is read at once
  if (state.backend.kind === "local") loadLocalInto(state);
  return state;
}

function normalise(raw: unknown, index: number): OutboxItem | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as OutboxItem;
  if (typeof item.id !== "string") return null;
  const createdAt = typeof item.createdAt === "number" ? item.createdAt : 0;
  return { ...item, key: item.key ?? `${item.id}:${createdAt}`, seq: item.seq ?? createdAt * 1000 + (index % 1000), createdAt };
}

function readLocalArray(scope: OutboxScope): OutboxItem[] {
  try {
    const raw = browserLocal()?.getItem(scope.legacyKey);
    const parsed: unknown = JSON.parse(raw || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((entry, i) => {
      const item = normalise(entry, i);
      return item ? [item] : [];
    });
  } catch {
    return [];
  }
}

function loadLocalInto(state: ScopeState): void {
  for (const item of readLocalArray(state.scope)) if (!state.items.has(item.key)) state.items.set(item.key, item);
}

const sorted = (items: Iterable<OutboxItem>): OutboxItem[] => [...items].sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0));

/** The outbox of `scope` as it is now, oldest first. Synchronous: it reads the memory. */
export function readItems(scope: OutboxScope | null): OutboxItem[] {
  return scope ? sorted(stateOf(scope).items.values()) : [];
}

export function findItem(scope: OutboxScope | null, key: string): OutboxItem | undefined {
  return scope ? stateOf(scope).items.get(key) : undefined;
}

export function subscribeOutbox(fn: (scope: string) => void, remoteOnly = false): () => void {
  const set = remoteOnly ? remoteListeners : listeners;
  set.add(fn);
  return () => set.delete(fn);
}

export function onStorageFailure(fn: (failure: StorageFailure) => void): () => void {
  failureListeners.add(fn);
  return () => failureListeners.delete(fn);
}

/** Runs `fn` when a commit works again after one failed. */
export function onStorageOk(fn: () => void): () => void {
  okListeners.add(fn);
  return () => okListeners.delete(fn);
}

function notify(scope: string, remote = false): void {
  for (const fn of [...listeners]) fn(scope);
  if (remote) for (const fn of [...remoteListeners]) fn(scope);
}

function fail(scope: string, error: unknown): CommitResult {
  failing = true;
  const kind = storageErrorKind(error);
  const failure: StorageFailure = { scope, kind, error };
  for (const fn of [...failureListeners]) fn(failure);
  return { ok: false, error, kind };
}

type Op = { put: OutboxItem } | { delete: string };

/** Writes the ops to disk. IndexedDB: one transaction; localStorage: the whole array (as before). */
async function persist(state: ScopeState, ops: Op[]): Promise<CommitResult> {
  if (ops.length === 0) return { ok: true };
  if (state.backend.kind === "idb") {
    const result = await idbBatch(
      "outbox",
      ops.map((op) => ("put" in op ? { put: { ...op.put, scope: state.scope.id } } : { delete: op.delete }))
    );
    if (result.ok) return { ok: true };
    return fail(state.scope.id, result.error);
  }
  try {
    const local = browserLocal();
    if (!local) throw new Error("localStorage unavailable");
    local.setItem(state.scope.legacyKey, JSON.stringify(sorted(state.items.values())));
    return { ok: true };
  } catch (error) {
    return fail(state.scope.id, error);
  }
}

async function commit(scope: OutboxScope, ops: Op[]): Promise<CommitResult> {
  const state = stateOf(scope);
  state.clock++;
  for (const op of ops) {
    if ("put" in op) state.items.set(op.put.key, op.put);
    else state.items.delete(op.delete);
    state.touched.set("put" in op ? op.put.key : op.delete, state.clock);
  }
  notify(scope.id);
  const keys = ops.map((op) => ("put" in op ? op.put.key : op.delete));
  for (const key of keys) state.inflightKeys.add(key);
  try {
    const result = await persist(state, ops);
    if (result.ok) {
      postTab({ type: "outbox", scope: scope.id });
      if (failing) {
        failing = false;
        for (const fn of [...okListeners]) fn();
      }
    }
    return result;
  } finally {
    for (const key of keys) state.inflightKeys.delete(key);
  }
}

/** Adds or replaces writes. The memory changes at once; the promise resolves when they are on disk. */
export function putItems(scope: OutboxScope, items: OutboxItem[]): Promise<CommitResult> {
  return commit(scope, items.map((put) => ({ put })));
}

export function putItem(scope: OutboxScope, item: OutboxItem): Promise<CommitResult> {
  return putItems(scope, [item]);
}

export function removeItems(scope: OutboxScope, keys: string[]): Promise<CommitResult> {
  const state = stateOf(scope);
  const present = keys.filter((key) => state.items.has(key));
  return commit(scope, present.map((key) => ({ delete: key })));
}

/** Changes one item (nothing happens when it is gone). */
export function patchItem(scope: OutboxScope, key: string, patch: Partial<OutboxItem>): Promise<CommitResult> {
  const current = stateOf(scope).items.get(key);
  if (!current) return Promise.resolve({ ok: true });
  return putItem(scope, { ...current, ...patch });
}

/** Writes already in the outbox when this tab starts, if a request was out for them and never answered, are sent again. */
function revive(item: OutboxItem, now: number): OutboxItem {
  if (item.state === "sending" && now - (item.lastAttemptAt ?? 0) >= STALE_SENDING_MS) return { ...item, state: "queued" };
  return item;
}

/**
 * Loads the outbox of `scope` from disk (once), moves the old localStorage array into IndexedDB without loss, and sets
 * a write whose request never answered back to queued. Safe to call again.
 */
export function loadOutbox(scope: OutboxScope | null): Promise<void> {
  if (!scope) return Promise.resolve();
  const state = stateOf(scope);
  state.loaded ??= (async () => {
    if (state.backend.kind === "idb") {
      const db = await openDb();
      if (!db) state.backend = { kind: "local" };
    }
    if (state.backend.kind === "local") {
      loadLocalInto(state);
    } else {
      const readAt = state.clock;
      const all = await idbAll<OutboxItem & { scope?: string }>("outbox");
      if (!all.ok) {
        // IndexedDB is there but cannot be read: keep working from the localStorage array
        state.backend = { kind: "local" };
        loadLocalInto(state);
      } else {
        for (const record of all.value ?? []) {
          if (record.scope !== scope.id) continue;
          const item = normalise(record, 0);
          // What this tab already changed in memory (or removed) since the read began wins over what the disk had
          if (item && !state.items.has(item.key) && (state.touched.get(item.key) ?? 0) <= readAt) state.items.set(item.key, item);
        }
        await migrateLegacy(state);
      }
    }
    const now = Date.now();
    const revived = [...state.items.values()].filter((item) => item.state === "sending" && now - (item.lastAttemptAt ?? 0) >= STALE_SENDING_MS);
    if (revived.length > 0) await putItems(scope, revived.map((item) => revive(item, now)));
    notify(scope.id);
  })();
  return state.loaded;
}

/** The localStorage array of the old outbox goes into IndexedDB; its key is removed only once the records are on disk. */
async function migrateLegacy(state: ScopeState): Promise<void> {
  const legacy = readLocalArray(state.scope);
  if (legacy.length === 0) {
    try {
      browserLocal()?.removeItem(state.scope.legacyKey);
    } catch {
      // Storage blocked
    }
    return;
  }
  const fresh = legacy.filter((item) => !state.items.has(item.key));
  for (const item of fresh) state.items.set(item.key, item);
  const result = await persist(state, fresh.map((put) => ({ put })));
  if (!result.ok) {
    // Not on disk: the array stays where it is, and this session works from it
    state.backend = { kind: "local" };
    return;
  }
  try {
    browserLocal()?.removeItem(state.scope.legacyKey);
  } catch {
    // The array stays; the next load finds the same records already in IndexedDB
  }
}

/** Reads the outbox from disk again (another tab changed it). Writes of this tab not on disk yet stay. */
export async function reloadOutbox(scope: OutboxScope | null): Promise<void> {
  if (!scope) return;
  const state = stateOf(scope);
  await loadOutbox(scope);
  let disk: OutboxItem[];
  const readAt = state.clock;
  if (state.backend.kind === "idb") {
    const all = await idbAll<OutboxItem & { scope?: string }>("outbox");
    if (!all.ok) return;
    disk = (all.value ?? []).filter((r) => r.scope === scope.id).flatMap((r) => {
      const item = normalise(r, 0);
      return item ? [item] : [];
    });
  } else {
    disk = readLocalArray(scope);
  }
  const onDisk = new Set(disk.map((item) => item.key));
  let changed = false;
  const fresh = (key: string) => (state.touched.get(key) ?? 0) > readAt;
  for (const item of disk) {
    const mine = state.items.get(item.key);
    if (state.inflightKeys.has(item.key) || fresh(item.key)) continue;
    // A request this tab has out stays "sending" here, whatever the disk says
    if (mine?.state === "sending" && item.state !== "sending") continue;
    if (!mine || JSON.stringify(mine) !== JSON.stringify(item)) {
      state.items.set(item.key, item);
      changed = true;
    }
  }
  for (const key of [...state.items.keys()]) {
    if (!onDisk.has(key) && !state.inflightKeys.has(key) && !fresh(key)) {
      state.items.delete(key);
      changed = true;
    }
  }
  if (changed) notify(scope.id, true);
}

/** The scopes this tab has an outbox for are read again when another tab says it changed one. */
let listening = false;
export function listenForOtherTabs(scopeOf: () => OutboxScope | null): () => void {
  if (listening) return () => {};
  listening = true;
  const off = onTab((message) => {
    if (message.type !== "outbox") return;
    const scope = scopeOf();
    if (scope && scope.id === message.scope) void reloadOutbox(scope);
  });
  return () => {
    listening = false;
    off();
  };
}

/** Removes the whole outbox of `scope` (Đăng xuất with nothing waiting, or after the account guard fired). */
export async function clearOutbox(scope: OutboxScope | null): Promise<void> {
  if (!scope) return;
  const state = stateOf(scope);
  const keys = [...state.items.keys()];
  state.items.clear();
  try {
    browserLocal()?.removeItem(scope.legacyKey);
  } catch {
    // Storage blocked
  }
  if (state.backend.kind === "idb") await idbBatch("outbox", keys.map((key) => ({ delete: key })));
  notify(scope.id);
  postTab({ type: "outbox", scope: scope.id });
}

export interface OutboxCounts {
  /** Waiting to be sent (queued or sending), not held. */
  pending: number;
  /** Refused or parked: waits for Thử lại (includes the ones refused for good). */
  failed: number;
  /** Of `failed`, refused for good. */
  final: number;
  /** Of `failed`, stopped after too many attempts. */
  parked: number;
  /** createdAt of the oldest write that is not held, or null. */
  oldestPendingAt: number | null;
}

export function countItems(items: readonly OutboxItem[]): OutboxCounts {
  let pending = 0;
  let failed = 0;
  let final = 0;
  let parked = 0;
  let oldestPendingAt: number | null = null;
  for (const item of items) {
    if (item.held || item.parked) {
      failed++;
      if (item.held?.final) final++;
      if (item.parked) parked++;
      continue;
    }
    pending++;
    if (oldestPendingAt === null || item.createdAt < oldestPendingAt) oldestPendingAt = item.createdAt;
  }
  return { pending, failed, final, parked, oldestPendingAt };
}

export function outboxCounts(scope: OutboxScope | null): OutboxCounts {
  return countItems(readItems(scope));
}

/** For tests: forget the in-memory state of every outbox. */
export function resetOutboxState(): void {
  states.clear();
  listeners.clear();
  remoteListeners.clear();
  failureListeners.clear();
  okListeners.clear();
  failing = false;
  listening = false;
  lastSeq = 0;
}
