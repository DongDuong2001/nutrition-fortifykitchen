"""fix/food-detail-scroll (overnight 22→23/10, job 10): on a desktop the mouse wheel over a food's micro list scrolls it.

The bug (A2, Hao: "tap a food, it shows the nutrients and the portion on the left and right"): in the desktop + dialog the picked
food's portion and nutrients sit in the right pane. The dialog is what scrolls; the pane had overscroll-contain, so in Chromium a
wheel over the nutrients moved nothing and the last micros stayed below the dialog's edge (WebKit chained it). Checked first below:
1280×720 (and 1440×900), a long food (cá hồi), the wheel over the pane brings its last micro into view. Fails on main in Chromium.

At 1280×720 and 1440×900, in Chromium and in WebKit (Safari), on a long food (many micros): the pointer over the micro list
(section[aria-labelledby=food-micros]), a wheel of 600 px moves the page (or whatever scrolls the list) by about that much, and so
do Page Down and Space with the focus on the page. Nothing over the list calls preventDefault on the wheel.
Run with: ALIGN_BASE_URL=http://localhost:3101 npm run probe -- tests/probes/food_detail_wheel.py
"""
# PROBE_COVERS: app/(app)/foods/** components/foods/food-micros.tsx components/ui/app-shell.tsx components/add/add-screen.tsx components/ui/portion-panel.tsx
import json
import os
import sys

import _demo  # noqa: F401
from playwright.sync_api import sync_playwright

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3101")
FOOD = "/foods/food-uc-ga"
SETTINGS = json.dumps({"installPrompt": {"dismissCount": 0, "snoozeUntil": 0, "done": True, "firstSeenIso": "2026-01-01"}})
# Every scroll offset on the page: the window's and any element's
OFFSETS = "() => [scrollY, ...[...document.querySelectorAll('*')].map((e) => e.scrollTop)].reduce((a, b) => a + b, 0)"
WATCH = """() => { window.__prevented = 0; addEventListener('wheel', (e) => setTimeout(() => { if (e.defaultPrevented) window.__prevented++; }), { passive: true }); }"""
problems = []


def check(cond, msg):
    print(("[PASS] " if cond else "[FAIL] ") + msg)
    if not cond:
        problems.append(msg)


def run(browser, engine, width, height):
    tag = f"{engine} {width}×{height}"
    ctx = browser.new_context(viewport={"width": width, "height": height})
    ctx.add_init_script(f"try {{ localStorage.setItem('h1t_settings_v1_demo', {json.dumps(SETTINGS)}); }} catch (e) {{}}")
    pg = ctx.new_page()
    pg.goto(BASE + FOOD, wait_until="networkidle")
    pg.wait_for_timeout(1200)
    micros = pg.locator("section[aria-labelledby=food-micros]").first
    check(micros.count() == 1, f"{tag}: the food page has its micro list")
    pg.evaluate(WATCH)
    rows = micros.locator("li")
    row = rows.nth(min(2, rows.count() - 1))
    # The list near the top of the window, with room left to scroll below it
    place = "(el) => { const y = el.getBoundingClientRect().top + scrollY - 120; scrollTo(0, Math.max(0, Math.min(y, document.documentElement.scrollHeight - innerHeight - 400))); }"
    row.evaluate(place)
    pg.wait_for_timeout(300)
    box = row.bounding_box()
    check(box is not None and 0 < box["y"] < height, f"{tag}: a micro row is on screen ({box})")
    before = pg.evaluate(OFFSETS)
    pg.mouse.move(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2)
    pg.mouse.wheel(0, 300)
    pg.wait_for_timeout(700)
    moved = pg.evaluate(OFFSETS) - before
    check(moved > 150, f"{tag}: a wheel over the micro list scrolls ({moved:.0f})")
    check(pg.evaluate("window.__prevented") == 0, f"{tag}: no wheel over the list is prevented")
    row.evaluate(place)
    pg.wait_for_timeout(300)
    before = pg.evaluate(OFFSETS)
    pg.keyboard.press("PageDown")
    pg.wait_for_timeout(700)
    check(pg.evaluate(OFFSETS) - before > 100, f"{tag}: Page Down scrolls too")
    row.evaluate(place)
    pg.wait_for_timeout(300)
    before = pg.evaluate(OFFSETS)
    pg.keyboard.press("Space")
    pg.wait_for_timeout(700)
    check(pg.evaluate(OFFSETS) - before > 100, f"{tag}: Space scrolls too")
    ctx.close()


PANE = """() => {
  const dlg = document.querySelector('[role=dialog][data-sheet-route]');
  // main before the fix has no marker: the pane is the two-pane row's second child
  const pane = dlg && (dlg.querySelector('[data-portion-pane]') || dlg.querySelector('div.flex.gap-6.items-start > :nth-child(2)'));
  if (!pane) return null;
  // the last row of the "Vi chất trong …" card
  const label = [...pane.querySelectorAll('div')].find((d) => (d.textContent || '').startsWith('Vi chất trong') && d.children.length === 0);
  const last = label ? label.parentElement.lastElementChild : pane.lastElementChild;
  const d = dlg.getBoundingClientRect(), l = last.getBoundingClientRect();
  return { dlgTop: dlg.scrollTop, paneTop: pane.scrollTop, lastVisible: l.top >= Math.max(d.top, 0) - 1 && l.bottom <= Math.min(d.bottom, innerHeight) + 1,
           pane: (({ left, top, width }) => ({ left, top, width }))(pane.getBoundingClientRect()) };
}"""


def add_dialog(browser, engine, width, height):
    tag = f"{engine} + dialog {width}x{height}"
    ctx = browser.new_context(viewport={"width": width, "height": height})
    ctx.add_init_script(f"try {{ localStorage.setItem('h1t_settings_v1_demo', {json.dumps(SETTINGS)}); }} catch (e) {{}}")
    pg = ctx.new_page()
    pg.goto(BASE + "/app", wait_until="networkidle")
    pg.locator("#desktop-add-btn >> visible=true").first.click()
    pg.wait_for_selector("[role=dialog][data-sheet-route]")
    pg.wait_for_timeout(800)
    pg.locator("[role=dialog] input").first.fill("cá hồi")
    pg.wait_for_timeout(800)
    pg.locator("[role=dialog] [data-food-row]").first.click()
    pg.wait_for_timeout(600)
    s0 = pg.evaluate(PANE)
    check(s0 is not None, f"{tag}: the picked food's portion pane is there")
    if s0:
        check(not s0["lastVisible"], f"{tag}: its last micro starts below the dialog's edge (else nothing to test)")
        pg.mouse.move(s0["pane"]["left"] + s0["pane"]["width"] / 2, min(height - 80, s0["pane"]["top"] + 300))
        for _ in range(10):
            pg.mouse.wheel(0, 300)
            pg.wait_for_timeout(120)
        pg.wait_for_timeout(300)
        s1 = pg.evaluate(PANE)
        check(s1["dlgTop"] + s1["paneTop"] > 0 and s1["lastVisible"], f"{tag}: the wheel over the nutrients scrolls them into view ({s0['dlgTop']} -> {s1['dlgTop']}, last visible {s1['lastVisible']})")
    ctx.close()


with sync_playwright() as p:
    for engine in ("chromium", "webkit"):
        browser = getattr(p, engine).launch()
        try:
            for w, h in ((1280, 720), (1440, 900)):
                add_dialog(browser, engine, w, h)
                run(browser, engine, w, h)
        finally:
            browser.close()

print(f"\n{len(problems)} problem(s)")
sys.exit(1 if problems else 0)
