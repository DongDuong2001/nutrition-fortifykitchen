import type { AddedDiaryEntry } from "./diary-edits";

/**
 * Earlier days of the entries the user added. The store keeps today's entries as one list; when the date moves on
 * (the app was open at midnight, or it was closed overnight) the entries of the days before are filed here by
 * date, so the new day starts empty and the old day shows in the history, the calendar and Tổng quan.
 */
export const DAY_ARCHIVE_KEY = "h1t_day_archive_v1";

export type DayArchive = Record<string, AddedDiaryEntry[]>;

const vnDate = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Asia/Ho_Chi_Minh",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** The diary day (YYYY-MM-DD) of an entry: its own `day`, else the Ho Chi Minh date it was added on; null when neither can be read. */
export function entryIso(entry: Pick<AddedDiaryEntry, "addedAt" | "day">): string | null {
  if (entry.day && /^\d{4}-\d{2}-\d{2}$/.test(entry.day)) return entry.day;
  const t = new Date(entry.addedAt);
  return Number.isNaN(t.getTime()) ? null : vnDate.format(t);
}

/**
 * Today's entries and the earlier days' entries by date. An entry with an unreadable time, or a time after
 * today (a clock that moved back), stays in today: nothing is ever dropped. When nothing moves, the same list
 * comes back.
 */
export function splitByDay(
  entries: AddedDiaryEntry[],
  todayIso: string
): { today: AddedDiaryEntry[]; past: DayArchive } {
  const past: DayArchive = {};
  const today: AddedDiaryEntry[] = [];
  for (const e of entries) {
    const iso = entryIso(e);
    if (iso !== null && iso < todayIso) (past[iso] ??= []).push(e);
    else today.push(e);
  }
  return Object.keys(past).length === 0 ? { today: entries, past } : { today, past };
}

/** Adds `extra` to `base` per day. An entry id already in the day is not added twice. */
export function mergeArchive(base: DayArchive, extra: DayArchive): DayArchive {
  const out: DayArchive = { ...base };
  for (const [iso, list] of Object.entries(extra)) {
    const have = out[iso] ?? [];
    const ids = new Set(have.map((e) => e.id));
    out[iso] = [...have, ...list.filter((e) => !ids.has(e.id))];
  }
  return out;
}

/** The stored archive. Anything unreadable is empty; only YYYY-MM-DD keys with a list are kept. */
export function parseArchive(raw: string | null): DayArchive {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: DayArchive = {};
    for (const [iso, list] of Object.entries(parsed as Record<string, unknown>)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(iso) || !Array.isArray(list)) continue;
      const ok = (list as AddedDiaryEntry[]).filter((e) => typeof e?.id === "string" && typeof e?.addedAt === "string");
      if (ok.length > 0) out[iso] = ok;
    }
    return out;
  } catch {
    return {};
  }
}

const DAY_MS = 24 * 60 * 60 * 1000;
// Ho Chi Minh is UTC+7 all year, so its midnight is 17:00 UTC
const OFFSET_MS = 7 * 60 * 60 * 1000;

/** Milliseconds until the next midnight in Ho Chi Minh. Never 0: at midnight sharp it is a whole day. */
export function msUntilNextDay(now: Date): number {
  const local = now.getTime() + OFFSET_MS;
  return DAY_MS - (((local % DAY_MS) + DAY_MS) % DAY_MS);
}
