"""Overnight 22→23/10, PR 3: units and counts (demo build, 390 x 844).

1  Grams everywhere except eggs and chanh: the + sheet's list says "/ 100 g" for Khoai lang (it said "/ 1 củ"), Trứng gà keeps
   "1 quả", Gần đây of Bữa tối shows Khoai lang by grams; no row of the list is shown by củ, bìa, nắm, dĩa or muỗng.
2  Tổng quan counts the micros over the Level's list, as Hôm nay: the Vi chất card's "x/N" has Hôm nay's N and its grid the Level's
   nutrients, with "Đủ 22 vi chất ›" to the Vi chất tab; there the hero is the Level's too, and all 22 are in the lists under the
   heading "Đủ 22 vi chất".
3  The Kcal and Đạm big numbers of Tổng quan say TB/ngày.
4  Hôm nay's footnote: "● Thiếu dữ liệu vi chất" only while a grey dot is on screen, and no "chạm tên bữa" in it.
5  Khám phá › Nhóm món lists no group with 0 foods.
Run with: ALIGN_BASE_URL=http://localhost:3101 npm run probe -- tests/probes/units_counts.py
"""
# PROBE_COVERS: app/(app)/add/** app/(app)/(tabs)/app/** app/(app)/(tabs)/trends/** app/(app)/(tabs)/explore/** components/home/food-list.tsx components/overview/** components/explore/explore-sections.tsx lib/food-meta.ts lib/portion.ts lib/overview-board.ts
import os
import re
import sys

from playwright.sync_api import sync_playwright
import _demo  # noqa: F401

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3100")
SEED = "try { localStorage.setItem('h1t_settings_v1_demo', JSON.stringify({installPrompt:{dismissCount:0,snoozeUntil:0,done:true,firstSeenIso:'2026-01-01'}})) } catch (e) {}"
COUNTS = re.compile(r"/ 1 (củ|bìa|nắm|dĩa|muỗng|chén|cái|lòng|miếng)")
WEIGHED = {"Mật mía", "Bánh tráng nướng", "Bánh khoai nướng Minh Hào", "Đậu hũ trắng", "Rau muống", "Khoai lang", "Hạt điều rang", "Hạnh nhân", "Bông cải xanh", "Lòng trắng trứng gà", "Lòng đỏ trứng gà", "Dầu ăn"}
problems = []


def check(cond, msg):
    print(("[PASS] " if cond else "[FAIL] ") + msg)
    if not cond:
        problems.append(msg)


def page(browser):
    ctx = browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    ctx.add_init_script(SEED)
    return ctx, ctx.new_page()


def go(pg, route, wait=1200):
    pg.goto(BASE + route, wait_until="networkidle")
    pg.wait_for_timeout(wait)


def rows_text(pg):
    return pg.locator("[data-add-panel] button[data-food-row]").all_inner_texts()


with sync_playwright() as p:
    browser = p.chromium.launch()
    ctx, pg = page(browser)

    # ---- 1: units ----
    go(pg, "/add?meal=dinner", 1500)
    pg.locator("[data-add-panel] button[data-food-row]").first.wait_for(state="visible", timeout=15000)
    rows = rows_text(pg)
    # The demo foods weighed in grams whose data lists a count first (dishes, supplements and cans keep their unit)
    counted = [r.replace("\n", " / ") for r in rows if r.split("\n")[0] in WEIGHED and COUNTS.search(r.replace("\n", " "))]
    check(not counted, f"1: no food weighed in grams is shown by a count ({counted[:4]})")
    kept = [r.replace("\n", " / ") for r in rows if r.split("\n")[0] in ("Cơm tấm sườn", "Whey Protein Isolate", "Red Bull")]
    check(kept and all(re.search(r"/ 1 (dĩa|muỗng|lon)", k) for k in kept), f"1: dishes, supplements and cans keep their unit ({kept})")
    pg.locator("[data-add-panel] input").first.fill("khoai lang")
    pg.wait_for_timeout(800)
    khoai = " ".join(rows_text(pg)[:1]).replace("\n", " ")
    check("/ 100 g" in khoai and "củ" not in khoai, f"1: Khoai lang reads per 100 g ({khoai!r})")
    pg.locator("[data-add-panel] input").first.fill("trứng gà")
    pg.wait_for_timeout(800)
    egg = next((r.replace("\n", " ") for r in rows_text(pg) if r.startswith("Trứng gà")), "")
    check("quả" in egg, f"1: Trứng gà keeps the quả ({egg!r})")
    pg.locator("[data-add-panel] input").first.fill("")
    pg.wait_for_timeout(800)
    recents = pg.locator("[data-add-panel] #add-recents, [data-add-panel] [aria-labelledby='add-recents']").all_inner_texts()
    recent_text = " ".join(recents).replace("\n", " ")
    check("1 củ" not in recent_text and "1 chén hấp" not in recent_text, f"1: Gần đây of Bữa tối shows no củ or chén ({recent_text[:160]!r})")

    # ---- 2: Tổng quan counts over the Level's list ----
    go(pg, "/app", 1500)
    home_summary = pg.locator("[data-level-summary]").first.inner_text()
    m = re.search(r"(\d+)/(\d+)", home_summary)
    home_total = int(m.group(2)) if m else None
    go(pg, "/trends", 1800)
    card = pg.locator("#ov-micro")
    label = card.locator("button").first.get_attribute("aria-label") or ""
    m2 = re.search(r"Vi chất đạt (\d+) trên (\d+)", label)
    check(m2 is not None and home_total is not None and int(m2.group(2)) == home_total, f"2: Tổng quan's x/N has Hôm nay's N ({label!r} vs Hôm nay {home_summary!r})")
    card.locator("button").first.click()
    pg.wait_for_timeout(600)
    squares = card.locator("#ov-micro-grid button, #ov-micro-grid [role=button]").count()
    check(squares == home_total, f"2: the card's grid holds the Level's nutrients, as Hôm nay's column ({squares})")
    link = card.get_by_role("link", name=re.compile("Đủ 22 vi chất"))
    check(link.count() == 1, "2: the card links to Đủ 22 vi chất")
    # ---- 3: TB/ngày ----
    board = pg.get_by_role("region", name="Bảng điểm")
    text = board.inner_text() if board.count() else pg.locator("body").inner_text()
    check(text.count("TB/ngày") >= 2, f"3: Kcal and Đạm say TB/ngày ({text.count('TB/ngày')} times)")
    link.click()
    pg.wait_for_url(re.compile(r"/trends/micros"), timeout=8000)
    pg.wait_for_timeout(1500)
    hero = pg.locator("[data-tour='trends-summary']").get_attribute("aria-label") or ""
    check(f"trên {home_total} vi chất" in hero, f"2: the Vi chất tab's hero is over the Level's list too ({hero!r})")
    check(pg.get_by_role("heading", name="Đủ 22 vi chất").count() == 1, "2: the lists of all 22 stay under Đủ 22 vi chất")

    # ---- 4: the footnote ----
    go(pg, "/app", 1500)
    grey = pg.locator("[data-entry-id][aria-label*='thiếu dữ liệu vi chất']:visible").count()
    legend = pg.locator("[data-missing-legend]").count()
    body = pg.locator("body").inner_text()
    check((legend == 1) == (grey > 0), f"4: the grey-dot legend shows only with a grey dot on screen (dots {grey}, legend {legend})")
    check("chạm tên bữa" not in body, "4: the footnote no longer carries the meal tip")
    # A day with no grey dot: the demo's empty day (Hôm nay with everything deleted is not needed: an empty past day has no rows)
    # ---- 5: Nhóm món ----
    go(pg, "/explore", 1500)
    groups = pg.get_by_role("navigation", name="Nhóm món").locator("a").all_inner_texts()
    empty = [g.replace("\n", " ") for g in groups if re.search(r"\b0 món", g)]
    check(groups and not empty, f"5: no group with 0 foods ({empty}; {len(groups)} shown)")
    ctx.close()
    browser.close()

print(f"\n{len(problems)} problem(s)")
sys.exit(1 if problems else 0)
