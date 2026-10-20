"use client";

import { useState } from "react";

/** The 404 page's Báo lỗi button: it only says the report was noted. */
export function NotFoundReport() {
  const [reported, setReported] = useState(false);
  return (
    <button
      type="button"
      onClick={() => setReported(true)}
      className="flex h-[52px] cursor-pointer items-center justify-center rounded-full border border-card-border bg-card text-base font-semibold text-text transition-press active:scale-[0.97] motion-reduce:active:scale-100"
    >
      {reported ? "Đã ghi nhận báo lỗi" : "Báo lỗi"}
    </button>
  );
}
