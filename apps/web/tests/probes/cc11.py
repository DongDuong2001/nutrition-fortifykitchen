"""cc-11: past days are read-only, the desktop day picker, and the real "Thiếu nhiều nhất" list.
On a past day: no entry links, no + Thêm, no Chép hôm qua. /entry/… and /add with a past ?date= go back to that
day's Today view. The desktop date subtitle opens the calendar (no future days). Logging a calcium-rich food
today changes "Thiếu nhiều nhất" on Today.
Run with: ALIGN_BASE_URL=http://localhost:3101 npm run probe -- tests/probes/cc11.py
"""
# PROBE_COVERS: app/(app)/(tabs)/app/** app/(app)/add/** app/(app)/entry/[id]/** app/(app)/micros/**
import datetime
import os
import re
import sys

from playwright.sync_api import sync_playwright
import _demo  # noqa: F401  (cc2-15b: demo mode on, see _demo.py)
from _home import is_past, wait_home

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3100")
SHOTS = os.path.join(os.path.dirname(__file__), "..", "..", ".screenshots")
PHONE = {"width": 390, "height": 844}
DESKTOP = {"width": 1440, "height": 900}
VN = datetime.timezone(datetime.timedelta(hours=7))
TODAY = datetime.datetime.now(VN).date()
YESTERDAY = TODAY - datetime.timedelta(days=1)
FUTURE = TODAY + datetime.timedelta(days=2)
problems = []
notes = []
os.makedirs(SHOTS, exist_ok=True)


def check(cond, msg):
    if cond:
        notes.append("ok: " + msg)
    else:
        problems.append(msg)


def shot(name):
    return os.path.join(SHOTS, name)


def vis(pg, selector):
    return pg.locator(selector + " >> visible=true").first


def visible_count(pg, selector):
    return pg.locator(selector + " >> visible=true").count()


def lacking(pg, query=""):
    # "Thiếu nhiều nhất" is the Vi chất header (Hôm nay itself shows percentages, not the list)
    pg.goto(BASE + "/micros" + query, wait_until="networkidle")
    pg.wait_for_timeout(500)
    match = re.search(r"Thiếu nhiều nhất\s+([^\n]+)", pg.inner_text("body"))
    return match.group(1).strip() if match else None


def open_today(pg, query=""):
    pg.goto(BASE + "/app" + query, wait_until="networkidle")
    wait_home(pg)


def log_tofu_today(pg):
    # Đậu hũ trắng: 1 bìa is about 525 mg calcium, enough to push Calcium out of the two lacking most
    pg.goto(BASE + "/add?meal=dinner", wait_until="networkidle")
    search = vis(pg, 'input[aria-label="Tìm món"]')
    search.wait_for(state="visible", timeout=8000)
    search.fill("Đậu hũ")
    vis(pg, 'button:has-text("Đậu hũ trắng")').click()
    vis(pg, 'button:has-text("Thêm vào Bữa tối")').click()
    vis(pg, 'text=Đã thêm Đậu hũ').wait_for(state="visible", timeout=8000)
    pg.wait_for_timeout(300)


def run_phone(browser):
    ctx = browser.new_context(viewport=PHONE)
    pg = ctx.new_page()

    # Calcium-rich food today changes the lacking list
    open_today(pg)
    before = lacking(pg)
    check(before is not None and "Calcium" in before, f"390 today lacks Calcium before logging ({before})")
    log_tofu_today(pg)
    open_today(pg)
    after = lacking(pg)
    check(after is not None and after != before and "Calcium" not in after,
          f"390 logging Đậu hũ trắng changes Thiếu nhiều nhất ({before} -> {after})")
    pg.screenshot(path=shot("cc11-lacking-390.png"), animations="disabled")

    # Past day: read-only
    open_today(pg, f"?date={iso(YESTERDAY)}")
    pg.wait_for_timeout(300)
    check(visible_count(pg, 'a[href^="/entry/"]') == 0, "390 past day: meal rows are not links to /entry")
    check(visible_count(pg, 'a[href^="/micros/"]') == 0, "390 past day: Vi chất rows are not links to detail")
    check(visible_count(pg, 'text="+ Thêm"') == 0, "390 past day: no + Thêm")
    check(visible_count(pg, 'text="+ Thêm món"') == 0, "390 past day: no + Thêm món")
    check(visible_count(pg, 'button:has-text("Chép hôm qua")') == 0, "390 past day: no Chép hôm qua")
    check(visible_count(pg, 'a[aria-label^="Thêm vào"]') == 0, "390 past day: no Thêm vào link on a meal")
    check(is_past(pg), "390 past day: › is enabled")
    check(visible_count(pg, 'a:has-text("Về hôm nay")') == 1, "390 past day: Về hôm nay in the header")
    back_today = vis(pg, 'a:has-text("Về hôm nay")')
    check(back_today.bounding_box()["height"] >= 44, "390 past day: Về hôm nay is a 44 px target")
    back_today.click()
    pg.wait_for_url(re.compile(r".*/app$"), timeout=8000)
    pg.wait_for_timeout(300)
    check("date=" not in pg.url and visible_count(pg, 'a:has-text("Về hôm nay")') == 0, f"390 Về hôm nay lands on today ({pg.url})")
    open_today(pg, f"?date={iso(YESTERDAY)}")
    pg.screenshot(path=shot("cc11-past-locked-390.png"), animations="disabled")
    lacking_past = lacking(pg, f"?date={iso(YESTERDAY)}")
    check(lacking_past is not None and len(lacking_past.split(", ")) == 2,
          f"390 past day: lacking list shows two nutrients ({lacking_past})")

    # Entry and add pages with a past day go back to that day's Today view
    pg.goto(BASE + f"/entry/item-1?date={iso(YESTERDAY)}", wait_until="networkidle")
    pg.wait_for_url(f"**/app?date={iso(YESTERDAY)}", timeout=8000)
    check(f"/app?date={iso(YESTERDAY)}" in pg.url, "390 /entry/item-1 with a past date redirects to that day's Today")
    pg.goto(BASE + f"/add?meal=dinner&date={iso(YESTERDAY)}", wait_until="networkidle")
    pg.wait_for_url(f"**/app?date={iso(YESTERDAY)}", timeout=8000)
    check(f"/app?date={iso(YESTERDAY)}" in pg.url, "390 /add with a past date redirects to that day's Today")
    ctx.close()


def run_desktop(browser):
    ctx = browser.new_context(viewport=DESKTOP)
    pg = ctx.new_page()
    open_today(pg)
    subtitle = vis(pg, 'button[aria-label^="Chọn ngày"]')
    subtitle.wait_for(state="visible", timeout=8000)
    subtitle.click()
    dialog = pg.get_by_role("dialog")
    dialog.wait_for(state="visible")
    future = dialog.locator('button[aria-label*="chưa tới"]')
    check(future.count() > 0 and all(future.nth(i).is_disabled() for i in range(future.count())),
          "1440 calendar from the subtitle: days after today cannot be picked")
    pg.screenshot(path=shot("cc11-desktop-calendar-1440.png"), animations="disabled")
    dialog.locator("button").filter(has_text=re.compile(rf"^{YESTERDAY.day}$")).click()
    pg.wait_for_selector('[role="dialog"]', state="detached")
    pg.wait_for_url(f"**date={iso(YESTERDAY)}")
    pg.wait_for_timeout(300)
    check(is_past(pg), "1440 picking yesterday from the subtitle opens the past view")
    ctx.close()


def iso(d):
    return d.isoformat()


def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        run_phone(browser)
        run_desktop(browser)
        browser.close()


if __name__ == "__main__":
    run()
    print("\n".join(notes))
    print("PROBLEMS:", problems or "none")
    sys.exit(1 if problems else 0)
