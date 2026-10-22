"use client";

import React from "react";
import {
  ArrowUp as MynaArrowUp,
  Check as MynaCheck,
  ChevronDown as MynaChevronDown,
  ChevronLeft as MynaChevronLeft,
  ChevronRight as MynaChevronRight,
  Eye as MynaEye,
  EyeOff as MynaEyeOff,
  Grid as MynaGrid,
  Home as MynaHome,
  Plus as MynaPlus,
  Ribbon as MynaRibbon,
  Search as MynaSearch,
  Sparkles as MynaSparkles,
  Star as MynaStar,
  Target as MynaTarget,
  Trash as MynaTrash,
  X as MynaX,
} from "@mynaui/icons-react";
import type { MynaIconsProps } from "@mynaui/icons-react";

export interface IconProps extends Omit<React.SVGProps<SVGSVGElement>, "stroke"> {
  size?: number | string;
  color?: string;
  stroke?: number | string;
  className?: string;
  "aria-hidden"?: boolean | "true" | "false";
  "aria-label"?: string;
}

/**
 * Higher-order component wrapping MynaUI icons with H1T MICRO design defaults:
 * - stroke: 1.8 (matching SPEC.md and design tokens)
 * - color: "currentColor"
 * - size: 22 px default
 * - decorative (aria-hidden) unless given an aria-label, then an image with that name
 */
export function createH1TIcon(MynaComponent: React.ComponentType<MynaIconsProps>) {
  return function H1TIconWrapper({
    size = 22,
    color = "currentColor",
    stroke = 1.8,
    className,
    "aria-hidden": ariaHidden = true,
    "aria-label": ariaLabel,
    ...rest
  }: IconProps) {
    // Decorative unless it carries a label: a labelled icon is an image with that name (an icon alone in a button)
    const decorative = ariaLabel === undefined || ariaHidden === true || ariaHidden === "true";
    return (
      <span
        className={className}
        style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}
        aria-hidden={decorative ? true : undefined}
        role={decorative ? undefined : "img"}
        aria-label={decorative ? undefined : ariaLabel}
      >
        <MynaComponent size={size} color={color} stroke={stroke} {...rest} />
      </span>
    );
  };
}

// Navigation and Layout Icons
export const IconHome = createH1TIcon(MynaHome);
export const IconGrid = createH1TIcon(MynaGrid);
export const IconPlus = createH1TIcon(MynaPlus);

// Common Action & UI Icons
export const IconEye = createH1TIcon(MynaEye);
export const IconEyeOff = createH1TIcon(MynaEyeOff);
export const IconCheck = createH1TIcon(MynaCheck);
export const IconX = createH1TIcon(MynaX);
export const IconArrowUp = createH1TIcon(MynaArrowUp);
export const IconChevronRight = createH1TIcon(MynaChevronRight);
export const IconChevronLeft = createH1TIcon(MynaChevronLeft);
export const IconChevronDown = createH1TIcon(MynaChevronDown);
export const IconSearch = createH1TIcon(MynaSearch);
export const IconTrash = createH1TIcon(MynaTrash);
/** V3's share glyph (the iOS one: an arrow rising from an open box) in place of Myna's three joined dots. One share icon for the app. */
export const SHARE_ICON_PATH = "M12 3v12M8 7l4-4 4 4M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7";
function ShareGlyph({ size = 24, color = "currentColor", stroke = 1.8, ...rest }: MynaIconsProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" {...rest}>
      <path d={SHARE_ICON_PATH} />
    </svg>
  );
}
export const IconShare = createH1TIcon(ShareGlyph);

// Domain & Feature Icons
export const IconTarget = createH1TIcon(MynaTarget);
export const IconStar = createH1TIcon(MynaStar);
export const IconSparkles = createH1TIcon(MynaSparkles);
export const IconRibbon = createH1TIcon(MynaRibbon);
