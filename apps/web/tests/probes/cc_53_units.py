"""cc-53 / cc-53b: food portions by the coach's model (design/portion-mockup), at 390x844.

1. Chuối (a normal food): no unit tabs; gram field + one 100 g chip; ×N multiplies the amount set (100 × 3 = 300,
   then typing 200 keeps N: 600 g); Hôm nay shows 600 g with "200 g × 3".
2. Cơm trắng (chín) in the /add sheet: Sống | Chín on Đã nấu chín, ×3 = 300 g; Hôm nay "Đã nấu chín · 100 g × 3".
3. Ức gà (the demo row is roasted): opens on Đã nấu chín; weighed raw it converts. Thịt bò nạc (raw data) weighed
   cooked: 150 g logs 203 g of the raw row (meat median 0,74); Hôm nay shows 150 g and "Đã nấu chín · bằng 203 g lúc sống"; the entry
   editor opens on the same state.
4. Trứng gà: Quả | Gam, four box sizes, Lớn × 3 = "3 quả lớn"; Hôm nay "3 quả" with "Cỡ lớn"; Gam has the part chips
   and Lòng trắng switches the food.
5. Exceptions keep their unit: Bún đậu ×1,5 phần, CanPrev in viên (no gram field, 0 kcal), Red Bull in lon. Dầu ăn
   (not an exception) goes by grams.
6. The tray with 4 foods: accordion cards (first open, one at a time), a named × per card, a dark footer with Tổng
   cộng and one add, the ↓ while more is below; stepping a row changes it; Thêm 4 món adds with one toast and one
   Hoàn tác.
Run with: ALIGN_BASE_URL=http://localhost:3107 npm run probe -- tests/probes/cc_53_units.py
"""
import os
import re
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright
import _demo  # noqa: F401

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3100")
SHOTS = Path(__file__).resolve().parent.parent.parent / ".screenshots"
SHOTS.mkdir(exist_ok=True)
PHONE = {"width": 390, "height": 844}
problems = []


def check(cond, msg):
    print(("[PASS] " if cond else "[FAIL] ") + msg)
    if not cond:
        problems.append(msg)


def go(pg, route, wait=700):
    pg.goto(BASE + route, wait_until="networkidle")
    pg.wait_for_timeout(wait)


def shot(pg, name):
    pg.screenshot(path=str(SHOTS / f"cc-53b-{name}.png"))


def pick(pg, query):
    """Open /add for lunch, search, and open the first result's portion sheet."""
    go(pg, "/add?meal=lunch")
    field = pg.locator('input[type="search"]:visible, input[placeholder*="Tìm món"]:visible').first
    field.fill(query)
    pg.wait_for_timeout(400)
    pg.locator("button[data-food-row]:visible").first.click()
    pg.wait_for_timeout(600)
    return pg.locator('[role="dialog"][aria-labelledby="portion-sheet-title"]')


def row(pg, name):
    """The newest row of a food (the demo day has its own Chuối and Thịt bò nạc)."""
    return pg.locator("[data-entry-id]:visible").filter(has_text=name).last


def pressed(scope, name):
    b = scope.get_by_role("button", name=name, exact=True)
    return b.count() >= 1 and b.first.get_attribute("aria-pressed") == "true"


def add_from_sheet(pg, s):
    s.get_by_role("button", name="Thêm vào Bữa trưa").click()
    pg.wait_for_url(BASE + "/app")
    pg.wait_for_timeout(800)


def portions(pg):
    print("\n--- 1. Chuối: grams, 100 g, ×N ---")
    go(pg, "/foods/food-chuoi", 900)
    check(pg.locator('[data-tour="unit-toggle"]').count() == 0, "Chuối: no unit tabs (fruit goes by grams)")
    grams = pg.get_by_label("Số gam")
    check(grams.input_value() == "100", f"Chuối: opens at 100 g ({grams.input_value()})")
    check(pressed(pg, "100 g"), "Chuối: the 100 g chip is on")
    plus = pg.get_by_role("button", name="Tăng nhân khẩu phần nhanh")
    plus.click()
    plus.click()
    pg.wait_for_timeout(200)
    check("100 g × 3 = 300 g" in pg.locator("main").inner_text(), "chip 100 × 3 = 300 g")
    grams.fill("200")
    pg.wait_for_timeout(200)
    body = pg.locator("main").inner_text()
    check("200 g × 3 = 600 g" in body, "typed 200 keeps ×3: 600 g")
    pg.locator('[data-tour="food-add-cta"]').first.click()
    pg.wait_for_timeout(900)
    go(pg, "/app", 900)
    r = row(pg, "Chuối")
    check("600 g" in r.inner_text() and "200 g × 3" in r.inner_text(), f"Hôm nay: Chuối 600 g, 200 g × 3 ({r.inner_text()!r})")

    print("\n--- 2. Cơm trắng: Đã nấu chín × 3 in the /add sheet ---")
    s = pick(pg, "cơm trắng")
    check(s.is_visible(), "the portion sheet opens (white, over the list)")
    check(s.get_by_role("group", name="Sống hoặc chín").count() == 1, "rice: Sống | Chín")
    check(pressed(s, "Đã nấu chín"), "rice: opens on Đã nấu chín (cooked row)")
    plus = s.get_by_role("button", name="Tăng nhân khẩu phần nhanh")
    plus.click()
    plus.click()
    pg.wait_for_timeout(200)
    text = s.inner_text()
    check("100 g × 3 = 300 g" in text and "300 g đã nấu chín" in text, "rice: ×3 = 300 g đã nấu chín")
    check("110 g trước khi nấu" in text, "rice: the note says what 300 g cooked was dry")
    # Hao 18/10: "TRẮNG" read "TRĂNG": a clipping title cut the acute stacked over the breve. The title must not clip.
    clip = s.locator("h2#portion-sheet-title").evaluate("el => getComputedStyle(el).overflow + ' ' + getComputedStyle(el).webkitLineClamp")
    check(clip.startswith("visible") and "none" in clip, f"rice: the title does not clip its stacked accents ({clip})")
    shot(pg, "rice-cooked-x3-390")
    add_from_sheet(pg, s)
    r = row(pg, "Cơm trắng")
    check("300 g" in r.inner_text() and "Đã nấu chín · 100 g × 3" in r.inner_text(), f"Hôm nay: Cơm 300 g, Đã nấu chín · 100 g × 3 ({r.inner_text()!r})")

    print("\n--- 3. Chicken and beef: raw or cooked ---")
    s = pick(pg, "ức gà")
    check(pressed(s, "Đã nấu chín"), "chicken (roasted row): opens on Đã nấu chín")
    s.get_by_label("Số gam").fill("150")
    pg.wait_for_timeout(200)
    shot(pg, "chicken-cooked-390")
    s.get_by_role("button", name="Cân sống", exact=True).click()
    pg.wait_for_timeout(200)
    check("nấu xong thành khoảng 111 g" in s.inner_text(), "chicken weighed raw: 150 g raw is about 111 g of the cooked row")
    pg.keyboard.press("Escape")
    pg.wait_for_timeout(400)

    s = pick(pg, "thịt bò")
    check(pressed(s, "Cân sống"), "beef (raw row): opens on Cân sống")
    s.get_by_role("button", name="Đã nấu chín", exact=True).click()
    s.get_by_label("Số gam").fill("150")
    pg.wait_for_timeout(200)
    check("150 g chín bằng khoảng 203 g sống" in s.inner_text(), "beef 150 g cooked = about 203 g raw")
    shot(pg, "beef-cooked-390")
    add_from_sheet(pg, s)
    r = row(pg, "Thịt bò")
    check("150 g" in r.inner_text() and "Đã nấu chín · bằng 203 g lúc sống" in r.inner_text(), f"Hôm nay: beef 150 g, bằng 203 g lúc sống ({r.inner_text()!r})")
    entry = r.get_attribute("data-entry-id")
    go(pg, f"/entry/{entry}", 900)
    check(pressed(pg, "Đã nấu chín") and pg.get_by_label("Số gam").input_value() == "150", "edit: reopens on Đã nấu chín, 150")
    shot(pg, "beef-edit-390")

    print("\n--- 4. Eggs by the piece ---")
    s = pick(pg, "trứng gà")
    check(pressed(s, "Quả"), "egg: opens on Quả")
    sizes = s.get_by_role("group", name="Cỡ trứng").get_by_role("button")
    check(sizes.count() == 4, f"egg: four box sizes ({sizes.count()})")
    check("55–60 g" in s.inner_text(), "egg: sizes show the box range")
    sizes.nth(2).click()
    plus = s.get_by_role("button", name="Tăng mấy quả?")
    plus.click()
    plus.click()
    pg.wait_for_timeout(200)
    text = s.inner_text()
    check("3 quả lớn" in text and "app tự trừ vỏ" in text, "egg: Lớn × 3 = 3 quả lớn, the shell note")
    check(re.search(r"216\s+kcal", text) is not None, f"egg: 3 × 50,6 g × 142 kcal = 216 kcal")
    shot(pg, "eggs-3-large-390")
    add_from_sheet(pg, s)
    r = row(pg, "Trứng gà")
    check("3 quả" in r.inner_text() and "Cỡ lớn" in r.inner_text(), f"Hôm nay: egg 3 quả, Cỡ lớn ({r.inner_text()!r})")
    shot(pg, "today-rows-390")

    s = pick(pg, "trứng gà")
    s.get_by_role("button", name="Gam", exact=True).click()
    pg.wait_for_timeout(200)
    parts = s.get_by_role("group", name="Phần trứng")
    check(parts.count() == 1 and s.get_by_label("Số gam").count() == 1, "egg Gam: the gram field and Cả quả | Lòng trắng | Lòng đỏ")
    parts.get_by_role("button", name="Lòng trắng").click()
    pg.wait_for_timeout(300)
    check("lòng trắng trứng gà" in s.inner_text().lower(), "egg Gam: Lòng trắng switches the food")
    pg.keyboard.press("Escape")
    pg.wait_for_timeout(300)


def groups(pg):
    print("\n--- 4b. cc-53c: grains and tubers by the research's group yield ---")
    s = pick(pg, "yến mạch")
    check(s.get_by_role("group", name="Sống hoặc chín").count() == 1, "oats: Sống | Chín")
    check(pressed(s, "Cân sống"), "oats (dry row): opens on Cân sống")
    s.get_by_role("button", name="Đã nấu chín", exact=True).click()
    s.get_by_label("Số gam").fill("230")
    pg.wait_for_timeout(200)
    text = s.inner_text()
    check("Món chín nặng hơn lúc sống, nên 230 g chín bằng khoảng 50 g sống" in text, f"oats: 230 g cooked = 50 g dry, heavier ({text[-160:]!r})")
    pg.screenshot(path=str(SHOTS / "cc-53c-oats-cooked-390.png"))
    pg.keyboard.press("Escape")
    pg.wait_for_timeout(400)

    s = pick(pg, "khoai lang")
    check(pressed(s, "Đã nấu chín"), "sweet potato (boiled row): opens on Đã nấu chín")
    s.get_by_role("button", name="Cân sống", exact=True).click()
    s.get_by_label("Số gam").fill("200")
    pg.wait_for_timeout(200)
    check("200 g lúc sống nấu xong thành khoảng 200 g" in s.inner_text(), "sweet potato: 200 g raw stays 200 g (tuber median 100)")
    pg.screenshot(path=str(SHOTS / "cc-53c-sweet-potato-raw-390.png"))
    pg.keyboard.press("Escape")
    pg.wait_for_timeout(300)


def exceptions(pg):
    print("\n--- 5. Exceptions keep their unit ---")
    go(pg, "/foods/food-bun-dau", 800)
    toggle = pg.locator('[data-tour="unit-toggle"]')
    check(toggle.count() == 1 and "Phần" in toggle.locator("button").first.inner_text(), "Bún đậu: Phần | Gam")
    amount = pg.locator('[data-tour="unit-amount"]')
    amount.fill("1,5")
    amount.dispatch_event("blur")
    pg.wait_for_timeout(300)
    check(re.search(r"761\s+kcal", pg.locator("main").inner_text()) is not None, "Bún đậu ×1,5 phần: 761 kcal")
    check(pg.get_by_role("button", name="Tăng nhân khẩu phần nhanh").count() == 0, "Bún đậu: no ×N gram row")

    go(pg, "/foods/11111111-2222-4333-8444-555555555555", 800)
    check(pg.get_by_label("Số gam").count() == 0, "CanPrev: no gram field")
    amount = pg.locator('[data-tour="unit-amount"]')
    amount.fill("2")
    amount.dispatch_event("blur")
    pg.wait_for_timeout(300)
    text = pg.locator("main").inner_text()
    check("2 viên" in text and "0 kcal" in text, "CanPrev: 2 viên, 0 kcal")

    go(pg, "/foods/food-red-bull", 700)
    toggle = pg.locator('[data-tour="unit-toggle"]')
    check(toggle.count() == 1 and "Lon" in toggle.inner_text(), "Red Bull: Lon | Gam")
    # The food page header is uppercase too: its stacked accents must show (looked at by eye)
    go(pg, "/foods/food-com-trang", 900)
    shot(pg, "header-com-trang-390")
    go(pg, "/foods/food-dau-an", 700)
    check(pg.locator('[data-tour="unit-toggle"]').count() == 0 and pg.get_by_label("Số gam").count() == 1, "Dầu ăn: grams (not an exception)")


def tray(pg):
    print("\n--- 6. The tray, 4 foods ---")
    go(pg, "/add?meal=lunch")
    toggles = pg.locator("[data-tray-toggle]:visible")
    for i in range(4):
        toggles.nth(i).click()
        pg.wait_for_timeout(120)
    pg.get_by_role("button", name="Xem lại").click()
    pg.wait_for_timeout(500)
    review = pg.locator("[data-tray-review]")
    cards = review.locator("li")
    check(cards.count() == 4, f"tray: four cards ({cards.count()})")
    check(review.locator("button[aria-expanded='true']").count() == 1, "tray: the first card is open")
    check(review.get_by_role("button", name=re.compile("^Bỏ khỏi khay: ")).count() == 4, "tray: a named × per card")
    check(review.get_by_text("Tổng cộng").count() == 1 and pg.get_by_role("button", name="Thêm 4 món vào Bữa trưa").count() == 1, "tray: footer with Tổng cộng and Thêm 4 món")
    down = pg.get_by_role("button", name="Còn món bên dưới, cuộn xuống")
    check(down.count() == 1, "tray: the ↓ while cards are below")
    shot(pg, "tray-4-items-390")
    cards.nth(1).locator("button[aria-expanded]").click()
    pg.wait_for_timeout(350)
    check(cards.nth(1).locator("button[aria-expanded='true']").count() == 1 and review.locator("button[aria-expanded='true']").count() == 1, "tray: one row open at a time")
    head = cards.nth(1).locator("button[aria-expanded]")
    before = head.inner_text()
    cards.nth(1).get_by_role("button", name=re.compile("^Tăng ")).first.click()
    pg.wait_for_timeout(200)
    check(head.inner_text() != before, f"tray: stepping a row changes its portion and kcal ({before!r} → {head.inner_text()!r})")
    shot(pg, "tray-edit-390")
    if down.count():
        down.click()
        pg.wait_for_timeout(600)
    check(down.count() == 0, "tray: the ↓ hides at the end of the list")
    pg.get_by_role("button", name="Thêm 4 món vào Bữa trưa").click()
    pg.wait_for_url(BASE + "/app")
    pg.wait_for_timeout(700)
    toast = pg.get_by_role("status").filter(has_text="Đã thêm").first
    check(toast.is_visible() and "Đã thêm 4 món vào Bữa trưa" in toast.inner_text(), "tray: one toast for 4 foods")
    n_before = pg.locator("[data-entry-id]:visible").count()
    toast.get_by_role("button", name="Hoàn tác").click()
    pg.wait_for_timeout(700)
    n_after = pg.locator("[data-entry-id]:visible").count()
    check(n_before - n_after == 4, f"tray: one Hoàn tác takes all 4 back ({n_before} → {n_after})")


def desktop(pg):
    print("\n--- 7. 1440: the portion panel in the add dialog's right pane ---")
    pg.set_viewport_size({"width": 1440, "height": 900})
    go(pg, "/add?meal=lunch", 900)
    field = pg.locator('input[type="search"]:visible').first
    field.fill("cơm trắng")
    pg.wait_for_timeout(400)
    pg.locator("button[data-food-row]:visible").first.click()
    pg.wait_for_timeout(500)
    panel = pg.locator('[data-tour="portion-panel"]:visible')
    check(panel.count() == 1 and pg.locator('[role="dialog"][aria-labelledby="portion-sheet-title"]').count() == 0, "1440: the panel is in the pane, no phone sheet")
    check(pressed(panel, "Đã nấu chín") and panel.get_by_label("Số gam").count() == 1, "1440: Sống | Chín and the gram field")
    shot(pg, "rice-1440")
    # The pane scrolls inside the dialog: the stacked Lưu & chọn tiếp under the add can be reached and used
    more = panel.get_by_role("button", name="Lưu & chọn tiếp")
    more.scroll_into_view_if_needed()
    box = more.bounding_box()
    check(box is not None and box["y"] + box["height"] <= 900, f"1440: Lưu & chọn tiếp scrolls into view ({box})")
    more.click()
    pg.wait_for_timeout(300)
    check(pg.locator("[data-tray-bar]:visible").count() == 1, "1440: Lưu & chọn tiếp puts the food in the tray")


def run_probe():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        for part in (portions, groups, exceptions, tray, desktop):
            ctx = browser.new_context(viewport=PHONE)
            pg = ctx.new_page()
            try:
                part(pg)
            except Exception as e:  # a step that throws is one failure, and the next part still runs
                check(False, f"{part.__name__}: {type(e).__name__}: {str(e).splitlines()[0][:160]}")
            ctx.close()
        browser.close()


if __name__ == "__main__":
    run_probe()
    print("\nSummary:")
    if problems:
        print(f"FAILED with {len(problems)} issues:")
        for prob in problems:
            print(f"  - {prob}")
        sys.exit(1)
    print("ALL CHECKS PASSED")
    sys.exit(0)
