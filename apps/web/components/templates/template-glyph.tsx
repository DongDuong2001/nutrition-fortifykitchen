import React from "react";

/** The calendar of Ngày ăn mẫu: the app's Calendar outline with a filled day (NMList, NMEmpty), on a 24 grid. */
const CALENDAR_PATH =
  "M16.5 5V3m-9 2V3M3.25 8h17.5M3 10.044c0-2.115 0-3.173.436-3.981a3.9 3.9 0 0 1 1.748-1.651C6.04 4 7.16 4 9.4 4h5.2c2.24 0 3.36 0 4.216.412.753.362 1.364.94 1.748 1.65.436.81.436 1.868.436 3.983v4.912c0 2.115 0 3.173-.436 3.981a3.9 3.9 0 0 1-1.748 1.651C17.96 21 16.84 21 14.6 21H9.4c-2.24 0-3.36 0-4.216-.412a3.9 3.9 0 0 1-1.748-1.65C3 18.128 3 17.07 3 14.955z";

/** The shapes of the glyph, for a SettingsTile (which draws the svg around them). */
export function TemplateGlyphShapes() {
  return (
    <>
      <path d={CALENDAR_PATH} />
      <rect x="7.5" y="12.5" width="4.5" height="4.5" rx="1" fill="currentColor" stroke="none" />
    </>
  );
}

/** A tile smaller than SettingsTile's 30 px: the glyph in white on the indigo of "language" (the pill's 16 px tile). */
export function TemplateMiniTile() {
  return (
    <span aria-hidden="true" className="inline-flex h-4 w-4 flex-none items-center justify-center rounded bg-sys-indigo text-on-accent">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <TemplateGlyphShapes />
      </svg>
    </span>
  );
}
