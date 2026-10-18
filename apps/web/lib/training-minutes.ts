/**
 * The training minutes of one day (0 is a rest day), for Ngày tập, Hôm nay's pill and the day's salt and carb targets.
 * In order: what was chosen for that day on Ngày tập (lib/training-checklist), else what the server has for that day,
 * else the Hồ sơ default. Changing the default never changes a day that has its own minutes.
 */

import { readDay, type KeyValueStorage } from "./training-checklist";
import { accountStorage } from "./storage-keys";
import { currentAccountId } from "./auth-actions";

/**
 * GET /days/{date} answers the day's minutes, or the server's profile default when none was set for it (it does not
 * say which: OPEN_QUESTIONS). A value other than the device's default when it answered was set for that day
 * (on another device); one equal to it is taken as the default, so a later change in Hồ sơ still applies.
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

/** The server's minutes for one day of one account, as read from GET /days/{date}. */
export function rememberServerTraining(account: string, dateIso: string, minutes: unknown, profileDefault: number): void {
  const key = `${account}|${dateIso}`;
  const before = serverMinutes.get(key);
  if (typeof minutes === "number" && Number.isFinite(minutes) && minutes >= 0 && minutes !== profileDefault) {
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
