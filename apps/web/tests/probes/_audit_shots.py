"""Overnight 22→23/10: the screenshots of the audit fixes at 390, 360 and 360 with the root font at 150 % (demo build).
Not a check (the name starts with _, so probe:all skips it); the assertions are in one_sheet_add.py and the PR's own probes.
  portion   + sheet, "gà" searched, a result tapped: the portion step inside the sheet
  compare   … then So sánh: the compare step
  back      … then ‹: the list as it was
  overview  Tổng quan (Tóm tắt) and its Vi chất tab
  home      Hôm nay (the nutrient column and the footnote)
  groups    Khám phá › Nhóm món
  addlist   + sheet with no search (Gần đây, the list's kcal / grams)
Shots: .screenshots/audit-1023/<scenario>-<390|360|360-text150>.png
Run with: ALIGN_BASE_URL=http://localhost:3101 npm run probe -- tests/probes/_audit_shots.py portion compare back
"""
# PROBE_COVERS:
import os
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright
import _demo  # noqa: F401

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3100")
SHOTS = Path(__file__).resolve().parent.parent.parent / ".screenshots" / "audit-1023"
SHOTS.mkdir(parents=True, exist_ok=True)
SEED = "try { localStorage.setItem('h1t_settings_v1_demo', JSON.stringify({installPrompt:{dismissCount:0,snoozeUntil:0,done:true,firstSeenIso:'2026-01-01'}})) } catch (e) {}"
CASES = [("390", {"width": 390, "height": 844}, False), ("360", {"width": 360, "height": 780}, False), ("360-text150", {"width": 360, "height": 780}, True)]


def page(browser, size, big):
    ctx = browser.new_context(viewport=size, device_scale_factor=2, is_mobile=True, has_touch=True)
    ctx.add_init_script(SEED)
    if big:
        ctx.add_init_script("document.addEventListener('DOMContentLoaded', () => { document.documentElement.style.fontSize = '150%'; });")
    return ctx, ctx.new_page()


def go(pg, route, wait=900):
    pg.goto(BASE + route, wait_until="networkidle")
    pg.wait_for_timeout(wait)


def tap_row(pg, n=0):
    idx = pg.evaluate("""(n) => { const head = document.querySelector('[data-add-panel] .glass-bar').getBoundingClientRect().bottom;
      const rows = [...document.querySelectorAll('[data-add-panel] button[data-food-row]')];
      const shown = rows.map((r, i) => [r.getBoundingClientRect(), i]).filter(([b]) => b.height > 0 && b.top > head + 4 && b.bottom < innerHeight - 100);
      return shown.length > n ? shown[n][1] : 0; }""", n)
    pg.locator("[data-add-panel] button[data-food-row]").nth(idx).click()


def open_add(pg):
    go(pg, "/app", 600)
    pg.locator('a[href^="/add"]:visible').first.click()
    pg.locator("[data-add-panel] button[data-food-row]").first.wait_for(state="visible", timeout=15000)
    pg.wait_for_timeout(600)


def shot(pg, name, tag):
    pg.screenshot(path=str(SHOTS / f"{name}-{tag}.png"))


def run(browser, scenario, tag, size, big):
    ctx, pg = page(browser, size, big)
    if scenario in ("portion", "compare", "back"):
        open_add(pg)
        pg.locator("[data-add-panel] input").first.fill("gà")
        pg.wait_for_timeout(800)
        tap_row(pg, 1)
        pg.locator("[data-add-panel] section[data-sheet-view]").first.wait_for(state="visible")
        pg.wait_for_timeout(500)
        if scenario == "compare":
            pg.locator("[data-add-panel] section[data-sheet-view]").get_by_role("button", name="So sánh").click()
            pg.wait_for_timeout(600)
        if scenario == "back":
            pg.get_by_role("button", name="Quay lại").first.click()
            pg.wait_for_timeout(500)
    elif scenario == "overview":
        go(pg, "/trends", 1500)
        shot(pg, "overview-summary", tag)
        go(pg, "/trends/micros", 1500)
    elif scenario == "home":
        go(pg, "/app", 1500)
    elif scenario == "groups":
        go(pg, "/explore", 1500)
        grid = pg.get_by_text("Nhóm món").first
        if grid.count():
            grid.scroll_into_view_if_needed()
            pg.wait_for_timeout(400)
    elif scenario == "addlist":
        open_add(pg)
    shot(pg, scenario, tag)
    ctx.close()


with sync_playwright() as p:
    browser = p.chromium.launch()
    for scenario in sys.argv[1:] or ["portion"]:
        for tag, size, big in CASES:
            run(browser, scenario, tag, size, big)
            print(f"shot {scenario}-{tag}")
    browser.close()
print(f"saved in {SHOTS}")
