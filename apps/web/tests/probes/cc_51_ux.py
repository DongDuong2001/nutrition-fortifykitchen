"""cc-51 Part D on the running app (demo build, 390 x 844; the sample day and its history).

- D4 a nutrient row of today is a button: it opens a sheet named in English (Iron) with today's foods, largest first,
  each with its share of the target, and Xem chi tiết; a past day's rows are not buttons
- D3 the meal menu offers Như hôm qua with the count; it asks "Thêm N món như hôm qua?" and adds N foods
- D1 the add sheet for a meal shows Gần đây and Hay ăn
Run with: ALIGN_BASE_URL=http://localhost:3101 npm run probe -- tests/probes/cc_51_ux.py
"""
# PROBE_COVERS: app/(app)/(tabs)/app/** app/(app)/add/**
import os
import re
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright
import _demo  # noqa: F401  (demo mode, tour and tips off)

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3101")
SHOTS = Path(__file__).resolve().parent.parent.parent / ".screenshots"
PHONE = {"width": 390, "height": 844}
problems = []


def check(cond, msg):
    print(("[PASS] " if cond else "[FAIL] ") + msg)
    if not cond:
        problems.append(msg)


def today(pg, query=""):
    pg.goto(BASE + "/app" + query, wait_until="networkidle")
    pg.locator('[data-align-group="home-page"]').first.wait_for(state="visible")
    pg.wait_for_timeout(700)


with sync_playwright() as p:
    browser = p.chromium.launch()
    ctx = browser.new_context(viewport=PHONE)
    pg = ctx.new_page()

    # D4
    today(pg)
    iron = pg.locator('button[aria-haspopup="dialog"][aria-label^="Iron,"]:visible').first
    check(iron.count() == 1, "D4: Iron on Hôm nay is a button")
    box = iron.bounding_box() or {"height": 0}
    hit = iron.evaluate("el => { const b = getComputedStyle(el, '::before'); const t = parseFloat(b.top); return b.content === 'none' || Number.isNaN(t) ? 0 : t }")  # V3: the row is a 44 px button itself, no ::before hit extension
    check(box["height"] - 2 * hit >= 44, f"D4: its tap area is at least 44 px ({box['height']} + 2×{-hit})")
    iron.click()
    dialog = pg.get_by_role("dialog", name="Iron")
    dialog.wait_for(state="visible")
    pg.wait_for_timeout(350)
    text = dialog.inner_text()
    items = dialog.locator("li")
    check(items.count() >= 1, f"D4: the sheet lists today's foods with iron ({items.count()})")
    pcts = [int(m) for m in re.findall(r"(\d+)%", " ".join(items.all_inner_texts()))]
    check(pcts == sorted(pcts, reverse=True), f"D4: largest share first ({pcts})")
    check("mục tiêu ngày" in text and dialog.get_by_role("link", name="Xem chi tiết ›").count() == 1, "D4: the day's total and Xem chi tiết")
    pg.screenshot(path=str(SHOTS / "cc-51-nutrient-sources-390.png"))
    pg.keyboard.press("Escape")
    pg.wait_for_timeout(400)
    today(pg, "?date=2026-10-10")
    check(pg.locator('button[aria-haspopup="dialog"][aria-label^="Iron,"]').count() == 0, "D4: a past day's nutrients are not buttons")

    # D3
    today(pg)
    breakfast = pg.locator("section[aria-label='Bữa sáng'] button[data-entry-id]")
    before = breakfast.count()
    pg.locator("button[aria-label='Xem riêng bữa sáng']:visible").first.click()
    pg.wait_for_timeout(300)
    pg.locator("button[aria-label='Tùy chọn Bữa sáng']:visible").first.click()
    pg.wait_for_timeout(400)
    option = pg.locator('[role="dialog"] button:has-text("Như hôm qua")').first
    sub = option.inner_text()
    n = int(re.search(r"Thêm (\d+) món", sub).group(1)) if re.search(r"Thêm (\d+) món", sub) else 0
    check(n > 0, f"D3: the meal menu offers Như hôm qua with the count ({sub!r})")
    option.click()
    pg.wait_for_timeout(300)
    check(pg.get_by_role("dialog", name=f"Thêm {n} món như hôm qua?").count() == 1, f"D3: it asks Thêm {n} món như hôm qua?")
    pg.screenshot(path=str(SHOTS / "cc-51-like-yesterday-390.png"))
    pg.locator(f'[role="dialog"] button:has-text("Thêm {n} món")').first.click()
    pg.wait_for_timeout(700)
    check(breakfast.count() == before + n, f"D3: {n} foods added to Bữa sáng ({before} → {breakfast.count()})")

    # D1
    pg.goto(BASE + "/add?meal=breakfast", wait_until="networkidle")
    pg.wait_for_timeout(800)
    recents = pg.locator('section[aria-label="Gần đây"]:visible')
    often = pg.locator('section[aria-label="Hay ăn"]:visible')
    check(recents.count() == 1, "D1: Gần đây on the add sheet")
    check(often.count() == 1, "D1: Hay ăn on the add sheet (from the last 14 days)")
    pg.screenshot(path=str(SHOTS / "cc-51-add-shortlists-390.png"))
    ctx.close()
    browser.close()

print(f"\n{len(problems)} problem(s)")
sys.exit(1 if problems else 0)
