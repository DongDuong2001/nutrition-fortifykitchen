"""cc-51 Part C: vibration on the running app (demo build, 390 x 844). navigator.vibrate is wrapped to record each call.

- Android (vibrate exists): nothing on a page load, a tab switch or a scroll; long press 20, Xóa [10,40,10],
  Hoàn tác 10; Cài đặt shows "Rung khi chạm"; switched off, a delete does not vibrate
- Reduced motion with the switch never touched: a delete does not vibrate
- iOS (no navigator.vibrate): no switch in Cài đặt, and a delete works without an error
Run with: ALIGN_BASE_URL=http://localhost:3101 npm run probe -- tests/probes/cc_51_haptics.py
"""
import os
import sys

from playwright.sync_api import sync_playwright
import _demo  # noqa: F401  (demo mode, tour and tips off)

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3101")
PHONE = {"width": 390, "height": 844}
RECORD = "window.__vib = []; const v = navigator.vibrate ? navigator.vibrate.bind(navigator) : null; if (v) navigator.vibrate = (p) => { window.__vib.push(p); return true; };"
NO_VIBRATE = "delete Navigator.prototype.vibrate; delete navigator.vibrate; window.__vib = [];"
problems = []


def check(cond, msg):
    print(("[PASS] " if cond else "[FAIL] ") + msg)
    if not cond:
        problems.append(msg)


def page(browser, script, **kwargs):
    ctx = browser.new_context(viewport=PHONE, **kwargs)
    ctx.add_init_script(script)
    pg = ctx.new_page()
    errors = []
    pg.on("pageerror", lambda e: errors.append(str(e)))
    return ctx, pg, errors


def vib(pg):
    return pg.evaluate("window.__vib")


def today(pg):
    pg.goto(BASE + "/app", wait_until="networkidle")
    pg.locator('[data-align-group="home-page"]').first.wait_for(state="visible")
    pg.wait_for_timeout(700)


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

    ctx, pg, errors = page(browser, RECORD)
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

    ctx, pg, errors = page(browser, RECORD, reduced_motion="reduce")
    today(pg)
    long_press_first(pg)
    delete_selected(pg)
    check(vib(pg) == [], f"reduced motion, switch never touched: no vibration ({vib(pg)})")
    ctx.close()

    ctx, pg, errors = page(browser, NO_VIBRATE)
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

    browser.close()

print(f"\n{len(problems)} problem(s)")
sys.exit(1 if problems else 0)
