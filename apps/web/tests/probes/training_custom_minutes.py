"""feat/training-custom-minutes (overnight 22→23/10, job 11): Ngày tập's Tùy chỉnh.

At 390 (demo build, today): the sixth chip Tùy chỉnh opens a picker (− and + of 44 px, a numeric field); 150 → the chip reads
"150 phút" and stays picked, the checklist has 7 salt doses (one every 20 min), and a reload keeps it. 999 typed is clamped to 480,
5 to 30. Hồ sơ has the same Tùy chỉnh chip. In the demo nothing is sent to the API (it takes only 0, 45, 60, 90, 120 and 240 today).
Run with: ALIGN_BASE_URL=http://localhost:3101 npm run probe -- tests/probes/training_custom_minutes.py
"""
# PROBE_COVERS: app/(app)/(dashboard)/training/** components/training/** components/settings/profile-cards.tsx lib/training.ts lib/training-limits.ts
import json
import os
from pathlib import Path
import re
import sys

import _demo  # noqa: F401
from playwright.sync_api import sync_playwright

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3101")
SETTINGS = json.dumps({"installPrompt": {"dismissCount": 0, "snoozeUntil": 0, "done": True, "firstSeenIso": "2026-01-01"}})
GROUP = '[role=group][aria-label="Thời gian tập"]:visible'
problems = []


SHOTS = Path(__file__).resolve().parent.parent.parent / ".screenshots"
SHOTS.mkdir(exist_ok=True)

def check(cond, msg):
    print(("[PASS] " if cond else "[FAIL] ") + msg)
    if not cond:
        problems.append(msg)


def pick(pg, typed):
    pg.locator(GROUP).locator("button[aria-haspopup=dialog]").click()
    field = pg.get_by_label("Số phút tập")
    field.wait_for(state="visible")
    field.fill(typed)
    field.blur()
    pg.wait_for_timeout(200)
    value = field.input_value()
    pg.get_by_role("button", name="Xong").click()
    pg.wait_for_timeout(600)
    return value


with sync_playwright() as p:
    browser = p.chromium.launch()
    ctx = browser.new_context(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True)
    ctx.add_init_script(f"try {{ localStorage.setItem('h1t_settings_v1_demo', {json.dumps(SETTINGS)}); }} catch (e) {{}}")
    pg = ctx.new_page()
    pg.goto(BASE + "/training", wait_until="networkidle")
    pg.wait_for_timeout(1200)
    chip = pg.locator(GROUP).locator("button[aria-haspopup=dialog]")
    check(chip.count() == 1 and "Tùy chỉnh" in chip.inner_text(), "a Tùy chỉnh chip after 120 phút")
    chip.click()
    pg.wait_for_timeout(400)
    pg.screenshot(path=str(SHOTS / "training-custom-picker-390.png"))
    for name in ("Bớt 30 phút", "Thêm 30 phút"):
        b = pg.get_by_role("button", name=name).bounding_box()
        check(b is not None and b["width"] >= 44 and b["height"] >= 44, f"{name} is 44 px ({b})")
    check(pg.get_by_label("Số phút tập").get_attribute("inputmode") == "numeric", "the field brings the numeric keyboard")
    pg.keyboard.press("Escape")
    pg.wait_for_timeout(500)

    check(pick(pg, "999") == "480", "999 is clamped to 480")
    check(pick(pg, "5") == "30", "5 is clamped to 30")
    pick(pg, "150")
    check(chip.inner_text().strip() == "150 phút" and chip.get_attribute("aria-pressed") == "true", f"the chip reads 150 phút and stays picked ({chip.inner_text()!r})")
    # the visible checklist only: the page also keeps a hidden (aria-hidden) copy of the phases
    salts = pg.locator("text=/Muối · phút/").filter(visible=True).count()
    check(salts == 7, f"150 minutes: 7 salt doses ({salts})")
    pg.screenshot(path=str(SHOTS / "training-custom-150-390.png"), full_page=True)
    pg.set_viewport_size({"width": 1440, "height": 900})
    pg.wait_for_timeout(500)
    pg.screenshot(path=str(SHOTS / "training-custom-150-1440.png"), full_page=True)
    pg.set_viewport_size({"width": 390, "height": 844})
    pg.wait_for_timeout(300)
    pg.reload(wait_until="networkidle")
    pg.wait_for_timeout(1200)
    check(pg.locator(GROUP).locator("button[aria-haspopup=dialog]").inner_text().strip() == "150 phút", "a reload keeps 150 phút")

    pg.goto(BASE + "/settings/profile", wait_until="networkidle")
    pg.wait_for_timeout(1000)
    check(pg.get_by_role("button", name=re.compile("^Tùy chỉnh")).count() >= 1, "Hồ sơ has the same Tùy chỉnh chip")
    ctx.close()
    browser.close()

print(f"\n{len(problems)} problem(s)")
sys.exit(1 if problems else 0)
