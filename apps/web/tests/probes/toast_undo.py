"""The add toast (390 x 844 phone, demo build).

0  Every add toast lasts 4 s (a portion, a tray, a copy, a saved meal, a Ngày ăn mẫu, Chỉ ghi kcal); a delete's Hoàn tác keeps 8 s.
1  Every add shows "Đã thêm … · Hoàn tác": a tray of 2, a portion sheet, a second portion add into the same meal (one grouped toast,
   "Đã thêm 2 món"). Hoàn tác removes exactly the entries that add made: both rows of the tray add are gone from Hôm nay and the kcal is back; the
   grouped toast undoes both, and a row that was there before stays.
2  Every action ends its toast at once (Hoàn tác).
3  A tap on the toast does not freeze the clock: the bar keeps moving after the release (a pause is a press, down to up). The keyboard does
   pause it: Tab to the action stops the bar, and it runs again when the focus leaves.
Run with: ALIGN_BASE_URL=http://localhost:3101 npm run probe -- tests/probes/toast_undo.py
"""
# PROBE_COVERS: components/diary-toast.tsx components/ui/toast.tsx lib/diary-store.tsx lib/add-toast.ts components/add/** components/home/**
import json
import os
import re

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


def new_page(browser):
    ctx = browser.new_context(**PHONE)
    ctx.add_init_script("try { localStorage.setItem('h1t_settings_v1_demo', %r) } catch (e) {}" % json.dumps(SEED))
    return ctx, ctx.new_page()


def open_home(pg):
    pg.goto(BASE + "/app", wait_until="networkidle")
    pg.locator("#mobile-add-fab").wait_for(state="visible", timeout=10000)
    pg.wait_for_timeout(1500)


def rows(pg):
    return pg.evaluate("[...document.querySelectorAll('button[data-entry-id]')].filter((e) => e.getClientRects().length).map((e) => e.getAttribute('data-entry-id'))")


def kcal(pg):
    return pg.evaluate(
        "(() => { const h = [...document.querySelectorAll('[aria-label=\"Tổng kcal và dinh dưỡng đa lượng\"]')].find((e) => e.getClientRects().length && !e.closest('[aria-hidden=true]')); return h ? (h.querySelector('span.font-display') || h).textContent : null })()"
    )


def toast(pg):
    return pg.locator(".m-toast[data-state=open], .m-toast:not([data-state=closed])").first


def open_sheet(pg, meal="lunch"):
    pg.goto(BASE + f"/add?meal={meal}", wait_until="networkidle")
    pg.locator("[data-add-panel] [data-testid=food-search]").first.wait_for(state="visible", timeout=8000)
    pg.wait_for_timeout(900)


def tray_add_two(pg):
    pg.locator("[data-add-panel] [data-testid=food-search]").first.fill("trứng")
    toggles = pg.locator("[data-add-panel] [data-testid=tray-toggle]")
    toggles.first.wait_for(state="visible", timeout=8000)
    toggles.nth(0).tap()
    pg.wait_for_timeout(250)
    toggles.nth(1).tap()
    pg.wait_for_timeout(300)
    pg.locator("[data-add-panel] [data-testid=tray-add]").first.tap()


def portion_add(pg, query, nth=0):
    """From a sheet over Hôm nay: pick a row, Thêm in the portion sheet."""
    pg.locator("#mobile-add-fab").tap()
    pg.locator("[data-add-panel] [data-testid=food-search]").first.wait_for(state="visible", timeout=8000)
    pg.wait_for_timeout(900)
    pg.locator("[data-add-panel] [data-testid=food-search]").first.fill(query)
    row = pg.locator("[data-add-panel] button[data-food-row]:visible").nth(nth)
    row.wait_for(state="visible", timeout=8000)
    row.tap()
    pg.locator('[data-testid="portion-add"]:visible').first.wait_for(state="visible", timeout=6000)
    pg.wait_for_timeout(500)
    pg.locator('[data-testid="portion-add"]:visible').first.tap()
    pg.wait_for_url(re.compile(r".*/app(\?.*)?$"), timeout=7000)
    pg.wait_for_timeout(1000)


def bar_scale(pg):
    return pg.evaluate("(() => { const b = document.querySelector('.m-toast:not([data-state=closed]) .m-countdown'); return b ? new DOMMatrix(getComputedStyle(b).transform).a : null })()")


def bar_seconds(pg):
    """How long the toast on screen lasts: its countdown bar's animation duration, in seconds."""
    return pg.evaluate("(() => { const b = document.querySelector('.m-toast:not([data-state=closed]) .m-countdown'); return b ? parseFloat(getComputedStyle(b).animationDuration) : null })()")


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()

        # ---- 1: a tray of 2, then Hoàn tác
        ctx, pg = new_page(browser)
        open_home(pg)
        before_rows, before_kcal = rows(pg), kcal(pg)
        pg.locator("#mobile-add-fab").tap()
        pg.locator("[data-add-panel] [data-testid=food-search]").first.wait_for(state="visible", timeout=8000)
        pg.wait_for_timeout(900)
        tray_add_two(pg)
        pg.wait_for_url(re.compile(r".*/app(\?.*)?$"), timeout=7000)
        pg.wait_for_timeout(1200)
        t = toast(pg)
        text = t.inner_text()
        check("Đã thêm 2 món" in text and "Hoàn tác" in text and "Xem" not in text.replace("Xem lý do", ""), f"tray add of 2: 'Đã thêm 2 món … Hoàn tác' (not Xem) ({text!r})")
        check(bar_seconds(pg) == 4, f"a tray add lasts 4 s ({bar_seconds(pg)})")
        added = [r for r in rows(pg) if r not in before_rows]
        check(len(added) == 2, f"…and two rows rose on Hôm nay ({len(added)})")
        t.get_by_role("button", name="Hoàn tác").tap()
        pg.wait_for_timeout(1200)
        check(rows(pg) == before_rows and kcal(pg) == before_kcal, f"Hoàn tác: both rows are gone and the kcal is back ({kcal(pg)} vs {before_kcal})")
        check(pg.locator(".m-toast:not([data-state=closed])", has_text="Hoàn tác").count() == 0, "…and the toast went with the tap")
        ctx.close()

        # ---- 1b: a portion add; a second into the same meal shares the toast; Hoàn tác takes out both, not the row that was there
        ctx, pg = new_page(browser)
        open_home(pg)
        before_rows, before_kcal = rows(pg), kcal(pg)
        portion_add(pg, "chuối")
        t = toast(pg)
        text = t.inner_text()
        check("Đã thêm" in text and "Hoàn tác" in text, f"portion sheet add: Đã thêm … Hoàn tác ({text!r})")
        check(bar_seconds(pg) == 4, f"a portion add lasts 4 s ({bar_seconds(pg)})")
        portion_add(pg, "cơm")
        t = toast(pg)
        text = t.inner_text()
        grouped = "Đã thêm 2 món" in text
        check(grouped and "Hoàn tác" in text, f"a second add into the meal: one grouped toast with Hoàn tác ({text!r})")
        check(len(rows(pg)) == len(before_rows) + 2, "…two new rows on Hôm nay")
        t.get_by_role("button", name="Hoàn tác").tap()
        pg.wait_for_timeout(1200)
        check(rows(pg) == before_rows and kcal(pg) == before_kcal, "Hoàn tác on the grouped toast: both are gone, the rows that were there stay")
        ctx.close()

        # ---- 2b: a delete's Hoàn tác keeps 8 s
        ctx, pg = new_page(browser)
        pg.goto(BASE + "/entry/item-2", wait_until="networkidle")
        pg.get_by_role("button", name="Xóa món này").first.click()
        pg.wait_for_url(re.compile(r".*/app(\?.*)?$"), timeout=7000)
        pg.wait_for_timeout(600)
        check(bar_seconds(pg) == 8, f"a delete's Hoàn tác lasts 8 s ({bar_seconds(pg)})")
        ctx.close()

        # ---- 3: a tap on the toast does not freeze the clock; the keyboard pauses it
        ctx, pg = new_page(browser)
        open_home(pg)
        pg.locator("#mobile-add-fab").tap()
        pg.locator("[data-add-panel] [data-testid=food-search]").first.wait_for(state="visible", timeout=8000)
        pg.wait_for_timeout(900)
        tray_add_two(pg)
        pg.wait_for_url(re.compile(r".*/app(\?.*)?$"), timeout=7000)
        pg.wait_for_timeout(900)
        t = toast(pg)
        box = t.bounding_box()
        # a tap on the body of the toast (the message, left of the action)
        pg.touchscreen.tap(box["x"] + 24, box["y"] + 20)
        pg.wait_for_timeout(400)
        a = bar_scale(pg)
        pg.wait_for_timeout(900)
        b = bar_scale(pg)
        check(a is not None and b is not None and b < a - 0.01, f"a tap on the toast: the bar keeps moving after the release ({a} → {b})")
        # Tab to the action: the clock stops
        for _ in range(120):
            pg.keyboard.press("Tab")
            if pg.evaluate("!!document.activeElement && !!document.activeElement.closest('.m-toast')"):
                break
        pg.wait_for_timeout(300)
        focused = pg.evaluate("document.activeElement && document.activeElement.textContent")
        c = bar_scale(pg)
        pg.wait_for_timeout(1000)
        d = bar_scale(pg)
        if focused and "Hoàn tác" in focused:
            check(c is not None and d is not None and abs(d - c) < 0.005, f"Tab to the action: the bar stops ({c} → {d})")
            pg.evaluate("document.activeElement.blur()")
            pg.wait_for_timeout(300)
            e = bar_scale(pg)
            pg.wait_for_timeout(900)
            f = bar_scale(pg)
            check(e is not None and f is not None and f < e - 0.01, f"…and runs again when the focus leaves ({e} → {f})")
        else:
            check(False, f"Tab reached the toast's action (focused: {focused!r})")
        ctx.close()
        browser.close()

    print(f"\n{len(problems)} problem(s)")
    for m in problems:
        print(" -", m)
    raise SystemExit(1 if problems else 0)


main()
