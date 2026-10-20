"""feat/fluid-add review: the add sheet leaves cleanly from every tab (390 x 844 phone, demo build).

1  From Khám phá, Tổng quan and Cài đặt: + → add from the tray, add in one tap (a card of Gần đây) and the ✕ → the sheet is gone from the DOM
   (`[data-add-panel]`), the screen under it takes taps again (`[data-app-frame]` is not inert), and a tap on a nav item works.
   An add goes to Hôm nay (router.replace), the ✕ goes back to the tab: the @sheet slot must not keep the sheet from the tab left.
2  After a reload on /add the same add ends on Hôm nay with nothing left over.
3  `?meal=` is honoured: /add?meal=dinner names Bữa tối, from the link and from the sheet over a tab.
4  Android back during the slide: the sheet closes once, the URL is the tab's, nothing is inert.
5  Two taps on the add in the same frame add one entry, not two.
6  The day under the sheet does not flip: Hôm nay on an older day, + (which carries no date for a read-only day) → the day stays.
Run with: ALIGN_BASE_URL=http://localhost:3101 npm run probe -- tests/probes/add_from_tabs.py
"""
# PROBE_COVERS: app/(app)/add/** app/(app)/(tabs)/** components/add/** components/ui/**
import json
import os
import re

from playwright.sync_api import sync_playwright
import _demo  # noqa: F401  (demo mode, tour and tips off)

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3100")
PHONE = dict(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
SEED = {"installPrompt": {"dismissCount": 0, "snoozeUntil": 0, "done": True, "firstSeenIso": "2026-01-01"}}
problems = []
TABS = [("/explore", "Khám phá"), ("/trends", "Tổng quan"), ("/settings", "Cài đặt")]


def check(cond, msg):
    print(("[PASS] " if cond else "[FAIL] ") + msg)
    if not cond:
        problems.append(msg)


def new_context(browser):
    ctx = browser.new_context(**PHONE)
    ctx.add_init_script("try { localStorage.setItem('h1t_settings_v1_demo', %r) } catch (e) {}" % json.dumps(SEED))
    return ctx


def open_tab(pg, path):
    pg.goto(BASE + path, wait_until="networkidle")
    pg.locator("#mobile-add-fab").wait_for(state="visible", timeout=10000)
    pg.wait_for_timeout(1200)


def open_sheet(pg):
    pg.locator("#mobile-add-fab").tap()
    pg.wait_for_url(re.compile(r".*/add(\?.*)?$"))
    pg.locator("[data-add-panel] [data-testid=food-search]").first.wait_for(state="visible", timeout=8000)
    pg.wait_for_timeout(700)


def tray_add(pg):
    pg.locator("[data-add-panel] [data-testid=food-search]").first.fill("trứng")
    toggle = pg.locator("[data-add-panel] [data-testid=tray-toggle]").first
    toggle.wait_for(state="visible", timeout=8000)
    toggle.tap()
    add = pg.locator("[data-add-panel] [data-testid=tray-add]").first
    add.wait_for(state="visible", timeout=4000)
    pg.wait_for_timeout(400)
    add.tap()


def one_tap_add(pg):
    card = pg.locator('[data-add-panel] #add-recents button[aria-label^="Thêm "]').first
    card.wait_for(state="visible", timeout=6000)
    card.tap()


def close_x(pg):
    pg.locator("[data-add-panel]").get_by_role("button", name="Đóng").first.tap()


def clean_after(pg, label, expect_path):
    """The sheet is gone, the frame takes taps, and a nav item works."""
    try:
        pg.wait_for_url(re.compile(r".*" + expect_path + r"(\?.*)?$"), timeout=7000)
    except Exception:
        pass
    pg.wait_for_timeout(900)
    path = pg.evaluate("location.pathname")
    check(path == expect_path, f"{label}: ends on {expect_path} ({path})")
    check(pg.locator("[data-add-panel]").count() == 0, f"{label}: the sheet is gone from the DOM")
    check(pg.locator('[role="dialog"][data-sheet-route]').count() == 0, f"{label}: no dialog is left")
    inert = pg.evaluate("document.querySelector('[data-app-frame]') ? document.querySelector('[data-app-frame]').inert : null")
    check(inert is False, f"{label}: the screen takes taps again (inert={inert})")
    nav = pg.locator('nav[aria-label="Điều hướng chính"]').locator("visible=true")
    target = "/settings" if path != "/settings" else "/trends"
    try:
        nav.locator(f'a[href="{target}"]').first.tap(timeout=4000)
        pg.wait_for_url(re.compile(r".*" + target + r"$"), timeout=5000)
        check(True, f"{label}: a tap on a nav item works")
    except Exception:
        check(False, f"{label}: a tap on a nav item works (still on {pg.evaluate('location.pathname')})")


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()

        # ---- 1: from every other tab
        for path, name in TABS:
            for how, act, dest in (("tray add", tray_add, "/app"), ("one-tap add", one_tap_add, "/app"), ("✕", close_x, path)):
                ctx = new_context(browser)
                pg = ctx.new_page()
                errors = []
                pg.on("pageerror", lambda e: errors.append(str(e)))
                open_tab(pg, path)
                open_sheet(pg)
                act(pg)
                clean_after(pg, f"{name}, {how}", dest)
                check(not errors, f"{name}, {how}: no page errors ({errors[:1]})")
                ctx.close()

        # ---- 2: a reload on /add, then an add
        ctx = new_context(browser)
        pg = ctx.new_page()
        open_tab(pg, "/explore")
        open_sheet(pg)
        pg.reload(wait_until="networkidle")
        pg.locator("[data-add-panel] [data-testid=food-search]").first.wait_for(state="visible", timeout=8000)
        pg.wait_for_timeout(700)
        tray_add(pg)
        try:
            pg.wait_for_url(re.compile(r".*/app(\?.*)?$"), timeout=7000)
        except Exception:
            pass
        pg.wait_for_timeout(900)
        check(pg.locator("[data-add-panel]").count() == 0, "reload on /add, then an add: the sheet is gone")
        check(pg.evaluate("document.querySelector('[data-app-frame]') ? document.querySelector('[data-app-frame]').inert : null") is False, "…and Hôm nay takes taps")
        ctx.close()

        # ---- 3: ?meal= is honoured
        ctx = new_context(browser)
        pg = ctx.new_page()
        pg.goto(BASE + "/add?meal=dinner", wait_until="networkidle")
        pg.locator("[data-add-panel]").first.wait_for(state="visible", timeout=8000)
        pg.wait_for_timeout(500)
        check("Bữa tối" in pg.locator("[data-add-panel]").first.inner_text(), "/add?meal=dinner: the sheet names Bữa tối")
        ctx.close()
        ctx = new_context(browser)
        pg = ctx.new_page()
        open_tab(pg, "/app")
        pg.locator('button[aria-label^="Thêm vào Bữa tối"]:visible, a[aria-label^="Thêm vào Bữa tối"]:visible').first.tap()
        try:
            pg.wait_for_url(re.compile(r".*/add\?meal=dinner$"), timeout=5000)
            pg.locator("[data-add-panel]").first.wait_for(state="visible", timeout=8000)
            pg.wait_for_timeout(500)
            check("Bữa tối" in pg.locator("[data-add-panel]").first.inner_text(), "Thêm vào Bữa tối on Hôm nay: the sheet over it names Bữa tối")
        except Exception:
            check(False, "Thêm vào Bữa tối on Hôm nay opens the sheet for dinner")
        ctx.close()

        # ---- 4: Android back during the slide
        ctx = new_context(browser)
        pg = ctx.new_page()
        open_tab(pg, "/explore")
        open_sheet(pg)
        pg.locator("[data-add-panel]").get_by_role("button", name="Đóng").first.tap()
        pg.wait_for_timeout(60)
        pg.go_back()
        pg.wait_for_timeout(1500)
        path = pg.evaluate("location.pathname")
        check(path in ("/explore",), f"Back during the slide: the URL is the tab's ({path})")
        check(pg.locator("[data-add-panel]").count() == 0, "Back during the slide: the sheet is gone")
        check(pg.evaluate("document.querySelector('[data-app-frame]') ? document.querySelector('[data-app-frame]').inert : null") is False, "Back during the slide: nothing is inert")
        ctx.close()

        # ---- 5: a double tap on the add adds once
        ctx = new_context(browser)
        pg = ctx.new_page()
        open_tab(pg, "/app")
        before = pg.evaluate("Object.keys(localStorage).filter((k) => /diary|entries/i.test(k)).map((k) => localStorage.getItem(k).length).join(',')")
        pg.locator("#mobile-add-fab").tap()
        pg.locator("[data-add-panel] [data-testid=food-search]").first.wait_for(state="visible", timeout=8000)
        pg.wait_for_timeout(700)
        pg.locator("[data-add-panel] [data-testid=food-search]").first.fill("trứng")
        pg.locator("[data-add-panel] [data-testid=tray-toggle]").first.tap()
        add = pg.locator("[data-add-panel] [data-testid=tray-add]").first
        add.wait_for(state="visible", timeout=4000)
        pg.wait_for_timeout(400)
        pg.evaluate("window.__adds = 0; const el = document.querySelector('[data-add-panel] [data-testid=tray-add]'); const b = el.closest('button') || el; b.click(); b.click();")
        pg.wait_for_url(re.compile(r".*/app(\?.*)?$"), timeout=7000)
        pg.wait_for_timeout(1500)
        rows = pg.locator('[data-testid="meal-header"]:visible')
        pg.wait_for_timeout(200)
        count = pg.evaluate("[...document.querySelectorAll('[data-entry-id]')].filter((e) => e.getClientRects().length).length")
        ctx.close()
        ctx = new_context(browser)
        pg = ctx.new_page()
        open_tab(pg, "/app")
        base = pg.evaluate("[...document.querySelectorAll('[data-entry-id]')].filter((e) => e.getClientRects().length).length")
        ctx.close()
        check(count - base == 1, f"two clicks on Thêm in one frame: one entry is added ({base} → {count})")
        # ---- 6: the day under the sheet stays
        import datetime
        old = (datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=7))).date() - datetime.timedelta(days=3)).isoformat()
        ctx = new_context(browser)
        pg = ctx.new_page()
        pg.goto(BASE + f"/app?date={old}", wait_until="networkidle")
        pg.locator("#mobile-add-fab").wait_for(state="visible", timeout=10000)
        pg.wait_for_timeout(1500)
        head = "(() => { const e = [...document.querySelectorAll('[data-align-group=\"home-page\"]')].find((x) => x.getClientRects().length); return e ? e.innerText.slice(0, 80) : null; })()"
        pg.evaluate("window.__heads = new Set(); const tick = () => { try { window.__heads.add(" + head + "); } catch (e) {} if (!window.__stopHeads) requestAnimationFrame(tick); }; tick();")
        pg.locator("#mobile-add-fab").tap()
        pg.locator("[data-add-panel] [data-testid=food-search]").first.wait_for(state="visible", timeout=8000)
        pg.wait_for_timeout(800)
        close_x(pg)
        pg.wait_for_timeout(1500)
        heads = pg.evaluate("window.__stopHeads = true; [...window.__heads]")
        check(len([h for h in heads if h]) == 1, f"the day under the sheet does not flip while it opens and closes ({heads})")
        ctx.close()

        browser.close()

    print()
    if problems:
        print(f"{len(problems)} problem(s)")
        for m in problems:
            print(" -", m)
        raise SystemExit(1)
    print("add_from_tabs: all checks passed")


main()
