"""Job I (feat/food-swipe, 24/10): swipe a food on Hôm nay: left = Xóa, right = the ⋯ menu. 390 touch (CDP touch events), demo build.

Short left swipe rests open with the red button -> tap it -> deleted -> Hoàn tác restores; a long left swipe deletes on release; a right
swipe opens the ⋯ menu (Sửa, Chuyển sang bữa…, Xóa) and Chuyển sang bữa moves the food; vertical scroll still scrolls and does not move the
row; one row open at a time; a tap elsewhere closes it; a past day has no swipe; reduced motion shows the buttons without a slide.
The food that is picked (tapped: the hero shows it, the row is cobalt) swipes both ways like any other row (fix/swipe-picked-row, 24/10).
⋯ › Sửa opens the edit screen and it stays open (the sheet's own history.back used to undo the push), and Back returns to Hôm nay in one step.
From a row resting on ⋯ a second short right swipe opens the menu (the threshold is within what the pull can reach).
At rest a swipeable row is the colour of the list behind it, light and dark, so touch rows are not boxes (the row only covers the buttons).
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


def new_page(browser, width=390, **extra):
    ctx = browser.new_context(viewport={"width": width, "height": 844}, device_scale_factor=2, has_touch=True, **extra)
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


def open_move(pg, cdp, eid):
    """Swipe the food right, tap its ⋯, Chuyển sang bữa…: the meal picker."""
    row = pg.locator(f"button[data-entry-id='{eid}']")
    row.scroll_into_view_if_needed()
    pg.wait_for_timeout(300)
    swipe(pg, cdp, row, 40)
    more, _ = wrap_buttons(pg, eid)
    mb = more.bounding_box()
    pg.touchscreen.tap(mb["x"] + mb["width"] / 2, mb["y"] + mb["height"] / 2)
    pg.wait_for_timeout(700)
    pg.locator("[role=dialog]").filter(visible=True).first.get_by_role("button", name=re.compile("Chuyển sang bữa")).click()
    pg.wait_for_timeout(700)
    return pg.locator("[role=dialog]").filter(visible=True).first


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

    # 3b. Trước tập (the sample day shows it): the picker lists it in the day's order and starts on the food's own meal;
    # a food can be moved into it and out of it, as the hold-and-drag does (review 24/10)
    picker = open_move(pg, cdp, eid)
    radios = [re.sub(r"\s+", " ", t).strip() for t in picker.get_by_role("radio").all_inner_texts()]
    check(radios == ["Sáng", "Trưa", "Trước tập", "Bữa phụ", "Tối"], f"390: the picker lists the day's meals in order, Trước tập among them ({radios})")
    check(picker.get_by_role("radio", name="Tối").get_attribute("aria-checked") == "true", "390: …and starts on the food's own meal (Tối)")
    picker.get_by_role("radio", name="Trước tập").click()
    picker.get_by_role("button", name="Chuyển", exact=True).click()
    pg.wait_for_timeout(1200)
    check(pg.locator(f"section[data-meal-slot=pre_workout] button[data-entry-id='{eid}']").count() == 1, "390: a food moves into Trước tập")
    picker = open_move(pg, cdp, eid)
    check(picker.get_by_role("radio", name="Trước tập").get_attribute("aria-checked") == "true", "390: a food in Trước tập opens the picker on Trước tập, not on Sáng")
    pg.screenshot(path=str(SHOTS / "390-5b-picker-pre-workout.png"))
    picker.get_by_role("radio", name="Trưa").click()
    picker.get_by_role("button", name="Chuyển", exact=True).click()
    pg.wait_for_timeout(1200)
    check(pg.locator(f"section[data-meal-slot=lunch] button[data-entry-id='{eid}']").count() == 1, "390: …and out of Trước tập into Trưa")

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


def picked_row(browser):
    """Hao's phone video 24/10: the picked (cobalt) food did not move when swiped, because only an unpicked row had touch-action pan-y and the
    browser took the drag as its own pan (pointercancel). A picked row swipes both ways, its buttons act on that food, and a mouse never swipes."""
    ctx, pg, cdp = new_page(browser)
    all_before = names(pg)
    row = rows(pg).nth(1)
    eid = row.get_attribute("data-entry-id")
    other = rows(pg).nth(2)
    b = row.bounding_box()
    pg.touchscreen.tap(b["x"] + 40, b["y"] + b["height"] / 2)
    pg.wait_for_timeout(600)
    check(row.get_attribute("aria-pressed") == "true" and pg.get_by_role("link", name="Sửa món này").count() == 1, "390 picked: a tap picks the food and the hero shows Sửa")
    check(row.evaluate("(el) => getComputedStyle(el).touchAction") == "pan-y", "390 picked: the picked row lets the page scroll vertically too (touch-action pan-y)")
    width = row.bounding_box()["width"]
    pg.screenshot(path=str(SHOTS / "390-6-picked.png"))

    # left: rests open on the red Xóa, as an unpicked row does
    swipe(pg, cdp, row, -70)
    off = shift(row)
    more, trash = wrap_buttons(pg, eid)
    check(-width * 0.6 < off <= -40, f"390 picked: a short left swipe rests open ({off:.0f} px of a {width:.0f} px row)")
    check(trash.evaluate("(el) => getComputedStyle(el).opacity") == "1", "390 picked: the red Xóa button shows")
    check(row.get_attribute("aria-pressed") == "true", "390 picked: swiping does not unpick the food")
    pg.screenshot(path=str(SHOTS / "390-7-picked-open-left.png"))
    tb = trash.bounding_box()
    pg.touchscreen.tap(tb["x"] + tb["width"] / 2, tb["y"] + tb["height"] / 2)
    pg.wait_for_timeout(900)
    gone = eid not in [r.get_attribute("data-entry-id") for r in rows(pg).all()]
    check(gone and len(names(pg)) == len(all_before) - 1, "390 picked: Xóa deletes that food and no other")
    pg.screenshot(path=str(SHOTS / "390-8-picked-deleted.png"))
    pg.locator("[role=status]").get_by_role("button", name="Hoàn tác").click()
    pg.wait_for_timeout(900)
    check(names(pg) == all_before, "390 picked: Hoàn tác puts it back in place")

    # right: the ⋯ menu, its Xóa acts on the same food
    row = pg.locator(f"button[data-entry-id='{eid}']")
    swipe(pg, cdp, row, 40)
    more, trash = wrap_buttons(pg, eid)
    check(shift(row) > 20 and more.evaluate("(el) => getComputedStyle(el).opacity") == "1", f"390 picked: a short right swipe shows the ⋯ ({shift(row):.0f} px)")
    mb = more.bounding_box()
    pg.touchscreen.tap(mb["x"] + mb["width"] / 2, mb["y"] + mb["height"] / 2)
    pg.wait_for_timeout(700)
    dialog = pg.locator("[role=dialog]").filter(visible=True).first
    dtext = re.sub(r"\s+", " ", dialog.inner_text())
    check("Sửa" in dtext and "Chuyển sang bữa" in dtext and "Xóa" in dtext, f"390 picked: the ⋯ menu has Sửa, Chuyển sang bữa…, Xóa ({dtext[:80]!r})")
    pg.screenshot(path=str(SHOTS / "390-9-picked-menu.png"))
    dialog.get_by_role("button", name=re.compile(r"^Xóa")).first.click()
    pg.wait_for_timeout(900)
    gone = eid not in [r.get_attribute("data-entry-id") for r in rows(pg).all()]
    check(gone and len(names(pg)) == len(all_before) - 1, "390 picked: Xóa in the ⋯ menu deletes that food and no other")
    pg.locator("[role=status]").get_by_role("button", name="Hoàn tác").click()
    pg.wait_for_timeout(900)
    check(names(pg) == all_before, "390 picked: Hoàn tác puts it back again")

    # a row that is not picked behaves as before, with the picked one still picked
    row = pg.locator(f"button[data-entry-id='{eid}']")
    row.scroll_into_view_if_needed()
    pg.wait_for_timeout(300)
    picked_now = row.get_attribute("aria-pressed") == "true"
    swipe(pg, cdp, other, -70)
    check(shift(other) < -40, f"390 picked: an unpicked row still swipes ({shift(other):.0f} px)")
    print(f"[info] after Xóa and Hoàn tác the food is {'still picked' if picked_now else 'not picked'}")
    ctx.close()

    # a mouse never swipes, picked or not
    ctx = browser.new_context(viewport={"width": 1440, "height": 900})
    ctx.add_init_script(NO_INSTALL)
    pg = ctx.new_page()
    pg.clock.set_fixed_time(NOW)
    pg.goto(BASE + "/app", wait_until="networkidle")
    pg.wait_for_timeout(2500)
    row = rows(pg).nth(1)
    row.click()
    pg.wait_for_timeout(400)
    b = row.bounding_box()
    pg.mouse.move(b["x"] + b["width"] - 10, b["y"] + b["height"] / 2)
    pg.mouse.down()
    pg.mouse.move(b["x"] + 20, b["y"] + b["height"] / 2, steps=8)
    pg.mouse.up()
    pg.wait_for_timeout(400)
    check(row.get_attribute("aria-pressed") in ("true", "false") and abs(shift(row)) < 2 and pg.locator("[data-swipe-wrap]").count() == 0, f"1440 picked: a mouse drag does not swipe the row ({shift(row):.0f} px, no swipe wrapper)")
    ctx.close()


SURFACE = """(el) => {
  const clear = (c) => c === 'rgba(0, 0, 0, 0)' || c === 'transparent';
  let n = el.closest('[data-swipe-wrap]') || el;
  n = n.parentElement;
  while (n && clear(getComputedStyle(n).backgroundColor)) n = n.parentElement;
  return { row: getComputedStyle(el).backgroundColor, behind: n ? getComputedStyle(n).backgroundColor : null };
}"""


def rows_at_rest(browser):
    """Hao's screenshot 24/10: every food row of today showed as a lighter box (#fff on #F2F2F7, #1C1C1E on black). At rest a swipeable row
    has the list's own colour, so it looks like a row that does not swipe; while it slides it still covers the buttons (it is opaque)."""
    for theme in ("light", "dark"):
      for width in (360, 390, 430):
        ctx, pg, cdp = new_page(browser, width)
        pg.evaluate(f"document.documentElement.dataset.theme = '{theme}'")
        pg.wait_for_timeout(400)
        row = rows(pg).nth(1)
        c = row.evaluate(SURFACE)
        check(c["row"] == c["behind"], f"{width} {theme}: an unpicked swipeable row has the list's colour, no box ({c['row']} on {c['behind']})")
        pg.screenshot(path=str(SHOTS / f"{width}-10-rest-{theme}.png"))
        if width == 390:
            swipe(pg, cdp, row, -70)
            a = row.evaluate("(el) => getComputedStyle(el).backgroundColor")
            check(a not in ("rgba(0, 0, 0, 0)", "transparent"), f"390 {theme}: a sliding row is opaque, so it covers Xóa ({a})")
        ctx.close()
    ctx = browser.new_context(viewport={"width": 1440, "height": 900})
    ctx.add_init_script(NO_INSTALL)
    pg = ctx.new_page()
    pg.clock.set_fixed_time(NOW)
    pg.goto(BASE + "/app", wait_until="networkidle")
    pg.wait_for_timeout(2500)
    pg.screenshot(path=str(SHOTS / "1440-3-rest.png"))
    ctx.close()


def menu_edit(browser):
    """Hao 24/10 21:38: swipe right, ⋯, Sửa: the edit screen came up and went away again, because closing the sheet schedules its own
    history.back() 50 ms later and a push slower than that was undone. Sửa leaves through navigateFromSheet (the sheet's entry becomes the
    edit screen). The back is slowed here the way a phone's navigation is, so the race is certain; Back is one step."""
    ctx, pg, cdp = new_page(browser)
    # A navigation that takes longer than the sheet's 50 ms back: the route fetch answers late
    pg.route(re.compile(r"/entry/[^/?]+"), lambda route: (pg.wait_for_timeout(250), route.continue_())[1])
    row = rows(pg).nth(1)
    eid = row.get_attribute("data-entry-id")
    swipe(pg, cdp, row, 40)
    more, _ = wrap_buttons(pg, eid)
    mb = more.bounding_box()
    pg.touchscreen.tap(mb["x"] + mb["width"] / 2, mb["y"] + mb["height"] / 2)
    pg.wait_for_timeout(700)
    dialog = pg.locator("[role=dialog]").filter(visible=True).first
    dialog.get_by_role("button", name="Sửa", exact=True).click()
    pg.wait_for_timeout(1500)
    check(f"/entry/{eid}" in pg.url, f"390 ⋯ › Sửa: the edit screen is still open 1.5 s later ({pg.url})")
    check(pg.get_by_role("button", name=re.compile("Xóa món")).count() == 1, "390 ⋯ › Sửa: it is the edit screen (Xóa món is there)")
    pg.screenshot(path=str(SHOTS / "390-11-edit-open.png"))
    pg.go_back()
    pg.wait_for_timeout(1200)
    check(pg.url.split("?")[0].endswith("/app") and pg.locator("[role=dialog]").filter(visible=True).count() == 0, f"390 ⋯ › Sửa: one Back returns to Hôm nay with no menu open ({pg.url})")
    ctx.close()


def menu_from_rest(browser):
    """Lead audit 24/10: from a row that rests on ⋯ the menu wanted ~85 px more of finger than the pull can give. A second right swipe of
    40 px opens it now (the vitest cases in lib/__tests__/row-swipe.test.ts cover the widths)."""
    ctx, pg, cdp = new_page(browser)
    row = rows(pg).nth(1)
    eid = row.get_attribute("data-entry-id")
    swipe(pg, cdp, row, 40)
    check(shift(row) > 20 and pg.locator("[role=dialog]").filter(visible=True).count() == 0, f"390 resting on ⋯: a short right swipe rests open, no menu yet ({shift(row):.0f} px)")
    swipe(pg, cdp, row, 40)
    pg.wait_for_timeout(500)
    check(pg.locator("[role=dialog]").filter(visible=True).count() == 1 and abs(shift(row)) < 2, f"390 resting on ⋯: a second 40 px swipe opens the menu and the row closes ({shift(row):.0f} px)")
    pg.screenshot(path=str(SHOTS / "390-12-menu-from-rest.png"))
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
        picked_row(browser)
        rows_at_rest(browser)
        menu_edit(browser)
        menu_from_rest(browser)
        desktop(browser)
    finally:
        browser.close()

print(f"\n{len(problems)} problem(s)")
sys.exit(1 if problems else 0)
