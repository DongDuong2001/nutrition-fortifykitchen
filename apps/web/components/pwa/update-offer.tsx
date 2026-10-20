"use client";

import React, { useEffect, useState } from "react";
import { Presence } from "@/components/ui/presence";
import { Toast } from "@/components/ui/toast";
import { useDocumentHidden } from "@/hooks/use-document-hidden";
import { whenIdle } from "@/lib/idle";
import { canApplyUpdate, updatePhase, updateToastVisible, UPDATE_TOAST_MS } from "@/lib/update-phase";
import { setUpdateBar } from "@/lib/update-bar";
import { isSyncBusy, requestSyncNow, useSyncSummary } from "@/lib/sync-ui";

/**
 * The "Có bản mới" toast. It comes when the page is idle, sits right above the bottom nav (the screens leave room for it, so it
 * never covers a list row) and goes after UPDATE_TOAST_MS. A tap on Tải lại applies the update; without one it is applied when the
 * app goes to the background or by the next cold open. The new worker takes over (and the page reloads) only once nothing waits
 * to be sent and nothing is being sent (cc-68). Its own chunk: it is needed only when an update is waiting.
 */
export default function UpdateOffer({ worker, onApply }: { worker: ServiceWorker; onApply: () => void }) {
  const [tapped, setTapped] = useState(false);
  const [expired, setExpired] = useState(false);
  const [armed, setArmed] = useState(false);
  const inBackground = useDocumentHidden();
  const summary = useSyncSummary();
  const busy = isSyncBusy(summary);

  // It shows once the page is idle, not in the middle of a scroll or a tap, and then for UPDATE_TOAST_MS
  useEffect(() => whenIdle(() => setArmed(true), 4000), []);
  useEffect(() => {
    if (!armed || tapped) return;
    const timer = window.setTimeout(() => setExpired(true), UPDATE_TOAST_MS);
    return () => window.clearTimeout(timer);
  }, [armed, tapped]);

  useEffect(() => {
    if (!canApplyUpdate({ tapped, inBackground, busy })) return;
    onApply();
    worker.postMessage({ type: "SKIP_WAITING" });
  }, [worker, tapped, inBackground, busy, onApply]);

  const visible = armed && updateToastVisible({ tapped, expired });
  useEffect(() => {
    setUpdateBar(visible);
    return () => setUpdateBar(false);
  }, [visible]);

  const phase = updatePhase({ tapped, busy, saving: summary.saving, offline: typeof navigator !== "undefined" && !navigator.onLine, failed: summary.failed });
  const reload = () => {
    setTapped(true);
    // Writes that wait are sent now; the page reloads when they are gone
    if (busy) void requestSyncNow();
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(72px+env(safe-area-inset-bottom))] z-sheet px-3 pb-2 lg:inset-x-auto lg:bottom-24 lg:right-8 lg:w-[400px] lg:pb-0">
      <Presence>
        {visible && (
          <div className="pointer-events-auto">
            <Toast
              message={phase === "ready" ? "Có bản mới" : phase === "waiting" ? "Có bản mới · đang gửi dữ liệu, xong sẽ tải lại" : "Có bản mới · còn mục chưa lưu, xử lý xong rồi tải lại"}
              actionLabel={phase === "waiting" ? undefined : "Tải lại"}
              onAction={reload}
            />
          </div>
        )}
      </Presence>
    </div>
  );
}
