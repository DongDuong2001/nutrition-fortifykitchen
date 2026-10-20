"use client";

import { Notice } from "@/components/ui/notice";

/** A one-time card on Hôm nay (a Level change, or the Level 0 hint). A 44 px close; it is not in the share image. */
export function LevelNoticeCard({
  text,
  action,
  onClose,
}: {
  text: string;
  /** One link or button after the text: Xem (the explainer) or Nhập mã (/settings/coach). */
  action?: { label: string; href?: string; onClick?: () => void };
  onClose: () => void;
}) {
  return (
    <Notice role="status" data-level-card action={action} onClose={onClose} className="mx-3 mt-2 flex-none lg:mx-8">
      {text}
    </Notice>
  );
}
