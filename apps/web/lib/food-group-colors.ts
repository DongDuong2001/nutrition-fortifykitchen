import type { FoodFilter } from "./food-categories";

// V3-SPEC §1 and §5: the colour of each food group's icon tile (components/ui/icon-tile.tsx), also the group's accent on
// its list page. The tile is a vertical gradient of three tokens, --color-tile-<colour>-hi, -base and -lo
// (design/v3/icons/IconTile.dc.html); Minh Hào is the rainbow tile.

export type FoodGroupColor =
  | "yellow"
  | "indigo"
  | "green"
  | "blue"
  | "cyan"
  | "orange"
  | "red"
  | "teal"
  | "purple"
  | "mint"
  | "brown"
  | "cobalt"
  | "ink"
  | "pink"
  | "rainbow";

export const FOOD_GROUP_COLORS: Record<FoodFilter, FoodGroupColor> = {
  tinh_bot: "yellow",
  dam: "indigo",
  beo: "green",
  sua: "blue",
  do_uong: "cyan",
  rau: "orange",
  trai_cay: "red",
  mon_viet: "teal",
  an_vat: "purple",
  bo_sung: "mint",
  gia_vi: "brown",
  cua_toi: "cobalt",
  all: "ink",
  favorite: "pink",
  minh_hao: "rainbow",
};

/** The tile's background: the three-stop vertical gradient, or the rainbow for Minh Hào. */
export function foodGroupTileBackground(key: FoodFilter): string {
  const colour = FOOD_GROUP_COLORS[key];
  if (colour === "rainbow") return "var(--gradient-tile-rainbow)";
  return `linear-gradient(180deg, var(--color-tile-${colour}-hi) 0%, var(--color-tile-${colour}-base) 45%, var(--color-tile-${colour}-lo) 100%)`;
}

/** A thin accent (a bar, a title rule) in the group's colour; the rainbow group uses cobalt there. */
export function foodGroupAccent(key: FoodFilter): string {
  const colour = FOOD_GROUP_COLORS[key];
  return colour === "rainbow" ? "var(--color-cobalt)" : `var(--color-tile-${colour}-base)`;
}
