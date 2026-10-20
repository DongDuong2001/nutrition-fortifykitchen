import type { OutboxItem } from "./outbox";

/**
 * Hotfix 20/10: a write is judged by WHEN THE USER MADE IT, not when it reached the server. Every diary write carries
 * `made_at`, the item's own createdAt (never the time of a retry), and the API accepts it for up to 14 days.
 */
export const MADE_AT_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;

/** A createdAt before this is a missing one (an old item with no time): no made_at is sent for it. */
const PLAUSIBLE_AFTER = Date.UTC(2020, 0, 1);

/** The diary API's own paths: only these take made_at (profile, weight and favourites are other endpoints). */
export const takesMadeAt = (path: string): boolean => /^\/(days|entries)\//.test(path);

/** When the user made the write, as RFC 3339, or null when the item does not say. */
export function madeAtOf(item: Pick<OutboxItem, "createdAt">): string | null {
  return item.createdAt > PLAUSIBLE_AFTER ? new Date(item.createdAt).toISOString() : null;
}

/** The request for a write: the body gets made_at; a DELETE has no body, so it goes in the query. */
export function stamp(item: Pick<OutboxItem, "createdAt">, method: string, path: string, payload: Record<string, unknown>): { path: string; body: string | undefined } {
  const madeAt = takesMadeAt(path) ? madeAtOf(item) : null;
  if (method === "DELETE") return { path: madeAt ? `${path}${path.includes("?") ? "&" : "?"}made_at=${encodeURIComponent(madeAt)}` : path, body: undefined };
  return { path, body: JSON.stringify(madeAt ? { ...payload, made_at: madeAt } : payload) };
}

/** Older than the server accepts: sending it again can never work. */
export const tooOldForServer = (item: Pick<OutboxItem, "createdAt">, now: number): boolean => now - item.createdAt > MADE_AT_MAX_AGE_MS;

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
