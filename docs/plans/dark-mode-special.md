# Screens and components that need more than a token swap

Paths are relative to `apps/web/`. "V3" values come from `design/v3/V3-SPEC.md` and the `dark` prop palette inside `design/v3/screens/*.dc.html` (read through `V3HomNayB.dc.html` unless another file is named; the `c`, `sys` and `gl` maps are identical across the 40 screens). Counts come from the greps listed at the bottom.

Mechanism note: the tokens are in `@theme static`, so Tailwind emits them as `:root { --color-x: ... }` and every utility reads `var(--color-x)`. A dark map is therefore one override block (`@media (prefers-color-scheme: dark) { :root { ... } }` and/or `:root[data-theme="dark"]`) with no component change, *except* for the cases below, where one token plays several roles or a literal / computed colour is involved.

## 1. One token, several roles (the biggest item)

| token | role split | files |
|---|---|---|
| `--color-ink` | `bg-ink` 47 uses = a dark slab (hero, toast, meal bar, selected chip, header summary, footer); `text-ink` 24 = body text colour; `border-ink` 2. In dark: slab #1C1C1E (hero, header, footer; V3 c.hero/c.header, plus the 1 px edge `inset 0 0 0 1px #38383A` = c.heroEdge), toast and meal bar #2C2C2E (c.toast, c.mealBar), selected chip **inverts** to bg #FFFFFF with #111317 text (c.chipOn, c.chipOnText), text #FFFFFF | 34 files use `bg-ink`: `components/home/home-hero.tsx`, `home-screen.tsx`, `share-day.tsx`, `template-picker-sheet.tsx`; `components/overview/parts/hero-card.tsx`, `day-bars.tsx`, `energy-tab.tsx`, `micro-card.tsx`; `components/ui/chip.tsx` (selected chip `bg-ink text-on-dark`), `chip-group.tsx`, `chip-scroller.tsx`, `app-header.tsx:310` (summary), `portion-area.tsx`, `portion-panel.tsx`; `components/add/add-tray.tsx`; `components/settings/profile-cards.tsx`, `macro-targets-screen.tsx`, `settings-home-screen.tsx`; `components/pwa/install-panel.tsx`; `components/training/salt-summary-card.tsx`; `components/link-page/coach-header.tsx`; `components/onboarding/auth-shell.tsx`; `components/explore/rich-carousel.tsx`; `components/landing/*`; `app/(app)/micros/page.tsx`, `micros/[nutrient]/page.tsx`, `training/page.tsx`, `foods/new/page.tsx`, `app/page.tsx`, `app/not-found.tsx` |
| `--color-text` | alias of `--color-ink`; text must go white while the slab stays dark, so the alias has to be cut | globals.css `--color-text: var(--color-ink)` |
| `--color-cobalt` | `text-cobalt` 139 = link/accent text -> #5CB8FF (V3 c.link); `bg-cobalt` 81 = buttons -> stay #2457F5 (c.cobalt); `outline-cobalt` 17 + the global `:focus-visible` outline (globals.css), `ring-cobalt` 16, `border-cobalt` 22: not in V3, propose #5CB8FF for the focus ring | 109 files; global `a { color: var(--color-cobalt) }` in globals.css `@layer base` is a link, so #5CB8FF |
| `--color-on-accent` | white on cobalt stays white; on a destructive fill V3 flips to #111317 (V3DeleteAccount c.onDestructive) because white on #FF4245 is about 3.5:1 | the white-on-fill cases are `components/ui/pill-button.tsx:51` (destructive variant `bg-destructive text-on-accent`) and `app/(app)/admin/review/page.tsx:54` (`bg-destructive-text text-on-accent`); they need a new `--color-on-destructive` |
| `--color-macro-kcal-text` | alias of cobalt; dark value #5CB8FF (V3Compare MAC.energy) | `components/foods/compare-table.tsx:14`, home/overview macro rows |
| `bg-card` meaning "white" | the Switch knob uses `bg-card` as plain white; in dark `bg-card` is #1C1C1E, the knob would turn near-black | `components/ui/switch.tsx:40` (knob also has the literal shadow `shadow-[0_1px_3px_rgba(0,0,0,0.25)]`, tokenise it); Apple's dark knob stays white |
| selected segment | `components/ui/segmented.tsx:56` selected pill is `bg-raised` + `shadow-[0_0_0_1px_var(--color-card-border)]`; dark = #636366 (V3Micros / V3Compare segOn), which is **not** `--color-raised` (#2C2C2E). Needs `--color-seg-selected`. Tab-coloured variant (`bg-tab-teal text-on-accent`, line 55) needs `--color-tab-teal` = #00D2E0 with dark text (white on #00D2E0 fails) | `components/ui/segmented.tsx`, `components/training/duration-selector.tsx` |

## 2. Images and photos

- There are **no content photos**: no `next/image`, no CSS `url()`, no food pictures. `COACH.photo` (`lib/coach-links.ts`, rendered in `components/link-page/coach-header.tsx:35`, `object-cover`) and `FORTIFY_KITCHEN.logo` (`lib/fortify-kitchen.ts`, rendered in `app/page.tsx:37`) are both `null` today; if a coach photo/logo is supplied later, give the avatar a hairline ring (#38383A) and check a transparent-background logo on #1C1C1E.
- Raster app icons are fixed ink squares (`public/icons/icon-192.png`, `icon-512.png`, `icon-512-maskable.png`, `apple-touch-icon.png`, `favicon.ico`, source `public/icons/icon.svg`): used at `app/install/page.tsx:23`, `components/pwa/install-sheet.tsx:127`, `components/link-page/access-row.tsx:56`. They read fine on dark; no change. (`icon.svg` still has the old cobalt `#1238D6`; regenerate with `node scripts/icons.mjs` only if the icon is touched.)
- `components/home/share-sheet.tsx:416` shows the generated share PNG in an `<img data-share-image>` with `border-card-border` and `rounded-card`: the border token handles dark; the picture itself is covered in section 3.
- The Google "G" (`components/onboarding/google-sign-in-button.tsx:20-23`, 4 fills) is a brand mark with its own colours; keep it and keep the button face light, or use Google's dark-theme asset.

## 3. Share image (html-to-image + canvas)

Files: `components/home/share-sheet.tsx` (rasteriser), `components/home/share-day.tsx` (the 390 px DOM that is drawn), `components/home/home-hero.tsx` (`share` prop), `components/profile/level-badge.tsx`, `lib/share-card.ts`, `lib/share-card.ts:75` (`shareMealDot`).

- No literal colour. `share-sheet.tsx:185` reads `getComputedStyle(footer ?? node).backgroundColor` (the footer's `bg-ink`), passes it to `toSvg({ backgroundColor })` (line 194) and paints `context.fillStyle = ink` (line 209) on a 2-D canvas before `drawImage`. Because html-to-image writes computed styles into the clone, the PNG takes whatever theme is active when it is rendered.
- Decision needed: **pin the picture to one theme** or let it follow the app. V3ShareB.dc.html has a dark palette (page #000, hero and cards #1C1C1E, footer #1C1C1E with `border-top: 1px solid #38383A`, meal dots from the sys dark column), so following the app is supported. If it follows: the root `bg-ink` (line 195) and footer `bg-ink` (line 255) resolve through the split `--color-ink`, so the footer border-top must be added for dark, the rounded-corner fill `ink` must equal the dark page, and the hero edge ring needs `--shadow-hero-edge`. Cheaper alternative: wrap the offscreen host (`share-sheet.tsx:226`, the `<ShareDay>` mount) in `data-theme="light"` so every recipient gets the same picture.
- `LevelBadge` (`components/profile/level-badge.tsx`) sets colours inline from tokens (`paper-dark`, `sky`, `cobalt`, `ink`, `gold`, `on-dark`) and a `0 2px 0 <token>` shadow: L0 uses `--color-paper-dark` (a hover token) as its fill, L3/L4 use `bg-ink`; each needs a dark look (`paper-dark` #48484A is proposed, no source).
- `lib/__tests__` for the share (`share-card`) measure layout, not colour; no test change except the contrast ones below.

## 4. Charts, bars, level colours

Files: `components/ui/level-bar.tsx` (track `bg-track` on cards, `bg-level-empty-dark` on the hero; fill = inline `backgroundColor` from `lib/levels.ts getLevelColor/getEmptySegmentColor`), `lib/levels.ts`, `components/ui/step-bars.tsx`, `components/overview/parts/day-bars.tsx`, `nutrient-bars.tsx`, `nutrient-grid.tsx`, `day-fill.ts`, `components/overview/micros-tab.tsx`, `energy-tab.tsx`, `scoreboard.tsx`, `components/nutrient-detail/nutrient-history.tsx`, `components/foods/food-micros.tsx`, `components/home/nutrient-column.tsx`, `home-hero.tsx`, `app/(app)/micros/page.tsx`; legend swatches in `components/onboarding/onboarding-layer.tsx:53-56`, `components/coaching/level-explainer-sheet.tsx`.

- Level colours (thieu / trungbinh / gandu / dat) are aliases of `sys-red/yellow/mint/green`, so they pick up the V3 dark column automatically (#FF4245, #FFD600, #00DAC3, #30D158). Bars always show their %; text on a bar must use the `deep-*`/`level` text variant mapped to the same dark column.
- Track colours: card bars `--color-track` -> #38383A (V3 c.track); hero bars `--color-level-empty-dark` -> #3A3A3C (c.heroTrack). `bg-level-empty` has 37 uses; a few are not bars (the Switch off-track in `components/ui/switch.tsx`, the loading skeleton in `components/home/share-sheet.tsx`): the V3 value #38383A is acceptable for those too.
- The one real chart, the Cân nặng polyline in `components/overview/body-tab.tsx:65` (`stroke-cobalt`, `vectorEffect`), and its dots/selection halo: V3TrendsBody says "cobalt in light, sky in dark" (accent #5CB8FF, selected-dot halo `rgba(92,184,255,0.35)`), so `stroke-cobalt` must resolve to the link value, not the button blue. Trend lines of nutrients use `nutrientFill()` (sys colours), fine.
- Nutrient dots and trend lines use `var(--color-deep-<c>)` / `var(--color-sys-<c>)` built in template strings (`lib/nutrient-colors.ts:53,58`, `lib/food-group-colors.ts:46,52,60`): the rule is "dot = deep in light, sys dark column in dark", so **`--color-deep-*` must be redefined to the dark column** (done in tokens.md), otherwise dark dots stay at the light deep values (#A16A00 yellow, #008932 green fail on #1C1C1E).
- Contrast tests: `lib/__tests__/token-contrast.test.ts` (43 text/surface pairs) and `tab-colors.test.ts` read light tokens through `lib/__tests__/css-tokens.ts`; add a dark run (the pairs most at risk are `on-accent` on `destructive`, `secondary` #AEAEB2 on #3A3A3C chips, and the tab teal/orange text over the 0.82 dark glass).

## 5. Glass and blur surfaces

Utilities `.glass`, `.glass-tab`, `.glass-bar`, `.glass-cobalt` and `.tab-wash(-home/-overview/-explore)` (globals.css lines 28-105). Users: `components/ui/bottom-nav.tsx:59,71`, `components/first-run/setup-gate.tsx:46`, `components/ui/sheet.tsx:275,282`, `components/ui/portion-panel.tsx:51,156,158`, `components/add/add-screen.tsx:169,927,957,959`, `components/ui/toast.tsx:95`, `components/ui/app-header.tsx:72,99`, `components/ui/app-shell.tsx:56`, `components/ui/chip-group.tsx:32`, `components/ui/chip-scroller.tsx:20`, `components/home/home-screen.tsx:98`, `app/(app)/foods/[id]/page.tsx:164`, `app/(app)/foods/new/page.tsx:217`; washes in `components/ui/tab-wash.tsx`, `components/home/home-screen.tsx:12`, `components/overview/overview-frame.tsx:9`, `app/(app)/(tabs)/explore/page.tsx:6`.

- Fill and edge go to the V3 dark recipe: `rgba(28,28,30,0.70)` with `inset 0 1px 0 rgb(255 255 255 / 0.14), inset 0 0 0 0.5px rgb(255 255 255 / 0.10), 0 8px 24px rgb(0 0 0 / 0.5)` (V3-SPEC §4; HomNayB gl.fill / gl.edge). The tab bar already has a `-dark` pair but at 0.82 and with 0.12 highlight; V3 says 0.70/0.14: reconcile.
- The three hard-coded fallbacks inside the utilities (globals.css 41, 60: `prefers-contrast: more` shadow `rgb(0 0 0 / .12/.16)`) need dark values, and the fallbacks `background-color: var(--color-card)` under reduced transparency / more contrast follow `--color-card` automatically (#1C1C1E, fine).
- `.glass-cobalt` (the + FAB) keeps `rgba(36,87,245,.88)` and glow in dark (V3 same value); `text-on-accent` white stays.
- `backdrop-filter: blur(24px) saturate(180%)` is fine on black; V3 dark sheet body is opaque #2C2C2E (V3Add c.body) behind a glass header `rgba(28,28,30,.70)`, with the Close circle `rgba(120,120,128,.16)` (= `--color-fill`, unchanged).
- Washes: `.tab-wash` is a `color-mix` of `--wash-color` at `--wash-alpha-*`. The dark placeholders exist (`--color-wash-overview-dark` #00D2E0, `--color-wash-explore-dark` #FF9230, alphas 0.3 / 0.24 / 0.22) but nothing reads them: the dark block must override `--color-wash-*` and `--wash-alpha-*` themselves. Hôm nay's wash colour is `--color-cobalt` (#2457F5) at 0.3.
- Tab colours: `text-tab-teal` / `text-tab-orange` (`components/ui/bottom-nav.tsx:20-21`) -> #00D2E0 / #FF9230 (existing `-dark` values); `text-glass-tab-off` -> #C9CDD6; the active Hôm nay/Cài đặt tab is `text-cobalt` which must become #5CB8FF on the glass.
- Scroll-edge fades are gradients from the page colour: `components/ui/app-header.tsx:185` and `components/onboarding/setup-form.tsx:180` (`bg-linear-to-b from-page to-transparent`, token-driven, fine), `components/ui/app-shell.tsx:49` and `components/add/add-screen.tsx:1015` (before: gradients). V3 dark `fadeFrom` is `rgba(0,0,0,0)`: `to-transparent` over a black page is fine; no hard-coded stop.

## 6. Gradients

- Hero: there is **no gradient on the hero** (flat `bg-ink`); in dark it needs the 1 px edge `inset 0 0 0 1px #38383A` instead (V3 heroEdge), since #1C1C1E on a #000 page is otherwise borderless.
- `--gradient-tile-rainbow` (globals.css:383, Minh Hào tile via `lib/food-group-colors.ts:44`, `components/ui/icon-tile.tsx:118`): six light hex stops + black shade overlay; swap stops for the dark sys column (#FF4245 #FF9230 #FFD600 #30D158 #0091FF #DB34F2).
- Food-group icon tile gradients: `linear-gradient(180deg, hi 0%, base 45%, lo 100%)` from 14 colour families x 3 tokens (42 tokens, `--color-tile-*`, all dynamic through `lib/food-group-colors.ts:46`). V3 gives the dark base (sys dark column; V3CaiDat/V3Account tile maps) but **no hi/lo**: 28 hi/lo values plus the Tất cả (ink) trio are proposed. White glyph on `#FFD600` / `#00DAC3` / `#3CD3FE` bases is under 4.5:1 in dark; V3 does not address it (the light tile uses the same bright bases with white glyphs).
- Other gradients: `components/landing/floating-phone.tsx:36,41` (`from-cobalt/20 via-sky/20`, `from-cobalt via-sky/...`) landing only; `components/ui/chip-scroller.tsx:72` mask gradient (alpha only, theme-proof).

## 7. Shadows and rings

Heaviest users: `shadow-ring` 47 uses in 35 files, `shadow-card` 29 in 27 files, `shadow-field` 11 in 9 files, plus the ink-tinted scale `shadow-2xs/xs/sm/md/lg/xl/2xl` (32 uses). Ink shadows (`rgb(17 19 23 / ...)`) disappear on #000, so:
- `--shadow-ring` -> `0 0 0 1px #38383A` (V3 c.ring); `--shadow-card` -> same ring (+ proposed lift for `lg:`); `--shadow-chip` and `--shadow-field` -> `none` (V3 chipRing / fieldRing); `--shadow-sheet` proposed.
- Tailwind scale (`--shadow-*`) and the literal `rgba(17,19,23,.18)` drag-lift shadows (globals.css:1078, 1105) and the Switch knob shadow need a black-based dark value; no V3 source. A card keeps its 1 px transparent border under the ring so layout does not move.
- V3 dark also changes structure, not just colour: in the dark artboards the add sheet, edit sheet and portion section drop the white inset card (`border-radius:18px; background:#fff; box-shadow:ring`) and become flat full-width rows on #000/#2C2C2E with 1 px dividers (V3Add `cardBase`/`quick`/`empty`, V3EditEntry `card`/`mealCard`/`deleteRadius 12px`, V3FoodDetail `portionCard`). If those are meant to ship, they are component changes (`components/add/add-screen.tsx`, `components/ui/portion-area.tsx`, `portion-panel.tsx`, `app/(app)/foods/[id]/page.tsx`), not token swaps.

## 8. Emoji and icon tiles

- No emoji tiles exist. The emoji-range hits in source are punctuation glyphs (check marks, crosses, hearts) in `app/landing/page.tsx`, `components/ui/notice.tsx`, `components/add/add-screen.tsx` etc., and two comment/initials strings in `lib/display-name.ts` and `components/coaching/coach-initials.ts`.
- The tiles are SVG: `components/ui/icon-tile.tsx` (food groups, shadows `--shadow-tile`, `--shadow-tile-ink`, `--drop-shadow-tile-glyph`, white 62 % glyph, glyphs paint `currentColor`), `components/ui/settings-tile.tsx` (30 px tile in a sys colour with a white glyph; V3: base in light, dark column in dark, grey stays #8E8E93, cobalt stays #2457F5), and the nutrient/meal dots (`lib/nutrient-colors.ts`, `components/home/meal-dot.ts` `MEAL_DOT`: `bg-deep-orange/yellow/pink/indigo/mint`, dark = sys column, V3 HomNayB `dot()`). `shadow-tile` (white top highlight, black 12 %) works unchanged in dark.

## 9. PWA and browser chrome

| item | where | today | dark |
|---|---|---|---|
| `theme-color` meta | `app/layout.tsx:56` `viewport.themeColor: INK_COLOR` (one value, no `media`) -> `<meta name="theme-color" content="#111317">` | ink even on the grey light page | Next's `Viewport.themeColor` accepts an array: `[{ media: "(prefers-color-scheme: light)", color: "#111317" }, { media: "(prefers-color-scheme: dark)", color: "#000000" }]`. #000000 = V3 page; proposed, V3 has no theme-color row. If the app gets an in-app theme toggle, the meta must be rewritten by script because `media` only sees the OS |
| apple status bar | `app/layout.tsx:49` `appleWebApp.statusBarStyle: "black-translucent"` | white status-bar text, page draws under it | already right for a dark page; on the light #F2F2F7 header it is white-on-light today (pre-existing, check on a device). iOS has no per-appearance `media` for this value: test `default` vs `black-translucent` in both appearances |
| manifest | `app/manifest.ts:17-18` `background_color: PAPER_COLOR` (#F2F2F7), `theme_color: INK_COLOR` (#111317), values from `lib/pwa.ts:9-10` (hard-coded hex because a manifest cannot read CSS) | one value each | the web manifest has no standard dark variant; keep it single. A dark user sees a light launch splash on Android unless `background_color` is made neutral; decide, and keep `lib/pwa.ts` in step with globals.css (`lib/__tests__/pwa.test.ts:158-160` asserts that globals.css contains `--color-page: <PAPER_COLOR>` and `--color-ink: <INK_COLOR>`, so the light values must stay literally in the file) |
| `color-scheme` | `app/globals.css:432` `:root { color-scheme: light }` | locks form controls, scrollbars, overscroll to light | `light dark`, or `dark` inside the dark block; also needed for native date/number inputs and the iOS keyboard appearance |
| icons | `public/icons/*` | ink square | no change |
| service worker | `public/sw.js` | no colours (grep: 0) | none |
| `<meta name="color-scheme">` | not present | | add `colorScheme` to the same `viewport` export if the app supports both |

## 10. Other things to check

- `components/landing/*` (landing page, `kiln-wordmark-footer.tsx` props default to `var(--color-cobalt/ink/kiln-paper)`; `stacking-audiences.tsx:159` has the only `dark:` class, `dark:text-sky`, today dead). Landing is not in the V3 screens; decide whether it follows dark. `--color-kiln-paper`, `--color-doodle*` (link page background doodles, `components/link-page/*`), `--color-gold` and `--color-hover` have no V3 dark source.
- `app/dev/ui/page.tsx:38` (`border-white/10`) is dev-only.
- Tailwind's default palette is still in the build (`--color-*` not reset), but no source file uses `bg-sky-500`-style classes (0 hits), so nothing falls through the dark map.
- `lg:` (desktop) layouts have no V3 dark artboard (all dark screens are 390 px); desktop dark is the same tokens with no design reference.

## Commands used

```
grep -rnIE '(^|[^A-Za-z0-9-])(glass|glass-tab|glass-bar|glass-cobalt|tab-wash(-home|-overview|-explore)?|backdrop-blur[A-Za-z0-9-]*)([^A-Za-z0-9-]|$)' app components   # glass users
grep -rlE '(^|[^A-Za-z0-9-])bg-ink([^A-Za-z0-9-]|$)' app components | grep -v __tests__                                                     # 34 files
grep -rnIE '(^|[^A-Za-z0-9-])(from|via|to)-[a-z]|bg-gradient|bg-linear|linear-gradient|mask-image' app components lib                        # gradients
grep -rnIE '<img|next/image|<Image|background-image|url\(' app components lib                                                                 # images: 7 hits, none a content photo
grep -rnIE 'fillStyle|strokeStyle|shadowColor|addColorStop|getContext\(|ImageResponse|html-to-image|getComputedStyle' app components lib        # share image
grep -rnIE 'themeColor|theme_color|background_color|statusBarStyle|color-scheme|apple-mobile' app lib public
grep -rnE '(^|[\s"`:])dark:' app components lib                                                                                                 # 1 hit
python3 over design/v3/screens/*.dc.html: regex  const c = dark \? \{(.*?)\} : \{(.*?)\};  and  grep -n 'dark ?' design/v3/screens/*.dc.html
```
