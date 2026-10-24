"""Screenshots of the Vi chất in the Ngày ăn mẫu editor at real sizes: Level 1 and Level 4, 390 and 1440 (and 390 at 200 % text).
A saved day is put in the demo account's storage, so no flow is clicked through. Not a probe (underscore name).
Run with: ALIGN_BASE_URL=http://localhost:3151 npm run probe -- tests/probes/_template_micros_shots.py
"""
import json
import os
from pathlib import Path

import _demo  # noqa: F401
from playwright.sync_api import sync_playwright

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3151")
SHOTS = Path(__file__).resolve().parent.parent.parent / ".screenshots" / "template-micros"
SHOTS.mkdir(parents=True, exist_ok=True)
ID = "11111111-1111-4111-8111-111111111111"
TEMPLATE = {
    "id": ID,
    "name": "Ngày tập thử",
    "tag": "tap",
    "createdAt": "2026-10-23T08:00:00.000Z",
    "meals": [
        {"slot": "breakfast", "items": [{"foodId": "food-yen-mach", "servingLabel": "60 g", "grams": 60}, {"foodId": "food-chuoi", "servingLabel": "1 trái vừa", "grams": 118}]},
        {"slot": "lunch", "items": [{"foodId": "food-com-gao-lut", "servingLabel": "200 g", "grams": 200}, {"foodId": "food-thit-bo-nac", "servingLabel": "150 g", "grams": 150}]},
    ],
}
SETTINGS = json.dumps({"installPrompt": {"dismissCount": 0, "snoozeUntil": 0, "done": True, "firstSeenIso": "2026-01-01"}})


def shot(browser, level, width, height, tag, scale=1):
    ctx = browser.new_context(viewport={"width": width, "height": height}, device_scale_factor=2)
    ctx.add_init_script(f"try {{ localStorage.setItem('h1t_settings_v1_demo', {json.dumps(SETTINGS)}); localStorage.setItem('h1t_day_templates_v1_demo', {json.dumps(json.dumps([TEMPLATE]))}); }} catch (e) {{}}")
    pg = ctx.new_page()
    pg.goto(f"{BASE}/app?level={level}", wait_until="networkidle")
    pg.wait_for_timeout(500)
    pg.goto(f"{BASE}/explore/ngay-mau/{ID}", wait_until="networkidle")
    pg.wait_for_timeout(900)
    if scale != 1:
        pg.evaluate(f"document.documentElement.style.fontSize = '{scale * 100}%'")
        pg.wait_for_timeout(300)
    rows = pg.locator("[data-nutrient-row]").count()
    over = pg.evaluate("() => document.documentElement.scrollWidth - innerWidth")
    print(f"{tag}: {rows} rows, summary={pg.locator('[data-template-summary]').first.inner_text()!r}, overflowX={over}")
    pg.locator("#tpl-total").scroll_into_view_if_needed()
    pg.screenshot(path=str(SHOTS / f"{tag}.png"), full_page=True)
    ctx.close()


with sync_playwright() as p:
    b = p.chromium.launch()
    try:
        shot(b, 1, 390, 844, "level1-390")
        shot(b, 4, 390, 844, "level4-390")
        shot(b, 4, 1440, 900, "level4-1440")
        shot(b, 1, 390, 844, "level1-390-text200", scale=2)
    finally:
        b.close()
