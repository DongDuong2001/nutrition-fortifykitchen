"""The phone tab bar: its fill, its blur and its shadow.

Item 7: the glass is 0.86 white (rgba(255, 255, 255, 0.86)), keeps its 24 px blur, and its shadow reaches 10 px down and 28 px out at 0.16.
Run with: ALIGN_BASE_URL=http://localhost:3101 npm run probe -- tests/probes/tab_bar.py
"""
# PROBE_COVERS: components/ui/bottom-nav.tsx components/ui/nav-icons.tsx app/globals.css app/(app)/(tabs)/**
import os
import sys

import _demo  # noqa: F401
from playwright.sync_api import sync_playwright

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3101")
problems = []
TABS = ["/app", "/trends", "/explore", "/settings"]


def check(cond, msg):
    print(("[PASS] " if cond else "[FAIL] ") + msg)
    if not cond:
        problems.append(msg)


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        ctx = browser.new_context(viewport={"width": 390, "height": 844})
        pg = ctx.new_page()
        for route in TABS:
            pg.goto(BASE + route, wait_until="networkidle")
            pg.wait_for_timeout(400)
            bar = pg.locator("nav[aria-label='Điều hướng chính'] > .glass-tab").first
            s = bar.evaluate("e => { const c = getComputedStyle(e); return { bg: c.backgroundColor, sh: c.boxShadow, bf: c.backdropFilter || c.webkitBackdropFilter }; }")
            check(s["bg"] == "rgba(255, 255, 255, 0.86)", f"{route}: the tab bar is 0.86 white ({s['bg']})")
            check("blur(24px)" in s["bf"], f"{route}: the blur stays at 24 px ({s['bf']})")
            check("0px 10px 28px" in s["sh"] and "0.16" in s["sh"], f"{route}: the shadow is 0 10 28 at 0.16 ({s['sh']})")
        browser.close()
    print(f"\n{len(problems)} problem(s)")
    sys.exit(1 if problems else 0)


if __name__ == "__main__":
    main()
