"""fix/polish-1020 item 2, by hand (a helper: probe:all skips it, because it changes public/sw.js for a few seconds): a new service worker is
waiting; "Có bản mới" comes above the bottom nav and the screen leaves room (nothing covers the last list row), goes after 5 s, and the update is
applied when the app goes to the background (the page reloads), never before.
Run with: ALIGN_BASE_URL=http://localhost:3101 python3 tests/probes/_polish_update_check.py
"""
import json
import os
import sys

from playwright.sync_api import sync_playwright

import _demo  # noqa: F401
from _sw_update import waiting_update

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3100")
SETTINGS_KEY = "h1t_settings_v1_demo"
NO_INSTALL = {"installPrompt": {"dismissCount": 0, "snoozeUntil": 0, "done": True, "firstSeenIso": "2026-01-01"}}
problems = []


def check(cond, msg):
    print(("[PASS] " if cond else "[FAIL] ") + msg)
    if not cond:
        problems.append(msg)


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        ctx = browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
        ctx.add_init_script(f"if (localStorage.getItem('{SETTINGS_KEY}') === null) localStorage.setItem('{SETTINGS_KEY}', {json.dumps(json.dumps(NO_INSTALL))});")
        pg = ctx.new_page()
        pg.goto(BASE + "/app", wait_until="networkidle")
        pg.locator('[data-testid="meal-header"]:visible').first.wait_for(state="visible", timeout=10000)
        waiting_update(pg)
        toast = pg.locator(".m-toast", has_text="Có bản mới").first
        toast.wait_for(state="visible", timeout=15000)
        pg.wait_for_timeout(700)
        box = toast.bounding_box()
        nav_top = pg.locator('nav[aria-label="Điều hướng chính"]').locator("visible=true").first.bounding_box()["y"]
        list_bottom = pg.evaluate("() => { const l = document.querySelector('[data-food-scroll]'); return l ? l.getBoundingClientRect().bottom : null }")
        check(box is not None and box["y"] + box["height"] <= nav_top + 1, f"2: the toast sits above the bottom nav (bottom {box and round(box['y'] + box['height'])} <= nav top {round(nav_top)})")
        check(list_bottom is not None and box is not None and list_bottom <= box["y"] + 1, f"2: Hôm nay's list ends above it, so it never covers a row (list bottom {list_bottom and round(list_bottom)}, toast top {box and round(box['y'])})")
        pg.wait_for_timeout(5600)
        check(pg.locator(".m-toast", has_text="Có bản mới").count() == 0, "2: the toast goes after 5 s")
        room = pg.evaluate("getComputedStyle(document.documentElement).getPropertyValue('--update-bar-h').trim()")
        check(room in ("0px", ""), f"2: ...and the room it took is given back ({room!r})")
        loads = []
        pg.on("framenavigated", lambda f: loads.append(1))
        pg.wait_for_timeout(1500)
        check(len(loads) == 0, "2: nothing reloaded the page while it was in front")
        # the app goes to the background: the update is applied and the page reloads
        pg.evaluate("() => { Object.defineProperty(document, 'visibilityState', { get: () => 'hidden', configurable: true }); document.dispatchEvent(new Event('visibilitychange')); }")
        pg.wait_for_timeout(3000)
        check(len(loads) >= 1, "2: the app going to the background applies the update (the page reloaded)")
        ctx.close()
        browser.close()
    print(f"\n{len(problems)} problem(s)")
    sys.exit(1 if problems else 0)


main()
