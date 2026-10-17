"""cc-44: white background, level colours and bar, English nutrient names, Hôm nay meal pills, desktop fixes.

Screenshots of the main routes at 390x844 and 1440x900 into .screenshots/cc-44-<route>-<w>.png (demo mode; the
empty day is a fresh account). CC44_TAG=<tag> adds the tag to the names (cc-44-<tag>-...), for work-in-progress shots.
Run with: ALIGN_BASE_URL=http://localhost:3101 npm run probe -- tests/probes/cc_44.py
"""
import os
import sys
from pathlib import Path

import _demo
from playwright.sync_api import sync_playwright

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3101")
TAG = os.environ.get("CC44_TAG", "")
SHOTS = Path(__file__).resolve().parent.parent.parent / ".screenshots"
SHOTS.mkdir(exist_ok=True)
SIZES = {"390": {"width": 390, "height": 844}, "1440": {"width": 1440, "height": 900}}
ROUTES = [
    ("home", "/"),
    ("micros", "/micros"),
    ("trends", "/trends"),
    ("explore", "/explore"),
    ("add", "/add"),
    ("settings", "/settings"),
]
ONLY = [r for r in os.environ.get("CC44_ONLY", "").split(",") if r]
problems = []


def check(cond, msg):
    print(("[PASS] " if cond else "[FAIL] ") + msg)
    if not cond:
        problems.append(msg)


def name(route, w):
    return f"cc-44-{TAG + '-' if TAG else ''}{route}-{w}.png"


def shoot(browser, route, path, w, demo=True):
    _demo.enable(demo)
    ctx = browser.new_context(viewport=SIZES[w])
    pg = ctx.new_page()
    pg.goto(BASE + path, wait_until="networkidle")
    pg.wait_for_timeout(900)
    overflow = pg.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
    check(overflow <= 0, f"{route} @{w}: no horizontal overflow ({overflow})")
    pg.screenshot(path=str(SHOTS / name(route, w)))
    ctx.close()
    _demo.enable(True)


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for w in SIZES:
            for route, path in ROUTES:
                if not ONLY or route in ONLY:
                    shoot(browser, route, path, w)
            if not ONLY or "home-empty" in ONLY:
                shoot(browser, "home-empty", "/", w, demo=False)
        browser.close()
    print(f"\n{len(problems)} problem(s)")
    sys.exit(1 if problems else 0)


if __name__ == "__main__":
    main()
