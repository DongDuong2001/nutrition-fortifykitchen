"use client";

import React from "react";
import { PillButton } from "@/components/ui/pill-button";
import { Sheet } from "@/components/ui/sheet";

/**
 * cc-68 (X8): Đăng xuất with writes still waiting. The device keeps nothing after it, so what has not reached the server
 * would be lost: the person chooses. "Đồng bộ rồi đăng xuất" (the first, so the default) sends them, then signs out; when
 * they cannot be sent now (no network) the count stays and the choice is theirs again. "Vẫn đăng xuất" signs out and drops them.
 */
export function SignOutConfirm({
  open,
  count,
  busy,
  failed,
  onSyncThenLeave,
  onLeave,
  onClose,
}: {
  open: boolean;
  /** Writes still waiting, now. */
  count: number;
  /** A sync is running. */
  busy: boolean;
  /** A sync ran and writes still wait. */
  failed: boolean;
  onSyncThenLeave: () => void;
  onLeave: () => void;
  onClose: () => void;
}) {
  return (
    <Sheet open={open} onClose={onClose} title="Đăng xuất?" titleId="sign-out-title" desktopDialog>
      <div className="flex flex-col gap-3 py-1">
        <p className="m-0 text-callout leading-snug text-text">Còn {count} mục chưa đồng bộ. Đăng xuất bây giờ sẽ xóa chúng khỏi máy này.</p>
        {failed && (
          <p role="alert" className="m-0 text-cap leading-snug text-destructive-text">
            Chưa đồng bộ hết được. Kiểm tra mạng rồi thử lại nhé.
          </p>
        )}
        <PillButton type="button" onClick={onSyncThenLeave} disabled={busy}>
          {busy ? "Đang đồng bộ…" : "Đồng bộ rồi đăng xuất"}
        </PillButton>
        <PillButton type="button" variant="secondary" onClick={onLeave} disabled={busy}>
          Vẫn đăng xuất
        </PillButton>
      </div>
    </Sheet>
  );
}
