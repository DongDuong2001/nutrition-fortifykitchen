"""cc-61 screenshots: Hôm nay (an empty day and a logged day) and the Phở bò portion panel, 390 x 844 at 2x.
Not a probe (the leading underscore keeps probe:all from running it). Run with:
  ALIGN_BASE_URL=http://localhost:3107 npm run probe -- tests/probes/_cc61_shots.py before|after
The sample day (demo mode) is the logged day; the empty day is the demo account with its seven sample foods deleted.
"""
import json
import os
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright
import _demo

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3100")
OUT = Path(__file__).resolve().parents[4] / "docs" / "design" / "cc-61"
PHONE = dict(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True)


def settle(pg, ms=900):
    pg.wait_for_timeout(ms)
    pg.evaluate("() => document.fonts.ready")


NO_SAMPLE = json.dumps({f"item-{i}": {"deleted": True} for i in range(1, 8)})


def home(browser, name, empty):
    ctx = browser.new_context(**PHONE)
    if empty:
        ctx.add_init_script(f"try {{ localStorage.setItem('h1t_sample_edits_v1_demo', {json.dumps(NO_SAMPLE)}); }} catch (e) {{}}")
    pg = ctx.new_page()
    pg.goto(BASE + "/app", wait_until="networkidle")
    settle(pg, 1500)
    later = pg.get_by_role("button", name="Để sau")
    if later.count():
        later.first.tap()
        settle(pg, 600)
    pg.screenshot(path=str(OUT / name))
    ctx.close()


def main(label):
    OUT.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch()
        home(browser, f"{label}-1-hom-nay-empty.png", True)
        home(browser, f"{label}-2-hom-nay-logged.png", False)
        ctx = browser.new_context(**PHONE)
        pg = ctx.new_page()
        pg.goto(BASE + "/add", wait_until="networkidle")
        settle(pg, 1200)
        pg.locator("[data-add-panel] input").first.fill("phở bò")
        settle(pg, 600)
        pg.locator("[data-add-panel] button[data-food-row]").filter(has_text="Phở bò").first.tap()
        pg.locator('[data-tour="portion-panel"]:visible').first.wait_for(state="visible")
        settle(pg, 800)
        pg.screenshot(path=str(OUT / f"{label}-3-pho-bo-portion.png"))
        ctx.close()
        browser.close()
    for f in sorted(OUT.glob(f"{label}-*.png")):
        print(f.name, f.stat().st_size)


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "after")
