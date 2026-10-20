# cc-73b: custom daily targets per vitamin or mineral (needs Dong)

Hao's brief (20/10): in Mục tiêu a vitamin or mineral row can be tapped to set a custom daily target, with "Về mặc định" to go back, and a custom target is marked "tự đặt" wherever it is used (Cronometer lets users customise any target).

**Status: the web side is built and switched off; the API side is not built, because it needs a new column.** Nothing in this PR adds a column or a migration.

## Why it is off

The brief says: use an existing profile field if one fits, end to end; if it needs a new DB column or a migration, do not add one, build the web behind a flag that stays off, and write the spec for Dong.

- The API's profile (`nutrition.profiles`, `apps/api/internal/profile`) has no field for it. The only free-form column is `training_prefs` (JSONB, migration 000013), which holds the Bự/Bé workout size and the custom workout foods: it is not a profile-targets field, and putting nutrient targets there would mix two features.
- The custom kcal and macro settings (`customEnergyKcal`, `macroMode`…) live only on the device (`h1t_profile_v1` in `lib/profile.ts`); the API does not know them either, so its trends already work from the coach's formulas. A micronutrient target kept only on the device would make the same gap bigger: Hôm nay would show the custom amount while the API-made trends and `target_days` used the DRI one.
- So: the web is ready, and it is switched on (and the API changed) in one go, when Dong adds the column.

## Web side, built (apps/web)

| Piece | Where |
|---|---|
| The flag, off | `CUSTOM_TARGETS_ENABLED = false` in `lib/custom-targets.ts` |
| The data model and rules (pure, tested): ids (the 21 DRI nutrients; not salt, not the macros), `parseCustomTargets`, `parseCustomAmount` (comma or dot, > 0, ≤ 100.000), `withCustomTarget` (set, or null to go back to the default), `applyCustomTargets` | `lib/custom-targets.ts`, `lib/__tests__/custom-targets.test.ts` |
| `Profile.customTargets?: Record<string, number>`, read from the saved profile, applied in `targetsFor` only while the flag is on | `lib/profile.ts` |
| Mục tiêu: with the flag on, a vitamin or mineral row is a button (aria-label says "Bấm để đặt mục tiêu riêng"), a custom row shows "tự đặt", the row keeps its "Tối đa" line | `components/settings/targets-screen.tsx`, `components/settings/target-rows.ts` (`editable`, `custom`, `defaultValue`) |
| The editor: a sheet with the amount field (numeric keypad, 16 px), the default and the limit in the text, an error line, **Lưu** and **Về mặc định** (only on a custom row) | `components/settings/custom-target-sheet.tsx` |
| The nutrient page says "· tự đặt" after "Mục tiêu: … /ngày" | `app/(app)/micros/[nutrient]/page.tsx` |
| Tests: `target-rows.test.ts` (flag off: nothing tappable, a saved custom amount is not read; flag on: tappable, marked, default kept), `custom-targets.test.ts`, `cc_73b.py` (Mục tiêu has no button rows) | |

To switch on after the API is ready: set `CUSTOM_TARGETS_ENABLED = true`, make `updateProfile({ customTargets })` also send `custom_targets`, and read it back from the profile response (the way `training_prefs` travels today).

## API / DB spec for Dong

1. **Migration** (next number after 000014; reversible):
   ```sql
   ALTER TABLE nutrition.profiles ADD COLUMN IF NOT EXISTS custom_targets JSONB NOT NULL DEFAULT '{}';
   -- down: ALTER TABLE nutrition.profiles DROP COLUMN IF EXISTS custom_targets;
   ```
   One object per user: nutrient id to the daily amount in the nutrient's own unit, e.g. `{"calcium": 1200, "zinc": 15}`. No row per nutrient: it is read together with the profile on every day screen.
2. **Profile model** (`internal/profile/model.go`): `CustomTargets map[string]float64 \`json:"custom_targets"\`` on `Profile` and `UpsertProfileRequest` (pointer in the request: absent keeps the stored value, `{}` clears it).
3. **Validation** (same as the web): keys must be one of the 21 DRI ids (`calcium, phosphorus, magnesium, iron, zinc, selenium, copper, manganese, potassium, vitamin_a, vitamin_d, vitamin_e, vitamin_k, b1, b2, b3, b5, b6, folate, b12, vitamin_c`); each value finite, > 0 and ≤ 100000; anything else is a 400 with a clear message. Salt/sodium and the macros are not accepted here.
4. **Targets** (`internal/targets`): add `CustomTargets map[string]float64` to `UserProfileForTargets`; in `CalculateTargets` replace the DRI value of each id present by `{Min: v, Max: v}` after the DRI is worked out (the period iron override then applies to the default only: a custom iron wins over both, like the web). Pass it from `profile.GetProfile`, `diary` (both `CalculateTargets` calls) and `trends` (`repository.go`, both calls), so the API's percentages and `target_days` use what Hôm nay shows.
5. **Upper limits** (`UpperLimitFor`) are not changed by a custom target: the limit stays the DRI's. A custom target above the limit is allowed (the user's call); the note on the nutrient appears from the limit, not from the target.
6. **Vectors**: add `custom_targets` to the inputs of `packages/vectors/targets.json` (a case with a custom calcium and a custom iron for a woman in the period) and regenerate with `UPDATE_VECTORS=1 npx vitest run lib/__tests__/vectors-gen.test.ts` in `apps/web`; `TestSharedTargetVectors` then covers it.
7. **Tests to add on the API**: upsert with a valid set, with an unknown id (400), with 0 and with a negative value (400), absent (kept) and `{}` (cleared); `GetProfile` returns it; `CalculateTargets` honours it.
8. **Account deletion and export** already cascade on the profile row; no change.

## Not decided here

- Whether a custom target should also be allowed for salt (it has its own training formula and the Ngày tập screen) and for the macros (they have their own screen, `Tùy chỉnh tỉ lệ đa lượng`): left out.
