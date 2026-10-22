"use client";

import React, { useState } from "react";
import { PillButton } from "@/components/ui/pill-button";
import { Sheet } from "@/components/ui/sheet";
import { outboxItems, type OutboxItem } from "@/lib/api-client";
import { useDiary } from "@/lib/diary-store";
import { dayLabel, isDiaryAdd, reasonOf, refusedForGoodItem, retryMessage, type RetryOutcome } from "@/lib/late-writes";
import { useOnline, useSyncSummary } from "@/lib/sync-ui";

/** What an item of the outbox is about, in the person's words: what was done, to which food, on which day. */
function labelOf(item: OutboxItem, name: string | null): string {
  const day = dayLabel(item.day || item.date);
  if (item.kind === "profile") return "Hồ sơ";
  if (item.kind === "weight") return item.entity?.startsWith("training:") ? `Ngày tập ${day}` : `Cân nặng ${day}`;
  if (item.kind === "favourite") return "Món yêu thích";
  const what = item.method === "DELETE" ? "Xóa" : item.method === "PATCH" ? "Sửa" : item.method === "POST" && item.path?.endsWith("/restore") ? "Hoàn tác" : "Thêm";
  return `${what} ${name ?? item.label ?? "một món"}${day ? ` · ${day}` : ""}`;
}

/**
 * cc-68 (S13): the list behind the sync status: every write that has not reached the server, what it is, why it still waits,
 * and Thử lại, which sends them all now (refused and parked ones too, and always says what happened). A write the server refuses
 * for good offers Chuyển sang hôm nay (log it again on today) and Bỏ món này (asks first).
 */
export function SyncList({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { getEntry, dayArchive, retryUnsaved, moveUnsavedToToday, discardUnsaved } = useDiary();
  // The summary changes whenever the outbox does: the list is read again then
  useSyncSummary();
  const online = useOnline();
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<RetryOutcome | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const items = outboxItems();
  const now = Date.now();
  const archived = (id: string) => Object.values(dayArchive).flat().find((e) => e.id === id)?.foodName ?? null;

  async function retry() {
    setBusy(true);
    setOutcome(null);
    try {
      setOutcome(await retryUnsaved());
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={items.length > 0 ? `Chưa lưu (${items.length})` : "Chưa lưu"} titleId="sync-list-title" desktopDialog>
      <div className="flex flex-col gap-3 py-1">
        {items.length === 0 ? (
          <p className="m-0 text-callout text-secondary">Đã lưu hết.</p>
        ) : (
          <ul className="m-0 flex list-none flex-col p-0" data-sync-list>
            {items.map((item) => {
              const forGood = refusedForGoodItem(item, now);
              return (
                <li key={item.key} className="flex min-h-11 flex-col justify-center gap-1 border-b border-divider py-2 last:border-b-0" data-sync-item={item.key}>
                  <span className="text-callout font-semibold leading-snug text-text">{labelOf(item, getEntry(item.id)?.name ?? archived(item.id))}</span>
                  <span className="text-cap leading-snug text-secondary" data-sync-reason>
                    {reasonOf(item, { online, now })}
                  </span>
                  {forGood &&
                    (confirming === item.key ? (
                      <div className="flex flex-col gap-2 pt-1">
                        <span className="text-cap leading-snug text-text">Bỏ món này? Món sẽ mất khỏi máy này.</span>
                        <div className="grid grid-cols-2 gap-2">
                          <PillButton type="button" variant="secondary" size="sm" onClick={() => setConfirming(null)}>
                            Giữ lại
                          </PillButton>
                          <PillButton
                            type="button"
                            variant="danger"
                            size="sm"
                            onClick={() => {
                              setConfirming(null);
                              void discardUnsaved(item.key);
                            }}
                          >
                            Bỏ món này
                          </PillButton>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        {isDiaryAdd(item) ? (
                          <PillButton type="button" variant="secondary" size="sm" onClick={() => void moveUnsavedToToday(item.key)}>
                            Chuyển sang hôm nay
                          </PillButton>
                        ) : (
                          <span aria-hidden="true" />
                        )}
                        <PillButton type="button" variant="danger" size="sm" onClick={() => setConfirming(item.key)}>
                          Bỏ món này
                        </PillButton>
                      </div>
                    ))}
                </li>
              );
            })}
          </ul>
        )}
        <p role="status" aria-live="polite" className="m-0 min-h-5 text-cap leading-snug text-secondary" data-sync-outcome>
          {busy ? "Đang gửi…" : outcome ? retryMessage(outcome) : ""}
        </p>
        {items.length > 0 && (
          <PillButton type="button" onClick={() => void retry()} disabled={busy}>
            Thử lại
          </PillButton>
        )}
      </div>
    </Sheet>
  );
}

