"""cc-10: Today flows. Copy yesterday (copies, totals rise, undo restores). Past days (‹ goes to yesterday,
› comes back, › is off on today, a past day shows its own data). The day picker (5 days ago, no future days).
Hồ sơ birth year as a row that opens the field (1899 shows the error, 1990 saves). No hydration errors on any date.
Run with: ALIGN_BASE_URL=http://localhost:3101 npm run probe -- tests/probes/cc10.py
"""
import datetime
import os
import re
import sys

from playwright.sync_api import sync_playwright

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3100")
SHOTS = os.path.join(os.path.dirname(__file__), "..", "..", ".screenshots")
PHONE = {"width": 390, "height": 844}
DESKTOP = {"width": 1440, "height": 900}
# The app's day is Asia/Ho_Chi_Minh, so the probe counts days in the same zone
VN = datetime.timezone(datetime.timedelta(hours=7))
TODAY = datetime.datetime.now(VN).date()
YESTERDAY = TODAY - datetime.timedelta(days=1)
FIVE_AGO = TODAY - datetime.timedelta(days=5)
FUTURE = TODAY + datetime.timedelta(days=3)
BIRTH_ERROR = f"Nhập năm sinh từ 1900 đến {TODAY.year}"
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


def iso(d):
    return d.isoformat()


def vis(pg, selector):
    return pg.locator(selector + " >> visible=true").first


def visible_count(pg, selector):
    return pg.locator(selector + " >> visible=true").count()


def energy(pg):
    # The dial's label reads "Năng lượng 1.041 trên mục tiêu …"
    label = vis(pg, '[aria-label^="Năng lượng"]').get_attribute("aria-label")
    return label.split(" trên")[0].replace("Năng lượng ", "")


def open_day(pg, query=""):
    pg.goto(BASE + "/today" + query, wait_until="networkidle")
    vis(pg, '[aria-label^="Năng lượng"]').wait_for(state="visible", timeout=8000)
    pg.wait_for_timeout(200)


def run_phone(browser):
    ctx = browser.new_context(viewport=PHONE)
    pg = ctx.new_page()
    open_day(pg)
    check(energy(pg) == "1.041", f"390 today starts at 1.041 kcal (got {energy(pg)})")

    # Copy yesterday: four meals, the snack unticked by default
    vis(pg, 'button:has-text("Chép hôm qua")').click()
    dialog = pg.get_by_role("dialog")
    dialog.wait_for(state="visible")
    boxes = dialog.locator('input[type="checkbox"]')
    states = [boxes.nth(i).is_checked() for i in range(boxes.count())]
    check(states == [True, True, True, False], f"390 copy sheet: breakfast, lunch, dinner ticked, snack not ({states})")
    check(dialog.get_by_role("button", name="Chép 3 bữa").count() == 1, "390 copy sheet button reads Chép 3 bữa")
    pg.screenshot(path=shot("cc10-copy-sheet-390.png"), animations="disabled")

    # Copy breakfast and lunch only: 459 + 488 kcal on top of 1.041
    dialog.get_by_label("Bữa tối").uncheck()
    dialog.get_by_role("button", name="Chép 2 bữa").click()
    pg.wait_for_selector('[role="dialog"]', state="detached")
    undo = pg.get_by_role("button", name="Hoàn tác")
    undo.wait_for(state="visible", timeout=3000)
    check(visible_count(pg, 'text=Đã chép 2 bữa từ hôm qua') == 1, "390 toast says Đã chép 2 bữa từ hôm qua")
    check(energy(pg) == "1.988", f"390 copy 2 meals: totals rise to 1.988 (got {energy(pg)})")

    # The one undo toast puts the copied entries back
    undo.click()
    pg.wait_for_timeout(200)
    check(energy(pg) == "1.041", f"390 undo restores 1.041 kcal (got {energy(pg)})")

    # ‹ goes to yesterday and shows its own day
    vis(pg, 'button[aria-label="Ngày trước"]').click()
    pg.wait_for_url(f"**date={iso(YESTERDAY)}")
    pg.wait_for_timeout(300)
    check(visible_count(pg, 'text=Đang xem ngày cũ') == 1, "390 ‹ opens a past day with the banner")
    check(energy(pg) == "1.532", f"390 yesterday shows its own 1.532 kcal (got {energy(pg)})")
    check(visible_count(pg, 'button:has-text("Chép hôm qua")') == 0, "390 past day hides Chép hôm qua")
    check(visible_count(pg, f'text=Hôm qua, {YESTERDAY.day:02d}/{YESTERDAY.month:02d}') == 1,
          "390 header reads Hôm qua, dd/mm for yesterday")
    pg.screenshot(path=shot("cc10-past-day-390.png"), animations="disabled")

    # › comes back to today; › is off on today
    vis(pg, 'button[aria-label="Ngày sau"]').click()
    pg.wait_for_timeout(400)
    check("date=" not in pg.url, "390 › comes back to today (no date in URL)")
    check(energy(pg) == "1.041", f"390 back on today: 1.041 kcal (got {energy(pg)})")
    check(vis(pg, 'button[aria-label="Ngày sau"]').is_disabled(), "390 › is disabled on today")

    # Calendar: tap the date label, pick a day 5 days ago
    vis(pg, 'button[aria-label^="Chọn ngày"]').click()
    dialog = pg.get_by_role("dialog")
    dialog.wait_for(state="visible")
    future = dialog.locator('button[aria-label*="chưa tới"]')
    check(future.count() > 0 and all(future.nth(i).is_disabled() for i in range(future.count())),
          "390 calendar: days after today cannot be picked")
    pg.screenshot(path=shot("cc10-calendar-390.png"), animations="disabled")
    if FIVE_AGO.month != TODAY.month:
        dialog.get_by_label("Tháng trước").click()
    dialog.locator("button").filter(has_text=re.compile(rf"^{FIVE_AGO.day}$")).click()
    pg.wait_for_selector('[role="dialog"]', state="detached")
    pg.wait_for_url(f"**date={iso(FIVE_AGO)}")
    pg.wait_for_timeout(300)
    check(visible_count(pg, 'text=Đang xem ngày cũ') == 1, "390 calendar: 5 days ago opens the past view")
    check(energy(pg) == "0", f"390 a past day with nothing logged reads 0 kcal (got {energy(pg)})")
    check(visible_count(pg, 'text=Chưa ghi') > 0, "390 a past day with nothing logged shows Chưa ghi")
    pg.screenshot(path=shot("cc10-past-empty-390.png"), animations="disabled")
    vis(pg, 'a:has-text("Về hôm nay")').click()
    pg.wait_for_timeout(300)
    check("date=" not in pg.url, "390 Về hôm nay returns to today")

    # Hồ sơ: Năm sinh is a row; tapping it opens the field
    pg.goto(BASE + "/profile", wait_until="networkidle")
    row = vis(pg, 'button:has-text("Năm sinh")')
    row.wait_for(state="visible", timeout=8000)
    check("2003" in row.inner_text(), "390 profile: Năm sinh row shows 2003")
    row.click()
    field = pg.locator("#profile-birth-year")
    field.wait_for(state="visible")
    check(field.evaluate("el => el === document.activeElement"), "390 birth year: field has focus after the tap")
    field.fill("1899")
    field.press("Enter")
    pg.wait_for_timeout(200)
    check(BIRTH_ERROR in pg.inner_text("body"), "390 birth year: 1899 shows the setup error")
    check(pg.locator("#profile-birth-year").count() == 1, "390 birth year: field stays open on an error")
    field = pg.locator("#profile-birth-year")
    field.fill("1990")
    field.press("Enter")
    pg.wait_for_selector("#profile-birth-year", state="detached")
    check("1990" in vis(pg, 'button:has-text("Năm sinh")').inner_text(), "390 birth year: 1990 saved back into the row")
    pg.reload(wait_until="networkidle")
    check("1990" in vis(pg, 'button:has-text("Năm sinh")').inner_text(), "390 birth year: 1990 kept after reload")
    ctx.close()


def run_desktop(browser):
    ctx = browser.new_context(viewport=DESKTOP)
    pg = ctx.new_page()
    open_day(pg)
    check(visible_count(pg, 'button:has-text("Chép hôm qua")') == 1, "1440 today: Chép hôm qua shows")
    pg.screenshot(path=shot("cc10-today-1440.png"), animations="disabled")
    vis(pg, 'button[aria-label="Ngày trước"]').click()
    pg.wait_for_url(f"**date={iso(YESTERDAY)}")
    pg.wait_for_timeout(300)
    check(visible_count(pg, 'text=Đang xem ngày cũ') == 1, "1440 ‹ opens yesterday with the banner")
    check(visible_count(pg, 'button:has-text("Chép hôm qua")') == 0, "1440 past day hides Chép hôm qua")
    check(visible_count(pg, 'button:has-text("Thêm món")') == 0, "1440 past day hides Thêm món")
    ctx.close()


def run_hydration(browser):
    paths = [
        "/today",
        f"/today?date={iso(YESTERDAY)}",
        f"/today?date={iso(FIVE_AGO)}",
        f"/today?date={iso(FUTURE)}",
        "/today?date=not-a-date",
    ]
    for vp in (PHONE, DESKTOP):
        ctx = browser.new_context(viewport=vp)
        for path in paths:
            pg = ctx.new_page()
            errors = []
            pg.on("console", lambda msg: errors.append(msg.text) if msg.type == "error" else None)
            pg.on("pageerror", lambda err: errors.append(str(err)))
            pg.goto(BASE + path, wait_until="networkidle")
            pg.wait_for_timeout(500)
            hydration = [e for e in errors if re.search(r"hydrat|Minified React error|did not match", e, re.I)]
            check(not hydration, f"{vp['width']} {path}: no hydration errors {hydration[:2]}")
            pg.close()
        ctx.close()

    # A future date is treated as today: no banner
    ctx = browser.new_context(viewport=PHONE)
    pg = ctx.new_page()
    open_day(pg, f"?date={iso(FUTURE)}")
    check(visible_count(pg, 'text=Đang xem ngày cũ') == 0, "390 future ?date= shows today (no banner)")
    ctx.close()


def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        run_phone(browser)
        run_desktop(browser)
        run_hydration(browser)
        browser.close()


if __name__ == "__main__":
    run()
    print("\n".join(notes))
    print("PROBLEMS:", problems or "none")
    sys.exit(1 if problems else 0)
