"use client";

import React from "react";
import Link from "next/link";
import { usePresence } from "@/components/ui/presence";
import { useDocumentHidden } from "@/hooks/use-document-hidden";
import type { ToastSwipe } from "@/components/ui/use-toast-swipe";

export interface ToastProps {
  message: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  /** A fixed fill of the bar, 0..100 (a static preview). */
  progressPercent?: number;
  /** cc-55: the auto-dismiss countdown. The bar empties on its own (CSS), from `leftMs` of `totalMs`. */
  countdown?: { totalMs: number; leftMs: number };
  /**
   * The toast is a live region itself (role=status). The app's one toast host has a region that stays mounted and
   * announces what is put into it, so its toasts pass false (a region that appears with its text is often not read).
   */
  announce?: boolean;
  /**
   * A mouse is on the toast or focus is in it (hover and focus stop an auto-dismiss clock, WCAG 2.2.1). A finger never
   * counts: iOS fires an emulated mouseenter on a tap and no leave, which left the toast paused for good.
   */
  onPause?: () => void;
  onResume?: () => void;
  /** cc-64 (2b): the sideways swipe that dismisses it (components/ui/use-toast-swipe), from the app's toast host only. */
  swipe?: ToastSwipe;
  className?: string;
}

export function Toast({
  message,
  actionLabel,
  actionHref,
  onAction,
  progressPercent,
  countdown,
  announce = true,
  onPause,
  onResume,
  swipe,
  className = "",
}: ToastProps) {
  // cc-55: rises in (m-toast, @starting-style); inside <Presence> it fades down and away when it goes
  const state = usePresence();
  // In the background the bar waits with the clock (the store stops its timer): a Hoàn tác must not expire in another app
  const hidden = useDocumentHidden();
  return (
    <div
      ref={swipe?.ref}
      role={announce ? "status" : undefined}
      onPointerEnter={(e) => e.pointerType === "mouse" && onPause?.()}
      onPointerLeave={(e) => e.pointerType === "mouse" && onResume?.()}
      // cc-64 (2b): a finger on the toast stops its clock while it presses
      onPointerDown={(e) => {
        if (e.pointerType !== "mouse") onPause?.();
        swipe?.onPointerDown(e);
      }}
      onPointerMove={swipe?.onPointerMove}
      onPointerUp={(e) => {
        if (e.pointerType !== "mouse") onResume?.();
        swipe?.onPointerUp(e);
      }}
      onPointerCancel={(e) => {
        if (e.pointerType !== "mouse") onResume?.();
        swipe?.onPointerCancel(e);
      }}
      onFocus={onPause}
      onBlur={onResume}
      style={swipe ? { touchAction: "pan-y" } : undefined}
      data-state={state}
      data-paused={hidden ? "" : undefined}
      inert={state === "closed"}
      className={`m-toast bg-ink text-on-dark rounded-xl overflow-hidden shadow-[0_8px_24px_rgba(10,10,11,0.35)] min-h-14 box-border flex flex-col justify-between w-full max-w-[366px] mx-auto select-none ${className}`}
    >
      <div className="py-1 pl-4 pr-1 min-h-14 flex items-center justify-between gap-2">
        <span className="text-callout font-normal leading-snug">{message}</span>

        {actionLabel && (
          actionHref ? (
            <Link
              href={actionHref}
              className="shrink-0 min-h-11 px-4 rounded-xl flex items-center text-sky text-callout font-bold no-underline hover:text-on-dark active:scale-[0.97] transition-press"
            >
              {actionLabel}
            </Link>
          ) : (
            <button
              type="button"
              onClick={onAction}
              className="shrink-0 min-h-11 px-4 rounded-xl bg-transparent border-0 flex items-center text-sky text-callout font-bold cursor-pointer hover:text-on-dark active:scale-[0.97] transition-press"
            >
              {actionLabel}
            </button>
          )
        )}
      </div>

      {countdown ? (
        <div aria-hidden="true" className="h-1 bg-level-empty-dark w-full">
          <div
            key={message}
            className="m-countdown h-1 w-full bg-cobalt"
            style={{ animationDuration: `${countdown.totalMs}ms`, animationDelay: `${Math.min(0, countdown.leftMs - countdown.totalMs)}ms` }}
          />
        </div>
      ) : (
        progressPercent !== undefined && (
          <div aria-hidden="true" className="h-1 bg-level-empty-dark w-full">
            <div
              className="h-1 w-full origin-left bg-cobalt"
              style={{ transform: `scaleX(${Math.max(0, Math.min(100, progressPercent)) / 100})` }}
            />
          </div>
        )
      )}
    </div>
  );
}
