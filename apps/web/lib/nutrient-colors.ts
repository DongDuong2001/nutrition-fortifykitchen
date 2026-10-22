// V3-SPEC §1: one colour per vitamin and mineral, used everywhere the nutrient shows (the row dot, the Giàu tile, the
// detail accent bar, the "Thiếu nhất" chip, the trend line). The values are the Apple system colour tokens in
// app/globals.css; the dot uses the deep shade in light (the dark column later). Đạm and Chất xơ tiles stay ink.

export type SystemColor =
  | "red"
  | "orange"
  | "yellow"
  | "green"
  | "mint"
  | "teal"
  | "cyan"
  | "blue"
  | "indigo"
  | "purple"
  | "pink"
  | "brown";

export const NUTRIENT_COLORS: Record<string, SystemColor> = {
  // minerals
  calcium: "cyan",
  iron: "red",
  potassium: "purple",
  magnesium: "indigo",
  zinc: "teal",
  sodium: "blue",
  phosphorus: "mint",
  copper: "brown",
  selenium: "green",
  manganese: "pink",
  // vitamins
  vitamin_a: "pink",
  b1: "brown",
  b2: "cyan",
  b3: "blue",
  b5: "indigo",
  b6: "purple",
  b12: "red",
  folate: "mint",
  vitamin_c: "orange",
  vitamin_d: "yellow",
  vitamin_e: "green",
  vitamin_k: "teal",
};

/** The nutrient's system colour; a mineral the table has no row for is yellow. */
export function nutrientColor(id: string): SystemColor {
  return NUTRIENT_COLORS[id] ?? "yellow";
}

/** Fill colour (a tile, a bar accent, a trend line): the base system colour. */
export function nutrientFill(id: string): string {
  return `var(--color-sys-${nutrientColor(id)})`;
}

/** The dot before a nutrient's name and any text in its colour: the deep shade, 4,5:1 on white. */
export function nutrientDot(id: string): string {
  return `var(--color-deep-${nutrientColor(id)})`;
}
