"""Live-mode build only (NEXT_PUBLIC_API_MODE=live, no Supabase behind it): the sign-in gate must end on /signin, not hang.

Not part of probe:all (it needs a live build; run_all skips names it cannot run in demo mode via the LIVE_BUILD flag).
Run with: LIVE_BUILD=1 ALIGN_BASE_URL=http://localhost:3101 npm run probe -- tests/probes/v022c_live_gate.py
"""
import os
import sys

from playwright.sync_api import sync_playwright

if os.environ.get("LIVE_BUILD") != "1":
    print("skipped: set LIVE_BUILD=1 with a live-mode build")
    sys.exit(0)

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3101")
problems = []


def check(cond, msg):
    print(("ok: " if cond else "FAIL: ") + msg)
    if not cond:
        problems.append(msg)


with sync_playwright() as p:
    browser = p.chromium.launch()
    for size, tag in [({"width": 390, "height": 844}, "390"), ({"width": 1280, "height": 800}, "1280")]:
        ctx = browser.new_context(viewport=size)
        pg = ctx.new_page()
        for route in ("/", "/explore", "/settings"):
            pg.goto(BASE + route, wait_until="domcontentloaded")
            try:
                pg.wait_for_url("**/signin", timeout=15000)
            except Exception:
                pass
            check(pg.url.split("?")[0].endswith("/signin"), f"{tag} {route}: no session ends on /signin ({pg.url})")
        pg.wait_for_timeout(800)
        check(pg.locator("form").count() >= 1, f"{tag}: the sign-in form is shown")
        check(pg.url.split("?")[0].endswith("/signin"), f"{tag}: the sign-in page stays on /signin")
        ctx.close()
    browser.close()
sys.exit(1 if problems else 0)
