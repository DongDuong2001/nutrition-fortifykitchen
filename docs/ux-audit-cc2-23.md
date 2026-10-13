# UX/UI audit: Khám phá and Cài đặt (cc2-23)

Written 14/10 before the changes. Stays inside Cobalt Sign, `design/UI-RULES.md` (§6 Visual character) and
`design/IA-v2.md`. No behaviour changes: same routes, same data, same copy except where noted.

## Khám phá (`/explore`)

What is bland today: a search field, one row of eleven chips, then five equal white cards (Gần đây, Yêu thích,
Bữa ăn của tôi, Món của tôi, Món giàu vi chất). Everything is a vertical list of the same row; nothing says what the
screen is for, and the most useful list (Món giàu vi chất, "what should I eat for calcium") sits last.

| # | Today | Change | Why |
|---|---|---|---|
| 1 | Món giàu vi chất is the last card, eight identical text rows | Move it to the top, under the chips, as a horizontal carousel of tiles: "Giàu canxi", "Giàu sắt" … One dark or cobalt tile per nutrient, colour by nutrient group (vitamins cobalt, minerals ink, macros dark surface), Saira name | It is the one thing only this app does; it deserves the accent. A tile is a decision ("calcium"), a row is a list. Uses UI-RULES §6: Saira key text, colour means something |
| 2 | Gần đây and Yêu thích are cards of three rows each | Carousels of small food cards (name, portion · kcal), same card as the add sheet but the card opens the food detail | Same pattern as the add sheet, so it is learned once; a carousel shows up to 8 items in the height of one row |
| 3 | Bữa ăn của tôi and Món của tôi are separate cards with a bordered button | Keep as cards (they hold management actions); the create button is the shared centred `CreateFoodButton` | Consistency with the add sheet and category pages |
| 4 | Pressed state differs per row component | Tiles and cards press at scale 0.97 over 150 ms, rows keep the divider pattern | UI-RULES §5 |
| 5 | Empty Gần đây and Yêu thích are a grey sentence | Same sentence, inside the carousel's slot so the page height does not jump | Calm layout |

## Cài đặt (`/settings`)

What is bland today: four equal white cards of one row each (Hồ sơ, Tài khoản, Mục tiêu, Ứng dụng), a dark Pro card
and a "Vùng nguy hiểm" card with a bare red title. The numbers that matter (the user's targets) are a grey hint under a
row; there are no icons, so every row looks the same.

| # | Today | Change | Why |
|---|---|---|---|
| 1 | Profile row: title and a grey summary line | A profile card on the dark surface: name, "Nam · sinh 2003 · 65 kg · Giữ cân", and the targets in Saira: "1.950–2.275 kcal · đạm 104–143 g", tappable to /settings/profile | One dark accent card per screen; the targets are the product's promise and should be the first thing seen |
| 2 | Mục tiêu mỗi ngày is its own card with one row | Becomes a row inside "Của bạn" group with Tài khoản; icons at the left of every row (22 px, stroke 1,8) | Fewer one-row cards; icons let people find a row without reading |
| 3 | Ứng dụng rows (Ngôn ngữ, Nhắc nhở, Nguồn dữ liệu, Thêm vào màn hình chính) with no icons | Same rows with icons, grouped under "Ứng dụng" in one card with dividers | Row pattern: min 48 px, divider token, chevron |
| 4 | Pro offer, dark, the second dark card | Becomes a light card with a cobalt outline pill "Xem gói" so only the profile card is dark | One dark accent card per screen (UI-RULES §6) |
| 5 | "Vùng nguy hiểm" card with a red title | Same destructive zone at the very bottom, separated by 24 px, quiet red text row with an icon, still one tap to a confirm step | Clear zone, no accent colour competing with the hero |
| 6 | Press feedback is only `scale-[0.99]` on rows | Rows keep it; the profile card presses at 0.97 | UI-RULES §5 |

## Out of scope on purpose
- No new settings, no new data, no copy changes beyond the group titles above.
- Sub-screens of Cài đặt (/settings/profile, targets, account, …) are not changed in this pass.
