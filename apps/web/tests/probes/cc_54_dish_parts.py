"""cc-54 phase 1: "Thành phần" of a premade Vietnamese dish and its add-ons (390 x 844, demo build).

Phở bò (the demo catalogue's dish, answering to vn_table|food-pho-bo) from /add:
- the section is there, collapsed (aria-expanded false), with its three add-on chips under it
- opened (the shared Expand), 8 rows of name · grams · kcal for 1 tô (600 g): Bánh phở 200 g = 216 kcal
- the portion ×2 doubles the grams and the chips' grams
- cc-67: a part's grams are a field now and a chip adds a part to the list (no separate diary entries): cc_67_part3.py
- a food without a recipe (Yến mạch) has no Thành phần; Hôm nay's tutorial target and the screenshots
Screenshots: .screenshots/cc54/. Run with: ALIGN_BASE_URL=http://localhost:3107 npm run probe -- tests/probes/cc_54_dish_parts.py
"""
# PROBE_COVERS: app/(app)/add/**
import os
import re
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright
import _demo  # noqa: F401  (demo mode, tour and tips off)

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from alignment import check_align_groups  # noqa: E402

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3100")
SHOTS = Path(__file__).resolve().parent.parent.parent / ".screenshots" / "cc54"
PHONE = dict(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
MEAL_NAME = {"Bữa sáng", "Bữa trưa", "Bữa phụ", "Bữa tối"}
problems = []


def check(cond, msg):
    print(("[PASS] " if cond else "[FAIL] ") + msg)
    if not cond:
        problems.append(msg)


def squash(text):
    return re.sub(r"\s+", " ", text)


def open_food(pg, query, name):
    pg.goto(BASE + "/add", wait_until="networkidle")
    pg.wait_for_timeout(600)
    later = pg.get_by_role("button", name="Để sau")
    if later.count():
        later.first.tap()
        pg.wait_for_timeout(300)
    pg.locator('[data-add-panel] input[type="search"], [data-add-panel] input').first.fill(query)
    pg.wait_for_timeout(600)
    pg.locator("[data-add-panel] button[data-food-row]").filter(has_text=name).first.tap()
    pg.locator('[data-tour="portion-panel"]:visible').first.wait_for(state="visible")
    pg.wait_for_timeout(500)


def meal_of_cta(pg):
    cta = pg.locator('[data-tour="portion-add"]:visible').first.inner_text()
    return cta.replace("Thêm vào ", "").strip()


def section_text(pg, meal):
    return squash(pg.locator(f"section[aria-label='{meal}'] >> visible=true").first.inner_text())


def kcal_of(text):
    m = re.search(r"([\d.]+)\s*kcal", text)
    return int(m.group(1).replace(".", "")) if m else None


def main():
    SHOTS.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch()
        ctx = browser.new_context(**PHONE)
        pg = ctx.new_page()

        open_food(pg, "phở bò", "Phở bò")
        section = pg.locator('[data-tour="dish-parts"]:visible').first
        section.wait_for(state="visible", timeout=8000)
        toggle = section.get_by_role("button", name=re.compile("^Thành phần"))
        check(toggle.get_attribute("aria-expanded") == "false", "Phở bò: Thành phần is collapsed by default")
        chips = section.locator("button[aria-pressed]").filter(has_text=re.compile(r"^\+"))
        check(chips.count() == 3, f"Phở bò: three add-on chips ({chips.count()})")
        check("+ Bánh phở 100 g" in squash(chips.nth(0).inner_text()), f"Phở bò: the first chip is + Bánh phở 100 g ({chips.nth(0).inner_text()!r})")
        check(section.locator("li").count() == 0, "Phở bò: no rows drawn while collapsed")
        pg.screenshot(path=str(SHOTS / "phobo-collapsed.png"))

        toggle.tap()
        pg.wait_for_timeout(600)
        check(toggle.get_attribute("aria-expanded") == "true", "Phở bò: Thành phần opens")
        rows = section.locator("li")
        check(rows.count() == 9, f"Phở bò: eight ingredient rows and the Tổng row ({rows.count()})")
        first = squash(rows.nth(0).inner_text())
        check("Bánh phở" in first and "216 kcal" in first, f"Phở bò: Bánh phở, 216 kcal for 1 tô ({first!r})")
        check(rows.nth(0).get_by_label("Số gam Bánh phở (tươi)").input_value() == "200", "Phở bò: Bánh phở is 200 g in its field")
        check(all("kcal" in squash(rows.nth(i).inner_text()) for i in range(rows.count())), "Phở bò: every ingredient is in the demo catalogue, so every row has kcal")
        res = check_align_groups(pg, "dish-parts")
        check(not res["errors"] and res["pairs"].get("dish-parts", 0) >= 8, f"Phở bò: rows share edges ({res['errors']}, pairs {res['pairs'].get('dish-parts', 0)})")
        pg.screenshot(path=str(SHOTS / "phobo-expanded.png"))

        # ×2: the grams double
        amount = pg.locator('input[aria-label="Số lượng"]:visible, input[aria-label="Số gam"]:visible').first
        before = amount.input_value()
        amount.fill("2" if "," in before or before.replace(".", "").isdigit() and float(before.replace(",", ".")) < 20 else "1200")
        pg.wait_for_timeout(500)
        row2 = section.locator("li").nth(0)
        check(row2.get_by_label("Số gam Bánh phở (tươi)").input_value() == "400" and "432 kcal" in squash(row2.inner_text()), f"Phở bò ×2: Bánh phở 400 g, 432 kcal ({squash(row2.inner_text())!r})")
        check("+ Bánh phở 200 g" in squash(chips.nth(0).inner_text()), f"Phở bò ×2: the chip says 200 g ({chips.nth(0).inner_text()!r})")
        amount.fill(before)
        pg.wait_for_timeout(400)

        ctx.close()

        # A food with no recipe has no section
        ctx = browser.new_context(**PHONE)
        pg = ctx.new_page()
        open_food(pg, "yến mạch", "Yến mạch")
        check(pg.locator('[data-tour="dish-parts"]:visible').count() == 0, "Yến mạch: no Thành phần")
        ctx.close()
        browser.close()

    print(f"{len(problems)} problem(s)")
    for m in problems:
        print(" -", m)
    sys.exit(1 if problems else 0)


if __name__ == "__main__":
    main()
