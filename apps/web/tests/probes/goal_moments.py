"""feat/sound-goals: the goal moments on Hôm nay (390 x 844 and 1440 x 900, demo build).

1  T1: the demo day's Vitamin C is under 100 %; adding Bưởi da xanh 150 g from + → after the sheet closes the Vitamin C row gets m-goal-pop (percent),
   m-goal-sheen (bar) and the counter pops; the polite line says "Vitamin C đạt mục tiêu"; every class is gone 1.6 s later; the add and the goal made 2 sounds.
2  The same goal again the same day (a second add): no class at all, 1 sound (the add).
3  T2: enough kcal → the hero gets m-goal-ring, its label reads "Đủ kcal hôm nay" for 2,4 s and then the usual label glides back.
4  T3: Sữa, Cải bó xôi (8/8, Chất xơ short: "Thiếu nhiều nhất: Chất xơ", no sparks), Đậu gà → the sparks fly inside the card ±8 px, the bars sheen top to bottom,
   the slot reads "Đủ chất hôm nay"; Hoàn tác brings "Thiếu nhiều nhất" back with no motion, and adding the same foods again replays nothing.
The rest (reduced motion, sound off, first food, Ngày tập, the Âm thanh row) is goal_moments_day.py.
Screenshots: out/goal-moments/*.png. Run with: ALIGN_BASE_URL=http://localhost:3105 npm run probe -- tests/probes/goal_moments.py
"""
# PROBE_COVERS: app/(app)/(tabs)/** components/home/** components/ui/level-bar.tsx components/ui/goal-label.tsx components/training/** app/(app)/(dashboard)/training/** app/(app)/settings/** components/settings/** lib/goals.ts lib/goal-*.ts lib/sound.ts lib/cue.ts lib/diary-store.tsx hooks/use-training-moment.ts
import sys

from playwright.sync_api import sync_playwright

from _goals_scenarios import *  # noqa: F401,F403
from _goals_scenarios import R, t1, t2, t3, PHONE, DESKTOP


with sync_playwright() as p:
    browser = p.chromium.launch()
    for vp, tag in ((PHONE, "390"), (DESKTOP, "1440")):
        t1(browser, vp, tag)
        t2(browser, vp, tag)
        t3(browser, vp, tag)
    browser.close()

print(f"\n{len(R.problems)} problem(s)")
sys.exit(1 if R.problems else 0)
