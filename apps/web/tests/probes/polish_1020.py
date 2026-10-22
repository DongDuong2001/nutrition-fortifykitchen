"""fix/polish-1020: what the polish pass promises (demo build, phone 390 x 844 unless said).

1  One interruption per app open: Có gì mới first; after it nothing else opens (no tip, no install pop-up) until the next open, where
   one tip may open, and only one. A tip never opens over a focused field: on /add the search field is focused, so the sheet-drag tip waits.
(2, "Có bản mới", is checked by hand with _polish_update_check.py: it needs a real service worker update, which has to change public/sw.js
   for a few seconds, and a parallel run must not.)
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
# Every tip of Hôm nay, seen: only the tips of /add and its sheets can still come
HOME_TIPS = ["sync-offline", "unsaved", "home-logged", "meal-add", "home-share", "pull-refresh", "nutrient-sources", "past-day", "multi-select", "haptics"]
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
  if (document.getElementById('whats-new-title')) window.__seen.add('whats-new');
  if (document.querySelector('[data-onboarding-card]:not([data-state="closed"])')) window.__seen.add('tip');
  if ([...document.querySelectorAll('[role="dialog"] h2')].some((h) => /Cài|màn hình chính|ứng dụng/i.test(h.textContent || '') && !document.getElementById('whats-new-title'))) window.__seen.add('install');
};
setInterval(note, 50);
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
        check("tip" not in seen, "1: and no tip opens over it")
        later = pg.get_by_role("button", name="Để sau")
        if later.count():
            later.first.click()
        pg.wait_for_timeout(4000)
        # share-spotlight (Hao 22/10): the share tip is the one tip that may follow Có gì mới once it is closed; no other tip, and nothing after it
        tip_text = pg.locator('[data-onboarding-card]:not([data-state="closed"])').all_inner_texts()
        check("tip" not in set(pg.evaluate("[...window.__seen]")) or (len(tip_text) == 1 and "Chia sẻ ngày ăn của bạn" in tip_text[0]), f"1: after Có gì mới is closed only the share tip may follow ({tip_text[:1]})")
        later = pg.locator('[data-onboarding-card]').get_by_role("button", name="Để sau")
        if later.count():
            later.first.click()
            pg.wait_for_timeout(500)
        pg.evaluate("window.__seen = new Set()")
        pg.wait_for_timeout(4000)
        check("tip" not in set(pg.evaluate("[...window.__seen]")), "1: …and nothing after it (one interruption per app open, plus the share tip)")
        ctx.close()
        # a slow start (slow network, a slow CPU): Có gì mới is lazy and late, the install pop-up and a tip are due too; Có gì mới still wins
        due_install = {"installPrompt": {"dismissCount": 0, "snoozeUntil": 0, "done": False, "firstSeenIso": "2026-01-01"}}
        slow = {"onboarding": {"tourDone": True, "tipsOff": False, "seen": [], "used": [], "replayOpened": True, "tourStartedIso": None, "whatsNewSeen": None}, **due_install}
        ctx, pg = seeded(browser, slow, **dict(is_mobile=True, has_touch=True))
        pg.add_init_script(WATCH)
        cdp = ctx.new_cdp_session(pg)
        cdp.send("Network.enable")
        cdp.send("Network.emulateNetworkConditions", {"offline": False, "latency": 450, "downloadThroughput": 200 * 1024, "uploadThroughput": 100 * 1024})
        cdp.send("Emulation.setCPUThrottlingRate", {"rate": 6})
        pg.goto(BASE + "/app", wait_until="domcontentloaded")
        pg.wait_for_timeout(20000)
        seen = set(pg.evaluate("[...window.__seen]"))
        check("whats-new" in seen and "tip" not in seen and "install" not in seen, f"1: on a slow start Có gì mới still comes first and alone ({sorted(seen)})")
        ctx.close()
        # the next app open: Có gì mới is seen, one tip opens, only one
        settings["onboarding"]["whatsNewSeen"] = RELEASE
        ctx, pg = seeded(browser, settings)
        pg.add_init_script(WATCH)
        home(pg)
        pg.wait_for_timeout(5000)
        check("tip" in set(pg.evaluate("[...window.__seen]")), "1: the next app open shows a tip")
        # The first tip of Hôm nay is the share tip now (Để sau), the others close with Đã hiểu
        got = pg.locator('[data-onboarding-card]').get_by_role("button", name=re.compile("^(Đã hiểu|Để sau)$"))
        if got.count():
            got.first.click()
            pg.wait_for_timeout(1500)
        pg.evaluate("window.__seen = new Set()")
        pg.wait_for_timeout(4000)
        check(pg.locator('[data-onboarding-card]:not([data-state="closed"])').count() == 0 and "tip" not in set(pg.evaluate("[...window.__seen]")), "1: and no second tip follows it")
        ctx.close()
        # a tip may come over the field the sheet focused itself (the add tips belong there) but not over one the person has touched or typed in:
        # the sheet marks its own focus (data-autofocused) and the mark goes at the first touch or key
        settings = {"onboarding": {"tourDone": True, "tipsOff": False, "seen": HOME_TIPS, "used": ["share-day"], "replayOpened": True, "tourStartedIso": None, "whatsNewSeen": RELEASE}, **NO_INSTALL}
        ctx, pg = seeded(browser, settings)
        home(pg)
        pg.wait_for_timeout(800)
        pg.locator("#mobile-add-fab").tap()
        pg.locator("[data-add-panel] [data-testid=food-search]").first.wait_for(state="visible", timeout=8000)
        pg.wait_for_function("() => !!document.querySelector('[data-testid=food-search][data-autofocused]')", timeout=4000)
        pg.wait_for_timeout(3000)
        cards = pg.locator('[data-onboarding-card]:not([data-state="closed"])').count()
        check(cards == 1, f"1: untouched, the field the sheet focused itself does not hold a tip back ({cards} cards)")
        ctx.close()
        ctx, pg = seeded(browser, settings)
        home(pg)
        pg.wait_for_timeout(800)
        pg.locator("#mobile-add-fab").tap()
        field = pg.locator("[data-add-panel] [data-testid=food-search]").first
        field.wait_for(state="visible", timeout=8000)
        pg.wait_for_function("() => !!document.querySelector('[data-testid=food-search][data-autofocused]')", timeout=4000)
        field.tap()  # the person touches it: it is theirs now
        flag = pg.evaluate("document.querySelector('[data-testid=food-search]').hasAttribute('data-autofocused')")
        pg.wait_for_timeout(3500)
        focused = pg.evaluate("document.activeElement && document.activeElement.tagName")
        cards = pg.locator('[data-onboarding-card]:not([data-state="closed"])').count()
        check(not flag and focused == "INPUT" and cards == 0, f"1: a tip does not open over a focused search field that was touched (mark gone: {not flag}, {focused}, {cards} cards)")
        ctx.close()
        _seed.onboarding(False)
        _seed.whats_new(False)
        browser.close()


def add_sheet():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        ctx, pg = seeded(browser, NO_INSTALL)
        home(pg)
        pg.wait_for_timeout(1200)

        # ---- 5: hit areas, by what a finger would hit
        # The header's pill is 24 px and the rows sit against it (0 px below, 0 px above the 4 px of paper that frames it), so the only room
        # for a bigger hit area is that paper: 28 px. The rows keep every pixel of theirs (a hit area that reached 10 px into them stole
        # their taps); 44 px would need 16 px more height (OPEN_QUESTIONS). By what a finger would hit, for the first and the second meal:
        probe_js = """() => [...document.querySelectorAll('[data-testid=meal-header]')].filter((e) => e.getClientRects().length).slice(0, 2).map((h) => {
            const hb = h.getBoundingClientRect();
            const rows = [...document.querySelectorAll('button[data-entry-id]')].filter((e) => e.getClientRects().length);
            const above = rows.map((r) => [r, r.getBoundingClientRect()]).filter(([, b]) => b.bottom <= hb.top + 1).sort((a, b) => b[1].bottom - a[1].bottom)[0];
            const below = rows.map((r) => [r, r.getBoundingClientRect()]).filter(([, b]) => b.top >= hb.bottom - 1).sort((a, b) => a[1].top - b[1].top)[0];
            const at = (x, y) => document.elementFromPoint(x, y);
            const cx = hb.left + hb.width / 2;
            const onRow = (r, y) => { const e = at(r.getBoundingClientRect().left + r.getBoundingClientRect().width / 2, y); return !!e && (e === r || r.contains(e)); };
            return {
              belowOk: below ? onRow(below[0], below[1].top + 2) : true,
              aboveOk: above ? onRow(above[0], above[1].bottom - 2) : true,
              // V3: the header is a 44 px target on its own, so a tap on its top edge or its bottom edge lands on it
              headerAbove: (() => { const a = at(cx, hb.top + 2), z = at(cx, hb.bottom - 2); return hb.height >= 43.5 && !!a && (a === h || h.contains(a)) && !!z && (z === h || h.contains(z)); })(),
              headerHeight: hb.height,
            };
          })"""
        for i, r in enumerate(pg.evaluate(probe_js)):
            which = ["first", "second"][i]
            check(r["belowOk"] and r["aboveOk"], f"5: the {which} meal: the rows above and below it are hit at their own edge (the header takes none of their pixels)")
            check(r["headerAbove"], f"5: the {which} meal: the header is a 44 px target and a tap on either of its edges lands on it ({round(r['headerHeight'])} px element)")

        # ---- 3: the add list
        pg.locator("#mobile-add-fab").tap()
        pg.locator("[data-add-panel] [data-testid=food-search]").first.wait_for(state="visible", timeout=8000)
        pg.locator("[data-add-panel] button[data-food-row]").first.wait_for(state="visible", timeout=8000)
        pg.wait_for_timeout(900)
        rows = pg.locator("[data-add-panel] button[data-food-row]").count()
        stops = pg.evaluate("() => [...document.querySelectorAll('[data-add-panel] button, [data-add-panel] a[href], [data-add-panel] input')].filter((e) => !e.disabled && e.tabIndex >= 0 && !e.closest('[inert]')).length")
        nodes = pg.evaluate("() => document.querySelectorAll('[data-add-panel] *').length")
        # Measured on the demo catalogue (43 foods) at 390 px: 34 rows, 112 Tab stops, 598 nodes with the V3 glass header, grabber, switcher and
        # shortcut carousels (before the trim: 49, 140, 616); a small margin each
        check(rows <= 40, f"3: the add list draws {rows} food rows first (measured 34; a few per category, not the whole catalogue)")
        check(stops <= 125, f"3: Tab has {stops} stops in the sheet (measured 112; before 140)")
        check(nodes <= 650, f"3: the sheet is {nodes} nodes (measured 598 with the V3 header; the whole catalogue drew 616 before the per-category trim, and 49 rows)")
        more = pg.get_by_role("button", name=re.compile(r"^Xem thêm .+ \(\d+ món\)$")).first
        check(more.count() == 1, "3: a category with more foods ends in Xem thêm <category> (n món)")
        label = more.inner_text()
        before = pg.locator("[data-add-panel] button[data-food-row]").count()
        more.scroll_into_view_if_needed()
        more.click()
        pg.wait_for_timeout(300)
        check(pg.locator("[data-add-panel] button[data-food-row]").count() > before, f"3: {label!r} adds more rows")
        focus_row = pg.evaluate("(() => { const a = document.activeElement; return a && a.matches('button[data-food-row]') ? a.getAttribute('data-food-id') : null })()")
        check(focus_row is not None, f"3: and focus goes to the first row it brought in ({focus_row})")

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
        tag = pg.evaluate("document.activeElement && document.activeElement.tagName")
        check(tag == "BUTTON", f"4: after a touch, focus is on a button, never on an input that would raise the keyboard ({tag})")
        # a row that was behind "Xem thêm"
        pg.locator("[data-add-panel] [data-testid=food-search]").first.fill("")
        pg.wait_for_timeout(700)
        more = pg.get_by_role("button", name=re.compile(r"^Xem thêm .+ \(\d+ món\)$")).first
        more.scroll_into_view_if_needed()
        more.click()
        pg.wait_for_timeout(400)
        revealed = pg.evaluate("(() => { const a = document.activeElement; return a && a.matches('button[data-food-row]') ? a.getAttribute('data-food-id') : null })()")
        pg.locator(f'[data-add-panel] button[data-food-id="{revealed}"]').tap()
        pg.locator('[data-testid="portion-add"]:visible').first.wait_for(state="visible", timeout=6000)
        pg.wait_for_timeout(400)
        pg.keyboard.press("Escape")
        pg.wait_for_timeout(700)
        back = pg.evaluate("(id) => { const a = document.activeElement; return !!a && a.getAttribute('data-food-id') === id }", revealed)
        check(revealed is not None and back, f"4: a row that was behind Xem thêm gets the focus back too ({revealed})")
        # a card of a carousel (its chevron opens the portion sheet)
        chevron = pg.locator('[data-add-panel] #add-recents button[aria-label^="Chọn khẩu phần"]').first
        if chevron.count():
            label = chevron.get_attribute("aria-label")
            chevron.scroll_into_view_if_needed()
            chevron.tap()
            pg.locator('[data-testid="portion-add"]:visible').first.wait_for(state="visible", timeout=6000)
            pg.wait_for_timeout(400)
            pg.keyboard.press("Escape")
            pg.wait_for_timeout(700)
            back = pg.evaluate("(l) => { const a = document.activeElement; return !!a && a.getAttribute('aria-label') === l }", label)
            check(back, f"4: a carousel card gets the focus back too ({label})")
        else:
            check(False, "4: Gần đây has a card with a portion chevron in the demo")
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
    print(f"\n{len(problems)} problem(s)")
    for m in problems:
        print(" - " + m)
    sys.exit(1 if problems else 0)


main()
