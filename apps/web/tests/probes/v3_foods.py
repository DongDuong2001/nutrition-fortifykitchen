"""v3 foods screens: Tạo món mới (Tự nhập), the food page and the comparison, at 390 and 1280.

- Tạo món mới: every field has a visible label, a placeholder (an example for the name and the portion, "–" for a number from the
  label: blank is no data, custom-food-nutrients), 16 px text and a 44 px+ hit area; the kcal error shows beside its field; saving a
  typed food goes to Hôm nay
- Food page: the portion is one white card with a "Khẩu phần" heading; kcal and the macros take the macro identity colours
- Compare: the Tính theo control is the V3 segmented control and switches basis
Run with: ALIGN_BASE_URL=http://localhost:3102 npm run probe -- tests/probes/v3_foods.py
"""
# PROBE_COVERS: app/(app)/foods/** components/foods/**
import os
import sys

from playwright.sync_api import sync_playwright
import _demo  # noqa: F401

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3102")
problems, notes = [], []


def check(cond, msg):
    (notes if cond else problems).append(("ok: " if cond else "") + msg)


def create_food(browser, w):
    ctx = browser.new_context(viewport={"width": w, "height": 844})
    pg = ctx.new_page()
    errors = []
    pg.on("pageerror", lambda e: errors.append(str(e)))
    pg.goto(BASE + "/foods/new?meal=lunch&mode=nutrition", wait_until="networkidle")
    pg.wait_for_timeout(500)
    seg = pg.get_by_role("group", name="Cách tạo món")
    check(seg.count() == 1 and seg.get_by_role("button", name="Tự nhập").get_attribute("aria-pressed") == "true", f"{w}: Tự nhập is picked in the segmented control")
    for fid in ["cf-name", "cf-size", "cf-kcal", "cf-pro", "cf-carbs", "cf-fiber", "cf-sugars", "cf-fat", "cf-satfat", "cf-trans", "cf-chol", "cf-na"]:
        f = pg.locator("#" + fid)
        label = pg.locator(f"label[for={fid}]")
        ph = f.get_attribute("placeholder") or ""
        size = float(f.evaluate("e => parseFloat(getComputedStyle(e).fontSize)"))
        box = f.bounding_box()
        check(label.count() == 1 and label.is_visible(), f"{w}: #{fid} has a visible label")
        if fid in ("cf-name", "cf-size"):
            check("Ví dụ" in ph, f"{w}: #{fid} has an example placeholder ({ph!r})")
        else:
            check(ph == "–", f"{w}: #{fid} shows – while blank ({ph!r})")
        check(size >= 16, f"{w}: #{fid} text is {size:.0f} px")
        check(box and box["height"] >= 44, f"{w}: #{fid} is {box['height']:.0f} px high")
    # the error beside the field
    pg.locator("#cf-kcal").focus()
    pg.locator("#cf-kcal").blur()
    pg.wait_for_timeout(400)
    err = pg.locator("#cf-kcal-error")
    check(err.count() == 1 and "Nhập năng lượng" in err.inner_text(), f"{w}: the kcal error shows under its field")
    check(pg.locator("#cf-kcal").get_attribute("aria-invalid") == "true", f"{w}: the kcal field is aria-invalid")
    pg.fill("#cf-name", "Bánh tráng trộn")
    pg.fill("#cf-kcal", "300")
    pg.get_by_role("button", name="Lưu và thêm").click()
    pg.wait_for_url("**/app", timeout=15000)
    check(True, f"{w}: a typed food is saved and Hôm nay opens")
    check(not errors, f"{w}: no page errors {errors[:1]}")
    ctx.close()


def recipe(browser, w):
    ctx = browser.new_context(viewport={"width": w, "height": 844})
    pg = ctx.new_page()
    pg.goto(BASE + "/foods/new?meal=lunch", wait_until="networkidle")
    pg.wait_for_timeout(600)
    check("Ví dụ" in (pg.locator("#rb-name").get_attribute("placeholder") or ""), f"{w}: recipe name has an example placeholder")
    pg.get_by_role("button", name="Lưu món").click()
    pg.wait_for_timeout(500)
    check(pg.locator("#rb-name-error").count() == 1, f"{w}: the recipe name error shows under its field")
    pg.get_by_role("button", name="+ Thêm nguyên liệu").click()
    dlg = pg.get_by_role("dialog", name="Chọn nguyên liệu")
    dlg.wait_for(state="visible", timeout=6000)
    dlg.get_by_label("Tìm món").fill("Cơm")
    pg.wait_for_timeout(800)
    dlg.locator("[data-food-row]").first.click(timeout=8000)
    dlg.get_by_role("button", name="Thêm vào món").click()
    pg.wait_for_timeout(400)
    amt = pg.locator("input[id^=rb-amount-]").first
    check(amt.count() == 1 and "Ví dụ" in (amt.get_attribute("placeholder") or ""), f"{w}: an ingredient row has an amount field with an example")
    ctx.close()


def food_page(browser, w):
    ctx = browser.new_context(viewport={"width": w, "height": 844})
    pg = ctx.new_page()
    pg.goto(BASE + "/foods/food-com-gao-lut", wait_until="networkidle")
    pg.wait_for_timeout(600)
    sec = pg.locator("section[aria-labelledby=portion-h]")
    check(sec.count() == 1 and sec.locator("h2").inner_text().strip().lower() == "khẩu phần", f"{w}: the portion is one card headed Khẩu phần")
    kcal = pg.get_by_text("kcal", exact=True).first
    check(kcal.count() == 1, f"{w}: the kcal stat shows")
    colour = pg.evaluate("""() => {
      const el = [...document.querySelectorAll('main span')].find(s => s.textContent.trim() === 'Đạm' && s.querySelector('span'));
      return el ? getComputedStyle(el.parentElement.firstElementChild).color : null;
    }""")
    check(colour is not None and colour != "rgb(17, 19, 23)", f"{w}: the Đạm value has its identity colour ({colour})")
    check(pg.locator("section[aria-labelledby=food-micros] h3").count() == 2, f"{w}: Khoáng chất and Vitamin headers")
    bars = pg.locator("section[aria-labelledby=food-micros] [role=img]")
    check(bars.count() >= 1, f"{w}: the nutrient bars show")
    ctx.close()


def compare(browser, w):
    ctx = browser.new_context(viewport={"width": w, "height": 844})
    pg = ctx.new_page()
    pg.goto(BASE + "/foods/compare?ids=food-com-gao-lut,food-yogurt-kefir", wait_until="networkidle")
    pg.wait_for_timeout(600)
    g = pg.get_by_role("group", name="Tính theo")
    check(g.count() == 1, f"{w}: Tính theo is one group")
    b100 = g.get_by_role("button", name="100 g")
    bs = g.get_by_role("button", name="Khẩu phần")
    check(b100.get_attribute("aria-pressed") == "true", f"{w}: 100 g is picked first")
    bs.click()
    pg.wait_for_timeout(300)
    check(bs.get_attribute("aria-pressed") == "true", f"{w}: Khẩu phần switches the basis")
    check(pg.locator("[role=columnheader]").count() >= 2, f"{w}: the table has a column per food")
    ctx.close()


def big_text(browser):
    """D-LAY-04: nothing scrolls sideways with the root font at 32 px (200 %), on the three screens."""
    ctx = browser.new_context(viewport={"width": 390, "height": 844})
    pg = ctx.new_page()
    for route in ["/foods/food-cha-la", "/foods/compare?ids=food-com-gao-lut,food-yogurt-kefir", "/foods/new?mode=nutrition", "/foods/new"]:
        pg.goto(BASE + route, wait_until="networkidle")
        pg.wait_for_timeout(500)
        pg.evaluate("document.documentElement.style.fontSize = '32px'")
        pg.wait_for_timeout(300)
        wide = pg.evaluate("""() => [...document.querySelectorAll('main *')].filter(e => e.getBoundingClientRect().right > window.innerWidth + 0.5).slice(0, 3).map(e => e.tagName + '.' + String(e.className).slice(0, 60) + ' ' + e.textContent.trim().slice(0, 20))""")
        check(not wide and pg.evaluate("document.documentElement.scrollWidth <= window.innerWidth"), f"200 % text {route}: no sideways scroll {wide}")
    ctx.close()


with sync_playwright() as p:
    browser = p.chromium.launch()
    try:
        big_text(browser)
    except Exception as e:  # noqa: BLE001
        problems.append(f"big_text: {e}")
    for w in (390, 1280):
        for fn in (create_food, recipe, food_page, compare):
            try:
                fn(browser, w)
            except Exception as e:  # noqa: BLE001
                problems.append(f"{fn.__name__} {w}: {e}")
    browser.close()

for n in notes:
    print(n)
for pr in problems:
    print("PROBLEM:", pr)
sys.exit(1 if problems else 0)
