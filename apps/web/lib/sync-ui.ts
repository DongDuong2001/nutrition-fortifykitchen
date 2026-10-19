import { useSyncExternalStore } from "react";

const subscribeOnline = (notify: () => void) => {
  window.addEventListener("online", notify);
  window.addEventListener("offline", notify);
  return () => {
    window.removeEventListener("online", notify);
    window.removeEventListener("offline", notify);
  };
};

/** The browser's own idea of the network (navigator.onLine). True on the server. */
export const useOnline = (): boolean => useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);

/**
 * cc-68 (S13): what the sync status shows on every tab, and what the update toast waits for. The diary provider keeps it up to
 * date from the outbox; anything may read it, inside the provider or not (outside, it stays at zero: nothing is waiting).
 */
export interface SyncSummary {
  /** Writes waiting to be sent (queued or being sent, not refused). */
  pending: number;
  /** Writes the server refused, writes that gave up after many tries, and writes for a day that can no longer be edited. They stay until Thử lại. */
  failed: number;
  /** Of `failed`, refused for good (a day beyond the editable window). */
  final: number;
  /** Of `failed`, parked after many tries. */
  parked: number;
  /** A diary write is being sent now. */
  saving: boolean;
}

const ZERO: SyncSummary = { pending: 0, failed: 0, final: 0, parked: 0, saving: false };
let summary = ZERO;
const listeners = new Set<() => void>();

export const getSyncSummary = (): SyncSummary => summary;

export function setSyncSummary(next: SyncSummary): void {
  const same = (Object.keys(ZERO) as Array<keyof SyncSummary>).every((key) => summary[key] === next[key]);
  if (same) return;
  summary = next;
  for (const fn of [...listeners]) fn();
}

export function subscribeSyncSummary(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export const useSyncSummary = (): SyncSummary => useSyncExternalStore(subscribeSyncSummary, getSyncSummary, () => ZERO);

/** Anything still to send or sending: the update toast does not reload the page then. */
export const isSyncBusy = (s: SyncSummary = summary): boolean => s.pending + s.failed > 0 || s.saving;

// The diary provider says how to send what waits now (Thử lại, without the network having come back): for the update toast
let syncNow: (() => Promise<void>) | null = null;
export function registerSyncNow(fn: (() => Promise<void>) | null): void {
  syncNow = fn;
}
export const requestSyncNow = (): Promise<void> => (syncNow ? syncNow() : Promise.resolve());
