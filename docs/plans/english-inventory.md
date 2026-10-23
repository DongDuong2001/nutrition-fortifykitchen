# i18n inventory: Vietnamese UI strings in apps/web

Repo: `/Users/haovu310/Documents/HITMicro/nutrition-fk-main-gate` at `8eeb7b7` (main). Scope: `apps/web/{app,components,hooks,lib}`, `.ts/.tsx`, `__tests__`, `*.test.*` excluded. Read-only inventory; nothing in the repo was changed.

## Headline

- **2,472 user-visible Vietnamese string occurrences** in **228 files** (1,884 distinct texts, 2,127 distinct source lines, about 2,437 messages once JSX fragments around `{expr}`/nested elements are merged; 15,347 words to translate).
- **Excluded from that count** (listed below): 280 strings in 8 food/nutrient catalogue data files, 153 strings of Vietnamese match/parse vocabulary, 59 dev-only strings. Files containing any diacritic string, before exclusions: 243.
- **Mechanical extraction effort: about 192 engineer-hours** by the model below (hand extraction, review included). This excludes writing the English text, the formatter/locale plumbing (formats.md), the persisted-label redesign, the Vietnamese-pinned tests (147 vitest files with 2,094 Vietnamese lines; 155 files under tests/), and the backend.
- Detection: a Vietnamese-diacritic regex over TypeScript AST nodes (JSX text, string literals, no-substitution and substitution template literals); comments and type-level literals are not counted. Short Vietnamese words without any diacritic are invisible to this method: about 25 found by a second pass (see Notes).

## Counts per area

`strings` = occurrences; `distinct` = unique text in the area; `lines` = distinct source lines carrying a string; `LOC` = total lines of the area's files; `fmt` = interpolated templates / plural candidates / nested-JSX fragments / `{expr}`-interleaved JSX fragments; `attr` = strings in JSX attributes (aria-label, title, placeholder, label, hint ...).

| Area | files | strings | distinct | lines | LOC | words | fmt (interp / plural / nested / expr) | attr | est. hours |
|---|---:|---:|---:|---:|---:|---:|---|---:|---:|
| Hôm nay (home) | 21 | 216 | 181 | 185 | 4,675 | 996 | 41 / 25 / 5 / 10 | 43 | 21.8 |
| Thêm món (add, portion, compare) | 31 | 316 | 258 | 280 | 7,319 | 1,396 | 56 / 15 / 9 / 12 | 116 | 28.1 |
| Khám phá (explore, food page, rich, Ngày mẫu) | 24 | 208 | 172 | 172 | 2,656 | 880 | 32 / 21 / 5 / 16 | 56 | 20.9 |
| Tổng quan (trends, charts, nutrient detail) | 21 | 237 | 185 | 206 | 3,551 | 1,157 | 45 / 20 / 7 / 24 | 41 | 23.4 |
| Cài đặt (settings/profile) | 23 | 290 | 229 | 258 | 3,216 | 1,514 | 21 / 6 / 5 / 12 | 103 | 20.5 |
| Onboarding + auth | 22 | 181 | 153 | 159 | 2,824 | 1,096 | 6 / 0 / 12 / 1 | 48 | 14.3 |
| Ngày tập (training) | 11 | 83 | 78 | 73 | 1,557 | 362 | 16 / 2 / 7 / 5 | 13 | 8.7 |
| Tutorials / tips / tour | 2 | 97 | 95 | 93 | 914 | 1,035 | 2 / 0 / 0 / 2 | 1 | 2.6 |
| Release notes | 2 | 201 | 197 | 115 | 493 | 2,356 | 1 / 0 / 0 / 2 | 3 | 4.7 |
| Toasts / errors (cross-cutting) | 12 | 60 | 55 | 56 | 3,493 | 361 | 18 / 11 / 0 / 2 | 6 | 8 |
| SEO meta (metadata, manifest) | 11 | 17 | 17 | 17 | 930 | 176 | 0 / 0 / 0 / 0 | 0 | 2.2 |
| Share image text | 2 | 20 | 19 | 16 | 484 | 65 | 4 / 0 / 1 / 1 | 3 | 1.8 |
| Shared ui + shared lib labels | 10 | 42 | 33 | 42 | 1,344 | 95 | 3 / 0 / 1 / 0 | 10 | 3.9 |
| Other: landing page | 5 | 149 | 141 | 139 | 1,698 | 1,097 | 0 / 0 / 1 / 1 | 3 | 4.2 |
| Other: legal (privacy, terms) | 2 | 62 | 62 | 52 | 203 | 1,274 | 0 / 0 / 12 / 0 | 2 | 4.1 |
| Other: coaching (HLV) | 18 | 122 | 105 | 112 | 1,355 | 665 | 19 / 5 / 0 / 5 | 19 | 10.8 |
| Other: leaderboard | 5 | 43 | 37 | 39 | 440 | 185 | 0 / 0 / 0 / 3 | 5 | 2.8 |
| Other: PWA install | 6 | 67 | 62 | 61 | 683 | 412 | 1 / 0 / 2 / 4 | 31 | 4.5 |
| Other: sync status UI | 3 | 29 | 28 | 21 | 202 | 92 | 6 / 0 / 1 / 1 | 5 | 2.5 |
| Other: admin review | 1 | 16 | 12 | 16 | 158 | 51 | 1 / 0 / 1 / 0 | 4 | 1.1 |
| Other: paywall | 1 | 8 | 8 | 8 | 68 | 60 | 0 / 0 / 0 / 0 | 2 | 0.5 |
| Other: demo/mock personas | 2 | 8 | 5 | 7 | 252 | 22 | 0 / 0 / 0 / 0 | 0 | 0.7 |
| **Total** | **235** (228 unique: files with metadata strings appear in SEO and in their own area) | **2472** | 1884 (unique overall) | 2127 | | 15,347 | | | **192** |

"Other" in total: 504 strings, 43 files, 31.2 h (landing, legal, coaching, leaderboard, PWA, sync, admin, paywall, demo personas).
Live-app core (everything a signed-in live user sees: the five tabs, settings, onboarding, training, tips, errors, SEO, share, shared ui, PWA, sync): 1863 strings, about 163 h. Deferrable: release notes, landing, legal, and the demo-only coaching/leaderboard/admin/paywall/personas.

### Effort model (so the numbers can be re-derived or tuned)

Minutes per string: **2.0** for UI code (locate, name the key, move the text to a catalogue, replace with a translate call, fix the affected snapshot/test); **1.0** for content blocks (release notes, landing, legal, tips, SEO) where one key covers a paragraph. Add **+4** per interpolated template (argument naming, escaping), **+8** per plural candidate (ICU plural with the English one/other branch, usually refactoring a helper that concatenated pieces), **+10** per nested-JSX fragment (rich-text tags and re-flow), **+3** per `{expr}`-interleaved JSX fragment (merge the pieces into one message), **+8** per file (import, server vs client component boundary, test mocks). Multiply by 1.25 for review and rework. The flags overlap, so they slightly over-count; areas with big files (home-screen, add-screen) are probably 10-20% under because reading cost is not modelled. Output: `stats.json` columns `hours`.

## Excluded files

| File | strings | Why excluded |
|---|---:|---|
| `lib/mock/sample-foods.ts` | 109 | Demo-mode food catalogue (nameVi, tipVi, servings labels). Catalogue data, not UI copy; a live build swaps it out (next.config.ts). |
| `lib/yield.ts` | 83 | Match vocabulary: Vietnamese cooking-state and food-group keywords used in regexes to classify raw/cooked rows by name. Logic keyed on Vietnamese food names, not UI. |
| `lib/mock/dish-demo-foods.ts` | 64 | Demo food catalogue: Vietnamese dishes. |
| `app/dev/ui/page.tsx` | 58 | Component showcase; dev/layout.tsx answers 404 in production builds. |
| `lib/portion.ts` | 43 | Lines 36-82 (UNIT_WORDS/SIZE_WORDS parse vocabulary), 508, 545, 586, 618, 644, 658, 797 (comparisons against parsed units). The rest of portion.ts is counted as UI. |
| `lib/mock/recipe-dishes.ts` | 34 | Demo recipe/dish catalogue (dish and ingredient names). |
| `lib/nutrients.ts` | 21 | Nutrient catalogue (59 entries; nameVi + nameEn). Already bilingual: en just selects nameEn. See Nutrient names. |
| `lib/training-foods.ts` | 20 | The coach's training foods (Chà là, Bột củ dền ..., names/labels matched against the catalogue by exact name). Food names, not copy. |
| `lib/mock/sample-day.ts` | 18 | Demo day seed: food names, kcal labels, sample diary. |
| `lib/food-twins.ts` | 12 | Match vocabulary: state/refuse words stripped from food names (sống, bỏ vỏ ...). |
| `lib/mock/live/sample-day.ts` | 11 | Live-build variant of the demo day seed. |
| `lib/diary-edits.ts` | 5 | Lines 121, 126 (quả/trái/vừa comparisons) only. |
| `lib/recent-foods.ts` | 5 | Lines 44, 49 (quả/trái/vừa comparisons) only. |
| `lib/search.ts` | 4 | Trái/quả synonym swap for search. |
| `lib/mock/yesterday.ts` | 3 | Demo 'yesterday' seed data. |
| `lib/catalog.ts` | 1 | Line 112: EDITED_DISH_SUFFIX ' · đã chỉnh', a suffix stored in dish names and matched with endsWith (data format, see Notes). |
| `lib/api-mode.ts` | 1 | console.warn developer message (dev-facing). |

Not scanned by design: `lib/data/*.slim.json` (raw/cooked pairs, dish recipes, yields; keys and numbers, with dish/ingredient names), `apps/web/tests/**` (probes, fixtures), `public/sw.js`, `app/globals.css` (diacritics only in comments), and the Go API (apps/api).

## Per-area detail

### Hôm nay (home)

**216 strings** (181 distinct) in **21 files**, 185 lines, 4,675 LOC, 996 words. Interpolated 41, plural candidates 25, nested JSX 5, expr-interleaved JSX 10, attributes 43. **Extraction estimate: 21.8 h.**

Files (string count): `components/home/home-screen.tsx` (37), `components/diary/meal-menu-sheet.tsx` (22), `components/home/desktop-intro.tsx` (18), `components/home/select-mode.tsx` (18), `components/home/food-list.tsx` (17), `components/home/share-sheet.tsx` (17), `components/calendar-sheet.tsx` (14), `lib/home.ts` (13), `lib/diary-rows.ts` (12), `lib/multi-select.ts` (9), `components/home/home-hero.tsx` (7), `components/home/nutrient-column.tsx` (7), `components/home/save-day-sheet.tsx` (6), `components/home/template-picker-sheet.tsx` (5), `components/home/nutrient-sources-sheet.tsx` (4), `lib/diary-edits.ts` (4), `lib/date.ts` (2), `components/home/column-scroll.tsx` (1), `components/home/pull-refresh.tsx` (1), `lib/server-day.ts` (1), `lib/share-nudge.ts` (1)

Reasoning: Controls, sheets and list rows, so most strings are short; the cost sits in composed sentences. `lib/home.ts` (13), `lib/diary-rows.ts` (12), `lib/multi-select.ts` (9) and `lib/date.ts` build phrases from arguments (meal name, kcal, day label). Several are suffix-concatenated ("... vào {bữa}{ hôm qua}": diary-store.tsx:561, add-toast.ts), which English word order cannot reuse: they must become single messages with arguments. Plural candidates are mostly "{n} món" (Vietnamese has no plural; English needs one/other, 25 hits). home.ts:291 builds a four-clause aria-label (name, amount, goal, share, level). calendar-sheet.tsx uses "T2..CN", "tháng {m}" and "Tháng {m}/{yyyy}" (see formats.md). home-screen.tsx is 1,017 LOC and food-list.tsx is large, so reading context costs more than typing.

### Thêm món (add, portion, compare)

**316 strings** (258 distinct) in **31 files**, 280 lines, 7,319 LOC, 1,396 words. Interpolated 56, plural candidates 15, nested JSX 9, expr-interleaved JSX 12, attributes 116. **Extraction estimate: 28.1 h.**

Files (string count): `lib/portion.ts` (29), `app/(app)/foods/new/page.tsx` (26), `components/foods/recipe-builder.tsx` (23), `components/ui/portion-area.tsx` (21), `components/add/add-screen.tsx` (18), `components/add/add-tray.tsx` (16), `components/foods/entry-editor.tsx` (16), `components/foods/ingredient-picker.tsx` (15), `components/ui/dish-parts.tsx` (15), `components/ui/portion-panel.tsx` (12), `app/(app)/foods/compare/page.tsx` (11), `components/add/add-shortcuts.tsx` (11), `components/add/quick-add-sheet.tsx` (11), `components/foods/compare-picker.tsx` (11), `lib/recipe.ts` (11), `components/foods/food-empty-state.tsx` (10), `components/foods/nutrient-picker-sheet.tsx` (8), `components/foods/compare-table.tsx` (7), `components/ui/quantity-stepper.tsx` (7), `lib/custom-food-fields.ts` (7), `lib/quick-entry.ts` (5), `components/foods/catalog-status.tsx` (4), `components/foods/food-list.tsx` (4), `components/foods/food-search-field.tsx` (3), `components/meal-switcher.tsx` (3), `lib/food-group-macro.ts` (3), `app/(app)/entry/[id]/page.tsx` (2), `components/foods/create-food-button.tsx` (2), `hooks/use-food-browse.ts` (2), `lib/food-compare.ts` (2), `components/foods/food-field.tsx` (1)

Reasoning: Largest area and the one with the most structure. 56 interpolated templates, 15 plural candidates ("Chọn {min} hoặc {max} món", "Thêm {n} món"), 9 nested-JSX fragments. lib/portion.ts has 72 string nodes: 29 are real copy (the cook-state hints, "Cỡ {size} · {n} quả", the "Tối đa 5.000 g" limit) and 43 are the unit and size vocabulary and unit comparisons (UNIT_WORDS lines 36-68, SIZE_WORDS 75-82 ...), counted as match vocabulary, not copy. formatPortionLabel (portion.ts:573-578) is PERSISTED: its output ("Cỡ lớn · 3 quả", "Đã nấu chín · 150 g", "100 g × 3", with a vi-VN formatted number inside) is sent to the server as the entry's serving_label and parsed back by Vietnamese regexes when the entry is edited (portion.ts:581-586 and the doc comment at 570-572), so this is a data-format change, not just extraction. portion.ts:721 and 759 are display-only. Food names and serving labels come from the catalogue (nameVi, servings[].label) and are not in these counts. Hours exclude the parser/label redesign.

### Khám phá (explore, food page, rich, Ngày mẫu)

**208 strings** (172 distinct) in **24 files**, 172 lines, 2,656 LOC, 880 words. Interpolated 32, plural candidates 21, nested JSX 5, expr-interleaved JSX 16, attributes 56. **Extraction estimate: 20.9 h.**

Files (string count): `app/(app)/foods/[id]/page.tsx` (28), `components/templates/template-editor.tsx` (24), `components/explore/explore-sections.tsx` (19), `app/(app)/explore/rich/[nutrient]/page.tsx` (16), `lib/food-source.ts` (16), `lib/day-templates.ts` (13), `lib/food-categories.ts` (12), `components/explore/saved-meals-card.tsx` (10), `app/(app)/(tabs)/explore/page.tsx` (9), `components/foods/food-micros.tsx` (9), `lib/source-names.ts` (9), `components/explore/saved-meal-manage-sheet.tsx` (8), `components/foods/source-sheet.tsx` (6), `app/(app)/explore/[category]/page.tsx` (5), `components/templates/template-list.tsx` (4), `lib/food-meta.ts` (4), `app/(app)/explore/ngay-mau/page.tsx` (3), `components/explore/rich-carousel.tsx` (3), `components/templates/template-parts.tsx` (3), `app/(app)/explore/meals/page.tsx` (2), `components/explore/minh-hao-carousel.tsx` (2), `components/foods/food-list-card.tsx` (1), `components/templates/template-pill.tsx` (1), `lib/fortify-kitchen.ts` (1)

Reasoning: Mixed: card and carousel copy (explore-sections 19, saved-meals 10), the food page (foods/[id]/page.tsx 28), the rich-in page (16), the Ngày mẫu template screens (template-editor 24) and four lookup tables whose labels are shared with Thêm món: food-categories.ts (12 labels, keys stay Vietnamese slugs like tinh_bot), food-source.ts (16, MATCH_LABEL/PROXY_NOTICE paragraph), source-names.ts (9), day-templates.ts (13, incl. the "Đã chép {name} · {n} món" toast templates). 32 interpolated, 21 plural candidates. Tables extract fast; the multi-sentence source explanations need care because they mix technical terms.

### Tổng quan (trends, charts, nutrient detail)

**237 strings** (185 distinct) in **21 files**, 206 lines, 3,551 LOC, 1,157 words. Interpolated 45, plural candidates 20, nested JSX 7, expr-interleaved JSX 24, attributes 41. **Extraction estimate: 23.4 h.**

Files (string count): `app/(app)/micros/page.tsx` (39), `components/overview/energy-tab.tsx` (29), `components/overview/body-tab.tsx` (23), `components/overview/micros-tab.tsx` (22), `lib/overview-board.ts` (19), `lib/overview-detail.ts` (18), `app/(app)/micros/[nutrient]/page.tsx` (17), `components/overview/micro-card.tsx` (13), `components/overview/overview-frame.tsx` (12), `components/overview/overview-parts.tsx` (8), `lib/rda.ts` (7), `components/overview/parts/nutrient-bars.tsx` (6), `components/overview/parts/day-bars.tsx` (4), `lib/period.ts` (4), `components/nutrient-detail/contributing-foods.tsx` (3), `components/overview/parts/nutrient-grid.tsx` (3), `lib/nutrient-history-summary.ts` (3), `lib/upper-limits.ts` (3), `components/nutrient-detail/nutrient-history.tsx` (2), `components/overview/attention-list.tsx` (1), `components/overview/scoreboard.tsx` (1)

Reasoning: Data-viz text. 45 interpolated templates, 20 plural candidates and 24 expression-interleaved JSX fragments. Trend phrases pick a verb with a ternary inside the template (overview-board.ts:24: "Giảm/Tăng {n} so với {len} ngày trước"), which must be split into two messages (or ICU select). Weekday abbreviations are duplicated in three modules (nutrient-detail.ts:23, overview-board.ts:27, calendar-sheet.tsx:9), and SVG/chart aria-labels are composed in body-tab/energy-tab/micros-tab. micros/page.tsx (39) carries the DRI explanation paragraphs; lib/rda.ts + upper-limits.ts add the UL sentences. Nutrient names in these screens come from the catalogue, not from here (see "Nutrient names" below).

### Cài đặt (settings/profile)

**290 strings** (229 distinct) in **23 files**, 258 lines, 3,216 LOC, 1,514 words. Interpolated 21, plural candidates 6, nested JSX 5, expr-interleaved JSX 12, attributes 103. **Extraction estimate: 20.5 h.**

Files (string count): `components/settings/profile-cards.tsx` (51), `components/settings/macro-targets-screen.tsx` (38), `app/(app)/settings/notifications/page.tsx` (25), `app/(app)/settings/delete-account/page.tsx` (20), `components/settings/settings-home-screen.tsx` (17), `components/settings/targets-screen.tsx` (16), `components/settings/target-rows.ts` (14), `app/(app)/settings/profile/weight/page.tsx` (13), `components/settings/account-screen.tsx` (13), `components/settings/sign-out-confirm.tsx` (12), `components/settings/coach-screen.tsx` (10), `lib/data-sources.ts` (10), `app/(app)/settings/language/page.tsx` (9), `components/settings/password-screen.tsx` (9), `lib/targets.ts` (7), `app/(app)/settings/whats-new/page.tsx` (6), `components/settings/custom-target-sheet.tsx` (6), `components/settings/profile-edit-screen.tsx` (3), `lib/custom-targets.ts` (3), `lib/display-name.ts` (3), `app/(app)/settings/data-sources/page.tsx` (2), `components/settings/profile-summary.ts` (2), `lib/sign-out-flow.ts` (1)

Reasoning: Full detail in settings.md. 103 of the 290 strings are attributes (aria-label, title, placeholder, label, hint, reason): the dominant cost is deciding keys for the SettingsRow/ChoiceGroup label+hint+reason triples. Includes three confirm flows (sign-out sheet, leave-coach sheet, delete-account with a typed confirmation word, logic at delete-account/page.tsx:25-31), the custom-target sheet, and 21 interpolated templates. Not self-contained: it imports goal/sex labels from lib/onboarding.ts, training names from lib/training.ts and level copy from lib/level-copy.ts (listed in settings.md part F).

### Onboarding + auth

**181 strings** (153 distinct) in **22 files**, 159 lines, 2,824 LOC, 1,096 words. Interpolated 6, plural candidates 0, nested JSX 12, expr-interleaved JSX 1, attributes 48. **Extraction estimate: 14.3 h.**

Files (string count): `components/onboarding/setup-form.tsx` (44), `lib/auth-actions.ts` (17), `components/onboarding/setup-summary.tsx` (15), `lib/onboarding.ts` (15), `app/signup/page.tsx` (14), `app/signin/check-email/page.tsx` (11), `app/signin/page.tsx` (11), `components/onboarding/email-password-form.tsx` (9), `lib/first-run.ts` (8), `components/onboarding/auth-field.tsx` (7), `components/onboarding/auth-shell.tsx` (5), `app/signin/expired/page.tsx` (4), `app/signin/forgot/page.tsx` (3), `components/auth/new-password-fields.tsx` (3), `lib/auth-mock.ts` (3), `app/reset-password/page.tsx` (2), `components/auth/password-field.tsx` (2), `components/onboarding/forgot-password-form.tsx` (2), `components/onboarding/magic-link-form.tsx` (2), `components/onboarding/reset-password-form.tsx` (2), `components/first-run/setup-gate.tsx` (1), `components/onboarding/google-sign-in-button.tsx` (1)

Reasoning: setup-form.tsx (44), setup-summary (15), lib/onboarding.ts (15: goal names, validation), lib/auth-actions.ts (17) and auth-mock.ts (3) error mapping, sign-in/up/check-email/forgot/expired pages. 12 nested-JSX fragments ("Đã gửi liên kết đăng nhập tới <b>{email}</b>", "Bạn gửi lại được sau {n} giây."). auth-actions.ts maps Supabase error codes and statuses to Vietnamese messages (its comment: server text is English, only code and status are read, auth-actions.ts:82-86), so that mapping layer is where en strings attach. Few plurals, so per-string cost is moderate.

### Ngày tập (training)

**83 strings** (78 distinct) in **11 files**, 73 lines, 1,557 LOC, 362 words. Interpolated 16, plural candidates 2, nested JSX 7, expr-interleaved JSX 5, attributes 13. **Extraction estimate: 8.7 h.**

Files (string count): `lib/training.ts` (20), `components/training/salt-summary-card.tsx` (12), `app/(app)/(dashboard)/training/page.tsx` (10), `components/training/own-item-sheet.tsx` (10), `components/training/training-size-sheet.tsx` (9), `components/training/training-log-sheet.tsx` (8), `components/training/sodium-progress-card.tsx` (6), `components/training/phase-checklist.tsx` (3), `components/training/training-tip-banner.tsx` (3), `components/training/duration-selector.tsx` (1), `components/training/rest-day-card.tsx` (1)

Reasoning: lib/training.ts (20) holds the day schedule: duration labels ("45 phút"), the Bé/Bự sizes, phase names ("Trước tập", "Trong tập · {n} phút"), checklist lines that embed target ranges ("Giữ mức đạm {range}"); salt-summary-card.tsx (12) holds the salt explanation with numbers and units, sodium-progress-card (6), own-item-sheet (10), training-log-sheet (8), size sheet (9). Domain terms ("Nhóm Bự / Bé", "liều", "muối nền") need a glossary decision before translation. 16 interpolated, 7 nested ("Muối: —" label+value pairs). The coach food list names (lib/training-foods.ts, 20) are catalogue data and excluded.

### Tutorials / tips / tour

**97 strings** (95 distinct) in **2 files**, 93 lines, 914 LOC, 1,035 words. Interpolated 2, plural candidates 0, nested JSX 0, expr-interleaved JSX 2, attributes 1. **Extraction estimate: 2.6 h.**

Files (string count): `lib/tips.ts` (65), `components/onboarding/onboarding-layer.tsx` (32)

Reasoning: lib/tips.ts (65 strings: 31 first-run tips as title+body pairs, plus one try/later/note set) and onboarding-layer.tsx (32: 4-step tour, level legend, buttons). Plain prose, almost no interpolation (2), so extraction is cheap; the risk is coupling: tip bodies name other UI labels literally ("Chạm Chép ngày ăn mẫu", "Chạm Chưa lưu": 20 lines with "Chạm/chạm" in tips.ts), and the tour anchors on data-tour selectors plus a DOM text read (onboarding-layer.tsx:92 builds "Chạm " + the highlighted element's own text). Translated labels and tips must stay in sync, ideally by referencing the same message keys.

### Release notes

**201 strings** (197 distinct) in **2 files**, 115 lines, 493 LOC, 2,356 words. Interpolated 1, plural candidates 0, nested JSX 0, expr-interleaved JSX 2, attributes 3. **Extraction estimate: 4.7 h.**

Files (string count): `lib/releases.ts` (193), `components/whats-new/whats-new-sheet.tsx` (8)

Reasoning: lib/releases.ts only (+ whats-new components 8 strings, counted here): 16 release entries (12 of them with a tour), 96 title and 97 body strings, 2,356 words (15% of all UI words, the largest translation volume per string). Data-driven, id-keyed, so extraction is mechanical. Two ongoing costs: (1) the file is append-only and the header comment says every merge to main adds an entry, so each future PR needs an en entry or a vi fallback; (2) 26 lines name UI labels literally ("Chạm ..."). Embedded tour steps (data-tour targets) overlap with the tips area. Old entries could ship vi-only with a fallback to cut translation load.

### Toasts / errors (cross-cutting)

**60 strings** (55 distinct) in **12 files**, 56 lines, 3,493 LOC, 361 words. Interpolated 18, plural candidates 11, nested JSX 0, expr-interleaved JSX 2, attributes 6. **Extraction estimate: 8 h.**

Files (string count): `lib/diary-store.tsx` (11), `lib/late-writes.ts` (11), `app/offline/page.tsx` (6), `app/error.tsx` (5), `app/global-error.tsx` (5), `components/diary-toast.tsx` (5), `lib/api-client.ts` (5), `app/not-found.tsx` (3), `lib/sync-notice.ts` (3), `components/not-found-report.tsx` (2), `lib/add-toast.ts` (2), `lib/sync-state.ts` (2)

Reasoning: Cross-cutting message modules rather than screens: diary-store.tsx (11 toast templates), add-toast.ts, late-writes.ts (11), sync-notice.ts, sync-state.ts, api-client.ts (5 strings: 3 thrown Errors with Vietnamese text at lines 337, 700, 705 plus fallback names), error.tsx/global-error.tsx/not-found/offline pages, diary-toast.tsx. 18 interpolated, 11 plural candidates. Messages are built inside non-React modules (store/engine code), so they need a locale-aware translate function usable outside components; this is the architectural point of the area. Also server messages: the Go API returns Vietnamese strings (see Notes).

### SEO meta (metadata, manifest)

**17 strings** (17 distinct) in **11 files**, 17 lines, 930 LOC, 176 words. Interpolated 0, plural candidates 0, nested JSX 0, expr-interleaved JSX 0, attributes 0. **Extraction estimate: 2.2 h.**

Files (string count): `app/manifest.ts` (3), `app/landing/page.tsx` (2), `app/layout.tsx` (2), `app/privacy/page.tsx` (2), `app/terms/page.tsx` (2), `app/(app)/admin/layout.tsx` (1), `app/(app)/coach/layout.tsx` (1), `app/(app)/settings/data-sources/page.tsx` (1), `app/install/page.tsx` (1), `app/offline/page.tsx` (1), `app/page.tsx` (1)

Reasoning: 14 strings in 11 static "export const metadata" objects (app/layout.tsx:38, landing, privacy, terms, install, offline, data-sources, admin/coach/join layouts, page.tsx) + 3 in app/manifest.ts. Cheap to extract but not to localise: static metadata and a single manifest cannot vary by locale; needs generateMetadata(locale) or a locale route segment, and <html lang="vi"> is hard-coded (app/layout.tsx:68, global-error.tsx:46; manifest lang at manifest.ts:9). public/sw.js:104 has one more Vietnamese string ("Ngoại tuyến") outside the scanned dirs.

### Share image text

**20 strings** (19 distinct) in **2 files**, 16 lines, 484 LOC, 65 words. Interpolated 4, plural candidates 0, nested JSX 1, expr-interleaved JSX 1, attributes 3. **Extraction estimate: 1.8 h.**

Files (string count): `lib/share-card.ts` (11), `components/home/share-day.tsx` (9)

Reasoning: share-day.tsx (9) is the DOM that is rasterised into the 1080 px PNG; share-card.ts (11) builds the model (level legend "Thiếu <50%", "Vi chất đạt {n}/{m}", "Ảnh tóm tắt {date} của {name}"). Few strings, but the output is an image: text is baked at share time, so the active locale at tap time decides it, and the dates go through formatDayLabel (formats.md). Fonts already include the vietnamese and latin subsets (app/layout.tsx:14,23,32).

### Shared ui + shared lib labels

**42 strings** (33 distinct) in **10 files**, 42 lines, 1,344 LOC, 95 words. Interpolated 3, plural candidates 0, nested JSX 1, expr-interleaved JSX 0, attributes 10. **Extraction estimate: 3.9 h.**

Files (string count): `lib/meal-slot.ts` (11), `lib/format.ts` (9), `components/ui/app-header.tsx` (6), `lib/levels.ts` (4), `lib/nav.ts` (4), `components/ui/desktop-sidebar.tsx` (3), `components/ui/bottom-nav.tsx` (2), `components/ui/level-bar.tsx` (1), `components/ui/notice.tsx` (1), `components/ui/sheet.tsx` (1)

Reasoning: Small but with the highest fan-out; extract first: lib/nav.ts tab labels (4), lib/levels.ts level names (4: Thiếu / Trung bình / Gần đủ / Đạt), lib/meal-slot.ts meal names (11), lib/format.ts weekday names + "Hôm nay/Hôm qua" (9), app-header/bottom-nav/desktop-sidebar/notice/sheet/level-bar labels (14). The same words are repeated in other areas' hard-coded copies (e.g. "Thiếu/Trung bình/Gần đủ/Đạt" also appear in micros/page.tsx:488-491, onboarding-layer.tsx:53-56, share-card.ts:59-62), so dedup against these during extraction.

### Other: landing page

**149 strings** (141 distinct) in **5 files**, 139 lines, 1,698 LOC, 1,097 words. Interpolated 0, plural candidates 0, nested JSX 1, expr-interleaved JSX 1, attributes 3. **Extraction estimate: 4.2 h.**

Files (string count): `app/landing/page.tsx` (64), `components/landing/stacking-audiences.tsx` (44), `components/landing/kiln-wordmark-footer.tsx` (22), `components/landing/floating-phone.tsx` (18), `app/page.tsx` (1)

Reasoning: Marketing page (app/landing/page.tsx 64, stacking-audiences 44, kiln-wordmark-footer 22, floating-phone 18). Long headline/paragraph copy, 1,097 words, little logic. Business decision first: translate, or keep landing vi-only.

### Other: legal (privacy, terms)

**62 strings** (62 distinct) in **2 files**, 52 lines, 203 LOC, 1,274 words. Interpolated 0, plural candidates 0, nested JSX 12, expr-interleaved JSX 0, attributes 2. **Extraction estimate: 4.1 h.**

Files (string count): `app/privacy/page.tsx` (33), `app/terms/page.tsx` (29)

Reasoning: Privacy and Terms pages (62 strings once their metadata moves to SEO, 1,274 words). 12 nested-JSX fragments (bold lead-ins inside list items). Extraction is easy; the English text needs legal review, and dates are spelled out ("Ngày 15 tháng 10 năm 2026", privacy/page.tsx:22, terms/page.tsx:22).

### Other: coaching (HLV)

**122 strings** (105 distinct) in **18 files**, 112 lines, 1,355 LOC, 665 words. Interpolated 19, plural candidates 5, nested JSX 0, expr-interleaved JSX 5, attributes 19. **Extraction estimate: 10.8 h.**

Files (string count): `lib/coaches.ts` (20), `lib/level-copy.ts` (15), `app/(app)/coach/page.tsx` (13), `components/coaching/coach-detail-card.tsx` (13), `app/(app)/coach/clients/[id]/page.tsx` (10), `app/(app)/explore/coaches/page.tsx` (7), `components/link-page/access-row.tsx` (7), `lib/coach-preview.ts` (7), `components/coaching/join-confirm.tsx` (5), `app/(app)/explore/coaches/[id]/page.tsx` (4), `components/coaching/coach-card.tsx` (4), `components/coaching/coaches-carousel.tsx` (4), `components/coaching/level-explainer-sheet.tsx` (3), `lib/coach-links.ts` (3), `lib/level-nutrients.ts` (3), `components/link-page/coach-header.tsx` (2), `components/coaching/wrong-code.tsx` (1), `hooks/use-coaching.ts` (1)

Reasoning: Coach features: coach pages, join flow, link page, level explainer, lib/level-copy.ts (15), lib/coaches.ts (20 profile/bio/specialty strings, content data), coach-preview.ts. Not shipped in live builds: lib/coaching-link.ts:120 coachingAvailable(live) returns !live, and robots.ts hides coach/leaderboard routes in live mode. 19 interpolated, 5 plural candidates. Settings imports level-copy.ts, so part of this is needed for the Cài đặt proof.

### Other: leaderboard

**43 strings** (37 distinct) in **5 files**, 39 lines, 440 LOC, 185 words. Interpolated 0, plural candidates 0, nested JSX 0, expr-interleaved JSX 3, attributes 5. **Extraction estimate: 2.8 h.**

Files (string count): `app/(app)/explore/leaderboard/page.tsx` (19), `lib/leaderboard.ts` (15), `components/leaderboard/leaderboard-banner.tsx` (3), `components/leaderboard/leaderboard-podium.tsx` (3), `components/leaderboard/leaderboard-row.tsx` (3)

Reasoning: Leaderboard page, podium, row, banner and lib/leaderboard.ts (period labels "Tuần này (T2 – CN)", "Chủ Nhật, 23:59"). Demo-only like coaching (not available in live mode).

### Other: PWA install

**67 strings** (62 distinct) in **6 files**, 61 lines, 683 LOC, 412 words. Interpolated 1, plural candidates 0, nested JSX 2, expr-interleaved JSX 4, attributes 31. **Extraction estimate: 4.5 h.**

Files (string count): `components/pwa/install-sheet.tsx` (47), `components/pwa/install-panel.tsx` (11), `components/pwa/update-offer.tsx` (5), `app/install/page.tsx` (2), `components/pwa/install-row.tsx` (1), `components/pwa/retry-button.tsx` (1)

Reasoning: Install sheet/panel/row/update-offer. 31 of 67 are aria/attr strings. Contains platform-specific instructions that name Safari/Chrome buttons ("Chọn “Thêm vào MH chính”", install-panel.tsx:11-13): these quote the OS UI in the OS language, so an English OS shows different words; translate with care.

### Other: sync status UI

**29 strings** (28 distinct) in **3 files**, 21 lines, 202 LOC, 92 words. Interpolated 6, plural candidates 0, nested JSX 1, expr-interleaved JSX 1, attributes 5. **Extraction estimate: 2.5 h.**

Files (string count): `components/sync/sync-list.tsx` (21), `components/sync/sync-status-detail.tsx` (7), `components/sync/sync-alerts.tsx` (1)

Reasoning: sync-list.tsx (21), sync-status-detail (7), sync-alerts (1): status of unsynced items; used from Cài đặt (sign-out flow) too.

### Other: admin review

**16 strings** (12 distinct) in **1 files**, 16 lines, 158 LOC, 51 words. Interpolated 1, plural candidates 0, nested JSX 1, expr-interleaved JSX 0, attributes 4. **Extraction estimate: 1.1 h.**

Files (string count): `app/(app)/admin/review/page.tsx` (16)

Reasoning: Admin review page (internal staff, role-gated). Candidate to leave in Vietnamese.

### Other: paywall

**8 strings** (8 distinct) in **1 files**, 8 lines, 68 LOC, 60 words. Interpolated 0, plural candidates 0, nested JSX 0, expr-interleaved JSX 0, attributes 2. **Extraction estimate: 0.5 h.**

Files (string count): `app/paywall/page.tsx` (8)

Reasoning: app/paywall/page.tsx, 8 strings (Pro plan stub, linked from settings-home-screen.tsx).

### Other: demo/mock personas

**8 strings** (5 distinct) in **2 files**, 7 lines, 252 LOC, 22 words. Interpolated 0, plural candidates 0, nested JSX 0, expr-interleaved JSX 0, attributes 0. **Extraction estimate: 0.7 h.**

Files (string count): `lib/mock-coach-server.ts` (5), `lib/demo-persona.ts` (3)

Reasoning: lib/demo-persona.ts and lib/mock-coach-server.ts: names such as "HLV Khánh", "Học viên A". Demo data, translate only if the demo is shown in en.

## Notes that change the plan

### Nutrient names
Partly English already. `lib/nutrients.ts` has 59 catalogue entries, each with `nameVi` and `nameEn`; the field screens use is `name`, set at nutrients.ts:105 to `nameEn` for the vitamins and minerals (22 nutrients: 12 vitamins, 10 minerals) and `nameVi` for the other 37 (Năng lượng, Đạm, Tinh bột, Chất béo, Chất xơ, amino acids written in Vietnamese form, ...). So `nutrientName(id)` (nutrients.ts:116) needs one switch (locale = en: always `nameEn`) and no extraction. The database mirrors this: `nutrition.nutrients` has `name_vi` and `name_en` (migrations/000003_foods_catalog.up.sql:9-10). The Go API also hard-codes Vietnamese names in internal/trends/trends.go:41-49,467-470. Search matches both names (custom-food-fields.ts:68).

### Food names
Vietnamese only, from the data layer, not the UI: `FoodItem.nameVi` (lib/catalog.ts:23) and `tipVi`; there is no `nameEn` on `FoodItem`, and no `name_en` on the foods table (migration 000003 adds `name_vi`, `tip_vi`, `name_search` to nutrition.foods; only nutrition.nutrients has `name_en`). API mapping reads `name_vi`/`nameVi`/`name` (lib/api-client.ts:33,156,182,656,673, openapi.yaml:431-438,825-832). Serving labels (`servings[].label`, e.g. "1 quả", "1 tô") are Vietnamese catalogue data too, and lib/portion.ts parses them back with Vietnamese unit words, so an English UI over Vietnamese food rows is the realistic first target; English food names need a new column or translation table plus a rewrite of the unit parser. Search folds accents (`removeVietnameseTones`, lib/search.ts), which is Vietnamese-specific.

### Strings that are data, not copy
- Persisted: diary entries store `food_name` and `serving_label` (portion.ts:573-578 formatPortionLabel builds "Cỡ lớn · 3 quả" / "Đã nấu chín · 150 g" with a vi-VN formatted number, parsed back at 581-586; server-day.ts:19 reads `serving_label`); dishes edited by the user get the stored suffix ' · đã chỉnh' (catalog.ts:112) that is tested with `endsWith` (catalog.ts:106). Switching language does not relabel old rows.
- The API returns Vietnamese: meal slot names `name_vi` (openapi.yaml:431-438; apps/api/internal/diary/service.go:78-82), 'Chỉ ghi kcal' (diary/service.go:292,295), library/service.go:87 'Khẩu phần', validation error `tên món không được vượt quá 80 ký tự` (diary/service.go:25). About 20 Vietnamese strings in 6 Go files.
- Typed confirmation: delete-account/page.tsx:25-31 compares the input with XOÁ / XOA / XÓA.
- Settings that look like i18n but are not wired: lib/settings.ts:8-10 has `language: "vi"|"en"`, `decimalSeparator`, `energyUnit`; /settings/language writes them; nothing else reads them (see formats.md). English option already exists in the UI list (language/page.tsx:100-101).

### Coupling between strings
Tips, release notes and the tour quote other UI labels literally ("Chạm Chép ngày ăn mẫu", "Chạm Chưa lưu", "Hôm qua"); 20 lines with 'Chạm/chạm' in tips.ts and 26 in releases.ts. Level names (Thiếu / Trung bình / Gần đủ / Đạt) are repeated as literals in at least 4 files. Extraction should create shared keys for these before the prose is moved.

### Tests
190 test files under app/components/hooks/lib; 147 contain Vietnamese (2,094 lines), mostly assertions on rendered text. 155 files under apps/web/tests (python probes, fixtures, alignment.py) contain Vietnamese. If the default locale stays `vi` and the provider renders the same text, these keep passing; any key-based refactor of message text that changes whitespace or punctuation will break them. Not in the hour totals.

### Undercount from the diacritic method
A second AST pass lists visible strings with no diacritic (apps/web full scan, saved as nodia-all.txt). Vietnamese ones that the regex misses: "Tham gia" (coach-screen.tsx:72, join pages), "Tham gia HLV" (title, 3 places), "Xem", "Xong", "Gam" / "Ghi theo gam", "Chia kcal", "Sai email?", "trong", "Nam" (profile-cards.tsx:27, profile-summary.ts:6), "Carb", "Canxi (Ca)", "Email", "Level"/"LEVEL", plus neutral labels (Keto, English, kJ, USDA, CNF (Canada), ASEAN, Fortify Kitchen, YouTube, Facebook, TikTok, units). Estimate: about 25 more strings to extract (+1 h), included nowhere above.

### Other
- `<html lang="vi">` hard-coded in app/layout.tsx:68 and app/global-error.tsx:46; `lang: "vi"` in manifest.ts:9.
- Fonts: three next/font families all request `subsets: ["vietnamese", "latin"]` (app/layout.tsx:14,23,32): fine for bilingual use.
- JSX paragraphs broken by `{expr}` or elements produce one string per fragment in the raw count (170 fragments in about 135 groups); the plan should count messages, not fragments.
- Metadata: 11 static `metadata` exports (layout, page, landing, privacy, terms, install, offline, data-sources, admin, coach, join).

## Commands used

The scripts below were run from the overnight scratchpad (session B, 23/10) and are not in the repo; the commands show the method.

```
# scratchpad: /private/tmp/claude-501/-Users-haovu310-Documents-HITMicro/bfba1a71-8478-48b4-9494-1e41f7a3db73/scratchpad/i18n/
node tools/extract.cjs raw.json        # TypeScript 5.9 AST (npx cache, nothing installed): JsxText, StringLiteral, NoSubstitutionTemplateLiteral, TemplateExpression
                                        # regex /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i; walks app components hooks lib; skips __tests__, *.test.*, *.d.ts
node tools/classify.cjs raw.json     # area/sub-area by path rules, class ui|data|vocab|dev; writes enriched.json
node tools/stats.cjs                 # per-area counts + effort model; writes stats.json
node tools/nodia.cjs <files>         # second pass: visible strings without diacritics (nodia-all.txt)
node tools/imports.cjs               # settings dependency graph (settings-deps.json)
node tools/gen-inventory.cjs && node tools/gen-settings.cjs && node tools/gen-summary.cjs
grep -rnE "toLocale(String|DateString|TimeString)|Intl\." app components hooks lib --include='*.ts' --include='*.tsx'   # formats.md
grep -rliE '<diacritics>' <tests>    # test fallout counts (190 test files, 147 with Vietnamese, 2,094 lines; tests/: 155 files)
grep -rn "name_vi|name_en|nameVi|nameEn" ...   # nutrient/food names
```

The extractor and classifier are plain Node scripts in tools/ next to this file; rerun them to refresh every number.
