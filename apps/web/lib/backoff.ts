/**
 * cc-68 (S10): a write that fails without being refused is sent again later, not at once and not for ever. Each failure waits
 * longer (2 s, 4 s, 8 s ... up to 5 min) with jitter (so devices that went offline together do not all come back at the same
 * second), a server that says how long to wait (Retry-After on a 429 or a 503) is obeyed, and after MAX_ATTEMPTS failures the
 * write is parked: it stays in the outbox, counted as failed, until the person taps Thử lại.
 */
export const BACKOFF_BASE_MS = 2000;
export const BACKOFF_CAP_MS = 5 * 60 * 1000;
export const MAX_ATTEMPTS = 8;

/** How long to wait after the `failures`th failure (1 = the first): 2 s doubling to the cap, then between half and all of it. */
export function backoffMs(failures: number, random: () => number = Math.random): number {
  const step = Math.min(BACKOFF_CAP_MS, BACKOFF_BASE_MS * 2 ** Math.max(0, failures - 1));
  return Math.round(step * (0.5 + random() * 0.5));
}

/** What a Retry-After header asks for, in ms: whole seconds or an HTTP date. Null when absent or unreadable. */
export function retryAfterMs(header: string | null | undefined, now: number): number | null {
  if (!header) return null;
  const seconds = Number(header);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.min(seconds * 1000, 60 * 60 * 1000);
  const date = Date.parse(header);
  return Number.isNaN(date) ? null : Math.min(Math.max(0, date - now), 60 * 60 * 1000);
}

/** What a failed attempt leaves on the item: one more failure, when it may go again, and whether it is parked. */
export function afterFailure(
  retries: number | undefined,
  now: number,
  retryAfter: string | null | undefined,
  random: () => number = Math.random
): { retries: number; nextAttemptAt?: number; parked?: boolean } {
  const failures = (retries ?? 0) + 1;
  if (failures >= MAX_ATTEMPTS) return { retries: failures, parked: true };
  const wait = Math.max(backoffMs(failures, random), retryAfterMs(retryAfter, now) ?? 0);
  return { retries: failures, nextAttemptAt: now + wait };
}
