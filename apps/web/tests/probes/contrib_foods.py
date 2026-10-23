"""Hotfix 23/10: the nutrient page's food list adds up to the number at the top (Chất béo, a day of 24 entries).

Production build, demo mode with every sample item deleted (so the day is the 24 entries alone), clock fixed at 2026-10-23 20:15
Asia/Ho_Chi_Minh, 390x844 (and 1280x800 for the checks).
- the hero says 103 g; the card lists the five largest foods and a last row "Món khác · 4 món" (a button, 48 px or taller, a chevron);
  Thịt bò nạc is one row, "200 g · 2 lần"; the five rows and Món khác come to the hero (to rounding); the footer reads "Tổng 103 g từ 9 món"
- the button sets aria-expanded, opens the other four foods in place ("Thu gọn" to close) and keeps focus on itself, by keyboard and by tap
- a past day reads the same; 5 foods or fewer has no Món khác row; an empty day keeps its copy
Screenshots (390): .screenshots/contrib-foods-collapsed.png and contrib-foods-expanded.png.
Run with: ALIGN_BASE_URL=http://localhost:3111 npm run probe -- tests/probes/contrib_foods.py
"""
# PROBE_COVERS: app/(app)/micros/** components/nutrient-detail/** lib/nutrient-sources.ts
import json
import os
import re
import sys

import _demo  # noqa: F401  (demo mode on for every page)
from playwright.sync_api import sync_playwright

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3110")
NOW = "2026-10-23T20:15:00+07:00"
SHOTS = os.path.join(os.path.dirname(__file__), "..", "..", ".screenshots")
problems, notes = [], []

# meal, foodId, name, qty, grams, fat (as scaled): the same 24 entries as lib/__tests__/contrib-day-fixture.ts
ROWS = [
    ("breakfast", "tu-trung", "Trứng gà", "100 g", 100, 10.5),
    ("breakfast", "tu-kefir", "Kefir", "360 g", 360, 12.96),
    ("breakfast", "tu-ca-phe", "Cà phê đen", "200 ml", 200, 0),
    ("breakfast", "tu-nuoc", "Nước lọc", "300 ml", 300, 0),
    ("lunch", "tu-com", "Cơm trắng", "200 g", 200, 0.5),
    ("lunch", "tu-bo-nac", "Thịt bò nạc", "100 g", 100, 12),
    ("lunch", "tu-bo", "Quả bơ", "196 g", 196, 29.4),
    ("lunch", "tu-rau-muong", "Rau muống luộc", "150 g", 150, 0),
    ("lunch", "tu-hau", "Hàu", "100 g", 100, 2.5),
    ("lunch", "tu-nuoc", "Nước lọc", "500 ml", 500, 0),
    ("snack", "tu-hat-bi", "Hạt bí", "20 g", 20, 9.8),
    ("snack", "tu-kefir", "Kefir", "180 g", 180, 6.48),
    ("snack", "tu-flex", "Vinamilk Flex", "200 ml", 200, 2.4),
    ("snack", "tu-pho-mai", "Phô mai", "25 g", 25, 4),
    ("snack", "tu-dua-hau", "Dưa hấu", "200 g", 200, 0),
    ("snack", "tu-tao", "Táo", "150 g", 150, 0),
    ("dinner", "tu-bo-nac", "Thịt bò nạc", "100 g", 100, 12),
    ("dinner", "tu-com", "Cơm trắng", "150 g", 150, 0.4),
    ("dinner", "tu-cai-thia", "Cải thìa", "100 g", 100, 0),
    ("dinner", "tu-canh-bi", "Canh bí", "200 ml", 200, 0),
    ("dinner", "tu-cam", "Cam", "150 g", 150, 0),
    ("dinner", "tu-nuoc", "Nước lọc", "500 ml", 500, 0),
    ("dinner", "tu-buoi", "Bưởi", "100 g", 100, 0),
    ("dinner", "tu-nho", "Nho", "100 g", 100, 0),
]
SAMPLE_IDS = [f"item-{i}" for i in range(1, 8)]
CARD = "[role=region][aria-labelledby=nutrient-sources-title]"
ROW = '[data-align-group="nutrient-source"]'


def check(cond, msg):
    (notes if cond else problems).append(("ok: " if cond else "") + msg)


def entries(day=None):
    out = []
    for i, (meal, food_id, name, qty, grams, fat) in enumerate(ROWS):
        e = {
            "id": f"tu-{i + 1}", "foodId": food_id, "foodName": name, "grams": grams, "displayQty": qty, "mealSlot": meal,
            "calories": 0, "protein": 0, "carbs": 0, "fat": round(fat, 1), "fiber": 0, "nutrients": {"fat": fat},
            "addedAt": "2026-10-23T01:00:00.000Z",
        }
        if day:
            e["day"] = day
        out.append(e)
    return out


def page(browser, size, items):
    ctx = browser.new_context(viewport=size, reduced_motion="no-preference")
    ctx.add_init_script(
        "try { localStorage.setItem('h1t_added_entries_v1_demo', %s); localStorage.setItem('h1t_sample_edits_v1_demo', %s); } catch (e) {}"
        % (json.dumps(json.dumps(items)), json.dumps(json.dumps({i: {"deleted": True} for i in SAMPLE_IDS})))
    )
    pg = ctx.new_page()
    pg.clock.set_fixed_time(NOW)
    errors = []
    pg.on("console", lambda m: errors.append(m.text) if m.type in ("error", "warning") else None)
    pg.on("pageerror", lambda e: errors.append(str(e)))
    return ctx, pg, errors


def number(text):
    """The last amount in grams of a row: 'Quả bơ · 196 g 29,4 g' -> 29.4, '1.041 g' -> 1041"""
    found = re.findall(r"(\d[\d.]*(?:,\d+)?)\s*g\b", text)
    return float(found[-1].replace(".", "").replace(",", ".")) if found else None


def rows_text(pg):
    return [" ".join(t.split()) for t in pg.locator(f"{CARD} {ROW}").all_inner_texts()]


def run(browser, size, tag):
    ctx, pg, errors = page(browser, size, entries())
    pg.goto(BASE + "/micros/fat", wait_until="networkidle")
    pg.wait_for_timeout(800)
    card = pg.locator(CARD)
    hero = " ".join(pg.locator("[role=region][aria-label$='hôm nay']").first.inner_text().split())
    check("103 g" in hero, f"{tag} the hero says 103 g (got: {hero[:60]})")

    # collapsed: 5 foods + the button row
    texts = rows_text(pg)
    check(len(texts) == 6, f"{tag} collapsed: 5 foods and Món khác ({len(texts)} rows)")
    check(sum("Thịt bò nạc" in t for t in texts) == 1 and any("200 g · 2 lần" in t for t in texts), f"{tag} Thịt bò nạc once, 200 g · 2 lần")
    button = card.locator("button[aria-controls]")  # its name changes to Thu gọn when open
    check(button.count() == 1 and "Món khác · 4 món" in button.inner_text(), f"{tag} the last row is the Món khác · 4 món button")
    box = button.bounding_box()
    check(box is not None and box["height"] >= 48, f"{tag} the button is 48 px or taller ({box and box['height']})")
    check(button.get_attribute("aria-expanded") == "false", f"{tag} collapsed: aria-expanded=false")
    parts = [number(t) for t in texts]
    check(all(p is not None for p in parts), f"{tag} every row ends in an amount in grams")
    total_rows = sum(p or 0 for p in parts)
    check(abs(total_rows - 103) <= 0.5, f"{tag} the five rows and Món khác come to 103 g ({total_rows:.1f})")
    check("Tổng 103 g từ 9 món" in " ".join(card.inner_text().split()), f"{tag} the footer reads Tổng 103 g từ 9 món")
    left_right = pg.evaluate(
        """(sel) => [...document.querySelectorAll(sel)].map((e) => { const r = e.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.right)]; })""",
        f"{CARD} {ROW}",
    )
    check(len({tuple(x) for x in left_right}) == 1, f"{tag} all rows share left and right edges ({set(map(tuple, left_right))})")
    if tag == "390":
        card.scroll_into_view_if_needed()
        pg.evaluate("() => window.scrollTo(0, document.querySelector('[aria-labelledby=nutrient-sources-title]').offsetTop - 120)")
        pg.wait_for_timeout(300)
        pg.screenshot(path=os.path.join(SHOTS, "contrib-foods-collapsed.png"))

    # by keyboard: Enter opens, focus stays on the button, Enter closes
    button.focus()
    pg.keyboard.press("Enter")
    pg.wait_for_timeout(500)
    check(button.get_attribute("aria-expanded") == "true", f"{tag} Enter: aria-expanded=true")
    check(pg.evaluate("(sel) => document.activeElement === document.querySelector(sel)", f"{CARD} button"), f"{tag} focus stays on the button after opening")
    texts = rows_text(pg)
    check(len(texts) == 10 and "Thu gọn" in texts[-1], f"{tag} expanded: all 9 foods and Thu gọn ({len(texts)} rows)")
    check(sum("Cơm trắng" in t and "350 g · 2 lần" in t for t in texts) == 1, f"{tag} the rest includes Cơm trắng 350 g · 2 lần")
    all_amounts = [number(t) for t in texts[:-1]]
    check(abs(sum(a or 0 for a in all_amounts) - 103) <= 0.5, f"{tag} the nine rows come to 103 g ({sum(a or 0 for a in all_amounts):.1f})")
    if tag == "390":
        pg.evaluate("() => window.scrollTo(0, document.querySelector('[aria-labelledby=nutrient-sources-title]').offsetTop - 120)")
        pg.wait_for_timeout(300)
        pg.screenshot(path=os.path.join(SHOTS, "contrib-foods-expanded.png"), full_page=False)
        pg.screenshot(path=os.path.join(SHOTS, "contrib-foods-expanded-full.png"), full_page=True)
    pg.keyboard.press("Space")
    pg.wait_for_timeout(500)
    check(button.get_attribute("aria-expanded") == "false", f"{tag} Space: aria-expanded=false")
    check(pg.evaluate("(sel) => document.activeElement === document.querySelector(sel)", f"{CARD} button"), f"{tag} focus stays on the button after closing")
    check(len(rows_text(pg)) == 6, f"{tag} closed again: 5 foods and Món khác")

    # by tap
    button.click()
    pg.wait_for_timeout(500)
    check(button.get_attribute("aria-expanded") == "true" and len(rows_text(pg)) == 10, f"{tag} tap opens")
    check(pg.evaluate("(sel) => document.activeElement === document.querySelector(sel)", f"{CARD} button"), f"{tag} focus on the button after a tap")
    check(pg.evaluate("() => document.documentElement.scrollWidth <= document.documentElement.clientWidth"), f"{tag} no sideways scroll")
    check(not [e for e in errors if "data-gr-" not in e], f"{tag} no console errors or warnings ({errors[:2]})")
    ctx.close()


def past_and_small(browser):
    # a past day with the same entries filed under it reads the same
    ctx, pg, errors = page(browser, {"width": 390, "height": 844}, entries("2026-10-22"))
    pg.goto(BASE + "/micros/fat?date=2026-10-22", wait_until="networkidle")
    pg.wait_for_timeout(1000)
    body = " ".join(pg.inner_text("body").split())
    check("Đã có từ món ăn của ngày này" in body, "past day: the card is the day's")
    check("Món khác · 4 món" in body and "Tổng 103 g từ 9 món" in body, "past day: Món khác · 4 món and Tổng 103 g từ 9 món")
    ctx.close()

    # four foods: no Món khác row and no button, the footer still reads the total
    ctx, pg, errors = page(browser, {"width": 390, "height": 844}, entries()[:6])
    pg.goto(BASE + "/micros/fat", wait_until="networkidle")
    pg.wait_for_timeout(800)
    card = pg.locator(CARD)
    check(len(rows_text(pg)) == 4 and card.get_by_role("button").count() == 0, "four foods: four rows, no Món khác button")
    check("Tổng 36 g từ 4 món" in " ".join(card.inner_text().split()), "four foods: the footer reads Tổng 36 g từ 4 món")
    ctx.close()

    # no food: today's empty copy, no footer
    ctx, pg, errors = page(browser, {"width": 390, "height": 844}, [])
    pg.goto(BASE + "/micros/fat", wait_until="networkidle")
    pg.wait_for_timeout(800)
    text = " ".join(pg.locator(CARD).inner_text().split())
    check("Chưa có món nào có chất này hôm nay." in text and "Tổng" not in text, "no food: the empty copy and no total")
    ctx.close()


with sync_playwright() as p:
    os.makedirs(SHOTS, exist_ok=True)
    browser = p.chromium.launch()
    run(browser, {"width": 390, "height": 844}, "390")
    run(browser, {"width": 1280, "height": 800}, "1280")
    past_and_small(browser)
    browser.close()

for line in notes:
    print(line)
for line in problems:
    print("FAIL: " + line)
print(f"{len(notes)} ok, {len(problems)} FAIL")
sys.exit(1 if problems else 0)
