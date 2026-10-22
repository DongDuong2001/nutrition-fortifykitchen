"""fix/compare-back (overnight 22→23/10, job 5): Back from So sánh returns to the same food's portion.

At 390 (demo build): + → search "gà" → one food into the Khay → a food → its portion sheet (an amount typed) → So sánh → one more
food → So sánh (2) → /foods/compare → Back: the + sheet with the portion sheet of that same food, the amount, the search and the
Khay as they were. Back again goes to the list (search and Khay kept), ✕ on the portion sheet closes it too, and one more Back
leaves the + sheet for Hôm nay. On main the first Back found a fresh + sheet (no search, no Khay, no portion).
Screenshots: .screenshots/compare-back-{portion,return,list}.png.
Run with: ALIGN_BASE_URL=http://localhost:3101 npm run probe -- tests/probes/compare_back.py
"""
# PROBE_COVERS: app/(app)/add/** app/(app)/(tabs)/@sheet/** app/(app)/foods/compare/** components/add/** components/foods/compare-picker.tsx hooks/use-back.ts
import json
import os
import re
import sys
from pathlib import Path

import _demo  # noqa: F401
from playwright.sync_api import sync_playwright

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3101")
SHOTS = Path(__file__).resolve().parent.parent.parent / ".screenshots"
SHOTS.mkdir(exist_ok=True)
# The install prompt never opens over the + sheet here (as fluid_add.py)
SETTINGS = json.dumps({"installPrompt": {"dismissCount": 0, "snoozeUntil": 0, "done": True, "firstSeenIso": "2026-01-01"}})
problems = []


def check(cond, msg):
    print(("[PASS] " if cond else "[FAIL] ") + msg)
    if not cond:
        problems.append(msg)


def dialogs(pg):
    return pg.locator("[role=dialog]:visible").count()


def tray_text(pg):
    t = pg.locator('[data-testid="tray-add"]')
    return t.first.inner_text() if t.count() else ""


def open_portion(pg):
    pg.goto(BASE + "/app", wait_until="networkidle")
    pg.wait_for_timeout(800)
    pg.locator('a[href^="/add"]:visible').first.click()
    pg.locator("[data-add-panel] button[data-food-row]").first.wait_for(state="visible", timeout=15000)
    pg.wait_for_timeout(500)
    pg.locator("[data-add-panel] input").first.fill("gà")
    pg.wait_for_timeout(800)
    pg.locator("[data-add-panel] [data-tray-toggle]:visible").first.click()
    pg.wait_for_timeout(300)
    pg.locator("[data-add-panel] button[data-food-row]:visible").nth(1).click()
    pg.locator("#portion-sheet-title").wait_for(state="visible")
    pg.wait_for_timeout(600)


def to_compare(pg):
    pg.locator("[role=dialog]").get_by_role("button", name="So sánh").last.click()
    picker = pg.locator("[role=dialog]:has(#compare-picker-title)").last
    picker.wait_for(state="visible")
    pg.wait_for_timeout(500)
    picker.locator("button[data-food-row]:visible:not([disabled])").nth(1).click()
    pg.wait_for_timeout(300)
    picker.get_by_role("button", name=re.compile(r"So sánh \(")).click()
    pg.wait_for_url(re.compile(r"/foods/compare"), timeout=8000)
    pg.wait_for_timeout(1000)


def returned(pg):
    """The portion sheet is back after Back from the comparison."""
    try:
        pg.locator("#portion-sheet-title").wait_for(state="visible", timeout=8000)
    except Exception:
        return False
    pg.wait_for_timeout(800)
    return True


def grams_value(pg):
    field = pg.locator("[role=dialog]:has(#portion-sheet-title) input[inputmode=decimal]:visible, [role=dialog]:has(#portion-sheet-title) input[type=number]:visible")
    return field.first.input_value() if field.count() else None


def run(browser):
    ctx = browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    ctx.add_init_script(f"try {{ localStorage.setItem('h1t_settings_v1_demo', {json.dumps(SETTINGS)}); }} catch (e) {{}}")
    pg = ctx.new_page()
    open_portion(pg)
    title = pg.locator("#portion-sheet-title").inner_text()
    grams_before = grams_value(pg)
    tray_before = tray_text(pg)
    check(tray_before != "", f"the Khay holds a food before So sánh ({tray_before!r})")
    pg.screenshot(path=str(SHOTS / "compare-back-portion.png"))
    to_compare(pg)

    pg.go_back()
    pg.wait_for_url(re.compile(r"/add"), timeout=8000)
    if not returned(pg):
        check(False, "Back from So sánh opens the portion sheet again (none came)")
        ctx.close()
        return
    check(pg.locator("#portion-sheet-title").inner_text() == title, f"Back from So sánh opens the portion of the same food ({title})")
    check(grams_value(pg) == grams_before, f"…with the amount it had ({grams_value(pg)!r} = {grams_before!r})")
    check(pg.locator("[data-add-panel] input").first.input_value() == "gà", "…the search is kept")
    check(tray_text(pg) == tray_before, f"…and the Khay ({tray_text(pg)!r})")
    pg.screenshot(path=str(SHOTS / "compare-back-return.png"))

    pg.go_back()
    pg.wait_for_timeout(800)
    check(pg.locator("#portion-sheet-title:visible").count() == 0 and pg.locator("[data-add-panel]:visible").count() == 1, "Back again goes to the list")
    check(pg.locator("[data-add-panel] input").first.input_value() == "gà" and tray_text(pg) == tray_before, "…with the search and the Khay")
    pg.screenshot(path=str(SHOTS / "compare-back-list.png"))
    pg.go_back()
    pg.wait_for_timeout(1200)
    check(pg.url.split("?")[0].endswith("/app") and dialogs(pg) == 0, f"one more Back leaves the + sheet for Hôm nay ({pg.url})")
    ctx.close()

    # ✕ on the returned portion sheet closes it (the + sheet stays, with its search)
    ctx = browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    ctx.add_init_script(f"try {{ localStorage.setItem('h1t_settings_v1_demo', {json.dumps(SETTINGS)}); }} catch (e) {{}}")
    pg = ctx.new_page()
    open_portion(pg)
    to_compare(pg)
    pg.go_back()
    if not returned(pg):
        ctx.close()
        return
    pg.locator("[role=dialog]:has(#portion-sheet-title)").get_by_role("button", name="Đóng").first.click()
    pg.wait_for_timeout(800)
    check(pg.locator("#portion-sheet-title:visible").count() == 0 and pg.locator("[data-add-panel] input").first.input_value() == "gà", "✕ closes the portion sheet; the + sheet keeps its search")
    pg.go_back()
    pg.wait_for_timeout(1200)
    check(pg.url.split("?")[0].endswith("/app"), f"then Back leaves for Hôm nay, no dead entry ({pg.url})")
    ctx.close()


with sync_playwright() as p:
    browser = p.chromium.launch()
    try:
        run(browser)
    finally:
        browser.close()

print(f"\n{len(problems)} problem(s)")
sys.exit(1 if problems else 0)
