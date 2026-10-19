"use client";

import React, { useEffect, useState } from "react";
import { Toast } from "@/components/ui/toast";
import { canApplyUpdate, updatePhase } from "@/lib/update-phase";
import { isSyncBusy, requestSyncNow, useSyncSummary } from "@/lib/sync-ui";

/**
 * The "Có bản mới" toast. The person taps Tải lại; the new worker takes over (and the page reloads) only once nothing waits
 * to be sent and nothing is being sent (cc-68). Its own chunk: it is needed only when an update is waiting.
 */
export default function UpdateOffer({ worker, onApply }: { worker: ServiceWorker; onApply: () => void }) {
  const [tapped, setTapped] = useState(false);
  const summary = useSyncSummary();
  const busy = isSyncBusy(summary);

  useEffect(() => {
    if (!canApplyUpdate({ tapped, busy })) return;
    onApply();
    worker.postMessage({ type: "SKIP_WAITING" });
  }, [worker, tapped, busy, onApply]);

  const phase = updatePhase({ tapped, busy, saving: summary.saving, offline: typeof navigator !== "undefined" && !navigator.onLine, failed: summary.failed });
  const reload = () => {
    setTapped(true);
    // Writes that wait are sent now; the page reloads when they are gone
    if (busy) void requestSyncNow();
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(168px+env(safe-area-inset-bottom))] z-50 px-3 lg:inset-x-auto lg:bottom-24 lg:right-8 lg:w-[400px]">
      <div className="pointer-events-auto">
        <Toast
          message={phase === "ready" ? "Có bản mới" : phase === "waiting" ? "Có bản mới · đang gửi dữ liệu, xong sẽ tải lại" : "Có bản mới · còn mục chưa lưu, xử lý xong rồi tải lại"}
          actionLabel={phase === "waiting" ? undefined : "Tải lại"}
          onAction={reload}
        />
      </div>
    </div>
  );
}
