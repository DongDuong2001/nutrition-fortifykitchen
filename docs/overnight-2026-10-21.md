# Overnight run, 20 → 21/10/2026

One session, jobs in the order of `prompts/overnight-1021.md`. **Nothing was merged**: the auto-mode permission classifier refused the
first merge (PR #28) as a merge without review and the merges stayed undone, so Jobs 1 and 2 wait for Hao's go (commands below). Jobs 3
and 4 are open as PRs for Hao, as the brief says. No deploy, no database, no migration, no server. Commits and PR text carry no AI names; the commit identity is
Vu Thien Minh Hao <s3938011@rmit.edu.vn>.

## What happened, job by job

| Job | Result |
|---|---|
| 1 PR #28 fix/source-tags | Up to date with main, CI green, mergeable (CLEAN). **Not merged**: the merge command was refused by the auto-mode classifier ("merge without review"). Not retried by another route. |
| 1 PR #22 data/new-foods-1020, PR #24 data/fix-outliers-1020 | Mergeable and CLEAN on GitHub, CI green. **Not merged**, same reason. Each is 33–35 commits behind main with no conflict reported; PROGRESS.md would need "keep both sides" only if a local merge shows one. |
| 2 docs/handover-1020 | Done and pushed: [PR #30](https://github.com/DongDuong2001/nutrition-fortifykitchen/pull/30). `docs/dong-handover-2026-10-20.md`, the PROGRESS 20/10 entry, HANDOFF and OPEN_QUESTIONS pointers, the catalogue-cache idea. gate:fast green. **Not merged.** The Red Bull "1 lon (250 ml)" portion could not be put in a repo data file: no file in the repo holds that food (see OPEN_QUESTIONS, Handover 20/10). |
| 3 feat/fluid-add | [PR #32](https://github.com/DongDuong2001/nutrition-fortifykitchen/pull/32), base `main`, **open for Hao, not merged**. Add sheet as an intercepting route over the real screen (no copy of Hôm nay), one `leave()` for every way out, one toast element, release physics as one WAAPI animation, lazy sheets mounted closed, press feedback on touch-down, hold and landing for a dropped row, reduced-motion fixes. Open 4 frames / 64 ms → 2 frames / 30 ms; blank frames 1 → 0; hard cuts on add 5 → 0; first open of the calendar or ⋯ 335 → 35 ms. Note: `docs/pr/feat-fluid-add.md`. |
| 4 fix/polish-1020 | [PR #33](https://github.com/DongDuong2001/nutrition-fortifykitchen/pull/33), **stacked on `feat/fluid-add`** (base is that branch; merge #32 first), **open for Hao, not merged**. One interruption per app open (Có gì mới > install pop-up > tip), "Có bản mới" above the nav and out of the way, the /add list drawing 5 rows per category (live-sized: 500 rows / 4,551 nodes / 1,010 Tab stops → 50 / 501 / 110), portion sheet ✕ and focus return, 44 px meal header, one `<main>` and one h1 per screen (smoke checks it). Note: `docs/pr/fix-polish-1020.md`. |

## To merge what the brief allows (Hao's go)

In this order, merge commits, each only with green CI:

```bash
gh pr merge 28 --merge   # fix/source-tags
gh pr merge 22 --merge   # data/new-foods-1020
gh pr merge 24 --merge   # data/fix-outliers-1020 (merge origin/main in first if PROGRESS.md conflicts: keep both sides)
gh pr merge 30 --merge   # docs/handover-1020 (this note rides on it)
```

Then Jobs 3 and 4 for review: #3 first, #4 after it (it is stacked on it).

## Hashes

**Job 2**, `docs/handover-1020` (PR #30): see the branch log; this note rides on it.

**Job 3**, `feat/fluid-add` (head dd81c3a, base origin/main 619a59b): 6a2c927 intercepting add sheet · ba18dc5 release in the same pointerup · bd4e9ac lazy sheets, no TrayCard pop · 6897f5e press feedback, landing · cfe772e probe and motion rules · 0b81a39 merge origin/main · 1a8c55a probes follow the flow · e9eea13 PR note · 9a963db probe timing fixes · dd81c3a gate output in the PR note.

**Job 4**, `fix/polish-1020` (off feat/fluid-add): e35c07b interruption order · 372fdf7 update toast · 9a0e09a add list, portion sheet, search, buttons · d1fa0a0 hit areas, main, nutrient label, smoke · 4080737 probes · 7d581de merge feat/fluid-add · be5a203 tip over the add sheet's own empty field · 94e8913 landmarks · 581293f polish probes, tests, screenshots · 66b6c91 Hôm nay's main wraps the header · then the PR note commits.

## Gate output

Job 3 (`feat/fluid-add`, head dd81c3a, port 3126):

```
gate:full: 642 s wall clock
  typecheck ok 0 s · vitest ok 6 s (163 files, 2073 tests, 1 skipped) · build:demo ok 7 s
  test:align ok 73 s · test:hydration ok 109 s
  probe:all ok 629 s   112 PASS, 4 REPORT, 0 QUAR, 0 FAIL, 1 SKIP
gate:full: all green
```

Job 4 (`fix/polish-1020`, head 66b6c91, port 3126):

```
gate:full: 656 s wall clock
  typecheck ok 0 s · vitest ok 6 s (166 files, 2097 tests, 1 skipped) · build:demo ok 7 s
  test:align ok 73 s · test:hydration ok 109 s
  probe:all ok 642 s   113 PASS, 4 REPORT, 0 QUAR, 0 FAIL, 1 SKIP
gate:full: all green
```

Both runs went red once first (Job 3: `cc12`, `cc_57_strips` timing assumptions; Job 4: `test:align` `home-page`, fixed by moving the `<main>`) and were fixed, not skipped; the green runs are the ones above. Job 2: gate:fast green.

## Open questions

All in `OPEN_QUESTIONS.md`: "Handover 20/10/2026", "feat/fluid-add (21/10/2026)" and "fix/polish-1020 (21/10/2026)". The ones that need an answer first:
1. **Merges:** nothing was merged because the permission classifier refused `gh pr merge 28`; say go and run the commands above (or tell me to).
2. **Job 3:** the back-button behaviour changed with the intercepting route (note: "routing changes"); check the add sheet on an iPhone once #29 is in, because the search field now takes focus after the slide.
3. **Job 4:** the 5-per-category limit is my number; the update bar reserves 64 px and select mode covers it; time to open /add at the live catalogue size was not measured in a browser.
4. **Job 2:** the Red Bull "1 lon (250 ml)" portion is in no repo data file (OPEN_QUESTIONS, Handover 20/10).
