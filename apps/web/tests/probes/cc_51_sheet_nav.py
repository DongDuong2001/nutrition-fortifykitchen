"""Review 07:00 M1: a navigation from an open sheet is never cancelled and leaves no stray history entry (demo build,
390 x 844). Every RSC response (requests with the RSC header or ?_rsc=) is held back 300 ms and prefetches never
arrive, as on a phone network:
before the fix, the sheet's history.back() 50 ms after it closed made Next drop the pending navigation.

- Calendar: pick yesterday → the URL ends on ?date=<yesterday> and the past day shows (and stays); one Back → /app today
- Nutrient sources → Xem chi tiết › → /micros/<id>; one Back → /app with no sheet open; a second Back goes to the
  screen before /app, not to /app again
- Back closes an open sheet and stays on /app
Run with: ALIGN_BASE_URL=http://localhost:3101 npm run probe -- tests/probes/cc_51_sheet_nav.py
"""
import os
import re
import sys
import time

from playwright.sync_api import sync_playwright
import _demo  # noqa: F401  (demo mode, tour and tips off)

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3101")
PHONE = {"width": 390, "height": 844}
NOW = "2026-10-18T10:00:00+07:00"
TODAY, YESTERDAY = "2026-10-18", "2026-10-17"
RSC_DELAY_S = 0.3
problems = []


def check(cond, msg):
    print(("[PASS] " if cond else "[FAIL] ") + msg)
    if not cond:
        problems.append(msg)


def slow_rsc(route):
    req = route.request
    if req.headers.get("rsc") == "1" or "_rsc=" in req.url:
        # A prefetch that never arrives (a slow phone network, or the tap came first): the navigation itself has to
        # wait for the server. Without this, /app (a static page) is served from the prefetch and nothing is pending.
        if req.headers.get("next-router-prefetch"):
            route.abort()
            return
        if os.environ.get("PROBE_DEBUG"):
            print("RSC", req.url[len(BASE):])
        time.sleep(RSC_DELAY_S)
    route.continue_()


def new_page(browser):
    ctx = browser.new_context(viewport=PHONE, timezone_id="Asia/Ho_Chi_Minh")
    ctx.route("**/*", slow_rsc)
    pg = ctx.new_page()
    errors = []
    pg.on("pageerror", lambda e: errors.append(str(e)))
    pg.clock.set_fixed_time(NOW)
    return ctx, pg, errors


def path(pg):
    return pg.url[len(BASE):]


def wait_home(pg):
    pg.locator('[data-align-group="home-page"]').first.wait_for(state="visible")
    pg.wait_for_timeout(600)


def dialogs(pg):
    return pg.locator('[role="dialog"]').count()


def next_day_enabled(pg):
    btn = pg.locator('button[aria-label="Ngày sau"]:visible').first
    return btn.count() == 1 and btn.is_enabled()


def calendar(browser):
    ctx, pg, errors = new_page(browser)
    pg.goto(BASE + "/app", wait_until="networkidle")
    wait_home(pg)
    check(not next_day_enabled(pg), "calendar: starts on today (no Ngày sau)")
    pg.locator('button[aria-label^="Chọn ngày"]:visible').first.click()
    dialog = pg.get_by_role("dialog", name="Chọn ngày")
    dialog.wait_for(state="visible")
    pg.wait_for_timeout(350)
    dialog.get_by_role("button").filter(has_text=re.compile(r"^\s*17\s*$")).first.click()
    try:
        pg.wait_for_url(re.compile(rf".*/app\?date={YESTERDAY}$"), timeout=5000)
    except Exception:
        pass
    # Long after the 50 ms of the old history.back() and the 300 ms of the server: the pick held
    pg.wait_for_timeout(1200)
    check(path(pg) == f"/app?date={YESTERDAY}", f"calendar: picking yesterday lands on ?date={YESTERDAY} ({path(pg)})")
    check(next_day_enabled(pg) and dialogs(pg) == 0, "calendar: the past day shows (Ngày sau), the sheet is closed")
    pg.go_back()
    pg.wait_for_timeout(1200)
    check(path(pg) == "/app", f"calendar: one Back → /app ({path(pg)})")
    check(not next_day_enabled(pg) and dialogs(pg) == 0, "calendar: …today again, no sheet")
    check(errors == [], f"calendar: no page errors ({errors})")
    ctx.close()


def sources(browser):
    ctx, pg, errors = new_page(browser)
    pg.goto(BASE + "/explore", wait_until="networkidle")
    pg.wait_for_timeout(400)
    pg.locator('nav a[href="/app"]:visible').first.click()
    pg.wait_for_url(BASE + "/app", timeout=8000)
    wait_home(pg)
    iron = pg.locator('button[aria-haspopup="dialog"][aria-label^="Iron,"]:visible').first
    iron.click()
    dialog = pg.get_by_role("dialog", name="Iron")
    dialog.wait_for(state="visible")
    pg.wait_for_timeout(350)
    dialog.get_by_role("link", name="Xem chi tiết ›").click()
    try:
        pg.wait_for_url(re.compile(r".*/micros/iron$"), timeout=5000)
    except Exception:
        pass
    pg.wait_for_timeout(800)
    check(path(pg) == "/micros/iron", f"sources: Xem chi tiết › opens the nutrient ({path(pg)})")
    pg.go_back()
    pg.wait_for_timeout(1200)
    check(path(pg) == "/app", f"sources: one Back → /app ({path(pg)})")
    check(dialogs(pg) == 0, "sources: …with no sheet open")
    pg.go_back()
    pg.wait_for_timeout(1200)
    check(path(pg) == "/explore", f"sources: a second Back goes to the screen before, not /app again ({path(pg)})")
    check(errors == [], f"sources: no page errors ({errors})")
    ctx.close()


def back_closes(browser):
    ctx, pg, errors = new_page(browser)
    pg.goto(BASE + "/app", wait_until="networkidle")
    wait_home(pg)
    pg.evaluate("window.__notReloaded = true")
    pg.get_by_role("button", name="Chia sẻ ngày này").first.click()
    pg.locator('[role="dialog"]').first.wait_for(state="visible")
    pg.wait_for_timeout(400)
    pg.go_back()
    pg.wait_for_timeout(800)
    check(dialogs(pg) == 0, "Back closes an open sheet")
    check(path(pg) == "/app" and pg.evaluate("window.__notReloaded === true"), f"…and stays on /app without a reload ({path(pg)})")
    check(errors == [], f"back: no page errors ({errors})")
    ctx.close()


with sync_playwright() as p:
    browser = p.chromium.launch()
    calendar(browser)
    sources(browser)
    back_closes(browser)
    browser.close()

print(f"\n{len(problems)} problem(s)")
sys.exit(1 if problems else 0)
