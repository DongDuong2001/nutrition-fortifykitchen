"""cc-27a: copy and multi-select on Hôm nay.

Production build, clock fixed at 2026-10-15 10:00 Asia/Ho_Chi_Minh, demo mode, 390x844 and 1440x900.
- The day's ⋯ opens a sheet with Chọn nhiều món (today and a past day).
- Select mode: Hủy / Đã chọn N + date / Chọn hết; no share icon, no nutrient column; 52 px checkbox rows; 44 px meal
  headers with Chọn cả bữa / Bỏ chọn bữa; an action bar "N món · X kcal" in the tab bar's place.
- Today: Chép sang (a meal of today, one undo), Chuyển bữa, Xóa (5 s Hoàn tác restores all).
- Past day: only Chép vào hôm nay: sheet title, subtitle, "Vào bữa" with Giữ nguyên bữa first; lands on Hôm nay
  with the toast.
Run with: ALIGN_BASE_URL=http://localhost:3104 npm run probe -- tests/probes/cc_27a.py
"""
import os
import re
import sys

import _demo  # noqa: F401
from playwright.sync_api import sync_playwright

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3104")
NOW = "2026-10-15T10:00:00+07:00"
PAST = "2026-10-14"
SHOTS = os.path.join(os.path.dirname(__file__), "..", "..", ".screenshots")
HERO = "section[aria-label='Tổng kcal và dinh dưỡng đa lượng']"
problems, notes = [], []


def check(cond, msg):
    (notes if cond else problems).append(("ok: " if cond else "") + msg)


def squash(t):
    return re.sub(r"\s+", " ", t).strip()


def new_page(browser, size):
    ctx = browser.new_context(viewport=size)
    pg = ctx.new_page()
    errors = []
    pg.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    pg.on("pageerror", lambda e: errors.append(str(e)))
    pg.clock.set_fixed_time(NOW)
    return ctx, pg, errors


def go(pg, route):
    pg.goto(BASE + route, wait_until="networkidle")
    pg.locator(HERO + " >> visible=true").first.wait_for(state="visible", timeout=8000)
    pg.wait_for_timeout(400)


def hero_count(pg):
    m = re.search(r"Cả ngày · (\d+) món", pg.locator(HERO + " >> visible=true").first.inner_text())
    return int(m.group(1)) if m else None


def meal_count(pg, name):
    return pg.locator(f"section[aria-label='{name}'] [role=checkbox], section[aria-label='{name}'] button[aria-pressed][aria-label*=', ']").count()


def start_select(pg):
    pg.get_by_role("button", name="Tùy chọn ngày").click()
    dlg = pg.get_by_role("dialog")
    dlg.wait_for(state="visible", timeout=4000)
    dlg.get_by_role("button", name=re.compile("^Chọn nhiều món")).click()
    pg.wait_for_timeout(300)


def bar_text(pg):
    return squash(pg.locator("[data-align-group=select-bar] >> visible=true").first.inner_text())


def today_flow(browser, size, tag):
    w = size["width"]
    ctx, pg, errors = new_page(browser, size)
    go(pg, "/")
    total = hero_count(pg)
    check(total == 7, f"{tag} today: 7 foods ({total})")
    pill = pg.get_by_role("button", name="Tùy chọn ngày")
    check(pill.count() == 1, f"{tag} today: the day has a ⋯")
    start_select(pg)

    # select mode chrome
    check(pg.get_by_role("button", name="Hủy", exact=True).count() == 1, f"{tag} select: Hủy")
    check(pg.get_by_role("button", name="Chọn hết", exact=True).count() == 1, f"{tag} select: Chọn hết")
    head = squash(pg.locator("header >> visible=true").first.inner_text())
    check("Đã chọn 0" in head and "Hôm nay 15/10" in head, f"{tag} select: title and date ({head})")
    check(pg.get_by_role("button", name="Chia sẻ ngày này").count() == 0, f"{tag} select: no share icon")
    check(pg.locator("aside[aria-label='Vi chất']").count() == 0, f"{tag} select: the nutrient column is hidden")
    check(pg.locator("nav[aria-label='Điều hướng chính']").count() == 0 or not pg.locator("nav[aria-label='Điều hướng chính'] >> visible=true").count() or size["width"] >= 1024, f"{tag} select: the tab bar is gone")
    check(bar_text(pg) == "0 món · 0 kcal", f"{tag} select: action bar text ({bar_text(pg)!r})")
    for name in ["Chép sang", "Chuyển bữa", "Xóa"]:
        check(pg.get_by_role("button", name=name, exact=True).is_disabled(), f"{tag} select: {name} disabled with none chosen")
    rows = pg.locator("[role=checkbox]")
    check(rows.count() == 7, f"{tag} select: 7 checkbox rows ({rows.count()})")
    hs = [rows.nth(i).bounding_box()["height"] for i in range(rows.count())]
    check(min(hs) >= 51.5, f"{tag} select: rows are 52 px ({min(hs):.0f})")
    meal_btn = pg.get_by_role("button", name="Chọn cả bữa").first
    check(meal_btn.bounding_box()["height"] >= 43.5, f"{tag} select: Chọn cả bữa is 44 px")
    pg.screenshot(path=os.path.join(SHOTS, f"cc-27a-select-{w}.png"))

    # choose
    rows.nth(0).click()
    check("Đã chọn 1" in squash(pg.locator("header >> visible=true").first.inner_text()), f"{tag} select: one chosen")
    check(rows.nth(0).get_attribute("aria-checked") == "true", f"{tag} select: the row is checked")
    pg.get_by_role("button", name="Chọn cả bữa").first.click()
    check(pg.get_by_role("button", name="Bỏ chọn bữa").count() >= 1, f"{tag} select: the meal button flips to Bỏ chọn bữa")
    pg.get_by_role("button", name="Chọn hết", exact=True).click()
    check("Đã chọn 7" in squash(pg.locator("header >> visible=true").first.inner_text()), f"{tag} select: Chọn hết takes all 7")
    check(re.fullmatch(r"7 món · [\d.]+ kcal", bar_text(pg)) is not None and bar_text(pg).startswith("7 món · 1.041"), f"{tag} select: bar sums the day ({bar_text(pg)!r})")
    pg.get_by_role("button", name="Bỏ chọn hết", exact=True).click()
    check("Đã chọn 0" in squash(pg.locator("header >> visible=true").first.inner_text()), f"{tag} select: Bỏ chọn hết")
    # Hủy leaves
    pg.get_by_role("button", name="Hủy", exact=True).click()
    pg.wait_for_timeout(300)
    check(pg.locator("[role=checkbox]").count() == 0 and pg.get_by_role("button", name="Chia sẻ ngày này").count() == 1, f"{tag} select: Hủy goes back to the day")

    # Chép sang: 2 foods into Bữa phụ, one undo
    start_select(pg)
    pg.locator("[role=checkbox]").nth(0).click()
    pg.locator("[role=checkbox]").nth(1).click()
    pg.get_by_role("button", name="Chép sang", exact=True).click()
    dlg = pg.get_by_role("dialog", name=re.compile("^Chép 2 món sang"))
    dlg.wait_for(state="visible", timeout=4000)
    radios = dlg.get_by_role("radio")
    check([r.inner_text().strip() for r in radios.all()] == ["Sáng", "Trưa", "Bữa phụ", "Tối"], f"{tag} copy: the four meals as radios")
    check(all(r.bounding_box()["height"] >= 43.5 for r in radios.all()), f"{tag} copy: radios are 44 px")
    check(dlg.get_by_role("radio", name="Giữ nguyên bữa").count() == 0, f"{tag} copy: no Giữ nguyên bữa on today")
    dlg.get_by_role("radio", name="Bữa phụ").click()
    pg.screenshot(path=os.path.join(SHOTS, f"cc-27a-copy-sheet-{w}.png"))
    dlg.get_by_role("button", name="Chép", exact=True).click()
    pg.wait_for_timeout(500)
    check(pg.locator("[role=checkbox]").count() == 0, f"{tag} copy: select mode ends")
    check(hero_count(pg) == 9, f"{tag} copy: 9 foods now ({hero_count(pg)})")
    toast = squash(pg.locator("[role=status] >> visible=true").first.inner_text())
    check("Đã chép 2 món sang Bữa phụ" in toast and "Hoàn tác" in toast, f"{tag} copy: toast ({toast!r})")
    pg.get_by_role("button", name="Hoàn tác").click()
    pg.wait_for_timeout(400)
    check(hero_count(pg) == 7, f"{tag} copy: one Hoàn tác removes both copies ({hero_count(pg)})")

    # Chuyển bữa
    start_select(pg)
    pg.locator("[role=checkbox]").nth(0).click()
    pg.locator("[role=checkbox]").nth(1).click()
    pg.get_by_role("button", name="Chuyển bữa", exact=True).click()
    dlg = pg.get_by_role("dialog", name=re.compile("^Chuyển 2 món sang"))
    dlg.wait_for(state="visible", timeout=4000)
    dlg.get_by_role("radio", name="Tối").click()
    dlg.get_by_role("button", name="Chuyển", exact=True).click()
    pg.wait_for_timeout(500)
    check(hero_count(pg) == 7, f"{tag} move: still 7 foods")
    toast = squash(pg.locator("[role=status] >> visible=true").first.inner_text())
    check("Đã chuyển 2 món sang Bữa tối" in toast, f"{tag} move: toast ({toast!r})")
    dinner = squash(pg.locator("section[aria-label='Bữa tối']").inner_text())
    check("Yến mạch" in dinner and "Yogurt kefir" in dinner, f"{tag} move: the two foods are in Bữa tối ({dinner[:80]})")
    pg.screenshot(path=os.path.join(SHOTS, f"cc-27a-after-move-{w}.png"))

    # Xóa 3 with one undo
    start_select(pg)
    for i in range(3):
        pg.locator("[role=checkbox]").nth(i).click()
    pg.get_by_role("button", name="Xóa", exact=True).click()
    pg.wait_for_timeout(500)
    check(hero_count(pg) == 4, f"{tag} delete: 4 foods left ({hero_count(pg)})")
    toast = squash(pg.locator("[role=status] >> visible=true").first.inner_text())
    check("Đã xóa 3 món" in toast and "Hoàn tác" in toast, f"{tag} delete: toast ({toast!r})")
    pg.get_by_role("button", name="Hoàn tác").click()
    pg.wait_for_timeout(400)
    check(hero_count(pg) == 7, f"{tag} delete: one Hoàn tác restores all three ({hero_count(pg)})")
    check([e for e in errors if "preloaded using link preload" not in e] == [], f"{tag}: no console errors {errors[:1]}")
    ctx.close()


def past_flow(browser, size, tag):
    w = size["width"]
    ctx, pg, errors = new_page(browser, size)
    go(pg, f"/?date={PAST}")
    n_past = hero_count(pg)
    start_select(pg)
    check(pg.get_by_role("button", name="Chép sang", exact=True).count() == 0 and pg.get_by_role("button", name="Xóa", exact=True).count() == 0, f"{tag} past: no Chép sang, Chuyển bữa or Xóa")
    check(pg.get_by_role("button", name="Chép vào hôm nay", exact=True).is_disabled(), f"{tag} past: Chép vào hôm nay is disabled with none chosen")
    pg.locator("[role=checkbox]").nth(0).click()
    pg.locator("[role=checkbox]").nth(1).click()
    check(re.fullmatch(r"2 món · [\d.]+ kcal", bar_text(pg)) is not None, f"{tag} past: bar {bar_text(pg)!r}")
    pg.get_by_role("button", name="Chép vào hôm nay", exact=True).click()
    dlg = pg.get_by_role("dialog", name="Chép 2 món vào hôm nay")
    dlg.wait_for(state="visible", timeout=4000)
    text = squash(dlg.inner_text())
    check(re.search(r"Từ Hôm qua 14/10 · [\d.]+ kcal\. Ngày đã qua chỉ xem, nên món được chép vào hôm nay 15/10\.", text) is not None, f"{tag} past: subtitle ({text[:160]!r})")
    radios = dlg.get_by_role("radio")
    check([r.inner_text().strip() for r in radios.all()] == ["Giữ nguyên bữa", "Sáng", "Trưa", "Bữa phụ", "Tối"], f"{tag} past: radios")
    check(radios.first.get_attribute("aria-checked") == "true", f"{tag} past: Giữ nguyên bữa is the default")
    check(dlg.get_by_role("button", name="Chép vào hôm nay", exact=True).count() == 1, f"{tag} past: confirm button")
    # edges of the radio rows
    xs = {round(r.bounding_box()["x"]) for r in radios.all()}
    ws = {round(r.bounding_box()["width"]) for r in radios.all()}
    check(len(xs) == 1 and len(ws) == 1, f"{tag} past: radio rows share edges ({xs}, {ws})")
    pg.screenshot(path=os.path.join(SHOTS, f"cc-27a-past-sheet-{w}.png"))
    dlg.get_by_role("radio", name="Bữa phụ").click()
    dlg.get_by_role("button", name="Chép vào hôm nay", exact=True).click()
    pg.wait_for_url(re.compile(r"^[^?]*/$"), timeout=8000)
    pg.wait_for_timeout(600)
    check("date=" not in pg.url, f"{tag} past: lands on today ({pg.url})")
    toast = squash(pg.locator("[role=status] >> visible=true").first.inner_text())
    check("Đã chép 2 món vào hôm nay" in toast, f"{tag} past: toast ({toast!r})")
    check(hero_count(pg) == 9, f"{tag} past: two foods added to today ({hero_count(pg)})")
    snack = squash(pg.locator("section[aria-label='Bữa phụ']").inner_text())
    check(snack.count("kcal") >= 1 and meal_count(pg, "Bữa phụ") >= 2, f"{tag} past: both copies are in Bữa phụ ({snack[:80]})")
    # the past day is unchanged
    go(pg, f"/?date={PAST}")
    check(hero_count(pg) == n_past, f"{tag} past: the past day is unchanged ({hero_count(pg)} vs {n_past})")
    check([e for e in errors if "preloaded using link preload" not in e] == [], f"{tag}: no console errors {errors[:1]}")
    ctx.close()


with sync_playwright() as p:
    os.makedirs(SHOTS, exist_ok=True)
    browser = p.chromium.launch()
    for size, tag in [({"width": 390, "height": 844}, "390"), ({"width": 1440, "height": 900}, "1440")]:
        today_flow(browser, size, tag)
        past_flow(browser, size, tag)
    browser.close()

for line in notes:
    print(line)
for line in problems:
    print("FAIL: " + line)
print(f"{len(notes)} ok, {len(problems)} FAIL")
sys.exit(1 if problems else 0)
