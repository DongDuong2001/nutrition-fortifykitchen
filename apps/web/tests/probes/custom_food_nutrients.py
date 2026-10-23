"""custom-food-nutrients: Tạo món mới › Tự nhập takes every nutrient on a label.

At 360 px, at 360 with the root font at 150 % and at 390:
- The main block is Năng lượng *, Đạm, Tinh bột, Chất xơ, Đường, Chất béo, Bão hòa, Trans, Cholesterol, Sodium (in that order), two
  columns, every field "–" while blank (no data, never 0), inputmode decimal, 44 px or taller; no label wraps or is cut, the page does not
  scroll sideways.
- "+ Thêm vi chất khác" opens a sheet: a search field, Calcium, Iron, Potassium, Vitamin D first, then Vitamin and Khoáng chất; Sodium is
  not there (it is in the main block). The search finds Magnesium by "mag" and by "magie".
- Picking Vitamin C closes the sheet, adds the field under the main block and focuses it; Vitamin C is then gone from the sheet. Three
  fields added; the × of one takes it off and gives it back to the sheet.
At 390 on an empty day: a food with fibre 4 g, sugar 9 g, Vitamin C 40 mg and Magnesium 60 mg (per 100 g serving) is saved and logged;
the food page shows Vitamin C 40 mg and Magnesium 60 mg; Hôm nay counts them (Chất xơ 4 g in its row (C3), the Vitamin C and Magnesium rows
of the nutrient column). Chất xơ and Đường are reported for the food page, which has no row for either (OPEN_QUESTIONS).
Below 18 rem of card (360 px at 150 % text) the fields stack in one column; the column count is reported.
Shots: .screenshots/custom-food-nutrients/<form|sheet|added3>-<360|360-text150|390>.png.
Run with: ALIGN_BASE_URL=http://localhost:3101 npm run probe -- tests/probes/custom_food_nutrients.py
"""
# PROBE_COVERS: app/(app)/foods/new/** components/foods/nutrient-picker-sheet.tsx components/foods/food-field.tsx lib/custom-food-fields.ts
import os
import re
import sys
from pathlib import Path

import _demo  # noqa: F401
from playwright.sync_api import sync_playwright
from share_micros import NO_SAMPLE

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3101")
OUT = Path(__file__).resolve().parent.parent.parent / ".screenshots" / "custom-food-nutrients"
OUT.mkdir(parents=True, exist_ok=True)
CASES = [("360", {"width": 360, "height": 780}, False), ("360-text150", {"width": 360, "height": 780}, True), ("390", {"width": 390, "height": 844}, False)]
MAIN = [
    ("cf-kcal", "Năng lượng"), ("cf-pro", "Đạm"), ("cf-carbs", "Tinh bột"), ("cf-fiber", "Chất xơ"), ("cf-sugars", "Đường"),
    ("cf-fat", "Chất béo"), ("cf-satfat", "Bão hòa"), ("cf-trans", "Trans"), ("cf-chol", "Cholesterol"), ("cf-na", "Sodium"),
]
problems = []

# Every text leaf under a root: its text, its lines and whether its box clips it
LEAVES = """(root) => {
  const out = [];
  for (const el of root.querySelectorAll('*')) {
    if (el.closest('.sr-only')) continue;
    const texts = [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim());
    if (!texts.length) continue;
    const tops = [];
    for (const t of texts) {
      const r = document.createRange(); r.selectNodeContents(t);
      for (const q of r.getClientRects()) if (!tops.some((y) => Math.abs(y - q.top) < q.height / 2)) tops.push(q.top);
    }
    out.push({ text: el.textContent.trim().replace(/\\s+/g, ' ').slice(0, 60), lines: tops.length, clipped: el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflowX !== 'visible' || el.scrollWidth > el.clientWidth + 1 && el.tagName === 'INPUT' });
  }
  return out;
}"""


def check(cond, msg):
    print(("[PASS] " if cond else "[FAIL] ") + msg)
    if not cond:
        problems.append(msg)


def open_form(browser, size, big, empty_day=False):
    ctx = browser.new_context(viewport=size)
    if empty_day:
        ctx.add_init_script("try { localStorage.setItem('h1t_sample_edits_v1_demo', %r) } catch (e) {}" % NO_SAMPLE)
    pg = ctx.new_page()
    errors = []
    pg.on("pageerror", lambda e: errors.append(str(e)))
    pg.goto(BASE + "/foods/new?meal=lunch&mode=nutrition", wait_until="networkidle")
    pg.wait_for_timeout(500)
    if big:
        pg.evaluate("document.documentElement.style.fontSize = '150%'")
        pg.wait_for_timeout(300)
    return ctx, pg, errors


def sheet_rows(dlg):
    return [t.strip() for t in dlg.locator("li button, section button").all_inner_texts()]


def shot(pg, name, tag):
    pg.screenshot(path=str(OUT / f"{name}-{tag}.png"), full_page=False)


def form_case(browser, tag, size, big):
    ctx, pg, errors = open_form(browser, size, big)
    card = pg.locator("section[aria-labelledby=cf-nutrition]")
    ids = card.locator("input").evaluate_all("els => els.map((e) => e.id)")
    check(ids == [i for i, _ in MAIN], f"{tag}: the main block is in label order ({ids})")
    for fid, label in MAIN:
        f = pg.locator("#" + fid)
        lab = pg.locator(f"label[for={fid}]")
        check(label in lab.inner_text(), f"{tag}: #{fid} is labelled {label}")
        check(f.get_attribute("placeholder") == "–", f"{tag}: #{fid} shows – while blank ({f.get_attribute('placeholder')!r})")
        check(f.get_attribute("inputmode") == "decimal", f"{tag}: #{fid} has inputmode decimal")
        box = f.bounding_box()
        check(box and box["height"] >= 44, f"{tag}: #{fid} is {box['height']:.0f} px high")
    stars = [fid for fid, _ in MAIN if "*" in pg.locator(f"label[for={fid}] [aria-hidden=true]:not(span.inline-block)").all_inner_texts().__str__()]
    check(stars == ["cf-kcal"], f"{tag}: kcal is the one required field ({stars})")
    # Sub-rows sit on the same two columns as the rows above them
    col = lambda fid: round(pg.locator("#" + fid).bounding_box()["x"])
    check(col("cf-fiber") == col("cf-kcal") and col("cf-sugars") == col("cf-pro"), f"{tag}: Chất xơ and Đường sit on the two columns")
    check(col("cf-satfat") == col("cf-kcal") and col("cf-trans") == col("cf-pro"), f"{tag}: Bão hòa and Trans sit on the two columns")
    leaves = card.evaluate(LEAVES)
    labels = [l for l in leaves if any(l["text"].startswith(lab) for _, lab in MAIN)]
    check(not [l for l in labels if l["lines"] > 1], f"{tag}: no field label wraps {[l['text'] for l in labels if l['lines'] > 1]}")
    check(not [l for l in leaves if l["clipped"]], f"{tag}: nothing in the card is cut {[l['text'] for l in leaves if l['clipped']]}")
    check(pg.evaluate("document.documentElement.scrollWidth <= window.innerWidth"), f"{tag}: no sideways scroll")
    cols = len(set(col(fid) for fid, _ in MAIN))
    print(f"[INFO] {tag}: the main block is in {cols} column(s)")
    card.scroll_into_view_if_needed()
    shot(pg, "form", tag)
    # A long label value fits its field (no number scrolls inside its box)
    for fid, _ in MAIN:
        pg.fill("#" + fid, "1.000,5")
    tight = pg.evaluate("ids => ids.filter((id) => { const e = document.getElementById(id); return e.scrollWidth > e.clientWidth; })", [fid for fid, _ in MAIN])
    check(not tight, f"{tag}: 1.000,5 fits every field {tight}")
    # A fresh form for the sheet (the kcal field emptied after a value shows its error)
    pg.reload(wait_until="networkidle")
    pg.wait_for_timeout(500)
    if big:
        pg.evaluate("document.documentElement.style.fontSize = '150%'")
        pg.wait_for_timeout(300)

    # The sheet
    pg.get_by_role("button", name="+ Thêm vi chất khác").click()
    dlg = pg.get_by_role("dialog", name="Thêm vi chất khác")
    dlg.wait_for(state="visible", timeout=6000)
    pg.wait_for_timeout(500)
    rows = sheet_rows(dlg)
    names = [re.split(r"\s+", r)[0] if not r.startswith("Vitamin") else " ".join(r.split()[:2]) for r in rows]
    check(names[:4] == ["Calcium", "Iron", "Potassium", "Vitamin D"], f"{tag}: Calcium, Iron, Potassium, Vitamin D first ({names[:4]})")
    check(len(rows) == 21 and "Sodium" not in names, f"{tag}: the 21 other vitamins and minerals, not Sodium ({len(rows)})")
    heads = dlg.locator("h3").all_inner_texts()
    check(heads == ["Vitamin", "Khoáng chất"], f"{tag}: the groups are Vitamin and Khoáng chất ({heads})")
    check(dlg.get_by_label("Tìm vi chất").count() == 1, f"{tag}: the sheet has a search field")
    dleaves = dlg.evaluate(LEAVES)
    check(not [l for l in dleaves if l["clipped"]], f"{tag}: nothing in the sheet is cut {[l['text'] for l in dleaves if l['clipped']]}")
    check(not [l for l in dleaves if l["lines"] > 1 and l["text"] in names], f"{tag}: no nutrient name wraps in the sheet")
    shot(pg, "sheet", tag)
    for q in ["mag", "magie"]:
        dlg.get_by_label("Tìm vi chất").fill(q)
        pg.wait_for_timeout(200)
        found = sheet_rows(dlg)
        check(len(found) == 1 and found[0].startswith("Magnesium"), f"{tag}: '{q}' finds Magnesium ({found})")
    dlg.get_by_label("Tìm vi chất").fill("")
    pg.wait_for_timeout(200)

    # Pick Vitamin C: the sheet closes, the field is added and focused, and it leaves the list
    dlg.get_by_role("button", name=re.compile(r"^Vitamin C")).click()
    dlg.wait_for(state="hidden", timeout=6000)
    pg.wait_for_timeout(400)
    check(pg.locator("#cf-vitamin_c").count() == 1, f"{tag}: Vitamin C is added under the main block")
    check(pg.evaluate("document.activeElement && document.activeElement.id") == "cf-vitamin_c", f"{tag}: the new field has focus")
    check(pg.locator("#cf-vitamin_c").get_attribute("placeholder") == "–", f"{tag}: the added field shows –")
    for key in ["Magnesium", "Calcium"]:
        pg.get_by_role("button", name="+ Thêm vi chất khác").click()
        dlg.wait_for(state="visible", timeout=6000)
        pg.wait_for_timeout(400)
        check(not any(r.startswith("Vitamin C") for r in sheet_rows(dlg)), f"{tag}: Vitamin C is no longer in the sheet")
        dlg.get_by_role("button", name=re.compile("^" + key)).click()
        dlg.wait_for(state="hidden", timeout=6000)
        pg.wait_for_timeout(400)
    added = pg.locator("input[id^=cf-]").evaluate_all("els => els.map((e) => e.id)")[-3:]
    check(added == ["cf-vitamin_c", "cf-magnesium", "cf-calcium"], f"{tag}: three fields added in the order picked ({added})")
    for fid in added:
        box = pg.locator("#" + fid).bounding_box()
        check(box and box["height"] >= 44, f"{tag}: #{fid} is {box['height']:.0f} px high")
    x = pg.get_by_role("button", name="Bỏ Calcium")
    xb = x.evaluate("e => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e, '::before'); return { w: r.width - 2 * parseFloat(s.left), h: r.height - 2 * parseFloat(s.top) }; }")
    check(xb["w"] >= 44 and xb["h"] >= 44, f"{tag}: the × hit area is {xb['w']:.0f}×{xb['h']:.0f}")
    pg.locator("#cf-calcium").scroll_into_view_if_needed()
    pg.evaluate("document.activeElement && document.activeElement.blur()")
    pg.wait_for_timeout(300)
    aleaves = pg.locator("main").evaluate(LEAVES)
    check(not [l for l in aleaves if l["clipped"]], f"{tag}: nothing on the form is cut with three added {[l['text'] for l in aleaves if l['clipped']]}")
    check(pg.evaluate("document.documentElement.scrollWidth <= window.innerWidth"), f"{tag}: no sideways scroll with three added")
    shot(pg, "added3", tag)
    x.click()
    pg.wait_for_timeout(500)
    check(pg.locator("#cf-calcium").count() == 0, f"{tag}: × takes Calcium off the form")
    pg.get_by_role("button", name="+ Thêm vi chất khác").click()
    dlg.wait_for(state="visible", timeout=6000)
    pg.wait_for_timeout(400)
    check(sheet_rows(dlg)[0].startswith("Calcium"), f"{tag}: Calcium is back in the sheet, first")
    check(not errors, f"{tag}: no page errors {errors[:1]}")
    ctx.close()


def save_case(browser):
    tag = "save"
    ctx, pg, errors = open_form(browser, {"width": 390, "height": 844}, False, empty_day=True)
    pg.fill("#cf-name", "Bánh probe nhãn")
    pg.fill("#cf-kcal", "200")
    pg.fill("#cf-fiber", "4")
    pg.fill("#cf-sugars", "9")
    for key, value in [("Vitamin C", "40"), ("Magnesium", "60")]:
        pg.get_by_role("button", name="+ Thêm vi chất khác").click()
        dlg = pg.get_by_role("dialog", name="Thêm vi chất khác")
        dlg.wait_for(state="visible", timeout=6000)
        pg.wait_for_timeout(400)
        dlg.get_by_role("button", name=re.compile("^" + key)).click()
        dlg.wait_for(state="hidden", timeout=6000)
        pg.wait_for_timeout(400)
        pg.keyboard.type(value)
    pg.get_by_role("button", name="Lưu và thêm").click()
    pg.wait_for_url("**/app", timeout=15000)
    pg.wait_for_timeout(800)
    check("Bánh probe nhãn" in pg.inner_text("body"), f"{tag}: the food is on Hôm nay")
    # C3 (homnay-c2.md items 1-2): Chất xơ left the hero for its own row at the top of the nutrient column
    fiber = pg.locator("[data-nutrient-row=fiber]").first
    label = fiber.get_attribute("aria-label") if fiber.count() else ""
    check(label.startswith("Chất xơ, 4 g"), f"{tag}: Hôm nay's Chất xơ row counts 4 g of fibre ({label!r})")
    for name, amount in [("Vitamin C", "40 mg"), ("Magnesium", "60 mg")]:
        row = pg.locator(f"[aria-label^='{name}, ']").first
        label = row.get_attribute("aria-label") if row.count() else ""
        check(label.startswith(f"{name}, {amount}"), f"{tag}: Hôm nay counts {name} ({label!r})")
    # The food page, through Khám phá › Món ăn của tôi in the app (a demo food lives in this page's memory, so no reload)
    pg.locator("[data-tour=nav-explore]:visible").first.click()
    pg.wait_for_url(re.compile(r"/explore$"), timeout=10000)
    pg.wait_for_timeout(500)
    pg.get_by_role("link", name=re.compile("Món ăn của tôi")).first.click()
    pg.wait_for_url(re.compile(r"/explore/cua_toi"), timeout=10000)
    pg.wait_for_timeout(500)
    pg.get_by_text("Bánh probe nhãn").first.click()
    pg.wait_for_url(re.compile(r"/foods/"), timeout=10000)
    pg.wait_for_timeout(800)
    body = pg.inner_text("main")
    for name, amount in [("Vitamin C", "40"), ("Magnesium", "60")]:
        check(re.search(name + r"[\s\S]{0,40}?" + amount, body) is not None, f"{tag}: the food page shows {name} {amount}")
    # The food page has rows for kcal, Tinh bột, Đạm, Chất béo and the 22 vitamins and minerals only (OPEN_QUESTIONS, custom-food-nutrients)
    for name in ["Chất xơ", "Đường"]:
        print(f"[INFO] {tag}: the food page {'shows' if name in body else 'has no row for'} {name}")
    check(not errors, f"{tag}: no page errors {errors[:1]}")
    ctx.close()


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for tag, size, big in CASES:
            form_case(browser, tag, size, big)
        save_case(browser)
        browser.close()
    print(f"\n{len(problems)} problem(s)")
    sys.exit(1 if problems else 0)


if __name__ == "__main__":
    main()
