"use client";

import React from "react";
import { TemplateMiniTile } from "./template-glyph";

/**
 * "Chép ngày mẫu" (NMEmpty): the pill at the top of the meals card of an empty day. It opens the picker (the saved days, and Hôm qua).
 * The 44 px × hides it for that day only. The divider under it is the one the meals' own first row would not have.
 */
export function TemplatePill({ onOpen, onHide, hideLabel }: { onOpen: () => void; onHide: () => void; hideLabel: string }) {
  return (
    <>
      <div data-align-group="home-template" className="flex items-center gap-1 px-1.5">
        <button
          type="button"
          data-tour="day-template-pill"
          aria-haspopup="dialog"
          onClick={onOpen}
          className="m-0 flex min-h-11 min-w-0 flex-1 cursor-pointer lg:w-60 lg:flex-none items-center border-0 bg-transparent p-0 active:scale-[0.97] transition-press motion-reduce:active:scale-100 focus-visible:outline-cobalt"
        >
          <span className="inline-flex h-9 w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-cobalt-tint px-1.5 text-cap font-bold leading-none text-cobalt">
            <TemplateMiniTile />
            Chép ngày mẫu
          </span>
        </button>
        <button
          type="button"
          aria-label={hideLabel}
          onClick={onHide}
          className="-ml-1 -mr-2 flex min-h-11 w-11 flex-none cursor-pointer items-center justify-center border-0 bg-transparent p-0 text-secondary active:scale-[0.97] transition-press motion-reduce:active:scale-100 focus-visible:outline-cobalt"
        >
          <span aria-hidden="true" className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-surface">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </span>
        </button>
      </div>
      <div aria-hidden="true" className="mx-3 h-px bg-divider" />
    </>
  );
}
