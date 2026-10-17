import React from "react";
import { PillButton } from "@/components/ui/pill-button";

/**
 * Stands where a food list would be while the live catalogue is on its way ("Đang tải món…", never "no foods"), or
 * when it did not come (Thử lại).
 */
export function CatalogStatus({ failed, onRetry }: { failed: boolean; onRetry: () => void }) {
  if (failed) {
    return (
      <div role="alert" className="flex flex-col items-start gap-3 py-2">
        <p className="m-0 text-[13px] leading-snug text-secondary">Chưa tải được danh sách món. Kiểm tra kết nối rồi thử lại.</p>
        <PillButton variant="secondary" fullWidth={false} onClick={onRetry}>
          Thử lại
        </PillButton>
      </div>
    );
  }
  return (
    <div role="status" aria-busy="true" data-catalog-loading className="flex flex-col gap-3 py-2">
      <p className="m-0 text-[13px] leading-snug text-secondary">Đang tải món…</p>
      {[0, 1, 2].map((i) => (
        <div key={i} aria-hidden="true" className="h-11 animate-pulse rounded-xl bg-divider motion-reduce:animate-none" />
      ))}
    </div>
  );
}

/** The live catalogue is still arriving but the list already has foods (the user's own): one line above it. */
export function CatalogNote() {
  return (
    <p role="status" className="m-0 text-[13px] leading-snug text-secondary">
      Đang tải thêm món…
    </p>
  );
}
