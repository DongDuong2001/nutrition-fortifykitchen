"""cc-51 Part C: vibration on the running app (demo build, 390 x 844). navigator.vibrate is wrapped to record each call.

- Android (a touch phone, vibrate exists): nothing on a page load, a tab switch or a scroll; long press 20,
  Xóa [10,40,10], Hoàn tác 10; Cài đặt shows "Rung khi chạm" and its tip; switched off, a delete does not vibrate
- Reduced motion with the switch never touched: a delete does not vibrate
- iOS (no navigator.vibrate): no switch in Cài đặt, and a delete works without an error
- Review 07:00: desktop Chrome (vibrate exists, but a mouse, 1280 x 800): no switch and no tip in Cài đặt
Run with: ALIGN_BASE_URL=http://localhost:3101 npm run probe -- tests/probes/cc_51_haptics.py
"""
# PROBE_COVERS: app/(app)/(tabs)/app/** app/(app)/(tabs)/explore/** app/(app)/(tabs)/settings/**
import json
import os
import sys

from playwright.sync_api import sync_playwright
import _demo  # noqa: F401  (demo mode, tour and tips off)

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3101")
PHONE = {"width": 390, "height": 844}
DESKTOP = {"width": 1280, "height": 800}
# A touch phone: (pointer: coarse) matches, as on Android
TOUCH = {"has_touch": True, "is_mobile": True}
RECORD = "window.__vib = []; const v = navigator.vibrate ? navigator.vibrate.bind(navigator) : null; if (v) navigator.vibrate = (p) => { window.__vib.push(p); return true; };"
NO_VIBRATE = "delete Navigator.prototype.vibrate; delete navigator.vibrate; window.__vib = [];"
# Tips on, every tip but Rung khi chạm seen, so Cài đặt shows that one when the phone can vibrate
TIPS = ["unsaved", "home-logged", "meal-add", "home-share", "pull-refresh", "nutrient-sources", "meal-focus", "hero-macro", "hero-hold", "past-day", "multi-select", "add-tray",
        "add-shortlists", "food-detail", "compare", "food-new", "training", "micros", "trends-micros", "explore", "overview", "leaderboard"]
TIPS_ON = (
    "try { localStorage.removeItem('h1t_onboarding_off'); if (localStorage.getItem('h1t_settings_v1_demo') === null) "
    "localStorage.setItem('h1t_settings_v1_demo', %s); } catch (e) {}" % json.dumps(json.dumps({"onboarding": {"tourDone": True, "seen": TIPS, "used": ["share-day"]}}))
)
problems = []


def check(cond, msg):
    print(("[PASS] " if cond else "[FAIL] ") + msg)
    if not cond:
        problems.append(msg)


def page(browser, script, viewport=PHONE, tips=False, **kwargs):
    ctx = browser.new_context(viewport=viewport, **kwargs)
    ctx.add_init_script(script)
    if tips:
        ctx.add_init_script(TIPS_ON)
    pg = ctx.new_page()
    errors = []
    pg.on("pageerror", lambda e: errors.append(str(e)))
    return ctx, pg, errors


def settings(pg):
    pg.goto(BASE + "/settings", wait_until="networkidle")
    pg.wait_for_timeout(900)


def haptics_tip(pg):
    card = pg.locator("[data-onboarding-card]")
    return card.count() == 1 and "Rung khi chạm" in card.inner_text()


def coarse(pg):
    return pg.evaluate("matchMedia('(pointer: coarse)').matches")


def vib(pg):
    return pg.evaluate("window.__vib")


def today(pg):
    pg.goto(BASE + "/app", wait_until="networkidle")
    pg.locator('[data-align-group="home-page"]').first.wait_for(state="visible")
    pg.wait_for_timeout(700)
    # A touch phone gets the install sheet on its own the first time; close it (Esc does not vibrate)
    if pg.locator('[role="dialog"][aria-labelledby="install-sheet-title"]').count() > 0:
        pg.keyboard.press("Escape")
        pg.wait_for_timeout(400)


def long_press_first(pg):
    row = pg.locator("button[aria-pressed][data-entry-id]").first
    box = row.bounding_box()
    pg.mouse.move(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2)
    pg.mouse.down()
    pg.wait_for_timeout(650)
    pg.mouse.up()
    pg.wait_for_timeout(300)


def delete_selected(pg):
    pg.locator('[data-tour="select-bar"] button:has-text("Xóa")').first.click()
    pg.wait_for_timeout(300)


with sync_playwright() as p:
    browser = p.chromium.launch()

    ctx, pg, errors = page(browser, RECORD, **TOUCH)
    today(pg)
    pg.mouse.wheel(0, 400)
    pg.wait_for_timeout(300)
    pg.goto(BASE + "/explore", wait_until="networkidle")
    pg.wait_for_timeout(400)
    check(vib(pg) == [], f"Android: nothing on a page load, a scroll or a tab switch ({vib(pg)})")
    today(pg)
    long_press_first(pg)
    check(vib(pg) == [20], f"long press: 20 ({vib(pg)})")
    delete_selected(pg)
    check(vib(pg)[-1:] == [[10, 40, 10]], f"Xóa: [10, 40, 10] ({vib(pg)})")
    pg.get_by_role("button", name="Hoàn tác").first.click()
    pg.wait_for_timeout(300)
    check(vib(pg)[-1:] == [10], f"Hoàn tác: 10 ({vib(pg)})")
    pg.goto(BASE + "/settings", wait_until="networkidle")
    pg.wait_for_timeout(600)
    switch = pg.get_by_role("switch", name="Rung khi chạm")
    check(switch.count() == 1 and switch.get_attribute("aria-checked") == "true", "Cài đặt: Rung khi chạm, on by default")
    switch.click()
    pg.wait_for_timeout(200)
    check(switch.get_attribute("aria-checked") == "false", "…switched off")
    today(pg)
    before = len(vib(pg))
    long_press_first(pg)
    delete_selected(pg)
    check(len(vib(pg)) == before, f"switched off: long press and Xóa do not vibrate ({vib(pg)[before:]})")
    check(errors == [], f"no page errors ({errors})")
    ctx.close()

    ctx, pg, errors = page(browser, RECORD, reduced_motion="reduce", **TOUCH)
    today(pg)
    long_press_first(pg)
    delete_selected(pg)
    check(vib(pg) == [], f"reduced motion, switch never touched: no vibration ({vib(pg)})")
    ctx.close()

    ctx, pg, errors = page(browser, NO_VIBRATE, **TOUCH)
    pg.goto(BASE + "/settings", wait_until="networkidle")
    pg.wait_for_timeout(600)
    check(pg.get_by_role("switch", name="Rung khi chạm").count() == 0, "iOS (no vibrate): no Rung khi chạm switch")
    today(pg)
    rows = pg.locator("button[aria-pressed][data-entry-id]").count()
    long_press_first(pg)
    delete_selected(pg)
    pg.wait_for_timeout(300)
    check(pg.locator("button[aria-pressed][data-entry-id]").count() == rows - 1 and errors == [], f"iOS: Xóa works without an error ({errors})")
    ctx.close()

    # The tip of Rung khi chạm: on an Android phone, never on desktop Chrome (review 07:00)
    ctx, pg, errors = page(browser, RECORD, tips=True, **TOUCH)
    settings(pg)
    check(coarse(pg) and haptics_tip(pg), "Android: Cài đặt shows the Rung khi chạm tip")
    ctx.close()

    ctx, pg, errors = page(browser, RECORD, viewport=DESKTOP, tips=True)
    settings(pg)
    has_vibrate = pg.evaluate("typeof navigator.vibrate === 'function'")
    check(has_vibrate and not coarse(pg), "desktop Chrome: navigator.vibrate exists, the pointer is a mouse")
    check(pg.get_by_role("switch", name="Rung khi chạm").count() == 0, "desktop Chrome: no Rung khi chạm switch")
    check(not haptics_tip(pg), "desktop Chrome: no Rung khi chạm tip")
    check(errors == [], f"desktop Chrome: no page errors ({errors})")
    ctx.close()

    browser.close()

print(f"\n{len(problems)} problem(s)")
sys.exit(1 if problems else 0)
