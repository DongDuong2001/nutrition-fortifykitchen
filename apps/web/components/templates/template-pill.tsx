"use client";

import React from "react";
import { TemplateMiniTile } from "./template-glyph";

/**
 * "Chép ngày ăn mẫu" (NMEmpty): what an empty day's meals card shows. A first row with the card's own line ("Chưa có món nào hôm nay") and the
 * 44 px × at the top right, which hides the pill for that day only; under it the copy button gets its own full-width 44 px row, one line, which
 * opens the picker (the saved days, and Hôm qua). The divider under it is the one the meals' own first row would not have.
 */
export function TemplatePill({ onOpen, onHide, hideLabel, emptyText }: { onOpen: () => void; onHide: () => void; hideLabel: string; emptyText: string }) {
  return (
    <>
      <div data-align-group="home-template" className="@container flex flex-col px-3 pb-1">
        <div className="flex items-start justify-between gap-1">
          <p className="m-0 flex min-h-11 min-w-0 flex-1 items-center text-callout font-semibold leading-snug text-text">{emptyText}</p>
          <button
            type="button"
            aria-label={hideLabel}
            onClick={onHide}
            className="-mr-3 flex min-h-11 w-11 flex-none cursor-pointer items-center justify-center border-0 bg-transparent p-0 text-secondary active:scale-[0.97] transition-press motion-reduce:active:scale-100 focus-visible:outline-cobalt"
          >
            <span aria-hidden="true" className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-surface">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </span>
          </button>
        </div>
        <button
          type="button"
          data-tour="day-template-pill"
          aria-haspopup="dialog"
          onClick={onOpen}
          className="m-0 -mx-1 flex min-h-11 w-[calc(100%+0.5rem)] min-w-0 cursor-pointer items-center border-0 bg-transparent p-0 active:scale-[0.97] transition-press motion-reduce:active:scale-100 focus-visible:outline-cobalt lg:mx-0 lg:w-60"
        >
          {/* One line while it fits; the glyph steps aside when the row is narrow (360 px, large text), and at large text the label may wrap
              inside a taller pill rather than be cut off */}
          <span className="inline-flex min-h-9 w-full items-center justify-center gap-1 rounded-full bg-cobalt-tint px-1 py-1 text-center text-cap font-bold leading-tight text-cobalt">
            <span className="hidden @min-[9.25rem]:inline-flex">
              <TemplateMiniTile />
            </span>
            Chép ngày ăn mẫu
          </span>
        </button>
      </div>
      <div aria-hidden="true" className="mx-3 h-px bg-divider" />
    </>
  );
}
