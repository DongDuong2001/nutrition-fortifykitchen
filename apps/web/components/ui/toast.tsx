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
  /** Restarts the countdown bar when it changes (a new toast in a reused element); the message by default. */
  countdownKey?: string;
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
  /** Called after the action button or link was used: every action ends its toast at once (the caller dismisses it). */
  onDismiss?: () => void;
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
  countdownKey,
  announce = true,
  onPause,
  onResume,
  onDismiss,
  swipe,
  className = "",
}: ToastProps) {
  // Focus stops the clock only when it is the keyboard's (WCAG 2.2.1); a tap focuses the button too, and the clock would wait for a blur
  // that never comes. A press stops it from down to up/cancel, below.
  const focusPaused = React.useRef(false);
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
      onFocus={(e) => {
        if (!(e.target as Element).matches(":focus-visible") || focusPaused.current) return;
        focusPaused.current = true;
        onPause?.();
      }}
      onBlur={(e) => {
        if (!focusPaused.current || e.currentTarget.contains(e.relatedTarget as Node | null)) return;
        focusPaused.current = false;
        onResume?.();
      }}
      style={swipe ? { touchAction: "pan-y" } : undefined}
      data-state={state}
      data-paused={hidden ? "" : undefined}
      inert={state === "closed"}
      // V3-SPEC §4: a Liquid Glass capsule, 48 px tall, sized to its text
      className={`m-toast glass text-glass-text rounded-[24px] overflow-hidden min-h-12 box-border flex flex-col justify-between w-fit max-w-full mx-auto select-none ${className}`}
    >
      <div className="py-0.5 pl-5 pr-1 min-h-12 flex items-center justify-between gap-1">
        <span className="text-callout font-semibold leading-snug">{message}</span>

        {actionLabel && (
          actionHref ? (
            <Link
              href={actionHref}
              onClick={() => onDismiss?.()}
              className="shrink-0 min-h-11 px-3 rounded-full flex items-center text-cobalt text-callout font-bold no-underline hover:text-ink active:scale-[0.97] transition-press"
            >
              {actionLabel}
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => {
                onAction?.();
                onDismiss?.();
              }}
              className="shrink-0 min-h-11 px-3 rounded-full bg-transparent border-0 flex items-center text-cobalt text-callout font-bold cursor-pointer hover:text-ink active:scale-[0.97] transition-press"
            >
              {actionLabel}
            </button>
          )
        )}
      </div>

      {countdown ? (
        <div aria-hidden="true" className="h-0.5 w-full">
          <div
            key={countdownKey ?? message}
            className="m-countdown h-0.5 w-full bg-cobalt"
            style={{ animationDuration: `${countdown.totalMs}ms`, animationDelay: `${Math.min(0, countdown.leftMs - countdown.totalMs)}ms` }}
          />
        </div>
      ) : (
        progressPercent !== undefined && (
          <div aria-hidden="true" className="h-0.5 w-full">
            <div
              className="h-0.5 w-full origin-left bg-cobalt"
              style={{ transform: `scaleX(${Math.max(0, Math.min(100, progressPercent)) / 100})` }}
            />
          </div>
        )
      )}
    </div>
  );
}
