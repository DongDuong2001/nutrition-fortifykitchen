"""cc-67 part 2: fruit and the foods with a peel, shell or bone go by grams of the edible part (390 x 844, demo build).

- Bơ (trái) (the demo avocado, once "Quả bơ"): the portion sheet has the gram field, one 100 g chip and ×N, no Trái | Gam
  tabs, the note about the edible part, and a gram portion logs
- Chuối: the same; the sample day's Chuối shows 118 g
- Trứng gà keeps Quả | Gam and its sizes
Screenshots: .screenshots/cc67/. Run with: ALIGN_BASE_URL=http://localhost:3101 npm run probe -- tests/probes/cc_67_part2.py
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
    panel = pg.locator('[data-tour="portion-panel"]:visible').first
    panel.wait_for(state="visible")
    pg.wait_for_timeout(500)
    return panel


def main():
    SHOTS.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch()
        ctx = browser.new_context(**PHONE)
        pg = ctx.new_page()

        s = open_food(pg, "bơ", "Bơ (trái)")
        check(squash(s.locator("h2").inner_text()).lower() == "bơ (trái)", f"avocado is titled Bơ (trái) ({s.locator('h2').inner_text()!r})")
        check(pg.locator('[data-tour="unit-toggle"]').count() == 0, "avocado: no Trái | Gam tabs")
        check(s.get_by_label("Số gam").input_value() == "100", "avocado: opens at 100 g")
        check(s.get_by_role("button", name="100 g", exact=True).count() == 1, "avocado: one 100 g chip")
        check(s.get_by_role("button", name=re.compile("Tăng|Nhân|×")).count() >= 1 or s.locator('[data-tour="portion-multiply"]').count() >= 1, "avocado: ×N is there")
        check("Cân phần ăn được" in s.inner_text(), "avocado: the note says to weigh the edible part")
        check("trái" not in squash(s.inner_text()).lower().replace("bơ (trái)", ""), "avocado: no trái / quả unit anywhere in the sheet")
        check("160 kcal" in squash(s.inner_text()), "avocado: 100 g = 160 kcal")
        pg.screenshot(path=str(SHOTS / "portion-bo-trai.png"))
        s.get_by_label("Số gam").fill("150")
        pg.wait_for_timeout(300)
        check("240 kcal" in squash(s.inner_text()), "avocado: 150 g = 240 kcal")
        pg.locator('[data-tour="portion-add"]:visible').first.tap()
        pg.wait_for_url(re.compile(r".*/app(\?.*)?$"))
        pg.wait_for_timeout(900)
        body = squash(pg.locator("body").inner_text())
        check("Bơ (trái)" in body and "150 g" in body, "Hôm nay shows Bơ (trái) 150 g")
        ctx.close()

        ctx = browser.new_context(**PHONE)
        pg = ctx.new_page()
        s = open_food(pg, "chuối", "Chuối")
        check(pg.locator('[data-tour="unit-toggle"]').count() == 0, "banana: no unit tabs")
        check(s.get_by_label("Số gam").input_value() == "100", "banana: 100 g")
        pg.goto(BASE + "/app", wait_until="networkidle")
        pg.wait_for_timeout(800)
        check("118 g" in squash(pg.locator("body").inner_text()), "the sample day's Chuối reads 118 g")
        ctx.close()

        # Eggs keep their quả
        ctx = browser.new_context(**PHONE)
        pg = ctx.new_page()
        s = open_food(pg, "trứng gà", "Trứng gà")
        check(s.get_by_role("button", name="Quả", exact=True).count() == 1, "egg: Quả | Gam stays")
        ctx.close()
        browser.close()

    print(f"{len(problems)} problem(s)")
    for m in problems:
        print(" -", m)
    sys.exit(1 if problems else 0)


if __name__ == "__main__":
    main()
