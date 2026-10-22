"""cc-70: hold a food, then drag it to another meal, with a finger (touch and pen). The mouse keeps the HTML5 drag.

Production demo build. An iPhone-like context (has_touch, is_mobile) at 390x844; touches are real browser touches sent
through CDP Input.dispatchTouchEvent (touchStart, hold, touchMove in steps, touchEnd).
- Hold 600 ms: the row lifts (scale 1.03, a shadow); the list does not scroll
- Move, then the meal under the finger is highlighted (Thả vào đây để chuyển) and a copy of the row follows the finger; the
  row stays at opacity 0.4
- Release over Bữa phụ: Mì Ý moves from Sáng to Bữa phụ with the Undo toast; Hoàn tác brings it back
- Release over its own meal, or outside any meal: the copy springs back, nothing changes
- A quick swipe still scrolls (the page, from V3 22/10) and lifts nothing; a hold and release without moving is the long press action
  (Chọn nhiều món); a touchCancel in the drag restores everything
- A read-only day (the demo's past) lifts nothing; reduced motion: no lift scale, the move still works
- 1440 with a mouse: the HTML5 drag still moves the food
Screenshots: .screenshots/cc-70-*.png
Run with: ALIGN_BASE_URL=http://localhost:3101 npm run probe -- tests/probes/cc_70_touch_drag.py
"""
# PROBE_COVERS: app/(app)/(tabs)/app/** app/(app)/add/**
import json
import os
import re
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright
import _demo  # noqa: F401
import _seed  # noqa: F401
from _home import MEAL_NAME, meal_text, vis, wait_home

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3101")
SHOTS = Path(__file__).resolve().parent.parent.parent / ".screenshots"
SHOTS.mkdir(exist_ok=True)
SETTINGS_KEY = "h1t_settings_v1_demo"
PHONE = {"width": 390, "height": 844}
SHORT = {"width": 390, "height": 560}
DESKTOP = {"width": 1440, "height": 900}
FOOD = "Mì Ý"
problems = []


def check(cond, msg):
    print(("[PASS] " if cond else "[FAIL] ") + msg)
    if not cond:
        problems.append(msg)


def shot(pg, name):
    pg.screenshot(path=str(SHOTS / f"cc-70-{name}.png"))


def phone(browser, size=PHONE, **kwargs):
    ctx = browser.new_context(viewport=size, has_touch=True, is_mobile=True, device_scale_factor=3, **kwargs)
    # The install pop-up (it opens by itself on a phone) is done, so nothing covers the page
    seed = {"installPrompt": {"dismissCount": 0, "snoozeUntil": 0, "done": True, "firstSeenIso": "2026-01-01"}}
    ctx.add_init_script(f"if (localStorage.getItem('{SETTINGS_KEY}') === null) localStorage.setItem('{SETTINGS_KEY}', {json.dumps(json.dumps(seed))});")
    pg = ctx.new_page()
    return ctx, pg, ctx.new_cdp_session(pg)


class Finger:
    """One touch through the browser's own input path."""

    def __init__(self, cdp):
        self.cdp = cdp

    def _send(self, kind, points):
        self.cdp.send("Input.dispatchTouchEvent", {"type": kind, "touchPoints": points})

    def down(self, x, y):
        self._send("touchStart", [{"x": x, "y": y}])

    def move(self, x, y):
        self._send("touchMove", [{"x": x, "y": y}])

    def up(self):
        self._send("touchEnd", [])

    def cancel(self):
        self._send("touchCancel", [])

    def glide(self, pg, x0, y0, x1, y1, steps=12, pause=16):
        for i in range(1, steps + 1):
            self.move(x0 + (x1 - x0) * i / steps, y0 + (y1 - y0) * i / steps)
            pg.wait_for_timeout(pause)


def go_home(pg, route="/app"):
    pg.goto(BASE + route, wait_until="networkidle")
    wait_home(pg)


def section(pg, slot):
    return pg.locator(f'section[data-meal-slot="{slot}"]:visible').first


def row(pg, name=FOOD):
    return pg.locator("button[data-entry-id]:visible").filter(has_text=name).first


def center(loc):
    b = loc.bounding_box()
    return b["x"] + b["width"] / 2, b["y"] + b["height"] / 2


def slot_of_row(pg, name=FOOD):
    """The meal whose section holds the row, or None."""
    for slot in MEAL_NAME:
        if section(pg, slot).locator("button[data-entry-id]").filter(has_text=name).count():
            return slot
    return None


def ensure_food(pg, slot="breakfast", name=FOOD):
    """Mì Ý in `slot`: the demo day may not have it, so it is added from the add screen."""
    if slot_of_row(pg, name):
        return
    pg.goto(BASE + f"/add?meal={slot}", wait_until="networkidle")
    field = pg.locator('[data-tour="food-search"] input:visible, input[type="search"]:visible').first
    field.fill(name.lower())
    pg.wait_for_timeout(700)
    pg.locator("button[data-food-row]:visible").filter(has_text=name).first.click()
    pg.wait_for_timeout(500)
    for label in ("Thêm vào bữa sáng", "Thêm vào Bữa sáng", "Thêm"):
        btn = pg.get_by_role("button", name=re.compile(label)).last
        if btn.count() and btn.is_visible():
            btn.click()
            break
    pg.wait_for_timeout(800)
    go_home(pg)


def reveal(pg):
    """V3: the page scrolls on a phone and the floating tab bar covers the bottom 104 px; scroll so the Bữa phụ header is above it."""
    pg.evaluate(
        """() => { const h = document.querySelector('section[data-meal-slot="snack"] [data-meal-header]'); if (!h) return;
          const bottom = h.getBoundingClientRect().bottom; const limit = innerHeight - 140;
          if (bottom > limit) window.scrollBy(0, bottom - limit); }"""
    )
    pg.wait_for_timeout(200)


def lift(pg, finger, name=FOOD):
    """Finger down on the row and hold 600 ms. Returns the point."""
    x, y = center(row(pg, name))
    finger.down(x, y)
    # The lift is at 500 ms and eases in over 160 ms
    pg.wait_for_timeout(750)
    return x, y


def state(pg, name=FOOD):
    return row(pg, name).evaluate("el => ({ drag: el.getAttribute('data-touch-drag'), transform: getComputedStyle(el).transform, opacity: getComputedStyle(el).opacity })")


def ghost_count(pg):
    return pg.locator(".m-drag-ghost").count()


def phone_drag(browser):
    ctx, pg, cdp = phone(browser)
    go_home(pg)
    ensure_food(pg)
    reveal(pg)
    print("   Sáng:", meal_text(pg, "breakfast")[:90])
    check(slot_of_row(pg) == "breakfast", f"{FOOD} is in Sáng")
    finger = Finger(cdp)
    snack = section(pg, "snack")
    snack_pill = snack.locator("[data-meal-header]")

    x, y = lift(pg, finger)
    s = state(pg)
    check(s["drag"] == "lifted" and s["transform"].startswith("matrix(1.03"), f"hold 600 ms: the row lifts (scale 1.03, {s['transform'][:24]})")
    shadow = row(pg).evaluate("el => getComputedStyle(el).boxShadow")
    check(shadow != "none", "…with a shadow")
    check(ghost_count(pg) == 0, "…and no copy yet: it has not moved")
    shot(pg, "1-lifted")

    tx, ty = center(snack_pill)
    finger.glide(pg, x, y, tx, ty, steps=14)
    pg.wait_for_timeout(120)
    s = state(pg)
    check(s["drag"] == "dragging" and float(s["opacity"]) == 0.4, f"moving: the row stays at opacity 0.4 ({s['opacity']})")
    check(ghost_count(pg) == 1, "…a floating copy follows the finger")
    g = pg.locator(".m-drag-ghost").bounding_box()
    check(g and abs(g["y"] + g["height"] / 2 - ty) < 24, f"…the copy is under the finger ({g and round(g['y'] + g['height'] / 2)} vs {round(ty)})")
    check("Thả vào đây để chuyển" in snack.inner_text(), "…the meal under the finger shows Thả vào đây để chuyển")
    ring = snack.evaluate("el => el.className")
    check("ring-cobalt" in ring or "bg-cobalt" in ring, "…and has the drop highlight")
    shot(pg, "2-dragging")
    finger.up()
    pg.wait_for_timeout(700)
    check(slot_of_row(pg) == "snack", f"released over Bữa phụ: {FOOD} moved to Bữa phụ ({slot_of_row(pg)})")
    check(ghost_count(pg) == 0 and "Thả vào đây để chuyển" not in section(pg, "snack").inner_text(), "…the copy and the highlight are gone")
    toast = pg.get_by_text(re.compile("Đã chuyển 1 món sang Bữa phụ"))
    check(toast.count() >= 1, "…the Undo toast: Đã chuyển 1 món sang Bữa phụ")
    shot(pg, "3-dropped")
    pg.get_by_role("button", name="Hoàn tác").first.click()
    pg.wait_for_timeout(600)
    check(slot_of_row(pg) == "breakfast", "Hoàn tác brings it back to Sáng")
    ctx.close()


def autoscroll_page(browser):
    """V3: a food held near the bottom edge scrolls the page (the list card does not scroll itself on a phone)."""
    ctx, pg, cdp = phone(browser)
    go_home(pg)
    ensure_food(pg)
    finger = Finger(cdp)
    over = pg.evaluate("document.documentElement.scrollHeight - innerHeight")
    x, y = lift(pg, finger)
    finger.glide(pg, x, y, x, 844 - 88 - 6, steps=8)
    pg.wait_for_timeout(700)
    after = pg.evaluate("window.scrollY")
    check(over <= 0 or after > 20, f"held near the bottom edge: the page scrolls ({after} px of {over})")
    finger.up()
    pg.wait_for_timeout(500)
    check(pg.locator("[data-touch-drag]").count() == 0 and ghost_count(pg) == 0, "…and letting go leaves nothing behind")
    ctx.close()


def springs_back(browser):
    ctx, pg, cdp = phone(browser)
    go_home(pg)
    ensure_food(pg)
    reveal(pg)
    finger = Finger(cdp)
    x, y = lift(pg, finger)
    # Over its own meal: down 30 px and back
    finger.glide(pg, x, y, x, y + 30, steps=5)
    finger.glide(pg, x, y + 30, x, y + 4, steps=5)
    check(ghost_count(pg) == 1, "own meal: the copy is out")
    finger.up()
    pg.wait_for_timeout(500)
    check(ghost_count(pg) == 0 and slot_of_row(pg) == "breakfast" and state(pg)["drag"] is None, "own meal: the copy springs back, nothing changed")
    check(pg.get_by_text(re.compile("Đã chuyển")).count() == 0, "own meal: no toast")
    # Outside any meal: off to the right of the list... the list fills the width, so release over the page header
    x, y = lift(pg, finger)
    finger.glide(pg, x, y, x, 60, steps=10)
    finger.up()
    pg.wait_for_timeout(500)
    check(ghost_count(pg) == 0 and slot_of_row(pg) == "breakfast", "outside the list: springs back, nothing changed")
    ctx.close()


def swipe_and_hold(browser):
    ctx, pg, cdp = phone(browser, SHORT)
    go_home(pg)
    ensure_food(pg)
    finger = Finger(cdp)
    # V3 22/10: on a phone the page scrolls (the list card does not scroll itself)
    info = pg.evaluate("({ top: window.scrollY, over: document.documentElement.scrollHeight - innerHeight })")
    check(info["over"] > 40, f"the page overflows at 390x560 ({info['over']} px), so it can scroll")
    x, y = 120, 450
    # A quick swipe up inside the list: 150 ms in all, well under the hold
    finger.down(x, y)
    finger.glide(pg, x, y, x, y - 160, steps=10, pause=12)
    finger.up()
    pg.wait_for_timeout(700)
    after = pg.evaluate("window.scrollY")
    check(after > info["top"] + 20, f"a quick swipe still scrolls the page ({info['top']} -> {after})")
    check(pg.locator("[data-touch-drag]").count() == 0 and ghost_count(pg) == 0, "…and lifts nothing")
    go_home(pg)
    ensure_food(pg)
    # Hold and let go without moving: the long press action, Chọn nhiều món
    pg.evaluate("window.scrollTo(0, 200)")  # V3: the row is above the floating tab bar (390x560 is short)
    pg.wait_for_timeout(200)
    lift(pg, finger)
    check(state(pg)["drag"] == "lifted", "hold: lifted")
    finger.up()
    pg.wait_for_timeout(700)
    check(pg.locator('button[role="checkbox"]:visible').count() > 0, "hold, release without moving: the long press action (Chọn nhiều món) opens")
    check(pg.locator("[data-touch-drag]").count() == 0, "…and the row is down again")
    ctx.close()


def cancelled(browser):
    ctx, pg, cdp = phone(browser)
    go_home(pg)
    ensure_food(pg)
    reveal(pg)
    finger = Finger(cdp)
    x, y = lift(pg, finger)
    tx, ty = center(section(pg, "snack").locator("[data-meal-header]"))
    finger.glide(pg, x, y, tx, ty, steps=10)
    check(ghost_count(pg) == 1, "cancel: dragging")
    finger.cancel()
    pg.wait_for_timeout(400)
    check(ghost_count(pg) == 0 and slot_of_row(pg) == "breakfast" and pg.locator("[data-touch-drag]").count() == 0, "touchCancel in the drag: everything restored, nothing moved")
    check("Thả vào đây để chuyển" not in section(pg, "snack").inner_text() and pg.get_by_text(re.compile("Đã chuyển")).count() == 0, "…no highlight, no toast")
    ctx.close()


def days(browser):
    # The demo's past is sample data, read-only, even yesterday (pastDaysFor); yesterday being draggable in a live account is
    # in lib/__tests__/touch-drag.test.ts (canTouchDrag with isEditableDay)
    ctx, pg, cdp = phone(browser)
    go_home(pg)
    finger = Finger(cdp)
    for label in ("yesterday", "the day before yesterday"):
        pg.get_by_role("button", name="Ngày trước").first.click()
        pg.wait_for_timeout(900)
        wait_home(pg)
        n = row_count(pg)
        check(n > 0 and pg.locator('a[aria-label^="Thêm vào"]:visible').count() == 0, f"{label}: {n} foods, read-only in the demo (no + Thêm)")
        x, y = center(pg.locator("button[data-entry-id]:visible").first)
        finger.down(x, y)
        pg.wait_for_timeout(750)
        check(pg.locator("[data-touch-drag]").count() == 0, f"{label} (read-only): nothing lifts")
        finger.up()
        pg.wait_for_timeout(300)
    ctx.close()


def row_count(pg):
    return pg.locator("button[data-entry-id]:visible").count()


def reduced(browser):
    ctx, pg, cdp = phone(browser, reduced_motion="reduce")
    go_home(pg)
    ensure_food(pg)
    reveal(pg)
    finger = Finger(cdp)
    x, y = lift(pg, finger)
    s = state(pg)
    check(s["drag"] == "lifted" and s["transform"] in ("none", "matrix(1, 0, 0, 1, 0, 0)"), f"reduced motion: no lift scale ({s['transform']})")
    tx, ty = center(section(pg, "snack").locator("[data-meal-header]"))
    finger.glide(pg, x, y, tx, ty, steps=10)
    check("Thả vào đây để chuyển" in section(pg, "snack").inner_text(), "reduced motion: the highlight stays")
    finger.up()
    pg.wait_for_timeout(600)
    check(slot_of_row(pg) == "snack", "reduced motion: the move still works")
    pg.get_by_role("button", name="Hoàn tác").first.click()
    pg.wait_for_timeout(400)
    ctx.close()


def desktop_mouse(browser):
    ctx = browser.new_context(viewport=DESKTOP)
    pg = ctx.new_page()
    go_home(pg)
    ensure_food(pg)
    check(slot_of_row(pg) == "breakfast", "1440: Mì Ý is in Sáng")
    row(pg).drag_to(section(pg, "snack").locator("[data-meal-header]"))
    pg.wait_for_timeout(700)
    check(slot_of_row(pg) == "snack", f"1440 mouse: the HTML5 drag still moves the food ({slot_of_row(pg)})")
    check(pg.locator("[data-touch-drag]").count() == 0 and ghost_count(pg) == 0, "1440 mouse: no touch lift, no copy")
    ctx.close()


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for part in (phone_drag, autoscroll_page, springs_back, swipe_and_hold, cancelled, days, reduced, desktop_mouse):
            print(f"\n=== {part.__name__} ===")
            try:
                part(browser)
            except Exception as e:  # a crash is a failure, the rest still runs
                check(False, f"{part.__name__} crashed: {e}")
        browser.close()
    print(f"\n{len(problems)} problem(s)")
    for m in problems:
        print(" - " + m)
    sys.exit(1 if problems else 0)


if __name__ == "__main__":
    main()
