# English: plan

Overnight 22→23/10, job 15. The foundation ships hidden in feat/i18n-foundation; this plan is what it takes to finish.
Inventory appendices:
- strings per area, with file lists and the reasoning behind each estimate: [english-inventory.md](english-inventory.md)
- every number and date format: [english-formats.md](english-formats.md)
- every Cài đặt string with its file and line: [english-settings.md](english-settings.md)

## Library: none (typed messages on Intl)

The brief points to next-intl as the likely fit, and to the smallest thing that does plurals and number and date formats. Here that is the platform itself:

| need | covered by |
|---|---|
| plurals ("1 food", "3 foods") | `Intl.PluralRules`, one `{ one, other }` message |
| numbers ("1.234,5" vs "1,234.5") | `Intl.NumberFormat("vi-VN" / "en-US")` |
| dates, weekdays, months | `Intl.DateTimeFormat(locale, { timeZone: "Asia/Ho_Chi_Minh" })` |
| missing or misspelt keys | TypeScript: `en` is typed `Record<MessageKey, Message>`, so a missing key fails `tsc`; `t("…")` only takes known keys |
| placeholders | `{name}`, filled by `t()` |

So the foundation is about 70 lines (lib/i18n/index.ts) and adds no dependency.

next-intl would add a runtime package, a request config and, for its App Router setup, locale routing or a cookie read in a server layout. That read opts pages out of static rendering. Its main gains are ICU `select` and server-component translation:
- **select:** only a handful of strings need it (the "Tăng / Giảm" trend phrases), and two messages cover them.
- **server components:** this app's screens are client components; the only server-side copy is the SEO metadata.

**Revisit next-intl** if the copy grows ICU-heavy or the server must render English (SEO in English). The message files would move over as they are.

## Choosing the locale

- **Where:** Cài đặt › Ngôn ngữ (Tiếng Việt / English). That page already exists and already saves `language` on the device (since cc-24), but nothing reads it. The foundation reads it, only while the flag is on.
- **On the account:** the brief asks for both account and device. The account side needs a `language` column on the profile (Dong's area, a small migration plus the profile API field); the device copy then stays as the fast first paint. Until Dong adds it, device only.
- **No URL locale.** The app's screens sit behind sign-in and are not indexed. Only the landing page, `/privacy`, `/terms` and the metadata matter for SEO. If an English landing page is wanted for search later, give the public pages alone an `/en` path; the app routes stay locale-free.
- **First paint:** Vietnamese on the server, then the saved locale after mount (`useT`).
  - The flash is short on client screens, but it is visible on a slow phone.
  - Fix when it ships: a `<head>` script like the dark-mode one sets `<html lang>` and a class before paint, and hides the main content until `useT` has run, only when the locale is en.
  - Or a cookie mirror read in the root layout, which makes rendering dynamic. Prefer the script.

## Formatting

- **Numbers:** everything goes through `lib/format.ts`, which is hard-wired to `vi-VN`: 7 call sites, 3 of them created at module load. 69 files call a formatter from non-React code, so the locale must also be readable outside React. The plan:
  - a module-level `currentLocale()`, which the foundation has
  - `Intl.NumberFormat` cached per locale and options
  - `1.041 → 1,041`, `2,1 → 2.1`, `<0,01 → <0.01`
- **Input:** `parseNumberInput` and about 10 inline `replace(",", ".")` sites become one locale-aware parser.
- **Dates:**
  - three hand-built weekday arrays (T2…CN) and month words become `Intl.DateTimeFormat` in one module
  - day-month order (`dd/mm` vs `mm/dd`) for en is a product decision; dd/mm with month names ("23 Oct") avoids the ambiguity
- **Units:** g, mg, µg and kcal stay. The existing kJ choice has no conversion behind it: wire it (× 4.184 at display) or hide it for en v1.
- **Stored text: fix before switching.**
  - `serving_label` on diary entries is written in Vietnamese with a vi-VN number inside ("Cỡ lớn · 3 quả", "Đã nấu chín · 1.000 g"), and Vietnamese regexes parse it back when an entry is edited.
  - The default names for saved meals and Ngày ăn mẫu are stored as Vietnamese text.
  - All of these must become locale-independent first (structured fields, or always-vi storage with display-time translation). Otherwise English entries cannot be parsed back.

## Rules that stay

- **Vitamin and mineral names** are already English (`nameEn`, 22 nutrients) and stay identical in both languages.
- **The other 37 catalogue names** (Năng lượng, Đạm, Tinh bột, Chất béo, Chất xơ, the amino acids) are Vietnamese in the UI. In en, `nutrientName()` switches to `nameEn` (one line). **Hao to confirm:** keep them Vietnamese in en too, or show the English (Protein, Carbs, Fat, Fibre)?
- **Food names** stay Vietnamese: catalogue `name_vi`. Serving labels ("1 quả", "1 tô") are Vietnamese catalogue data too.
- **English food names later:**
  - a `name_en` (and serving `label_en`) column on `nutrition.foods`, or a translation table keyed by food id (Dong's area)
  - the API returns it when the locale is en and falls back to `name_vi`
  - search matches both, as it already does for nutrients
  - the unit-word parser in lib/portion.ts needs English unit words too

## Inventory

**2,472** user-visible Vietnamese strings (1,884 distinct) in **228 files**. Not counted: 280 in catalogue and mock data, 153 match words (regex vocabulary) and 59 dev-only. About 25 strings without diacritics are missed by the scan; they are listed in the appendix.

| area | files | strings | hours |
|---|---:|---:|---:|
| Thêm món (add, portion, compare) | 31 | 316 | 28.1 |
| Cài đặt (settings and profile) | 23 | 290 | 20.5 |
| Tổng quan (trends, charts, nutrient detail) | 21 | 237 | 23.4 |
| Hôm nay | 21 | 216 | 21.8 |
| Khám phá (food page, Giàu, Ngày mẫu) | 24 | 208 | 20.9 |
| Release notes | 2 | 201 | 4.7 |
| Onboarding and sign-in | 22 | 181 | 14.3 |
| Landing page | 5 | 149 | 4.2 |
| Coaching (HLV) | 18 | 122 | 10.8 |
| Tutorials, tips, tour | 2 | 97 | 2.6 |
| Ngày tập | 11 | 83 | 8.7 |
| PWA install | 6 | 67 | 4.5 |
| Legal (privacy, terms) | 2 | 62 | 4.1 |
| Toasts and errors | 12 | 60 | 8.0 |
| Leaderboard | 5 | 43 | 2.8 |
| Shared UI and lib labels | 10 | 42 | 3.9 |
| Sync status | 3 | 29 | 2.5 |
| Share image | 2 | 20 | 1.8 |
| SEO meta | 11 | 17 | 2.2 |
| Admin, paywall, demo personas | 4 | 32 | 2.3 |
| **Extraction total** | | **2,472** | **≈ 192** |

**On top of extraction:**

| work | hours |
|---|---:|
| Writing the English (2,437 messages, about 15,000 Vietnamese words; a native-level pass, not machine output) | ≈ 40 |
| Locale plumbing in lib/format.ts and the parser | 8 |
| Making stored labels locale-independent (serving_label, default names) | 10 |
| Dates in one module | 4 |
| Retargeting the probes that assert Vietnamese text | 15 |
| Legal pages | not estimated: a lawyer-checked translation |
| **All in** | **≈ 270** |

The cost drivers are composed sentences ("… vào {bữa}{ hôm qua}") that English word order cannot reuse, about 105 plural candidates ("{n} món") and the 12 legal paragraphs.

## The English voice

Short, plain and friendly, as the Vietnamese is:
- **Person:** "you", never "the user".
- **Case:** sentence case.
- **Wording:** no jargon; verbs on buttons ("Add 3 foods to Breakfast").
- **Grammar:** plurals by `Intl.PluralRules`.

Glossary to fix first (with Hao and the coach):
- Bữa sáng/trưa/tối/phụ → Breakfast / Lunch / Dinner / Snack
- Trước tập → Pre-workout
- Ngày tập → Training day
- Khay → Tray
- Ngày ăn mẫu → Day template
- Giàu … → Rich in …
- Đủ 22 vi chất → All 22 micronutrients
- Nhóm Bự / Bé → Big / Small group
- Level → Level
- HLV → Coach
- Hôm nay → Today
- Tổng quan → Overview
- Khám phá → Explore
- Cài đặt → Settings

## Foundation (in this branch, hidden)

- **`lib/i18n/`:** `vi.ts` (the source, typed), `en.ts` (must have every key), `index.ts`:
  - `translate`, `useT`, `currentLocale`, `formatNumberIn`
  - the flag: `NEXT_PUBLIC_ENGLISH=1` at build time, or `h1t_english_preview=1` in a demo build only
- **Proof area:** the Cài đặt tab with English: the screen, its cards and the sign-out sheet (46 keys). Still Vietnamese with the flag on, because the strings come from other modules:
  - the profile card's name and summary (`profile-summary`)
  - the sign-out sheet's sync failure reason (`lib/sign-out-flow.ts`) and the account error lines (`account-screen.tsx`)
  - the Giao diện values (`lib/theme.ts`, behind the dark flag)
  - the numbers, still `vi-VN` until `lib/format.ts` takes the locale
  - the Hồ sơ cards (Cơ thể, Mục tiêu, Năm sinh), which render on Hồ sơ, not on the tab
- **Flag OFF:** everyone gets Vietnamese, including accounts that already picked English on the Ngôn ngữ page (it existed and did nothing). The Ngôn ngữ page itself is unchanged.
- **Vietnamese is identical:** the before and after screenshots at 390 match pixel for pixel, and the existing text probes pass.

## Order to finish

1. Locale-independent stored labels (needs Dong for `serving_label`).
2. Locale plumbing in `lib/format.ts`, the parser and dates.
3. Glossary sign-off.
4. Extraction, area by area. Hôm nay and Thêm món first: most used.
5. The English copy pass.
6. The account `language` field (Dong).
7. Pre-paint locale.
8. Probes in both languages.
9. Turn the flag on.
