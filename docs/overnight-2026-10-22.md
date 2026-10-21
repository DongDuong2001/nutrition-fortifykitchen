# Overnight 21→22/10/2026: the V3 grand redesign

Brief: ~/Documents/HITMicro/prompts/overnight-1022-v3.md (Job 1 → Job 2 → Job 3), plus Job 4 from review-0205.

## PRs
| Job | Branch | PR | Status |
|---|---|---|---|
| 1 macro split saves | fix/macro-split-save | https://github.com/DongDuong2001/nutrition-fortifykitchen/pull/44 | open, gate:full all green, not merged |
| 2 V3 redesign | feat/v3-redesign | (pending) | in progress |
| 3 Compare in the + sheet | feat/compare-in-add | (pending) | not started |
| 4 Ngày ăn mẫu | feat/ngay-mau | (pending) | queued by review-0205 |

## Gate summaries
- Job 1 gate:full (e61725d): all green, 727 s. typecheck, vitest, build:demo, test:align, test:hydration, probe:all 124 PASS / 4 REPORT / 0 QUAR / 0 FAIL / 1 SKIP, check:live-bundle.

## Reviews read (night/2026-10-22)
- review-0155.md (01:57): fidelity bar for the ports; no routine actions.
- review-0200.md (01:57): front-end-only rule; no routine actions.
- review-0205.md (01:57): Job 4 after Job 3; priority order.

## Screenshots
apps/web/.screenshots/v3/<Name>-<width>-<before|after>.png in the feat/v3-redesign worktree (gitignored). "before" comes from origin/main's UI (Job 1's build), "after" from the branch.

## Notes on how the night ran
- Gates for Job 2 ran on a separate clean worktree (nutrition-fk-v3-gate) checked out at each commit, so the ports in progress never leaked into a gate.
- 0e63042 staged the whole tree while three ports were mid-edit; c6affc6 takes those files back out (no force-push), so the net of the two is the step-4 change alone.
- The sync-fake-api suite pinned the date 2026-10-20 and judged it by the real clock, so it went red on 22/10 on main; its clock is pinned in both Job 1 and Job 2 (same commit, cherry-picked).

## What's left
(filled in at the end)

## Open questions (also in OPEN_QUESTIONS.md)
(filled in at the end)
