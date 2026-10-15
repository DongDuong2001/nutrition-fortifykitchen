"""cc2-32: Nhật ký folds into Hôm nay (/), at 390 and 1280.

- /diary and /diary?date=<yesterday> land on / and /?date=<yesterday>; /today lands on /
- no in-app link to /diary on any route (every a[href] scanned)
- back from /micros and /training with no history goes to /
- the home sheets (meal menu, calendar, copy yesterday) close with Esc and return focus to the control that opened them
Screenshots: .screenshots/cc2-32-redirect-390.png, .screenshots/cc2-32-home-from-diary-390.png
Run with: ALIGN_BASE_URL=http://localhost:3102 npm run probe -- tests/probes/cc2_32.py
"""
import os
import re
import sys
from datetime import date, timedelta
from pathlib import Path
from urllib.parse import urlparse, parse_qs

from playwright.sync_api import sync_playwright
import _demo  # noqa: F401  (cc2-15b: demo mode on, see _demo.py)

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3102")
SHOTS = Path(__file__).resolve().parent.parent.parent / ".screenshots"
SIZES = [("390", {"width": 390, "height": 844}), ("1280", {"width": 1280, "height": 800})]
YESTERDAY = (date.today() - timedelta(days=1)).isoformat()
ROUTES_SCANNED = [
    "/", "/trends", "/trends/energy", "/trends/micros", "/trends/body", "/micros", "/micros/calcium",
    "/training", "/explore", "/settings", "/settings/profile", "/add", "/entry/item-1", "/foods/food-cha-la",
]
problems, notes = [], []


def check(cond, msg):
    (notes if cond else problems).append(("ok: " if cond else "") + msg)


def path_of(pg):
    return urlparse(pg.url).path or "/"


def go(pg, route):
    resp = pg.goto(BASE + route, wait_until="networkidle")
    pg.wait_for_timeout(400)
    return resp.status if resp else None


def settle(pg, ms=400):
    pg.wait_for_load_state("networkidle")
    pg.wait_for_timeout(ms)


def redirects(browser):
    ctx = browser.new_context(viewport={"width": 390, "height": 844})
    pg = ctx.new_page()
    for src, query in (("/diary", ""), ("/diary", f"?date={YESTERDAY}"), ("/today", ""), ("/today", f"?date={YESTERDAY}")):
        pg.goto(BASE + src + query, wait_until="networkidle")
        pg.wait_for_timeout(400)
        q = parse_qs(urlparse(pg.url).query)
        want_date = YESTERDAY if query else None
        ok = path_of(pg) == "/" and (q.get("date", [None])[0] == want_date)
        check(ok, f"redirect {src}{query} lands on / with date {want_date} (got {pg.url.replace(BASE, '')})")
        if src == "/diary" and query:
            pg.screenshot(path=str(SHOTS / "cc2-32-redirect-390.png"))
    go(pg, "/")
    pg.goto(BASE + "/diary", wait_until="networkidle")
    settle(pg)
    pg.screenshot(path=str(SHOTS / "cc2-32-home-from-diary-390.png"))
    ctx.close()


def no_diary_links(browser, name, size):
    ctx = browser.new_context(viewport=size)
    pg = ctx.new_page()
    for route in ROUTES_SCANNED:
        status = go(pg, route)
        hrefs = pg.evaluate("() => [...document.querySelectorAll('a[href]')].map(a => a.getAttribute('href'))")
        bad = [h for h in hrefs if h and (h == "/diary" or h.startswith("/diary?") or h.startswith("/diary/"))]
        check(not bad, f"{name} {route}: no link to /diary ({bad[:3]})")
        check(status == 200, f"{name} {route}: answers 200 (got {status})")
    ctx.close()


def back_fallback(browser, name, size):
    ctx = browser.new_context(viewport=size)
    pg = ctx.new_page()
    for route in ("/micros", "/training"):
        go(pg, route)
        back = pg.locator('[aria-label="Quay lại"]:visible, button:has-text("Quay lại"):visible').first
        if back.count() == 0:
            check(False, f"{name} {route}: a back control is shown")
            continue
        back.click()
        settle(pg)
        check(path_of(pg) == "/", f"{name} {route}: back with no history goes to / (now {path_of(pg)})")
    ctx.close()


def sheet_closes_with_focus(pg, name, label, opener):
    """Open a sheet from the home screen, press Esc, check the sheet is gone and focus is back on the opener."""
    trigger = opener()
    if trigger is None or trigger.count() == 0:
        check(False, f"{name}: the {label} opener is on Hôm nay")
        return
    trigger.first.click()
    pg.wait_for_timeout(400)
    dialogs = pg.locator("[role=dialog]:visible")
    check(dialogs.count() >= 1, f"{name}: {label} opens a dialog")
    pg.keyboard.press("Escape")
    pg.wait_for_timeout(400)
    check(pg.locator("[role=dialog]:visible").count() == 0, f"{name}: Esc closes the {label}")
    focused = pg.evaluate("() => (document.activeElement && (document.activeElement.getAttribute('aria-label') || document.activeElement.textContent || '')).trim()")
    opener_label = trigger.first.get_attribute("aria-label") or trigger.first.inner_text().strip()
    check(focused.startswith(opener_label[:20]) if opener_label else bool(focused),
          f"{name}: focus returns to the {label} opener ({focused[:40]!r})")


def meal_menu_opener(pg):
    """The ⋯ pill only shows in meal mode, so tap a meal header first, then return the pill."""
    header = pg.locator("button[aria-label^='Xem riêng']:visible")
    if header.count() == 0:
        return None
    header.first.click()
    pg.wait_for_timeout(300)
    return pg.locator("button[aria-label^='Tùy chọn']:visible")


def home_sheets(browser, name, size):
    ctx = browser.new_context(viewport=size)
    pg = ctx.new_page()
    go(pg, "/")
    settle(pg)
    sheet_closes_with_focus(pg, name, "meal menu", lambda: meal_menu_opener(pg))
    sheet_closes_with_focus(pg, name, "calendar", lambda: pg.locator("button[aria-label^='Chọn ngày']:visible"))
    # "Chép hôm qua" only shows on a day with nothing logged while yesterday has entries; the demo day always has
    # entries, so the copy sheet cannot be opened on this data. Reported as a note, not a pass.
    copy_btn = pg.get_by_role("button", name=re.compile("^Chép hôm qua")).locator("visible=true")
    if copy_btn.count():
        sheet_closes_with_focus(pg, name, "copy yesterday", lambda: copy_btn)
    else:
        notes.append(f"NOTE {name}: CopyYesterdaySheet focus not checked (no empty day with yesterday logged in demo data)")
    ctx.close()


def main():
    SHOTS.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch()
        redirects(browser)
        for name, size in SIZES:
            for probe in (no_diary_links, back_fallback, home_sheets):
                try:
                    probe(browser, name, size)
                except Exception as err:  # a missing control must show up as a failed check, not a crash
                    check(False, f"{name}: {probe.__name__} stopped: {str(err).splitlines()[0][:160]}")
        browser.close()

    for n in notes:
        print("  " + n)
    for pr in problems:
        print("  FAIL: " + pr)
    if problems:
        print(f"[FAIL] cc2-32: {len(problems)} problems, {len(notes)} ok")
        sys.exit(1)
    print(f"ALL {len(notes)} CHECKS PASSED.")


if __name__ == "__main__":
    main()
