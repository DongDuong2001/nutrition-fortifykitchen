"""cc-67 part 3: the parts of a premade dish can be changed for one meal (390 x 844, demo build).

Phở bò from /add: Thành phần opens with a gram field and − / + 10 g on every part
- Bánh phở 200 → 150 g with − / +: the Tổng and the kcal card follow live; the header says Đã chỉnh; Khôi phục is there
- + Thịt bò puts a part in the list (no separate diary entry); the chip is pressed
- a part set to 0 reads Không dùng and is out of the Tổng
- Khôi phục: the recipe again (200 g, no Khôi phục, the card's kcal as before)
- saving logs ONE row "Phở bò · đã chỉnh" whose kcal is the card's; no separate Thịt bò or Bánh phở row
- an unchanged dish is logged as plain Phở bò
Screenshots: .screenshots/cc67/. Run with: ALIGN_BASE_URL=http://localhost:3101 npm run probe -- tests/probes/cc_67_part3.py
"""
# PROBE_COVERS: app/(app)/(tabs)/app/** app/(app)/add/**
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


def squash(text):
    return re.sub(r"\s+", " ", text)


def meal_kcal(pg, meal):
    """V3: the meal header shows the kcal number without the word ("TRƯA 488")."""
    head = squash(pg.locator(f"section[aria-label='{meal}'] [data-meal-header] >> visible=true").first.inner_text()).strip()
    m = re.search(r"(\d[\d.]*)$", head)
    return int(m.group(1).replace(".", "")) if m else 0


def kcal_of(text):
    m = re.search(r"([\d.]+)\s*kcal", text)
    return int(m.group(1).replace(".", "")) if m else None


def open_dish(pg):
    pg.goto(BASE + "/add", wait_until="networkidle")
    pg.wait_for_timeout(600)
    later = pg.get_by_role("button", name="Để sau")
    if later.count():
        later.first.tap()
        pg.wait_for_timeout(300)
    pg.locator('[data-add-panel] input[type="search"], [data-add-panel] input').first.fill("phở bò")
    pg.wait_for_timeout(600)
    pg.locator("[data-add-panel] button[data-food-row]").filter(has_text="Phở bò").first.tap()
    panel = pg.locator('[data-tour="portion-panel"]:visible').first
    panel.wait_for(state="visible")
    section = pg.locator('[data-tour="dish-parts"]:visible').first
    section.wait_for(state="visible", timeout=8000)
    toggle = section.get_by_role("button", name=re.compile("^Thành phần"))
    # cc-67: the section stays open on this device once a person opened it
    if toggle.get_attribute("aria-expanded") != "true":
        toggle.tap()
    pg.wait_for_timeout(600)
    return panel, section


def card_kcal(panel):
    return kcal_of(squash(panel.locator("div.bg-ink").first.inner_text()))


def main():
    SHOTS.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch()
        ctx = browser.new_context(**PHONE)
        pg = ctx.new_page()
        panel, section = open_dish(pg)
        rows = section.locator("li")
        banh = lambda: rows.nth(0).get_by_label("Số gam Bánh phở (tươi)")  # noqa: E731
        plain_kcal = card_kcal(panel)
        check(plain_kcal is not None, f"the kcal card of the plain dish ({plain_kcal})")
        check(section.get_by_role("button", name="Khôi phục").count() == 0, "unchanged: no Khôi phục")
        check(rows.count() == 9 and "Tổng" in squash(rows.nth(8).inner_text()), "eight parts and a Tổng row")
        total_row = lambda: squash(rows.nth(rows.count() - 1).inner_text())  # noqa: E731
        check("600 g" in total_row(), f"Tổng 600 g ({total_row()!r})")
        parts_kcal = kcal_of(total_row())

        # − five times: 200 → 150 g
        minus = section.get_by_role("button", name="Giảm 10 g Bánh phở (tươi)")
        for _ in range(5):
            minus.tap()
            pg.wait_for_timeout(120)
        pg.wait_for_timeout(400)
        check(banh().input_value() == "150", f"Bánh phở 150 g after five − ({banh().input_value()})")
        check("162 kcal" in squash(rows.nth(0).inner_text()), f"Bánh phở row 162 kcal ({squash(rows.nth(0).inner_text())!r})")
        check("550 g" in total_row(), f"Tổng 550 g ({total_row()!r})")
        check(section.get_by_role("button", name="Khôi phục").count() == 1, "changed: Khôi phục is there")
        check("Đã chỉnh" in squash(section.get_by_role("button", name=re.compile("^Thành phần")).inner_text()), "the header says Đã chỉnh")
        kcal_150 = card_kcal(panel)
        # The dish's own number (450) gives way to its parts added up (413 kcal in the demo, 54 less here)
        check(kcal_150 == kcal_of(total_row()) and kcal_150 == parts_kcal - 54, f"the kcal card is the parts added up: {parts_kcal} - 54 = {kcal_150}")
        check("550 g · đã chỉnh" in squash(panel.inner_text()), "the card says 550 g · đã chỉnh")
        pg.screenshot(path=str(SHOTS / "phobo-edited-parts.png"))

        # A field: type 120
        banh().fill("120")
        pg.wait_for_timeout(300)
        check("520 g" in total_row(), f"typed 120: Tổng 520 g ({total_row()!r})")
        banh().fill("150")
        pg.wait_for_timeout(300)

        # + Thịt bò: a part in the list
        chip = section.get_by_role("button", name=re.compile(r"^\+ Thịt bò"))
        chip.tap()
        pg.wait_for_timeout(500)
        check(chip.get_attribute("aria-pressed") == "true", "+ Thịt bò is pressed")
        check(rows.count() == 10, f"the add-on is a ninth part ({rows.count()} rows with Tổng)")
        added = squash(rows.nth(8).inner_text())
        check("Thịt bò" in added and rows.nth(8).get_by_label(re.compile("^Số gam Thịt bò")).input_value() == "50", f"the part is 50 g ({added!r})")
        check("600 g" in total_row(), f"Tổng 600 g ({total_row()!r})")
        kcal_final = card_kcal(panel)
        check(kcal_final == kcal_of(total_row()) and kcal_final == parts_kcal - 54 + 100, f"the card gained the beef: {kcal_150} → {kcal_final} (50 g of Thịt bò thăn is 100 kcal)")
        pg.screenshot(path=str(SHOTS / "phobo-edited-addon.png"))

        # A part at 0
        rows.nth(1).get_by_label(re.compile("^Số gam")).fill("0")
        pg.wait_for_timeout(300)
        check("Không dùng" in squash(rows.nth(1).inner_text()), "a part at 0 reads Không dùng")
        rows.nth(1).get_by_role("button", name=re.compile("^Tăng 10 g")).tap()
        pg.wait_for_timeout(300)
        check("Không dùng" not in squash(rows.nth(1).inner_text()), "+ puts it back")

        # Khôi phục
        section.get_by_role("button", name="Khôi phục").tap()
        pg.wait_for_timeout(700)
        check(banh().input_value() == "200", f"Khôi phục: Bánh phở is 200 g again ({banh().input_value()})")
        check(chip.get_attribute("aria-pressed") == "false", "Khôi phục: the chip is off")
        check(card_kcal(panel) == plain_kcal, f"Khôi phục: the card is back to the dish's {plain_kcal} ({card_kcal(panel)})")
        check(section.get_by_role("button", name="Khôi phục").count() == 0, "Khôi phục: the button is gone")
        ctx.close()

        # Save the changed dish: ONE row
        ctx = browser.new_context(**PHONE)
        pg = ctx.new_page()
        pg.goto(BASE + "/app", wait_until="networkidle")
        pg.wait_for_timeout(800)
        panel, section = open_dish(pg)
        meal = re.sub(r"^Thêm vào ", "", pg.locator('[data-tour="portion-add"]:visible').first.inner_text().strip())
        pg.goto(BASE + "/app", wait_until="networkidle")
        pg.wait_for_timeout(800)
        text_before = squash(pg.locator(f"section[aria-label='{meal}'] >> visible=true").first.inner_text())
        kcal_before = meal_kcal(pg, meal)
        panel, section = open_dish(pg)
        for _ in range(5):
            section.get_by_role("button", name="Giảm 10 g Bánh phở (tươi)").tap()
            pg.wait_for_timeout(100)
        section.get_by_role("button", name=re.compile(r"^\+ Thịt bò")).tap()
        pg.wait_for_timeout(500)
        kcal_card = card_kcal(panel)
        pg.locator('[data-tour="portion-add"]:visible').first.tap()
        pg.wait_for_url(re.compile(r".*/app(\?.*)?$"))
        pg.wait_for_timeout(1000)
        text = squash(pg.locator(f"section[aria-label='{meal}'] >> visible=true").first.inner_text())
        check(text.count("Phở bò") == 1 and "Phở bò · đã chỉnh" in text, f"{meal}: one row, Phở bò · đã chỉnh ({text[:200]!r})")
        # The demo day's own rows are in the meal too (at lunchtime it holds "Thịt bò nạc"): only rows that were not there before count
        check("Bánh phở" not in text and text.count("Thịt bò") == text_before.count("Thịt bò"), "no separate Bánh phở or Thịt bò row")
        kcal_after = meal_kcal(pg, meal)
        check(kcal_after - kcal_before == kcal_card, f"the meal gained the card's {kcal_card} kcal ({kcal_before} → {kcal_after})")
        pg.screenshot(path=str(SHOTS / "phobo-edited-row.png"))
        # The edited dish is in no list
        pg.goto(BASE + "/add", wait_until="networkidle")
        pg.wait_for_timeout(500)
        pg.locator('[data-add-panel] input[type="search"], [data-add-panel] input').first.fill("phở bò")
        pg.wait_for_timeout(500)
        rows_in_list = pg.locator("[data-add-panel] button[data-food-row]")
        check(all("đã chỉnh" not in squash(rows_in_list.nth(i).inner_text()) for i in range(rows_in_list.count())), "the edited dish is not in the list")
        ctx.close()

        # An unchanged dish is logged as plain Phở bò
        ctx = browser.new_context(**PHONE)
        pg = ctx.new_page()
        panel, section = open_dish(pg)
        meal = re.sub(r"^Thêm vào ", "", pg.locator('[data-tour="portion-add"]:visible').first.inner_text().strip())
        pg.locator('[data-tour="portion-add"]:visible').first.tap()
        pg.wait_for_url(re.compile(r".*/app(\?.*)?$"))
        pg.wait_for_timeout(900)
        text = squash(pg.locator(f"section[aria-label='{meal}'] >> visible=true").first.inner_text())
        check("Phở bò" in text and "đã chỉnh" not in text, "unchanged: plain Phở bò")
        ctx.close()
        browser.close()

    print(f"{len(problems)} problem(s)")
    for m in problems:
        print(" -", m)
    sys.exit(1 if problems else 0)


if __name__ == "__main__":
    main()
