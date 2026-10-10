# Progress

| Date | Commit | Built | Next |
| --- | --- | --- | --- |
| 10/10/2026 | ui-01 | Tokens, fonts, pure logic (levels, format, targets) with TDD | Shared UI components, mock data, /dev/ui preview |
| 10/10/2026 | ui-01 | Shared UI components, typed mock data & api-client, dev preview page | Screens (Today screen ui-02) |
| 10/10/2026 | ui-01-fix | Review fixes: provisional targets (fiber/fastCarbs), Saira font wdth axis, zero raw hex in components, Sheet focus trap/scroll lock, SegmentedBar a11y & valuenow clamp | Screens (Today screen ui-02) |
| 10/10/2026 | ui-03 | Visual update: Cobalt Sign restyle (Manrope + Saira Condensed, Cobalt Sign tokens, slanted segmented bars & active indicators, 600ms dial ease-out motion, centered 560px container alignment for phone/tablet) | Next tasks |

## Quality Gate Outputs (ui-03)
- `node node_modules/typescript/bin/tsc --noEmit`: 0 errors (clean).
- `vitest run`:
```
Test Files  4 passed (4)
     Tests  27 passed (27)
  Duration  138ms
```
- `npm run build`:
```
▲ Next.js 16.4.0 (webpack)
✓ Compiled successfully in 2.2s
✓ Finished TypeScript in 228ms
✓ Collecting page data using 11 workers in 423ms
✓ Generating static pages using 11 workers (11/11) in 127ms
✓ Collecting build traces in 2.5s
✓ Finalizing page optimization in 2.5s
```
- `grep -rnE "#[0-9A-Fa-f]{6}" components app/today app/dev`: 0 matches outside globals.css and lib/levels.ts (clean).
- Visual verification screenshots:
  - `apps/web/.screenshots/today-375.png` (375x812)
  - `apps/web/.screenshots/today-390.png` (390x844)
  - `apps/web/.screenshots/today-430.png` (430x932)
  - `apps/web/.screenshots/today-660.png` (660x900)
  - `apps/web/.screenshots/today-768.png` (768x1024)
  - `apps/web/.screenshots/today-1024.png` (1024x768)
  - `apps/web/.screenshots/today-1440.png` (1440x900)
  - `apps/web/.screenshots/dev-ui-390.png` (390x844)


