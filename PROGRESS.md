# Progress

| Date | Commit | Built | Next |
| --- | --- | --- | --- |
| 10/10/2026 | ui-01 | Tokens, fonts, pure logic (levels, format, targets) with TDD | Shared UI components, mock data, /dev/ui preview |
| 10/10/2026 | ui-01 | Shared UI components, typed mock data & api-client, dev preview page | Screens (Today screen ui-02) |
| 10/10/2026 | ui-01-fix | Review fixes: provisional targets (fiber/fastCarbs), Saira font wdth axis, zero raw hex in components, Sheet focus trap/scroll lock, SegmentedBar a11y & valuenow clamp | Screens (Today screen ui-02) |
| 10/10/2026 | ui-03 | Visual update: Cobalt Sign restyle (Manrope + Saira Condensed, Cobalt Sign tokens, slanted segmented bars & active indicators, 600ms dial ease-out motion, centered 560px container alignment for phone/tablet) | TASK ui-04: Vi chất screen |
| 10/10/2026 | ui-04 | Vi chất screen (/micros) Cronometer-style grouped report (6 groups, collapsible, sticky headers, slanted bars, 8/22 achieved count, desktop 2 columns, /micros/[nutrient] placeholder) | Next tasks |

## Quality Gate Outputs (ui-04)
- `node node_modules/typescript/bin/tsc --noEmit`: 0 errors (clean).
- `vitest run`:
```
Test Files  4 passed (4)
     Tests  29 passed (29)
  Duration  155ms
```
- `npm run build`:
```
▲ Next.js 16.4.0 (webpack)
✓ Compiled successfully in 1084ms
✓ Finished TypeScript in 207ms
✓ Collecting page data using 11 workers in 393ms
✓ Generating static pages using 11 workers (11/11) in 117ms
✓ Collecting build traces in 2.6s
✓ Finalizing page optimization in 2.6s
```
- `grep -rnE "#[0-9A-Fa-f]{6}" components app/today app/dev app/micros`: 0 matches outside globals.css and lib/levels.ts (clean).
- Visual verification screenshots:
  - `apps/web/.screenshots/micros-375.png` (375x812)
  - `apps/web/.screenshots/micros-390.png` (390x844)
  - `apps/web/.screenshots/micros-660.png` (660x900)
  - `apps/web/.screenshots/micros-768.png` (768x1024)
  - `apps/web/.screenshots/micros-1024.png` (1024x768)
  - `apps/web/.screenshots/micros-1440.png` (1440x900)
  - `apps/web/.screenshots/micros-detail-390.png` (390x844)



