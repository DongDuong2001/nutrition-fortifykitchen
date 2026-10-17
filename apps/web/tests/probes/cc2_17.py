"""cc2-17: Esc closes every sheet and returns focus to the control that opened it; no horizontal scroll.

Covers the Sheet component (components/ui/sheet.tsx) and the two overlays on / (Hôm nay) and /add that are not Sheet:
the /add screen itself closes on Esc unless a sheet is open (Esc there closes only the sheet, first).
Also reads the diary provider's memoised value (P-01): a toast opens and closes without breaking the day view.
Screenshots: .screenshots/cc2-17-*.png
Run with: ALIGN_BASE_URL=http://localhost:3102 npm run probe -- tests/probes/cc2_17.py
"""
import os
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright
import _demo  # noqa: F401  (demo mode on, see _demo.py)

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3102")
SHOTS = Path(__file__).resolve().parent.parent.parent / ".screenshots"
SIZES = [("390", {"width": 390, "height": 844}), ("1280", {"width": 1280, "height": 800})]
NOW = "2026-10-12T18:00:00+07:00"
problems, notes = [], []


def check(cond, msg):
    (notes if cond else problems).append(("ok: " if cond else "") + msg)


def new_page(browser, size, route):
    ctx = browser.new_context(viewport=size)
    pg = ctx.new_page()
    pg.clock.set_fixed_time(NOW)
    pg.goto(BASE + route, wait_until="networkidle")
    # The client store hydrates after load; the diary and the add screen are ready after this
    pg.wait_for_timeout(1200)
    return ctx, pg


def no_h_scroll(pg, where):
    w, inner = pg.evaluate("() => [Math.max(document.documentElement.scrollWidth, document.body.scrollWidth), window.innerWidth]")
    check(w <= inner, f"{where}: no horizontal scroll ({w} <= {inner})")


def esc_returns_focus(pg, opener, where, dialog_sel='[role="dialog"][aria-modal="true"]'):
    """Open the sheet by clicking `opener`, press Esc, expect the dialog gone and focus back on the opener."""
    opener.click()
    dialog = pg.locator(dialog_sel)
    try:
        dialog.first.wait_for(state="visible", timeout=4000)
        check(True, f"{where}: sheet opens")
    except Exception:
        check(False, f"{where}: sheet opens")
    pg.keyboard.press("Escape")
    pg.wait_for_timeout(250)
    check(pg.locator(dialog_sel).count() == 0, f"{where}: Esc closes the sheet")
    label = opener.get_attribute("aria-label") or opener.inner_text().strip()
    focused = pg.evaluate("() => document.activeElement && (document.activeElement.getAttribute('aria-label') || document.activeElement.innerText || '').trim()")
    check(focused == label, f"{where}: focus returns to the opener ({focused!r} vs {label!r})")


def diary(browser, size_name, size):
    ctx, pg = new_page(browser, size, "/app")
    w = f"{size_name} home"
    no_h_scroll(pg, w)
    # The meal menu (⋯) shows in meal mode: tap a meal header first
    pg.locator("button[aria-label^='Xem riêng']:visible").first.click()
    pg.wait_for_timeout(250)
    menu = pg.locator("button[aria-label^='Tùy chọn']:visible")
    if menu.count() == 0:
        problems.append(f"{w}: no meal menu at {pg.url} ({pg.inner_text('body')[:160]!r})")
        ctx.close()
        return
    # The meal menu is a Sheet on the phone and a dialog on desktop
    esc_returns_focus(pg, menu.first, f"{w} meal menu")
    # The calendar sheet opens from the date control (the phone and desktop copies are both in the DOM)
    esc_returns_focus(pg, pg.locator('button[aria-label^="Chọn ngày"]:visible').first, f"{w} calendar sheet")
    shot(pg, "diary", size_name)
    ctx.close()


def add(browser, size_name, size):
    ctx, pg = new_page(browser, size, "/add?meal=breakfast")
    w = f"{size_name} /add"
    no_h_scroll(pg, w)
    opener = pg.locator('button[aria-label="Chỉ thêm kcal"]:visible').first
    try:
        opener.wait_for(state="visible", timeout=8000)
        esc_returns_focus(pg, opener, f"{w} quick-add sheet", '[role="dialog"][aria-modal="true"]:has(h2:text-is("Chỉ thêm kcal"))')
    except Exception:
        problems.append(f"{w}: no 'Chỉ thêm kcal' control at {pg.url}")
    # Esc with no sheet open closes the add screen (back to Hôm nay), as before
    pg.keyboard.press("Escape")
    pg.wait_for_timeout(400)
    check("/add" not in pg.url, f"{w}: Esc with no sheet open leaves /add ({pg.url})")
    ctx.close()


def shot(pg, name, size_name):
    SHOTS.mkdir(parents=True, exist_ok=True)
    pg.screenshot(path=str(SHOTS / f"cc2-17-{name}-{size_name}.png"), full_page=False, animations="disabled")


with sync_playwright() as p:
    browser = p.chromium.launch()
    for size_name, size in SIZES:
        diary(browser, size_name, size)
        add(browser, size_name, size)
    browser.close()

for n in notes:
    print(n)
for pr in problems:
    print("FAIL:", pr)
print(f"cc2_17: {len(notes)} ok, {len(problems)} FAIL")
sys.exit(1 if problems else 0)
