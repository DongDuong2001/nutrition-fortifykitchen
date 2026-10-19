"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

// The list opens on a tap: its chunk (and the sheet it is in) is not part of any page
const SyncList = dynamic(() => import("@/components/sync/sync-list").then((m) => m.SyncList), { ssr: false });

/** What the sync status says (components/sync/sync-status holds the state); a tap on Chưa lưu opens the list. Once mounted it stays, so an open list is not cut off when the status goes back to idle. */
export default function SyncStatusDetail({ state, unsaved, failed }: { state: string; unsaved: number; failed: number }) {
  const [listOpen, setListOpen] = useState(false);
  const text = "text-xs font-semibold leading-none text-muted-on-dark lg:text-secondary";
  return (
    <>
      {state === "idle" ? null : state === "offline" ? (
        <span className={text}>{unsaved > 0 ? `Ngoại tuyến · ${unsaved} chờ gửi` : "Ngoại tuyến"}</span>
      ) : state === "saving" ? (
        <span className={text}>Đang lưu…</span>
      ) : state === "unsaved" ? (
        <button
          type="button"
          onClick={() => setListOpen(true)}
          aria-haspopup="dialog"
          aria-label={failed > 0 ? `Chưa lưu ${unsaved}, ${failed} cần thử lại. Mở danh sách` : `Chưa lưu ${unsaved}. Mở danh sách`}
          className="min-h-11 cursor-pointer rounded-full border-0 bg-transparent px-2 text-xs font-bold leading-none text-sky lg:text-blue"
        >
          Chưa lưu ({unsaved})
        </button>
      ) : (
        <span className={`${text} inline-flex items-center gap-1`}>
          <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
            <path d="M3 8.5 6.5 12 13 4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Đã lưu
        </span>
      )}
      {listOpen && <SyncList open onClose={() => setListOpen(false)} />}
    </>
  );
}
