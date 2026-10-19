"use client";

import React from "react";
import {
  ArrowUp as MynaArrowUp,
  Badge as MynaBadge,
  Bell as MynaBell,
  Check as MynaCheck,
  ChevronDown as MynaChevronDown,
  ChevronLeft as MynaChevronLeft,
  ChevronRight as MynaChevronRight,
  Cog as MynaCog,
  Compass as MynaCompass,
  Diamond as MynaDiamond,
  Eye as MynaEye,
  EyeOff as MynaEyeOff,
  Flame as MynaFlame,
  Grid as MynaGrid,
  Heart as MynaHeart,
  Home as MynaHome,
  Link as MynaLink,
  Plus as MynaPlus,
  Ribbon as MynaRibbon,
  Search as MynaSearch,
  Share as MynaShare,
  Sparkles as MynaSparkles,
  Star as MynaStar,
  Target as MynaTarget,
  Trash as MynaTrash,
  User as MynaUser,
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
export const IconCompass = createH1TIcon(MynaCompass);
export const IconCog = createH1TIcon(MynaCog);
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
export const IconShare = createH1TIcon(MynaShare);
export const IconLink = createH1TIcon(MynaLink);

// Domain & Feature Icons
export const IconTarget = createH1TIcon(MynaTarget);
export const IconUser = createH1TIcon(MynaUser);
export const IconBell = createH1TIcon(MynaBell);
export const IconFlame = createH1TIcon(MynaFlame);
export const IconHeart = createH1TIcon(MynaHeart);
export const IconStar = createH1TIcon(MynaStar);
export const IconSparkles = createH1TIcon(MynaSparkles);
export const IconBadge = createH1TIcon(MynaBadge);
export const IconRibbon = createH1TIcon(MynaRibbon);
export const IconDiamond = createH1TIcon(MynaDiamond);
