import React from "react";
import Link from "next/link";
import { SettingsTile, type SettingsTileTone } from "@/components/ui/settings-tile";

export interface SettingsRowProps {
  tone: SettingsTileTone;
  /** The glyph's SVG content (SETTINGS_ICONS) */
  glyph: React.ReactNode;
  label: React.ReactNode;
  /** One line under the label */
  hint?: React.ReactNode;
  /** The current value, right-aligned before the chevron */
  value?: React.ReactNode;
  href?: string;
  onClick?: () => void;
  /** Default true; false for a row that ends in a control (a switch) or has nothing to open */
  chevron?: boolean;
  /** A line above the row (inset: the card's padding is its margin). The first row of a card under its header has one too, as in the design. */
  divider?: boolean;
  /** Cài đặt rows: 8 px gaps, a 16 px chevron. Account and Hồ sơ rows: 12 px gaps, an 18 px chevron. */
  dense?: boolean;
  minHeight?: "12" | "14" | "16";
  /** Trailing content before the chevron (a badge, a switch) */
  children?: React.ReactNode;
  className?: string;
  "data-align-group"?: string;
}

/**
 * The V3 settings row (V3-SPEC §3.4): the 30 px iOS-Settings tile in the meaning's colour, 12 px before a 15 px label
 * (a 13 px hint under it), the value and a chevron on the right. A link when it has an `href`, a button when it has an
 * `onClick`, a plain row otherwise. 48 or 56 px high, never under the 44 px hit area.
 */
export function SettingsRow({
  tone,
  glyph,
  label,
  hint,
  value,
  href,
  onClick,
  chevron = true,
  divider = true,
  dense = false,
  minHeight = "12",
  children,
  className = "",
  "data-align-group": alignGroup,
}: SettingsRowProps) {
  const body = (
    <>
      <SettingsTile tone={tone} className={dense ? "mr-1" : ""}>
        {glyph}
      </SettingsTile>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-callout leading-snug">{label}</span>
        {hint && <span className="text-cap leading-tight text-secondary">{hint}</span>}
      </span>
      {value && <span className="shrink-0 text-callout font-semibold tabular-nums">{value}</span>}
      {children}
      {chevron && (
        <svg
          width={dense ? 16 : 18}
          height={dense ? 16 : 18}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={dense ? 2 : 1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="shrink-0 text-secondary"
          aria-hidden="true"
        >
          <path d={dense ? "M9 5l7 7-7 7" : "m9 6 6 6-6 6"} />
        </svg>
      )}
    </>
  );
  const cls = `flex w-full items-center py-2 text-left text-text no-underline ${dense ? "gap-2" : "gap-3"} ${
    minHeight === "16" ? "min-h-16" : minHeight === "14" ? "min-h-14" : "min-h-12"
  } ${divider ? "border-t border-divider" : ""} ${className}`;

  if (href) {
    return (
      <Link href={href} data-align-group={alignGroup} className={`${cls} m-tint transition-press`}>
        {body}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} data-align-group={alignGroup} className={`${cls} m-tint cursor-pointer bg-transparent`}>
        {body}
      </button>
    );
  }
  return (
    <div data-align-group={alignGroup} className={cls}>
      {body}
    </div>
  );
}
