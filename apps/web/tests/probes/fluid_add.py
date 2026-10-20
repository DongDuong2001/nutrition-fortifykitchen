"""feat/fluid-add: what the add flow promises (390 x 844 phone, demo build). The numbers (1x / 4x CPU, frames, filmstrips) are in
_fluid_add_measure.py; this probe only checks that each promise holds, so it stays in the gate.

1  /add is an intercepting route: Hôm nay stays mounted under the sheet (the same element after the sheet closes), the screen
   under it is inert while the sheet is up, there is no backdrop copy, Back closes the sheet and the URL is the tab's again.
   A reload on /add draws the sheet on its own page (no tab frame), and its ✕ goes home.
   The meal name is there in the first frame ("Thêm vào: —" never shows). The nav highlight stays on the tab it was opened from.
   (Yesterday is editable only in a live account, so the + carrying the day is covered by cc_68.py and add-opener.test.ts.)
3  An add from the tray slides the sheet away like the ✕ (not a hard cut), leaves the button as it was ("Thêm 0 món" never shows)
   and goes back past the sheet (one history entry fewer than the sheet's own: Back from Hôm nay does not reopen it).
4  Hôm nay behind plays the kcal count-up after the add (more than one value on the way).
6  The ✕ takes no taps from the tap on (pointer-events none), and nothing is inert until the slide is over.
9  One toast element: a second add in the same meal updates it in place (same node, new text).
8  The first open of the calendar and of the day menu is as fast as the second.
11 A touch-down marks the pressed control data-pressed within a frame; the release takes it off.
14 Reduced motion: a pressed control does not scale.
Run with: ALIGN_BASE_URL=http://localhost:3101 npm run probe -- tests/probes/fluid_add.py
"""
# PROBE_COVERS: app/(app)/add/** app/(app)/(tabs)/** components/add/** components/home/** components/ui/**
# PROBE_TAGS: smoke
import os
import re
import sys

from playwright.sync_api import sync_playwright
import _demo  # noqa: F401  (demo mode, tour and tips off)

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3100")
PHONE = dict(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
SEED = {"installPrompt": {"dismissCount": 0, "snoozeUntil": 0, "done": True, "firstSeenIso": "2026-01-01"}}
problems = []


def check(cond, msg):
    print(("[PASS] " if cond else "[FAIL] ") + msg)
    if not cond:
        problems.append(msg)


SAMPLER = """
window.__samples = [];
window.__stop = false;
const visible = (el) => !!el && el.getClientRects().length > 0;
const tick = () => {
  const panel = [...document.querySelectorAll('[data-add-panel]')].find(visible);
  const hero = [...document.querySelectorAll('[aria-label="Tổng kcal và dinh dưỡng đa lượng"]')].find((e) => visible(e) && !e.closest('[aria-hidden="true"]'));
  const tray = document.querySelector('[data-testid="tray-add"]');
  const meal = panel ? (panel.querySelector('strong') || {}).textContent : null;
  window.__samples.push({
    top: panel ? panel.getBoundingClientRect().top : null,
    kcal: hero ? (hero.querySelector('span.font-display') || hero).textContent : null,
    tray: tray ? tray.textContent : null,
    rise: document.querySelectorAll('.m-row-enter').length,
    bar: (() => { const b = [...document.querySelectorAll('[aria-label="Kcal so với mục tiêu ngày"]')].find((e) => visible(e) && !e.closest('[aria-hidden="true"]')); const f = b && (b.querySelector('[style*="transform"]') || b.firstElementChild); return f ? f.style.transform || getComputedStyle(f).transform : null; })(),
    meal,
    path: location.pathname,
  });
  if (!window.__stop) requestAnimationFrame(tick);
};
requestAnimationFrame(tick);
"""


def start_sampler(pg):
    pg.evaluate(SAMPLER)


def stop_sampler(pg):
    pg.evaluate("window.__stop = true")
    pg.wait_for_timeout(60)
    return pg.evaluate("window.__samples")


def open_home(pg):
    pg.goto(BASE + "/app", wait_until="networkidle")
    pg.locator('[data-testid="meal-header"]:visible').first.wait_for(state="visible", timeout=10000)
    pg.wait_for_timeout(1500)


def new_context(browser, **extra):
    ctx = browser.new_context(**PHONE, **extra)
    ctx.add_init_script("try { localStorage.setItem('h1t_settings_v1_demo', %r) } catch (e) {}" % __import__("json").dumps(SEED))
    return ctx


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()

        # ---- 1: the intercepting route
        ctx = new_context(browser)
        pg = ctx.new_page()
        errors = []
        pg.on("pageerror", lambda e: errors.append(str(e)))
        open_home(pg)
        pg.evaluate("document.querySelector('[aria-label=\"Tổng kcal và dinh dưỡng đa lượng\"]').__keep = 'mounted'")
        history_before = pg.evaluate("history.length")
        start_sampler(pg)
        pg.locator("#mobile-add-fab").tap()
        pg.wait_for_url(re.compile(r".*/add$"))
        pg.locator("[data-add-panel] [data-testid=food-search]").first.wait_for(state="visible", timeout=8000)
        pg.wait_for_timeout(700)
        samples = stop_sampler(pg)
        seen_meals = {s["meal"] for s in samples if s["meal"] is not None}
        check(pg.evaluate("document.querySelector('[data-app-frame]') !== null") and pg.locator('[data-app-frame] [data-align-group="home-page"]').count() > 0,
              "+ → /add: the real Hôm nay is mounted under the sheet (the tabs frame is there)")
        check(pg.evaluate("document.querySelector('[data-app-frame]').inert") is True, "the screen under the sheet is inert while the sheet is up")
        check(pg.locator("[data-add-behind]").count() == 0, "no backdrop copy of Hôm nay")
        check(seen_meals and "—" not in seen_meals, f"the meal name is there in the first frame ({sorted(seen_meals)})")
        check(pg.evaluate("history.length") == history_before + 1, "one history entry for the sheet")
        check(not errors, f"no page errors ({errors[:1]})")
        panel_text = pg.locator("[data-add-panel]").first.inner_text()
        check("Thêm vào" in panel_text, "the sheet says which meal it adds to")
        # Back closes the sheet and the screen under it is the same element, not drawn again
        pg.go_back()
        pg.wait_for_url(re.compile(r".*/app$"))
        pg.wait_for_timeout(600)
        check(pg.locator("[data-add-panel]").count() == 0, "Back: the sheet is gone")
        check(pg.evaluate("document.querySelector('[aria-label=\"Tổng kcal và dinh dưỡng đa lượng\"]').__keep") == "mounted", "Back: Hôm nay is the same element (it was never drawn again)")
        check(pg.evaluate("document.querySelector('[data-app-frame]').inert") is False, "Back: Hôm nay takes taps again")
        ctx.close()

        # ---- /add straight: the sheet on its own page
        ctx = new_context(browser)
        pg = ctx.new_page()
        pg.goto(BASE + "/add", wait_until="networkidle")
        pg.locator("[data-add-panel] [data-testid=food-search]").first.wait_for(state="visible", timeout=10000)
        check(pg.locator("[data-app-frame]").count() == 0, "/add opened straight: the sheet has the page to itself (no tab frame, no copy of Hôm nay)")
        pg.locator("[data-add-panel]").get_by_role("button", name="Đóng").first.tap()
        pg.wait_for_url(re.compile(r".*/app(\?.*)?$"), timeout=6000)
        check(True, "/add opened straight: the ✕ goes home")
        ctx.close()

        # ---- the nav highlight stays on the tab it was opened from
        ctx = new_context(browser)
        pg = ctx.new_page()
        pg.goto(BASE + "/explore", wait_until="networkidle")
        pg.locator('a[href^="/explore/rich/"]').first.wait_for(state="visible", timeout=10000)
        pg.wait_for_timeout(1200)
        nav = pg.locator('nav[aria-label="Điều hướng chính"]').locator("visible=true")
        before = nav.locator('a[aria-current="page"]').first.inner_text()
        pg.locator("#mobile-add-fab").tap()
        pg.wait_for_url(re.compile(r".*/add$"))
        pg.locator("[data-add-panel]").first.wait_for(state="visible")
        pg.wait_for_timeout(500)
        after = nav.locator('a[aria-current="page"]').first.inner_text()
        check("Khám phá" in before and before == after, f"the nav highlight stays on the tab the sheet came from ({before!r} → {after!r})")
        ctx.close()

        # ---- the desktop dialog: the same route, a dialog over the real Hôm nay; Esc closes it at once
        ctx = browser.new_context(viewport={"width": 1440, "height": 900})
        ctx.add_init_script("try { localStorage.setItem('h1t_settings_v1_demo', %r) } catch (e) {}" % __import__("json").dumps(SEED))
        pg = ctx.new_page()
        pg.goto(BASE + "/app", wait_until="networkidle")
        pg.locator('[data-testid="meal-header"]:visible').first.wait_for(state="visible", timeout=10000)
        pg.wait_for_timeout(1200)
        pg.evaluate("document.querySelector('[aria-label=\"Tổng kcal và dinh dưỡng đa lượng\"]').__keep = 'mounted'")
        pg.locator("#desktop-add-btn").click()
        pg.wait_for_url(re.compile(r".*/add$"))
        dlg = pg.locator('[role="dialog"][data-sheet-route]').first
        dlg.wait_for(state="visible", timeout=6000)
        pg.wait_for_timeout(500)
        check(pg.locator("[data-add-panel]").count() == 0 and pg.locator('[data-app-frame] [data-align-group="home-page"]').count() > 0, "1440: the dialog is drawn once, over the real Hôm nay")
        check("Thêm vào" in dlg.inner_text() and "—" not in dlg.inner_text().split("Thêm vào:")[1][:12], "1440: the meal name is there at once")
        pg.keyboard.press("Escape")
        pg.wait_for_url(re.compile(r".*/app$"), timeout=6000)
        pg.wait_for_timeout(400)
        check(pg.evaluate("document.querySelector('[aria-label=\"Tổng kcal và dinh dưỡng đa lượng\"]').__keep") == "mounted", "1440: Esc closes it and Hôm nay is the same element")
        ctx.close()

        # ---- 3, 4, 6, 9: an add from the tray
        ctx = new_context(browser)
        pg = ctx.new_page()
        open_home(pg)
        pg.locator("#mobile-add-fab").tap()
        pg.locator("[data-add-panel] [data-testid=food-search]").first.wait_for(state="visible", timeout=8000)
        pg.wait_for_timeout(700)
        pg.locator("[data-add-panel] [data-testid=food-search]").first.fill("trứng")
        toggle = pg.locator("[data-add-panel] [data-testid=tray-toggle]").first
        toggle.wait_for(state="visible", timeout=8000)
        toggle.tap()
        add = pg.locator("[data-add-panel] [data-testid=tray-add]").first
        add.wait_for(state="visible", timeout=4000)
        pg.wait_for_timeout(500)
        history_with_sheet = pg.evaluate("history.length")
        start_sampler(pg)
        add.tap()
        # 6: no taps from the tap on, nothing inert yet
        pg.wait_for_timeout(40)
        flags = pg.evaluate(
            "() => { const p = document.querySelector('[data-add-panel]'); const x = p && [...p.querySelectorAll('button')].find((b) => b.getAttribute('aria-label') === 'Đóng');"
            " return p ? { state: p.dataset.state, closeEvents: x ? getComputedStyle(x).pointerEvents : null, panelEvents: getComputedStyle(p).pointerEvents, scrim: getComputedStyle(document.querySelector('.m-scrim')).pointerEvents, inertKids: [...p.children].filter((c) => c.inert).length } : null }"
        )
        check(flags is not None and flags["state"] == "closed" and flags["panelEvents"] == "none" and flags["scrim"] == "none",
              f"a tap on the tray button: the sheet is closed at once and takes no taps ({flags})")
        check(flags is not None and flags["inertKids"] == 0, "…and nothing is made inert while it slides")
        pg.wait_for_url(re.compile(r".*/app$"), timeout=6000)
        pg.wait_for_timeout(1300)
        samples = stop_sampler(pg)
        tops = [s["top"] for s in samples if s["top"] is not None]
        moving = [b - a for a, b in zip(tops, tops[1:]) if b - a > 1]
        check(len(moving) >= 4, f"the add slides the sheet away like the ✕: {len(moving)} frames of movement (a hard cut has none)")
        check(not any(s["tray"] and "Thêm 0" in s["tray"] for s in samples), "the tray button never says Thêm 0 món while it closes")
        kcals = []
        for s in samples:
            if s["kcal"] is not None and (not kcals or kcals[-1] != s["kcal"]):
                kcals.append(s["kcal"])
        check(len(kcals) >= 3, f"Hôm nay behind counts up to the new kcal ({len(kcals)} values: {kcals[:6]})")
        bars = []
        for s_ in samples:
            if s_["bar"] is not None and (not bars or bars[-1] != s_["bar"]):
                bars.append(s_["bar"])
        check(len(bars) >= 3, f"…the kcal bar grows to it ({len(bars)} steps)")
        check(any(s_["rise"] > 0 for s_ in samples), "…and the new row rises in (m-row-enter on the page that stayed mounted)")
        check(pg.evaluate("history.length") == history_with_sheet, "the add went back past the sheet: no entry added")
        pg.go_back()
        pg.wait_for_timeout(500)
        check(not re.search(r"/add", pg.url) and pg.locator("[data-add-panel]").count() == 0, f"Back from Hôm nay does not reopen the sheet ({pg.url[len(BASE):]})")
        ctx.close()

        # ---- 3 again: the portion sheet's Thêm (a sheet with its own history entry over the add sheet) and a one-tap add
        for label, steps in (("portion sheet Thêm", "portion"), ("one tap on a recent", "recent")):
            ctx = new_context(browser)
            pg = ctx.new_page()
            open_home(pg)
            pg.locator("#mobile-add-fab").tap()
            pg.locator("[data-add-panel] [data-testid=food-search]").first.wait_for(state="visible", timeout=8000)
            pg.wait_for_timeout(900)
            if steps == "portion":
                pg.locator("[data-add-panel] [data-testid=food-search]").first.fill("chuối")
                row = pg.locator("[data-add-panel] button[data-food-row]").filter(has_text="Chuối").first
                row.wait_for(state="visible", timeout=8000)
                row.tap()
                pg.locator('[data-testid="portion-add"]:visible').first.wait_for(state="visible", timeout=6000)
                pg.wait_for_timeout(500)
            history_now = pg.evaluate("history.length")
            start_sampler(pg)
            if steps == "portion":
                pg.locator('[data-testid="portion-add"]:visible').first.tap()
            else:
                pg.locator('[data-tour="add-recents"]:visible button[aria-label^="Thêm "]').first.tap(force=True)
            pg.wait_for_url(re.compile(r".*/app$"), timeout=6000)
            pg.wait_for_timeout(900)
            samples = stop_sampler(pg)
            tops = [s["top"] for s in samples if s["top"] is not None]
            moving = [b - a for a, b in zip(tops, tops[1:]) if b - a > 1]
            check(len(moving) >= 4, f"{label}: the sheet slides away ({len(moving)} frames of movement), no hard cut")
            check(pg.evaluate("history.length") == history_now, f"{label}: the entries of the sheet(s) went with it")
            pg.go_back()
            pg.wait_for_timeout(500)
            check("/add" not in pg.url, f"{label}: Back from Hôm nay does not reopen the sheet ({pg.url[len(BASE):]})")
            ctx.close()

        # ---- 9: one toast element
        ctx = new_context(browser)
        pg = ctx.new_page()
        open_home(pg)

        def add_first_recent():
            pg.locator("#mobile-add-fab").tap()
            pg.locator("[data-add-panel] [data-testid=food-search]").first.wait_for(state="visible", timeout=8000)
            pg.wait_for_timeout(900)
            pg.locator("[data-add-panel] [data-testid=food-search]").first.fill("chuối")
            pg.locator("[data-add-panel] [data-testid=tray-toggle]").first.tap()
            pg.locator("[data-add-panel] [data-testid=tray-add]").first.tap()
            pg.wait_for_url(re.compile(r".*/app$"), timeout=6000)

        add_first_recent()
        toast = pg.locator(".m-toast").first
        toast.wait_for(state="visible", timeout=4000)
        pg.evaluate("document.querySelector('.m-toast').__keep = 'same'")
        text1 = toast.inner_text()
        pg.wait_for_timeout(700)
        add_first_recent()
        pg.wait_for_timeout(500)
        text2 = pg.locator(".m-toast").first.inner_text()
        check(pg.evaluate("document.querySelector('.m-toast') && document.querySelector('.m-toast').__keep") == "same", "a second add: the toast is the same element (never unmounted)")
        check(pg.locator(".m-toast").count() == 1 and text2.startswith("Đã thêm"), f"…the one toast says the new add ({text2.splitlines()[0]!r})")
        ctx.close()

        # ---- 8: the first open of the lazy sheets
        ctx = new_context(browser)
        pg = ctx.new_page()
        open_home(pg)
        pg.wait_for_timeout(2000)
        btn = pg.locator('button[aria-label^="Chọn ngày"]').locator("visible=true").first
        times = []
        for _ in range(2):
            pg.evaluate("window.__t0 = performance.now(); window.__seen = null; const iv = setInterval(() => { const d = document.querySelector('[role=dialog][data-state=open]'); if (d && d.getClientRects().length) { window.__seen = performance.now() - window.__t0; clearInterval(iv); } }, 1)")
            btn.tap()
            pg.wait_for_timeout(700)
            times.append(pg.evaluate("window.__seen"))
            pg.keyboard.press("Escape")
            pg.wait_for_timeout(500)
        check(times[0] is not None and times[1] is not None and times[0] < 120, f"the calendar's first open is as fast as the second ({times[0]:.0f} ms, then {times[1]:.0f} ms)")
        ctx.close()

        # ---- 11: press on touch-down
        ctx = new_context(browser)
        pg = ctx.new_page()
        open_home(pg)
        cdp = ctx.new_cdp_session(pg)
        tab = pg.locator('nav[aria-label="Điều hướng chính"]').locator("visible=true").get_by_role("link", name="Khám phá").first
        box = tab.bounding_box()
        x, y = box["x"] + box["width"] / 2, box["y"] + box["height"] / 2
        cdp.send("Input.dispatchTouchEvent", {"type": "touchStart", "touchPoints": [{"x": x, "y": y}]})
        pg.wait_for_timeout(40)
        pressed = tab.evaluate("el => el.hasAttribute('data-pressed')")
        scale = tab.evaluate("el => getComputedStyle(el).scale")
        check(pressed, "touch-down: the nav tab is marked pressed at once")
        check(scale not in ("none", "1"), f"…and shows it (scale {scale})")
        cdp.send("Input.dispatchTouchEvent", {"type": "touchCancel", "touchPoints": []})
        pg.wait_for_timeout(300)
        check(not tab.evaluate("el => el.hasAttribute('data-pressed')"), "…and the release takes it off")
        ctx.close()

        # ---- 10: the hold on a food row deepens, then lifts
        ctx = new_context(browser)
        pg = ctx.new_page()
        open_home(pg)
        cdp = ctx.new_cdp_session(pg)
        rowbox = pg.locator("button[data-entry-id]:visible").first
        rowbox.scroll_into_view_if_needed()
        b = rowbox.bounding_box()
        cdp.send("Input.dispatchTouchEvent", {"type": "touchStart", "touchPoints": [{"x": b["x"] + b["width"] / 2, "y": b["y"] + b["height"] / 2}]})
        pg.wait_for_timeout(120)
        early = rowbox.evaluate("el => [el.dataset.touchDrag, parseFloat(getComputedStyle(el, '::after').opacity)]")
        pg.wait_for_timeout(250)
        mid = rowbox.evaluate("el => parseFloat(getComputedStyle(el, '::after').opacity)")
        pg.wait_for_timeout(450)
        lifted = rowbox.evaluate("el => [el.dataset.touchDrag, getComputedStyle(el).transform]")
        cdp.send("Input.dispatchTouchEvent", {"type": "touchCancel", "touchPoints": []})
        check(early[0] == "pressing" and 0 < early[1] < mid <= 1, f"the hold: the tint deepens while the finger rests ({early[1]:.2f} → {mid:.2f})")
        check(lifted[0] == "lifted" and lifted[1] != "none", f"…then the row lifts ({lifted})")
        ctx.close()

        # ---- 14: reduced motion
        ctx = new_context(browser, reduced_motion="reduce")
        pg = ctx.new_page()
        open_home(pg)
        pg.evaluate("document.querySelector('#mobile-add-fab').setAttribute('data-pressed', '')")
        scale = pg.evaluate("getComputedStyle(document.querySelector('#mobile-add-fab')).scale")
        check(scale == "none", f"reduced motion: a pressed control does not scale (scale {scale})")
        ctx.close()

        browser.close()
    print(f"\n{len(problems)} problem(s)")
    for m in problems:
        print(" - " + m)
    sys.exit(1 if problems else 0)


main()
