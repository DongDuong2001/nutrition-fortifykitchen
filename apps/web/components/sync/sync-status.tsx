"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { isLiveMode } from "@/lib/api-mode";
import { useOnline, useSyncSummary } from "@/lib/sync-ui";

// What it says, and the list a tap opens, come in their own chunk the first time there is something to say
const SyncDetail = dynamic(() => import("@/components/sync/sync-status-detail"), { ssr: false });

const SAVED_MS = 2000;

/**
 * cc-68 (S13): the one sync status, in the header of every tab (it was Hôm nay's alone, and today's only). From the outbox, for
 * every day and every kind of write: Ngoại tuyến, Đang lưu…, Chưa lưu (n) (it stays until they are sent or dealt with, and a tap
 * opens the list with Thử lại), Đã lưu with a check for 2 s after a save, else nothing. Live mode only.
 */
export function SyncStatus() {
  const { pending, failed, saving } = useSyncSummary();
  const online = useOnline();
  const [justSaved, setJustSaved] = useState(false);
  const [seen, setSeen] = useState(false);
  const wasSaving = useRef(false);
  const unsaved = pending + failed;

  useEffect(() => {
    if (wasSaving.current && !saving && unsaved === 0) {
      setJustSaved(true);
      const timer = setTimeout(() => setJustSaved(false), SAVED_MS);
      wasSaving.current = saving;
      return () => clearTimeout(timer);
    }
    wasSaving.current = saving;
  }, [saving, unsaved]);

  const state = !online ? "offline" : saving ? "saving" : unsaved > 0 ? "unsaved" : justSaved ? "saved" : "idle";
  useEffect(() => {
    if (state !== "idle") setSeen(true);
  }, [state]);

  if (!isLiveMode()) return null;
  return (
    // Always there in live mode (empty when idle): the live region must exist before its text is put in it, and the tour finds it by data-tour
    <div aria-live="polite" className="flex items-center" data-tour="sync-status" data-sync-state={state} data-sync-failed={failed > 0 ? failed : undefined}>
      {seen && <SyncDetail state={state} unsaved={unsaved} failed={failed} />}
    </div>
  );
}
