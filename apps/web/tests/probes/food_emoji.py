"""feat/food-emoji (overnight 22→23/10, job 3): food icons are the phone's own emoji.

Demo build at 390, 360 and 360 @ 150 % text: a 44 px emoji tile (aria-hidden) on each row of the + sheet's list and search results,
the add-list rows stay 56 px (as on main: the tile fits the row), a tile above the name on the Khám phá cards (Đồ ăn của Minh Hào,
Gần đây, Yêu thích), a 112 px tile on the food page, and none on Hôm nay's rows. Nothing cut.
Screenshots: .screenshots/food-emoji-{add,explore,food}-<size>.png.
Run with: ALIGN_BASE_URL=http://localhost:3101 npm run probe -- tests/probes/food_emoji.py
"""
# PROBE_COVERS: app/(app)/add/** app/(app)/(tabs)/explore/** app/(app)/foods/** components/foods/** components/explore/** lib/food-emoji.ts
import json
import os
import sys
from pathlib import Path

import _demo  # noqa: F401
from playwright.sync_api import sync_playwright

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3101")
SHOTS = Path(__file__).resolve().parent.parent.parent / ".screenshots"
SHOTS.mkdir(exist_ok=True)
SETTINGS = json.dumps({"installPrompt": {"dismissCount": 0, "snoozeUntil": 0, "done": True, "firstSeenIso": "2026-01-01"}})
TEXT = "document.addEventListener('DOMContentLoaded', () => { document.documentElement.style.fontSize = '%d%%'; });"
TILE = "span.font-emoji[aria-hidden=true]"
problems = []


def check(cond, msg):
    print(("[PASS] " if cond else "[FAIL] ") + msg)
    if not cond:
        problems.append(msg)


def run(browser, width, text):
    tag = f"{width}" + ("" if text == 100 else f"-{text}")
    ctx = browser.new_context(viewport={"width": width, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    ctx.add_init_script(f"try {{ localStorage.setItem('h1t_settings_v1_demo', {json.dumps(SETTINGS)}); }} catch (e) {{}}")
    if text != 100:
        ctx.add_init_script(TEXT % text)
    pg = ctx.new_page()

    pg.goto(BASE + "/app", wait_until="networkidle")
    pg.wait_for_timeout(800)
    check(pg.locator(f"main {TILE}").count() == 0, f"{tag}: no emoji on Hôm nay")

    pg.goto(BASE + "/add?meal=lunch", wait_until="networkidle")
    pg.locator("[data-add-panel] button[data-food-row]").first.wait_for(state="visible", timeout=15000)
    pg.wait_for_timeout(800)
    rows = pg.locator("[data-add-panel] button[data-food-row]:visible")
    tiles = rows.locator(TILE)
    check(tiles.count() >= min(rows.count(), 5), f"{tag}: each add-list row has a tile ({tiles.count()}/{rows.count()})")
    tb = tiles.first.bounding_box()
    check(tb is not None and round(tb["width"]) == round(44 * text / 100) and round(tb["height"]) == round(44 * text / 100), f"{tag}: the tile is 44 px, scaled with the text ({tb})")
    if text == 100:
        heights = pg.evaluate("() => [...document.querySelectorAll('[data-add-panel] button[data-food-row]')].filter((b) => b.offsetParent && !b.querySelector('[data-food-macro]')).slice(0, 6).map((b) => Math.round(b.getBoundingClientRect().height))")
        check(all(h <= 56 for h in heights), f"{tag}: rows without a macro line stay 56 px ({heights})")
    pg.locator("[data-add-panel] input").first.fill("gà")
    pg.wait_for_timeout(900)
    check(pg.locator(f"[data-add-panel] button[data-food-row]:visible {TILE}").count() > 0, f"{tag}: search results have tiles")
    pg.screenshot(path=str(SHOTS / f"food-emoji-add-{tag}.png"))

    pg.goto(BASE + "/explore", wait_until="networkidle")
    pg.wait_for_timeout(1000)
    cards = pg.locator(f"a[href^='/foods/'] {TILE}")
    check(cards.count() > 0, f"{tag}: Khám phá cards have tiles ({cards.count()})")
    pg.screenshot(path=str(SHOTS / f"food-emoji-explore-{tag}.png"), full_page=True)

    pg.goto(BASE + "/foods/food-uc-ga", wait_until="networkidle")
    pg.wait_for_timeout(800)
    big = pg.locator(f"main {TILE}").first.bounding_box()
    check(big is not None and round(big["width"]) == round(112 * text / 100), f"{tag}: the food page has a 112 px tile, scaled with the text ({big})")
    check(pg.locator(f"main {TILE}").first.get_attribute("data-emoji") == "🍗", "Ức gà is 🍗")
    check("🍗" not in pg.locator("h1").first.inner_text(), "the emoji is not part of the page's text")
    pg.screenshot(path=str(SHOTS / f"food-emoji-food-{tag}.png"))
    ctx.close()


with sync_playwright() as p:
    browser = p.chromium.launch()
    try:
        for width, text in ((390, 100), (360, 100), (360, 150)):
            run(browser, width, text)
    finally:
        browser.close()

print(f"\n{len(problems)} problem(s)")
sys.exit(1 if problems else 0)
