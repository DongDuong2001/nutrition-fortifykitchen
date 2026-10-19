import type { SyncResult } from "./api-client";
import { isUuid } from "./uuid";

/** The "unsaved" toast: fixed words and the status, so a refused save is never silent. The server's own text is never shown. */
export function unsavedMessage(status?: number): string {
  return status ? `Chưa lưu được món (lỗi ${status})` : "Chưa lưu được món";
}

/** A write to a day that has passed (409 PAST_DAY_READ_ONLY): it can never be saved; the entry stays on this device. */
export function pastDayMessage(date: string): string {
  const [, month, day] = date.split("-");
  return `Món ngày ${day}/${month} chưa lưu lên máy chủ vì ngày đã qua; món vẫn còn trên máy này.`;
}

/**
 * What the user is told after a sync (review 05:30 M1): a write refused for good gets one notice with its day and no
 * Thử lại (it is never sent again, so this shows once); other refused writes get one "unsaved" toast with Thử lại, at
 * most once per app open (`unsavedShown`), whatever their number.
 */
export function syncNotice(held: SyncResult["held"], unsavedShown: boolean): { kind: "notice" | "unsaved"; message: string } | null {
  const final = held.find((h) => h.final);
  if (final) return { kind: "notice", message: pastDayMessage(final.date) };
  if (held.length > 0 && !unsavedShown) return { kind: "unsaved", message: unsavedMessage(held[0].status) };
  return null;
}

/** An entry whose food has no server row (a recipe made in the app): live mode keeps it on this device only. */
export function isLocalOnly(entry: { kind?: string; foodId: string }): boolean {
  return entry.kind !== "quick" && !isUuid(entry.foodId);
}
