"""fix/food-detail-scroll (overnight 22→23/10, job 10): on a desktop the mouse wheel over the food page's micro list scrolls it.

At 1280×720 and 1440×900, in Chromium and in WebKit (Safari), on a long food (many micros): the pointer over the micro list
(section[aria-labelledby=food-micros]), a wheel of 600 px moves the page (or whatever scrolls the list) by about that much, and so
do Page Down and Space with the focus on the page. Nothing over the list calls preventDefault on the wheel.
Run with: ALIGN_BASE_URL=http://localhost:3101 npm run probe -- tests/probes/food_detail_wheel.py
"""
# PROBE_COVERS: app/(app)/foods/** components/foods/food-micros.tsx components/ui/app-shell.tsx
import json
import os
import sys

import _demo  # noqa: F401
from playwright.sync_api import sync_playwright

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3101")
FOOD = "/foods/food-uc-ga"
SETTINGS = json.dumps({"installPrompt": {"dismissCount": 0, "snoozeUntil": 0, "done": True, "firstSeenIso": "2026-01-01"}})
# Every scroll offset on the page: the window's and any element's
OFFSETS = "() => [scrollY, ...[...document.querySelectorAll('*')].map((e) => e.scrollTop)].reduce((a, b) => a + b, 0)"
WATCH = """() => { window.__prevented = 0; addEventListener('wheel', (e) => setTimeout(() => { if (e.defaultPrevented) window.__prevented++; }), { passive: true }); }"""
problems = []


def check(cond, msg):
    print(("[PASS] " if cond else "[FAIL] ") + msg)
    if not cond:
        problems.append(msg)


def run(browser, engine, width, height):
    tag = f"{engine} {width}×{height}"
    ctx = browser.new_context(viewport={"width": width, "height": height})
    ctx.add_init_script(f"try {{ localStorage.setItem('h1t_settings_v1_demo', {json.dumps(SETTINGS)}); }} catch (e) {{}}")
    pg = ctx.new_page()
    pg.goto(BASE + FOOD, wait_until="networkidle")
    pg.wait_for_timeout(1200)
    micros = pg.locator("section[aria-labelledby=food-micros]").first
    check(micros.count() == 1, f"{tag}: the food page has its micro list")
    pg.evaluate(WATCH)
    rows = micros.locator("li")
    row = rows.nth(min(2, rows.count() - 1))
    # The list near the top of the window, with room left to scroll below it
    place = "(el) => { const y = el.getBoundingClientRect().top + scrollY - 120; scrollTo(0, Math.max(0, Math.min(y, document.documentElement.scrollHeight - innerHeight - 400))); }"
    row.evaluate(place)
    pg.wait_for_timeout(300)
    box = row.bounding_box()
    check(box is not None and 0 < box["y"] < height, f"{tag}: a micro row is on screen ({box})")
    before = pg.evaluate(OFFSETS)
    pg.mouse.move(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2)
    pg.mouse.wheel(0, 300)
    pg.wait_for_timeout(700)
    moved = pg.evaluate(OFFSETS) - before
    check(moved > 150, f"{tag}: a wheel over the micro list scrolls ({moved:.0f})")
    check(pg.evaluate("window.__prevented") == 0, f"{tag}: no wheel over the list is prevented")
    row.evaluate(place)
    pg.wait_for_timeout(300)
    before = pg.evaluate(OFFSETS)
    pg.keyboard.press("PageDown")
    pg.wait_for_timeout(700)
    check(pg.evaluate(OFFSETS) - before > 100, f"{tag}: Page Down scrolls too")
    row.evaluate(place)
    pg.wait_for_timeout(300)
    before = pg.evaluate(OFFSETS)
    pg.keyboard.press("Space")
    pg.wait_for_timeout(700)
    check(pg.evaluate(OFFSETS) - before > 100, f"{tag}: Space scrolls too")
    ctx.close()


with sync_playwright() as p:
    for engine in ("chromium", "webkit"):
        browser = getattr(p, engine).launch()
        try:
            for w, h in ((1280, 720), (1440, 900)):
                run(browser, engine, w, h)
        finally:
            browser.close()

print(f"\n{len(problems)} problem(s)")
sys.exit(1 if problems else 0)
