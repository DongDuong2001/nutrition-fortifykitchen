# Number and date formatting inventory (apps/web)

Repo `/Users/haovu310/Documents/HITMicro/nutrition-fk-main-gate` at `8eeb7b7`. Everything below is `file:line` on main. Purpose: show what changes for `en`.

## Summary

- The app is hard-wired to **vi-VN** and to the **Asia/Ho_Chi_Minh** day. Numbers go through one module (`lib/format.ts`, 4 `Intl.NumberFormat` call sites + 3 module-level instances, all `"vi-VN"`), dates are built by hand as `dd/mm` strings with Vietnamese weekday words. There is **no** use of `toLocaleString`, `toLocaleDateString`, `toLocaleTimeString`, `Intl.RelativeTimeFormat`, `Intl.PluralRules` or `Intl.ListFormat` anywhere in app/components/hooks/lib on main (grep, non-test code); the foundation's `lib/i18n/index.ts` is the first `Intl.PluralRules`.
- `Intl.DateTimeFormat` appears only in `lib/vn-time.ts` (3 formatters, all using `sv-SE`/`en-US` as a parsing trick, not for display; they must NOT follow the UI locale).
- Decimal handling is duplicated: one shared parser (`lib/parse-number.ts`) plus at least 10 inline `.replace(",", ".")` / `.replace(".", ",")` sites.
- User settings `decimalSeparator` (comma/dot), `energyUnit` (kcal/kJ) and `language` exist (`lib/settings.ts:8-10`) and are saved by `/settings/language`, but **no formatter or parser reads them**.
- Formatting is called from non-React modules (69 files call a number formatter), and the `Intl.NumberFormat` instances are created at module load (`lib/format.ts:54-56`). A locale switch therefore cannot come only from a React context: the formatters need a module-level current-locale source (or an explicit locale argument threaded through lib/).
- Persisted text contains formatted numbers: `formatPortionLabel` (`lib/portion.ts:573-578`) writes `formatNumber(p.base)` (vi-VN, e.g. "1.000 g") into the entry's `serving_label`, and `parsePortionLabel` reads it back with a Vietnamese regex (`lib/portion.ts:581-586`). Switching the number locale would make old labels unparseable unless the stored form is made locale-independent first.

## 1. Intl APIs (complete list)

| file:line | API | locale | options | used for | en impact |
|---|---|---|---|---|---|
| `lib/format.ts:13` | Intl.NumberFormat | "vi-VN" | min=max fractionDigits = `decimals` | formatNumber with explicit decimals | locale from current UI locale; en gives `1,041` and `2.1` |
| `lib/format.ts:22` | Intl.NumberFormat | "vi-VN" | maxFractionDigits 0 | formatNumber, whole numbers | same |
| `lib/format.ts:30` | Intl.NumberFormat | "vi-VN" | min 0, max 2 | formatNumber, values under 1 (duplicate of :37) | same |
| `lib/format.ts:37` | Intl.NumberFormat | "vi-VN" | min 0, max 2 | formatNumber default | same |
| `lib/format.ts:54` | Intl.NumberFormat (module const `formatWhole`) | "vi-VN" | max 0 | formatAmount kcal/whole | per-locale cache instead of one constant |
| `lib/format.ts:55` | Intl.NumberFormat (`formatOneDecimal`) | "vi-VN" | max 1 | formatAmount g/mg/µg under 100 | same |
| `lib/format.ts:56` | Intl.NumberFormat (`formatTwoDecimals`) | "vi-VN" | max 2 | formatAmount values under 1 | same |
| `lib/vn-time.ts:11` | Intl.DateTimeFormat | "sv-SE" | timeZone Asia/Ho_Chi_Minh, 2-digit y/m/d | `vnDayKey`: YYYY-MM-DD day key (sv-SE is used because it prints ISO order) | KEEP as is: it is a key format, not display |
| `lib/vn-time.ts:13` | Intl.DateTimeFormat | "en-US" | timeZone VN, y/m/d numeric, weekday short | `vnDateParts`: the weekday arrives as "Mon".. and is mapped to Vietnamese words at format.ts:71-79 | KEEP as is; the table at format.ts:71 becomes the localisation point |
| `lib/vn-time.ts:21` | Intl.DateTimeFormat | "en-US" | timeZone VN, hour/minute, hour12 false | `vnClock`: 24h clock to pick the meal slot (lib/meal-slot.ts:22) | KEEP as is |
| `lib/search.ts:64` | Intl.Collator | "vi" | default | `VI_COLLATOR`: sorts search results (Vietnamese tone order) | sorting Vietnamese food names stays vi; sort of English labels would need en |
| `components/coaching/coach-initials.ts:1` | Intl.Segmenter | "vi" | granularity grapheme | first grapheme of a coach name for the avatar | locale-insensitive in practice; can stay |
| `lib/overview-detail.ts:231` | String.localeCompare | "vi" | - | sort nutrient names | follows the displayed names: en names need en collation |

Locale-sensitive string case operations (Vietnamese dotted/diacritic casing):

- `components/coaching/coach-initials.ts:22` toLocaleUpperCase("vi-VN"): avatar initials
- `components/home/food-list.tsx:388` toLocaleLowerCase("vi-VN"): builds aria-label `Xem riêng ${meal}`
- `components/add/add-screen.tsx:91` toLocaleLowerCase("vi-VN"): lower-cases `formatDayLabel(...)` for the 'Thêm vào ... hôm qua' text
- `lib/portion.ts:745` toLocaleUpperCase("vi"): capitalises the first letter of an egg-size hint
- `lib/training-foods.ts:53` normalize("NFC").toLocaleLowerCase("vi"): matching coach foods by name (data matching, keep vi)
- `lib/food-requests.ts:28` toLocaleLowerCase("vi-VN"): duplicate food-name check (keep)

Plain `localeCompare` without a locale on ISO date strings is fine (lib/overview-detail.ts:173,175; lib/overview-board.ts:88; lib/period.ts:242).

## 2. Custom number formatters (lib/format.ts)

| function | file:line | behaviour (what is vi-specific) | calls / files |
|---|---|---|---|
| `formatNumber` | lib/format.ts:11 | vi-VN: dot thousands, comma decimal. 0 digits if effectively an integer (1e-6), max 2 otherwise ('2,1', '0,04'). | 67 / 28 |
| `formatRange` | lib/format.ts:47 | `min–max` with an en dash (U+2013); each side through formatNumber. | 14 / 9 |
| `formatAmount` | lib/format.ts:64 | kcal whole; g/mg/µg one decimal under 100, else whole; any value of magnitude under 1 gets two decimals; a positive value under 0.005 prints the literal `<0,01` (line 65, hard-coded comma). Unit is NOT added (callers append ' g', ' kcal'). | 106 / 51 |
| `formatSigned` | lib/format.ts:161 | '+18' / '−12' with a real minus U+2212, via formatNumber. | 6 / 4 |
| `formatPercent` | lib/format.ts:171 | '28%' with no space; defined but never called outside lib/format.ts. | 0 / 0 |

Call sites (file:lines), non-test code:

**formatNumber** (67 calls in 28 files): app/(app)/(dashboard)/training/page.tsx:250; app/(app)/micros/page.tsx:126; app/(app)/settings/profile/weight/page.tsx:22; components/coaching/coach-detail-card.tsx:16; components/foods/food-micros.tsx:18; components/leaderboard/leaderboard-podium.tsx:35; components/leaderboard/leaderboard-row.tsx:25,41; components/onboarding/setup-form.tsx:97,103; components/overview/body-tab.tsx:17; components/overview/energy-tab.tsx:80,83,100,138,140,163,175,179,181,219; components/overview/micros-tab.tsx:212; components/overview/parts/day-bars.tsx:59,91; components/overview/parts/nutrient-bars.tsx:28,43; components/overview/parts/nutrient-grid.tsx:62; components/settings/macro-targets-screen.tsx:130,323,328,412,414; components/settings/profile-cards.tsx:211; components/settings/profile-summary.ts:11; components/settings/target-rows.ts:76,107,108,110,111,115,121; components/settings/targets-screen.tsx:62; components/ui/portion-panel.tsx:112; components/ui/quantity-stepper.tsx:31,34,51,71; lib/date.ts:25; lib/format.ts:49,51,165,172; lib/home.ts:277; lib/onboarding.ts:154; lib/overview-board.ts:24,224; lib/overview-detail.ts:73,96,98,261; lib/portion.ts:167,263,264,566,575,748,761

**formatRange** (14 calls in 9 files): components/home/home-hero.tsx:111; components/overview/body-tab.tsx:261,262,266; components/overview/energy-tab.tsx:167; components/overview/micros-tab.tsx:192; components/overview/parts/day-bars.tsx:79; components/templates/template-editor.tsx:227; lib/onboarding.ts:124,139,143,147; lib/overview-detail.ts:74; lib/share-card.ts:163

**formatAmount** (106 calls in 51 files): app/(app)/explore/rich/[nutrient]/page.tsx:116; app/(app)/foods/[id]/page.tsx:291,313; app/(app)/foods/new/page.tsx:203; app/(app)/micros/[nutrient]/page.tsx:132; app/(app)/micros/page.tsx:624,626,670; components/add/add-shortcuts.tsx:139; components/add/add-tray.tsx:16,77,148; components/explore/saved-meals-card.tsx:109; components/foods/compare-table.tsx:42; components/foods/entry-editor.tsx:207,208,209,210; components/foods/food-micros.tsx:43; components/foods/recipe-builder.tsx:129,270,272; components/home/home-hero.tsx:134,135; components/home/nutrient-column.tsx:84,115; components/home/nutrient-sources-sheet.tsx:35,51; components/home/share-day.tsx:120,142; components/home/template-picker-sheet.tsx:88,91; components/meal-switcher.tsx:40; components/nutrient-detail/nutrient-history.tsx:38; components/overview/micros-tab.tsx:193,206; components/settings/custom-target-sheet.tsx:57; components/settings/macro-targets-screen.tsx:364; components/settings/target-rows.ts:63,90; components/templates/template-editor.tsx:230; components/templates/template-list.tsx:35; components/templates/template-parts.tsx:55,59; components/training/sodium-progress-card.tsx:19,77; components/training/training-log-sheet.tsx:64,163; components/ui/dish-parts.tsx:247,273,288; components/ui/portion-panel.tsx:143; lib/day-history.ts:133,134,135; lib/day-targets.ts:24,25,31; lib/day-templates.ts:209,214; lib/diary-edits.ts:222,381,393; lib/diary-rows.ts:7; lib/diary-store.tsx:486,487,1195,1242,1545; lib/food-compare.ts:38,52,53; lib/food-group-macro.ts:24; lib/food-meta.ts:33,46,47,48,63; lib/home.ts:145,287,288; lib/kcal.ts:19; lib/nutrient-detail.ts:10; lib/nutrient-rows.ts:105; lib/overview-board.ts:37,189,223; lib/overview-detail.ts:260,266; lib/portion.ts:18,424,723,752,775; lib/profile.ts:232,233; lib/quick-entry.ts:90; lib/share-card.ts:159; lib/training.ts:72,74,104,105,134; lib/upper-limits.ts:38,41,42

**formatSigned** (6 calls in 4 files): components/overview/body-tab.tsx:156,233,239; lib/format.ts:172; lib/overview-board.ts:91; lib/overview-detail.ts:107

**formatPercent** (0 calls in 0 files): none outside lib/format.ts

Module-level constants that bake a Vietnamese number into text: `lib/portion.ts:367` `"Tối đa 5.000 g"`; `lib/quick-entry.ts:47` `"Tối đa 9.999 kcal"`; `lib/format.ts:65` `"<0,01"`. In en these should be messages with a formatted-number argument (`5,000`, `9,999`, `<0.01`).

## 3. Decimal separator: parsing and printing

Input side (a typed number is read the Vietnamese way: comma or dot is a decimal, but `1.000` = 1000):

| file:line | rule | en impact |
|---|---|---|
| `lib/parse-number.ts:6-14` | `parseNumberInput`: `^[1-9]\d{0,2}(\.\d{3})+(,\d+)?$` = thousands dots; else `[.,]` decimal. "1.234,5" is 1234.5; "1.000" is 1000. | In en "1.000" is 1.0; "1,000" is 1000. The rule must depend on the locale (or the `decimalSeparator` setting). Highest-risk single function: used by portion, quick-entry, custom-food-fields, foods/new. |
| `lib/portion.ts:8, 381, 388` | wrappers/callers of parseNumberInput | follows parse-number |
| `lib/portion.ts:185` | `input.trim().replace(",", ".")` (parse unit amount) | inline comma-to-dot; move onto parseNumberInput |
| `lib/portion.ts:150` | `Number(m[1].replace(",", "."))` parsing a stored label | stored labels: see Persisted below |
| `lib/portion.ts:263` | `Number(lead[1].replace(",", ".")) * q` scaling a label | same |
| `lib/portion.ts:581-582` | `/^\d{1,3}(?:\.\d{3})+(?:,\d+)?$/` then `replace(/\./g,"")` and `replace(",",".")` in parsePortionLabel | same; reads what formatPortionLabel (portion.ts:573-578) wrote with vi-VN formatting |
| `lib/recipe.ts:185` | `grouped ? trimmed.replace(/\./g,"").replace(",",".") : trimmed.replace(",",".")` | duplicate of parse-number rule |
| `lib/diary-edits.ts:117` | `Number(match[1].replace(",", "."))` (label amount) | label parsing |
| `lib/home.ts:159, 230` | `Number(m[1].replace(",", "."))` reading amounts back from labels | label parsing |
| `lib/recent-foods.ts:69` | `Number(match[1].replace(",", "."))` | label parsing |
| `lib/custom-targets.ts:36` | `text.trim().replace(",", ".")` | settings input |
| `lib/onboarding.ts:67` | `text.trim().replace(",", ".")` (weight) | setup input |

Output side (decimal comma written by hand instead of through formatNumber):

- `lib/portion.ts:13` `gramFieldText`: `String(round1(g)).replace(".", ",")` fills a gram input; comment says 'no thousands dot ('1.000' would read as 1 g)'
- `lib/recipe.ts:240, 257` `String(n).replace(".", ",")` for ingredient/serving fields
- `components/settings/custom-target-sheet.tsx:30` `String(row.amount).replace(".", ",")` initial value of a target field
- `components/training/training-log-sheet.tsx:20` `gramsText = String(grams).replace(".", ",")`
- `components/overview/body-tab.tsx:57` `.toFixed(2)` for SVG path coordinates (not display; leave)

All `inputMode="decimal"` text fields (so the keypad shows the device's own separator): settings/profile/weight/page.tsx:79; foods/new/page.tsx:293,446; ui/quantity-stepper.tsx:104; ui/dish-parts.tsx:51; ui/portion-area.tsx:324,626; settings/custom-target-sheet.tsx:65; add/quick-add-sheet.tsx:86,99,102,105; training/own-item-sheet.tsx:142; foods/recipe-builder.tsx:196,246; foods/entry-editor.tsx:136,145,148,151; onboarding/setup-form.tsx:314. On an en-US device the keypad types `.`, which parseNumberInput already accepts; the danger is only `1.000`.

Numbers written inside Vietnamese copy (need to become arguments, or at least en-style when translated):

- `app/(app)/settings/language/page.tsx:111` Dấu phẩy (2,5)
- `app/(app)/settings/language/page.tsx:112` Dấu chấm (2.5)
- `app/(app)/settings/profile/weight/page.tsx:69` Giảm 0,1 kg
- `app/(app)/settings/profile/weight/page.tsx:92` Tăng 0,1 kg
- `app/landing/page.tsx:85` Dữ liệu vi chất được tính toán theo tỷ lệ khối lượng thực tế từng gam, định dạng chuẩn mực Việt Nam 
- `app/privacy/page.tsx:65` Toàn bộ dữ liệu trao đổi giữa thiết bị người dùng và máy chủ đều được mã hóa bằng giao thức HTTPS/TL
- `components/landing/stacking-audiences.tsx:33` 2.0 g/kg thể trọng
- `components/onboarding/setup-form.tsx:330` Giảm 0,5 kg
- `components/onboarding/setup-form.tsx:336` Tăng 0,5 kg
- `components/settings/target-rows.ts:120` ${FIBER_G_PER_1000_KCAL} g mỗi 1.000 kcal, tối đa ${FIBER_MAX_G[profile.sex]} g
- `components/settings/target-rows.ts:132` Nền 4–6 g + 1–1,5 g mỗi 20 phút tập
- `components/training/salt-summary-card.tsx:82` Cách tính: 4–6 g/ngày + 1–1,5 g mỗi 20 phút tập
- `lib/onboarding.ts:142` Đạm (2,2 g/kg)
- `lib/portion.ts:367` Tối đa 5.000 g
- `lib/quick-entry.ts:47` Tối đa 9.999 kcal

## 4. Dates, weekdays, months

All day logic runs on the Ho Chi Minh calendar day (`lib/vn-time.ts:5-9`, UTC+7, no DST) whatever the device zone is; that is not a language matter and stays.

| file:line | what | vi output | en impact |
|---|---|---|---|
| `lib/format.ts:71-79` | `WEEKDAY_NAMES_VI` map (keys from vn-time's en-US 'Sun'..'Sat') | Chủ nhật, Thứ Hai ... Thứ Bảy | table per locale, or `Intl.DateTimeFormat(locale,{weekday:'long',timeZone})` |
| `lib/format.ts:95-100` | `getWeekdayName` | full name | callers: calendar-sheet.tsx:24, overview-board.ts:181, format.ts:140,152 |
| `lib/format.ts:110-141` | `formatDayLabel(date, now)` | `Hôm nay 10/10`, `Hôm qua 09/10`, `Thứ Sáu 09/10` (day/month, zero-padded from vnDateParts, no year) | 'Today' / 'Yesterday' words, and the day-month order (dd/mm here, mm/dd in en-US, or `Oct 9`) is a product decision. 8 call sites: training/page.tsx:245, coach/page.tsx:56, micros/[nutrient]/page.tsx:130, micros/page.tsx:125, add/add-screen.tsx:91, home/home-screen.tsx:661, ui/app-header.tsx:146, lib/share-card.ts:147 (the share image) |
| `lib/format.ts:148-153` | `formatDesktopDate` | `Thứ Bảy, 10/10/2026` (dd/mm/yyyy) | 5 calls: training/page.tsx:250, micros/page.tsx:130, home-screen.tsx:641,647, lib/date.ts:25 |
| `lib/format.ts:176-180` | `formatPeriodRange` | `06–12/10`, `13/09–12/10`, `12/10` (en dash, dd/mm) | 2 calls: overview/overview-parts.tsx:76, lib/period.ts:36 |
| `lib/date.ts:19-25` | `withRuntimeDate`: bakes `dateLabel` and `desktopDateLabel` into the day object | `Hôm nay 10/10`; `Thứ Bảy, 10/10/2026 · Ngày tập 60′ · Giữ cân · 65 kg` | label strings stored in data; move to render time |
| `lib/multi-select.ts:98-100` | `ddMm(iso)` | `10/10` | dd/mm helper #1 |
| `lib/late-writes.ts:85` | `dayLabel(iso)` | slice(5,10).split('-').reverse().join('/') | dd/mm helper #2 |
| `lib/sync-notice.ts:11-12` | message `Món ngày ${day}/${month} chưa lưu ...` | dd/mm in a sentence | helper #3 |
| `lib/day-templates.ts:65-66` | `Ngày ${day}/${month}` | template default name | helper #4 (also a stored name: see Persisted) |
| `lib/saved-meals.ts:28-29` | `${meal} ${day}/${month}` | saved-meal default name | helper #5 (stored name) |
| `components/overview/body-tab.tsx:16, energy-tab.tsx:17, lib/overview-board.ts:9` | `dm(iso)` = `dd/mm` | chart axis/tooltips | helpers #6-8 |
| `components/overview/overview-parts.tsx:77-79` | `${day}/${month} đang ghi, không tính.` | dd/mm in a sentence | helper #9 |
| `components/nutrient-detail/nutrient-history.tsx:50` | `${weekdayShortVi} ${dd}/${mm}` in an aria-label | `T2 06/10` | helper #10 |
| `lib/nutrient-detail.ts:23-28` | `WEEKDAY_SHORT_VI = [CN,T2..T7]`, `weekdayShortVi` | CN, T2-T7 | callers: nutrient-history.tsx:50,57; lib/nutrient-history-summary.ts:21 |
| `lib/overview-board.ts:27-31` | `WEEKDAY_SHORT` duplicate of the above, `weekdayShort` | CN, T2-T7 | callers: body-tab.tsx:81,197; energy-tab.tsx:103; overview-board.ts:29,62,63,76,77 |
| `components/calendar-sheet.tsx:9` | `WEEKDAYS = [T2..T7, CN]` Monday-first column heads | T2 ... CN | third copy; en week may start on Sunday |
| `components/calendar-sheet.tsx:24` | aria-label `${getWeekdayName(iso)} ${day} tháng ${monthNumber}` | Thứ Hai 6 tháng 10 | month is a number + the word 'tháng' (no month names exist in the app) |
| `components/calendar-sheet.tsx:72-73` | `Tháng ${Number(m)}/${year}` | Tháng 10/2026 | title; en would be 'October 2026' |
| `components/calendar-sheet.tsx:81,93` | aria-labels | Tháng trước / Tháng sau |  |
| `lib/day-history.ts:15,31-32,108-124` | month math on `YYYY-MM-DD` strings | (no text) | locale-free |
| `lib/leaderboard.ts:128-129` | period labels | `Tuần này (T2 – CN)`, `Chủ Nhật, 23:59`, `Cuối tháng, 23:59` | week-start assumption in text; demo-only |
| `lib/coach-preview.ts:54` | relative day text | `${n} ngày trước` | no Intl.RelativeTimeFormat; plural needed in en |
| `lib/overview-board.ts:17-24` | relative period text | `... so với ${n} ngày trước` | same |
| `app/error.tsx:18-20` | `HH:mm` from `now.getHours()` (device zone, not VN) | 14:05 | locale-free but zone-inconsistent with the rest |
| `app/privacy/page.tsx:22; app/terms/page.tsx:22` | fixed Vietnamese date sentence | `Ngày 15 tháng 10 năm 2026` | legal text; translate with the page |
| `lib/releases.ts (16 entries)` | release `date` stored as a dd/mm string (e.g. "22/10"), shown as `Cập nhật 22/10` | dd/mm | whats-new/page.tsx:32, whats-new-sheet |

Words involved (for the message catalogue): thứ (Thứ Hai..Thứ Bảy), Chủ nhật/CN, tháng (calendar-sheet.tsx:24,73,81,93; privacy/terms:22; leaderboard.ts:128), ngày (copy), hôm nay / hôm qua / hôm kia (format.ts:125,137; day-templates.ts:219; diary-store.tsx:561; sync, multi-select), tuần này, cuối tháng. No month-name table exists; no year is shown except in formatDesktopDate and the calendar title.

## 5. Units, symbols and separators inside text

- Energy: `kcal` is written as a literal unit by callers (about 430 lines mention it outside tests and mocks); `energyUnit: "kJ"` is selectable (language/page.tsx:120-127) but there is no conversion code anywhere (grep for kJ / 4.184: only settings.ts and the language page).
- Mass/volume: `g`, `mg`, `µg` (U+00B5) appended as ' g' with a space; units are SI so they stay.
- Minutes: `phút` (profile-cards.tsx:246 `${option.minutes} phút`) and the prime `′` (U+2032) in `Ngày tập 60′` (lib/date.ts:25, lib/first-run.ts:158), which is not translated by a unit word.
- Signs: real minus `−` U+2212 (format.ts:161-168), en dash `–` for ranges (format.ts:52,179-180), middle dot `·` as separator in dozens of strings, non-breaking details are not used.
- Percent: `%` directly after the number (`28%`); in some Vietnamese copy 'phần trăm' is spelled (macro-targets-screen.tsx:93,373-382 aria-labels).
- Currency: none in the app (no ₫/VND); paywall is a stub.

## 6. Persisted values that embed locale formatting

- `serving_label` of diary entries: `formatPortionLabel` (lib/portion.ts:573-578), e.g. `Cỡ lớn · 3 quả`, `Đã nấu chín · 1.000 g`; parsed back at lib/portion.ts:581-586 and by lib/diary-edits.ts:117, lib/home.ts:159,230, lib/recent-foods.ts:69, lib/portion.ts:150,263.
- Default names saved as data: `Ngày ${day}/${month}` (lib/day-templates.ts:66), `${bữa} ${day}/${month}` (lib/saved-meals.ts:29), `${name} (của tôi)` (lib/recipe.ts:259), the dish suffix ` · đã chỉnh` (lib/catalog.ts:112).
- The API's own `name_vi` meal slot names and serving labels (see inventory.md Notes).

## 7. What changes for `en`

- Add a current-locale source usable outside React and create the `Intl.NumberFormat` instances per locale (cache by locale+options); replace `"vi-VN"` at lib/format.ts:13,22,30,37,54,55,56. Output differences: `1.041` -> `1,041`, `2,1` -> `2.1`, `<0,01` -> `<0.01`.
- Make `parseNumberInput` locale-aware (the `1.000` rule), then route the 10 inline comma/dot sites through it (list in section 3). Decide what the `decimalSeparator` setting means once locale and separator can differ (it is a separate user choice today).
- Make stored labels locale-independent before switching (serving_label, default names), otherwise old rows cannot be parsed or will read in the wrong language.
- Weekday and 'today/yesterday' words: one localisation point (format.ts:71-79 + the two `[CN,T2..T7]` arrays + calendar-sheet WEEKDAYS) instead of three copies; consider `Intl.DateTimeFormat(locale, {weekday, timeZone: 'Asia/Ho_Chi_Minh'})`.
- Month wording: calendar title and aria-labels need real month names or a locale pattern; day-month order (dd/mm vs mm/dd) is a product decision touching about 10 hand-built helpers in section 4.
- Relative phrases ('N ngày trước') and 'N món' counts need plural-aware messages (see inventory.md plural candidates).
- Leave alone: vn-time.ts `sv-SE`/`en-US` formatters (keys), `Asia/Ho_Chi_Minh` day boundary, `localeCompare` on ISO dates, `toFixed(2)` SVG coordinates.
- `energyUnit` kJ: no conversion exists; either wire it (kcal x 4.184 at display) or hide the option for en v1.
- `<html lang>` and manifest `lang` are static `vi` (app/layout.tsx:68, app/global-error.tsx:46, app/manifest.ts:9).

## Commands used

```
cd apps/web
grep -rnE "toLocale(String|DateString|TimeString)|Intl\." app components hooks lib --include='*.ts' --include='*.tsx' | grep -v __tests__
grep -rnE "\bformat(Number|Amount|Signed|Percent|Range|DayLabel|DesktopDate|PeriodRange)\(|getWeekdayName\(|weekdayShort(Vi)?\(" ...   # call-site tables (tools/gen-formats.cjs runs the same greps)
grep -rnE 'replace\("\.", ?","|replace\(",", ?"\."|toFixed\(|parseNumberInput' app components hooks lib
grep -rnE 'slice\(8|slice\(5, ?7\)|split\("-"\)|ddMm|\$\{month\}' app components lib   # hand-built dd/mm
grep -rnE 'lang=|inputMode="decimal"|"vi-VN"|"vi"' app components lib hooks
grep -rnE 'Thứ|tháng|T[2-7]\b|"CN"' app components lib hooks
grep -rnE 'decimalSeparator|energyUnit|loadSettings' app components hooks lib
node tools/gen-formats.cjs   # writes this file
```
