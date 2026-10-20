"""fix/polish-1020: what the polish pass promises (demo build, phone 390 x 844 unless said).

1  One interruption per app open: Có gì mới first; after it nothing else opens (no tip, no install pop-up) until the next open, where
   one tip may open, and only one. A tip never opens over a focused field: on /add the search field is focused, so the sheet-drag tip waits.
2  "Có bản mới": a new service worker is found, the toast comes above the bottom nav (the screen leaves room, nothing covers the last
   list row), goes after 5 s, and the update is applied when the app goes to the background (the page reloads), never before.
3  The /add list draws a few rows of each category and "Xem thêm" adds more; Tab has tens of stops, not hundreds.
4  The portion sheet has a ✕ (44 px, "Đóng"), Esc closes it, and focus goes back to the row.
5  + Thêm and a meal header have a 44 px hit area (the look is unchanged).
7  The portion sheet's and the tray's primary buttons fit at 360 px with 150 % text; typing in the search field leaves the header where it
   is and starts the list at the top; the "Bấm + để nhân" line is gone.
(6, one <main> and one h1 per screen, is smoke.py's.)
Run with: ALIGN_BASE_URL=http://localhost:3101 npm run probe -- tests/probes/polish_1020.py
"""
# PROBE_COVERS: app/(app)/add/** app/(app)/(tabs)/** components/add/** components/home/** components/pwa/** components/onboarding/** components/whats-new/** components/ui/**
import json
import os
import re
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright
import _demo  # noqa: F401  (demo mode)
import _seed

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3100")
ROOT = Path(__file__).resolve().parent.parent.parent
PHONE = dict(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
SETTINGS_KEY = "h1t_settings_v1_demo"
NO_INSTALL = {"installPrompt": {"dismissCount": 0, "snoozeUntil": 0, "done": True, "firstSeenIso": "2026-01-01"}}
RELEASE = re.search(r'id:\s*"(20\d\d-\d\d-\d\d[a-z]?)"', (ROOT / "lib" / "releases.ts").read_text(encoding="utf-8")).group(1)
problems = []


def check(cond, msg):
    print(("[PASS] " if cond else "[FAIL] ") + msg)
    if not cond:
        problems.append(msg)


def seeded(browser, settings, **extra):
    ctx = browser.new_context(**{**PHONE, **extra})
    ctx.add_init_script(f"if (localStorage.getItem('{SETTINGS_KEY}') === null) localStorage.setItem('{SETTINGS_KEY}', {json.dumps(json.dumps(settings))});")
    return ctx, ctx.new_page()


def home(pg):
    pg.goto(BASE + "/app", wait_until="networkidle")
    pg.locator('[data-testid="meal-header"]:visible').first.wait_for(state="visible", timeout=10000)


WATCH = """
window.__seen = new Set();
const note = () => {
  if ([...document.querySelectorAll('[role="dialog"]')].some((d) => /Có gì mới/.test(d.getAttribute('aria-label') || '') || /Có gì mới/.test(d.textContent || '') && d.getClientRects().length)) window.__seen.add('whats-new');
  if (document.querySelector('[data-onboarding-card]:not([data-state="closed"])')) window.__seen.add('tip');
};
new MutationObserver(note).observe(document.documentElement, { subtree: true, childList: true, attributes: true });
setInterval(note, 100);
"""


def interruptions():
    # ---- 1
    with sync_playwright() as p:
        browser = p.chromium.launch()
        _seed.onboarding(True)
        _seed.whats_new(True)
        # tour done, tips on and unseen, Có gì mới unseen
        settings = {"onboarding": {"tourDone": True, "tipsOff": False, "seen": [], "used": [], "replayOpened": True, "tourStartedIso": None, "whatsNewSeen": None}, **NO_INSTALL}
        ctx, pg = seeded(browser, settings)
        pg.add_init_script(WATCH)
        home(pg)
        pg.wait_for_timeout(7000)
        seen = set(pg.evaluate("[...window.__seen]"))
        check("whats-new" in seen, f"1: Có gì mới opens first ({sorted(seen)})")
        check("tip" not in seen, "1: and no tip opens over it or after it in the same app open")
        later = pg.get_by_role("button", name="Để sau")
        if later.count():
            later.first.click()
        pg.wait_for_timeout(4000)
        check("tip" not in set(pg.evaluate("[...window.__seen]")), "1: …even after Có gì mới is closed (one interruption per app open)")
        ctx.close()
        # the next app open: Có gì mới is seen, one tip opens, only one
        settings["onboarding"]["whatsNewSeen"] = RELEASE
        ctx, pg = seeded(browser, settings)
        pg.add_init_script(WATCH)
        home(pg)
        pg.wait_for_timeout(5000)
        check("tip" in set(pg.evaluate("[...window.__seen]")), "1: the next app open shows a tip")
        got = pg.get_by_role("button", name="Đã hiểu")
        if got.count():
            got.first.click()
            pg.wait_for_timeout(1500)
        pg.evaluate("window.__seen = new Set()")
        pg.wait_for_timeout(4000)
        check(pg.locator('[data-onboarding-card]:not([data-state="closed"])').count() == 0 and "tip" not in set(pg.evaluate("[...window.__seen]")), "1: and no second tip follows it")
        ctx.close()
        # a tip never opens over a focused field: the phone sheet focuses its search field, the sheet-drag tip waits
        settings = {"onboarding": {"tourDone": True, "tipsOff": False, "seen": ["home-logged", "meal-add", "home-share", "pull-refresh"], "used": [], "replayOpened": True, "tourStartedIso": None, "whatsNewSeen": RELEASE}, **NO_INSTALL}
        ctx, pg = seeded(browser, settings)
        home(pg)
        pg.wait_for_timeout(800)
        pg.locator("#mobile-add-fab").tap()
        pg.locator("[data-add-panel] [data-testid=food-search]").first.wait_for(state="visible", timeout=8000)
        pg.wait_for_timeout(3500)
        focused = pg.evaluate("document.activeElement && document.activeElement.tagName")
        cards = pg.locator('[data-onboarding-card]:not([data-state="closed"])').count()
        check(focused == "INPUT" and cards == 0, f"1: a tip does not open over a focused search field ({focused}, {cards} cards)")
        ctx.close()
        _seed.onboarding(False)
        _seed.whats_new(False)
        browser.close()


def update_offer():
    # ---- 2: a new service worker is found; its toast, and the update on the app going to the background
    with sync_playwright() as p:
        browser = p.chromium.launch()
        ctx, pg = seeded(browser, NO_INSTALL)
        sw_calls = []

        def sw_route(route):
            sw_calls.append(1)
            resp = route.fetch()
            body = resp.text()
            # the second time it is asked for it is a different file (a new version), so the browser installs it as an update
            if len(sw_calls) > 1:
                body = body.replace('const VERSION = "', 'const VERSION = "x', 1)
            route.fulfill(response=resp, body=body)

        ctx.route("**/sw.js", sw_route)
        home(pg)
        pg.evaluate("() => navigator.serviceWorker.ready.then(() => true)")
        pg.reload(wait_until="networkidle")
        pg.wait_for_timeout(1500)
        pg.evaluate("() => navigator.serviceWorker.getRegistration().then((r) => r.update())")
        toast = pg.get_by_text("Có bản mới", exact=False)
        toast.first.wait_for(state="visible", timeout=15000)
        pg.wait_for_timeout(700)
        box = pg.locator(".m-toast", has_text="Có bản mới").first.bounding_box()
        nav_top = pg.locator('nav[aria-label="Điều hướng chính"]').locator("visible=true").first.bounding_box()["y"]
        list_bottom = pg.evaluate("() => { const l = document.querySelector('[data-food-scroll]'); return l ? l.getBoundingClientRect().bottom : null }")
        check(box is not None and box["y"] + box["height"] <= nav_top + 1, f"2: the toast sits above the bottom nav (bottom {box and round(box['y'] + box['height'])} ≤ nav top {round(nav_top)})")
        check(list_bottom is not None and box is not None and list_bottom <= box["y"] + 1, f"2: Hôm nay's list ends above it: it never covers a row (list bottom {list_bottom and round(list_bottom)}, toast top {box and round(box['y'])})")
        pg.wait_for_timeout(5600)
        check(pg.locator(".m-toast", has_text="Có bản mới").count() == 0, "2: the toast goes after 5 s")
        room = pg.evaluate("getComputedStyle(document.documentElement).getPropertyValue('--update-bar-h').trim()")
        check(room in ("0px", ""), f"2: …and the room it took is given back ({room!r})")
        loads = []
        pg.on("framenavigated", lambda f: loads.append(1))
        check(len(loads) == 0, "2: nothing reloaded the page while it was in front")
        # the app goes to the background: the update is applied and the page reloads
        pg.evaluate("() => { Object.defineProperty(document, 'visibilityState', { get: () => 'hidden', configurable: true }); document.dispatchEvent(new Event('visibilitychange')); }")
        pg.wait_for_timeout(2500)
        check(len(loads) >= 1, "2: the app going to the background applies the update (the page reloaded)")
        ctx.close()
        browser.close()


def add_sheet():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        ctx, pg = seeded(browser, NO_INSTALL)
        home(pg)
        pg.wait_for_timeout(1200)

        # ---- 5: hit areas, by what a finger would hit 20 px above and below the centre
        def hits(sel, name):
            box = pg.locator(sel).locator("visible=true").first.bounding_box()
            cx, cy = box["x"] + box["width"] / 2, box["y"] + box["height"] / 2
            ok = []
            for dy in (-20, 20):
                ok.append(pg.evaluate("([x, y, sel]) => { const e = document.elementFromPoint(x, y); const t = document.querySelector(sel); return !!e && (e === t || t.contains(e)) }", [cx, cy + dy, sel + ":not([hidden])"]))
            return all(ok), round(box["height"])

        add_ok, add_h = hits('[data-testid="meal-add"]', "+ Thêm")
        check(add_ok, f"5: a tap 20 px above or below + Thêm still lands on it (element {add_h} px, hit area 44)")
        head_ok, head_h = hits('[data-testid="meal-header"]', "meal header")
        check(head_ok, f"5: …and on a meal header (element {head_h} px, hit area 44)")

        # ---- 3: the add list
        pg.locator("#mobile-add-fab").tap()
        pg.locator("[data-add-panel] [data-testid=food-search]").first.wait_for(state="visible", timeout=8000)
        pg.locator("[data-add-panel] button[data-food-row]").first.wait_for(state="visible", timeout=8000)
        pg.wait_for_timeout(900)
        rows = pg.locator("[data-add-panel] button[data-food-row]").count()
        stops = pg.evaluate("() => [...document.querySelectorAll('[data-add-panel] button, [data-add-panel] a[href], [data-add-panel] input')].filter((e) => !e.disabled && e.tabIndex >= 0 && !e.closest('[inert]')).length")
        nodes = pg.evaluate("() => document.querySelectorAll('[data-add-panel] *').length")
        check(rows <= 60, f"3: the add list draws {rows} food rows first (a few per category), not the whole catalogue")
        check(stops <= 140, f"3: Tab has {stops} stops in the sheet (tens, not hundreds); the sheet is {nodes} nodes")
        more = pg.get_by_role("button", name=re.compile(r"^Xem thêm \(")).first
        check(more.count() == 1, "3: a category with more foods ends in Xem thêm (n món)")
        before = pg.locator("[data-add-panel] button[data-food-row]").count()
        more.scroll_into_view_if_needed()
        more.click()
        pg.wait_for_timeout(300)
        check(pg.locator("[data-add-panel] button[data-food-row]").count() > before, "3: Xem thêm adds more rows")

        # ---- 7: typing leaves the header where it is and the list starts at the top
        head_before = pg.locator("[data-add-panel] [data-testid=food-search]").first.bounding_box()["y"]
        pg.locator("[data-add-panel] [data-add-scroll]").evaluate("el => { el.scrollTop = 600 }")
        pg.locator("[data-add-panel] [data-testid=food-search]").first.fill("chuối")
        pg.locator("[data-add-panel] button[data-food-row]").filter(has_text="Chuối").first.wait_for(state="visible", timeout=6000)
        pg.wait_for_timeout(500)
        head_after = pg.locator("[data-add-panel] [data-testid=food-search]").first.bounding_box()["y"]
        top = pg.locator("[data-add-panel] [data-add-scroll]").evaluate("el => el.scrollTop")
        check(abs(head_before - head_after) < 0.5, f"7: the search field stays where it is while the results change ({head_before} → {head_after})")
        check(top == 0, f"7: the new results start at the top ({top})")

        # ---- 4: the portion sheet
        row = pg.locator("[data-add-panel] button[data-food-row]").filter(has_text="Chuối").first
        row_id = row.get_attribute("data-food-id")
        row.tap()
        pg.locator('[data-testid="portion-add"]:visible').first.wait_for(state="visible", timeout=6000)
        pg.wait_for_timeout(500)
        close = pg.get_by_role("button", name="Đóng").locator("visible=true").filter(has=pg.locator("svg")).first
        sheet_close = pg.locator('[data-testid="portion-close"]:visible').first
        box = sheet_close.bounding_box()
        check(sheet_close.count() == 1 and box is not None and box["width"] >= 44 and box["height"] >= 44, f"4: the portion sheet has a visible ✕ named Đóng, 44 px ({box and (round(box['width']), round(box['height']))})")
        no_hint = "Bấm + để nhân" not in pg.locator("body").inner_text()
        check(no_hint, "7: the \"Bấm + để nhân…\" line is gone")
        pg.keyboard.press("Escape")
        pg.wait_for_timeout(700)
        check(pg.locator('[data-testid="portion-add"]:visible').count() == 0, "4: Esc closes the portion sheet")
        focused_row = pg.evaluate("(id) => { const a = document.activeElement; return !!a && a.getAttribute('data-food-id') === id }", row_id)
        check(focused_row, "4: focus is back on the row that opened it")
        row.tap()
        pg.locator('[data-testid="portion-add"]:visible').first.wait_for(state="visible", timeout=6000)
        pg.wait_for_timeout(400)
        pg.locator('[data-testid="portion-close"]:visible').first.tap()
        pg.wait_for_timeout(700)
        check(pg.locator('[data-testid="portion-add"]:visible').count() == 0, "4: the ✕ closes it too")
        ctx.close()

        # ---- 7: 360 px wide, 150 % text
        ctx = browser.new_context(viewport={"width": 360, "height": 740}, device_scale_factor=2, is_mobile=True, has_touch=True)
        ctx.add_init_script(f"if (localStorage.getItem('{SETTINGS_KEY}') === null) localStorage.setItem('{SETTINGS_KEY}', {json.dumps(json.dumps(NO_INSTALL))});")
        pg = ctx.new_page()
        home(pg)
        pg.evaluate("document.documentElement.style.fontSize = '150%'")
        pg.locator("#mobile-add-fab").tap()
        pg.locator("[data-add-panel] [data-testid=food-search]").first.wait_for(state="visible", timeout=8000)
        pg.wait_for_timeout(900)
        pg.locator("[data-add-panel] [data-testid=food-search]").first.fill("chuối")
        row = pg.locator("[data-add-panel] button[data-food-row]").filter(has_text="Chuối").first
        row.wait_for(state="visible", timeout=6000)
        pg.locator("[data-add-panel] [data-testid=tray-toggle]").first.tap()
        tray_btn = pg.locator("[data-add-panel] [data-testid=tray-add]").first
        tray_btn.wait_for(state="visible", timeout=4000)
        pg.wait_for_timeout(500)

        def fits(loc, label):
            m = loc.evaluate("el => { const r = el.getBoundingClientRect(); const s = el.scrollWidth > el.clientWidth + 1; const kids = [...el.querySelectorAll('span')].some((c) => c.getBoundingClientRect().right > r.right + 1 || c.getBoundingClientRect().left < r.left - 1); return { left: r.left, right: r.right, h: r.height, clipped: s || kids } }")
            check(not m["clipped"] and m["left"] >= 0 and m["right"] <= 360.5, f"7: {label} fits at 360 px and 150 % text (height {round(m['h'])}, {round(m['left'])}–{round(m['right'])})")

        fits(tray_btn, "the tray's primary button")
        row.tap()
        pg.locator('[data-testid="portion-add"]:visible').first.wait_for(state="visible", timeout=6000)
        pg.wait_for_timeout(500)
        fits(pg.locator('[data-testid="portion-add"]:visible').first, "the portion sheet's primary button")
        ctx.close()
        browser.close()


def main():
    interruptions()
    add_sheet()
    update_offer()
    print(f"\n{len(problems)} problem(s)")
    for m in problems:
        print(" - " + m)
    sys.exit(1 if problems else 0)


main()
