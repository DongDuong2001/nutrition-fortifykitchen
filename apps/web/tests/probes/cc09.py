"""cc-09: Cài đặt menu. Every menu row opens its page and Back returns to /settings (390 and 1440). Birth year 1899
shows the setup error and a valid year saves. Training default 90 shows on /training after reload. Goal chips
stay on one line at 1440.
Run with: ALIGN_BASE_URL=http://localhost:3101 npm run probe -- tests/probes/cc09.py
"""
import datetime
import os
import sys

from playwright.sync_api import sync_playwright
import _demo  # noqa: F401  (cc2-15b: demo mode on, see _demo.py)

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3100")
SHOTS = os.path.join(os.path.dirname(__file__), "..", "..", ".screenshots")
PHONE = {"width": 390, "height": 844}
DESKTOP = {"width": 1440, "height": 900}
BIRTH_ERROR = "Nhập năm sinh từ 1920 đến 2015"  # Dong (main): the range is 1920 to 2015
NOT_FOUND = "KHÔNG TÌM THẤY TRANG"
MENU_HREFS = [
    "/settings/language",
    "/settings/notifications",
    "/install",
    "/paywall",
    "/settings/delete-account",
    "/settings/account",
]
problems = []
notes = []


def check(cond, msg):
    if cond:
        notes.append("ok: " + msg)
    else:
        problems.append(msg)


def body(pg):
    return pg.inner_text("body")


def visible(pg, selector):
    return pg.locator(selector + " >> visible=true").first


def open_profile(pg):
    pg.goto(BASE + "/settings/profile", wait_until="networkidle")
    visible(pg, 'a[href="/settings/profile/weight"]').wait_for(state="visible")
    pg.wait_for_timeout(300)


def open_settings(pg):
    # IA v2: the menu rows (language, reminders, install, Pro, account, danger zone) live on the Cài đặt tab
    pg.goto(BASE + "/settings", wait_until="networkidle")
    visible(pg, 'a[href="/settings/language"]').wait_for(state="visible")
    pg.wait_for_timeout(300)


def check_menu(pg, label):
    for href in MENU_HREFS:
        open_settings(pg)
        link = visible(pg, f'a[href="{href}"]')
        link.wait_for(state="visible", timeout=8000)
        link.click()
        try:
            pg.wait_for_url(f"**{href}", timeout=8000)
            pg.wait_for_load_state("networkidle")
            pg.wait_for_timeout(300)
            opened = NOT_FOUND not in body(pg)
        except Exception:
            opened = False
        check(opened, f"{label}: {href} opens its page (not the 404 page)")
        pg.go_back()
        try:
            pg.wait_for_url("**/settings", timeout=8000)
            back = True
        except Exception:
            back = False
        check(back, f"{label}: Back from {href} returns to /settings")


def run_phone(browser):
    ctx = browser.new_context(viewport=PHONE)
    pg = ctx.new_page()

    open_settings(pg)
    pg.screenshot(path=os.path.join(SHOTS, "cc09-settings-390.png"), full_page=True, animations="disabled")
    text = body(pg).lower()  # section titles are uppercase on screen
    check("ứng dụng" in text and "vùng nguy hiểm" in text, "390 settings: app and danger sections visible")

    check_menu(pg, "390 menu")

    # Birth year: the row opens the field. 1899 is refused with the setup error, nothing saved
    open_profile(pg)
    visible(pg, 'button:has-text("Năm sinh")').click()
    field = pg.locator("#profile-birth-year")
    field.wait_for(state="visible")
    field.fill("1899")
    field.press("Enter")
    pg.wait_for_timeout(200)
    check(BIRTH_ERROR in body(pg), "390 birth year: 1899 shows the setup error text")
    check(field.get_attribute("aria-invalid") == "true", "390 birth year: field is marked invalid")
    check("/settings/profile" in pg.url and "/settings/profile/" not in pg.url, "390 birth year: stays on /settings/profile")
    pg.reload(wait_until="networkidle")
    pg.wait_for_timeout(300)
    check("2003" in visible(pg, 'button:has-text("Năm sinh")').inner_text(), "390 birth year: 1899 not saved (still 2003)")

    # A valid year saves and survives a reload
    visible(pg, 'button:has-text("Năm sinh")').click()
    field = pg.locator("#profile-birth-year")
    field.wait_for(state="visible")
    field.fill("1990")
    field.press("Enter")
    pg.wait_for_timeout(200)
    check(BIRTH_ERROR not in body(pg), "390 birth year: 1990 clears the error")
    pg.reload(wait_until="networkidle")
    pg.wait_for_timeout(300)
    check("1990" in visible(pg, 'button:has-text("Năm sinh")').inner_text(), "390 birth year: 1990 kept after reload")

    # Training default 90: the profile chip, then the /training chip
    open_profile(pg)
    pg.get_by_role("button", name="90 phút").click()
    pg.wait_for_timeout(200)
    check(pg.get_by_role("button", name="90 phút").get_attribute("aria-pressed") == "true",
          "390 profile: training default chip 90 is pressed")
    pg.goto(BASE + "/training", wait_until="networkidle")
    pg.wait_for_timeout(600)
    active = pg.locator('button[aria-pressed="true"] >> visible=true', has_text="90 phút")
    check(active.count() >= 1, "390 training: default chip shows 90 phút after the profile change")
    pg.reload(wait_until="networkidle")
    pg.wait_for_timeout(600)
    active = pg.locator('button[aria-pressed="true"] >> visible=true', has_text="90 phút")
    check(active.count() >= 1, "390 training: 90 phút default kept after reload")

    ctx.close()


def run_desktop(browser):
    ctx = browser.new_context(viewport=DESKTOP)
    pg = ctx.new_page()

    open_profile(pg)
    pg.screenshot(path=os.path.join(SHOTS, "cc09-profile-1440.png"), full_page=True, animations="disabled")
    one_line = pg.evaluate("""() => [...document.querySelectorAll('[aria-labelledby="profile-goal-label"] button')].map((b) => {
        const r = document.createRange();
        r.selectNodeContents(b);
        return new Set([...r.getClientRects()].map((x) => Math.round(x.top))).size;
    })""")
    check(len(one_line) == 4 and all(lines == 1 for lines in one_line),
          f"1440 goal chips: each label on one line {one_line}")

    check_menu(pg, "1440 menu")
    ctx.close()


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
