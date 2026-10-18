"use client";

import React from "react";
import Link from "next/link";
import { usePresence } from "@/components/ui/presence";

export interface ToastProps {
  message: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  /** A fixed fill of the bar, 0..100 (a static preview). */
  progressPercent?: number;
  /** cc-55: the auto-dismiss countdown. The bar empties on its own (CSS), from `leftMs` of `totalMs`. */
  countdown?: { totalMs: number; leftMs: number };
  className?: string;
}

export function Toast({
  message,
  actionLabel,
  actionHref,
  onAction,
  progressPercent,
  countdown,
  className = "",
}: ToastProps) {
  // cc-55: rises in (m-toast, @starting-style); inside <Presence> it fades down and away when it goes
  const state = usePresence();
  return (
    <div
      role="status"
      data-state={state}
      inert={state === "closed"}
      className={`m-toast bg-ink text-on-dark rounded-xl overflow-hidden shadow-[0_8px_24px_rgba(10,10,11,0.35)] min-h-[56px] box-border flex flex-col justify-between w-full max-w-[366px] mx-auto select-none ${className}`}
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

      {countdown ? (
        <div aria-hidden="true" className="h-1 bg-level-empty-dark w-full">
          <div
            className="m-countdown h-1 w-full bg-blue"
            style={{ animationDuration: `${countdown.totalMs}ms`, animationDelay: `${Math.min(0, countdown.leftMs - countdown.totalMs)}ms` }}
          />
        </div>
      ) : (
        progressPercent !== undefined && (
          <div aria-hidden="true" className="h-1 bg-level-empty-dark w-full">
            <div
              className="h-1 w-full origin-left bg-blue"
              style={{ transform: `scaleX(${Math.max(0, Math.min(100, progressPercent)) / 100})` }}
            />
          </div>
        )
      )}
    </div>
  );
}
