import React from "react";

/** Small line glyphs of the courses screens (paths from design/courses). All decorative: a word always sits beside them (D-COL-04). */
const base = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;

export const LockGlyph = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </svg>
);

export const CheckGlyph = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base} strokeWidth={2.6}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
);

export const ChevronGlyph = ({ size = 20, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base} className={className}>
    <path d="m9 6 6 6-6 6" />
  </svg>
);

export const PlayGlyph = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
    <path d="M8 5.5v13l11-6.5z" fill="currentColor" />
  </svg>
);

export const MoreGlyph = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <circle cx="5" cy="12" r="1.8" />
    <circle cx="12" cy="12" r="1.8" />
    <circle cx="19" cy="12" r="1.8" />
  </svg>
);

export const PlusGlyph = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base} strokeWidth={2.2}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const KIND_PATH = {
  pdf: "M7 3h7l4 4v14H7zM14 3v4h4M9.5 12h6M9.5 15.5h6M9.5 19h4",
  text: "M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3zM13.5 7.5l3 3",
} as const;

/** The 44 px lesson tile (IconTile pattern): a gradient in the part's colour, radius 0.27 × size, a top highlight, a white glyph. */
export function LessonTile({ kind, background, size = 44 }: { kind: "pdf" | "text"; background: string; size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="flex shrink-0 items-center justify-center text-on-accent shadow-tile"
      style={{ width: size, height: size, borderRadius: size * 0.27, background }}
    >
      <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24" {...base} strokeWidth={1.8} className="block overflow-visible drop-shadow-tile-glyph">
        <path d={KIND_PATH[kind]} />
      </svg>
    </span>
  );
}
