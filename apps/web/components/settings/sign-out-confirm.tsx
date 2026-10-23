"use client";

import React from "react";
import { PillButton } from "@/components/ui/pill-button";
import { Sheet } from "@/components/ui/sheet";
import { AlertLine } from "@/components/ui/alert-line";
import { useT } from "@/lib/i18n";

/** A sync that ran and left writes behind: how many, and the plain reason. */
export interface SignOutFailure {
  left: number;
  reason: string;
}

/**
 * cc-68 (X8): Đăng xuất with writes still waiting. The device keeps nothing after it, so what has not reached the server
 * would be lost: the person chooses. "Đồng bộ rồi đăng xuất" (the first, so the default) sends them, with its progress, then
 * signs out. When they cannot all be sent it never just stops: the sheet says how many are left and why, and offers Xem các
 * món (the Chưa lưu list) and Vẫn đăng xuất (mất N món), which signs out and drops them.
 */
export function SignOutConfirm({
  open,
  count,
  busy,
  progress,
  failure,
  error,
  onSyncThenLeave,
  onLeave,
  onSeeItems,
  onClose,
}: {
  open: boolean;
  /** Writes still waiting, now. */
  count: number;
  /** A sync is running. */
  busy: boolean;
  /** While it runs: how many of the writes it will try have been tried. */
  progress: { done: number; total: number } | null;
  /** A sync ran and writes still wait. */
  failure: SignOutFailure | null;
  /** Something else went wrong (the check itself, or signing out): said in words, never silent. */
  error: string | null;
  onSyncThenLeave: () => void;
  onLeave: () => void;
  onSeeItems: () => void;
  onClose: () => void;
}) {
  const t = useT();
  return (
    <Sheet open={open} onClose={onClose} title={t("settings.signOut.title")} titleId="sign-out-title" desktopDialog>
      <div className="flex flex-col gap-3 py-1">
        <p className="m-0 text-callout leading-snug text-text">{t("settings.signOut.body", { count })}</p>
        {/* cc-66b: the progress and the failure lines open and close without pushing the buttons in one frame */}
        <AlertLine show={busy} gap={3} role="status" aria-live="polite" className="m-0 text-cap leading-snug text-secondary" data-sign-out-progress="">
          {progress && progress.total > 0 ? t("settings.signOut.progress", { done: Math.min(progress.done, progress.total), total: progress.total }) : t("settings.signOut.syncing")}
        </AlertLine>
        <AlertLine show={!!failure && !busy} gap={3} className="m-0 text-cap leading-snug text-destructive-text" data-sign-out-failure="">
          {failure && t("settings.signOut.failure", { count: failure.left, reason: failure.reason })}
        </AlertLine>
        <AlertLine show={!!error && !busy} gap={3} className="m-0 text-cap leading-snug text-destructive-text" data-sign-out-error="">
          {error}
        </AlertLine>
        <PillButton type="button" onClick={onSyncThenLeave} disabled={busy}>
          {busy ? t("settings.signOut.syncing") : t("settings.signOut.syncThenLeave")}
        </PillButton>
        {(failure || error) && !busy && (
          <PillButton type="button" variant="secondary" onClick={onSeeItems}>
            {t("settings.signOut.seeItems")}
          </PillButton>
        )}
        <PillButton type="button" variant="secondary" onClick={onLeave} disabled={busy}>
          {t("settings.signOut.leave", { count: failure ? failure.left : count })}
        </PillButton>
      </div>
    </Sheet>
  );
}
