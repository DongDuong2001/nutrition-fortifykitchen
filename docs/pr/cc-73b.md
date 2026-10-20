# cc-73b: coach targets at the upper end, US DRI vitamins and minerals with upper limits

For Hao's review (not merged). Brief: `prompts/cc-73b-upper-dri.md`. One PR, off origin/main (16f7e1f).

## What changes for a user

- **Every target is one number**, the upper end of the coach's range: energy 40 / 35 / 30 / 25 kcal/kg (build, maintain, cut, deep cut), protein 2,2 g/kg, fat 1 g/kg, carbs the remainder, fibre 14 g per 1.000 kcal capped at 40 g (men) / 30 g (women). Hôm nay reads "1.041 / 2.275 kcal". Percentages and the red, yellow, green and blue levels are against it. **Unchanged:** fast carbs (30–45 g per training hour) and salt (4–6 g + 1–1,5 g per 20 min), still ranges. The user's custom kcal, macro ratios and fixed grams still win.
- **Vitamins and minerals follow the US and Canadian DRI** by sex and age (RDA, or AI), the way Cronometer does, replacing VN 2016. The Tolerable Upper Intake Level is the "max": shown under each row on Mục tiêu ("Tối đa 2.500 mg"), and above it a calm extra line, "Vượt mức an toàn (350 mg)", on Vi chất and the nutrient page. Limits for vitamin A, magnesium, vitamin E, niacin and folate count only supplement foods. Coach overrides kept: salt formula, iron 28 mg in the period.
- **Release 2026-10-21b** (two items, the words of the brief, a 2-step tour on Hôm nay), and release 19a no longer claims VN 2016.

## Where

| Area | Files |
|---|---|
| Targets | `apps/web/lib/targets.ts`, `apps/api/internal/targets/targets.go` |
| DRI + UL table | `apps/web/lib/rda.ts` (Go: the `dri` map), `docs/dri-targets-2026-10-20.md` (every number, the table per row, the source) |
| Max notes | `apps/web/lib/upper-limits.ts`, `app/(app)/micros/page.tsx`, `app/(app)/micros/[nutrient]/page.tsx` |
| Mục tiêu | `components/settings/target-rows.ts`, `targets-screen.tsx`, `custom-target-sheet.tsx` |
| Single numbers everywhere | hero, onboarding copy, calendar dots (`dayStatus`), overview wording, sample day, landing sample |
| Custom targets, **off** | `lib/custom-targets.ts` (`CUSTOM_TARGETS_ENABLED = false`), spec for Dong `docs/pr/cc-73b-custom-targets.md` |
| Shared vectors | `packages/vectors/{targets,period,dri}.json`; `dri.json` is every age 9–100 × both sexes |

## Needs Dong

- Custom targets per nutrient need `nutrition.profiles.custom_targets` (JSONB): web built and switched off, spec in `docs/pr/cc-73b-custom-targets.md`. No column and no migration in this PR.
- Go: `apps/api/internal/targets` changed at Hao's request in the brief. The shared-vector tests were skipping on main (wrong relative path); fixed, and the new DRI one fails instead of skipping.

## Open questions (OPEN_QUESTIONS.md, cc-73b)

Source of the DRI numbers (Health Canada's publication; nothing guessed), the calendar "met" band (90 %), no fortified flag, no fibre floor, stage labels, the note not in the narrow Hôm nay column.

## Checks

- `npm run gate:full` (PORT=3120): typecheck, 2.034 unit tests, build:demo, test:align, test:hydration and probe:all, all green. `go vet ./...` and `go test ./...` green (`TestSharedTargetVectors`, `TestSharedPeriodVectors` and `TestSharedDRIVectors` run, none skips).
- Probes changed to follow the new numbers, and one fixed for a clock bug: `cc_64_followups.py` failed after 14:00 because the meal an add goes to follows the time of day (it now pins the clock).
- Screenshots at 390 (and Mục tiêu at 100 % and 150 % text): `docs/screenshots/cc-73b/`.
- Mục tiêu shows "Theo DRI · nam 19–30 tuổi" once under each DRI card's title (Hao's review), checked with the ui-ux-pro-max rules at 390 and 150 % text.
