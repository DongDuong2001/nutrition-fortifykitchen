# Progress

| Date | Commit | Built | Next |
| --- | --- | --- | --- |
| 10/10/2026 | ui-01 | Tokens, fonts, pure logic (levels, format, targets) with TDD | Shared UI components, mock data, /dev/ui preview |
| 10/10/2026 | ui-01 | Shared UI components, typed mock data & api-client, dev preview page | Screens (Today screen ui-02) |
| 10/10/2026 | ui-01-fix | Review fixes: provisional targets (fiber/fastCarbs), Saira font wdth axis, zero raw hex in components, Sheet focus trap/scroll lock, SegmentedBar a11y & valuenow clamp | Screens (Today screen ui-02) |
| 10/10/2026 | ui-03 | Visual update: Cobalt Sign restyle (Manrope + Saira Condensed, Cobalt Sign tokens, slanted segmented bars & active indicators, 600ms dial ease-out motion, centered 560px container alignment for phone/tablet) | TASK ui-04: Vi chất screen |
| 10/10/2026 | ui-04 | Layout corrections for Vi chất (/micros): ink header date row + title + 8/22 stat in Saira Condensed, horizontal category chips on paper, 4-col equal grid legend, groups reordered (Vitamin, Khoáng chất, Đạm, Chất béo, Tinh bột, Tổng quan), 2-line nutrient rows | Next tasks |

## Quality Gate Outputs (ui-04 review corrections)
- `node node_modules/typescript/bin/tsc --noEmit`: 0 errors (clean).
- `vitest run`:
```
Test Files  4 passed (4)
     Tests  29 passed (29)
  Duration  130ms
```
- `npm run build`:
```
▲ Next.js 16.4.0 (webpack)
✓ Compiled successfully in 801ms
✓ Finished TypeScript in 190ms
✓ Collecting page data using 11 workers in 448ms
✓ Generating static pages using 11 workers (11/11) in 131ms
✓ Collecting build traces in 2.4s
✓ Finalizing page optimization in 2.4s
```
- `grep -rE "#[0-9A-Fa-f]{6}" components`: 0 matches outside globals.css and lib/levels.ts (clean).
- Visual verification screenshots (Playwright):
  - `apps/web/.screenshots/micros-corr-375.png` (375x812)
  - `apps/web/.screenshots/micros-corr-390.png` (390x844)
  - `apps/web/.screenshots/micros-corr-660.png` (660x900)
  - `apps/web/.screenshots/micros-corr-1440.png` (1440x900)
