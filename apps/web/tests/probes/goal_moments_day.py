"""feat/sound-goals: the rest of the goal moments (390 x 844 and 1440 x 900, demo build; first food on an empty account).

5  Reduced motion: no goal class and no sparks at all, the words still change.
6  Âm thanh off: the add makes no sound node.
7  First food ever (empty account, not demo): the hero label reads "Món đầu tiên!" for 2,4 s, 2 sounds; the second add: nothing. Demo: never.
8  Ngày tập done: the tick that completes the checklist glides its phase header to "Xong Ngày tập hôm nay" and pops its "x / y" once; an untick and a tick again: nothing.
9  Cài đặt: the Âm thanh row is there, on by default, and switching it on plays the add sound once.
Screenshots: out/goal-moments/*.png. Run with: ALIGN_BASE_URL=http://localhost:3105 npm run probe -- tests/probes/goal_moments_day.py
"""
# PROBE_COVERS: app/(app)/(tabs)/** components/home/** components/ui/level-bar.tsx components/ui/goal-label.tsx components/training/** app/(app)/(dashboard)/training/** app/(app)/settings/** components/settings/** lib/goals.ts lib/goal-*.ts lib/sound.ts lib/cue.ts lib/diary-store.tsx hooks/use-training-moment.ts
import sys

from playwright.sync_api import sync_playwright

from _goals_scenarios import *  # noqa: F401,F403
from _goals_scenarios import R, training, reduced, sound_off, first_food, sound_row, PHONE, DESKTOP


with sync_playwright() as p:
    browser = p.chromium.launch()
    for vp, tag in ((PHONE, "390"), (DESKTOP, "1440")):
        training(browser, vp, tag)
    reduced(browser)
    sound_off(browser)
    first_food(browser, False)
    first_food(browser, True)
    sound_row(browser)
    browser.close()

print(f"\n{len(R.problems)} problem(s)")
sys.exit(1 if R.problems else 0)
