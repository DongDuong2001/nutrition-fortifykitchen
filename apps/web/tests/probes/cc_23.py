"""cc-23: compare foods (2 or 3 side by side), at 390 and 1440.

Entry points: the So sánh button on /foods/[id] (a picker sheet adds the 2nd and 3rd food) and the So sánh mode of
/add (rows become selectable, a bar offers So sánh (n)). The page: 2 and 3 foods, the 100 g / Khẩu phần basis, the
highest-value marker, a null cell ("—", never 0), remove and add a column, the cleaned address (duplicates, unknown
ids, a 4th id), the back fallback, the empty state, no horizontal scroll, 44 px targets, text at least 11 px, one h1.
Also: /admin/review keeps Cài đặt active in the bottom nav (cc-24 Should).
Screenshots: .screenshots/cc-23-{compare,compare-serving,add-compare}-390.png and cc-23-compare-1440.png.
Run with: ALIGN_BASE_URL=http://localhost:3101 npm run probe -- tests/probes/cc_23.py
"""
# PROBE_COVERS: app/(app)/add/** app/(app)/admin/review/** app/(app)/foods/[id]/** app/(app)/foods/compare/**
import os
import re
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright
import _demo  # noqa: F401  (demo mode on, see _demo.py)

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3101")
SHOTS = Path(__file__).resolve().parent.parent.parent / ".screenshots"
PHONE = {"width": 390, "height": 844}
DESKTOP = {"width": 1440, "height": 900}
HYDRATION = re.compile(r"hydrat|React error #(418|419|423|425)|did not match", re.I)
problems, notes = [], []

# Chà là 30 g = 84 kcal, 280 per 100 g (the calibrated sample); Yến mạch 60 g = 228 kcal, 380 per 100 g
DATES, OATS, BANANA = "food-cha-la", "food-yen-mach", "food-chuoi"


last = {"msg": ""}


def check(cond, msg):
    last["msg"] = msg
    (notes if cond else problems).append(("ok: " if cond else "") + msg)


def new_page(browser, size):
    ctx = browser.new_context(viewport=size)
    pg = ctx.new_page()
    errors = []
    pg.on("console", lambda m: errors.append(m.text) if m.type in ("error", "warning") else None)
    pg.on("pageerror", lambda e: errors.append(str(e)))
    return ctx, pg, errors


def cells(pg, group):
    """The visible value cells of one column (the header excluded)."""
    return pg.locator(f'[role="cell"][data-align-group="{group}"]')


def row_cell(pg, row_name, col):
    """The cell of a named row in column `col` (0-based), as text."""
    row = pg.locator('[role="row"]').filter(has=pg.locator('[role="rowheader"]', has_text=re.compile(rf"^{re.escape(row_name)}$")))
    return row.locator('[role="cell"]').nth(col)


def cell_text(pg, row_name, col):
    return re.sub(r"\s+", " ", row_cell(pg, row_name, col).inner_text()).strip()


def pick_in_picker(pg, name):
    """Tick a food in the picker sheet by its name."""
    dialog = pg.get_by_role("dialog", name="Chọn món để so sánh")
    dialog.locator("[data-food-row]").filter(has_text=re.compile(rf"^{re.escape(name)}")).first.click()
    return dialog


def audit_page(pg, label, size):
    res = pg.evaluate("""() => {
      const root = document.documentElement;
      const out = { scroll: Math.max(root.scrollWidth, document.body.scrollWidth) > window.innerWidth, h1: document.querySelectorAll('h1').length, tap: [], small: [] };
      const vis = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
      const main = document.querySelector('main') || document.body;
      for (const el of main.querySelectorAll('*')) {
        if (!(el instanceof HTMLElement) || !vis(el) || el.closest('.sr-only')) continue;
        const s = getComputedStyle(el);
        const own = Array.from(el.childNodes).filter(n => n.nodeType === Node.TEXT_NODE && n.textContent.trim()).map(n => n.textContent.trim()).join(' ');
        if (own && parseFloat(s.fontSize) < 11) out.small.push(el.tagName + ':' + own.slice(0, 20) + ' ' + s.fontSize);
        if (el.matches('a[href], button, input:not([type=hidden]), select, [role=button]')) {
          const r = el.getBoundingClientRect();
          if (Math.min(r.width, r.height) < 43.5) out.tap.push((el.getAttribute('aria-label') || el.textContent.trim().slice(0, 20)) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
        }
      }
      return out;
    }""")
    check(not res["scroll"], f"{label}: no horizontal scroll")
    check(res["h1"] == 1, f"{label}: one h1 ({res['h1']})")
    check(not res["small"], f"{label}: no text under 11 px {res['small'][:3]}")
    check(not res["tap"], f"{label}: every button and link is 44 px {res['tap'][:4]}")


def from_food_page(browser, size, size_name):
    ctx, pg, errors = new_page(browser, size)
    w = f"{size_name} /foods/[id]"
    pg.goto(f"{BASE}/foods/{DATES}", wait_until="networkidle")
    pg.wait_for_timeout(400)
    btn = pg.get_by_role("button", name="So sánh", exact=True)
    check(btn.count() == 1, f"{w}: one So sánh button")
    btn.click()
    dialog = pg.get_by_role("dialog", name="Chọn món để so sánh")
    dialog.wait_for(state="visible", timeout=5000)
    check("Đã chọn 1/3 món" in dialog.inner_text(), f"{w}: picker starts with the open food ticked (1/3)")
    confirm = dialog.get_by_role("button", name=re.compile(r"^So sánh \(\d\)$"))
    check(confirm.is_disabled(), f"{w}: So sánh is disabled at 1 food")
    locked = dialog.locator("[data-food-row]").filter(has_text=re.compile(r"^Chà là")).first
    check(locked.is_disabled() and locked.get_attribute("aria-pressed") == "true", f"{w}: the open food is ticked and locked")
    # search and filter work in the picker
    dialog.get_by_label("Tìm món").fill("yến")
    pg.wait_for_timeout(250)
    check(dialog.locator("[data-food-row]").count() >= 1, f"{w}: search finds Yến mạch")
    pick_in_picker(pg, "Yến mạch")
    check(confirm.is_enabled() and "So sánh (2)" in confirm.inner_text(), f"{w}: So sánh (2) is enabled after a second food")
    # Esc closes it and focus returns to the opener
    pg.keyboard.press("Escape")
    dialog.wait_for(state="detached", timeout=3000)
    check(pg.evaluate("document.activeElement && document.activeElement.textContent.trim()") == "So sánh", f"{w}: Esc closes the picker, focus returns to So sánh")
    # open again (blank start), pick, confirm
    btn.click()
    dialog.wait_for(state="visible", timeout=5000)
    check("Đã chọn 1/3 món" in dialog.inner_text(), f"{w}: a new opening starts blank")
    pick_in_picker(pg, "Yến mạch")
    confirm.click()
    pg.wait_for_url(re.compile(r".*/foods/compare\?ids=food-cha-la,food-yen-mach$"), timeout=8000)
    check(True, f"{w}: confirm opens /foods/compare?ids=food-cha-la,food-yen-mach")
    pg.wait_for_timeout(500)
    ctx.close()


def from_add(browser, size, size_name):
    # cc-42: So sánh is no longer on /add; compare starts from the food detail page
    ctx, pg, errors = new_page(browser, size)
    w = f"{size_name} /add"
    pg.goto(f"{BASE}/add?meal=snack", wait_until="networkidle")
    pg.wait_for_timeout(500)
    root = pg.locator('[role="dialog"]:visible').first
    check(root.get_by_role("button", name="So sánh", exact=True).count() == 0, f"{w}: no So sánh toggle in the header")
    check(root.locator("[data-compare-bar]").count() == 0, f"{w}: no compare bar")
    ctx.close()


def compare_page(browser, size, size_name):
    ctx, pg, errors = new_page(browser, size)
    w = f"{size_name} compare"
    phone = size["width"] < 1024
    pg.goto(f"{BASE}/foods/compare?ids={DATES},{OATS}", wait_until="networkidle")
    pg.wait_for_timeout(600)
    hyd = [e for e in errors if HYDRATION.search(e)]
    other = [e for e in errors if not HYDRATION.search(e) and "preloaded using link preload" not in e]
    check(not hyd, f"{w}: no hydration errors {hyd[:1]}")
    check(not other, f"{w}: no console errors {other[:1]}")
    check(pg.locator("h1").text_content().strip() == "So sánh món", f"{w}: h1 So sánh món")

    heads = pg.locator('[role="columnheader"][data-align-group^="compare-col-"]')
    check(heads.count() == 2, f"{w}: 2 column headers ({heads.count()})")
    names = [re.sub(r"\s+", " ", heads.nth(i).inner_text()) for i in range(heads.count())]
    check("Chà là" in names[0] and "Yến mạch" in names[1], f"{w}: headers name the foods in order {names}")
    check(pg.locator('[role="row"]:has([role="cell"])').count() == 15, f"{w}: 15 rows (5 macros + 2 vitamins + 8 minerals; rows with no data are not drawn)")
    # cc-27f: one line under each group names the nutrients nobody has data for, in catalogue order
    miss = [re.sub(r"\s+", " ", t).strip() for t in pg.locator("p", has_text="Chưa có dữ liệu:").all_inner_texts()]
    check(
        miss == [
            "Chưa có dữ liệu: Vitamin B2, Vitamin B3, Vitamin B5, Folate, Vitamin B12, Vitamin A, Vitamin C, Vitamin D, Vitamin E, Vitamin K",
            "Chưa có dữ liệu: Manganese, Selenium",
        ],
        f"{w}: missing-data lines {miss}",
    )

    # row order: macros, then Vitamin, then Khoáng chất
    order = pg.locator('[role="rowheader"]').all_inner_texts()
    check(order[:5] == ["Năng lượng", "Đạm", "Chất béo", "Tinh bột", "Chất xơ"], f"{w}: macro rows in order {order[:5]}")
    check(order[5] == "Vitamin B1" and order[7] == "Calcium", f"{w}: Vitamin before Khoáng chất ({order[5]}, {order[7]})")
    titles = pg.locator('[role="rowgroup"] h3').all_inner_texts()
    # V3: the section headers are Saira uppercase (inner_text shows the capitals)
    check([t.lower() for t in titles] == ["năng lượng và đa lượng", "vitamin", "khoáng chất"], f"{w}: section titles {titles}")

    # values on the 100 g basis
    check(cell_text(pg, "Năng lượng", 0).startswith("280 kcal"), f"{w}: Chà là 280 kcal per 100 g ({cell_text(pg, 'Năng lượng', 0)})")
    check(cell_text(pg, "Năng lượng", 1).startswith("380 kcal"), f"{w}: Yến mạch 380 kcal per 100 g ({cell_text(pg, 'Năng lượng', 1)})")
    check("cao nhất" in cell_text(pg, "Năng lượng", 1) and "cao nhất" not in cell_text(pg, "Năng lượng", 0), f"{w}: the highest kcal is marked")
    check("cao nhất" in cell_text(pg, "Tinh bột", 0) and "cao nhất" not in cell_text(pg, "Tinh bột", 1), f"{w}: the highest carbs is marked (Chà là)")
    marked = pg.locator('[role="cell"] .sr-only').count()
    check(marked > 0, f"{w}: {marked} marked cells")
    # a marked cell is cobalt (a token) and bold
    colour = pg.evaluate("""() => { const el = document.querySelector('[role=cell] span.font-bold'); return el ? getComputedStyle(el).fontWeight : null; }""")
    check(colour is not None and int(colour) >= 700, f"{w}: the marked value is bold ({colour})")
    # unknown is a dash, never 0; a row where nobody has data has no mark
    dashes = [t for t in pg.locator('[role="cell"]').all_inner_texts() if t.strip() == "—"]
    check(len(dashes) > 0, f"{w}: unknown cells show a dash ({len(dashes)})")
    body = pg.inner_text("main")
    check(not re.search(r"\bNaN\b|\bundefined\b|\bInfinity\b", body), f"{w}: no NaN or undefined in the page")
    # tie: a row where both are known and equal would show no mark; check no row has two marks
    two = pg.evaluate("""() => [...document.querySelectorAll('[role=row]')].filter(r => r.querySelectorAll('.sr-only').length > 1).length""")
    check(two == 0, f"{w}: never two marks in one row")

    # column alignment: header and every cell of a column share left and right edges
    for col in (0, 1):
        edges = pg.evaluate(f"""() => {{
          const els = [...document.querySelectorAll('[data-align-group="compare-col-{col}"]')];
          const r = els.map(e => e.getBoundingClientRect());
          return {{ n: els.length, left: Math.max(...r.map(x => x.left)) - Math.min(...r.map(x => x.left)),
                    right: Math.max(...r.map(x => x.right)) - Math.min(...r.map(x => x.right)) }};
        }}""")
        check(edges["n"] == 16 and edges["left"] <= 1 and edges["right"] <= 1, f"{w}: column {col + 1} edges aligned ({edges})")

    # layout: phone = the name on its own line above the values; desktop = a name column and a sticky header
    first_row = pg.locator('[role="row"]:has([role="cell"])').first
    name_box = first_row.locator('[role="rowheader"]').bounding_box()
    cell_box = first_row.locator('[role="cell"]').first.bounding_box()
    if phone:
        check(cell_box["y"] >= name_box["y"] + name_box["height"] - 1, f"{w}: the name is a line above the values")
        check(abs(name_box["width"] - (cell_box["width"] * 2 + 8)) < 3, f"{w}: the name line spans the full width")
    else:
        check(abs(cell_box["y"] + cell_box["height"] / 2 - (name_box["y"] + name_box["height"] / 2)) < 3, f"{w}: name and values share a line")
        # cc-27f: rows with no data are gone, so the page is shorter; a low window makes it scroll again
        pg.set_viewport_size({"width": size["width"], "height": 420})
        pg.wait_for_timeout(200)
        head_top = pg.locator('[role="columnheader"]').first.bounding_box()["y"]
        pg.mouse.wheel(0, 700)
        pg.wait_for_timeout(300)
        stuck = pg.locator('[role="rowgroup"]').first.bounding_box()
        check(stuck["y"] <= 1 and head_top > 1, f"{w}: the header row sticks at the top ({stuck['y']:.0f})")
        pg.mouse.wheel(0, -700)
        pg.set_viewport_size(size)
        pg.wait_for_timeout(200)
    audit_page(pg, w, size)
    SHOTS.mkdir(parents=True, exist_ok=True)
    pg.screenshot(path=str(SHOTS / f"cc-23-compare-{size_name}.png"), full_page=True, animations="disabled")

    # basis: Khẩu phần uses each food's first serving, grams shown under its name
    pg.get_by_role("button", name="Khẩu phần", exact=True).click()
    pg.wait_for_timeout(200)
    check(cell_text(pg, "Năng lượng", 0).startswith("84 kcal"), f"{w}: Chà là 30 g = 84 kcal ({cell_text(pg, 'Năng lượng', 0)})")
    check(cell_text(pg, "Năng lượng", 1).startswith("228 kcal"), f"{w}: Yến mạch 60 g = 228 kcal ({cell_text(pg, 'Năng lượng', 1)})")
    heads_text = [re.sub(r"\s+", " ", heads.nth(i).inner_text()) for i in range(2)]
    check("30 g" in heads_text[0] and "60 g" in heads_text[1], f"{w}: grams under the names {heads_text}")
    check(pg.get_by_role("button", name="Khẩu phần", exact=True).get_attribute("aria-pressed") == "true", f"{w}: Khẩu phần is pressed")
    if size_name == "390":
        pg.screenshot(path=str(SHOTS / "cc-23-compare-serving-390.png"), full_page=True, animations="disabled")
    pg.get_by_role("button", name="100 g", exact=True).click()
    pg.wait_for_timeout(200)
    check(cell_text(pg, "Năng lượng", 0).startswith("280 kcal"), f"{w}: back to 100 g")

    # add a third food through the picker
    add = pg.get_by_role("button", name="Thêm món", exact=True)
    check(add.count() == 1, f"{w}: Thêm món shows with 2 foods")
    add.click()
    dialog = pg.get_by_role("dialog", name="Chọn món để so sánh")
    dialog.wait_for(state="visible", timeout=5000)
    check("Đã chọn 2/3 món" in dialog.inner_text(), f"{w}: picker shows 2/3 with both foods locked")
    pick_in_picker(pg, "Chuối")
    check("Đã chọn 3/3 món" in dialog.inner_text() and "Bỏ một món" in dialog.inner_text(), f"{w}: 3/3 says to drop one")
    others = dialog.locator("[data-food-row]:not([aria-pressed=true])")
    check(others.count() > 0 and all(others.nth(i).is_disabled() for i in range(min(others.count(), 5))), f"{w}: other rows disabled at 3")
    dialog.get_by_role("button", name=re.compile(r"^So sánh \(3\)$")).click()
    pg.wait_for_url(re.compile(rf".*/foods/compare\?ids={DATES},{OATS},{BANANA}$"), timeout=8000)
    pg.wait_for_timeout(400)
    check(heads.count() == 3, f"{w}: 3 columns")
    check(pg.get_by_role("button", name="Thêm món", exact=True).count() == 0, f"{w}: no Thêm món at 3 foods")
    check(pg.locator('[role="rowheader"]').count() == 16, f"{w}: 16 rows with Chuối (3 vitamins, no data rows dropped)")
    audit_page(pg, f"{w} (3 foods)", size)
    if size_name == "390":
        pg.screenshot(path=str(SHOTS / "cc-23-compare-3-390.png"), full_page=True, animations="disabled")
    # the 3 columns are equal width on the phone
    widths = pg.evaluate("""() => [...document.querySelectorAll('[role=columnheader][data-align-group^=compare-col-]')].map(e => Math.round(e.getBoundingClientRect().width))""")
    check(max(widths) - min(widths) <= 1, f"{w}: 3 equal columns {widths}")

    # remove a column: 2 left, address updated
    pg.get_by_role("button", name="Bỏ Yến mạch khỏi so sánh").click()
    pg.wait_for_timeout(500)
    check(heads.count() == 2 and pg.url.endswith(f"ids={DATES},{BANANA}"), f"{w}: removing Yến mạch leaves 2 ({pg.url[-40:]})")
    check(pg.get_by_role("button", name="Thêm món", exact=True).count() == 1, f"{w}: Thêm món is back")
    # remove again: fewer than 2 -> empty state
    pg.get_by_role("button", name="Bỏ Chuối khỏi so sánh").click()
    pg.wait_for_timeout(500)
    check("Chưa đủ món để so sánh" in pg.inner_text("main"), f"{w}: one food left shows the empty state")
    check("Chà là" in pg.inner_text("main"), f"{w}: the empty state names the food left")
    check(pg.get_by_role("button", name="Thêm món", exact=True).count() == 1, f"{w}: the empty state offers Thêm món")
    audit_page(pg, f"{w} (empty)", size)
    ctx.close()


def address_and_back(browser, size, size_name):
    w = f"{size_name} address"
    ctx, pg, _ = new_page(browser, size)
    pg.goto(f"{BASE}/foods/compare?ids={DATES},{DATES},khong-co,{OATS},{BANANA},food-bo", wait_until="networkidle")
    pg.wait_for_timeout(700)
    check(pg.url.endswith(f"ids={DATES},{OATS},{BANANA}"), f"{w}: duplicates, unknown ids and a 4th id are dropped ({pg.url[-60:]})")
    check(pg.locator('[role="columnheader"][data-align-group^="compare-col-"]').count() == 3, f"{w}: 3 columns")
    # direct load has no history: back goes to the first food
    pg.get_by_role("button", name="Quay lại").click()
    pg.wait_for_url(re.compile(rf".*/foods/{DATES}$"), timeout=8000)
    check(True, f"{w}: back with no history goes to /foods/{DATES}")
    ctx.close()

    ctx, pg, _ = new_page(browser, size)
    pg.goto(f"{BASE}/foods/compare", wait_until="networkidle")
    pg.wait_for_timeout(500)
    check("Chưa đủ món để so sánh" in pg.inner_text("main"), f"{w}: no ids shows the empty state")
    pg.get_by_role("button", name="Quay lại").click()
    pg.wait_for_url(re.compile(r".*/add$"), timeout=8000)
    check(True, f"{w}: back with no ids and no history goes to /add")
    ctx.close()

    # with history, back returns to the food page it was opened from
    ctx, pg, _ = new_page(browser, size)
    pg.goto(f"{BASE}/foods/{OATS}", wait_until="networkidle")
    pg.wait_for_timeout(300)
    pg.get_by_role("button", name="So sánh", exact=True).click()
    dialog = pg.get_by_role("dialog", name="Chọn món để so sánh")
    dialog.wait_for(state="visible", timeout=5000)
    pick_in_picker(pg, "Chà là")
    dialog.get_by_role("button", name=re.compile(r"^So sánh \(2\)$")).click()
    pg.wait_for_url(re.compile(r".*/foods/compare"), timeout=8000)
    pg.wait_for_timeout(300)
    pg.get_by_role("button", name="Quay lại").click()
    pg.wait_for_url(re.compile(rf".*/foods/{OATS}$"), timeout=8000)
    check(True, f"{w}: back with history returns to the food it was opened from")
    ctx.close()


def admin_tab(browser):
    ctx, pg, _ = new_page(browser, PHONE)
    pg.goto(f"{BASE}/admin/review?as=admin", wait_until="networkidle")
    pg.wait_for_timeout(400)
    current = pg.locator('nav[aria-label="Điều hướng chính"]:visible [aria-current="page"]')
    check(current.count() == 1 and "Cài đặt" in current.inner_text(), f"390 /admin/review: Cài đặt is active in the bottom nav ({current.count()})")
    ctx.close()


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for size_name, size in (("390", PHONE), ("1440", DESKTOP)):
            for fn in (from_food_page, from_add, compare_page, address_and_back):
                try:
                    fn(browser, size, size_name)
                except Exception as err:  # a failed step is one problem, the rest still run
                    problems.append(f"{size_name} {fn.__name__}: {str(err).splitlines()[0][:160]} (after: {last['msg'][:80]})")
        admin_tab(browser)
        browser.close()
    for line in notes:
        print(line)
    for line in problems:
        print("FAIL:", line)
    print(f"cc-23: {len(notes)} ok, {len(problems)} fail")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
