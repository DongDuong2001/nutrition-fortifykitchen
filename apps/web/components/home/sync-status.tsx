"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { isLiveMode } from "@/lib/api-mode";
import { useDiary } from "@/lib/diary-store";

const SAVED_MS = 2000;

const subscribeOnline = (notify: () => void) => {
  window.addEventListener("online", notify);
  window.addEventListener("offline", notify);
  return () => {
    window.removeEventListener("online", notify);
    window.removeEventListener("offline", notify);
  };
};

/**
 * cc-51: the sync state of today in the Hôm nay header, from cc-49's outbox and writes (no other source): Ngoại tuyến,
 * Đang lưu…, Chưa lưu (n) (tap to send again), Đã lưu with a check for 2 s after a save, else nothing. Live mode only.
 */
export function SyncStatus() {
  const { unsavedIds, saving, retryUnsaved, demo } = useDiary();
  const online = useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);
  const [justSaved, setJustSaved] = useState(false);
  const wasSaving = useRef(false);
  const unsaved = unsavedIds.size;

  useEffect(() => {
    if (wasSaving.current && !saving && unsaved === 0) {
      setJustSaved(true);
      const timer = setTimeout(() => setJustSaved(false), SAVED_MS);
      wasSaving.current = saving;
      return () => clearTimeout(timer);
    }
    wasSaving.current = saving;
  }, [saving, unsaved]);

  if (!isLiveMode() || demo) return null;
  const text = "text-xs font-semibold leading-none text-muted-on-dark lg:text-secondary";
  return (
    <div aria-live="polite" className="flex items-center" data-sync-state={!online ? "offline" : saving ? "saving" : unsaved > 0 ? "unsaved" : justSaved ? "saved" : "idle"}>
      {!online ? (
        <span className={text}>Ngoại tuyến</span>
      ) : saving ? (
        <span className={text}>Đang lưu…</span>
      ) : unsaved > 0 ? (
        <button
          type="button"
          onClick={retryUnsaved}
          className="min-h-11 cursor-pointer rounded-full border-0 bg-transparent px-2 text-xs font-bold leading-none text-sky lg:text-blue"
        >
          Chưa lưu ({unsaved})
        </button>
      ) : justSaved ? (
        <span className={`${text} inline-flex items-center gap-1`}>
          <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
            <path d="M3 8.5 6.5 12 13 4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Đã lưu
        </span>
      ) : null}
    </div>
  );
}
