import React from "react";
import Link from "next/link";

export interface ToastProps {
  message: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  progressPercent?: number; // 0..100 for auto-dismiss countdown
  className?: string;
}

export function Toast({
  message,
  actionLabel,
  actionHref,
  onAction,
  progressPercent,
  className = "",
}: ToastProps) {
  return (
    <div
      role="status"
      className={`bg-ink text-on-dark rounded-xl overflow-hidden shadow-[0_8px_24px_rgba(10,10,11,0.35)] min-h-[56px] box-border flex flex-col justify-between w-full max-w-[366px] mx-auto select-none ${className}`}
    >
      <div className="py-1 pl-4 pr-1 min-h-[56px] flex items-center justify-between gap-2">
        <span className="text-[15px] font-normal leading-snug">{message}</span>

        {actionLabel && (
          actionHref ? (
            <Link
              href={actionHref}
              className="shrink-0 min-h-[44px] px-4 rounded-xl flex items-center text-sky text-[15px] font-bold no-underline hover:text-on-dark transition-colors active:scale-[0.97]"
            >
              {actionLabel}
            </Link>
          ) : (
            <button
              type="button"
              onClick={onAction}
              className="shrink-0 min-h-[44px] px-4 rounded-xl bg-transparent border-0 flex items-center text-sky text-[15px] font-bold cursor-pointer hover:text-on-dark transition-colors active:scale-[0.97]"
            >
              {actionLabel}
            </button>
          )
        )}
      </div>

      {progressPercent !== undefined && (
        <div aria-hidden="true" className="h-1 bg-level-empty-dark w-full">
          <div
            className="h-1 bg-blue transition-all duration-100 ease-linear"
            style={{ width: `${Math.max(0, Math.min(100, progressPercent))}%` }}
          />
        </div>
      )}
    </div>
  );
}
