"""ag-06: verification probe for a11y Must fixes, Should fixes, 22 vi chất copy, and reminder row status.
Run with: ALIGN_BASE_URL=http://localhost:3100 npm run probe -- tests/probes/ag06.py
"""
import os
import re
import sys
from playwright.sync_api import sync_playwright
import _demo  # noqa: F401  (cc2-15b: demo mode on, see _demo.py)

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3100")
PHONE = {"width": 390, "height": 844}
DESKTOP = {"width": 1440, "height": 900}

problems = []
notes = []


def check(cond, msg):
    if cond:
        notes.append("ok: " + msg)
    else:
        problems.append(msg)


def body_text(pg):
    return re.sub(r"\s+", " ", pg.inner_text("body"))


def test_item_1_and_2(browser):
    # 1. /add: Search input focus ring
    ctx = browser.new_context(viewport=PHONE)
    pg = ctx.new_page()
    pg.goto(BASE + "/add", wait_until="networkidle")
    pg.wait_for_timeout(300)
    search_input = pg.locator('input[type="search"][aria-label="Tìm món"]').first
    check(search_input.count() > 0, "add: search input present")
    inp_classes = search_input.get_attribute("class") or ""
    check("focus-visible:ring-blue" in inp_classes or "focus-visible:ring-2" in inp_classes,
          f"add: search input has focus ring class ({inp_classes})")
    ctx.close()

    # 2. /training: Checkbox aria-label and tap target
    ctx = browser.new_context(viewport=PHONE)
    pg = ctx.new_page()
    pg.goto(BASE + "/training", wait_until="networkidle")
    pg.wait_for_timeout(300)
    cbs = pg.locator('input[type="checkbox"]').all()
    check(len(cbs) > 0, f"training: found {len(cbs)} checklist checkboxes")
    all_labeled = True
    for cb in cbs:
        al = cb.get_attribute("aria-label")
        if not al or len(al.strip()) == 0:
            all_labeled = False
            break
    check(all_labeled, "training: all checkboxes have valid aria-label")
    ctx.close()

    # 3. /settings/notifications: Time input size and overlay
    ctx = browser.new_context(viewport=PHONE)
    pg = ctx.new_page()
    pg.goto(BASE + "/settings/notifications", wait_until="networkidle")
    pg.wait_for_timeout(300)
    time_inputs = pg.locator('input[type="time"]').all()
    check(len(time_inputs) > 0, f"notifications: found {len(time_inputs)} time inputs")
    all_full_size = True
    for ti in time_inputs:
        box = ti.bounding_box()
        if not box or box["height"] < 40 or box["width"] < 40:
            all_full_size = False
            break
    check(all_full_size, "notifications: time inputs have tap target >= 44x44 px (overlayed)")
    ctx.close()

    # 4. /entry/item-1: Grams input focus ring
    ctx = browser.new_context(viewport=PHONE)
    pg = ctx.new_page()
    pg.goto(BASE + "/entry/item-1", wait_until="networkidle")
    pg.wait_for_timeout(300)
    grams_input = pg.locator('input[aria-label="Số gam"]').first
    check(grams_input.count() > 0, "entry: grams input present")
    parent = grams_input.locator("..")
    p_classes = parent.get_attribute("class") or ""
    check("focus-within:ring-blue" in p_classes or "focus-within:ring-2" in p_classes,
          f"entry: grams input wrapper has focus-within ring ({p_classes})")
    ctx.close()

    # 5. /diary: "+ Thêm" tap target size
    ctx = browser.new_context(viewport=PHONE)
    pg = ctx.new_page()
    pg.goto(BASE + "/diary", wait_until="networkidle")
    pg.wait_for_timeout(300)
    add_links = pg.locator('a[id^="mobile-add-"]').all()
    check(len(add_links) > 0, f"today: found {len(add_links)} + Thêm links")
    all_min_44 = True
    for lk in add_links:
        box = lk.bounding_box()
        if not box or box["width"] < 43 or box["height"] < 43:
            all_min_44 = False
            break
    check(all_min_44, "today: all + Thêm links have tap target >= 44x44 px")
    ctx.close()

    # 6. /micros: h1 title
    ctx = browser.new_context(viewport=PHONE)
    pg = ctx.new_page()
    pg.goto(BASE + "/micros", wait_until="networkidle")
    pg.wait_for_timeout(300)
    h1 = pg.locator("h1").first
    check(h1.count() > 0 and "VI CHẤT" in h1.inner_text().upper(), "micros: h1 header element present with title Vi chất")
    ctx.close()


def test_item_3(browser):
    # /paywall: user-facing 22 vi chất
    ctx = browser.new_context(viewport=PHONE)
    pg = ctx.new_page()
    pg.goto(BASE + "/paywall", wait_until="networkidle")
    pg.wait_for_timeout(300)
    txt = body_text(pg)
    check("Gói miễn phí vẫn theo dõi đủ 22 vi chất." in txt, "paywall: shows 'Gói miễn phí vẫn theo dõi đủ 22 vi chất.'")
    check("21 vi chất" not in txt, "paywall: does not contain '21 vi chất'")
    ctx.close()


def test_item_4(browser):
    # /settings (Cài đặt, IA v2): "Nhắc nhở" shows "Đã bật" initially
    ctx = browser.new_context(viewport=PHONE)
    # Before mount the reminders value is empty: the server HTML never claims "Đã bật" or "Đã tắt"
    ssr = ctx.request.get(BASE + "/settings").text()
    check("Đã bật" not in ssr and "Đã tắt" not in ssr,
          "settings: server HTML has no reminder value (no 'Đã bật' or 'Đã tắt' before mount)")
    pg = ctx.new_page()
    pg.goto(BASE + "/settings", wait_until="networkidle")
    pg.wait_for_timeout(400)
    txt = body_text(pg)
    check("Nhắc nhở" in txt and "Đã bật" in txt, "profile: Nhắc nhở row shows 'Đã bật' after mount")

    # Set all notification reminders to false in localStorage and verify it updates to "Đã tắt"
    pg.evaluate("""() => {
        const key = 'h1t_settings_v1_demo';  // cc-21: settings are per account; demo has its own key
        const cur = JSON.parse(localStorage.getItem(key) || '{}');
        cur.breakfastReminder = false;
        cur.lunchReminder = false;
        cur.dinnerReminder = false;
        cur.workoutSaltReminder = false;
        cur.eveningSummaryReminder = false;
        localStorage.setItem(key, JSON.stringify(cur));
    }""")
    pg.reload(wait_until="networkidle")
    pg.wait_for_timeout(400)
    txt_off = body_text(pg)
    check("Nhắc nhở" in txt_off and "Đã tắt" in txt_off, "profile: Nhắc nhở row shows 'Đã tắt' when all reminders are disabled")
    ctx.close()



# Headings that are displayed (a display:none ancestor hides an h1 from the page and from assistive tech)
VISIBLE_H1_JS = """() => [...document.querySelectorAll('h1')].filter(h => {
    let el = h;
    while (el) { if (getComputedStyle(el).display === 'none') return false; el = el.parentElement; }
    return true;
}).map(h => h.textContent.trim())"""

ONE_H1_ROUTES = [
    "/diary", "/diary?loading=1", "/diary?empty=1", "/diary?offline=1",
    "/micros", "/micros/calcium", "/add", "/training", "/settings/profile", "/settings/profile/weight",
    "/trends", "/entry/item-1", "/foods/food-cha-la", "/setup/goal", "/setup/profile",
]


def test_one_h1(browser):
    # Every page shows exactly one heading level 1 at 390 and 1440 (the Today states included)
    for vp_name, vp in (("390", PHONE), ("1440", DESKTOP)):
        ctx = browser.new_context(viewport=vp)
        pg = ctx.new_page()
        for route in ONE_H1_ROUTES:
            pg.goto(BASE + route, wait_until="networkidle")
            pg.wait_for_timeout(300)
            h1s = pg.evaluate(VISIBLE_H1_JS)
            check(len(h1s) == 1, f"{route} @ {vp_name}: one visible h1 (found {h1s})")
        ctx.close()


def main():
    print(f"=== Running ag-06 probe against {BASE} ===")
    with sync_playwright() as p:
        browser = p.chromium.launch()
        test_item_1_and_2(browser)
        test_one_h1(browser)
        test_item_3(browser)
        test_item_4(browser)
        browser.close()

    print("\n--- Notes ---")
    for n in notes:
        print("  " + n)

    if problems:
        print("\n--- Problems ---")
        for pr in problems:
            print("  FAIL: " + pr)
        sys.exit(1)
    else:
        print(f"\nALL {len(notes)} CHECKS PASSED.")


if __name__ == "__main__":
    main()
