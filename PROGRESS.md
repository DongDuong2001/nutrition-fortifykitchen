# Progress

| Date | Commit | Built | Next |
| --- | --- | --- | --- |
| 10/10/2026 | ui-01 | Tokens, fonts, pure logic (levels, format, targets) with TDD | Shared UI components, mock data, /dev/ui preview |
| 10/10/2026 | ui-01 | Shared UI components, typed mock data & api-client, dev preview page | Screens (Today screen ui-02) |
| 10/10/2026 | ui-01-fix | Review fixes: provisional targets (fiber/fastCarbs), Saira font wdth axis, zero raw hex in components, Sheet focus trap/scroll lock, SegmentedBar a11y & valuenow clamp | Screens (Today screen ui-02) |
| 10/10/2026 | ui-03 | Visual update: Cobalt Sign restyle (Manrope + Saira Condensed, Cobalt Sign tokens, slanted segmented bars & active indicators, 600ms dial ease-out motion, centered 560px container alignment for phone/tablet) | TASK ui-04: Vi chất screen |
| 10/10/2026 | ui-04 | Layout corrections for Vi chất (/micros): ink header date row + title + 8/22 stat in Saira Condensed, horizontal category chips on paper, 4-col equal grid legend, groups reordered (Vitamin, Khoáng chất, Đạm, Chất béo, Tinh bột, Tổng quan), 2-line nutrient rows | Next tasks |
| 10/10/2026 | ui-04-fix | Vi chất sticky headers, scroll-spy, balanced desktop columns, sample breakdown data, alignment & range targets | Next tasks |
| 11/10/2026 | ui-04-fix-2 | Sticky group header bug fixed via overflow-clip; sample data totals consistency & invariant tests | Next tasks |

## Quality Gate Outputs (ui-04-fix-2)
- `npx tsc --noEmit`: 0 errors (clean).
- `npx vitest run`:
```
 Test Files  4 passed (4)
      Tests  31 passed (31)
   Duration  137ms
```
- `npm run build`:
```
▲ Next.js 16.4.0 (webpack)
✓ Compiled successfully in 667ms
✓ Finished TypeScript in 170ms
✓ Collecting page data using 11 workers in 366ms
✓ Generating static pages using 11 workers (11/11) in 110ms
✓ Collecting build traces in 2.4s
✓ Finalizing page optimization in 2.4s
```
- Visual verification screenshots (Playwright):
  - `apps/web/.screenshots/micros-390-top.png` (390x844, top of page: no gap above Vitamin, B1 row visible)
  - `apps/web/.screenshots/micros-390-dam.png` (390x844, scrolled into Đạm: header pinned below chip bar, Đạm chip active)
  - `apps/web/.screenshots/micros-768-top.png` (768x1024, top of page: no gap, B1 row visible)
  - `apps/web/.screenshots/micros-768-dam.png` (768x1024, scrolled into Đạm: header pinned below chip bar, Đạm chip active)
