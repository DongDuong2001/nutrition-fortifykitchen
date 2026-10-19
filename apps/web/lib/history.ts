import { apiClient, apiFetch, diaryTimeout, type DaySummaryResponse } from "./api-client";
import { currentAccountId } from "./auth-actions";
import { getTodayIsoVN } from "./date";
import { editableFrom, isEditableDay } from "./day-rules";
import { shiftIsoDate } from "./day-history";
import { DAY_CACHE_DAYS, pruneDayRecords, readDayRecords, recordEntries, slimEntry, writeDayRecords, type DayRecord } from "./day-cache";
import type { DayArchive } from "./day-archive";
import type { AddedDiaryEntry } from "./diary-edits";
import { DAY_ARCHIVE_KEY, browserLocal } from "./storage-keys";
import { entriesFromDaySummary } from "./server-day";
import { isLocalOnly } from "./sync-notice";
import { isUuid } from "./uuid";

/**
 * cc-68 (S5): the diary of the days before the editable ones is read from the server (GET /days/{date}) and kept on this
 * device as a cache (lib/day-cache), so every device shows the same history. A day beyond the editable window cannot change
 * any more, so it is read once. Offline, the cache answers; a day with nothing cached and no network is simply empty until
 * the next read.
 */

export interface HistoryOptions {
  /** Read the server for days not cached (false: the cache alone answers, instantly, offline too). */
  fetch: boolean;
  /** Today, YYYY-MM-DD: which days can no longer change. */
  today: string;
  /** How many days are read at once from the server. */
  workers?: number;
}

export interface HistoryResult {
  /** The days that have entries, by date. */
  days: DayArchive;
  /** Days the server was asked for and did not answer: ask again later. */
  failed: string[];
}

// Whether GET /days?from=&to= answers ({ days: [...] }, every day of the range, at most 100 days apart): learned once per page life
let rangeSupported: boolean | null = null;

/** For tests. */
export function resetHistoryMemory(): void {
  rangeSupported = null;
}

/** The days of `from..to` the server answers for in one request, or null when it has no such request. */
async function fetchRange(from: string, to: string): Promise<Map<string, DaySummaryResponse> | null> {
  if (rangeSupported === false) return null;
  try {
    const res = await apiFetch(`/days?from=${from}&to=${to}`, { signal: diaryTimeout() });
    if (res.status === 404 || res.status === 405 || res.status === 501) {
      rangeSupported = false;
      return null;
    }
    if (!res.ok) return null;
    const json = await res.json();
    const payload = json.data ?? json;
    const list: unknown = Array.isArray(payload) ? payload : payload?.days ?? payload?.items;
    if (!Array.isArray(list)) {
      rangeSupported = false;
      return null;
    }
    rangeSupported = true;
    const out = new Map<string, DaySummaryResponse>();
    for (const day of list as DaySummaryResponse[]) if (day && typeof day.date === "string" && Array.isArray(day.meals)) out.set(day.date, day);
    return out;
  } catch {
    return null;
  }
}

const RANGE_WINDOW_DAYS = 90;

/** Sorted dates grouped into [from, to] windows no more than 90 days wide. */
export function rangeWindows(sorted: readonly string[]): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  for (const date of sorted) {
    const last = out[out.length - 1];
    if (last && shiftIsoDate(last[0], RANGE_WINDOW_DAYS) >= date) last[1] = date;
    else out.push([date, date]);
  }
  return out;
}

/** Runs `work` for each item, `workers` at a time. */
async function pool<T>(items: readonly T[], workers: number, work: (item: T) => Promise<void>): Promise<void> {
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(workers, items.length) }, async () => {
      while (next < items.length) await work(items[next++]);
    })
  );
}

/**
 * The days `dates` (all of them before the editable window): from the cache, and from the server for the ones it lacks (or
 * has only as they were while they could still change). What is read is cached. Entries of those days that the server never
 * confirmed stay in them.
 */
export async function loadHistory(scope: string, dates: readonly string[], options: HistoryOptions): Promise<HistoryResult> {
  const workers = options.workers ?? 3;
  const cached = await readDayRecords(scope, dates);
  const need = options.fetch ? dates.filter((d) => !cached.get(d) || (!cached.get(d)!.final && !isEditableDay(d, options.today))) : [];
  const failed: string[] = [];
  const fresh: DayRecord[] = [];
  const summaries = new Map<string, DaySummaryResponse>();
  if (need.length >= 3) {
    // The server answers a range of up to 100 days: the needed days go in windows of at most 90 days
    for (const [from, to] of rangeWindows([...need].sort())) {
      const range = await fetchRange(from, to);
      if (!range) break;
      for (const d of need) if (d >= from && d <= to && range.has(d)) summaries.set(d, range.get(d)!);
    }
  }
  await pool(need.filter((d) => !summaries.has(d)), workers, async (date) => {
    const day = await apiClient.getDay(date);
    if (day && Array.isArray(day.meals)) summaries.set(date, day);
    else failed.push(date);
  });
  for (const [date, summary] of summaries) {
    const server = entriesFromDaySummary(summary, date);
    const onServer = new Set(server.map((e) => e.id));
    // Entries of this day the server does not list stay while it never confirmed them
    const unsynced = (cached.get(date)?.unsynced ?? []).filter((e) => !onServer.has(e.id));
    const record: DayRecord = { scope, date, at: Date.now(), final: !isEditableDay(date, options.today), entries: server.map(slimEntry), ...(unsynced.length > 0 ? { unsynced } : {}) };
    fresh.push(record);
    cached.set(date, record);
  }
  if (fresh.length > 0) {
    await writeDayRecords(fresh);
    void pruneDayRecords(scope, DAY_CACHE_DAYS);
  }
  const days: DayArchive = {};
  for (const date of dates) {
    const record = cached.get(date);
    if (!record) continue;
    const entries = recordEntries(record);
    if (entries.length > 0) days[date] = entries;
  }
  return { days, failed };
}

/**
 * Keeps days that left the editable list (the date moved on) in the cache. They are as the device had them, not yet read
 * back from the server (final: false), so the next read makes them the server's.
 */
export async function saveHistoryDays(scope: string, days: DayArchive): Promise<AddedDiaryEntry[]> {
  await writeDayRecords(toRecords(scope, days));
  return sendable(Object.values(days).flat());
}

const toRecords = (scope: string, days: DayArchive): DayRecord[] =>
  Object.entries(days).map(([date, entries]) => {
    const unsynced = entries.filter((e) => !e.synced);
    return { scope, date, at: 0, final: false, entries: entries.map(slimEntry), ...(unsynced.length > 0 ? { unsynced } : {}) };
  });

/** Entries the server never confirmed that can still be sent (a food it has a row for): the caller sends them again. */
const sendable = (entries: readonly AddedDiaryEntry[]): AddedDiaryEntry[] => entries.filter((e) => !e.synced && isUuid(e.id) && !isLocalOnly(e));

/**
 * The old localStorage archive of the account goes into the cache without loss: every day is kept (not yet read from the
 * server: final false), and entries the server never confirmed stay whole as `unsynced`. The key is removed only once the
 * records are on disk. Returns the entries that still need to be sent (no outbox item may exist yet): the caller queues them.
 */
export async function migrateLegacyArchive(scope: string, archive: DayArchive): Promise<AddedDiaryEntry[]> {
  const days = Object.keys(archive).filter((d) => archive[d]?.length > 0);
  if (days.length === 0) {
    try {
      browserLocal()?.removeItem(`${DAY_ARCHIVE_KEY}_${scope}`);
    } catch {
      // Storage blocked
    }
    return [];
  }
  // Records that exist already (from the server) win: only days not in the cache are filled
  const existing = await readDayRecords(scope, days);
  const missing: DayArchive = {};
  for (const d of days) if (!existing.has(d)) missing[d] = archive[d];
  const ok = Object.keys(missing).length === 0 || (await writeDayRecords(toRecords(scope, missing)));
  if (!ok) return [];
  try {
    browserLocal()?.removeItem(`${DAY_ARCHIVE_KEY}_${scope}`);
  } catch {
    // The key stays; the next load finds the same days already in the cache
  }
  return sendable(Object.values(missing).flat());
}

/** How many closed days are read in the background after load (the calendar month, Tổng quan 30 days, the add shortlists). */
export const HISTORY_PREFETCH_DAYS = 35;

/** The closed days to prefetch: the HISTORY_PREFETCH_DAYS before the editable ones, newest first. */
export const historyDates = (today: string, pastDays: number): string[] => Array.from({ length: HISTORY_PREFETCH_DAYS }, (_, i) => editableFrom(today, pastDays + 1 + i));

/**
 * On load: the old localStorage archive goes into the cache, then the cache answers for the prefetch days at once (no network).
 * `unsent` are the entries the server never confirmed: the caller sends them again.
 */
export async function initHistory(scope: string, archive: DayArchive, today: string, pastDays: number): Promise<{ days: DayArchive; unsent: AddedDiaryEntry[] }> {
  const unsent = await migrateLegacyArchive(scope, archive);
  const { days } = await loadHistory(scope, historyDates(today, pastDays), { fetch: false, today });
  return { days, unsent };
}

/**
 * A screen (or the prefetch, `isos` null) asks for closed days: the ones not asked for before are read (cache first, then the
 * server) and handed to `apply`. `requested` remembers what was asked, so nothing is asked twice; a day the server did not
 * answer is forgotten, to be asked again when a screen needs it.
 */
export async function requestDays(
  account: string,
  isos: readonly string[] | null,
  pastDays: number,
  requested: Set<string>,
  apply: (days: DayArchive) => void
): Promise<void> {
  const today = getTodayIsoVN();
  const closedBefore = editableFrom(today, pastDays);
  const need = (isos ?? historyDates(today, pastDays)).filter((iso) => iso < closedBefore && !requested.has(iso));
  if (need.length === 0) return;
  need.forEach((iso) => requested.add(iso));
  const { days, failed } = await loadHistory(account, need, { fetch: typeof navigator === "undefined" || navigator.onLine !== false, today });
  failed.forEach((iso) => requested.delete(iso));
  if (currentAccountId() === account && Object.keys(days).length > 0) apply(days);
}
