"use client";

import Link from "next/link";

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
  const actionClass =
    "inline-flex min-h-[44px] items-center rounded-full border-0 bg-transparent px-1 text-[13px] font-bold text-blue no-underline cursor-pointer";
  return (
    <div
      role="status"
      data-level-card
      className="mx-3 mt-2 flex flex-none items-start gap-1 rounded-xl border border-card-border bg-card py-1 pl-3 pr-1 lg:mx-8"
    >
      <div className="flex min-w-0 flex-1 flex-col items-start gap-0">
        <p className="m-0 py-2 text-[13px] leading-snug text-text">{text}</p>
        {action &&
          (action.href ? (
            <Link href={action.href} className={actionClass}>
              {action.label}
            </Link>
          ) : (
            <button type="button" onClick={action.onClick} className={actionClass}>
              {action.label}
            </button>
          ))}
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Đóng thông báo"
        className="inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-secondary hover:bg-surface active:scale-[0.97] transition-press motion-reduce:active:scale-100"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </div>
  );
}
