"""cc2-19: final UX pass, checked in the UI at 390 and 1280 for the journeys walked in docs/ux-review-final.md.

- (c) Tổng quan › Vi chất: the lowest nutrient is first in the list and its detail link is one tap away
- (d) Tổng quan: the period label keeps "dd/mm – dd/mm" on one line (no break at the dash)
- (e) Khám phá › Giàu canxi: the rich-in list opens and lists foods with the % of target
- (h) Hôm nay on yesterday: read-only (no "Thêm vào" link on a past day)
- (i) Khám phá › food detail › back returns to Khám phá
- no horizontal scroll on the walked screens
Screenshots: .screenshots/cc2-19-*.png
Run with: ALIGN_BASE_URL=http://localhost:3102 npm run probe -- tests/probes/cc2_19.py
"""
import os
import re
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright
import _demo  # noqa: F401  (demo mode on, see _demo.py)
from _home import is_past

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3102")
SHOTS = Path(__file__).resolve().parent.parent.parent / ".screenshots"
SIZES = [("390", {"width": 390, "height": 844}), ("1280", {"width": 1280, "height": 800})]
NOW = "2026-10-15T12:00:00+07:00"
YESTERDAY = "2026-10-14"
problems, notes = [], []


def check(cond, msg):
    (notes if cond else problems).append(("ok: " if cond else "") + msg)


def text(pg):
    return re.sub(r"\s+", " ", pg.inner_text("body"))


def new_page(browser, size, route):
    ctx = browser.new_context(viewport=size)
    pg = ctx.new_page()
    pg.clock.set_fixed_time(NOW)
    pg.goto(BASE + route, wait_until="networkidle")
    pg.wait_for_timeout(500)
    return ctx, pg


def shot(pg, name, size_name):
    SHOTS.mkdir(parents=True, exist_ok=True)
    pg.screenshot(path=str(SHOTS / f"cc2-19-{name}-{size_name}.png"), full_page=True, animations="disabled")


def no_h_scroll(pg, where):
    w, inner = pg.evaluate("() => [Math.max(document.documentElement.scrollWidth, document.body.scrollWidth), window.innerWidth]")
    check(w <= inner, f"{where}: no horizontal scroll ({w} <= {inner})")


def run(browser, size_name, size):
    # (c) + (d): Tổng quan › Vi chất
    ctx, pg = new_page(browser, size, "/trends/micros")
    w = f"{size_name} Vi chất"
    first = pg.locator("button[aria-label^='Vitamin B1 ']").first
    check(first.count() > 0, f"{w}: Vitamin B1 square is present")
    names = pg.eval_on_selector_all("button[aria-label*='%']", "els => els.map(e => e.getAttribute('aria-label'))")
    check(bool(names) and names[0].startswith("Vitamin B1"), f"{w}: lowest nutrient is first ({names[:1]})")
    check(pg.locator("a[href='/micros/b1']").count() > 0, f"{w}: detail link to /micros/b1")
    label = pg.locator("#ov-period").first.inner_text()
    check(" – " in label, f"{w}: period dates use a non-breaking dash ({label!r})")
    no_h_scroll(pg, w)
    shot(pg, "micros", size_name)
    ctx.close()

    # (e): rich-in list
    ctx, pg = new_page(browser, size, "/explore/rich/calcium")
    w = f"{size_name} Giàu canxi"
    check("mục tiêu ngày" in text(pg), f"{w}: rows show % of the daily target")
    no_h_scroll(pg, w)
    shot(pg, "calcium", size_name)
    ctx.close()

    # (h): yesterday is read-only
    ctx, pg = new_page(browser, size, f"/?date={YESTERDAY}")
    w = f"{size_name} Hôm nay, hôm qua"
    check(is_past(pg) and "14/10" in text(pg), f"{w}: the past day is shown (› is enabled, date 14/10)")
    check(pg.locator("a[aria-label^='Thêm vào']").count() == 0, f"{w}: no + Thêm vào on a past meal")
    check(pg.locator("a[href='/add?meal=breakfast']").count() == 0, f"{w}: no add link on a past meal")
    no_h_scroll(pg, w)
    shot(pg, "yesterday", size_name)
    ctx.close()

    # (i): deep link and back
    ctx, pg = new_page(browser, size, "/explore")
    w = f"{size_name} Khám phá → chi tiết → quay lại"
    pg.locator("a[href^='/foods/']").first.click()
    pg.wait_for_url(re.compile(r".*/foods/.*"))
    pg.go_back()
    pg.wait_for_url(re.compile(r".*/explore$"))
    check(pg.url.endswith("/explore"), f"{w}: back returns to Khám phá")
    ctx.close()


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for size_name, size in SIZES:
            run(browser, size_name, size)
        browser.close()
    for n in notes:
        print(n)
    for n in problems:
        print("FAIL: " + n)
    print(f"cc2_19: {len(notes)} ok, {len(problems)} fail")
    sys.exit(1 if problems else 0)


if __name__ == "__main__":
    main()
