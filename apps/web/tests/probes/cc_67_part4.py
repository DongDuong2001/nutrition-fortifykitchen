"""cc-67 part 4: the 22 micronutrient targets are the VN 2016 recommended amounts for sex and age (390 x 844, demo build).

The sample user is a man born 2003 (23 in 2026): Vi chất shows / 2.500 mg potassium, / 800 mg calcium, / 7,9 mg iron,
/ 2.000 mg sodium, / 850 µg vitamin A; Cài đặt > Mục tiêu says whose amounts they are; the energy target is unchanged
Screenshots: .screenshots/cc67/. Run with: ALIGN_BASE_URL=http://localhost:3101 npm run probe -- tests/probes/cc_67_part4.py
"""
import os
import re
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright
import _demo  # noqa: F401  (demo mode, tour and tips off)

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3100")
SHOTS = Path(__file__).resolve().parent.parent.parent / ".screenshots" / "cc67"
PHONE = dict(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
problems = []


def check(cond, msg):
    print(("[PASS] " if cond else "[FAIL] ") + msg)
    if not cond:
        problems.append(msg)


def main():
    SHOTS.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch()
        ctx = browser.new_context(**PHONE)
        pg = ctx.new_page()

        pg.goto(BASE + "/app", wait_until="networkidle")
        pg.wait_for_timeout(900)
        text = re.sub(r"\s+", " ", pg.locator("body").inner_text())
        check("1.950–2.275" in text, "Hôm nay: the kcal target is unchanged (1.950–2.275)")
        pg.screenshot(path=str(SHOTS / "today-targets.png"))

        pg.goto(BASE + "/micros", wait_until="networkidle")
        pg.wait_for_timeout(900)
        text = re.sub(r"\s+", " ", pg.locator("body").inner_text())
        for want in ["/ 2.500 mg", "/ 800 mg", "/ 7,9 mg", "/ 2.000 mg", "/ 340 mg", "/ 10 mg"]:
            check(want in text, f"Vi chất shows {want}")
        check("5.200" not in text and "6.500" not in text and "1.200–1.500" not in text, "no formula target left (kali theo cân, canxi 1.200–1.500)")
        pg.screenshot(path=str(SHOTS / "micros-targets.png"))

        pg.goto(BASE + "/settings/targets", wait_until="networkidle")
        pg.wait_for_timeout(600)
        text = re.sub(r"\s+", " ", pg.locator("body").inner_text())
        check("Muối" in text and "5 g" in text and "2.000 mg natri" in text, "Mục tiêu: Muối 5 g (2.000 mg natri)")
        check("VN 2016, nam 20–29 tuổi" in text, "Mục tiêu: says whose amounts these are")
        check("1.950–2.275 kcal" in text, "Mục tiêu: the energy rows are unchanged")
        check("Theo khuyến nghị dinh dưỡng Việt Nam 2016" in text, "Mục tiêu: the note names VN 2016")
        pg.screenshot(path=str(SHOTS / "settings-targets.png"), full_page=True)
        ctx.close()
        browser.close()

    print(f"{len(problems)} problem(s)")
    for m in problems:
        print(" -", m)
    sys.exit(1 if problems else 0)


if __name__ == "__main__":
    main()
