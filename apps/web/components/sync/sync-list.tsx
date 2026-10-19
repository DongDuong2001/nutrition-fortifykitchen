"use client";

import React from "react";
import { PillButton } from "@/components/ui/pill-button";
import { Sheet } from "@/components/ui/sheet";
import { outboxItems, type OutboxItem } from "@/lib/api-client";
import { useDiary } from "@/lib/diary-store";
import { useSyncSummary } from "@/lib/sync-ui";

/** What an item of the outbox is about, in the person's words. */
function labelOf(item: OutboxItem, name: string | null): string {
  const day = (item.day || item.date).slice(5).split("-").reverse().join("/");
  if (item.kind === "profile") return "Hồ sơ";
  if (item.kind === "weight") return item.entity?.startsWith("training:") ? `Ngày tập ${day}` : `Cân nặng ${day}`;
  if (item.kind === "favourite") return "Món yêu thích";
  const what = item.method === "DELETE" ? "Xóa" : item.method === "PATCH" ? "Sửa" : item.method === "POST" && item.path?.endsWith("/restore") ? "Hoàn tác" : "Thêm";
  return `${what} ${name ?? "một món"}${day.length > 1 ? ` · ${day}` : ""}`;
}

/** Where an item stands. */
function statusOf(item: OutboxItem): string {
  if (item.held?.final) return "Ngày đã qua, chỉ còn trên máy này";
  if (item.held) return `Máy chủ chưa nhận${item.held.status ? ` (lỗi ${item.held.status})` : ""}`;
  if (item.parked) return "Đã thử nhiều lần, bấm Thử lại";
  if (item.state === "sending") return "Đang gửi";
  return item.retries ? "Sẽ gửi lại" : "Chờ gửi";
}

/**
 * cc-68 (S13): the list behind the sync status: every write that has not reached the server, what it is and where it stands,
 * and Thử lại, which sends them all now (held ones and parked ones too).
 */
export function SyncList({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { getEntry, retryUnsaved } = useDiary();
  // The summary changes whenever the outbox does: the list is read again then
  useSyncSummary();
  const items = outboxItems();
  return (
    <Sheet open={open} onClose={onClose} title="Chưa lưu" titleId="sync-list-title" desktopDialog>
      <div className="flex flex-col gap-3 py-1">
        {items.length === 0 ? (
          <p className="m-0 text-[15px] text-secondary">Đã lưu hết.</p>
        ) : (
          <ul className="m-0 flex list-none flex-col p-0" data-sync-list>
            {items.map((item) => (
              <li key={item.key} className="flex min-h-11 flex-col justify-center border-b border-divider py-2 last:border-b-0">
                <span className="text-[15px] font-semibold leading-snug text-text">{labelOf(item, getEntry(item.id)?.name ?? null)}</span>
                <span className="text-[13px] leading-snug text-secondary">{statusOf(item)}</span>
              </li>
            ))}
          </ul>
        )}
        {items.length > 0 && (
          <PillButton
            type="button"
            onClick={() => {
              retryUnsaved();
            }}
          >
            Thử lại
          </PillButton>
        )}
        <PillButton type="button" variant="secondary" onClick={onClose}>
          Đóng
        </PillButton>
      </div>
    </Sheet>
  );
}
