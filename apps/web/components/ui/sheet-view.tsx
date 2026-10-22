"use client";

import React, { useEffect, useRef } from "react";
import { usePresence } from "@/components/ui/presence";
import { SWITCH_OUT_MS } from "@/lib/motion";

/** How long a pushed view stays drawn for its exit (<Presence exitMs>): the switch glide's way out. */
export const SHEET_VIEW_EXIT_MS = SWITCH_OUT_MS;

export interface SheetViewProps {
  /** The header's title ("Khẩu phần") */
  title: string;
  /** What names the view for a screen reader (the food's heading in the portion view); the header title when left out */
  labelledBy?: string;
  /** The header title's id */
  titleId: string;
  /** ‹ on the leading side: back to the step under this one */
  onBack: () => void;
  /** ✕ on the trailing side: the whole sheet closes */
  onClose: () => void;
  /** The sheet's drag (useSheetDrag handlers): a drag down on the header closes the whole sheet, as on the sheet's own */
  dragHandlers?: React.HTMLAttributes<HTMLDivElement>;
  /** Another step sits over this one: it is out of reach until that one goes */
  covered?: boolean;
  /** The scroll region, for a caller that keeps or restores its place */
  scrollRef?: React.Ref<HTMLDivElement>;
  children: React.ReactNode;
}

/**
 * A step pushed inside a sheet (the + sheet's Khẩu phần and So sánh, overnight 22→23/10: one sheet in the + flow). It covers
 * the sheet's own content, which stays mounted under it, so Back finds the search, the scroll and the tray as they were; the
 * sheet keeps its height. It enters from the right like a tab (.m-tab-in: 12 px, 200 ms) and leaves the same way in
 * --m-switch-out; under reduced motion both are a cross-fade. The header follows D-SHT-05 for a later step: Back on the
 * leading side, the title, Close on the trailing side. Wrap it in <Presence exitMs={SHEET_VIEW_EXIT_MS}>.
 */
export function SheetView({ title, labelledBy, titleId, onBack, onClose, dragHandlers, covered = false, scrollRef, children }: SheetViewProps) {
  const state = usePresence();
  // Focus comes into the step (the content under it is inert now): its Back, the first control, as a sheet focuses its Close
  const backRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    backRef.current?.focus({ preventScroll: true });
  }, []);
  return (
    <section
      aria-labelledby={labelledBy ?? titleId}
      data-sheet-view
      data-state={state}
      inert={state === "closed" || covered}
      style={{ "--m-tab-dir": 1 } as React.CSSProperties}
      className="m-tab-in absolute inset-0 z-sticky flex flex-col bg-page"
    >
      <div data-sheet-drag {...dragHandlers} style={{ touchAction: "none" }} className="glass-bar shrink-0 shadow-glass">
        <div aria-hidden="true" data-sheet-handle className="flex h-5 cursor-grab items-center justify-center">
          <div className="h-[5px] w-9 rounded-full bg-grabber" />
        </div>
        <div className="grid grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-3 px-4 pb-2">
          <button
            type="button"
            ref={backRef}
            onClick={onBack}
            aria-label="Quay lại"
            data-testid="sheet-view-back"
            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border-0 bg-fill p-0 text-text transition-press active:scale-[0.97] motion-reduce:active:scale-100"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <span id={titleId} className="min-w-0 text-center text-body-lg font-bold leading-tight">
            {title}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            data-testid="sheet-view-close"
            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border-0 bg-fill p-0 text-text transition-press active:scale-[0.97] motion-reduce:active:scale-100"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
      </div>
      <div ref={scrollRef} data-sheet-view-scroll className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-4 pb-8">
        {children}
      </div>
    </section>
  );
}
