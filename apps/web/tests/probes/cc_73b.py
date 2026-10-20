"""cc-73b: the coach's targets at the upper end (one number each) and the US DRI micronutrients with their upper limits (390 x 844, demo build).

The sample user is a man born 2003 (23 in 2026, DRI stage 19–30, 65 kg, Giữ cân): Hôm nay reads "/ 2.275 kcal" (one number, no range);
Vi chất shows / 3.400 mg potassium, / 1.000 mg calcium, / 8 mg iron, / 400 mg magnesium; Mục tiêu says "DRI, nam 19–30 tuổi", one number per
row, the maximum under the row, the footnote of the DRI; a man and a woman of 30; 5 magnesium capsules (a supplement, 400 mg against the
350 mg limit) make a calm "Vượt mức an toàn (350 mg)" line on Vi chất and its detail on the nutrient page; a training day keeps the
salt and fast carbs ranges. Custom targets are off: no row on Mục tiêu can be tapped.
Screenshots: .screenshots/cc73b/. Run with: ALIGN_BASE_URL=http://localhost:3101 npm run probe -- tests/probes/cc_73b.py
"""
# PROBE_COVERS: app/(app)/(tabs)/app/** app/(app)/micros/** app/(app)/settings/targets/** app/(app)/(dashboard)/training/**
import json
import os
import re
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright
import _demo  # noqa: F401  (demo mode, tour and tips off)

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3100")
SHOTS = Path(__file__).resolve().parent.parent.parent / ".screenshots" / "cc73b"
PHONE = dict(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
problems = []


def check(cond, msg):
    print(("[PASS] " if cond else "[FAIL] ") + msg)
    if not cond:
        problems.append(msg)


def squash(text):
    return re.sub(r"\s+", " ", text)


def body(pg):
    return squash(pg.locator("body").inner_text())


def main():
    SHOTS.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch()
        ctx = browser.new_context(**PHONE)
        pg = ctx.new_page()

        # Hôm nay: the kcal target is one number
        pg.goto(BASE + "/app", wait_until="networkidle")
        pg.wait_for_timeout(900)
        text = body(pg)
        check("/ 2.275 kcal" in text, "Hôm nay: the kcal target is one number (/ 2.275 kcal)")
        check("1.950" not in text and "2.275–" not in text, "Hôm nay: no kcal range left")
        pg.screenshot(path=str(SHOTS / "today-hero.png"))

        # Vi chất: the DRI amounts for a man of 19–30, and no note on a day without a supplement
        pg.goto(BASE + "/micros", wait_until="networkidle")
        pg.wait_for_timeout(900)
        text = body(pg)
        for want in ["/ 3.400 mg", "/ 1.000 mg", "/ 8 mg", "/ 400 mg", "/ 11 mg"]:
            check(want in text, f"Vi chất shows {want}")
        check("Vượt mức an toàn" not in text, "Vi chất: no upper-limit note on the sample day")
        pg.screenshot(path=str(SHOTS / "micros-man.png"))

        # Mục tiêu: one number per row, the maximum under the row, the DRI footnote, nothing to tap
        pg.goto(BASE + "/settings/targets", wait_until="networkidle")
        pg.wait_for_timeout(600)
        text = body(pg)
        check("DRI, nam 19–30 tuổi" in text, "Mục tiêu: says whose amounts these are (DRI, nam 19–30 tuổi)")
        for want in ["2.275 kcal", "143 g", "65 g", "280 g", "32 g", "7–10,5 g", "Tối đa 2.500 mg", "Tối đa 350 mg, chỉ tính từ thực phẩm bổ sung", "Tối đa 40 mg"]:
            check(want in text, f"Mục tiêu shows {want!r}")
        check("Theo khuyến nghị DRI của Mỹ và Canada, đúng tuổi và giới tính của bạn" in text, "Mục tiêu: the footnote names the US and Canadian DRI")
        check("2016" not in text and "Bộ Y tế" not in text, "Mục tiêu: no VN 2016 left")
        check("1.950–2.275" not in text and "104–143" not in text and "33–65" not in text, "Mục tiêu: no coach range left")
        check(pg.locator("main button[data-align-group='targets-row']").count() == 0, "Mục tiêu: custom targets are off, so no row is a button")
        pg.screenshot(path=str(SHOTS / "targets-man-23.png"), full_page=True)
        ctx.close()

        # A man and a woman of 30 (born 1996, 30 in 2026): the 19–30 stage
        for sex, born, label, wants in [
            ("male", 1996, "nam 19–30 tuổi", ["400 mg", "1,2 mg", "900 µg", "11 mg"]),
            ("female", 1996, "nữ 19–30 tuổi", ["18 mg", "310 mg", "700 µg", "1,1 mg", "30 g"]),
        ]:
            ctx = browser.new_context(**PHONE)
            profile = '{"sex":"%s","birthYear":%d,"weightKg":65,"goal":"maintain","periodMode":false,"trainingMinutesDefault":60,"displayName":"","hintSeen":true}' % (sex, born)
            ctx.add_init_script("try { localStorage.setItem('h1t_profile_v1_demo', %s); } catch (e) {}" % json.dumps(profile))
            pg = ctx.new_page()
            pg.goto(BASE + "/settings/targets", wait_until="networkidle")
            pg.wait_for_timeout(600)
            text = body(pg)
            check(f"DRI, {label}" in text, f"Mục tiêu {sex} 30: says {label}")
            for want in wants:
                check(want in text, f"Mục tiêu {sex} 30 shows {want}")
            # The tab bar is fixed: left out, it would cut across the full-page shot
            pg.add_style_tag(content="nav { display: none !important; }")
            pg.screenshot(path=str(SHOTS / f"targets-{sex}-30.png"), full_page=True)
            ctx.close()

        # A day over a limit: five capsules of magnesium (80 mg each, a supplement) are 400 mg against 350 mg
        ctx = browser.new_context(**PHONE)
        pg = ctx.new_page()
        pg.goto(BASE + "/add?meal=lunch", wait_until="networkidle")
        pg.wait_for_timeout(700)
        field = pg.locator('[data-testid="food-search"]:visible').first
        field.fill("CanPrev")
        pg.wait_for_timeout(700)
        pg.locator("[data-add-panel] button[data-food-row]").filter(has_text="CanPrev").first.tap()
        panel = pg.locator('[role="dialog"][aria-labelledby="portion-sheet-title"]')
        panel.locator('[data-testid="portion-add"]').wait_for(state="visible", timeout=5000)
        amount = panel.locator('[data-tour="unit-amount"]')
        amount.fill("5")
        amount.dispatch_event("blur")
        pg.wait_for_timeout(300)
        panel.locator('[data-testid="portion-add"]').click()
        pg.wait_for_url(re.compile(r".*/app(\?.*)?$"))
        pg.wait_for_timeout(900)
        pg.goto(BASE + "/micros", wait_until="networkidle")
        pg.wait_for_timeout(900)
        text = body(pg)
        check("Vượt mức an toàn (350 mg)" in text, "Vi chất: 400 mg of magnesium from a supplement shows Vượt mức an toàn (350 mg)")
        check(text.count("Vượt mức an toàn") == 1, f"Vi chất: only that one nutrient has a note ({text.count('Vượt mức an toàn')})")
        pg.screenshot(path=str(SHOTS / "micros-over-limit.png"))
        pg.goto(BASE + "/micros/magnesium", wait_until="networkidle")
        pg.wait_for_timeout(700)
        text = body(pg)
        check("Vượt mức an toàn (350 mg)" in text, "Magie: the page says Vượt mức an toàn (350 mg)")
        check("chỉ tính cho thực phẩm bổ sung" in text, "Magie: the detail says the limit counts supplements only")
        check("Mục tiêu: 400 mg/ngày" in text, "Magie: the target is 400 mg a day")
        pg.screenshot(path=str(SHOTS / "magnesium-detail-over-limit.png"))
        # Ordinary food does not count: calcium and the rest have no note
        pg.goto(BASE + "/micros/calcium", wait_until="networkidle")
        pg.wait_for_timeout(500)
        check("Vượt mức an toàn" not in body(pg), "Canxi: no note")
        ctx.close()

        # A training day (60 minutes): salt and fast carbs stay ranges
        ctx = browser.new_context(**PHONE)
        pg = ctx.new_page()
        pg.goto(BASE + "/training", wait_until="networkidle")
        pg.wait_for_timeout(900)
        text = body(pg)
        check("7–10,5 g" in text, "Ngày tập: salt stays a range (7–10,5 g)")
        pg.screenshot(path=str(SHOTS / "training-day.png"), full_page=True)
        ctx.close()
        browser.close()

    print(f"{len(problems)} problem(s)")
    for m in problems:
        print(" -", m)
    sys.exit(1 if problems else 0)


if __name__ == "__main__":
    main()
