"use client";

import React from "react";
import { Presence } from "@/components/ui/presence";
import { Toast } from "@/components/ui/toast";
import { SESSION_EXPIRED_MESSAGE, STORAGE_FULL_MESSAGE, useSyncAlerts } from "@/lib/sync-state";

/**
 * cc-68: what stays on screen until it is fixed (a toast would leave in 6 s): the device had no room to keep a write,
 * or the session ran out and writes cannot be sent. It sits above the toast host and the bottom nav, on every screen
 * under the diary provider.
 */
export function SyncAlerts() {
  const { storage, sessionExpired } = useSyncAlerts();
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(232px+env(safe-area-inset-bottom))] z-50 flex flex-col gap-2 px-3 lg:inset-x-auto lg:bottom-28 lg:right-8 lg:w-[400px]">
      <Presence>
        {storage && (
          <div role="alert" className="pointer-events-auto" data-sync-alert="storage">
            <Toast announce={false} message={STORAGE_FULL_MESSAGE} />
          </div>
        )}
      </Presence>
      <Presence>
        {sessionExpired && (
          <div role="alert" className="pointer-events-auto" data-sync-alert="session">
            <Toast announce={false} message={`${SESSION_EXPIRED_MESSAGE} · `} actionLabel="Đăng nhập lại" actionHref="/signin" />
          </div>
        )}
      </Presence>
    </div>
  );
}
