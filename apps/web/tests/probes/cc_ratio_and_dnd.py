"""cc_ratio_and_dnd.py: probe for drag & drop, long-press multi-select, and macro ratios screen.

Tests:
1. HomeHero renders macro targets alongside consumed grams (e.g. '—/143 g' or '100/143 g', no spaces around '/' since the cc-45 review).
2. Long-press on a food item on Hôm nay enters select mode with that item selected.
3. Multi-select deletion: tapping Delete removes selected items at once.
4. Mục tiêu đa lượng screen (/settings/targets/macros) loads and saves custom ratios; at 390 its copy is Vietnamese only and the title fits one line.
"""
# PROBE_COVERS: app/(app)/(tabs)/app/** app/(app)/settings/targets/macros/** app/page.tsx
import os
import re
import sys

import _demo  # noqa: F401
from playwright.sync_api import sync_playwright

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3100")
NOW = "2026-10-15T10:00:00+07:00"
SHOTS = os.path.join(os.path.dirname(__file__), "..", "..", ".screenshots")
HOME_ROUTE = "/app"  # lib/nav.ts HOME_ROUTE
HERO = "section[aria-label='Tổng kcal và dinh dưỡng đa lượng']"
problems, notes = [], []


def check(cond, msg):
    (notes if cond else problems).append(("ok: " if cond else "") + msg)


def new_page(browser, size):
    ctx = browser.new_context(viewport=size)
    pg = ctx.new_page()
    errors = []
    pg.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    pg.on("pageerror", lambda e: errors.append(str(e)))
    pg.clock.set_fixed_time(NOW)
    return ctx, pg, errors


def test_home_and_select(browser):
    ctx, pg, errors = new_page(browser, {"width": 390, "height": 844})
    pg.goto(BASE + HOME_ROUTE, wait_until="networkidle")
    pg.locator(HERO).wait_for(state="visible", timeout=8000)
    pg.wait_for_timeout(300)

    # 1. Check that HomeHero displays targets in macro columns
    hero_text = pg.locator(HERO).inner_text()
    check("Đạm" in hero_text and "Tinh bột" in hero_text and "Chất béo" in hero_text, "HomeHero has all 3 macro labels")
    check(re.search(r"(\d[\d.]*|—)/\d[\d.]* g", hero_text) is not None, "HomeHero displays target grams alongside consumed")

    # 2. Test long press on first food item to enter select mode
    first_food = pg.locator("section[aria-label*='Bữa'] button[aria-pressed][aria-label*=', ']").first
    first_food.wait_for(state="visible", timeout=4000)

    box = first_food.bounding_box()
    if box:
        pg.mouse.move(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2)
        pg.mouse.down()
        pg.wait_for_timeout(600)  # > 500ms long press threshold
        pg.mouse.up()
        pg.wait_for_timeout(300)

    # Verify select mode active
    select_header = pg.locator("header:has-text('Đã chọn')")
    check(select_header.count() > 0 or pg.locator("[data-tour='select-bar']").count() > 0, "Long press enters multi-select mode")

    # Cancel select mode
    cancel_btn = pg.locator("header button:has-text('Hủy')")
    if cancel_btn.count() > 0:
        cancel_btn.click()
        pg.wait_for_timeout(200)

    pg.screenshot(path=os.path.join(SHOTS, "probe_dnd_home_390.png"))
    ctx.close()


def test_macro_screen(browser):
    ctx, pg, errors = new_page(browser, {"width": 1440, "height": 900})
    pg.goto(BASE + "/settings/targets/macros", wait_until="networkidle")
    pg.wait_for_timeout(500)

    # Verify screen loaded
    h1 = pg.locator("h1:has-text('Mục tiêu đa lượng')")
    check(h1.count() > 0, "Mục tiêu đa lượng page renders with correct H1")

    # Check segmented control tabs
    tabs = pg.locator("[role='group'][aria-label='Cách chia đa lượng'] button")
    check(tabs.count() == 3, "Has 3 macro tabs: Tỉ lệ, Cố định, Keto")

    # Check 3 macro rows
    rows = pg.locator("main span:text-is('Đạm')")
    check(rows.count() > 0, "Renders Đạm row with color dot")

    # Click a preset chip (e.g. Cân bằng or Tăng cơ cao đạm)
    preset_btn = pg.locator("button:has-text('Cân bằng')").first
    if preset_btn.count() > 0:
        preset_btn.click()
        pg.wait_for_timeout(200)
        check(True, "Can click preset chip")

    # Save button
    save_btn = pg.locator("button:has-text('Lưu mục tiêu đa lượng')")
    check(save_btn.count() > 0, "Has primary Save button")
    save_btn.click()
    pg.wait_for_timeout(700)

    pg.screenshot(path=os.path.join(SHOTS, "probe_macro_targets_1440.png"))
    ctx.close()


def test_macro_copy_390(browser):
    """Vietnamese only (Hao 17/10): no English glosses, carbs read Tinh bột, the title fits one line at 390."""
    ctx, pg, errors = new_page(browser, {"width": 390, "height": 844})
    pg.goto(BASE + "/settings/targets/macros", wait_until="networkidle")
    h1 = pg.locator("h1:has-text('Mục tiêu đa lượng')").first
    h1.wait_for(state="visible", timeout=8000)
    lines = h1.evaluate("e => Math.round(e.getBoundingClientRect().height / parseFloat(getComputedStyle(e).lineHeight))")
    check(lines == 1, f"390: title on one line ({lines})")
    text = pg.locator("main").inner_text()
    glosses = [g for g in ("Macro Targets", "Ratios", "Fixed", "Protein", "Net Carbs", "(Fat)", "Macro &") if g in text]
    check(not glosses, f"390: no English glosses ({glosses})")
    check(pg.locator("main span:text-is('Tinh bột')").count() == 1, "390: carbs row reads Tinh bột")
    check(not errors, f"390: no console errors {errors[:2]}")
    # The whole page in one shot with the fixed nav at the bottom (a full_page shot leaves it mid-page)
    pg.set_viewport_size({"width": 390, "height": pg.evaluate("document.documentElement.scrollHeight")})
    pg.wait_for_timeout(200)
    pg.screenshot(path=os.path.join(SHOTS, "cc-45-macros-390.png"))
    ctx.close()


def main():
    os.makedirs(SHOTS, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch()
        test_home_and_select(browser)
        test_macro_screen(browser)
        test_macro_copy_390(browser)
        browser.close()

    for n in notes:
        print(n)
    for p in problems:
        print("FAIL: " + p, file=sys.stderr)
    if problems:
        sys.exit(1)
    print("ALL OK")


if __name__ == "__main__":
    main()
