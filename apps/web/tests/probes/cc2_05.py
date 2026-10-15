"""cc2-05: editing the profile (Hồ sơ) moves Today's desktop label, Training minutes and the salt cards.
Run with: ALIGN_BASE_URL=http://localhost:3102 py -3 tests/probes/cc2_05.py
"""
import os
import re
import sys
from playwright.sync_api import sync_playwright
import _demo  # noqa: F401  (cc2-15b: demo mode on, see _demo.py)

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3102")
problems, notes = [], []


def check(cond, msg):
    (notes if cond else problems).append(("ok: " if cond else "") + msg)


def body(pg):
    return " ".join(pg.inner_text("body").split())


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        ctx = browser.new_context(viewport={"width": 1440, "height": 900})
        pg = ctx.new_page()

        # Edit the profile through the UI: weight 70 kg, goal Tăng cơ, training 90 phút
        pg.goto(BASE + "/settings/profile/weight", wait_until="networkidle")
        pg.locator("#weight-input").fill("70")
        pg.get_by_role("button", name="Lưu").click()
        pg.wait_for_url("**/settings/profile")
        pg.wait_for_timeout(300)
        pg.locator('[aria-labelledby="profile-goal-label"] button:has-text("Tăng cơ") >> visible=true').first.click()
        pg.get_by_role("button", name="90 phút").click()
        pg.wait_for_timeout(300)

        pg.goto(BASE + "/", wait_until="networkidle")
        pg.wait_for_timeout(600)
        txt = body(pg)
        check(re.search(r"90′\s+Ngày tập\s+muối 8,5", txt) is not None, "diary 1440: the Ngày tập row follows the profile (90′, salt 8,5…)")
        check("Giữ cân" not in txt and "65 kg" not in txt, "diary 1440: no stale Giữ cân or 65 kg")

        pg.goto(BASE + "/training", wait_until="networkidle")
        pg.wait_for_timeout(600)
        txt = body(pg)
        check("Tăng cơ · 70 kg" in txt, "training 1440: subtitle follows the profile")
        check("8,5" in txt, "training 1440: salt total for 90 min shows 8,5")
        browser.close()

    for n in notes:
        print("  " + n)
    for pr in problems:
        print("  FAIL: " + pr)
    if problems:
        sys.exit(1)
    print(f"ALL {len(notes)} CHECKS PASSED.")


if __name__ == "__main__":
    main()
