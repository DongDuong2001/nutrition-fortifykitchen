"use client";

import React from "react";
import { PillButton } from "@/components/ui/pill-button";
import { Sheet } from "@/components/ui/sheet";
import { AlertLine } from "@/components/ui/alert-line";

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
  return (
    <Sheet open={open} onClose={onClose} title="Đăng xuất?" titleId="sign-out-title" desktopDialog>
      <div className="flex flex-col gap-3 py-1">
        <p className="m-0 text-callout leading-snug text-text">Còn {count} món chưa đồng bộ. Đăng xuất bây giờ sẽ xóa chúng khỏi máy này.</p>
        {/* cc-66b: the progress and the failure lines open and close without pushing the buttons in one frame */}
        <AlertLine show={busy} gap={3} role="status" aria-live="polite" className="m-0 text-cap leading-snug text-secondary" data-sign-out-progress="">
          {progress && progress.total > 0 ? `Đang đồng bộ… ${Math.min(progress.done, progress.total)}/${progress.total}` : "Đang đồng bộ…"}
        </AlertLine>
        <AlertLine show={!!failure && !busy} gap={3} className="m-0 text-cap leading-snug text-destructive-text" data-sign-out-failure="">
          {failure && <>Còn {failure.left} món chưa đồng bộ được: {failure.reason}.</>}
        </AlertLine>
        <AlertLine show={!!error && !busy} gap={3} className="m-0 text-cap leading-snug text-destructive-text" data-sign-out-error="">
          {error}
        </AlertLine>
        <PillButton type="button" onClick={onSyncThenLeave} disabled={busy}>
          {busy ? "Đang đồng bộ…" : "Đồng bộ rồi đăng xuất"}
        </PillButton>
        {(failure || error) && !busy && (
          <PillButton type="button" variant="secondary" onClick={onSeeItems}>
            Xem các món
          </PillButton>
        )}
        <PillButton type="button" variant="secondary" onClick={onLeave} disabled={busy}>
          {failure ? `Vẫn đăng xuất (mất ${failure.left} món)` : `Vẫn đăng xuất (mất ${count} món)`}
        </PillButton>
      </div>
    </Sheet>
  );
}
