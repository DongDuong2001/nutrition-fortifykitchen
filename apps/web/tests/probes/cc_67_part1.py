"""cc-67 part 1: one list row per food (390 x 844, demo build).

The demo catalogue has Khoai lang luộc (cooked) and, since cc-67, Khoai lang (sống): one row "Khoai lang" in /add search and
in Khám phá, opening on Chín (a starch staple), with the Sống | Chín switch reaching the raw row. No row is called "… luộc".
Screenshots: .screenshots/cc67/. Run with: ALIGN_BASE_URL=http://localhost:3101 npm run probe -- tests/probes/cc_67_part1.py
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


def squash(text):
    return re.sub(r"\s+", " ", text)


def open_add(pg):
    pg.goto(BASE + "/add", wait_until="networkidle")
    pg.wait_for_timeout(600)
    later = pg.get_by_role("button", name="Để sau")
    if later.count():
        later.first.tap()
        pg.wait_for_timeout(300)


def row_names(pg):
    rows = pg.locator("[data-add-panel] button[data-food-row]")
    return [squash(rows.nth(i).locator("span[title]").first.inner_text()) for i in range(rows.count())]


def main():
    SHOTS.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch()
        ctx = browser.new_context(**PHONE)
        pg = ctx.new_page()

        open_add(pg)
        field = pg.locator('[data-add-panel] input[type="search"], [data-add-panel] input').first
        field.fill("khoai")
        pg.wait_for_timeout(700)
        names = row_names(pg)
        check(names.count("Khoai lang") == 1, f"search khoai: Khoai lang once ({names})")
        check(not any("luộc" in n or "chín" in n.lower() or "sống" in n for n in names), f"search khoai: no luộc / chín / sống twin row ({names})")
        pg.screenshot(path=str(SHOTS / "search-khoai.png"))

        # The row opens on Chín (khoai is a starch staple) and the switch reaches Sống
        pg.locator("[data-add-panel] button[data-food-row]").filter(has_text="Khoai lang").first.tap()
        panel = pg.locator('[data-tour="portion-panel"]:visible').first
        panel.wait_for(state="visible")
        pg.wait_for_timeout(500)
        check(squash(panel.locator("h2").inner_text()).lower() == "khoai lang", f"portion sheet is titled Khoai lang ({panel.locator('h2').inner_text()!r})")
        chin = panel.get_by_role("button", name="Đã nấu chín")
        song = panel.get_by_role("button", name="Cân sống")
        check(chin.get_attribute("aria-pressed") == "true", "Khoai lang opens on Đã nấu chín")
        check("76 kcal" in squash(panel.inner_text()), "cooked 100 g = 76 kcal")
        song.tap()
        pg.wait_for_timeout(500)
        check(song.get_attribute("aria-pressed") == "true", "Cân sống switches")
        check("86 kcal" in squash(panel.inner_text()), "raw 100 g = 86 kcal")
        pg.screenshot(path=str(SHOTS / "portion-khoai-raw.png"))
        # Added raw, the diary row keeps the state logged
        pg.locator('[data-tour="portion-add"]:visible').first.tap()
        pg.wait_for_url(re.compile(r".*/app(\?.*)?$"))
        pg.wait_for_timeout(900)
        body = squash(pg.locator("body").inner_text())
        check("Khoai lang" in body and "Cân sống" in body, "Hôm nay shows the entry with the state it was logged in")
        ctx.close()

        # Khám phá: search is one row too
        ctx = browser.new_context(**PHONE)
        pg = ctx.new_page()
        pg.goto(BASE + "/explore", wait_until="networkidle")
        pg.wait_for_timeout(600)
        pg.locator('input[type="search"], input').first.fill("khoai")
        pg.wait_for_timeout(700)
        text = squash(pg.locator("main").inner_text())
        check(text.count("Khoai lang") == 1 and "luộc" not in text, "Khám phá search: Khoai lang once, no luộc row")
        pg.screenshot(path=str(SHOTS / "explore-khoai.png"))
        ctx.close()
        browser.close()

    print(f"{len(problems)} problem(s)")
    for m in problems:
        print(" -", m)
    sys.exit(1 if problems else 0)


if __name__ == "__main__":
    main()
