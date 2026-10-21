import { readFileSync } from "node:fs";
import { join } from "node:path";

// Reads the colour tokens of app/globals.css for the contrast tests, so no hex is copied into a test. A token that is a
// var() of another token resolves through it. Not a test file itself (vitest runs *.test.ts only).

const css = readFileSync(join(__dirname, "../../app/globals.css"), "utf8");
// `@theme static`: Tailwind v4 drops theme variables no utility uses, but lib/nutrient-colors and lib/food-group-colors name
// tokens in a template string (var(--color-deep-cyan), --color-tile-*), which the scanner cannot see: static keeps them all.
const themeStart = css.indexOf("@theme static {");
const theme = css.slice(themeStart, css.indexOf("\n}", themeStart));

/** The light value of `--color-<name>` as #RRGGBB, resolving var() chains; "" when it is missing or not a hex. */
export function token(name: string): string {
  const value = theme.match(new RegExp(`--color-${name}:\\s*([^;]+);`))?.[1]?.trim() ?? "";
  const ref = value.match(/^var\(--color-([\w-]+)\)$/);
  if (ref) return token(ref[1]);
  return /^#[0-9A-Fa-f]{6}$/.test(value) ? value.toUpperCase() : "";
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio of two #RRGGBB colours. */
export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
