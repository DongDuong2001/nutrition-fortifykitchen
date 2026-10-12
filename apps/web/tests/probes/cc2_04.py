"""cc2-04: sweep checks. No bg-white (the card token is used), profile values come from the profile
(not hard-coded), the salt and potassium cards match the calculators, no fixed date in fallback copy.
Run with: ALIGN_BASE_URL=http://localhost:3102 npm run probe -- tests/probes/cc2_04.py
"""
import os
import sys
from playwright.sync_api import sync_playwright

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3102")
PHONE = {"width": 390, "height": 844}
DESKTOP = {"width": 1440, "height": 900}

problems = []
notes = []


def check(cond, msg):
    if cond:
        notes.append("ok: " + msg)
    else:
        problems.append(msg)


def body_text(pg):
    return " ".join(pg.inner_text("body").split())


def test_no_bg_white(browser):
    # bg-white is replaced by bg-card (both #FFFFFF); no element still carries the raw class
    for route in ["/diary", "/micros", "/add?meal=snack", "/foods/new", "/settings/notifications", "/paywall", "/settings/profile"]:
        for vp_name, vp in (("390", PHONE), ("1440", DESKTOP)):
            ctx = browser.new_context(viewport=vp)
            pg = ctx.new_page()
            pg.goto(BASE + route, wait_until="networkidle")
            pg.wait_for_timeout(200)
            count = pg.evaluate("() => document.querySelectorAll('[class~=\"bg-white\"]').length")
            check(count == 0, f"{route} @ {vp_name}: {count} elements still use bg-white")
            ctx.close()


def test_profile_values(browser):
    # The sample profile is 65 kg, goal maintain (Giữ cân), 60 minutes of training
    ctx = browser.new_context(viewport=DESKTOP)
    pg = ctx.new_page()
    pg.goto(BASE + "/training", wait_until="networkidle")
    pg.wait_for_timeout(400)
    txt = body_text(pg)
    check("Giữ cân · 65 kg" in txt, "training @ 1440: subtitle reads the profile goal and weight")
    check("10/10/2026" not in txt, "training @ 1440: no fixed 10/10/2026 date")
    ctx.close()

    ctx = browser.new_context(viewport=DESKTOP)
    pg = ctx.new_page()
    pg.goto(BASE + "/micros", wait_until="networkidle")
    pg.wait_for_timeout(400)
    txt = body_text(pg)
    check("Giữ cân · 65 kg" in txt, "micros @ 1440: subtitle reads the profile goal and weight")
    check("10/10/2026" not in txt, "micros @ 1440: no fixed 10/10/2026 date")
    ctx.close()


def test_today_cards(browser):
    # The desktop salt card and the potassium row come from the calculators for 60 minutes and 65 kg
    ctx = browser.new_context(viewport=DESKTOP)
    pg = ctx.new_page()
    pg.goto(BASE + "/diary", wait_until="networkidle")
    pg.wait_for_timeout(400)
    txt = body_text(pg)
    for expected in ["Ngày tập · 60 phút", "7–10,5 g", "Bù mồ hôi (60′ tập)", "3–4,5 g", "4–6 g", "5.200–6.500 mg"]:
        check(expected in txt, f"today @ 1440: shows '{expected}'")
    ctx.close()

    ctx = browser.new_context(viewport=PHONE)
    pg = ctx.new_page()
    pg.goto(BASE + "/diary", wait_until="networkidle")
    pg.wait_for_timeout(400)
    label = pg.evaluate("() => document.querySelector('svg[role=\"img\"][aria-label*=\"mục tiêu\"]')?.getAttribute('aria-label') || ''")
    check("1.041" in label and "mục tiêu" in label, f"today @ 390: dial label uses vi number format ({label[:80]})")
    ctx.close()


def main():
    print(f"=== Running cc2-04 probe against {BASE} ===")
    with sync_playwright() as p:
        browser = p.chromium.launch()
        test_no_bg_white(browser)
        test_profile_values(browser)
        test_today_cards(browser)
        browser.close()

    print("\n--- Notes ---")
    for n in notes:
        print("  " + n)

    if problems:
        print("\n--- Problems ---")
        for pr in problems:
            print("  FAIL: " + pr)
        sys.exit(1)
    print(f"\nALL {len(notes)} CHECKS PASSED.")


if __name__ == "__main__":
    main()
