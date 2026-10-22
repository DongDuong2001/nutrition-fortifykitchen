# Dark mode: plan

Overnight 22→23/10, job 14. The foundation ships hidden in feat/dark-mode-foundation; this plan is what it takes to finish.

## Where it stands

- **Setting:** Cài đặt › Giao diện with Hệ thống / Sáng / Tối, stored on the device (`h1t_theme_v1`). It is not on the account yet: the theme is a device preference (a phone in dark mode, a desktop in light), so device-only is the proposal.
- **Applied before the first paint:** an inline script in `<head>` (`THEME_SCRIPT`, lib/theme.ts) sets `data-theme="dark"` on `<html>` for Tối, or for Hệ thống when the phone is dark; `ThemeSync` follows the phone switching while the app is open. No flash: the probe sees the attribute at DOMContentLoaded.
- **Tokens:** one `:root[data-theme="dark"]` block at the end of globals.css. Hệ thống on a dark phone works through the script, not through a `prefers-color-scheme` rule, so the flag can keep it off.
- **Flag OFF:** the row is hidden, `/settings/appearance` is a 404 and the script does nothing, whatever is stored. It turns on with `NEXT_PUBLIC_DARK_MODE=1` at build time, or in a demo build with `h1t_dark_preview=1` (the probe and the screenshots use that).
- **Light is unchanged:** the light screens at 390 px (Hôm nay, Tổng quan, Khám phá, Cài đặt) are pixel-identical to main, viewport and full page, 0 changed pixels in two runs.
- **Proof:** Hôm nay in Tối at 390 and 1440 (docs/screenshots/overnight-1023/dark/). It is a token-only pass, so the gaps below still show: the hero has no edge, and links are still the button blue.

## Inventory (counts from main 8eeb7b7)

| what | count | detail |
|---|---:|---|
| Colour tokens in globals.css | **165** | 145 colours, 18 shadows, 1 drop-shadow, 1 gradient (+6 numeric wash alphas) |
| Tokens with a dark value from a source | **114** | 72 from a V3 dark map, 14 where V3 keeps the light value, 12 existing `-dark` tokens, 16 aliases that follow their target |
| Tokens with a proposed dark value (no source) | **51** | mostly the 28 icon-tile hi/lo stops, shadows, hover, scrim, press, doodle and landing colours |
| Hard-coded colours outside the tokens | **30**, in 6 files | globals.css 19 (contrast-more overrides, drag-lift shadows, the rainbow tile), Google logo 4, icon.svg 3, lib/pwa.ts 2, Switch knob shadow 1, a dev page 1. **None** in Hôm nay, Thêm món, Khám phá, Tổng quan, Cài đặt or the share image |

The full maps are in three appendices:
- every token with its light value, uses and dark value: [dark-mode-tokens.md](dark-mode-tokens.md)
- every hard-coded colour with its file and line: [dark-mode-hardcoded.md](dark-mode-hardcoded.md)
- everything that needs more than a token swap: [dark-mode-special.md](dark-mode-special.md)

The dark values come from the V3 canvas mockups:
- the `dark` prop palettes in design/v3/screens/*.dc.html: page #000, card #1C1C1E, raised #2C2C2E, divider #38383A, text #FFF, secondary #AEAEB2, link #5CB8FF, field #3A3A3C, glass rgba(28,28,30,.70)
- the Apple dark system colours in V3-SPEC §1
- the `-dark` tokens already in globals.css

The foundation's block already uses these values.

## More than a token swap

1. **One token, several roles (the main work).**
   - `--color-ink` is the hero, toast and meal-bar slab (47 `bg-ink`), body text (24 `text-ink`) and the selected chip. In dark these split:
     - slab #1C1C1E with a 1 px #38383A edge
     - toast and meal bar #2C2C2E
     - text #FFF
     - selected chip inverted to white with ink text
   - `--color-cobalt` is buttons (81 `bg-`, which stay #2457F5) and links and accents (139 `text-`, which become #5CB8FF), plus focus rings (55, proposed #5CB8FF).
   - New tokens: `--color-link`, `--color-slab`, `--color-on-destructive`, `--color-seg-selected`, `--color-knob`. Each is a rename in the components: mechanical, but it touches about 110 files.
2. **Shadows and rings.** The ink-tinted shadows vanish on black.
   - `shadow-ring` and `shadow-card` become a 1 px #38383A ring; chip and field rings become `none` (V3).
   - The Tailwind shadow scale and the drag-lift shadows need black-based values (proposed).
3. **Glass and washes.** The dark glass recipe (V3-SPEC §4) goes on `.glass*`. The tab washes need their `--color-wash-*` and alpha overrides; the `-dark` placeholders exist but nothing reads them yet.
4. **Icon tiles.** V3 gives the dark base colours but not the hi/lo gradient stops: 28 values are proposed. A white glyph on the dark yellow, mint and cyan bases is under 4.5:1, so it needs a design call.
5. **Charts and levels.** The level colours alias the system colours, so they follow automatically. Tracks go to #38383A on cards and #3A3A3C on the hero. The Cân nặng line uses `stroke-cobalt`, which must become the link colour.
6. **Share image.** It draws whatever theme is on screen (html-to-image reads the computed styles). **Decision for Hao:**
   - Option A, recommended: pin the picture to light. Wrap the off-screen ShareDay in `data-theme="light"`, so every recipient gets the same picture. About 1 h.
   - Option B: let it follow the app, using V3ShareB's dark palette. About 4 h.
7. **Structure, not colour.** In the V3 dark artboards the add sheet, the edit sheet and the food page's portion card drop the white inset card and become flat rows. That is a component change, so it needs Hao's confirmation that the dark artboards mean it.
8. **Food emoji tiles** (job 3, if merged). The emoji sits on a `surface` tile, which becomes #3A3A3C in dark. Fine as it is; check contrast on the 112 px food-page tile.

## PWA and browser chrome

- **`theme-color`:** today one value (ink). Make it an array with `media` (light #111317, dark #000000). With an in-app choice of Sáng or Tối, the script must also rewrite the meta, because `media` only sees the phone's setting.
- **Apple status bar:** `black-translucent` is right for dark. Check on a device that light is still fine; it predates this work.
- **Manifest:** it has no dark variant. Keep `background_color` as is, or pick a neutral splash.
- **`color-scheme`:** the dark block sets `color-scheme: dark`, so form controls, scrollbars and the iOS keyboard follow.

## Contrast checks

- `lib/__tests__/token-contrast.test.ts` (43 text and surface pairs) and `tab-colors.test.ts` read the light tokens. Add a dark run over the same pairs from the dark block, with the same limits: 4.5:1 for text, 3:1 for bars and UI edges.
- The pairs most at risk:
  - white on destructive #FF4245: about 3.5:1, so it needs `--color-on-destructive` #111317, as V3 does
  - secondary #AEAEB2 on a #3A3A3C chip
  - teal and orange tab text over 0.82 dark glass
  - white glyphs on the bright tile bases

## Estimate

| area | hours |
|---|---:|
| Token split (ink, cobalt/link, on-destructive, seg-selected, knob) and the component renames | 6 |
| Shadows, rings, glass, washes | 3 |
| Screen passes with screenshots: Hôm nay, Thêm món and portion, Khám phá and food page, Tổng quan (4 tabs), Cài đặt and sub-pages, Ngày tập, onboarding and sign-in, sheets and dialogs | 12 |
| Icon tiles (hi/lo stops, glyph contrast) | 2 |
| Charts, level bars, the Cân nặng line | 1 |
| Share image (option A / B) | 1 / 4 |
| PWA meta, manifest, status bar on a device | 2 |
| Dark contrast test run and fixes | 3 |
| Desktop pass (same tokens, no dark artboards at 1440) | 2 |
| Landing and link page (or leave them light) | 2 |
| **Total** | **about 34 (37 with option B)** |

**Order:**
1. The token split. Everything else reads it.
2. Shadows and glass.
3. Screen by screen, Hôm nay first.
4. Turn the flag on only when every screen is done and the dark contrast run is green.

## Decisions for Hao

1. Device-only theme (proposed), or also on the account?
2. Share image: light always (A, proposed) or follows the app (B)?
3. Do the dark artboards' flat rows (no inset cards in the add and edit sheets) ship, or is dark a colour change only?
4. The 51 proposed values, the icon-tile stops above all: mock them up in the V3 canvas first?
5. Landing and link pages: dark too, or always light?
