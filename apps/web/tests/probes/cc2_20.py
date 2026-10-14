"""cc2-20: Tổng quan > Tóm tắt, direction B, at 390 and 1280.

- hero: the number is today's missing kcal, the button reads "+ Thêm vào bữa tối" at 18:00 and opens the add sheet
- the hero toggle (aria-pressed) switches between "Còn thiếu" and "Theo bữa"
- the period row reads "7 ngày qua · 06/10 – 12/10" ("30 ngày qua · ..." for 30)
- scoreboard: Kcal, Đạm, Cân nặng; one row open at a time; a bar tap updates the day line
- the Vi chất card opens 22 squares; a square names its nutrient
- no "So với kỳ trước", no "Nhận xét", no horizontal scroll
Screenshots: .screenshots/cc2-20-*.png
Run with: ALIGN_BASE_URL=http://localhost:3102 npm run probe -- tests/probes/cc2_20.py
"""
import os
import re
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright
import _demo  # noqa: F401  (demo mode on, see _demo.py)

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3102")
SHOTS = Path(__file__).resolve().parent.parent.parent / ".screenshots"
SIZES = [("390", {"width": 390, "height": 844}), ("1280", {"width": 1280, "height": 800})]
NOW = "2026-10-12T18:00:00+07:00"
problems, notes = [], []


def check(cond, msg):
    (notes if cond else problems).append(("ok: " if cond else "") + msg)


def text(pg):
    return re.sub(r"\s+", " ", pg.inner_text("body"))


def new_page(browser, size, route="/"):
    ctx = browser.new_context(viewport=size)
    pg = ctx.new_page()
    pg.clock.set_fixed_time(NOW)
    pg.goto(BASE + route, wait_until="networkidle")
    pg.wait_for_timeout(600)
    return ctx, pg


def shot(pg, name, size_name):
    SHOTS.mkdir(parents=True, exist_ok=True)
    pg.screenshot(path=str(SHOTS / f"cc2-20-{name}-{size_name}.png"), full_page=True)


def run(browser, size_name, size):
    ctx, pg = new_page(browser, size)
    t = text(pg)

    # Hero
    num = pg.locator("#ov-hero-number")
    check(num.count() == 1 and num.inner_text().strip() == "909", f"{size_name} hero: number is the missing kcal ({num.inner_text() if num.count() else None})")
    check("hôm nay còn thiếu" in pg.locator("#ov-hero-label").inner_text().lower(), f"{size_name} hero: label")
    check("Đã ăn 1.041" in t and "Tối thiểu 1.950" in t, f"{size_name} hero: Đã ăn and Tối thiểu")
    btn = pg.locator("#overview-next-meal")
    check(btn.count() == 1 and btn.inner_text().strip() == "+ Thêm vào bữa tối", f"{size_name} hero: button reads + Thêm vào bữa tối")
    bb = btn.bounding_box()
    check(bb is not None and bb["height"] >= 44, f"{size_name} hero: button is at least 44 px tall")

    # Toggle
    left = pg.get_by_role("button", name="Còn thiếu")
    meals = pg.get_by_role("button", name="Theo bữa")
    check(left.get_attribute("aria-pressed") == "true" and meals.get_attribute("aria-pressed") == "false", f"{size_name} toggle: Còn thiếu is pressed first")
    meals.click()
    pg.wait_for_timeout(150)
    t2 = text(pg)
    check(meals.get_attribute("aria-pressed") == "true" and left.get_attribute("aria-pressed") == "false", f"{size_name} toggle: Theo bữa pressed")
    check("hôm nay theo bữa" in t2.lower() and "Sáng" in t2 and "Trưa" in t2 and "Phụ" in t2 and "Tối" in t2, f"{size_name} toggle: four meals shown")
    check(pg.locator("#ov-hero-number").count() == 0, f"{size_name} toggle: big number hidden in Theo bữa")
    shot(pg, "hero-meals", size_name)
    left.click()
    pg.wait_for_timeout(150)
    check(pg.locator("#ov-hero-number").count() == 1, f"{size_name} toggle: back to Còn thiếu")

    # Period row
    check("7 ngày qua · 06/10 – 12/10" in text(pg), f"{size_name} period row reads 7 ngày qua · 06/10 – 12/10")

    # Scoreboard: one row open at a time
    rows = pg.locator("section[aria-label='Bảng điểm'] > ul > li > button")
    check(rows.count() == 3, f"{size_name} scoreboard: three rows ({rows.count()})")
    titles = [re.sub(r"\s+", " ", rows.nth(i).inner_text()) for i in range(rows.count())]
    check(titles[0].startswith("Kcal") and titles[1].startswith("Đạm") and titles[2].startswith("Cân nặng"), f"{size_name} scoreboard: Kcal, Đạm, Cân nặng")
    check("ngày đạt" in titles[0] and "so với 7 ngày trước" in titles[0], f"{size_name} scoreboard: kcal change in words and n/6 ngày đạt ({titles[0][:90]})")
    check("Hồ sơ 65,0 kg" in titles[2] or "hồ sơ 65,0 kg" in titles[2], f"{size_name} scoreboard: weight row shows the profile weight ({titles[2][:90]})")
    expanded = lambda: pg.locator("section[aria-label='Bảng điểm'] button[aria-expanded='true']").count()
    check(expanded() == 1 and rows.nth(0).get_attribute("aria-expanded") == "true", f"{size_name} scoreboard: Kcal open by default")
    rows.nth(1).click()
    pg.wait_for_timeout(150)
    check(expanded() == 1 and rows.nth(1).get_attribute("aria-expanded") == "true" and rows.nth(0).get_attribute("aria-expanded") == "false",
          f"{size_name} scoreboard: opening Đạm closes Kcal")
    bars = pg.locator("#ov-score-protein button[aria-pressed]")
    check(bars.count() == 7, f"{size_name} scoreboard: seven day bars ({bars.count()})")
    check(bars.nth(6).get_attribute("aria-pressed") == "true", f"{size_name} scoreboard: last day selected")
    line = lambda: re.sub(r"\s+", " ", pg.locator("#ov-score-protein p[aria-live]").inner_text())
    before = line()
    bars.nth(2).click()
    pg.wait_for_timeout(150)
    after = line()
    check(before != after and bars.nth(2).get_attribute("aria-pressed") == "true", f"{size_name} scoreboard: a bar tap updates the day line ({before!r} -> {after!r})")
    check("T5 08/10" in after and re.search(r"\d+ g", after) is not None, f"{size_name} scoreboard: day line names the day and the grams ({after!r})")
    check("thiếu" in after or "đạt mục tiêu" in after, f"{size_name} scoreboard: day line says đạt mục tiêu or thiếu ({after!r})")
    aria = bars.nth(2).get_attribute("aria-label") or ""
    check(re.match(r"T5 08/10: [\d.]+ g", aria) is not None, f"{size_name} scoreboard: bar aria-label ({aria!r})")
    shot(pg, "protein-open", size_name)
    rows.nth(2).click()
    pg.wait_for_timeout(150)
    wline = re.sub(r"\s+", " ", pg.locator("#ov-score-weight p[aria-live]").inner_text())
    check("kg" in wline, f"{size_name} scoreboard: weight day line ({wline!r})")
    rows.nth(0).click()
    pg.wait_for_timeout(150)

    # Vi chất card
    micro = pg.locator("#ov-micro")
    mt = re.sub(r"\s+", " ", micro.inner_text())
    check(re.search(r"Vi chất đạt \d+/22", mt) is not None, f"{size_name} Vi chất: 'Vi chất đạt n/22' ({mt[:70]!r})")
    check("Thiếu nhiều nhất:" in mt, f"{size_name} Vi chất: hint names the lowest")
    micro.locator("button[aria-expanded]").click()
    pg.wait_for_timeout(150)
    squares = pg.locator("#ov-micro-grid ul button")
    check(squares.count() == 22, f"{size_name} Vi chất: 22 squares ({squares.count()})")
    sizes = [squares.nth(i).bounding_box() for i in range(squares.count())]
    check(all(b and b["height"] >= 44 and b["width"] >= 40 for b in sizes), f"{size_name} Vi chất: squares are tap-sized")
    squares.nth(5).click()
    pg.wait_for_timeout(150)
    sel = re.sub(r"\s+", " ", pg.locator("#ov-micro-grid p[aria-live]").inner_text())
    check(re.search(r"%", sel) is not None and (squares.nth(5).get_attribute("aria-label") or "").split(" ")[0] in sel, f"{size_name} Vi chất: a square names the nutrient and % ({sel!r})")
    check("Thiếu" in text(pg) and "Đạt" in text(pg), f"{size_name} Vi chất: level counts shown")
    shot(pg, "micro-open", size_name)

    # Cần chú ý
    check(pg.get_by_role("heading", name="Cần chú ý").count() == 1, f"{size_name} Cần chú ý heading")
    att = pg.locator("#ov-attention").locator("xpath=..").locator("ul > li")
    check(1 <= att.count() <= 3, f"{size_name} Cần chú ý: 1-3 rows ({att.count()})")
    full = text(pg)
    check("So với kỳ trước" not in full and "Nhận xét" not in full, f"{size_name}: no 'So với kỳ trước', no 'Nhận xét'")
    h = pg.evaluate("Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) > window.innerWidth")
    check(not h, f"{size_name}: no horizontal scroll")

    # 30 days
    pg.locator('a:has-text("30 ngày") >> visible=true').first.click()
    pg.wait_for_timeout(500)
    check("30 ngày qua · 13/09 – 12/10" in text(pg), f"{size_name} 30 days: period row reads 30 ngày qua · 13/09 – 12/10")
    check(pg.locator("section[aria-label='Bảng điểm'] #ov-score-calories button[aria-pressed]").count() == 7,
          f"{size_name} 30 days: chart still shows the last 7 days")
    pg.get_by_role("button", name="Kỳ trước").click()
    pg.wait_for_timeout(500)
    ph = re.sub(r"\s+", " ", pg.locator("#ov-period").inner_text())
    check(re.fullmatch(r"\d\d/\d\d – \d\d/\d\d", ph) is not None, f"{size_name} past period: dates only ({ph!r})")
    shot(pg, "past", size_name)
    ctx.close()


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for size_name, size in SIZES:
            run(browser, size_name, size)
        # Next meal opens the add sheet for dinner
        ctx, pg = new_page(browser, SIZES[0][1])
        pg.locator("#overview-next-meal").click()
        pg.wait_for_url("**/add**", timeout=8000)
        check("meal=dinner" in pg.url, f"hero button opens the add sheet for dinner ({pg.url})")
        ctx.close()
        # Shot with the full page for the review
        ctx, pg = new_page(browser, SIZES[0][1])
        shot(pg, "overview", "390")
        ctx.close()
        ctx, pg = new_page(browser, SIZES[1][1])
        shot(pg, "overview", "1280")
        ctx.close()
        browser.close()
    for n in notes:
        print(n)
    for pr in problems:
        print("[FAIL]", pr)
    print(f"cc2-20: {len(notes)} ok, {len(problems)} fail")
    sys.exit(1 if problems else 0)


if __name__ == "__main__":
    main()
