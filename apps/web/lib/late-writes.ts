import type { OutboxItem } from "./outbox";

/**
 * Hotfix 20/10: a write is judged by WHEN THE USER MADE IT, not when it reached the server. Every diary write carries
 * `made_at`, the item's own createdAt (never the time of a retry), and the API accepts it for up to 14 days.
 */
export const MADE_AT_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;

/** A time before this is a missing one (an old item with no time, or one stored some other way). */
const PLAUSIBLE_AFTER = Date.UTC(2020, 0, 1);

const plausible = (t: unknown): t is number => typeof t === "number" && Number.isFinite(t) && t > PLAUSIBLE_AFTER;

/** The days before the day a write was made that the server still lets it change (today and yesterday): apps/api EditablePastDays. */
export const EDITABLE_PAST_DAYS_SERVER = 1;

/** The item says itself when it was made (madeAt or a plausible createdAt). */
export const hasOwnTime = (item: Pick<OutboxItem, "createdAt" | "madeAt">): boolean => plausible(item.madeAt) || plausible(item.createdAt);

/** The Ho Chi Minh day (YYYY-MM-DD) of a time. */
const hcmDay = (t: number): string => new Date(t + 7 * 3_600_000).toISOString().slice(0, 10);

/**
 * An add whose made time is later than its day allows: it can only be an entry made earlier and queued again (before 20/10 a past
 * day could not be edited), and the server would refuse it.
 */
export function madeTooLate(item: OutboxItem, now: number): boolean {
  if (!isDiaryAdd(item)) return false;
  const t = madeAtMs(item, now);
  if (t === null) return false;
  const late = (Date.parse(`${hcmDay(t)}T00:00:00Z`) - Date.parse(`${item.date}T00:00:00Z`)) / 86_400_000;
  return late > EDITABLE_PAST_DAYS_SERVER;
}

/** The fields that say when a write was made. */
export type MadeAtFields = Pick<OutboxItem, "createdAt"> & Partial<Pick<OutboxItem, "madeAt" | "date" | "day">>;

/**
 * Day D at 23:00 Asia/Ho_Chi_Minh (ms), or null for something that is not a YYYY-MM-DD day. Before 20/10 a day could not be
 * edited once it was over, so a write for D was made by then (or the next day, which the server accepts as well).
 */
export function dayEndOf(day: string | undefined): number | null {
  if (!day || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const t = Date.parse(`${day}T23:00:00+07:00`);
  return Number.isNaN(t) ? null : t;
}

/** When an entry of the local diary was made: its own addedAt, else the end of its day; never later than now. */
export function entryMadeAt(addedAt: string | undefined, day: string, now: number): number | null {
  const added = addedAt ? Date.parse(addedAt) : NaN;
  const t = plausible(added) ? added : dayEndOf(day);
  return t === null ? null : Math.min(t, now);
}

/**
 * When the user made the write (ms), or null when nothing says. In order: `madeAt` (the diary entry's own time, for a write
 * made from the local diary), a plausible createdAt, then the end of the write's day at 23:00 Ho Chi Minh time. Never later
 * than now. The 14-day cap is the server's: tooOldForServer judges by this same time.
 */
export function madeAtMs(item: MadeAtFields, now: number): number | null {
  const t = plausible(item.madeAt) ? item.madeAt : plausible(item.createdAt) ? item.createdAt : dayEndOf(item.date || item.day);
  return t === null ? null : Math.min(t, now);
}

/** The diary API's own paths: only these take made_at (profile, weight and favourites are other endpoints). */
export const takesMadeAt = (path: string): boolean => /^\/(days|entries)\//.test(path);

/** When the user made the write, as RFC 3339, or null when the item does not say. */
export function madeAtOf(item: MadeAtFields, now = Date.now()): string | null {
  const t = madeAtMs(item, now);
  return t === null ? null : new Date(t).toISOString();
}

/** The request for a write: the body gets made_at; a DELETE has no body, so it goes in the query. */
export function stamp(item: MadeAtFields, method: string, path: string, payload: Record<string, unknown>): { path: string; body: string | undefined } {
  const madeAt = takesMadeAt(path) ? madeAtOf(item) : null;
  if (method === "DELETE") return { path: madeAt ? `${path}${path.includes("?") ? "&" : "?"}made_at=${encodeURIComponent(madeAt)}` : path, body: undefined };
  return { path, body: JSON.stringify(madeAt ? { ...payload, made_at: madeAt } : payload) };
}

/** Older than the server accepts: sending it again can never work. */
export const tooOldForServer = (item: MadeAtFields, now: number): boolean => now - (madeAtMs(item, now) ?? item.createdAt) > MADE_AT_MAX_AGE_MS;

/** "17/10" from a YYYY-MM-DD day. */
export const dayLabel = (iso: string): string => (iso.length >= 10 ? iso.slice(5, 10).split("-").reverse().join("/") : "");

/** What the person is told about why an item still waits. Plain words, no codes. */
export const REASONS = {
  network: "Đang chờ mạng",
  sending: "Đang gửi",
  waiting: "Đang chờ gửi",
  locked: "Máy chủ từ chối: ngày đã khóa",
  session: "Phiên đăng nhập hết hạn",
  server: "Lỗi máy chủ, thử lại sau",
} as const;

export function reasonOf(item: OutboxItem, context: { online: boolean; now: number }): string {
  const held = item.held;
  if (held) {
    if (held.final || held.code === "PAST_DAY_READ_ONLY" || tooOldForServer(item, context.now)) return REASONS.locked;
    if (held.status === 401) return REASONS.session;
    return `Máy chủ từ chối (lỗi ${held.status})`;
  }
  if (item.state === "sending" && context.online) return REASONS.sending;
  if (!context.online || item.lastStatus === 0) return REASONS.network;
  if (item.lastStatus === 401) return REASONS.session;
  if (item.lastStatus !== undefined) return REASONS.server;
  if (item.parked) return REASONS.server;
  return REASONS.waiting;
}

/**
 * The server refuses it for good: older than the 14 days it accepts, or another 4xx that came back after a retry.
 * Only these offer "Chuyển sang hôm nay" and "Bỏ món này".
 */
export function refusedForGoodItem(item: OutboxItem, now: number): boolean {
  if (!item.held) return false;
  return item.held.final === true || tooOldForServer(item, now) || (item.attempts ?? 0) >= 2;
}

/** An add of a diary entry (POST /days/{date}/entries): the one kind of write that can be re-logged on today. */
export const isDiaryAdd = (item: Pick<OutboxItem, "kind" | "method" | "path" | "date">): boolean =>
  (item.kind ?? "diary") === "diary" && (item.method ?? "POST") === "POST" && (item.path ?? `/days/${item.date}/entries`) === `/days/${item.date}/entries` && item.date !== "";

/** What a run of Thử lại did, for the toast: how many writes left the list, how many are still in it. */
export interface RetryOutcome {
  saved: number;
  left: number;
}

export function retryMessage({ saved, left }: RetryOutcome): string {
  if (left === 0) return saved > 0 ? `Đã lưu ${saved} món` : "Đã lưu hết";
  if (saved > 0) return `Đã lưu ${saved} món, còn ${left} món chưa lưu được. Xem lý do`;
  return `Còn ${left} món chưa lưu được, xem lý do`;
}

/** One line for several items: their distinct reasons, the commonest first ("Đang chờ mạng; Lỗi máy chủ, thử lại sau"). */
export function reasonSummary(items: readonly OutboxItem[], context: { online: boolean; now: number }): string {
  const counts = new Map<string, number>();
  for (const item of items) {
    const reason = reasonOf(item, context);
    counts.set(reason, (counts.get(reason) ?? 0) + 1);
  }
  return [...counts].sort((a, b) => b[1] - a[1]).slice(0, 2).map(([reason]) => reason.charAt(0).toLowerCase() + reason.slice(1)).join("; ");
}
