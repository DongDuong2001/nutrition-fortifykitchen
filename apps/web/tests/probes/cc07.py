"""cc-07, V3 (v3-micros): the Vi chất groups. Phone: a Khoáng chất / Vitamin segmented pair over one list, then Đạm, Chất béo,
Tinh bột and Tổng quan as closed accordions. Desktop: six chips that scroll to a group (two columns, all open).
Run with: ALIGN_BASE_URL=http://localhost:3102 npm run probe -- tests/probes/cc07.py
"""
# PROBE_COVERS: app/(app)/micros/**
import os
import sys

from playwright.sync_api import sync_playwright
import _demo  # noqa: F401  (cc2-15b: demo mode on, see _demo.py)

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3100")
SHOTS = os.path.join(os.path.dirname(__file__), "..", "..", ".screenshots")
PHONE = {"width": 390, "height": 844}
DESKTOP = {"width": 1440, "height": 900}
KEYS = ["vitamins", "minerals", "protein", "lipids", "carbs", "general"]
problems = []
notes = []


def check(cond, msg):
    if cond:
        notes.append("ok: " + msg)
    else:
        problems.append(msg)


def run_phone(browser):
    ctx = browser.new_context(viewport=PHONE)
    pg = ctx.new_page()
    pg.goto(BASE + "/micros", wait_until="networkidle")
    pg.wait_for_selector('[data-tour="micros-groups"] button[aria-pressed]', timeout=30000)
    pg.wait_for_timeout(2500)  # a dev server may reload once while it compiles
    seg = pg.locator('[data-tour="micros-groups"] button[aria-pressed] >> visible=true')
    check(seg.count() == 2, f"390: the segmented pair has two buttons ({seg.count()})")
    check("Khoáng chất" in seg.nth(0).inner_text() and seg.nth(0).get_attribute("aria-pressed") == "true", "390: Khoáng chất is first and selected")
    check("Vitamin" in seg.nth(1).inner_text(), "390: Vitamin is second")
    rows = lambda: pg.locator('main a[href^="/micros/"] >> visible=true').count()
    mineral_rows = rows()
    check(mineral_rows >= 9, f"390: the mineral list shows its rows ({mineral_rows})")
    check(pg.locator("#group-vitamins, #group-minerals").count() == 0, "390: vitamins and minerals are not accordions on the phone")

    seg.nth(1).click()
    pg.wait_for_timeout(900)
    check(pg.locator('a[href="/micros/b1"] >> visible=true').count() == 1, "390: Vitamin rows show after the tap")
    check(seg.nth(1).get_attribute("aria-pressed") == "true" and seg.nth(0).get_attribute("aria-pressed") == "false", "390: the tapped segment is the selected one")
    pg.screenshot(path=os.path.join(SHOTS, "cc07-vitamin-390.png"), animations="disabled")

    # The four accordions start closed, open on a tap and close again
    for key in ["protein", "lipids", "carbs", "general"]:
        head = pg.locator(f"#group-{key} button[aria-expanded]")
        check(head.get_attribute("aria-expanded") == "false", f"390 {key}: closed at first")
        head.click()
        pg.wait_for_timeout(900)
        check(head.get_attribute("aria-expanded") == "true" and pg.locator(f"#group-{key} a[href^='/micros/'] >> visible=true").count() > 0, f"390 {key}: opens with its rows")
    pg.screenshot(path=os.path.join(SHOTS, "cc07-open-390.png"), animations="disabled")
    ctx.close()


def run_desktop(browser):
    ctx = browser.new_context(viewport=DESKTOP)
    pg = ctx.new_page()
    pg.goto(BASE + "/micros", wait_until="networkidle")
    pg.wait_for_timeout(800)
    chips = pg.locator('main button[aria-pressed] >> visible=true')
    check(chips.count() == 6, f"1440: six group chips ({chips.count()})")
    for i, key in enumerate(KEYS):
        # A dev server may reload the page once while it compiles (Fast Refresh): tap again once it is back
        for attempt in range(2):
            chips.nth(i).click()
            pg.wait_for_timeout(1200)
            if pg.locator(f"#desktop-group-{key}").count() == 1:
                break
            pg.wait_for_selector(f"#desktop-group-{key}", timeout=15000)
        top = pg.evaluate("(k) => document.getElementById('desktop-group-' + k).getBoundingClientRect().top", key)
        win = pg.evaluate("[window.scrollY, document.documentElement.scrollHeight - window.innerHeight]")
        tag = f"1440 tap {key}"
        check(chips.nth(i).get_attribute("aria-pressed") == "true", f"{tag}: tapped chip is active")
        check(0 <= top <= 60 or win[0] >= win[1] - 2, f"{tag}: group lands at the top of the viewport ({top:.1f})")
    ctx.close()


def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        run_phone(browser)
        run_desktop(browser)
        browser.close()


if __name__ == "__main__":
    run()
    print("\n".join(notes))
    print("PROBLEMS:", problems or "none")
    sys.exit(1 if problems else 0)
