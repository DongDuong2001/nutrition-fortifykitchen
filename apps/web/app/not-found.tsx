"use client";

import React, { useState } from "react";
import { AppHeader } from "@/components/ui/app-header";
import { PillButton } from "@/components/ui/pill-button";
import { HOME_ROUTE } from "@/lib/nav";

export default function NotFound() {
  const [reported, setReported] = useState(false);

  return (
    <div className="flex min-h-dvh w-full flex-col bg-page text-text font-sans select-none">
      <AppHeader variant="tab" title="Không tìm thấy trang" />
      <main className="mx-auto flex w-full max-w-[560px] flex-1 flex-col gap-3 px-4 pt-4 pb-6 box-border">
        <div className="inline-flex flex-col items-start gap-2">
          <div aria-hidden="true" className="font-display italic font-black text-[5rem] leading-[0.9] text-ink tabular-nums tracking-display">
            404
          </div>
          <div aria-hidden="true" className="h-2 w-full rounded-full bg-cobalt" />
        </div>
        <p className="m-0 text-callout leading-relaxed text-secondary">Đường dẫn có thể đã cũ hoặc bị gõ sai.</p>
      </main>

      <footer className="mx-auto flex w-full max-w-[560px] flex-col gap-3 px-4 pb-6 box-border">
        <PillButton variant="primary" href={HOME_ROUTE} fullWidth>
          Về Tổng quan
        </PillButton>
        <button
          type="button"
          onClick={() => setReported(true)}
          className="flex h-[52px] cursor-pointer items-center justify-center rounded-full border border-card-border bg-card text-base font-semibold text-text transition-press active:scale-[0.97] motion-reduce:active:scale-100"
        >
          {reported ? "Đã ghi nhận báo lỗi" : "Báo lỗi"}
        </button>
      </footer>
    </div>
  );
}
