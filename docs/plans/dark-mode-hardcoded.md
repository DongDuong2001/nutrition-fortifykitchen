# Hard-coded colours in apps/web outside the @theme block

Scan: 490 source files (apps/web, excluding node_modules, .next, `__tests__/`, `tests/`, lockfiles), `.ts .tsx .css .js .mjs .json .svg .md`, plus `public/` and `scripts/`. The `@theme static` block of globals.css (lines 111-378) is excluded as asked. A hit is one colour literal (a hex, one `rgb()/rgba()/hsl()` call, one white/black/palette class, one named colour in a colour property).

## Result: the app is already almost token-clean

**Total: 30 live colour literals in 6 files.** A further 5 hits in 5 files are hex values written in comments (not colours at runtime) and are listed at the end; they are not in the total. Nothing uses a Tailwind palette class (`bg-sky-500`, `text-gray-*`, etc.: 0), `text-white` / `bg-black` (0), `hsl()/oklch()` (0), inline `style={{ color: "#..." }}` (0) or a named colour in a colour prop (0). Every `style={{ background/backgroundColor/color }}` in components reads a `var(--color-*)` token through lib helpers. The design linter `scripts/lint-design.mjs` rule D-COL-07 (raw hex outside globals.css, only for `app/` and `components/`, comments excepted, one allow-list entry: the Google logo) is what keeps it that way; it does not look at `lib/`, `public/`, `rgb()/rgba()`, or Tailwind arbitrary values.

| literal kind | count |
|---|---:|
| hex (`#RRGGBB`) | 17 live (+5 in comments) |
| `rgb()` / `rgba()` | 12 |
| `white` / `black` class (`border-white/10`) | 1 |
| palette classes, hsl, oklch, named colours | 0 |
| **total live** | **30** |

(17 hex = globals.css 8 + Google logo 4 + icon.svg 3 + pwa.ts 2; 12 rgb/rgba = globals.css 11 + switch.tsx 1.)

## Per-file counts

| area | file | live literals | what they are |
|---|---|---:|---|
| other (globals) | `app/globals.css` | 19 | see breakdown below |
| onboarding | `components/onboarding/google-sign-in-button.tsx` | 4 | Google "G" logo fills #EA4335 #4285F4 #FBBC05 #34A853 (lines 20-23) |
| other (PWA) | `lib/pwa.ts` | 2 | `PAPER_COLOR = "#F2F2F7"` (line 9), `INK_COLOR = "#111317"` (line 10), feed `app/manifest.ts` and `viewport.themeColor` |
| other (public) | `public/icons/icon.svg` | 3 | `#111317` field (line 4), `#FFFFFF` letters (line 6), `#1238D6` old cobalt bar (line 14; the app cobalt is now #2457F5) |
| shared ui | `components/ui/switch.tsx` | 1 | knob shadow `shadow-[0_1px_3px_rgba(0,0,0,0.25)]` (line 40) |
| other (dev) | `app/dev/ui/page.tsx` | 1 | `border-white/10` on the dev-only ink summary card (line 38) |
| | **6 files** | **30** | |

### app/globals.css (19) outside @theme

| lines | count | literal | role |
|---|---:|---|---|
| 41, 60 | 2 | `rgb(0 0 0 / 0.12)`, `rgb(0 0 0 / 0.16)` | `prefers-contrast: more` drop shadow of `.glass` and `.glass-tab` |
| 383 | 8 | 6 hex (#FF383C #FF8D28 #FFCC00 #34C759 #0088FF #CB30E0) + 2 `rgb(0 0 0 / ...)` | `--gradient-tile-rainbow` (a token defined in `:root`, the Minh Hào tile) |
| 439, 440 | 2 | `#B9B4AA` x2 | `prefers-contrast: more` override of `--color-card-border` and `--color-divider` |
| 442 | 1 | `rgba(17, 19, 23, 0.55)` | contrast-more `--color-scrim` |
| 443-445 | 4 | `rgb(17 19 23 / 0.32)` x3, `rgb(17 19 23 / 0.06)` | contrast-more `--shadow-ring`, `--shadow-chip`, `--shadow-card` |
| 1078, 1105 | 2 | `rgba(17, 19, 23, 0.18)` x2 | lift shadow of `.m-drag-lift[data-touch-drag="lifted"]` and `.m-drag-ghost` |
| | **19** | | |

Lines 383-445 are token definitions that live in `:root` rather than `@theme`: they are part of the token layer and get a dark pair there, not a component change. Only the four shadows on lines 41, 60, 1078 and 1105 are rules that draw something, not token definitions.

## By area (the grouping you asked for)

| area | live literals | files | suggested handling |
|---|---:|---:|---|
| Hôm nay (components/home, diary, templates, training) | 0 | 0 | nothing to swap. The colour work here is token-role work (bg-ink hero, text-cobalt links) listed in tokens.md |
| Thêm món (components/add, foods, `/add`, `/foods/new`) | 0 | 0 | none |
| Khám phá (components/explore, `/explore/**`, food detail) | 0 | 0 | none |
| Tổng quan / charts (components/overview, nutrient-detail, trends, micros) | 0 | 0 | none in literals: bars and the body-tab polyline use `bg-level-*` and `stroke-cobalt` tokens, see special.md for what charts still need |
| Cài đặt (components/settings, profile, data-sources) | 0 | 0 | none |
| onboarding (components/onboarding, auth, first-run) | 4 | 1 | leave: third-party brand mark, already allow-listed in lint-design. Check it on #1C1C1E: the Google "G" on a dark button is allowed by Google's guidelines only on a white or light button, so keep the button face light (or use Google's dark-theme button asset) |
| share image / canvas | 0 | 0 | no literal; the PNG is drawn from the DOM (html-to-image) and one computed colour, see "Non-literal colour decisions" |
| shared ui (components/ui) | 1 | 1 | `switch.tsx` knob shadow: needs a small shadow token (e.g. `--shadow-knob`) with a dark value; also decide the knob colour, see special.md |
| other | 25 | 4 | globals.css 19: add dark pairs inside the token layer (contrast-more overrides, rainbow stops, glass-more shadows, drag-lift shadow tokenised as `--shadow-lift`); `lib/pwa.ts` + manifest + `viewport.themeColor`: needs special treatment (a manifest cannot read CSS; theme-color needs `media` variants); `public/icons/icon.svg`: needs special treatment (keep as is; fixed brand icon, ink field works in dark; fix the stale #1238D6 only if the icon is regenerated); `app/dev/ui/page.tsx`: token swap (`border-white/10` -> a `border-press-on-dark` style token) or leave, dev-only |

## Non-literal colour decisions (not counted above, still dark-relevant)

| file:line | what | note |
|---|---|---|
| `app/layout.tsx:56` | `viewport.themeColor: INK_COLOR` (one value, no `media`) | emits a single `<meta name="theme-color" content="#111317">` |
| `app/layout.tsx:49` | `appleWebApp.statusBarStyle: "black-translucent"` | named value; already dark-friendly, see special.md |
| `app/manifest.ts:17-18` | `background_color: PAPER_COLOR`, `theme_color: INK_COLOR` | one manifest, no dark variant exists in the spec |
| `app/globals.css:432` | `:root { color-scheme: light }` | must become `light dark` (or be set per `[data-theme]`) or form controls, scrollbars and the iOS rubber band stay light |
| `app/globals.css:455` | `-webkit-tap-highlight-color: transparent` | no change |
| `components/home/share-sheet.tsx:185, 194, 209` | `getComputedStyle(footer).backgroundColor` fed to `toSvg({ backgroundColor })` and `context.fillStyle = ink` | a computed colour, so it follows whichever theme is active when the sheet renders |
| `components/ui/chip-scroller.tsx:72` | `linear-gradient(... transparent ..., currentColor ...)` as a mask | alpha only, theme-proof |
| `components/landing/stacking-audiences.tsx:159` | `dark:text-sky` (the only `dark:` class in the repo) | dead today (no `dark` variant is configured; Tailwind v4 `dark:` follows `prefers-color-scheme`, so it would fire on a dark OS once any of this ships) |
| `components/landing/kiln-wordmark-footer.tsx:459-462` | props default to `var(--color-cobalt/ink/kiln-paper)` | tokens, fine |

## Hex values that appear only in comments (5, not counted)

`components/foods/entry-editor.tsx:23` (#EEEEF3), `components/foods/food-field.tsx:7` (#EEEEF3), `components/training/duration-selector.tsx:16` (#E3E3E8), `components/ui/segmented.tsx:16` (#E3E3E8), `lib/pwa.ts:8` (#F2F2F7). Tests (outside scope, 2 files, 5 hits): `lib/__tests__/tab-colors.test.ts` (4: `#000000`, `#1C1C1E` ...), `lib/__tests__/token-contrast.test.ts` (1). `token-contrast.test.ts` and `tab-colors.test.ts` read light values from globals.css through `lib/__tests__/css-tokens.ts`; a dark run needs the same pairs checked against the dark map (tokens.md lists the pairs most at risk: destructive white-on-fill, `#FF4245` with white text is about 3.5:1).

## Commands used

```
python3 hc.py   # the scanner; regexes below, run over the 490 files, globals.css lines 111-378 skipped
HEX   #(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})(?![\w-])
FUNC  (?<![A-Za-z0-9-])(?:rgba?|hsla?|oklch|oklab|lab|lch|hwb)\(
CLS   (?<![\w-])(bg|text|border(-[trblxyse])?|ring(-offset)?|outline|fill|stroke|from|via|to|divide|decoration|accent|caret|placeholder|shadow|inset-ring)-(white|black)(?![\w-])(/\d+|/\[[^\]]+\])?
PAL   same prefixes + -(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(50..950)
NAMED (fill|stroke|color|stopColor|background(Color)?|borderColor|boxShadow|fillStyle|strokeStyle|shadowColor)\s*[=:(]\s*{?["'`]?(white|black|red|blue|green|yellow|orange|purple|pink|gray|grey|silver|gold|navy|teal|cyan|magenta|brown)
# cross-checks
grep -rnIE '#[0-9A-Fa-f]{3,8}\b|rgba?\(|hsla?\(' app components lib hooks scripts public middleware.ts next.config.ts | grep -v __tests__ | grep -v app/globals.css
grep -rnIE "(bg|text|border|ring|fill|stroke|from|via|to|shadow)-\[(#|rgb|hsl)" app components lib
grep -rnIwE 'white|black' app components lib hooks scripts public
grep -rnIE 'fillStyle|strokeStyle|shadowColor|addColorStop|getContext\(|themeColor|theme_color|background_color|statusBarStyle|color-scheme|apple-mobile' app components lib hooks public
grep -rnE '(^|[\s"`:])dark:' app components lib
```
