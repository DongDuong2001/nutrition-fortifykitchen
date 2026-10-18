"""cc-53: food unit portions and switching between units and grams.

Tests at 390x844:
1. Chuối opens on Trái -> Vừa x2 -> Hôm nay "2 trái vừa"
2. Cơm opens on Gam -> 180 -> Chén shows nearest size
3. Mì ý (khô) on Gam -> 80 g (no toggle)
4. Trứng gà -> Gam -> Lòng trắng (switches food to Lòng trắng trứng gà)
5. Bún đậu x1,5 phần -> "1,5 phần"
6. CanPrev x2 viên -> no grams displayed
7. Red Bull (Lon | Gam) and Dầu ăn (Muỗng | Gam)
Run with: ALIGN_BASE_URL=http://localhost:3100 npm run probe -- tests/probes/cc_53_units.py
"""
import os
import re
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright
import _demo  # noqa: F401

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3100")
SHOTS = Path(__file__).resolve().parent.parent.parent / ".screenshots"
SHOTS.mkdir(exist_ok=True)
PHONE = {"width": 390, "height": 844}
problems = []


def check(cond, msg):
    print(("[PASS] " if cond else "[FAIL] ") + msg)
    if not cond:
        problems.append(msg)


def go(pg, route, wait=600):
    pg.goto(BASE + route, wait_until="networkidle")
    pg.wait_for_timeout(wait)


def run_probe():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context(viewport=PHONE)
        # Clear settings/diary to start clean
        pg = ctx.new_page()

        # 1. Chuối: opens on Trái -> Vừa x2 -> Hôm nay "2 trái vừa"
        print("\n--- 1. Chuối (Trái -> Vừa x2 -> Hôm nay 2 trái vừa) ---")
        go(pg, "/foods/food-chuoi", 800)
        toggle = pg.locator('[data-tour="unit-toggle"]')
        check(toggle.count() == 1, "Chuối has unit toggle")
        tabs = toggle.locator('[role="tab"]')
        check(tabs.count() == 2, "Chuối toggle has 2 tabs")
        first_tab = tabs.first
        check("Trái" in first_tab.inner_text() and first_tab.get_attribute("aria-selected") == "true", "Chuối opens on Trái tab")

        # Size chips: Vừa, Nhỏ, Lớn
        size_chips = pg.locator('[data-tour="unit-size"]')
        check(size_chips.count() == 3, f"Chuối has 3 size chips (found {size_chips.count()})")
        chip_texts = [size_chips.nth(i).inner_text().strip() for i in range(size_chips.count())]
        check("Vừa" in chip_texts and "Nhỏ" in chip_texts and "Lớn" in chip_texts, f"Size words only: {chip_texts}")
        check(all("g" not in t.lower() for t in chip_texts), f"No gram numbers in size chips: {chip_texts}")

        # Active chip is Vừa
        vua_chip = size_chips.filter(has_text="Vừa").first
        check(vua_chip.get_attribute("aria-pressed") == "true", "Vừa is active size chip")

        # Stepper: change amount to 2
        amount_input = pg.locator('[data-tour="unit-amount"]')
        check(amount_input.count() == 1, "Typed amount input exists")
        check(amount_input.input_value() == "1", "Initial amount is 1")

        # Click plus button to reach 2
        plus_btn = pg.locator('button[aria-label="Tăng số lượng"]')
        plus_btn.click()
        pg.wait_for_timeout(200)
        plus_btn.click()
        pg.wait_for_timeout(200)
        # 1 -> 1.5 -> 2
        check(amount_input.input_value() == "2", f"Amount after two clicks is 2 (got {amount_input.input_value()})")

        # Check kcal calculation: 2 * 118g * 89 / 100 = ~210 kcal
        macro_text = pg.locator("main").inner_text()
        check(re.search(r"210\s+kcal", macro_text) is not None, "Calculates kcal for 2 trái vừa: 210 kcal")

        # Add food to breakfast
        add_btn = pg.locator('[data-tour="food-add-cta"]')
        check(add_btn.count() >= 1, "Thêm button found")
        add_btn.click()
        pg.wait_for_timeout(1000)

        # Check Hôm nay (/app) shows "2 trái vừa"
        go(pg, "/app", 1000)
        app_text = pg.locator("body").inner_text()
        check("2 trái vừa" in app_text, f"Hôm nay row shows '2 trái vừa'")
        pg.screenshot(path=str(SHOTS / "cc-53-chuoi-390.png"))

        # 2. Cơm trắng (chín): opens on Gam -> 180 -> Chén shows nearest size
        print("\n--- 2. Cơm trắng (Gam -> 180 -> Chén shows nearest size) ---")
        go(pg, "/foods/food-com-trang", 800)
        toggle = pg.locator('[data-tour="unit-toggle"]')
        check(toggle.count() == 1, "Cơm has unit toggle")
        tabs = toggle.locator('[role="tab"]')
        gam_tab = tabs.first
        check("Gam" in gam_tab.inner_text() and gam_tab.get_attribute("aria-selected") == "true", "Cơm opens on Gam tab")

        # Type 180 into gram input
        gram_input = pg.locator("#portion-grams-input")
        check(gram_input.count() == 1, "Gram input exists on Gam tab")
        gram_input.fill("180")
        pg.wait_for_timeout(300)

        # Switch to Chén tab
        chen_tab = tabs.filter(has_text="Chén").first
        chen_tab.click()
        pg.wait_for_timeout(400)

        # Check nearest size chosen: 180g is 1 chén đầy
        active_chip = pg.locator('[data-tour="unit-size"][aria-pressed="true"]')
        check(active_chip.count() == 1 and "Đầy" in active_chip.inner_text(), f"Nearest size selected is 'Đầy' ({active_chip.inner_text()})")
        amount_val = pg.locator('[data-tour="unit-amount"]').input_value()
        check(amount_val == "1", f"Amount for 180g chén đầy is 1 (got {amount_val})")
        pg.screenshot(path=str(SHOTS / "cc-53-com-390.png"))

        # 3. Mì ý (khô): on Gam -> 80 g (no toggle)
        print("\n--- 3. Mì ý khô (No toggle, 80 g) ---")
        go(pg, "/foods/food-mi-y-kho", 800)
        toggle = pg.locator('[data-tour="unit-toggle"]')
        check(toggle.count() == 0, "Mì ý has no unit toggle (all portions in grams)")
        gram_chips = pg.locator("button:has-text('80 g')")
        check(gram_chips.count() >= 1, "80 g chip present")
        gram_chips.first.click()
        pg.wait_for_timeout(200)
        macro_text = pg.locator("main").inner_text()
        # 80g * 371 / 100 = 297 kcal
        check(re.search(r"297\s+kcal", macro_text) is not None, "Calculates kcal for 80 g: 297 kcal")
        pg.screenshot(path=str(SHOTS / "cc-53-mi-y-390.png"))

        # 4. Trứng gà -> Gam -> Lòng trắng
        print("\n--- 4. Trứng gà (Gam -> Lòng trắng part chip) ---")
        go(pg, "/foods/food-trung-ga", 800)
        toggle = pg.locator('[data-tour="unit-toggle"]')
        check(toggle.count() == 1, "Trứng gà has unit toggle")
        # Check egg size chip shows hint (50–55 g)
        size_chip = pg.locator('[data-tour="unit-size"]').first
        check("50–55 g" in size_chip.inner_text(), f"Egg size chip shows hint: {size_chip.inner_text()}")

        # Switch to Gam tab
        gam_tab = toggle.locator('[role="tab"]:has-text("Gam")').first
        gam_tab.click()
        pg.wait_for_timeout(300)

        # Check chicken egg part chips: Cả quả | Lòng trắng | Lòng đỏ
        part_group = pg.locator('[role="group"][aria-label="Phần trứng"]')
        check(part_group.count() == 1, "Phần trứng group present on Gam tab")
        white_chip = part_group.locator('button:has-text("Lòng trắng")')
        check(white_chip.count() == 1, "Lòng trắng chip found")
        white_chip.click()
        pg.wait_for_url(re.compile(r".*/foods/food-long-trang-trung-ga.*"), timeout=5000)
        pg.wait_for_timeout(500)

        # Food should switch to Lòng trắng trứng gà
        body_text = pg.locator("body").inner_text()
        check("lòng trắng trứng gà" in body_text.lower(), "Food switched to Lòng trắng trứng gà")
        pg.screenshot(path=str(SHOTS / "cc-53-trung-white-390.png"))

        # 5. Bún đậu x1,5 phần
        print("\n--- 5. Bún đậu (x1,5 phần) ---")
        go(pg, "/foods/food-bun-dau", 800)
        toggle = pg.locator('[data-tour="unit-toggle"]')
        check(toggle.count() == 1, "Bún đậu has unit toggle")
        first_tab = toggle.locator('[role="tab"]').first
        check("Phần" in first_tab.inner_text() and first_tab.get_attribute("aria-selected") == "true", "Bún đậu opens on Phần tab")

        # Set amount to 1.5
        amount_input = pg.locator('[data-tour="unit-amount"]')
        amount_input.fill("1,5")
        amount_input.dispatch_event("blur")
        pg.wait_for_timeout(300)

        # 1.5 * 350g = 525g, 1.5 * 350 * 145 / 100 = 761 kcal
        macro_text = pg.locator("main").inner_text()
        check(re.search(r"761\s+kcal", macro_text) is not None, "Calculates kcal for 1,5 phần: 761 kcal")
        pg.screenshot(path=str(SHOTS / "cc-53-bun-dau-390.png"))

        # 6. CanPrev x2 viên, no grams
        print("\n--- 6. CanPrev (Unit tab only, x2 viên, no grams) ---")
        go(pg, "/foods/11111111-2222-4333-8444-555555555555", 800)
        toggle = pg.locator('[data-tour="unit-toggle"]')
        check(toggle.count() == 0, "CanPrev has NO toggle (unit tab only)")
        check(pg.locator("#portion-grams-input").count() == 0, "No gram field displayed for CanPrev")

        # Stepper exists with 0.5 steps
        amount_input = pg.locator('[data-tour="unit-amount"]')
        check(amount_input.count() == 1, "Stepper input present")
        amount_input.fill("2")
        amount_input.dispatch_event("blur")
        pg.wait_for_timeout(300)

        main_text = pg.locator("main").inner_text()
        check("2 viên" in main_text, "Shows 2 viên")
        check("0 kcal" in main_text, "0 kcal behaviour maintained")
        pg.screenshot(path=str(SHOTS / "cc-53-canprev-390.png"))

        # 7. Red Bull and Dầu ăn
        print("\n--- 7. Red Bull (Lon) and Dầu ăn (Muỗng) ---")
        go(pg, "/foods/food-red-bull", 600)
        toggle = pg.locator('[data-tour="unit-toggle"]')
        check(toggle.count() == 1 and "Lon" in toggle.inner_text(), "Red Bull toggle has Lon")

        go(pg, "/foods/food-dau-an", 600)
        toggle = pg.locator('[data-tour="unit-toggle"]')
        check(toggle.count() == 1 and "Muỗng" in toggle.inner_text(), "Dầu ăn toggle has Muỗng")

        ctx.close()
        browser.close()


if __name__ == "__main__":
    run_probe()
    print("\nSummary:")
    if problems:
        print(f"FAILED with {len(problems)} issues:")
        for prob in problems:
            print(f"  - {prob}")
        sys.exit(1)
    else:
        print("ALL CHECKS PASSED")
        sys.exit(0)
