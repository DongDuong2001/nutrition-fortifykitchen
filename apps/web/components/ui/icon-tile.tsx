import React from "react";
import type { FoodFilter } from "@/lib/food-categories";
import { FOOD_GROUP_COLORS, foodGroupTileBackground } from "@/lib/food-group-colors";

/**
 * The food-group icon tile (design/v3/icons/IconTile.dc.html, V3-SPEC §5), one component with the same keys. A vertical
 * three-stop gradient in the group's colour (lib/food-group-colors), radius 0.27 × size, a top highlight and a soft
 * shadow; a white line glyph at about 62 % of the size, the paths copied from the design file. Minh Hào is the rainbow
 * tile. Sizes: 32 in the Khám phá group list, 20 in chips, 36 in a group page's title row, 48 or more on a board.
 * Decorative (aria-hidden): the label always sits beside it (D-COL-04).
 */
const GLYPHS: Record<FoodFilter, React.ReactNode> = {
  tinh_bot: (
    <>
      <path d="M12 22V9" />
      <path d="M12 8.6C10.4 7.2 10.4 4.6 12 2.6 13.6 4.6 13.6 7.2 12 8.6z" />
      <path d="M11.4 13.6C8.8 13.3 7.4 11.3 7.2 8.8c2.6.3 4 2.3 4.2 4.8z" />
      <path d="M12.6 13.6c2.6-.3 4-2.3 4.2-4.8-2.6.3-4 2.3-4.2 4.8z" />
      <path d="M11.4 19c-2.6-.3-4-2.3-4.2-4.8 2.6.3 4 2.3 4.2 4.8z" />
      <path d="M12.6 19c2.6-.3 4-2.3 4.2-4.8-2.6.3-4 2.3-4.2 4.8z" />
    </>
  ),
  dam: (
    <>
      <path d="M2.6 12c2.4-3.8 5.6-5.8 9-5.8 2.6 0 4.5 1.4 5.6 3.4L21.4 7v10l-4.2-2.6c-1.1 2-3 3.4-5.6 3.4-3.4 0-6.6-2-9-5.8z" />
      <circle cx="8" cy="11" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  beo: (
    <>
      <path d="M12 2.8c-2.8 0-4.5 3.2-5.2 6.6-.9 4.3 1.5 11.8 5.2 11.8s6.1-7.5 5.2-11.8C16.5 6 14.8 2.8 12 2.8z" />
      <circle cx="12" cy="14.6" r="2.7" fill="currentColor" stroke="none" />
    </>
  ),
  sua: (
    <>
      <path d="M7 9.4 9.2 3h5.6L17 9.4V20a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 7 20z" />
      <path d="M7 9.4h10" />
      <circle cx="12" cy="15.6" r="1.1" fill="currentColor" stroke="none" />
    </>
  ),
  do_uong: (
    <>
      <path d="M6 9h12l-1.4 11.2a1.5 1.5 0 0 1-1.5 1.3H8.9a1.5 1.5 0 0 1-1.5-1.3z" />
      <path d="M13 9l1.8-6.5H19" />
      <path d="M6.9 14.5h10.2" />
    </>
  ),
  rau: (
    <>
      <path d="M15.9 8.1c-1.7-1.7-4.4-1.6-6.1.1L3.1 20c-.4.6.3 1.3.9.9l11.8-6.7c1.7-1.7 1.8-4.4.1-6.1z" />
      <path d="M15.9 8.1c-.4-2.4.2-4.3 1.9-5.9" />
      <path d="M15.9 8.1c2.4.4 4.3-.2 5.9-1.9" />
    </>
  ),
  trai_cay: (
    <>
      <path d="M12 8c-1.8-1.3-4.9-1.5-6.6.8-1.9 2.6-1.4 7 .6 9.9 1.5 2.1 3.6 3.2 6 2.1 2.4 1.1 4.5 0 6-2.1 2-2.9 2.5-7.3.6-9.9C16.9 6.5 13.8 6.7 12 8z" />
      <path d="M12 8c0-2 .6-3.8 2-5.2" />
    </>
  ),
  mon_viet: (
    <>
      <path d="M3 12h18a9 9 0 0 1-18 0z" />
      <path d="M9.5 8.2 17 2.6" />
      <path d="M13.4 8.6 20.4 4.2" />
    </>
  ),
  an_vat: (
    <>
      <path d="M12 3a9 9 0 1 0 9 9C18.5 12 17 10.5 17 8 14.5 8 12 6 12 3z" />
      <circle cx="8.4" cy="10.2" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="10.2" cy="16" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="15.6" cy="15.8" r="1.1" fill="currentColor" stroke="none" />
    </>
  ),
  bo_sung: (
    <g transform="rotate(-45 12 12)">
      <rect x="2.6" y="7.4" width="18.8" height="9.2" rx="4.6" />
      <path d="M12 7.4v9.2" />
    </g>
  ),
  gia_vi: (
    <>
      <path d="M16.7 7.3c-1.4-.6-3-.2-3.9 1.1C10.4 12 7.9 16.5 3.2 20c-.6.5-.3 1.5.5 1.5 6-.2 11-3.9 13.6-9.3.8-1.6.5-3.6-.6-4.9z" />
      <path d="M16.7 7.3c.5-1.7.2-3.3-1-4.6" />
    </>
  ),
  cua_toi: <path d="M7 21v-6.5c-2.5-.4-4-2.4-4-4.7 0-2.5 2.2-4.5 4.9-4.2C8.8 3.6 10.2 2.6 12 2.6s3.2 1 4.1 3C18.8 5.3 21 7.3 21 9.8c0 2.3-1.5 4.3-4 4.7V21z" />,
  all: (
    <>
      <rect x="3" y="3" width="6.6" height="6.6" rx="2" />
      <rect x="14.4" y="3" width="6.6" height="6.6" rx="2" />
      <rect x="3" y="14.4" width="6.6" height="6.6" rx="2" />
      <rect x="14.4" y="14.4" width="6.6" height="6.6" rx="2" />
    </>
  ),
  favorite: <path d="M12 20.5S3 15 3 8.8C3 6 5 4 7.5 4c1.8 0 3.3 1 4.5 2.8C13.2 5 14.7 4 16.5 4 19 4 21 6 21 8.8 21 15 12 20.5 12 20.5z" />,
  minh_hao: (
    <>
      <path d="M14.5 4.5c.6 4.2 2.8 6.4 7 8-4.2 1.6-6.4 3.8-7 8-.6-4.2-2.8-6.4-7-8 4.2-1.6 6.4-3.8 7-8z" />
      <path d="M5.6 2.4c.3 1.9 1.1 2.7 3 3.1-1.9.4-2.7 1.2-3 3.1-.3-1.9-1.1-2.7-3-3.1 1.9-.4 2.7-1.2 3-3.1z" fill="currentColor" />
    </>
  ),
};

export const ICON_TILE_KEYS = Object.keys(GLYPHS) as FoodFilter[];

export function IconTile({ k, size = 32, className = "" }: { k: FoodFilter; size?: number; className?: string }) {
  const glyph = Math.round(size * 0.62);
  // about size/16 on the tile (2.2 units on the 24 grid), never under 1.5 px
  const stroke = Math.round(Math.max(2.2, 1.5 / (glyph / 24)) * 100) / 100;
  return (
    <span
      aria-hidden="true"
      data-icon-tile={k}
      className={`inline-flex shrink-0 items-center justify-center text-on-accent ${FOOD_GROUP_COLORS[k] === "ink" ? "shadow-tile-ink" : "shadow-tile"} ${className}`}
      style={{ width: size, height: size, borderRadius: Math.round(size * 0.27), background: foodGroupTileBackground(k) }}
    >
      <svg
        viewBox="0 0 24 24"
        width={glyph}
        height={glyph}
        fill="none"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinejoin="round"
        strokeLinecap="round"
        className="block overflow-visible drop-shadow-tile-glyph"
      >
        {GLYPHS[k]}
      </svg>
    </span>
  );
}
