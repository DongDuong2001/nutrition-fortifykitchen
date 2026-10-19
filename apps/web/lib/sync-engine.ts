import { apiClient, apiFetch, diaryTimeout, serverAnswer, writeOutcome, PAST_DAY_READ_ONLY, pruneOutbox, type SyncResult, type WriteResult } from "./api-client";
import { currentAccountId } from "./auth-actions";
import { isDemo } from "./demo";
import { getTodayIsoVN } from "./date";
import { isEditableDay } from "./day-rules";
import { generateUuid } from "./uuid";
import type { AddedDiaryEntry } from "./diary-edits";
import { isRecipeId } from "./recipe";
import { reportClientError } from "./client-errors";
import { clearStorageAlert, raiseStorageAlert } from "./sync-state";
import { storageErrorKind } from "./storage-error";
import { requestPersistentStorage } from "./storage-persist";
import { onTab, postTab } from "./tab-sync";
export { watchAccount } from "./account-guard";
export { unsyncedCount, wipeAccount } from "./account-wipe";
export { initHistory, requestDays, saveHistoryDays } from "./history";
import { applyServerDay } from "./server-day";
import { rememberServerTraining } from "./training-minutes";
export { applyServerDay } from "./server-day";
import {
  STALE_SENDING_MS,
  findItem,
  loadOutbox,
  newSeq,
  putItem,
  putItems,
  readItems,
  reloadOutbox,
  removeItems,
  scopeFor,
  onStorageFailure,
  onStorageOk,
  listenForOtherTabs,
  subscribeOutbox,
  type CommitResult,
  type OutboxItem,
  type OutboxKind,
  type OutboxScope,
} from "./outbox";

/**
 * cc-68: the sending side of the outbox, loaded after the first paint (lib/api-client keeps a thin front and loads this
 * on the first write, sync or app mount). Everything that touches the outbox or IndexedDB lives here and in lib/outbox,
 * so none of it is in the first-load JS of a route.
 */

/** What a write needs to be made into an outbox item. */
type DiaryWrite = Pick<OutboxItem, "id" | "date" | "payload" | "method" | "path" | "kind" | "entity" | "day">;

const itemKey = (item: Pick<OutboxItem, "key">) => item.key;
export const itemMethod = (item: Pick<OutboxItem, "method">) => item.method ?? "POST";
export const itemPath = (item: Pick<OutboxItem, "path" | "date">) => item.path ?? `/days/${item.date}/entries`;
const isDiary = (item: Pick<OutboxItem, "kind">) => (item.kind ?? "diary") === "diary";
const isAdd = (item: Pick<OutboxItem, "method" | "path" | "date" | "kind">) =>
  isDiary(item) && itemMethod(item) === "POST" && itemPath(item) === `/days/${item.date}/entries`;

/** A write that names a recipe's local id: the server refuses it, so it waits until repointOutboxFood gives it the server food. */
const waitsForFood = (item: OutboxItem) => isDiary(item) && typeof item.payload?.food_id === "string" && isRecipeId(item.payload.food_id);

/** The outbox of the signed-in account (or demo): where a write made now belongs. Null with nobody signed in. */
function currentScope(): OutboxScope | null {
  return scopeFor(currentAccountId(), isDemo());
}

/** Starts reading the account's outbox from disk (and moves the old localStorage array over). Call when an account loads. */
export function loadOfflineOutbox(): Promise<void> {
  wireAlerts();
  // After sign-in (an account is loading): ask the browser to keep this site's data (Safari clears it after 7 days otherwise)
  void requestPersistentStorage();
  return loadOutbox(currentScope());
}

/** Queues a write in the outbox of the account it belongs to (default: the signed-in one). */
function makeItem(write: DiaryWrite, extra: Partial<OutboxItem> = {}): OutboxItem {
  const createdAt = Date.now();
  return {
    ...write,
    key: `${write.id}:${createdAt}:${generateUuid()}`,
    seq: newSeq(),
    createdAt,
    state: "queued",
    attempts: 0,
    retries: 0,
    ...extra,
  };
}

/**
 * Points `account`'s queued writes that name food `from` (a recipe's local id) at `to` (its server food), and lifts
 * their hold (the server refused the local id), so the next sync sends them. A write held for good stays held.
 */
export function repointOutboxFood(from: string, to: string, account: string | null): number {
  const scope = scopeFor(account, isDemo());
  const changed = readItems(scope).flatMap((item) =>
    item.payload?.food_id === from
      ? [{ ...item, payload: { ...item.payload, food_id: to }, held: item.held?.final ? item.held : undefined, state: item.held?.final ? item.state : ("queued" as const) }]
      : []
  );
  if (scope && changed.length > 0) void putItems(scope, changed);
  return changed.length;
}

/** Entry ids with a write in the outbox for the active account. */
export function getPendingOfflineEntryIds(): string[] {
  return readItems(currentScope()).map((item) => item.id);
}

// Writes being sent now, by entry: the next write of the same entry waits for it, so the server sees them in order
const inFlight = new Map<string, Promise<WriteResult>>();
// Keys of the requests this tab has out right now (a "sending" record from another page life is not in here)
const sendingKeys = new Set<string>();
// When each entry's last write started: a refetch that started before it must not overwrite it (diary-store)
const writeStartedAt = new Map<string, number>();

/** For tests: forgets the writes this page life had in the air (a page that was killed has none). */
export function resetWriteMemory(): void {
  wired = false;
  frozen = false;
  lastDiaryPost = 0;
  inFlight.clear();
  sendingKeys.clear();
  writeStartedAt.clear();
  syncQueue = Promise.resolve({ saved: [], held: [] });
}

/** Entry ids a refetch must leave as they are on the device: a write is queued or being sent. */
export function pendingWriteIds(): Set<string> {
  return new Set([...getPendingOfflineEntryIds(), ...inFlight.keys()]);
}

/** Entry ids whose last write started at or after `time` (ms). */
export function writtenSince(time: number): string[] {
  return [...writeStartedAt].filter(([, at]) => at >= time).map(([id]) => id);
}

/** How many diary writes are being sent now. */
export function writesInFlight(): number {
  return inFlight.size;
}

/** Whether a side write (profile, weight, favourite, training) is waiting: a server copy read now must not replace it. */
export function hasPendingWrite(entity: string): boolean {
  return readItems(currentScope()).some((item) => item.entity === entity);
}

/** The favourites changes waiting to be sent, oldest first: [foodId, on]. Applied on top of a list read from the server. */
export function pendingFavouriteOps(): Array<[string, boolean]> {
  return readItems(currentScope()).flatMap((item): Array<[string, boolean]> =>
    item.kind === "favourite" ? [[String(item.payload.food_id ?? item.id), itemMethod(item) !== "DELETE"]] : []
  );
}

/** Whether a refusal of the day this write is about is for good: the day is older than the editable window. */
function refusedForGood(write: Pick<OutboxItem, "day" | "date">): boolean {
  const day = write.day || write.date;
  // A write that names no day (an old item) keeps the old rule: any past-day refusal is final
  return !day || !isEditableDay(day, getTodayIsoVN());
}

interface Sent {
  outcome: "saved" | "retry" | "held";
  status: number;
  message: string;
  final: boolean;
  /** Another part of this tab (a sync run, the write's own chain) is sending this item right now: nothing was sent. */
  busy?: boolean;
}

async function sendWrite(write: Pick<OutboxItem, "method" | "path" | "date" | "payload" | "day">): Promise<Sent> {
  const method = itemMethod(write);
  let status = 0;
  let answer = { message: "", code: "" };
  try {
    const res = await apiFetch(itemPath(write), {
      method,
      body: method === "DELETE" ? undefined : JSON.stringify(write.payload),
      signal: diaryTimeout(),
    });
    status = res.status;
    if (status >= 300) answer = await serverAnswer(res);
  } catch {
    // No answer: sent again from the outbox
  }
  const outcome = writeOutcome(status, method);
  if (outcome === "held") console.warn(`Diary write not saved: ${method} ${itemPath(write)} → ${status} ${answer.message}`);
  // Any non-2xx answer (not a 404 on a delete, which means done) is reported once
  if (status >= 300 && outcome !== "saved") reportClientError({ kind: "write", method, path: itemPath(write), status, message: answer.message });
  const pastDay = outcome === "held" && status === 409 && answer.code === PAST_DAY_READ_ONLY;
  return { outcome, status, message: answer.message, final: pastDay && refusedForGood(write) };
}

/**
 * Sends one outbox item: it is marked "sending" on disk first (write-ahead), then the request goes out, then the item
 * is removed (saved), or marked queued / held with what the answer was. Never two requests for one item in this tab.
 */
async function attempt(scope: OutboxScope, item: OutboxItem): Promise<Sent> {
  // One request per item: a sync run and the write's own turn can reach the same item together; the second one leaves it
  if (sendingKeys.has(item.key)) return { outcome: "retry", status: -1, message: "", final: false, busy: true };
  const started: OutboxItem = { ...item, state: "sending", attempts: (item.attempts ?? 0) + 1, lastAttemptAt: Date.now(), held: undefined, parked: undefined };
  sendingKeys.add(item.key);
  await putItem(scope, started);
  let sent: Sent;
  try {
    sent = await sendWrite(started);
  } finally {
    sendingKeys.delete(item.key);
  }
  const current = findItem(scope, item.key);
  if (!current) return sent;
  if (sent.outcome === "saved") {
    await removeItems(scope, [item.key]);
    tellOtherTabs(scope);
  } else if (sent.outcome === "held") {
    await putItem(scope, { ...current, state: "held", retries: (current.retries ?? 0) + 1, held: { status: sent.status, message: sent.message, final: sent.final } });
  } else {
    await putItem(scope, { ...current, state: "queued", retries: (current.retries ?? 0) + 1, held: undefined });
  }
  return sent;
}

/**
 * Sends one diary write, after any write of the same entry that is still being sent or still queued. The write is in
 * the outbox before its request goes out (a kill during the fetch loses nothing). What does not reach the server stays
 * there: no answer, 401 after the session refresh, 408, 429 and 5xx to be sent again, any other 4xx held for Thử lại
 * (with the server's message).
 */
export function diaryWrite(write: DiaryWrite): Promise<WriteResult> {
  wireAlerts();
  // The account changed under this tab (lib/account-guard): nothing of this page goes out, or is kept, for anyone
  if (frozen) return Promise.resolve({ state: "queued" });
  writeStartedAt.set(write.id, Date.now());
  const scope = currentScope();
  const before = inFlight.get(write.id) ?? Promise.resolve<WriteResult>({ state: "saved" });
  const mine = readItems(scope).filter((item) => item.id === write.id);

  if (itemMethod(write) === "DELETE" && isDiary(write)) {
    // S7: an add that was ever attempted keeps going (the server may have it, a request may be in the air): the DELETE
    // is queued behind it. Only an add that never left the device is dropped together with the entry's other writes.
    const add = mine.find(isAdd);
    if (add && (add.attempts ?? 0) === 0 && !sendingKeys.has(add.key) && scope) {
      void removeItems(scope, mine.map(itemKey));
      return Promise.resolve({ state: "saved" });
    }
  }

  const item = makeItem(write);
  // The write-ahead commit: the memory at once, the disk next; nothing below waits for it except the request
  const committed = scope ? putItem(scope, item) : Promise.resolve<CommitResult>({ ok: true });

  const run = before.then(async (): Promise<WriteResult> => {
    // The disk is read before the order is judged: an earlier write of this entry from before a restart must be seen
    await Promise.all([committed, loadOutbox(scope)]);
    if (!scope) {
      // Nobody is signed in: nothing to keep a write in
      const sent = await sendWrite(item);
      if (sent.outcome === "saved") return { state: "saved" };
      return sent.outcome === "held" ? { state: "held", status: sent.status, message: sent.message, final: sent.final } : { state: "queued", status: sent.status };
    }
    const current = findItem(scope, item.key);
    // Dropped meanwhile (a delete of an add that never left the device, a sign-out)
    if (!current) return { state: "saved" };
    const earlier = readItems(scope).filter((other) => other.id === write.id && other.key !== item.key && (other.seq ?? 0) < (item.seq ?? 0));
    if (earlier.length > 0) {
      // Earlier writes of this entry wait in the outbox: this one goes after them
      void syncOfflineOutbox();
      return { state: "queued" };
    }
    const { outcome, status, message, final, busy } = await attempt(scope, current);
    if (busy) return { state: "queued" };
    if (outcome === "saved") return { state: "saved" };
    return outcome === "held" ? { state: "held", status, message, final } : { state: "queued", status };
  });
  inFlight.set(write.id, run);
  void run.finally(() => {
    if (inFlight.get(write.id) === run) inFlight.delete(write.id);
  });
  return run;
}

// Set when the account changed under this tab: the page reloads to the gate, and until then nothing is written or sent
let frozen = false;

/** The account this tab loaded for is no longer the signed-in one: no write is made or sent from this page any more. */
export function freezeWrites(): void {
  frozen = true;
}

let syncQueue: Promise<SyncResult> = Promise.resolve({ saved: [], held: [] });

/**
 * Sends the outbox in order, one run at a time (a call during a run starts after it). A write that fails again stays,
 * and the later writes of its entry wait behind it; no answer at all ends the run (offline). Held writes are sent
 * only with `retryHeld` (Thử lại). Writes queued while a run is going are kept. Only one tab drains at a time (a Web
 * Lock), and it reads the outbox from disk first, so what another tab queued is sent too.
 */
export function syncOfflineOutbox(options: { retryHeld?: boolean } = {}): Promise<SyncResult> {
  syncQueue = syncQueue.catch(() => ({ saved: [], held: [] })).then(() => runOutbox(options.retryHeld === true));
  return syncQueue;
}

const EMPTY_RESULT = (): SyncResult => ({ saved: [], held: [] });

/** Runs `fn` while this tab holds the drain lock; `busy` when another tab holds it. Without Web Locks it just runs. */
async function withDrainLock<T>(fn: () => Promise<T>, busy: T): Promise<T> {
  const locks = typeof navigator !== "undefined" ? (navigator as Navigator & { locks?: LockManager }).locks : undefined;
  if (!locks || typeof locks.request !== "function") return fn();
  return locks.request("h1t-outbox-drain", { ifAvailable: true }, async (lock) => (lock ? fn() : busy)) as Promise<T>;
}

/** A "sending" record is another tab's live request (or this tab's own) until it is STALE_SENDING_MS old. */
function sendingElsewhere(item: OutboxItem, now: number): boolean {
  if (item.state !== "sending") return false;
  return sendingKeys.has(item.key) || now - (item.lastAttemptAt ?? 0) < STALE_SENDING_MS;
}

async function runOutbox(retryHeld: boolean): Promise<SyncResult> {
  const result = EMPTY_RESULT();
  if (frozen) return result;
  // The run belongs to the account signed in when it starts: its writes never go out with another account's session
  const account = currentAccountId();
  const scope = currentScope();
  if (!scope) return result;
  await loadOutbox(scope);
  return withDrainLock(async () => {
    await reloadOutbox(scope);
    const items = readItems(scope);
    if (!items.length) return result;
    const blocked = new Set<string>();
    for (const listed of items) {
      const item = findItem(scope, listed.key);
      if (!item) continue;
      if (blocked.has(item.id) || item.held?.final || (item.held && !retryHeld) || waitsForFood(item) || sendingElsewhere(item, Date.now())) {
        blocked.add(item.id);
        continue;
      }
      if (currentAccountId() !== account) break;
      const { outcome, status, message, final, busy } = await attempt(scope, item);
      if (busy) {
        blocked.add(item.id);
        continue;
      }
      if (outcome === "saved") {
        if (itemMethod(item) !== "DELETE" && isDiary(item)) result.saved.push(item.id);
        continue;
      }
      blocked.add(item.id);
      if (outcome === "held") {
        result.held.push({ id: item.id, status, message, date: item.day || item.date, final });
      } else if (status === 0) {
        break;
      }
    }
    // Writes refused for good leave after FINAL_OUTBOX_KEEP_MS (their notice was shown when they were refused)
    const now = Date.now();
    const gone = readItems(scope).filter((item) => !pruneOutbox([item], now).length);
    if (gone.length > 0) await removeItems(scope, gone.map(itemKey));
    return result;
  }, result);
}

/**
 * A change the user made to something that is one value on the server (profile, weight, a favourite, a day's training
 * minutes): it goes through the same outbox as the diary. The newest change of the same thing replaces the ones before it
 * (last write wins, by `updatedAt`), so a long offline stretch sends one request per thing, not one per tap.
 */
export function sideWrite(write: { kind: OutboxKind; entity: string; method: "PUT" | "POST" | "DELETE"; path: string; payload: Record<string, unknown>; day?: string }): Promise<WriteResult> {
  if (frozen) return Promise.resolve({ state: "queued" });
  const scope = currentScope();
  const now = Date.now();
  // The thing's id is its entity, so writes of one thing are sent in order (the chain below) and its older queued ones go
  const item = makeItem({ id: write.entity, date: "", payload: write.payload, method: write.method, path: write.path, kind: write.kind, entity: write.entity, day: write.day }, { updatedAt: now });
  if (!scope) {
    return sendWrite(item).then((sent) => (sent.outcome === "saved" ? { state: "saved" } : { state: sent.outcome === "held" ? "held" : "queued", status: sent.status, message: sent.message }));
  }
  const older = readItems(scope).filter((other) => other.entity === write.entity && !sendingKeys.has(other.key));
  const before = inFlight.get(write.entity) ?? Promise.resolve<WriteResult>({ state: "saved" });
  const committed = putItems(scope, [item]).then(async (result) => {
    if (older.length > 0) await removeItems(scope, older.map(itemKey));
    return result;
  });
  const run = before.then(async (): Promise<WriteResult> => {
    await Promise.all([committed, loadOutbox(scope)]);
    const current = findItem(scope, item.key);
    if (!current) return { state: "saved" };
    const earlier = readItems(scope).filter((other) => other.entity === write.entity && other.key !== item.key && (other.seq ?? 0) < (item.seq ?? 0));
    if (earlier.length > 0) {
      void syncOfflineOutbox();
      return { state: "queued" };
    }
    const { outcome, status, message, final, busy } = await attempt(scope, current);
    if (busy) return { state: "queued" };
    if (outcome === "saved") return { state: "saved" };
    return outcome === "held" ? { state: "held", status, message, final } : { state: "queued", status };
  });
  inFlight.set(write.entity, run);
  void run.finally(() => {
    if (inFlight.get(write.entity) === run) inFlight.delete(write.entity);
  });
  return run;
}


/**
 * Undo of a delete. One that never left the device is taken back (the server never saw it); one that was attempted may
 * have been applied, so the restore is queued behind it.
 */
export async function restoreEntryWrite(id: string, day?: string): Promise<WriteResult> {
  const scope = currentScope();
  const queuedDelete = readItems(scope).find((item) => item.id === id && item.method === "DELETE" && (item.attempts ?? 0) === 0 && !sendingKeys.has(item.key));
  if (scope && queuedDelete) {
    await removeItems(scope, [queuedDelete.key]);
    return { state: "saved" };
  }
  return diaryWrite({ id, date: "", day, method: "POST", path: `/entries/${encodeURIComponent(id)}/restore`, payload: {} });
}

let wired = false;
/** The outbox's storage failures raise the lasting "no room" banner, and its next good write clears it. Once per page. */
function wireAlerts(): void {
  if (wired) return;
  wired = true;
  onStorageFailure((failure) => raiseStorageAlert(failure.kind, failure.error));
  onStorageOk(clearStorageAlert);
}

/**
 * Runs `onChange` when the outbox changes here or in another tab, and `onDiary` when another tab says the server has
 * something new for the diary (a write of its was saved): this tab reads the server's day again. Returns the unsubscribe.
 */
export function watchOutbox(onChange: () => void, onDiary?: () => void): () => void {
  wireAlerts();
  const off = subscribeOutbox(onChange);
  const offTabs = listenForOtherTabs(() => currentScope());
  const offDiary = onTab((message) => {
    if (message.type === "diary" && message.scope === currentScope()?.id) onDiary?.();
  });
  return () => {
    off();
    offTabs();
    offDiary();
  };
}

// A saved write tells the other tabs (at most once in a while), so they read the server's day instead of showing an old one
let lastDiaryPost = 0;
function tellOtherTabs(scope: OutboxScope): void {
  const now = Date.now();
  if (now - lastDiaryPost < 400) return;
  lastDiaryPost = now;
  postTab({ type: "diary", scope: scope.id });
}

/** The diary's list could not be written (no room, storage blocked): the lasting banner goes up. */
export function storageFailed(error: unknown): void {
  raiseStorageAlert(storageErrorKind(error), error);
}

/** A write of the diary's list worked: the banner of a full disk goes down. */
export function storageWorked(): void {
  clearStorageAlert();
}

/**
 * Reads the server's day `day` for the diary's list: null when it did not come (offline, 401 after the session refresh, 5xx:
 * the device keeps what it has) or another account signed in meanwhile; else the function that folds it into the list.
 * What has a write queued, being sent, or started since `startedAt` stays as the device has it.
 */
export async function readServerDay(
  account: string,
  day: string,
  pendingAtStart: ReadonlySet<string>,
  startedAt: number
): Promise<((added: AddedDiaryEntry[]) => AddedDiaryEntry[]) | null> {
  const summary = await apiClient.getDay(day);
  if (!summary || !Array.isArray(summary.meals) || currentAccountId() !== account) return null;
  rememberServerTraining(account, day, summary.training_minutes);
  return (added) => applyServerDay(added, summary, day, getTodayIsoVN(), { keep: new Set([...pendingAtStart, ...pendingWriteIds(), ...writtenSince(startedAt)]), startedAt });
}
