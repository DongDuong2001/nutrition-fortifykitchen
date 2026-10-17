"use client";

import React from "react";
import * as Myna from "@mynaui/icons-react";

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
export function createH1TIcon(MynaComponent: React.ComponentType<Myna.MynaIconsProps>) {
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
export const IconHome = createH1TIcon(Myna.Home);
export const IconGrid = createH1TIcon(Myna.Grid);
export const IconCompass = createH1TIcon(Myna.Compass);
export const IconCog = createH1TIcon(Myna.Cog);
export const IconPlus = createH1TIcon(Myna.Plus);

// Common Action & UI Icons
export const IconEye = createH1TIcon(Myna.Eye);
export const IconEyeOff = createH1TIcon(Myna.EyeOff);
export const IconCheck = createH1TIcon(Myna.Check);
export const IconX = createH1TIcon(Myna.X);
export const IconArrowUp = createH1TIcon(Myna.ArrowUp);
export const IconChevronRight = createH1TIcon(Myna.ChevronRight);
export const IconChevronLeft = createH1TIcon(Myna.ChevronLeft);
export const IconChevronDown = createH1TIcon(Myna.ChevronDown);
export const IconSearch = createH1TIcon(Myna.Search);
export const IconTrash = createH1TIcon(Myna.Trash);
export const IconShare = createH1TIcon(Myna.Share);
export const IconLink = createH1TIcon(Myna.Link);

// Domain & Feature Icons
export const IconTarget = createH1TIcon(Myna.Target);
export const IconUser = createH1TIcon(Myna.User);
export const IconBell = createH1TIcon(Myna.Bell);
export const IconFlame = createH1TIcon(Myna.Flame);
export const IconHeart = createH1TIcon(Myna.Heart);
export const IconStar = createH1TIcon(Myna.Star);
export const IconSparkles = createH1TIcon(Myna.Sparkles);
export const IconBadge = createH1TIcon(Myna.Badge);
export const IconRibbon = createH1TIcon(Myna.Ribbon);
export const IconDiamond = createH1TIcon(Myna.Diamond);
