import type { AddedDiaryEntry } from "./diary-edits";
import { editableFrom } from "./day-rules";

// Earlier days of the entries the user added. The store keeps the entries of today and yesterday as one list; when the date
// moves on (the app was open at midnight, or it was closed overnight) the entries of the days before are filed here by
// date, so the old day shows in the history, the calendar and Tổng quan. Its storage key is in lib/storage-keys.

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
 * comes back. `keepFrom` is the oldest day that stays in the list (cc-68: yesterday is editable, so it stays); the
 * result's `today` then holds those days too.
 */
export function splitByDay(
  entries: AddedDiaryEntry[],
  todayIso: string,
  keepFrom: string = todayIso
): { today: AddedDiaryEntry[]; past: DayArchive } {
  const past: DayArchive = {};
  const today: AddedDiaryEntry[] = [];
  for (const e of entries) {
    const iso = entryIso(e);
    if (iso !== null && iso < keepFrom) (past[iso] ??= []).push(e);
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

// ---- cc-68 Part 2: the list of editable days (today and yesterday) ----
// The diary keeps one list of the entries of the days that can still be edited. These pick one day out of it, put a day
// back, and fold the editable days into the history the screens read for other days.

/**
 * Whether the entry is one of today's. An entry whose day cannot be read, or is after today (a clock that moved back), is
 * today's: nothing is ever dropped (the same rule as splitByDay).
 */
export function isTodays(entry: AddedDiaryEntry, todayIso: string): boolean {
  const iso = entryIso(entry);
  return iso === null || iso >= todayIso;
}

/** The entries of one day of the list. The same list comes back when every entry is that day's (today, nothing earlier). */
export function entriesOnDay(list: AddedDiaryEntry[], iso: string, todayIso: string): AddedDiaryEntry[] {
  if (iso === todayIso) return list.every((e) => isTodays(e, todayIso)) ? list : list.filter((e) => isTodays(e, todayIso));
  return list.filter((e) => entryIso(e) === iso);
}

/** The archive with the editable days' entries on top of it (they are the newest copy of those days). */
export function withEditableDays(archive: DayArchive, list: AddedDiaryEntry[], todayIso: string, pastDays: number): DayArchive {
  if (pastDays <= 0) return archive;
  const out = { ...archive };
  for (let back = 1; back <= pastDays; back++) {
    const iso = editableFrom(todayIso, back);
    const entries = list.filter((e) => entryIso(e) === iso);
    if (entries.length > 0) out[iso] = entries;
    else delete out[iso];
  }
  return out;
}

/**
 * The archive without the days that are editable now, and their entries: they join the list (a day that was filed when it
 * was over becomes editable again after an upgrade, or after the clock moved back).
 */
export function liftEditableDays(archive: DayArchive, todayIso: string, pastDays: number): { archive: DayArchive; lifted: AddedDiaryEntry[] } {
  const from = editableFrom(todayIso, pastDays);
  const rest: DayArchive = {};
  const lifted: AddedDiaryEntry[] = [];
  for (const [iso, entries] of Object.entries(archive)) {
    if (pastDays > 0 && iso >= from && iso < todayIso) lifted.push(...entries.map((e) => ({ ...e, day: e.day ?? iso })));
    else rest[iso] = entries;
  }
  return { archive: lifted.length > 0 ? rest : archive, lifted };
}
