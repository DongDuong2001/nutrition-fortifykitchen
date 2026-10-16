"""cc-27b: recipes (dishes from ingredients).

Production build, demo mode, 390x844 and 1440x900.
- /foods/new: two modes (Nhập dinh dưỡng, Từ nguyên liệu); the builder; errors under the fields; servings 1 to 20;
  ingredients through the picker sheet; the live "Mỗi phần · N g" card (cooked weight changes the serving weight).
- Lưu món opens /foods/recipe-… : subtitle, the chips 1 phần · N g / ½ phần / 100 g / Tùy chỉnh, "Trong 1 phần",
  Sửa reopens the builder with the saved values; the recipe survives a reload and is found by /add search.
Run with: ALIGN_BASE_URL=http://localhost:3104 npm run probe -- tests/probes/cc_27b.py
"""
import os
import re
import sys

import _demo  # noqa: F401
from playwright.sync_api import sync_playwright

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3104")
SHOTS = os.path.join(os.path.dirname(__file__), "..", "..", ".screenshots")
problems, notes = [], []


def check(cond, msg):
    (notes if cond else problems).append(("ok: " if cond else "") + msg)


def squash(t):
    return re.sub(r"\s+", " ", t).strip()


def add_ingredient(pg, search, name):
    pg.get_by_role("button", name="+ Thêm nguyên liệu").click()
    dlg = pg.get_by_role("dialog", name="Thêm nguyên liệu")
    dlg.wait_for(state="visible", timeout=4000)
    dlg.get_by_label("Tìm món").fill(search)
    pg.wait_for_timeout(400)
    dlg.locator("[data-food-row]").filter(has_text=re.compile(rf"^{re.escape(name)}")).first.click()
    pg.wait_for_timeout(200)


def run(browser, size, tag):
    w = size["width"]
    ctx = browser.new_context(viewport=size)
    pg = ctx.new_page()
    errors = []
    pg.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    pg.on("pageerror", lambda e: errors.append(str(e)))
    pg.goto(BASE + "/foods/new?meal=breakfast", wait_until="networkidle")
    pg.wait_for_timeout(400)
    # cc-42: Tính từ nguyên liệu is the first mode, Tự nhập (the old nutrition form) the second
    nut = pg.get_by_role("button", name="Tự nhập", exact=True)
    rec = pg.get_by_role("button", name="Tính từ nguyên liệu", exact=True)
    check(rec.get_attribute("aria-pressed") == "true" and nut.get_attribute("aria-pressed") == "false", f"{tag}: the builder is the first mode")
    nut.click()
    pg.wait_for_timeout(200)
    check(pg.locator("#cf-name").count() == 1, f"{tag}: the old form is there under Tự nhập")
    rec.click()
    pg.wait_for_timeout(200)
    check(pg.locator("#rb-name").count() == 1 and pg.locator("#cf-name").count() == 0, f"{tag}: the builder replaces the form")
    check("Chưa có nguyên liệu" in pg.inner_text("main") if pg.locator("main").count() else True, f"{tag}: empty ingredient list text")

    # errors under the fields
    pg.get_by_role("button", name="Lưu món").click()
    pg.wait_for_timeout(200)
    body = pg.inner_text("body")
    check("Nhập tên món" in body and "Thêm ít nhất một nguyên liệu" in body, f"{tag}: errors under the name and the ingredient list")
    check(pg.url.endswith("/foods/new?meal=breakfast"), f"{tag}: nothing saved with errors")

    # name and servings
    pg.locator("#rb-name").fill("Cơm chiên thử")
    minus = pg.get_by_role("button", name="Bớt một phần")
    plus = pg.get_by_role("button", name="Thêm một phần")
    check(minus.is_disabled(), f"{tag}: − is disabled at 1 phần")
    check(minus.bounding_box()["height"] >= 43.5 and plus.bounding_box()["height"] >= 43.5, f"{tag}: servings buttons are 44 px")
    plus.click()
    check("2 phần" in pg.locator("#rb-servings").inner_text(), f"{tag}: + gives 2 phần")
    for _ in range(25):
        if plus.is_disabled():
            break
        plus.click()
    check("20 phần" in pg.locator("#rb-servings").inner_text() and plus.is_disabled(), f"{tag}: stops at 20 phần")
    for _ in range(18):
        minus.click()
    check("2 phần" in pg.locator("#rb-servings").inner_text(), f"{tag}: back to 2 phần")

    # ingredients
    add_ingredient(pg, "gạo lứt", "Cơm gạo lứt")
    add_ingredient(pg, "trứng", "Trứng gà")
    rows = pg.locator("[data-align-group=recipe-row]")
    check(rows.count() == 2, f"{tag}: two ingredient rows ({rows.count()})")
    check(pg.get_by_label("Khối lượng Cơm gạo lứt").count() == 1, f"{tag}: row has its amount field")
    rm = pg.get_by_role("button", name="Bỏ Trứng gà")
    check(rm.bounding_box()["width"] >= 43.5 and rm.bounding_box()["height"] >= 43.5, f"{tag}: remove is 44 px")
    pg.get_by_role("button", name="Lưu món").click()
    pg.wait_for_timeout(200)
    check(pg.get_by_text("Nhập khối lượng lớn hơn 0").count() == 2, f"{tag}: an empty amount is an error under its row ({pg.get_by_text('Nhập khối lượng lớn hơn 0').count()})")
    pg.get_by_label("Khối lượng Cơm gạo lứt").fill("200")
    pg.get_by_label("Khối lượng Trứng gà").fill("100")
    pg.wait_for_timeout(200)
    card = pg.locator("[data-recipe-card]")
    t = squash(card.inner_text())
    check("Mỗi phần · 150 g" in t, f"{tag}: card shows the serving weight from the raw total ({t[:60]})")
    check(re.search(r"Có dữ liệu \d+/22 vi chất", t) is not None, f"{tag}: card shows the micros coverage")
    check(re.search(r"\d[\d.]*\s*kcal", t) is not None and "Đạm" in t and "Tinh bột" in t and "Chất béo" in t, f"{tag}: card shows kcal and the three macros ({t})")
    pg.locator("#rb-cooked").fill("240")
    pg.wait_for_timeout(200)
    check("Mỗi phần · 120 g" in squash(card.inner_text()), f"{tag}: the cooked weight sets the serving weight")
    check("Cân cả nồi sau khi nấu để ghi theo gram cho đúng. Bỏ trống thì mỗi phần tính theo tổng nguyên liệu." in squash(pg.inner_text("body")), f"{tag}: helper text under the cooked weight")
    pg.screenshot(path=os.path.join(SHOTS, f"cc-27b-builder-{w}.png"), full_page=True)

    # unit toggle
    unit = pg.get_by_role("button", name=re.compile("^Đơn vị của Trứng gà"))
    unit.click()
    check(unit.inner_text().strip() == "ml", f"{tag}: the unit flips to ml")
    unit.click()

    # save
    pg.get_by_role("button", name="Lưu món").click()
    pg.wait_for_url(re.compile(r".*/foods/recipe-\d+.*"), timeout=8000)
    pg.wait_for_timeout(600)
    detail_url = pg.url
    head = squash(pg.locator("header").first.text_content())
    check("Cơm chiên thử" in head and "Món của tôi · 2 phần · 2 nguyên liệu" in head, f"{tag}: header subtitle ({head[:100]})")
    for chip in ["1 phần · 120 g", "½ phần", "100 g", "Tùy chỉnh"]:
        check(pg.get_by_role("button", name=chip, exact=True).count() == 1, f"{tag}: chip {chip}")
    check(pg.get_by_role("button", name="1 phần · 120 g", exact=True).get_attribute("aria-pressed") == "true", f"{tag}: 1 phần is the default")
    card = pg.get_by_label("Trong 1 phần")
    ct = squash(card.inner_text())
    check("Cơm gạo lứt 100 g" in ct and "Trứng gà 50 g" in ct, f"{tag}: ingredients per serving ({ct})")
    edit = card.get_by_role("link", name="Sửa")
    check(edit.bounding_box()["height"] >= 43.5, f"{tag}: Sửa is 44 px")
    pg.screenshot(path=os.path.join(SHOTS, f"cc-27b-detail-{w}.png"), full_page=True)
    # unknown micros stay a dash
    check("—" in pg.inner_text("main"), f"{tag}: micros with no data show a dash")

    # reload keeps it
    pg.reload(wait_until="networkidle")
    pg.wait_for_timeout(600)
    check("Món của tôi · 2 phần · 2 nguyên liệu" in squash(pg.locator("header").first.text_content()), f"{tag}: the recipe survives a reload")

    # edit
    pg.get_by_label("Trong 1 phần").get_by_role("link", name="Sửa").click()
    pg.wait_for_url(re.compile(r".*/foods/new\?recipe=recipe-\d+.*"), timeout=8000)
    pg.wait_for_timeout(600)
    check(pg.locator("#rb-name").input_value() == "Cơm chiên thử", f"{tag}: edit opens with the saved name")
    check(pg.locator("[data-align-group=recipe-row]").count() == 2 and pg.locator("#rb-cooked").input_value() == "240", f"{tag}: edit has the ingredients and the cooked weight")
    check(pg.get_by_role("button", name="Tự nhập", exact=True).count() == 0, f"{tag}: no mode switch while editing")
    pg.get_by_role("button", name="Thêm một phần").click()
    pg.get_by_role("button", name="Lưu món").click()
    pg.wait_for_url(re.compile(r".*/foods/recipe-\d+.*"), timeout=8000)
    pg.wait_for_timeout(500)
    check(pg.url.split("?")[0] == detail_url.split("?")[0], f"{tag}: an edit keeps the same recipe")
    check("3 phần" in squash(pg.locator("header").first.text_content()), f"{tag}: the edit shows (3 phần)")

    # found by search and loggable
    pg.goto(BASE + "/add?meal=snack", wait_until="networkidle")
    pg.wait_for_timeout(500)
    root = pg.locator('[role="dialog"]:visible').first
    root.get_by_label("Tìm món").fill("cơm chiên thử")
    pg.wait_for_timeout(500)
    row = root.locator("[data-food-row]").filter(has_text="Cơm chiên thử").first
    check(row.count() == 1, f"{tag}: /add search finds the recipe")
    check(row.get_by_text("Của tôi", exact=True).count() == 1, f"{tag}: it is tagged Của tôi")
    row.click()
    pg.wait_for_timeout(400)
    check(errors == [] or all("preloaded using link preload" in e for e in errors), f"{tag}: no console errors {errors[:1]}")
    sc = pg.evaluate("document.documentElement.scrollWidth - window.innerWidth")
    check(sc <= 0, f"{tag}: no horizontal scroll ({sc})")
    ctx.close()


with sync_playwright() as p:
    os.makedirs(SHOTS, exist_ok=True)
    browser = p.chromium.launch()
    run(browser, {"width": 390, "height": 844}, "390")
    run(browser, {"width": 1440, "height": 900}, "1440")
    browser.close()

for line in notes:
    print(line)
for line in problems:
    print("FAIL: " + line)
print(f"{len(notes)} ok, {len(problems)} FAIL")
sys.exit(1 if problems else 0)
