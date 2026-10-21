"""Hao 21/10: a part of a dish can be swapped for an alternative food (390 x 844, demo build).

Bánh khoai nướng Minh Hào (the demo catalogue's dish, answering to fortify_kitchen|fortify_kitchen:banh-khoai-nuong). The demo catalogue
names some ingredients its own way, so the probe reads the names from the selects instead of hard-coding them:
- Thành phần opens on 12 parts; four of them (sữa chua, bột hạnh nhân, hạnh nhân, siro cây phong) have an "Đổi nguyên liệu" select
- sữa chua → the Hy Lạp alternative: the part's name changes, the grams stay, "Đã chỉnh" shows and the Tổng kcal changes
- bột hạnh nhân → bột mì: the part is named Bột mì, same grams; hạnh nhân → hạt bí: same grams, the part is named Hạt bí; grams typed stay with the part through a swap
- Khôi phục takes the swaps (and the "Đã chỉnh" line) away, the Tổng is back where it began
- logging a swapped cake: ONE row "Bánh khoai nướng Minh Hào · đã chỉnh"
- the parts rows still share edges (data-align-group dish-parts)
Screenshots: .screenshots/cc74/. Run with: ALIGN_BASE_URL=http://localhost:3105 npm run probe -- tests/probes/cc_74_dish_swap.py
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
SHOTS = Path(__file__).resolve().parent.parent.parent / ".screenshots" / "cc74"
PHONE = dict(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
problems = []


def check(cond, msg):
    print(("[PASS] " if cond else "[FAIL] ") + msg)
    if not cond:
        problems.append(msg)


def squash(text):
    return re.sub(r"\s+", " ", text)


def kcal_of(text):
    m = re.search(r"([\d.]+)\s*kcal", text)
    return int(m.group(1).replace(".", "")) if m else None


def open_cake(pg):
    pg.goto(BASE + "/add", wait_until="networkidle")
    pg.wait_for_timeout(600)
    later = pg.get_by_role("button", name="Để sau")
    if later.count():
        later.first.tap()
        pg.wait_for_timeout(300)
    pg.locator('[data-add-panel] input[type="search"], [data-add-panel] input').first.fill("bánh khoai")
    pg.wait_for_timeout(600)
    pg.locator("[data-add-panel] button[data-food-row]").filter(has_text="Bánh khoai nướng").first.tap()
    pg.locator('[data-tour="portion-panel"]:visible').first.wait_for(state="visible")
    section = pg.locator('[data-tour="dish-parts"]:visible').first
    section.wait_for(state="visible", timeout=8000)
    section.get_by_role("button", name=re.compile("^Thành phần")).tap()
    pg.wait_for_timeout(700)
    return section


def total_kcal(section):
    return kcal_of(squash(section.locator("li").last.inner_text()))


def main():
    SHOTS.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch()
        ctx = browser.new_context(**PHONE)
        pg = ctx.new_page()
        section = open_cake(pg)

        rows = section.locator("li")
        check(rows.count() == 13, f"cake: twelve parts and the Tổng row ({rows.count()})")
        selects = section.locator("select")
        check(selects.count() == 4, f"cake: four parts can be swapped ({selects.count()})")
        start = total_kcal(section)
        check(start is not None and 150 < start < 300, f"cake: 1 miếng has a Tổng ({start} kcal)")
        check("Đã chỉnh" not in squash(section.inner_text()), "cake: not edited to begin with")
        names = [re.sub(r"^Đổi nguyên liệu ", "", selects.nth(i).get_attribute("aria-label")) for i in range(4)]
        yogurt, almond = selects.nth(0), selects.nth(2)
        yogurt_options = [o.inner_text() for o in yogurt.locator("option").all()]
        check(len(yogurt_options) == 2 and yogurt_options[0] == names[0], f"yogurt: two options, the recipe's own first ({yogurt_options})")
        greek = yogurt_options[1]
        check("Hy Lạp" in greek, f"yogurt: the alternative is the Hy Lạp one ({greek!r})")
        flour = selects.nth(1)
        wheat = [o.inner_text() for o in flour.locator("option").all()][1]
        check("mì" in wheat.lower(), f"bột hạnh nhân: the alternative is bột mì ({wheat!r})")
        seeds = [o.inner_text() for o in almond.locator("option").all()][1]
        check("bí" in seeds.lower(), f"hạnh nhân: the alternative is hạt bí ({seeds!r})")
        res = check_align_groups(pg, "dish-parts")
        check(not res["errors"] and res["pairs"].get("dish-parts", 0) >= 12, f"cake: rows share edges ({res['errors']}, pairs {res['pairs'].get('dish-parts', 0)})")
        pg.screenshot(path=str(SHOTS / "cake-expanded.png"))

        grams_before = section.get_by_label(f"Số gam {names[0]}").input_value()
        yogurt.select_option(label=greek)
        pg.wait_for_timeout(500)
        check(section.get_by_label(f"Số gam {greek}").input_value() == grams_before, f"yogurt → Hy Lạp: same grams ({grams_before})")
        check("Đã chỉnh" in squash(section.inner_text()), "yogurt → Hy Lạp: Đã chỉnh shows")
        greek_total = total_kcal(section)
        check(greek_total is not None and greek_total != start, f"yogurt → Hy Lạp: the Tổng changes ({start} → {greek_total} kcal)")
        pg.screenshot(path=str(SHOTS / "cake-greek.png"))

        flour_grams = section.get_by_label(f"Số gam {names[1]}").input_value()
        flour.select_option(label=wheat)
        pg.wait_for_timeout(500)
        check(section.get_by_label(f"Số gam {wheat}").input_value() == flour_grams, f"bột hạnh nhân → bột mì: same grams ({flour_grams})")
        almond.select_option(label=seeds)
        pg.wait_for_timeout(500)
        check(section.get_by_label(f"Số gam {seeds}").count() == 1, f"hạnh nhân → hạt bí: the part is named {seeds}")
        # 1,5 g of nuts per miếng: the kcal hardly move, so only the name and the grams are checked
        check(section.get_by_label(f"Số gam {seeds}").input_value() == "1,5", "hạnh nhân → hạt bí: same grams (1,5)")
        # the grams typed stay with the part through a swap
        section.get_by_label(f"Số gam {seeds}").fill("30")
        pg.wait_for_timeout(300)
        almond.select_option(index=0)
        pg.wait_for_timeout(400)
        check(section.get_by_label(f"Số gam {names[2]}").input_value() == "30", "swapping back keeps the 30 g typed")
        almond.select_option(label=seeds)
        pg.wait_for_timeout(300)

        section.get_by_role("button", name="Khôi phục").tap()
        pg.wait_for_timeout(600)
        check("Đã chỉnh" not in squash(section.inner_text()), "Khôi phục: Đã chỉnh is gone")
        check(section.get_by_label(f"Số gam {names[0]}").count() == 1 and section.get_by_label(f"Số gam {names[2]}").input_value() == "1,5", "Khôi phục: the swaps and the typed grams are back to the recipe")
        check(total_kcal(section) == start, f"Khôi phục: the Tổng is back ({total_kcal(section)} vs {start} kcal)")

        # Log a swapped cake: one row, "· đã chỉnh"
        meal = re.sub(r"^Thêm vào ", "", pg.locator('[data-tour="portion-add"]:visible').first.inner_text().strip())
        yogurt.select_option(label=greek)
        pg.wait_for_timeout(500)
        pg.locator('[data-tour="portion-add"]:visible').first.tap()
        pg.wait_for_url(re.compile(r".*/app(\?.*)?$"))
        pg.wait_for_timeout(1000)
        text = squash(pg.locator(f"section[aria-label='{meal}'] >> visible=true").first.inner_text())
        check(text.count("Bánh khoai nướng Minh Hào") == 1 and "Bánh khoai nướng Minh Hào · đã chỉnh" in text, f"{meal}: one row, Bánh khoai nướng Minh Hào · đã chỉnh ({text[:200]!r})")
        pg.screenshot(path=str(SHOTS / "cake-logged.png"))
        ctx.close()
        browser.close()

    print(f"{len(problems)} problem(s)")
    for m in problems:
        print(" -", m)
    sys.exit(1 if problems else 0)


if __name__ == "__main__":
    main()
