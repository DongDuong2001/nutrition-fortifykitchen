import React from "react";

/** V3-SPEC §3.4: the colour of a settings row's tile, by meaning. */
export type SettingsTileTone =
  | "profile"
  | "body"
  | "targets"
  | "notifications"
  | "language"
  | "data"
  | "training"
  | "app"
  | "privacy";

const TONES: Record<SettingsTileTone, string> = {
  profile: "bg-sys-blue",
  body: "bg-sys-green",
  targets: "bg-sys-orange",
  notifications: "bg-sys-red",
  language: "bg-sys-indigo",
  data: "bg-sys-teal",
  training: "bg-sys-pink",
  app: "bg-cobalt",
  privacy: "bg-sys-grey",
};

/**
 * The iOS-Settings icon tile before a settings or account row (V3-SPEC §3.4): 30 px, radius 8, the meaning's system
 * colour with a white 18 px line glyph, 12 px before the label (the row's gap). Decorative: the label names the row.
 * `children` is the glyph's SVG content on a 24 grid (paths), drawn in white with a 1.8 stroke.
 */
export function SettingsTile({
  tone,
  children,
  className = "",
  size = 30,
}: {
  tone: SettingsTileTone;
  children: React.ReactNode;
  className?: string;
  /** 36 for the larger rows of Góp ý & hỗ trợ (a 20 px glyph) */
  size?: 30 | 36;
}) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-tile text-on-accent ${size === 36 ? "h-9 w-9" : "h-[30px] w-[30px]"} ${TONES[tone]} ${className}`}
    >
      <svg width={size === 36 ? 20 : 18} height={size === 36 ? 20 : 18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {children}
      </svg>
    </span>
  );
}
