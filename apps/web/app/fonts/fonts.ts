import localFont from "next/font/local";

// Self-hosted copies of what next/font/google fetched at build time, so a build never depends on Google Fonts answering
// (CI and the VPS failed when it did not). The files are Google's own latin and vietnamese slices, byte for byte; each
// slice is one call with Google's unicode-range, under the real family name, so the CSS is the same as before: same
// families, weights, styles, font-display and preloads. The size-adjusted Arial fallbacks ("… Fallback") are the
// @font-face rules at the top of globals.css, with Google's numbers. SIL Open Font License 1.1 (README.md here).
// next/font only reads literal options, so the ranges are written out in each call.

export const manrope = localFont({
  src: [
    { path: "./manrope-latin.woff2", weight: "400", style: "normal" },
    { path: "./manrope-latin.woff2", weight: "600", style: "normal" },
    { path: "./manrope-latin.woff2", weight: "700", style: "normal" },
  ],
  declarations: [
    { prop: "font-family", value: "Manrope" },
    {
      prop: "unicode-range",
      value:
        "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD",
    },
  ],
  variable: "--font-manrope-face",
  display: "swap",
  adjustFontFallback: false,
  fallback: ["'Manrope Fallback'"],
});

export const manropeVi = localFont({
  src: [
    { path: "./manrope-vietnamese.woff2", weight: "400", style: "normal" },
    { path: "./manrope-vietnamese.woff2", weight: "600", style: "normal" },
    { path: "./manrope-vietnamese.woff2", weight: "700", style: "normal" },
  ],
  declarations: [
    { prop: "font-family", value: "Manrope" },
    {
      prop: "unicode-range",
      value:
        "U+0102-0103, U+0110-0111, U+0128-0129, U+0168-0169, U+01A0-01A1, U+01AF-01B0, U+0300-0301, U+0303-0304, U+0308-0309, U+0323, U+0329, U+1EA0-1EF9, U+20AB",
    },
  ],
  variable: "--font-manrope-face",
  display: "swap",
  adjustFontFallback: false,
  fallback: ["'Manrope Fallback'"],
});

// V3-SPEC §2: Saira italic 800/900 for headers and key numbers. Only the italic face is loaded, so every font-display
// text is italic without a class on each element.
export const saira = localFont({
  src: [
    { path: "./saira-italic-latin.woff2", weight: "800", style: "italic" },
    { path: "./saira-italic-latin.woff2", weight: "900", style: "italic" },
  ],
  declarations: [
    { prop: "font-family", value: "Saira" },
    { prop: "font-stretch", value: "100%" },
    {
      prop: "unicode-range",
      value:
        "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD",
    },
  ],
  variable: "--font-saira-face",
  display: "swap",
  adjustFontFallback: false,
  fallback: ["'Saira Fallback'"],
});

export const sairaVi = localFont({
  src: [
    { path: "./saira-italic-vietnamese.woff2", weight: "800", style: "italic" },
    { path: "./saira-italic-vietnamese.woff2", weight: "900", style: "italic" },
  ],
  declarations: [
    { prop: "font-family", value: "Saira" },
    { prop: "font-stretch", value: "100%" },
    {
      prop: "unicode-range",
      value:
        "U+0102-0103, U+0110-0111, U+0128-0129, U+0168-0169, U+01A0-01A1, U+01AF-01B0, U+0300-0301, U+0303-0304, U+0308-0309, U+0323, U+0329, U+1EA0-1EF9, U+20AB",
    },
  ],
  variable: "--font-saira-face",
  display: "swap",
  adjustFontFallback: false,
  fallback: ["'Saira Fallback'"],
});

// V3 keeps Saira Condensed for the tight numbers: the hero's macro grams and %, the meal kcal (font-condensed)
export const sairaCondensed = localFont({
  src: [
    { path: "./saira-condensed-800-latin.woff2", weight: "800", style: "normal" },
    { path: "./saira-condensed-900-latin.woff2", weight: "900", style: "normal" },
  ],
  declarations: [
    { prop: "font-family", value: "Saira Condensed" },
    {
      prop: "unicode-range",
      value:
        "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD",
    },
  ],
  variable: "--font-saira-condensed-face",
  display: "swap",
  adjustFontFallback: false,
  fallback: ["'Saira Condensed Fallback'"],
});

export const sairaCondensedVi = localFont({
  src: [
    { path: "./saira-condensed-800-vietnamese.woff2", weight: "800", style: "normal" },
    { path: "./saira-condensed-900-vietnamese.woff2", weight: "900", style: "normal" },
  ],
  declarations: [
    { prop: "font-family", value: "Saira Condensed" },
    {
      prop: "unicode-range",
      value:
        "U+0102-0103, U+0110-0111, U+0128-0129, U+0168-0169, U+01A0-01A1, U+01AF-01B0, U+0300-0301, U+0303-0304, U+0308-0309, U+0323, U+0329, U+1EA0-1EF9, U+20AB",
    },
  ],
  variable: "--font-saira-condensed-face",
  display: "swap",
  adjustFontFallback: false,
  fallback: ["'Saira Condensed Fallback'"],
});

/** The class list for <html>: each call's variable class (both slices of a family set the same value). */
export const FONT_VARIABLES = [manrope, manropeVi, saira, sairaVi, sairaCondensed, sairaCondensedVi]
  .map((f) => f.variable)
  .join(" ");
