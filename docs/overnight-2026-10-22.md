# Overnight 21→22/10/2026: the V3 grand redesign

Brief: ~/Documents/HITMicro/prompts/overnight-1022-v3.md (Job 1 → Job 2 → Job 3), plus Job 4 (Ngày ăn mẫu) added by review-0205. Nothing was merged or deployed; apps/api, migrations and deploy were not touched; commits are by Vu Thien Minh Hao with no AI names.

## PRs (merge in this order)
| # | Job | Branch | PR | Status |
|---|---|---|---|---|
| 1 | Macro split saves | fix/macro-split-save | https://github.com/DongDuong2001/nutrition-fortifykitchen/pull/44 | open, gate:full all green, not merged |
| 2 | V3 redesign | feat/v3-redesign | https://github.com/DongDuong2001/nutrition-fortifykitchen/pull/45 | open, gate:full all green, not merged. Carries #44's three commits, so merge #44 first |
| 3 | Compare in the + sheet | feat/compare-in-add | https://github.com/DongDuong2001/nutrition-fortifykitchen/pull/46 | open, stacked on #45, gate:full all green, not merged |
| 4 | Ngày ăn mẫu, Part A | feat/ngay-mau | JOB4_PR | JOB4_STATUS |

## Gate summaries
- **#44** (e61725d): all green, 727 s.
  - probe:all: 124 PASS / 4 REPORT / 0 QUAR / 0 FAIL / 1 SKIP.
  - Also typecheck, vitest, build:demo, test:align, test:hydration, check:live-bundle.
- **#45** (efcb88e): all green, 737 s.
  - probe:all: 126 PASS / 4 REPORT / 1 QUAR (design-floor.py, see What's left) / 0 FAIL / 1 SKIP.
  - Also lint:design, test:align, test:hydration, check:live-bundle.
  - The first gate:full (20de29d) was red. 27 probes that gate:fast never selected still encoded the old look, test:align failed on 4 routes, and test:hydration failed. Each failing check was replaced with its V3 equivalent. Three alignment groups were moved in the app, and the /training desktop column became a `<main>`.
- **#46** (3312c68): all green, 744 s. probe:all: 127 PASS / 4 REPORT / 1 QUAR / 0 FAIL / 1 SKIP.
- **Job 4:** JOB4_GATE.
- **gate:fast** ran after every commit. For #45 it ran on a separate clean worktree (nutrition-fk-v3-gate) checked out at the commit, so the ports in progress never leaked into a gate.

## Screenshots
- **V3 screens:** feat/v3-redesign worktree, `apps/web/.screenshots/v3-final/<Name>-<390|1440>-<before|after>.png` (gitignored).
  - 36 screens, before and after at both widths.
  - "before" is origin/main's UI; "after" is this branch's clean build.
  - Compare them with ~/Documents/HITMicro/design/v3/renders/V3<Name>.png.
- **Job 3:** `.screenshots/compare-in-add-{390,1280}-{panel,picker,table}.png` in its worktree.
- **Job 4:** `.screenshots/ngay-mau/NM*-{390,1280}.png` in its worktree.

## Reviews read (night/2026-10-22) and what was done
- **review-0155** (01:57): the fidelity bar for the ports was relayed to every port. No routine actions.
- **review-0200** (01:57): the front-end-only rule was applied and relayed. No routine actions.
- **review-0205** (01:57): Job 4 was queued and built after Job 3; the priority order was followed.
- **review-0210** (02:05): routine action 1 is done in 1525809 (Về Tổng quan goes to /trends on the 404 and the error page, and smoke asserts it). The decisions were applied:
  - sign-in keeps the email + password form;
  - Sửa món stays a page, because a sheet needs routing beyond the @sheet pattern;
  - Ngôn ngữ has no "Theo điện thoại";
  - the sex field is unchanged;
  - new copy is listed as drafts in each PR.
- **review-0230** (02:31): no routine actions and no must fix. Should fix 1 (one commit per screen, checked against its board) is done. The 05:30 pace checkpoint was not needed: every screen was ported by 03:44.
- **review-0430** (04:31): no routine actions and no must fix. Should fix:
  - the "merge #44 first" note is in #45's body;
  - #45 and #46 were opened as soon as their gate:full was green;
  - Job 4 is Part A only.
- **ack.md** has a line for each review.

## What's left
- **#45, the design floor:**
  - The undo stack of 5 is not built. A real stack changes the diary store and outbox semantics, which review-0200 forbids (OPEN_QUESTIONS; the reviewer suggests option a).
  - design-floor.py stays quarantined until 29/10 for the landing page's cobalt-on-ink text (already failing before V3) and for day bars and minute chips under 44 px wide at 200 % text.
  - Five sheets keep a footer "Đóng" beside the V3 leading Close.
- **#45, cleanup:**
  - Hôm nay's share branches and ink-pill are unused now.
  - At 150 % text, the share image's colour key overlaps itself.
- **#45, Hao's call:**
  - dc3da8c (the Xóa tài khoản confirm word) is a real bug on main too. It is in its own commit: keep it, and maybe hotfix main.
  - The field reasons and new copy listed in docs/pr/feat-v3-redesign.md need approval.
- **Job 4:**
  - Part B (auto-apply, "Dự kiến") is not built.
  - The old copy-yesterday sheet is unused.
  - The template editor removes foods but cannot add them.
- **Dong:**
  - profile columns for the macro split (#44);
  - a `day_templates` table (Job 4).

## Open questions (all in OPEN_QUESTIONS.md on the branches)
- **fix/macro-split-save:**
  - (Dong) profile columns `macro_mode`, `macro_ratios`, `macro_fixed`, `custom_energy_kcal`, `custom_targets` in PUT /me/profile and GET /me. Until then the split is per device.
  - (Hao) the live-like probe pass stops at /signin on a fresh live build. It is the shared probe harness (`hotfix_supp_log.py` stops there too).
- **feat/v3-redesign, colour and data:**
  - (Hao) V3's destructive red #E9152D is 4,1:1 on the grey page, so destructive text sits on white cards only.
  - (Hao) The undo stack of 5: options (a) undo from the entry, or (b) a real stack.
  - (Hao) design-floor.md has no "Part 2 items 1–15". The brief's list was used.
  - (Hao) The sample day comes from lib/targets and lib/rda. The Calcium food list (259) vs the day row (331) and Manganese's 1,8 mg stay as they are, because they are food values. The app's logic wins over the mockups' numbers.
  - (Hao) AppHeader is the ScreenHeader.
  - (Hao) The ports used beyond 3101.
- **feat/v3-redesign, screens:**
  - (Hao) Khám phá's Yêu thích row has no page.
  - (Hao) The saved-meals card moved to /explore/meals.
  - (Hao) The heart is pink.
  - (Hao) Hôm nay scrolls as one page on a phone.
  - (Hao) The + sheet keeps Chỉ thêm kcal while searching, and its chip order.
  - (Hao) Sửa món stays a page.
  - (Hao) The app's "Xóa" spelling is kept.
  - (Hao) The five duplicate footer "Đóng" buttons; the 150 % share key and the cramped dish name.
- **feat/compare-in-add:** (Hao) So sánh sits under the kcal card, where V3Portion draws it, not beside Xem chi tiết.
- **feat/ngay-mau:**
  - (Dong) the `day_templates` table.
  - (Hao) the Hôm qua card's meals, the unused copy-yesterday sheet, and remove-only editing.

## Notes on how the night ran
- **The screen ports** ran as Sonnet subagents, at most six at a time, on disjoint files. Each diff and screenshot was reviewed against the board before its commit. One commit per screen.
- **Two commits swept in other ports' in-progress edits:**
  - 0e63042 staged the whole tree; c6affc6 takes those files back out without a force-push.
  - 9a19b6e carried a port's probe edits; fefbfd2 corrects them.
  - From then on every commit named its files.
- **Shared test fix:** the sync-fake-api suite pinned 2026-10-20 and judged it by the real clock, so it went red on 22/10 on main. Its clock is pinned in #44 (477f0a7, cherry-picked into #45).
- **Ports:**
  - gates on 3101, in the gate worktree;
  - the shared demo dev server for the ports on 3102;
  - "before" shots on 3112;
  - Job 3 on 3121, Job 4 on 3131;
  - two early gates on 3111 while #44's gate:full held 3101.
- **Dev servers in other worktrees:** one fix subagent's cleanup (`pkill` on its own port) may also have stopped the dev servers on 3109 and 3207, which belong to other worktrees. They were not restarted. The 3102 dev server was restarted and is still running.
- **@theme static:** Tailwind v4 dropped the theme variables that are only named in template strings, so IconTiles and the Giàu tiles drew blank until `@theme static` (791faf6). The token tests read the static block.
