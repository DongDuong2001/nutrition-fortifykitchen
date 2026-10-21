# feat/v3-redesign: the V3 grand redesign ("App v3 · vibrant + glass")

Source of truth: design/v3/ on Hao's machine (~/Documents/HITMicro/design/v3: V3-SPEC.md, screens/*.dc.html, renders/*.png, icons/). Light mode only; every colour is a token, ready for the dark column. Front end only (review-0200): no logic, store, sync, routing or data-shape change, except the sample day's targets (mock data, V3-SPEC §6, approved in review-0200).

## Token table (app/globals.css @theme)
| token | value | was | note |
|---|---|---|---|
| page | #F2F2F7 | #FFFFFF | Apple systemGroupedBackground; cards stay white |
| card / raised | #FFFFFF | #FFFFFF | |
| surface (field, chip inside a card) | #EEEEF3 | #F6F5F2 | on the page a field is white with shadow-field (0.5 px ring) |
| text / ink | #111317 | #111317 | |
| secondary | #636366 | #6B6A66 | 5,4:1 on the page |
| card-border / divider / track / level-empty | #E5E5EA | #E8E5DE / #E6E2DA / #ECEAE6 / #E6E1D7 | |
| seg-track | #E3E3E8 | (new) | segmented control track |
| cobalt | #2457F5 | #1238D6 | white text 5,6:1 |
| sky / cobalt-on-dark | #5CB8FF | #9EC3FF / #5C86F2 | links and the selected state on ink |
| cobalt-tint | #EAF0FF | #F2F5FF | |
| destructive / destructive-text | #E9152D | #D93F44 / #C4373C | on white cards only (4,1:1 on the page, OPEN_QUESTIONS) |
| success | #008932 | #17945F | |
| amber | #A16A00 | #B07800 | |
| sys-<red…brown>, sys-grey | Apple system colours (V3-SPEC §1) | (new) | fills, dots, tiles |
| deep-<red…brown>, deep-grey | the deep shades | (new) | text and dots on white (all ≥ 4,5:1, tested) |
| level-thieu / -trungbinh / -gandu / -dat | red / yellow / mint / green | level-red / -yellow / -green / -blue | renamed by meaning; gần đủ mint (was green), đạt green (was blue) |
| macro-<kcal,dam,tinhbot,beo,xo,muoi> and -text | cobalt, pink, yellow, green, teal, blue (text in deep) | (new) | the macro identity dots and values |
| tile-<colour>-hi / -base / -lo | IconTile.dc.html's three stops | (new) | food-group icon tiles; --gradient-tile-rainbow for Minh Hào |
| glass, glass-sheet, glass-text, glass-tab-off, glass-cobalt | rgba(255,255,255,.72), .8, #111317, #3C3C43, rgba(36,87,245,.88) | (new) | .glass / .glass-bar / .glass-cobalt utilities; solid under prefers-reduced-transparency and prefers-contrast: more |
| fill | rgba(120,120,128,.16) | (new) | the sheet's Close circle (no glass on glass) |
| shadow-field, shadow-glass, shadow-glass-cobalt, shadow-tile(-ink) | V3-SPEC §4, §5 | (new) | |
| radius-sheet | 28 px | 20 px | sheets float inset 8 px, 28 px corners all round |
| radius-tile | 8 px | (new) | the 30 px settings tile |
| font-display | Saira italic 800/900 | Saira Condensed | headers and key numbers; font-condensed keeps Saira Condensed for the tight numbers V3 uses it for |

Tests: lib/__tests__/token-contrast.test.ts (every text token on its surfaces, 4,5:1), levels.test.ts (the level fills ≥ 3:1 on ink), nutrient-colors.test.ts (every catalogue micro has a colour), food-group-colors.test.ts (every group has its tile stops), components/ui/__tests__/icon-tile.test.ts.

## Steps and commits
1. Tokens: v3-tokens commits.
2. Primitives: AppHeader (the brief's ScreenHeader, extended in place), SectionTitle/SectionHeader, SettingsTile, IconTile, Segmented, glass tab bar, glass toast, the floating sheet.
3. Screens: one commit per screen (checklist below).
4. Sample data: v3-data (0e63042, with c6affc6 taking back the port edits it swept in).
5. Design floor: v3-floor commits (DESIGN.md, design-floor.py, lint-design.mjs, tips 24 h, keyboard).
6. Tutorials, 7. Alignment: below.

## Gates
gate:full on efcb88e: all green, 737 s. typecheck, lint:design, vitest, build:demo, test:align, test:hydration, probe:all (126 PASS, 4 REPORT, 1 QUAR = design-floor.py, 0 FAIL, 1 SKIP), check:live-bundle. gate:fast ran after the commits, on a clean worktree checked out at each commit.

## Screenshots
.screenshots/v3-final/<Name>-<390|1440>-<before|after>.png in the branch's worktree (gitignored): "before" is origin/main's UI, "after" this branch, for every screen.

## Per-screen checklist
| Screen | Design | Commit | 390 | 1440 | Notes |
|---|---|---|---|---|---|
| Hôm nay | V3HomNayB | 9b56dc8 | ✅ matches the render (data: the app's 5/8 by Level, Thiếu nhiều nhất Calcium, Vitamin C) | ✅ desktop frame kept, V3 tokens and cards | the phone page scrolls as one (it was a pinned frame); "Bấm + Thêm" in releases/tips to update in the tutorials step |
| Cài đặt | V3CaiDat | cc7f8e5 | ✅ matches (demo shows Huấn luyện viên) | ✅ two columns kept | SettingsRow in components/settings (Row in ui did not fit the tile row) |
| Tài khoản | V3Account | 47971ab | ✅ | ✅ | |
| Hồ sơ | V3Profile | cc7f8e5, 04aa897 | ✅ field reasons (drafts) | ✅ | sex field unchanged (review-0210); local ChoiceGrid (ChipGroup lg is 52 px with a ring, the board is 48 px) |
| Cân nặng | V3Weight | 04aa897 | ✅ | ✅ | |
| Vi chất | V3Micros | ea6560f | ✅ | ✅ chips + two columns kept | one h1 now |
| Nutrient detail | V3NutrientDetail | 6ec00a0 | ✅ | ✅ | |
| Tổng quan | V3TongQuan | ebe22bb, 70c0587 | ✅ | ✅ 7/5 columns kept | |
| Năng lượng | V3TrendsEnergy | 363fef2 | ✅ | ✅ | |
| Vi chất (Tổng quan) | V3TrendsMicros | 514d22b | ✅ | ✅ | |
| Cơ thể | V3TrendsBody | 7ccc5c3 | ✅ | ✅ | "giữ quanh 65 kg" left out (needs logic) |
| Group page | V3Category | 2a0ad48 | ✅ | ✅ | |
| Giàu | V3Rich | 2e70369 | ✅ | ✅ | |
| Bữa ăn của tôi | V3Meals | 89e2b35 | ✅ | ✅ | |
| Food detail | V3FoodDetail | df883f6 | ✅ (sample: Cơm gạo lứt) | ✅ | |
| So sánh | V3Compare | 9bebfa1 | ✅ | ✅ | |
| Tạo món | V3CreateFood | 4a238ce | ✅ (Tự nhập shot) | ✅ | opens on Tính từ nguyên liệu (app default); no new macro validation; components/foods/food-field (FormRow's 12 px labels did not fit) |
| Sign-in (+ sign-up, forgot, reset) | V3SignIn | 34ef561 | ✅ live flow kept (Google first, as live; cc_18) | ✅ ink split panel kept | |
| Check email | V3CheckEmail | 6d832cd | ✅ | ✅ | |
| Link expired | V3Expired | 412206c | ✅ | ✅ | |
| Setup profile / goal / done | V3SetupProfile, V3SetupGoal, V3SetupDone | 62232ef | ✅ one h1 | ✅ | coach-code field kept; weight − / + added (0,5 kg) |
| Offline | V3Offline | 9adf126 | ✅ | ✅ | |
| Install | V3Install | 32dc9e6 | ✅ | ✅ | |
| 404 | V3NotFound | 7ace105 | ✅ | ✅ | |
| Ngày tập | V3Training | (latest v3-training) | ✅ | ✅ | local duration segmented (needs a disabled state) |
| Share image | V3ShareB | c3b23cb | ✅ structure (Level 2 data: 6/14) | n/a | Hôm nay's share branches and ink-pill now unused (cleanup) |
| Desktop sidebar | (V3-SPEC §3.3) | a9eb861 | n/a | ✅ white column | |
| Khám phá | V3KhamPhaB | a3bceea | ✅ section by section (demo counts) | ✅ desktop keeps the chip row, with tiles | Yêu thích row has no page (OPEN_QUESTIONS); demo-only chips, leaderboard and coaches kept (not in the design) |
| Portion | V3Portion | 162d62a | ✅ matches the board (shot: Cơm gạo lứt with the cook switch) | ✅ desktop pane | So sánh comes with Job 3 (feat/compare-in-add) |
| Sửa món | V3EditEntry | 3d36fa9 | ✅ V3 push page | ✅ | not the inset sheet: routing beyond the /add pattern (OPEN_QUESTIONS, review-0210) |
| + sheet | V3Add | 0039dc2 | ✅ matches the render (AddSearch shot with "gà") | ✅ desktop dialog: Close leading, chips with tiles | carousel titles still use the carousel's Saira header (design: 13 px secondary); "Chỉ thêm kcal" stays while searching (design); chip order kept (Tất cả, Minh Hào, Yêu thích) for minh_hao_tab |

## Judgement calls
- AppHeader stays the one header (no second ScreenHeader component), so 40+ screens kept their imports.
- Both Saira faces load: V3 draws headers in Saira italic and its tight numbers in Saira Condensed.
- The level fills are tested at 3:1 against the ink hero (not the old surface-dark), since V3's hero is ink.
- design-floor.py is quarantined until 29/10 while screens are ported; the PR lists what is left on it.
- Decimal parsing ("," and ".") was already in lib/parse-number; only verified.
- `@theme static`: Tailwind v4 drops theme variables no utility uses; the nutrient and food-group maps name theirs in template strings, so static keeps them.
- Giàu tiles use the deep shade (white text on the base yellow, orange, cyan, green or red is under 4,5:1; the design file also uses deep).

## Probes changed
New: design-floor.py (DESIGN.md auto rules, 3 passes; quarantined until 29/10, see "Left"), v3_foods.py, v3_settings2.py, macro-split.py (from #44), _v3_shots.py (screenshots only).
Updated for the V3 look, each with its V3 equivalent (review-0230 checked none was weakened): cc05, cc06, cc07, cc2_03, cc2_07, cc2_08, cc2_10, cc2_11, cc2_12, cc2_14, cc2_15, cc2_20, cc2_21, cc2_23, cc2_unify, cc_16, cc_17, cc_22, cc_23, cc_26, cc_27c, cc_27f, cc_28b, cc_42_onboarding (the meal +, one tip per 24 h), cc_44, cc_45, cc_46, cc_47, cc_52_training, cc_57_motion, cc_57_strips, cc_63, cc_64_flip, cc_67_part3, cc_68, cc_70_touch_drag, cc_ratio_and_dnd, cc_tutorials, share_micros, smoke (the 404's Về Tổng quan, review-0210), v022_column, v022b_search_ring; run_all.py (the quarantine line).

## Logic changes (review-0200 asks for none; each is flagged)
- lib/mock/sample-day.ts + lib/day-targets.ts: the demo day's targets from lib/targets + lib/rda (mock data, V3-SPEC §6; approved in review-0200).
- lib/tips.ts / onboarding-flags: one tip per 24 h (design-floor; review-0200 addendum; the old pick is held by a test).
- components/keyboard-guard: a focused field the keyboard covers scrolls into view (design-floor).
- lib/use-touch-drag.ts: the auto-scroll scrolls the page when the card no longer scrolls (needed by Hôm nay's page scroll).
- fix(delete-account) dc3da8c: "Xóa" (what the screen asks for) unlocks the button; on main it never did. Own commit, droppable.
- The macro-split fix from #44 (4214324, c1ae0b9, 760f3db), so Đa lượng keeps it and the two PRs merge in either order.

## Field reasons and new copy for Hao to approve (drafts, review-0210)
Field reasons (copied from V3Profile / V3Weight):
- Giới tính: "Chỉ dùng để chọn mức khuyến nghị vi chất cho bạn."
- Năm sinh: "Dùng để chọn mức khuyến nghị theo tuổi."
- Cân nặng (Hồ sơ row): "Dùng để tính kcal, đạm và chất béo."
- Mục tiêu: "Dùng để chọn số kcal mỗi kg cân nặng."
- Ngày tập mặc định: "Dùng để tính lượng muối khi tập."
- Nhóm Bự / Bé: "Dùng để chọn liều khi tập."
- Cân nặng page: "Dùng để tính kcal, đạm và chất béo mỗi ngày."

Lines derived from existing numbers (V3 boards' wording):
- Năng lượng hero: "Trung bình thấp hơn mục tiêu X kcal mỗi ngày." (also "cao hơn", "nằm trong mục tiêu")
- Năng lượng: "<macro> chiếm nhiều kcal nhất: N%."
- Vi chất (Tổng quan) hero: "n trên 22 vi chất đạt mục tiêu; m đang thiếu."
- Cơ thể: "Thấp nhất … kg, cao nhất … kg."
- Nutrient detail: "Chưa ngày nào đạt 1.000 mg; cao nhất T7 (90%)." and "Nhiều nhất từ X: n mg."
- Bữa ăn của tôi empty state: "Mở Hôm nay ›"; Sửa món: "Sau khi xóa sẽ có nút “Hoàn tác” trong 5 giây."
- Có gì mới (21c): the four V3 items and the three tour steps (lib/releases.ts).
- Sign-in family: placeholders "Mật khẩu của bạn", "Ví dụ: vichat2026", "Gõ lại mật khẩu ở trên"; expired: "Dùng để gửi liên kết mới. Bạn không cần mật khẩu.", "…Bạn gửi liên kết mới là vào được ngay."; check email: "Sai email?", "Bạn gửi lại được sau N giây."
- Setup: "Bắt buộc", "Hiện trên ảnh chia sẻ. Bạn đổi tên được sau.", "Chỉ dùng để chọn mức khuyến nghị vi chất theo giới, ví dụ Iron 8 mg (nam) và 18 mg (nữ).", "Dùng để tính tuổi, vì khuyến nghị vi chất khác nhau theo tuổi.", "Dùng để tính mục tiêu kcal, đạm và béo mỗi ngày.", "Nhập tên hiển thị để tiếp tục.", "Dùng để tính kcal mỗi ngày. Bạn đổi lại được trong Cài đặt.", "Quay lại bước 1 và nhập tên hiển thị để hoàn tất." (not in the design)
- Offline: "Đang ngoại tuyến · dữ liệu đã lưu", "Trang bạn vừa mở chưa được lưu trên máy, nên cần có mạng mới xem được.", "Mở Hôm nay"; Install: "Cài trên iPhone, 3 bước"; 404: "Không có trang".
