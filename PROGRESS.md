# Progress

| Date | Commit | Built | Next |
| --- | --- | --- | --- |
| 10/10/2026 | ui-01 | Tokens, fonts, pure logic (levels, format, targets) with TDD | Shared UI components, mock data, /dev/ui preview |
| 10/10/2026 | ui-01 | Shared UI components, typed mock data & api-client, dev preview page | Screens (Today screen ui-02) |
| 10/10/2026 | ui-01-fix | Review fixes: provisional targets (fiber/fastCarbs), Saira font wdth axis, zero raw hex in components, Sheet focus trap/scroll lock, SegmentedBar a11y & valuenow clamp | Screens (Today screen ui-02) |
| 10/10/2026 | ui-02 | Data model catalogue (59 nutrients), Today screen (mobile 390px & desktop 1440px), empty/skeleton/offline states, all review fixes (Saira font, base <a> styles, pinned deps, meal slots, 0 raw hex) | TASK ui-03: Vi chất (Micros screen) |

## Quality Gate Outputs (ui-02)
- `node node_modules/typescript/bin/tsc --noEmit`: 0 errors (clean).
- `vitest run`:
```
Test Files  4 passed (4)
     Tests  27 passed (27)
  Duration  130ms
```
- `npm run build`:
```
▲ Next.js 16.4.0 (webpack)
✓ Compiled successfully in 678ms
✓ Finished TypeScript in 178ms
✓ Collecting page data using 11 workers in 440ms
✓ Generating static pages using 11 workers (11/11) in 120ms
✓ Collecting build traces in 2.4s
✓ Finalizing page optimization in 2.4s
```
- `grep -rnE "#[0-9A-Fa-f]{6}" components app/today`: 0 matches (clean).
- Visual verification screenshots:
  - Mobile: `apps/web/.screenshots/today-390.png`
  - Desktop: `apps/web/.screenshots/today-1440.png`

