"""cc-27c, V3 (v3-micros): the /micros header is the V3 push header and scrolls away with the page.

The old compact 60 px ink bar and the sticky chip bar are gone (V3Micros has neither). Checks at 390x844 and 1280x800:
- exactly one h1 in the DOM (the old page had a second one in the compact bar), "VI CHẤT";
- no [data-micros-compact] element, no inner scroller;
- the ink summary (phone) shows "Thiếu nhiều nhất" and "Xu hướng 7 và 30 ngày"; Back is a 44 px control;
- no horizontal scroll.
Run with: ALIGN_BASE_URL=http://localhost:3102 npm run probe -- tests/probes/cc_27c.py
"""
# PROBE_COVERS: app/(app)/micros/**
import os
import sys

import _demo  # noqa: F401
from playwright.sync_api import sync_playwright

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3104")
SHOTS = os.path.join(os.path.dirname(__file__), "..", "..", ".screenshots")
problems, notes = [], []


def check(cond, msg):
    (notes if cond else problems).append(("ok: " if cond else "FAIL: ") + msg)


def run_one(browser, t, size):
    ctx = browser.new_context(viewport=size)
    pg = ctx.new_page()
    pg.goto(BASE + "/micros", wait_until="networkidle")
    pg.wait_for_selector("h1")
    pg.wait_for_timeout(400)
    check(pg.locator("h1").count() == 1, f"{t}: one h1 in the DOM ({pg.locator('h1').count()})")
    check(pg.locator("h1").first.inner_text().upper() == "VI CHẤT", f"{t}: the h1 is Vi chất")
    check(pg.locator("[data-micros-compact]").count() == 0, f"{t}: no compact bar")
    check(pg.locator('[data-align-container="micros-page"] .overflow-y-auto').count() == 0, f"{t}: no inner scroller")
    back = pg.get_by_role("link", name="Quay lại").first.bounding_box()
    check(back is not None and back["width"] >= 44 and back["height"] >= 44, f"{t}: Back is 44 px {back}")
    if size["width"] < 1024:
        body = pg.inner_text("body")
        check("Thiếu nhiều nhất" in body and "Xu hướng 7 và 30 ngày" in body, f"{t}: the ink summary shows the lacking list and the trends link")
    pg.evaluate("window.scrollTo(0, 600)")
    pg.wait_for_timeout(300)
    check(pg.evaluate("window.scrollY") > 0, f"{t}: the page itself scrolls")
    check(pg.locator("h1").count() == 1, f"{t}: still one h1 scrolled")
    over = pg.evaluate("document.documentElement.scrollWidth - window.innerWidth")
    check(over <= 0, f"{t}: no horizontal scroll ({over})")
    pg.screenshot(path=os.path.join(SHOTS, f"cc-27c-scrolled-{t}.png"))
    ctx.close()


with sync_playwright() as p:
    browser = p.chromium.launch()
    run_one(browser, "390", {"width": 390, "height": 844})
    run_one(browser, "1280", {"width": 1280, "height": 800})
    browser.close()

print("\n".join(notes))
print("\n".join(problems))
print("cc-27c:", len(notes), "ok,", len(problems), "FAIL")
sys.exit(1 if problems else 0)
