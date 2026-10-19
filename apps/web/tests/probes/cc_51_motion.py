"""cc-51 Part B: motion on the running app (demo build, 390 x 844).

- Sheet (Chia sẻ ngày này): slides in (cc-55: an m-sheet transition on data-state) over a fading scrim (m-scrim); Back closes it without leaving or reloading
  Hôm nay; Esc closes it and takes its history entry back; dragging the grabber down closes it; reduced motion fades
- Rows: a row deleted (Chọn nhiều món › Xóa) fades and collapses (data-exiting) and is gone after 200 ms; Hoàn tác
  brings it back with m-row-enter; nothing animates on the first draw
- Day: Ngày trước slides the day in from the left (m-day-earlier), Ngày sau from the right (m-day-later)
- Pull to refresh: a touch pull from the top of the list shows the indicator and counts as used (onboarding flags)
Run with: ALIGN_BASE_URL=http://localhost:3101 npm run probe -- tests/probes/cc_51_motion.py
"""
# PROBE_COVERS: app/(app)/(tabs)/app/** app/(app)/(tabs)/explore/**
import json
import os
import re
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright
import _demo  # noqa: F401  (demo mode, tour and tips off)

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3101")
SHOTS = Path(__file__).resolve().parent.parent.parent / ".screenshots"
PHONE = {"width": 390, "height": 844}
problems = []


def check(cond, msg):
    print(("[PASS] " if cond else "[FAIL] ") + msg)
    if not cond:
        problems.append(msg)


def open_today(pg):
    pg.goto(BASE + "/app", wait_until="networkidle")
    pg.locator('[data-align-group="home-page"]').first.wait_for(state="visible")
    pg.wait_for_timeout(600)


def anim(locator):
    return locator.evaluate("el => getComputedStyle(el).animationName")


def sheet_part(browser):
    ctx = browser.new_context(viewport=PHONE)
    pg = ctx.new_page()
    open_today(pg)
    check(pg.locator(".m-row-enter").count() == 0, "rows: nothing rises in on the first draw")
    pg.evaluate("window.__notReloaded = true")
    share = pg.get_by_role("button", name="Chia sẻ ngày này").first
    share.click()
    dialog = pg.locator('[role="dialog"]').first
    dialog.wait_for(state="visible")
    slide = dialog.evaluate("el => [el.dataset.state, el.classList.contains('m-sheet'), getComputedStyle(el).transitionProperty].join(' ')")
    check(slide == "open true transform", f"sheet slides in ({slide})")
    check("m-scrim" in (pg.locator(".bg-scrim").first.get_attribute("class") or ""), "the scrim fades in")
    pg.wait_for_timeout(400)
    pg.go_back()
    pg.wait_for_timeout(500)
    check(pg.locator('[role="dialog"]').count() == 0, "Back closes the sheet")
    check(re.search(r"/app(\?|$)", pg.url) is not None and pg.evaluate("window.__notReloaded === true"), f"…and stays on Hôm nay without a reload ({pg.url})")

    share.click()
    pg.locator('[role="dialog"]').first.wait_for(state="visible")
    pg.wait_for_timeout(300)
    pg.keyboard.press("Escape")
    pg.wait_for_timeout(500)
    check(pg.locator('[role="dialog"]').count() == 0, "Esc closes the sheet")
    check(pg.evaluate("!(history.state && history.state.h1tSheet)"), "…and its history entry is taken back")

    # Came from Khám phá: after a sheet closed with Esc, one Back goes to Khám phá (no stale sheet entry in between)
    pg.goto(BASE + "/explore", wait_until="networkidle")
    pg.locator('nav a[href="/app"]:visible').first.click()
    pg.wait_for_url(BASE + "/app")
    pg.wait_for_timeout(600)
    pg.get_by_role("button", name="Chia sẻ ngày này").first.click()
    pg.locator('[role="dialog"]').first.wait_for(state="visible")
    pg.wait_for_timeout(300)
    pg.keyboard.press("Escape")
    pg.wait_for_timeout(500)
    pg.go_back()
    pg.wait_for_timeout(600)
    check(pg.url.split("?")[0].endswith("/explore"), f"…so one Back after it goes to the screen before ({pg.url[len(BASE):]})")

    open_today(pg)
    pg.get_by_role("button", name="Chia sẻ ngày này").first.click()
    pg.locator('[role="dialog"]').first.wait_for(state="visible")
    pg.wait_for_timeout(400)
    handle = pg.locator("[data-sheet-handle]").first.bounding_box()
    pg.mouse.move(handle["x"] + handle["width"] / 2, handle["y"] + handle["height"] / 2)
    pg.mouse.down()
    for step in range(1, 11):
        pg.mouse.move(handle["x"] + handle["width"] / 2, handle["y"] + handle["height"] / 2 + step * 40)
        pg.wait_for_timeout(16)
    pg.mouse.up()
    pg.wait_for_timeout(500)
    check(pg.locator('[role="dialog"]').count() == 0, "dragging the grabber down 400 px closes the sheet")

    pg.get_by_role("button", name="Chia sẻ ngày này").first.click()
    pg.locator('[role="dialog"]').first.wait_for(state="visible")
    pg.wait_for_timeout(400)
    handle = pg.locator("[data-sheet-handle]").first.bounding_box()
    pg.mouse.move(handle["x"] + handle["width"] / 2, handle["y"] + 10)
    pg.mouse.down()
    pg.mouse.move(handle["x"] + handle["width"] / 2, handle["y"] + 40, steps=8)
    pg.wait_for_timeout(200)
    pg.mouse.up()
    pg.wait_for_timeout(400)
    check(pg.locator('[role="dialog"]').count() == 1, "a short, slow drag lets the sheet go back up")
    pg.keyboard.press("Escape")
    ctx.close()

    ctx = browser.new_context(viewport=PHONE, reduced_motion="reduce")
    pg = ctx.new_page()
    open_today(pg)
    pg.get_by_role("button", name="Chia sẻ ngày này").first.click()
    dialog = pg.locator('[role="dialog"]').first
    dialog.wait_for(state="visible")
    fade = dialog.evaluate("el => getComputedStyle(el).transitionProperty")
    check(fade == "opacity", f"reduced motion: the sheet fades, no slide ({fade})")
    ctx.close()


def rows_and_days(browser):
    ctx = browser.new_context(viewport=PHONE)
    pg = ctx.new_page()
    open_today(pg)
    rows = pg.locator("section[aria-label] button[aria-pressed][data-entry-id]")
    before = rows.count()
    first = rows.first
    name = first.get_attribute("aria-label").split(",")[0]
    box = first.bounding_box()
    pg.mouse.move(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2)
    pg.mouse.down()
    pg.wait_for_timeout(650)
    pg.mouse.up()
    pg.wait_for_timeout(300)
    pg.locator('[data-tour="select-bar"] button:has-text("Xóa")').first.click()
    pg.wait_for_timeout(60)
    check(pg.locator("[data-exiting]").count() == 1, "the deleted row stays for its exit animation (data-exiting)")
    pg.wait_for_timeout(500)
    check(pg.locator("[data-exiting]").count() == 0 and rows.count() == before - 1, f"…and is gone after it ({rows.count()} of {before})")
    pg.get_by_role("button", name="Hoàn tác").first.click()
    pg.wait_for_timeout(100)
    back = pg.locator(f'button[data-entry-id][aria-label^="{name},"]').first
    check(back.count() == 1 and "m-row-enter" in (back.get_attribute("class") or ""), f"Hoàn tác: {name} comes back with m-row-enter")

    pg.get_by_role("button", name="Ngày trước").first.click()
    pg.wait_for_timeout(150)
    page_box = pg.locator('[data-align-group="home-page"].flex-1').first
    check("m-day-earlier" in (page_box.get_attribute("class") or ""), "Ngày trước: the day slides in from the left")
    pg.wait_for_timeout(500)
    pg.get_by_role("button", name="Ngày sau").first.click()
    pg.wait_for_timeout(150)
    check("m-day-later" in (pg.locator('[data-align-group="home-page"].flex-1').first.get_attribute("class") or ""), "Ngày sau: the day slides in from the right")
    ctx.close()


def pull(browser):
    ctx = browser.new_context(viewport=PHONE, has_touch=True, is_mobile=True)
    pg = ctx.new_page()
    open_today(pg)
    # A phone gets the install sheet on its own; close it first
    if pg.locator('[role="dialog"]').count() > 0:
        pg.keyboard.press("Escape")
        pg.wait_for_timeout(500)
    list_box = pg.locator('[data-align-group="home-page"] .overscroll-y-contain').first.bounding_box()
    x, y = list_box["x"] + 40, list_box["y"] + 20
    cdp = ctx.new_cdp_session(pg)
    cdp.send("Input.dispatchTouchEvent", {"type": "touchStart", "touchPoints": [{"x": x, "y": y}]})
    for step in range(1, 13):
        cdp.send("Input.dispatchTouchEvent", {"type": "touchMove", "touchPoints": [{"x": x, "y": y + step * 20}]})
        pg.wait_for_timeout(16)
    shown = pg.locator(".m-pull").first.evaluate("el => getComputedStyle(el).opacity") == "1"
    check(shown, "pull: the indicator follows the finger")
    cdp.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []})
    pg.wait_for_timeout(300)
    used = pg.evaluate("() => Object.entries(localStorage).filter(([k]) => k.startsWith('h1t_settings')).map(([, v]) => v).join(' ')")
    check("pull-refresh" in used, "pull: letting go past 64 px refreshes (counted as used for its tip)")
    pg.screenshot(path=str(SHOTS / "cc-51-after-pull-390.png"))
    ctx.close()


with sync_playwright() as p:
    browser = p.chromium.launch()
    for part in (sheet_part, rows_and_days, pull):
        print(f"\n=== {part.__name__} ===")
        try:
            part(browser)
        except Exception as e:
            check(False, f"{part.__name__} crashed: {e}")
    browser.close()

print(f"\n{len(problems)} problem(s)")
sys.exit(1 if problems else 0)
