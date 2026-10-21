"""fix/polish-1020 item 2, by hand (a helper: probe:all skips it, because it changes public/sw.js for a few seconds): a new service worker is
waiting; "Có bản mới" comes above the bottom nav and the screen leaves room (nothing covers the last list row), goes after 10 s, and the update is
applied when the app goes to the background (the page reloads), never before.
Review fixes (item 10), same file: with an update waiting, the app going to the background does not reload over a tray of two foods, an open
portion sheet or a typed-in form, and the reload comes once they are gone; a second tab that is told to update does not reload the tab
where a form is being typed in.
Run with: ALIGN_BASE_URL=http://localhost:3101 python3 tests/probes/_polish_update_check.py
"""
import json
import os
import sys

from playwright.sync_api import sync_playwright

import _demo  # noqa: F401
from _sw_update import waiting_update

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3100")
SETTINGS_KEY = "h1t_settings_v1_demo"
NO_INSTALL = {"installPrompt": {"dismissCount": 0, "snoozeUntil": 0, "done": True, "firstSeenIso": "2026-01-01"}}
problems = []


def check(cond, msg):
    print(("[PASS] " if cond else "[FAIL] ") + msg)
    if not cond:
        problems.append(msg)


def hide(pg):
    pg.evaluate("() => { Object.defineProperty(document, 'visibilityState', { get: () => 'hidden', configurable: true }); document.dispatchEvent(new Event('visibilitychange')); }")


def show(pg):
    pg.evaluate("() => { Object.defineProperty(document, 'visibilityState', { get: () => 'visible', configurable: true }); document.dispatchEvent(new Event('visibilitychange')); }")


def kept(pg):
    return pg.evaluate("window.__keep === 1")


def item10(browser):
    # A tray of two foods
    ctx = browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    ctx.add_init_script(f"if (localStorage.getItem('{SETTINGS_KEY}') === null) localStorage.setItem('{SETTINGS_KEY}', {json.dumps(json.dumps(NO_INSTALL))});")
    pg = ctx.new_page()
    pg.goto(BASE + "/app", wait_until="networkidle")
    pg.locator("#mobile-add-fab").wait_for(state="visible", timeout=10000)
    waiting_update(pg)  # reloads the page once to get a controller, then the new worker waits
    pg.locator("#mobile-add-fab").tap()
    search = pg.locator("[data-add-panel] [data-testid=food-search]").first
    search.wait_for(state="visible", timeout=8000)
    pg.wait_for_timeout(800)
    search.fill("trứng")
    toggles = pg.locator("[data-add-panel] [data-testid=tray-toggle]")
    toggles.first.wait_for(state="visible", timeout=8000)
    toggles.nth(0).tap()
    pg.wait_for_timeout(300)
    toggles.nth(1).tap()
    pg.locator("[data-add-panel] [data-testid=tray-add]").first.wait_for(state="visible", timeout=4000)
    pg.evaluate("window.__keep = 1")
    # the update is waiting (the toast comes), the app goes to the background: the tray stays
    pg.wait_for_function("() => navigator.serviceWorker.getRegistration().then((r) => !!(r && r.waiting))", timeout=15000)
    hide(pg)
    pg.wait_for_timeout(3500)
    check(kept(pg), "10: a tray of two foods and an update waiting: the app going to the background does not reload the page")
    check(pg.locator("[data-add-panel] [data-testid=tray-add]").count() == 1, "10: …and the tray is still there")
    ctx.close()


def item10_form(browser):
    ctx = browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    ctx.add_init_script(f"if (localStorage.getItem('{SETTINGS_KEY}') === null) localStorage.setItem('{SETTINGS_KEY}', {json.dumps(json.dumps(NO_INSTALL))});")
    a = ctx.new_page()
    a.goto(BASE + "/foods/new", wait_until="networkidle")
    field = a.locator("input[type=text]:visible").first
    field.wait_for(state="visible", timeout=10000)
    waiting_update(a)
    a.goto(BASE + "/foods/new", wait_until="networkidle")
    a.locator("input[type=text]:visible").first.fill("Món thử")
    a.evaluate("window.__keep = 1")
    b = ctx.new_page()
    b.goto(BASE + "/app", wait_until="networkidle")
    b.wait_for_function("() => navigator.serviceWorker.getRegistration().then((r) => !!(r && r.waiting))", timeout=15000)
    # B is told to update (its Tải lại): the new worker takes over every tab. A has a form with something typed in
    b.locator(".m-toast", has_text="Có bản mới").first.wait_for(state="visible", timeout=15000)
    b.get_by_role("button", name="Tải lại").first.click()
    b.wait_for_timeout(3500)
    check(kept(a), "10: another tab applied the update: this tab, with a form typed in, did not reload")
    hide(a)
    a.wait_for_timeout(3000)
    check(kept(a), "10: …and still not when it goes to the background with the form unsent")
    ctx.close()


def item_back_in_front(browser):
    """Night review: an update the app started in the background never reloads a page that is visible again; it reloads when hidden next."""
    ctx = browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    ctx.add_init_script(f"if (localStorage.getItem('{SETTINGS_KEY}') === null) localStorage.setItem('{SETTINGS_KEY}', {json.dumps(json.dumps(NO_INSTALL))});")
    pg = ctx.new_page()
    pg.goto(BASE + "/app", wait_until="networkidle")
    pg.locator("#mobile-add-fab").wait_for(state="visible", timeout=10000)
    waiting_update(pg)
    pg.wait_for_timeout(5200)  # the toast has been armed (idle), nothing is held
    pg.evaluate("window.__keep = 1")
    # The worker takes over 1.5 s after the app asks (a slow device): the person is back in front by then
    pg.evaluate("() => { const post = ServiceWorker.prototype.postMessage; ServiceWorker.prototype.postMessage = function (m, ...rest) { if (m && m.type === 'SKIP_WAITING') { setTimeout(() => post.call(this, m, ...rest), 1500); return; } return post.call(this, m, ...rest); }; }")
    hide(pg)
    pg.wait_for_timeout(300)  # the app has asked …
    show(pg)  # … and the person is back before the worker takes over
    pg.wait_for_timeout(4000)
    check(kept(pg), "5: an update the app started in the background does not reload a page that is visible again")
    hide(pg)
    pg.wait_for_timeout(3500)
    check(not kept(pg), "5: …and the page reloads the next time it is hidden")
    ctx.close()


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        ctx = browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
        ctx.add_init_script(f"if (localStorage.getItem('{SETTINGS_KEY}') === null) localStorage.setItem('{SETTINGS_KEY}', {json.dumps(json.dumps(NO_INSTALL))});")
        pg = ctx.new_page()
        pg.goto(BASE + "/app", wait_until="networkidle")
        pg.locator('[data-testid="meal-header"]:visible').first.wait_for(state="visible", timeout=10000)
        waiting_update(pg)
        toast = pg.locator(".m-toast", has_text="Có bản mới").first
        toast.wait_for(state="visible", timeout=15000)
        pg.wait_for_timeout(700)
        box = toast.bounding_box()
        nav_top = pg.locator('nav[aria-label="Điều hướng chính"]').locator("visible=true").first.bounding_box()["y"]
        list_bottom = pg.evaluate("() => { const l = document.querySelector('[data-food-scroll]'); return l ? l.getBoundingClientRect().bottom : null }")
        check(box is not None and box["y"] + box["height"] <= nav_top + 1, f"2: the toast sits above the bottom nav (bottom {box and round(box['y'] + box['height'])} <= nav top {round(nav_top)})")
        check(list_bottom is not None and box is not None and list_bottom <= box["y"] + 1, f"2: Hôm nay's list ends above it, so it never covers a row (list bottom {list_bottom and round(list_bottom)}, toast top {box and round(box['y'])})")
        pg.wait_for_timeout(10600)
        check(pg.locator(".m-toast", has_text="Có bản mới").count() == 0, "2: the toast goes after 10 s")
        room = pg.evaluate("getComputedStyle(document.documentElement).getPropertyValue('--update-bar-h').trim()")
        check(room in ("0px", ""), f"2: ...and the room it took is given back ({room!r})")
        loads = []
        pg.on("framenavigated", lambda f: loads.append(1))
        pg.wait_for_timeout(1500)
        check(len(loads) == 0, "2: nothing reloaded the page while it was in front")
        # the app goes to the background: the update is applied and the page reloads
        pg.evaluate("() => { Object.defineProperty(document, 'visibilityState', { get: () => 'hidden', configurable: true }); document.dispatchEvent(new Event('visibilitychange')); }")
        pg.wait_for_timeout(3000)
        check(len(loads) >= 1, "2: the app going to the background applies the update (the page reloaded)")
        ctx.close()
        item10(browser)
        item10_form(browser)
        item_back_in_front(browser)
        browser.close()
    print(f"\n{len(problems)} problem(s)")
    sys.exit(1 if problems else 0)


main()
