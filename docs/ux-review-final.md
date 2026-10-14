# UX review, final pass (cc2-19)

Branch `feat/ui-cc2-19` from origin/feat/ui `a4a39ac`. Checked on the production build (:3102) in the built-in browser at 390 px and by the probe `tests/probes/cc2_19.py` at 390 and 1280.

Scope of this pass: the nine journeys from the reviewer's 23:20 note. Coverage is partial, and this file says where. Taps are counted from the walk; "not timed" means the journey was checked for layout and reachability only.

## Journeys

| # | Journey | Taps (observed) | Result | Problems found | What changed |
|---|---|---|---|---|---|
| a | Fresh install → setup → first breakfast | — | **Not walked.** Signed-out `/diary` redirects to `/signin` (correct). Sign-up, setup and first entry were not walked end to end. | None confirmed | Nothing |
| b | Log a repeat lunch in ≤ 2 taps | "+" on Bữa trưa (1), a Gần đây card's "+" (2) | Reachable in 2 taps on the add sheet. Not timed on a real repeat. | None confirmed | Nothing |
| c | Today's Vi chất → lowest nutrient | Vi chất tab (1), Vitamin B1 square (2), "Xem chi tiết Vitamin B1" (3) | Lowest nutrient first, link to /micros/b1 present. Reached in 3 taps. | None confirmed | Nothing; probe asserts it |
| d | This week vs last week | Tóm tắt (already open), "Kỳ trước" (1) | Change line "Giảm 333 so với 7 ngày trước" and the period control are on the first screen. Period label broke at the dash: "09/10 – / 15/10" | **Period label split across two lines at 390** | Dates now joined with a non-breaking dash in `PeriodControl` (`overview-frame.tsx`); `cc2_10` heading helper now collapses whitespace |
| e | Find a calcium-rich food and add it | Khám phá (1), "Giàu canxi" (2), first row (3), add (4, not measured) | List shows each food with % of the daily target. Reached in 3 taps. | None confirmed | Nothing |
| f | Save a meal as Bữa ăn của tôi and reuse it | — | **Not walked.** | — | — |
| g | Change goal or weight and see targets update | — | **Not walked.** | — | — |
| h | Open yesterday, confirm read-only | Nhật ký (1), ‹ (2) | "Đang xem ngày cũ · Về hôm nay" banner, no add link on past meals, "Chưa ghi" on empty meals. | None confirmed | Nothing; probe asserts it |
| i | Food detail from Khám phá, back button and tab bar | Khám phá → row → back | Back returns to Khám phá; bottom tab bar present on both screens. | None confirmed | Nothing; probe asserts back |

## Other things seen and not changed

- **Sign-in lead text (`/signin`, 390):** "Đăng nhập để xem tiếp nhật ký và vi chất của bạn." leaves "bạn." alone on the last line. Should be `text-balance`. Not changed in this pass (cosmetic, and the copy file is shared with the voice audit).
- **Tóm tắt at 390:** the period control is compact and reads well; no change.
- **Khám phá:** the Gần đây carousel shows the next card's edge (intended scroll hint). Fine.
- `/overview` is not a route (404 with "Về Tổng quan"). The tab is `/`. No link points to `/overview`, so nothing to fix.

## Open for Hao's decision

- None raised by this pass. The 9-journey walk is not complete (a, f, g not walked; b and e not timed). A second pass on those three is the next step.

## Gates and evidence

- Probe: `tests/probes/cc2_19.py`, 22 ok at 390 and 1280 (run on the production build after the fix).
- Screenshots: `apps/web/.screenshots/cc2-19-{micros,calcium,yesterday}-{390,1280}.png`.
- Full gates: see the night note (`docs/night-2026-10-13.md`, cc2-19 section).
