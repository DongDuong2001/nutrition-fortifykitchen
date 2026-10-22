"""cc-22: Hôm nay at "/" (coach layout; /app since cc-45).

Production build, clock fixed at 2026-10-15 10:00 Asia/Ho_Chi_Minh, demo mode, sizes 390x844 and 1280x800.
- V3 (22/10): at 390 the page scrolls (header, hero and the two cards flow); the header is two 44 px rows; from 1024 the cards keep their own scroll.
- Tap a food: hero label and caption change, Sửa shows; tap again: back. Tap a meal header: meal mode and ⋯.
- A food with a missing micronutrient has the grey dot; an empty slot reads "Chưa ăn · Thêm" and links to /add.
- 20+ foods: only the list scrolls, meal headers stick.
- Past day: ⋯ in meal mode opens a sheet with only Lưu vào Bữa ăn đã lưu.
- Today: bars in the four level colours (Hao, 16/10), long press enters multi-select (Hao, 17/10), not /entry. Past day: four levels, no Sửa, no ⋯, no long press.
- Links /micros?date= and /training?date=.
Run with: ALIGN_BASE_URL=http://localhost:3101 npm run probe -- tests/probes/cc_22.py
"""
# PROBE_COVERS: app/(app)/(dashboard)/training/** app/(app)/(tabs)/app/** app/(app)/micros/** app/page.tsx
import json
import os
import re
import sys

import _demo  # noqa: F401  (demo mode on for every page)
from playwright.sync_api import sync_playwright

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3101")
NOW = "2026-10-15T10:00:00+07:00"
PAST = "2026-10-14"
SHOTS = os.path.join(os.path.dirname(__file__), "..", "..", ".screenshots")
LIST = "document.querySelector('aside[aria-label=\"Vi chất\"]').previousElementSibling"
problems, notes = [], []


def check(cond, msg):
    (notes if cond else problems).append(("ok: " if cond else "") + msg)


def entry(i, slot, name, full):
    nutrients = {k: 1 for k in ["sodium", "potassium", "calcium", "magnesium", "iron", "zinc", "vitamin_a", "vitamin_c", "vitamin_d", "vitamin_e", "vitamin_k", "b1", "b2", "b3", "b5", "b6", "folate", "b12", "copper", "manganese", "phosphorus", "selenium"]} if full else {}
    return {
        "id": f"seed-{i}", "foodId": "food-seed", "foodName": name, "grams": 100 + i, "displayQty": f"{100 + i} g",
        "mealSlot": slot, "calories": 50 + i, "protein": 2, "carbs": 8, "fat": 1, "fiber": 1,
        "nutrients": nutrients, "addedAt": "2026-10-15T01:00:00.000Z",
    }


def seeded(count):
    slots = ["breakfast", "lunch", "snack", "dinner"]
    return json.dumps([entry(i, slots[i % 4], f"Món thử {i}", i == 0) for i in range(count)])


def page(browser, size, extra=0):
    ctx = browser.new_context(viewport=size)
    if extra:
        ctx.add_init_script(
            f"try {{ localStorage.setItem('h1t_added_entries_v1_demo', {json.dumps(seeded(extra))}); }} catch (e) {{}}"
        )
    pg = ctx.new_page()
    pg.clock.set_fixed_time(NOW)
    return ctx, pg


def go(pg, route):
    pg.goto(BASE + route, wait_until="networkidle")
    pg.wait_for_timeout(700)


def hero_label(pg):
    return pg.locator("section[aria-label='Tổng kcal và dinh dưỡng đa lượng'] h2").inner_text()


def captions(pg):
    """cc-27f: the nutrient column has no caption line any more."""
    return pg.locator("aside[aria-label='Vi chất'] > p:not([data-level-summary])").count()


def fills(pg, label):
    return pg.evaluate(
        """(label) => [...document.querySelector(`[role=progressbar][aria-label="${label}"]`).children].map(c => getComputedStyle(c).backgroundColor)""",
        label,
    )


def run(browser, size, tag):
    w = size["width"]
    phone = w < 1024
    ctx, pg = page(browser, size)
    go(pg, "/app")
    check(pg.url == BASE + "/app", f"{tag} /app stays at /app")
    check(hero_label(pg).startswith("Cả ngày · "), f"{tag} day mode label: {hero_label(pg)}")
    if phone:
        # V3-SPEC §3.1: row 1 the wordmark and the share button, row 2 the date stepper and "Ngày tập"; 4 px above, 4 px below
        h = pg.evaluate("document.querySelector('header').getBoundingClientRect().height")
        check(abs(h - 96) <= 1, f"{tag} header is two 44 px rows ({h})")
    foods = pg.locator("button[aria-pressed][aria-label*=', ']")
    n = foods.count()
    check(n >= 7, f"{tag} foods listed: {n}")
    if phone:
        box = pg.evaluate("(() => { const l = document.querySelector('aside[aria-label=\"Vi chất\"]').previousElementSibling; return [l.scrollHeight, l.clientHeight]; })()")
        check(box[0] <= box[1] + 1, f"{tag} all foods visible without scrolling the list ({box})")
        col = pg.evaluate("(() => { const a = document.querySelector('aside[aria-label=\"Vi chất\"] > div'); return [a.scrollHeight, a.clientHeight]; })()")
        check(col[0] <= col[1] + 1, f"{tag} nutrient column fits ({col})")
    check(pg.locator("button[aria-label$=', thiếu dữ liệu vi chất']").count() >= 1, f"{tag} dot for a food with a missing micronutrient")
    check(pg.get_by_role("link", name=re.compile("Ngày tập")).get_attribute("href") == f"/training?date=2026-10-15", f"{tag} training link carries the date")
    check(pg.get_by_role("link", name=re.compile("Đủ 22 vi chất")).get_attribute("href") == "/micros?date=2026-10-15", f"{tag} micros link carries the date")
    check(pg.get_by_role("link", name="Sửa món này").count() == 0 and pg.get_by_role("button", name=re.compile("^Tùy chọn Bữa")).count() == 0, f"{tag} no Sửa or meal ⋯ in day mode (cc-27a: the day has its own ⋯)")
    # today: the four level colours (one palette on ink and light since cc-44: red, amber, light green, green)
    kcal = fills(pg, "Kcal so với mục tiêu ngày")
    level_dark = {"rgb(255, 56, 60)", "rgb(255, 204, 0)", "rgb(0, 200, 179)", "rgb(52, 199, 89)"}
    empty_dark = "rgb(42, 44, 49)"
    lit = [c for c in kcal if c != empty_dark]
    check(len(lit) > 0 and len(set(lit)) == 1 and set(lit) <= level_dark, f"{tag} today kcal bar is lit in one level colour ({set(lit)})")
    check(not (set(lit) & {empty_dark}), f"{tag} lit segments differ from the empty ones")
    pg.screenshot(path=os.path.join(SHOTS, f"cc-22-home-{w}.png"))
    if w == 390:
        pg.screenshot(path=os.path.join(SHOTS, "cc-22-fix-home-390.png"))

    # food mode
    first = foods.first
    name = first.get_attribute("aria-label").split(", ")[0]
    first.click()
    pg.wait_for_timeout(200)
    check(name in hero_label(pg) and hero_label(pg).endswith(" g"), f"{tag} food mode label: {hero_label(pg)}")
    check(captions(pg) == 0, f"{tag} no caption over the nutrient column")
    check(pg.get_by_role("link", name="Sửa món này").count() == 1, f"{tag} Sửa pill on today")
    check(pg.get_by_role("button", name="Xem cả ngày ×").count() == 1, f"{tag} Xem cả ngày × pill")
    pg.screenshot(path=os.path.join(SHOTS, f"cc-22-food-{w}.png"))
    first.click()
    pg.wait_for_timeout(200)
    check(hero_label(pg).startswith("Cả ngày · "), f"{tag} tap again returns to the day")
    # meal mode
    pg.get_by_role("button", name="Xem riêng bữa trưa").click()
    pg.wait_for_timeout(200)
    check(hero_label(pg).startswith("Bữa trưa · "), f"{tag} meal mode label: {hero_label(pg)}")
    check(captions(pg) == 0, f"{tag} no meal caption")
    check(pg.get_by_role("button", name=re.compile("^Tùy chọn Bữa trưa")).count() == 1, f"{tag} ⋯ pill in meal mode on today")
    pg.get_by_role("button", name=re.compile("^Tùy chọn Bữa trưa")).click()
    pg.wait_for_timeout(300)
    check(pg.get_by_role("dialog").count() >= 1, f"{tag} the meal menu sheet opens")
    pg.keyboard.press("Escape")
    pg.wait_for_timeout(200)
    pg.get_by_role("button", name="Xem cả ngày ×").click()
    check(hero_label(pg).startswith("Cả ngày · "), f"{tag} Xem cả ngày × clears the mode")
    # long press on today enters multi-select (Hao, 17/10); it no longer opens the entry
    foods.first.hover()
    box = foods.first.bounding_box()
    pg.mouse.move(box["x"] + 20, box["y"] + 10)
    pg.mouse.down()
    pg.wait_for_timeout(750)
    pg.mouse.up()
    pg.wait_for_timeout(500)
    selecting = pg.locator("header:has-text('Đã chọn')").count() > 0 or pg.locator("[data-tour='select-bar']").count() > 0
    check(selecting and "/entry/" not in pg.url, f"{tag} long press enters multi-select ({pg.url})")
    ctx.close()

    # past day
    ctx, pg = page(browser, size)
    go(pg, f"/app?date={PAST}")
    foods = pg.locator("button[aria-pressed][aria-label*=', ']")
    check(foods.count() >= 1, f"{tag} past day lists foods ({foods.count()})")
    foods.first.click()
    pg.wait_for_timeout(200)
    check(" · " in hero_label(pg) and hero_label(pg).endswith(" g"), f"{tag} past day selection works: {hero_label(pg)}")
    check(pg.get_by_role("link", name="Sửa món này").count() == 0, f"{tag} no Sửa on a past day")
    pg.get_by_role("button", name="Xem cả ngày ×").click()
    pg.get_by_role("button", name="Xem riêng bữa trưa").click()
    pg.wait_for_timeout(200)
    menu = pg.get_by_role("button", name=re.compile("^Tùy chọn Bữa trưa"))
    check(menu.count() == 1, f"{tag} ⋯ on a past day in meal mode")
    check(pg.get_by_role("link", name="Sửa món này").count() == 0, f"{tag} still no Sửa on a past day in meal mode")
    menu.click()
    pg.wait_for_timeout(300)
    sheet = pg.get_by_role("dialog").inner_text()
    check("Lưu vào" in sheet and "Chép hôm qua" not in sheet and "Xóa bữa này" not in sheet, f"{tag} past-day sheet offers only Lưu vào")
    if w == 390:
        pg.screenshot(path=os.path.join(SHOTS, "cc-22-fix-meal-past-390.png"))
    pg.keyboard.press("Escape")
    pg.wait_for_timeout(200)
    pg.get_by_role("button", name="Xem cả ngày ×").click()
    box = foods.first.bounding_box()
    pg.mouse.move(box["x"] + 20, box["y"] + 10)
    pg.mouse.down()
    pg.wait_for_timeout(750)
    pg.mouse.up()
    pg.wait_for_timeout(400)
    check("/entry/" not in pg.url, f"{tag} no long press on a past day")
    pg.get_by_role("button", name="Xem cả ngày ×").click()
    check(pg.get_by_role("link", name=re.compile("Ngày tập")).get_attribute("href") == f"/training?date={PAST}", f"{tag} past training link")
    check(pg.get_by_role("link", name=re.compile("Đủ 22 vi chất")).get_attribute("href") == f"/micros?date={PAST}", f"{tag} past micros link")
    allfills = set()
    for label in ["Kcal so với mục tiêu ngày", "Đạm so với mục tiêu ngày", "Chất béo so với mục tiêu ngày", "Sodium so với mục tiêu ngày", "Calcium so với mục tiêu ngày", "Vitamin C so với mục tiêu ngày"]:
        allfills |= set(fills(pg, label))
    coloured = {"rgb(255, 56, 60)", "rgb(255, 204, 0)", "rgb(0, 200, 179)", "rgb(52, 199, 89)"} & allfills
    check(len(coloured) >= 1, f"{tag} past day bars use level colours {sorted(coloured)}")
    pg.screenshot(path=os.path.join(SHOTS, f"cc-22-past-{w}.png"))
    ctx.close()

    # many foods: sticky headers, only the list scrolls
    ctx, pg = page(browser, size, extra=22)
    go(pg, "/app")
    check(pg.locator("button[aria-pressed][aria-label*=', ']").count() >= 29, f"{tag} 22 seeded foods plus the sample day")
    if phone:
        # V3: the page scrolls and the cards do not; a long day makes the page longer
        scroll = pg.evaluate("document.documentElement.scrollHeight - window.innerHeight")
        check(scroll > 0, f"{tag} 30+ foods: the page scrolls ({scroll})")
        box = pg.evaluate("(() => { const l = " + LIST + "; return [l.scrollHeight, l.clientHeight]; })()")
        check(box[0] <= box[1] + 1, f"{tag} 30+ foods: the meals card does not scroll itself ({box})")
    else:
        pg.evaluate(LIST + ".scrollTop = " + LIST + ".querySelector('section').offsetHeight / 2")
        pg.wait_for_timeout(200)
        sticky = pg.evaluate("(() => { const l = document.querySelector('aside[aria-label=\"Vi chất\"]').previousElementSibling; const hs = [...l.querySelectorAll('button[aria-pressed]:not([aria-label*=\", \"])')]; return hs.map(h => Math.round(h.getBoundingClientRect().top - l.getBoundingClientRect().top)); })()")
        # V3: the 44 px meal header row sticks flush to the top of the list (the card's 1 px border above it)
        check(any(abs(v - 1) <= 1 for v in sticky), f"{tag} a meal header sticks to the top of the list ({sticky}, scrollTop {pg.evaluate(LIST + '.scrollTop')})")
    # empty day: the slot rows
    ctx.close()

    # empty day: every sample item deleted (demo history keeps yesterday)
    ctx, pg = page(browser, size)
    deleted = json.dumps({f"item-{i}": {"deleted": True} for i in range(1, 8)})
    pg.add_init_script(f"try {{ localStorage.setItem('h1t_sample_edits_v1_demo', {json.dumps(deleted)}); }} catch (e) {{}}")
    go(pg, "/app")
    # feat/ngay-mau: an empty day shows the Chép ngày mẫu pill in place of the "Chưa có món nào hôm nay" line (the line returns when its × hides the pill);
    # Chép hôm qua is the first card of the pill's picker, no longer a button of the day
    check(pg.get_by_role("button", name="Chép ngày mẫu").count() == 1, f"{tag} Chép ngày mẫu pill on the empty day")
    check(pg.get_by_role("button", name="Chép hôm qua").count() == 0, f"{tag} no Chép hôm qua button on the empty day")
    pg.get_by_role("button", name="Ẩn gợi ý ngày ăn mẫu hôm nay").first.click()
    pg.wait_for_timeout(500)
    check("Chưa có món nào hôm nay" in pg.inner_text("body"), f"{tag} empty day line after the pill's ×")
    add = pg.get_by_role("link", name=re.compile("^Thêm vào Bữa sáng"))
    check(add.count() == 1 and "meal=breakfast" in (add.get_attribute("href") or ""), f"{tag} empty slot row links to /add with the meal")
    ctx.close()


with sync_playwright() as p:
    os.makedirs(SHOTS, exist_ok=True)
    browser = p.chromium.launch()
    run(browser, {"width": 390, "height": 844}, "390")
    run(browser, {"width": 1280, "height": 800}, "1280")
    browser.close()

for line in notes:
    print(line)
for line in problems:
    print("FAIL: " + line)
print(f"{len(notes)} ok, {len(problems)} FAIL")
sys.exit(1 if problems else 0)
