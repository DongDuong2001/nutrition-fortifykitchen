"""cc_tutorials: tests the tutorials and tips added for cc-53.

1. Release 2026-10-18d in "Có gì mới":
   - "Ghi món theo cách bạn quen": "Chọn trái, chén, lon… và cỡ nhỏ, vừa, lớn, hoặc nhập gam. Cơm, mì, yến mạch mở sẵn ở Gam."
   - 3-step tour: unit-toggle, unit-size, unit-amount
2. One-time tip on unit-toggle:
   - Appears on food detail page for a food with unit toggle (e.g. /foods/food-chuoi)
   - Title "Ghi món theo cách bạn quen"
   - Closes on "Đã hiểu" and does not reappear
3. All tutorial targets render in the DOM
Run with: ALIGN_BASE_URL=http://localhost:3100 npm run probe -- tests/probes/cc_tutorials.py
"""
import json
import os
import re
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright
import _demo  # noqa: F401
import _seed

_seed.onboarding(True)
_seed.whats_new(True)

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3100")
SHOTS = Path(__file__).resolve().parent.parent.parent / ".screenshots"
SHOTS.mkdir(exist_ok=True)
PHONE = {"width": 390, "height": 844}
SETTINGS_KEY = "h1t_settings_v1_demo"
problems = []


def check(cond, msg):
    print(("[PASS] " if cond else "[FAIL] ") + msg)
    if not cond:
        problems.append(msg)


def go(pg, route, wait=600):
    pg.goto(BASE + route, wait_until="networkidle")
    pg.wait_for_timeout(wait)


def run_probe():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        # 1. Check What's New history on /settings/whats-new
        print("\n--- 1. Release 2026-10-18d in Settings What's New ---")
        ctx = browser.new_context(viewport=PHONE)
        pg = ctx.new_page()
        go(pg, "/settings/whats-new", 800)
        main_text = pg.locator("main").inner_text()
        check("Ghi món theo cách bạn quen" in main_text, "Release item title present")
        check("Chọn trái, chén, lon… và cỡ nhỏ, vừa, lớn, hoặc nhập gam. Cơm, mì, yến mạch mở sẵn ở Gam." in main_text, "Release item body matches exact copy")
        check(pg.get_by_role("button", name="Xem hướng dẫn").count() >= 1, "Tour button present")
        pg.screenshot(path=str(SHOTS / "cc-tutorials-whats-new-390.png"))
        ctx.close()

        # 2. Check one-time tip on unit-toggle
        print("\n--- 2. One-time tip on unit-toggle ---")
        ctx = browser.new_context(viewport=PHONE)
        # Clear seen tips except food-detail so unit-toggle tip fires
        ctx.add_init_script(
            f"if (localStorage.getItem('{SETTINGS_KEY}') === null) localStorage.setItem('{SETTINGS_KEY}', {json.dumps(json.dumps({'onboarding': {'tourDone': True, 'seen': ['food-detail']}}))});"
        )
        pg = ctx.new_page()
        go(pg, "/foods/food-chuoi", 1200)

        card = pg.locator("[data-onboarding-card]")
        check(card.count() == 1, "Onboarding tip card appeared on food page")
        if card.count() == 1:
            card_text = card.inner_text()
            check("Ghi món theo cách bạn quen" in card_text, "Tip card title is 'Ghi món theo cách bạn quen'")
            check("Chọn trái, chén, lon… và cỡ nhỏ, vừa, lớn, hoặc nhập gam." in card_text, "Tip card body matches")
            pg.screenshot(path=str(SHOTS / "cc-tutorials-tip-390.png"))

            # Click "Đã hiểu" to close tip
            dismiss_btn = card.get_by_role("button", name="Đã hiểu")
            check(dismiss_btn.count() == 1, "Đã hiểu button exists")
            dismiss_btn.click()
            pg.wait_for_timeout(400)
            check(card.count() == 0, "Tip card closed after Đã hiểu")

            # Reload to check it doesn't reappear
            go(pg, "/foods/food-chuoi", 1000)
            check(pg.locator("[data-onboarding-card]").count() == 0, "Tip does not reappear after being dismissed")
        ctx.close()

        # 3. Check tutorial target elements in DOM
        print("\n--- 3. Tutorial targets render in DOM ---")
        ctx = browser.new_context(viewport=PHONE)
        pg = ctx.new_page()
        go(pg, "/foods/food-chuoi", 800)
        check(pg.locator('[data-tour="unit-toggle"]').count() >= 1, "data-tour='unit-toggle' rendered")
        check(pg.locator('[data-tour="unit-size"]').count() >= 1, "data-tour='unit-size' rendered")
        check(pg.locator('[data-tour="unit-amount"]').count() >= 1, "data-tour='unit-amount' rendered")
        ctx.close()

        browser.close()


if __name__ == "__main__":
    run_probe()
    print("\nSummary:")
    if problems:
        print(f"FAILED with {len(problems)} issues:")
        for prob in problems:
            print(f"  - {prob}")
        sys.exit(1)
    else:
        print("ALL CHECKS PASSED")
        sys.exit(0)
