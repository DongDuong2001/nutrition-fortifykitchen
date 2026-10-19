"""cc-67 part 4: the 22 micronutrient targets are the VN 2016 recommended amounts for sex and age (390 x 844, demo build).

The sample user is a man born 2003 (23 in 2026): Vi chất shows / 2.500 mg potassium, / 800 mg calcium, / 7,9 mg iron,
/ 850 µg vitamin A; Cài đặt > Mục tiêu says whose amounts they are; the energy target is unchanged
Screenshots: .screenshots/cc67/. Run with: ALIGN_BASE_URL=http://localhost:3101 npm run probe -- tests/probes/cc_67_part4.py
"""
import json
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
        for want in ["/ 2.500 mg", "/ 800 mg", "/ 7,9 mg", "/ 340 mg", "/ 10 mg"]:
            check(want in text, f"Vi chất shows {want}")
        check("5.200" not in text and "6.500" not in text and "1.200–1.500" not in text, "no formula target left (kali theo cân, canxi 1.200–1.500)")
        pg.screenshot(path=str(SHOTS / "micros-targets.png"))

        pg.goto(BASE + "/settings/targets", wait_until="networkidle")
        pg.wait_for_timeout(600)
        text = re.sub(r"\s+", " ", pg.locator("body").inner_text())
        check("Muối" in text and "7–10,5 g" in text, "Mục tiêu: Muối stays the training formula (7–10,5 g)")
        check("VN 2016, nam 20–29 tuổi" in text, "Mục tiêu: says whose amounts these are")
        check("1.950–2.275 kcal" in text, "Mục tiêu: the energy rows are unchanged")
        check("Theo khuyến nghị dinh dưỡng Việt Nam 2016" in text, "Mục tiêu: the note names VN 2016")
        pg.screenshot(path=str(SHOTS / "settings-targets.png"), full_page=True)
        ctx.close()

        # A man and a woman of 30 (born 1996, 30 in 2026): the 30–49 band of VN 2016
        for sex, born, label, wants in [
            ("male", 1996, "nam 30–49 tuổi", ["370 mg", "1,2 mg", "900 µg"]),
            ("female", 1996, "nữ 30–49 tuổi", ["17,4 mg", "290 mg", "700 µg", "1 mg"]),
        ]:
            ctx = browser.new_context(**PHONE)
            profile = '{"sex":"%s","birthYear":%d,"weightKg":65,"goal":"maintain","periodMode":false,"trainingMinutesDefault":60,"displayName":"","hintSeen":true}' % (sex, born)
            ctx.add_init_script("try { localStorage.setItem('h1t_profile_v1_demo', %s); } catch (e) {}" % json.dumps(profile))
            pg = ctx.new_page()
            pg.goto(BASE + "/settings/targets", wait_until="networkidle")
            pg.wait_for_timeout(600)
            text = re.sub(r"\s+", " ", pg.locator("body").inner_text())
            check(f"VN 2016, {label}" in text, f"Mục tiêu {sex} 30: says {label}")
            for want in wants:
                check(want in text, f"Mục tiêu {sex} 30 shows {want}")
            # The tab bar is fixed: left out, it would cut across the full-page shot
            pg.add_style_tag(content="nav { display: none !important; }")
            pg.screenshot(path=str(SHOTS / f"targets-{sex}-30.png"), full_page=True)
            ctx.close()
        browser.close()

    print(f"{len(problems)} problem(s)")
    for m in problems:
        print(" -", m)
    sys.exit(1 if problems else 0)


if __name__ == "__main__":
    main()
