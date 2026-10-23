"""Job I (feat/food-swipe, 24/10): swipe a food on Hôm nay: left = Xóa, right = the ⋯ menu. 390 touch (CDP touch events), demo build.

Short left swipe rests open with the red button -> tap it -> deleted -> Hoàn tác restores; a long left swipe deletes on release; a right
swipe opens the ⋯ menu (Sửa, Chuyển sang bữa…, Xóa) and Chuyển sang bữa moves the food; vertical scroll still scrolls and does not move the
row; one row open at a time; a tap elsewhere closes it; a past day has no swipe; reduced motion shows the buttons without a slide.
Screenshots: .screenshots/food-swipe/*.png (390×844).
Run with: ALIGN_BASE_URL=http://localhost:3115 npm run probe -- tests/probes/food_swipe.py
"""
# PROBE_COVERS: app/(app)/(tabs)/app/** components/home/food-list.tsx components/home/food-menu-sheet.tsx lib/row-swipe.ts lib/use-row-swipe.ts lib/row-swipe-open.ts
import datetime
import os
import re
import sys
from pathlib import Path

import _demo  # noqa: F401
from playwright.sync_api import sync_playwright

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3115")
SHOTS = Path(__file__).resolve().parent.parent.parent / ".screenshots" / "food-swipe"
SHOTS.mkdir(parents=True, exist_ok=True)
NOW = "2026-10-12T18:00:00+07:00"
NO_INSTALL = "try { sessionStorage.setItem('h1t_install_shown', '1'); } catch (e) {}"
problems = []


def check(cond, msg):
    print(("[PASS] " if cond else "[FAIL] ") + msg)
    if not cond:
        problems.append(msg)


def new_page(browser, **extra):
    ctx = browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, has_touch=True, **extra)
    ctx.add_init_script(NO_INSTALL)
    pg = ctx.new_page()
    pg.clock.set_fixed_time(NOW)
    cdp = ctx.new_cdp_session(pg)
    pg.goto(BASE + "/app", wait_until="networkidle")
    pg.wait_for_timeout(2500)
    return ctx, pg, cdp


def rows(pg):
    return pg.locator("button[data-entry-id]")


def names(pg):
    return [re.sub(r"\s+", " ", r.inner_text()).strip() for r in rows(pg).all()]


def swipe(pg, cdp, loc, dx, dy=0, steps=8, release=True):
    b = loc.bounding_box()
    # The row is at the left of the screen (178 px wide): a left swipe starts at its right end, a right swipe at its left end
    x, y = (b["x"] + b["width"] - 10 if dx < 0 else b["x"] + 10), b["y"] + b["height"] / 2
    cdp.send("Input.dispatchTouchEvent", {"type": "touchStart", "touchPoints": [{"x": x, "y": y}]})
    for i in range(1, steps + 1):
        cdp.send("Input.dispatchTouchEvent", {"type": "touchMove", "touchPoints": [{"x": x + dx * i / steps, "y": y + dy * i / steps}]})
        pg.wait_for_timeout(16)
    if release:
        cdp.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []})
        pg.wait_for_timeout(450)


def shift(loc):
    return loc.evaluate("(el) => new DOMMatrix(getComputedStyle(el).transform).m41")


def wrap_buttons(pg, entry_id):
    w = pg.locator(f"[data-swipe-wrap='{entry_id}']")
    return w.locator("button").nth(0), w.locator("button").nth(1)  # ⋯ (left), Xóa (right)


def toast(pg):
    t = pg.locator("[role=status]").filter(has_text=re.compile("Đã xóa|Đã xóa"))
    return re.sub(r"\s+", " ", t.first.inner_text()) if t.count() else ""


def run(browser):
    ctx, pg, cdp = new_page(browser)
    all_before = names(pg)
    first = rows(pg).first
    eid = first.get_attribute("data-entry-id")
    first_name = all_before[0]
    check(pg.locator(f"[data-swipe-wrap='{eid}']").count() == 1, "390: a food row of today has the swipe wrapper")
    check(rows(pg).first.evaluate("(el) => getComputedStyle(el).touchAction") == "pan-y", "390: the row lets the page scroll vertically (touch-action pan-y)")
    width = first.bounding_box()["width"]

    # 1. short left swipe: rests open
    swipe(pg, cdp, first, -70)
    off = shift(first)
    more, trash = wrap_buttons(pg, eid)
    tb = trash.bounding_box()
    check(-width * 0.6 < off <= -40, f"390: a short left swipe rests open ({off:.0f} px of a {width:.0f} px row)")
    check(trash.evaluate("(el) => getComputedStyle(el).opacity") == "1" and tb and tb["width"] >= 44 and tb["height"] >= 44, f"390: the red Xóa button shows, ≥ 44 px ({tb and (round(tb['width']), round(tb['height']))})")
    check(trash.get_attribute("aria-label") == f"Xóa {first_name.split(' ')[0]}" or (trash.get_attribute("aria-label") or "").startswith("Xóa "), f"390: its label for screen readers ({trash.get_attribute('aria-label')!r})")
    pg.screenshot(path=str(SHOTS / "390-1-open-left.png"))
    check(len(names(pg)) == len(all_before), "390: nothing is deleted by an open row")
    # tap it: deleted
    tbb = trash.bounding_box()
    pg.touchscreen.tap(tbb["x"] + tbb["width"] / 2, tbb["y"] + tbb["height"] / 2)
    pg.wait_for_timeout(900)
    check(len(names(pg)) == len(all_before) - 1 and eid not in [r.get_attribute("data-entry-id") for r in rows(pg).all()], "390: a tap on Xóa deletes the food")
    check(bool(toast(pg)), f"390: one toast ({toast(pg)!r})")
    pg.screenshot(path=str(SHOTS / "390-2-deleted-toast.png"))
    pg.locator("[role=status]").get_by_role("button", name="Hoàn tác").click()
    pg.wait_for_timeout(900)
    check(names(pg) == all_before, "390: Hoàn tác puts it back in place")

    # 2. long left swipe: deletes on release
    first = rows(pg).first
    swipe(pg, cdp, first, -135)
    pg.wait_for_timeout(500)
    check(len(names(pg)) == len(all_before) - 1, "390: a long left swipe deletes on release")
    check(bool(toast(pg)), f"390: with the one toast ({toast(pg)!r})")
    pg.locator("[role=status]").get_by_role("button", name="Hoàn tác").click()
    pg.wait_for_timeout(900)
    check(names(pg) == all_before, "390: Hoàn tác again")

    # 3. a short right swipe rests open on the ⋯; a tap opens the menu
    first = rows(pg).first
    swipe(pg, cdp, first, 40)
    more, trash = wrap_buttons(pg, eid)
    off = shift(first)
    check(off > 20 and more.evaluate("(el) => getComputedStyle(el).opacity") == "1", f"390: a short right swipe shows the ⋯ ({off:.0f} px)")
    pg.screenshot(path=str(SHOTS / "390-3-open-right.png"))
    mb = more.bounding_box()
    pg.touchscreen.tap(mb["x"] + mb["width"] / 2, mb["y"] + mb["height"] / 2)
    pg.wait_for_timeout(700)
    dialog = pg.locator("[role=dialog]").filter(visible=True).first
    dtext = re.sub(r"\s+", " ", dialog.inner_text())
    check("Sửa" in dtext and "Chuyển sang bữa" in dtext and "Xóa" in dtext, f"390: the ⋯ menu has Sửa, Chuyển sang bữa…, Xóa ({dtext[:80]!r})")
    pg.screenshot(path=str(SHOTS / "390-4-menu.png"))
    # Chuyển sang bữa… -> the meal picker -> Bữa tối
    dialog.get_by_role("button", name=re.compile("Chuyển sang bữa")).click()
    pg.wait_for_timeout(700)
    picker = pg.locator("[role=dialog]").filter(visible=True).first
    picker.get_by_role("radio", name=re.compile("tối", re.I)).click()
    picker.get_by_role("button", name="Chuyển", exact=True).click()
    pg.wait_for_timeout(1200)
    in_dinner = pg.locator(f"section[data-meal-slot=dinner] button[data-entry-id='{eid}']").count()
    check(in_dinner == 1, "390: Chuyển sang bữa… moves the food to Bữa tối")
    pg.screenshot(path=str(SHOTS / "390-5-moved.png"))

    # 4. a long right swipe opens the menu at once, the row is back
    row = pg.locator(f"button[data-entry-id='{eid}']")
    row.scroll_into_view_if_needed()
    pg.wait_for_timeout(300)
    swipe(pg, cdp, row, 100)
    pg.wait_for_timeout(500)
    check(pg.locator("[role=dialog]").filter(visible=True).count() == 1 and abs(shift(row)) < 2, f"390: a right swipe past 25 % opens the menu and the row closes (dialogs {pg.locator('[role=dialog]').filter(visible=True).count()}, row {shift(row):.0f})")
    pg.keyboard.press("Escape")
    pg.wait_for_timeout(500)

    # 5. one row open at a time; a tap elsewhere closes it
    r1, r2 = rows(pg).nth(0), rows(pg).nth(1)
    id1, id2 = r1.get_attribute("data-entry-id"), r2.get_attribute("data-entry-id")
    swipe(pg, cdp, r1, -70)
    check(shift(r1) < -40, "390: row 1 rests open")
    swipe(pg, cdp, r2, -70)
    pg.wait_for_timeout(400)
    check(shift(r2) < -40 and abs(shift(r1)) < 2, f"390: opening row 2 closes row 1 ({shift(r1):.0f}, {shift(r2):.0f})")
    pg.touchscreen.tap(200, 90)
    pg.wait_for_timeout(500)
    check(abs(shift(r2)) < 2, "390: a tap elsewhere closes the open row")

    # 6. vertical scroll still scrolls and does not move the row
    y0 = pg.evaluate("window.scrollY")
    r = rows(pg).nth(1)
    swipe(pg, cdp, r, 4, dy=-220, steps=10)
    pg.wait_for_timeout(300)
    check(pg.evaluate("window.scrollY") > y0 + 20 and abs(shift(r)) < 2, f"390: a vertical drag scrolls the page and the row stays ({y0} -> {pg.evaluate('window.scrollY')})")
    pg.evaluate("window.scrollTo(0, 0)")

    # 7. a tap still selects the food (the kcal view)
    t = rows(pg).first
    b = t.bounding_box()
    pg.touchscreen.tap(b["x"] + 40, b["y"] + b["height"] / 2)
    pg.wait_for_timeout(500)
    check(t.get_attribute("aria-pressed") == "true", "390: a tap on a row still picks that food")
    ctx.close()

    # 8. a past day: no swipe
    yesterday = (datetime.date(2026, 10, 12) - datetime.timedelta(days=1)).isoformat()
    ctx, pg, cdp = new_page(browser)
    pg.goto(f"{BASE}/app?date={yesterday}", wait_until="networkidle")
    pg.wait_for_timeout(2000)
    check(pg.locator("[data-swipe-wrap]").count() == 0, "390: a past day has no swipe buttons")
    ctx.close()

    # 9. reduced motion: no slide, the buttons show
    ctx, pg, cdp = new_page(browser, reduced_motion="reduce")
    first = rows(pg).first
    eid = first.get_attribute("data-entry-id")
    swipe(pg, cdp, first, -70)
    more, trash = wrap_buttons(pg, eid)
    check(trash.evaluate("(el) => getComputedStyle(el).opacity") == "1", "390 reduced motion: the Xóa button shows")
    check(first.evaluate("(el) => getComputedStyle(el).transitionDuration") in ("0s", ""), "390 reduced motion: the row does not slide (no transition)")
    ctx.close()


def desktop(browser):
    """Reviewer 24/10 (must): the swipe is touch only, so a mouse, a keyboard and a screen reader reach the same actions without it."""
    ctx = browser.new_context(viewport={"width": 1440, "height": 900})
    ctx.add_init_script(NO_INSTALL)
    pg = ctx.new_page()
    pg.clock.set_fixed_time(NOW)
    pg.goto(BASE + "/app", wait_until="networkidle")
    pg.wait_for_timeout(2500)
    check(pg.locator("[data-swipe-wrap]").count() == 0, "1440: with a mouse the rows have no swipe wrapper (nothing hidden behind the row)")
    first = rows(pg).first
    eid = first.get_attribute("data-entry-id")
    first.click()
    pg.wait_for_timeout(500)
    edit = pg.get_by_role("link", name="Sửa món này")
    check(first.get_attribute("aria-pressed") == "true" and edit.count() == 1, "1440: a click on a food picks it and shows the Sửa pill")
    pg.screenshot(path=str(SHOTS / "1440-1-click-shows-sua.png"))
    edit.click()
    pg.wait_for_url(f"**/entry/{eid}*", timeout=8000)
    pg.wait_for_timeout(800)
    check(pg.get_by_role("button", name=re.compile("Xóa món")).count() == 1, "1440: Sửa leads to the edit screen, which has Xóa món")
    pg.screenshot(path=str(SHOTS / "1440-2-entry-has-xoa.png"))
    # keyboard: Tab to a row, Enter picks it, the Sửa pill is a link you can reach next
    pg.goto(BASE + "/app", wait_until="networkidle")
    pg.wait_for_timeout(2000)
    row = rows(pg).first
    row.focus()
    pg.keyboard.press("Enter")
    pg.wait_for_timeout(400)
    check(row.get_attribute("aria-pressed") == "true" and pg.get_by_role("link", name="Sửa món này").count() == 1, "1440: Enter on a focused row picks it and shows Sửa (keyboard)")
    ctx.close()
    # a touch device keeps the swipe buttons in the accessibility tree under their names (VoiceOver reads them as the row's actions)
    ctx, pg, cdp = new_page(browser)
    first = rows(pg).first
    eid = first.get_attribute("data-entry-id")
    more, trash = wrap_buttons(pg, eid)
    check((more.get_attribute("aria-label") or "").startswith("Tùy chọn cho ") and (trash.get_attribute("aria-label") or "").startswith("Xóa "), "390: the ⋯ and Xóa buttons are named in the accessibility tree even when the row is closed (VoiceOver)")
    check(more.evaluate("(el) => getComputedStyle(el).display") != "none" and more.evaluate("(el) => getComputedStyle(el).visibility") != "hidden", "390: and they are not display:none or hidden")
    ctx.close()


with sync_playwright() as p:
    browser = p.chromium.launch()
    try:
        run(browser)
        desktop(browser)
    finally:
        browser.close()

print(f"\n{len(problems)} problem(s)")
sys.exit(1 if problems else 0)
