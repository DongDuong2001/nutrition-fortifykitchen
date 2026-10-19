/**
 * The training minutes of one day (0 is a rest day), for Ngày tập, Hôm nay's pill and the day's salt and carb targets.
 * In order: what was chosen for that day on Ngày tập (lib/training-checklist), else what the server has for that day,
 * else the Hồ sơ default. Changing the default never changes a day that has its own minutes, whether they were set on
 * this device or on another one (GET /days/{date} answers `training_minutes` null for a day with none set).
 */

import { readDay, type KeyValueStorage } from "./training-checklist";
import { accountStorage } from "./storage-keys";
import { currentAccountId } from "./auth-actions";

/**
 * The minutes the server holds for a day of an account, only for a day that has its own. GET /days/{date} answers
 * `training_minutes: null` when none were set for that day and a number when they were (apps/api diary model,
 * TrainingMinutes *int), so a number is always the day's own, even when it equals the Hồ sơ default.
 */
const serverMinutes = new Map<string, number>();

let version = 0;
const listeners = new Set<() => void>();

export function subscribeTraining(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Bumped whenever a day's minutes may have changed, so screens showing them read again. */
export function trainingVersion(): number {
  return version;
}

export function trainingChanged(): void {
  version += 1;
  listeners.forEach((l) => l());
}

/**
 * The server's minutes for one day of one account, as read from GET /days/{date}. A finite number of 0 or more is the
 * day's own minutes (kept, a value equal to the Hồ sơ default included, so a later change of the default leaves the
 * day alone). null, undefined or anything else means none were set: any earlier value is dropped.
 */
export function rememberServerTraining(account: string, dateIso: string, minutes: unknown): void {
  const key = `${account}|${dateIso}`;
  const before = serverMinutes.get(key);
  if (typeof minutes === "number" && Number.isFinite(minutes) && minutes >= 0) {
    serverMinutes.set(key, minutes);
  } else {
    serverMinutes.delete(key);
  }
  if (serverMinutes.get(key) !== before) trainingChanged();
}

export function trainingMinutesFor(
  dateIso: string,
  profile: { trainingMinutesDefault: number },
  options: { account?: string | null; storage?: KeyValueStorage | null } = {}
): number {
  const saved = readDay(dateIso, options.storage === undefined ? accountStorage() : options.storage);
  if (saved) return saved.minutes;
  const account = options.account === undefined ? currentAccountId() : options.account;
  const server = account ? serverMinutes.get(`${account}|${dateIso}`) : undefined;
  return server ?? profile.trainingMinutesDefault;
}
