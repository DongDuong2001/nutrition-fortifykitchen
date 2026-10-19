import { useSyncExternalStore } from "react";
import { reportClientError } from "./client-errors";

/**
 * cc-68: problems that stay on screen until they are fixed, not a 6 s toast: the device has no room to keep a write
 * (S3), the session ran out and a write cannot be sent (S10). The banner (components/sync/sync-alerts) shows them on
 * every tab; this module is just their state.
 */
export interface SyncAlerts {
  /** The device could not keep a write (quota, storage blocked): the entry just added is not safe. */
  storage: "quota" | "blocked" | "other" | null;
  /** A write got 401 again after the session was renewed: signing in again is the way out. */
  sessionExpired: boolean;
}

/** Shown, lasting, when a write could not be kept on the device. */
export const STORAGE_FULL_MESSAGE = "Máy hết chỗ lưu, mục vừa ghi chưa được lưu";
export const SESSION_EXPIRED_MESSAGE = "Phiên đăng nhập hết hạn";

let alerts: SyncAlerts = { storage: null, sessionExpired: false };
const listeners = new Set<() => void>();

function set(next: SyncAlerts): void {
  if (next.storage === alerts.storage && next.sessionExpired === alerts.sessionExpired) return;
  alerts = next;
  for (const fn of [...listeners]) fn();
}

export const getSyncAlerts = (): SyncAlerts => alerts;

export function subscribeSyncAlerts(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** A write could not be kept: the banner stays until a later write is kept again. Reported once to /client-errors. */
export function raiseStorageAlert(kind: "quota" | "blocked" | "other", error?: unknown): void {
  set({ ...alerts, storage: kind });
  reportClientError({ kind: "storage", message: `${kind}${error instanceof Error ? `: ${error.name}` : ""}` });
}

export function clearStorageAlert(): void {
  set({ ...alerts, storage: null });
}

export function raiseSessionExpired(): void {
  set({ ...alerts, sessionExpired: true });
}

export function clearSessionExpired(): void {
  set({ ...alerts, sessionExpired: false });
}

/** For tests. */
export function resetSyncAlerts(): void {
  alerts = { storage: null, sessionExpired: false };
  listeners.clear();
}

export function useSyncAlerts(): SyncAlerts {
  return useSyncExternalStore(subscribeSyncAlerts, getSyncAlerts, getSyncAlerts);
}
