"""cc2-12: faster logging + Bữa ăn của tôi, at 390 and 1280.

- add sheet: tap a recent = add with its last portion (5 s Hoàn tác), the chevron opens the portion panel; a
  favourite with no history opens the portion panel instead of adding
- Nhật ký: one + per meal header, no "+ Thêm món" link; past days have no add affordance
- Bữa ăn của tôi: save from a meal's ⋯ (name sheet, default "<Bữa> <dd/mm>"), listed in the add sheet and Khám phá,
  one tap adds every food, one Hoàn tác removes them all; rename and delete (with confirm) from Khám phá
- Chỉ ghi kcal: kcal required, name optional (Ghi nhanh), micros unknown (Vi chất row unchanged), editable
- target: a repeat meal in 2 taps ([+] -> recent row)
Screenshots: .screenshots/cc2-12-*.png
Run with: ALIGN_BASE_URL=http://localhost:3102 npm run probe -- tests/probes/cc2_12.py
"""
import json
import os
import re
import sys
from pathlib import Path
from urllib.parse import urlparse

from playwright.sync_api import sync_playwright
import _demo  # noqa: F401  (cc2-15b: demo mode on, see _demo.py)

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3102")
SHOTS = Path(__file__).resolve().parent.parent.parent / ".screenshots"
SIZES = [("390", {"width": 390, "height": 844}), ("1280", {"width": 1280, "height": 800})]
NOW = "2026-10-12T18:00:00+07:00"  # dinner by the clock
# cc2-15c: recents are in localStorage, and demo mode (on through _demo) reads the _demo twins of the keys
RECENTS_KEY = "h1t_recent_foods_v2_demo"
FAVOURITES_KEY = "h1t_favourite_foods_v1_demo"
problems, notes = [], []


def check(cond, msg):
    (notes if cond else problems).append(("ok: " if cond else "") + msg)


def new_page(browser, size, recents=None, favourites=None):
    ctx = browser.new_context(viewport=size)
    pg = ctx.new_page()
    pg.clock.set_fixed_time(NOW)
    if recents is not None:
        pg.add_init_script(
            f"if (!localStorage.getItem('{RECENTS_KEY}')) localStorage.setItem('{RECENTS_KEY}', {json.dumps(json.dumps(recents))});"
        )
    if favourites is not None:
        pg.add_init_script(
            f"if (!localStorage.getItem('{FAVOURITES_KEY}')) localStorage.setItem('{FAVOURITES_KEY}', {json.dumps(json.dumps(favourites))});"
        )
    return ctx, pg


def go(pg, route):
    pg.goto(BASE + route, wait_until="networkidle")
    pg.wait_for_timeout(400)


def text(pg):
    return re.sub(r"\s+", " ", pg.inner_text("body"))


def path_of(pg):
    return urlparse(pg.url).path


def shot(pg, name, size_name):
    SHOTS.mkdir(exist_ok=True)
    pg.screenshot(path=str(SHOTS / f"cc2-12-{name}-{size_name}.png"), full_page=False, animations="disabled")


def no_h_scroll(pg, where):
    w, inner = pg.evaluate("() => [Math.max(document.documentElement.scrollWidth, document.body.scrollWidth), window.innerWidth]")
    check(w <= inner, f"{where}: no horizontal scroll ({w} <= {inner})")


def toast_text(pg):
    t = pg.locator("[role=status]").filter(has_text=re.compile("Đã (thêm|lưu|xóa|chép)"))
    return re.sub(r"\s+", " ", t.first.inner_text()) if t.count() else ""


def dinner_items(pg):
    return pg.locator("#meal-dinner a[href^='/entry/']").count()


def tap_targets_ok(pg, selector, where):
    boxes = pg.locator(selector).evaluate_all(
        "els => els.filter(e => e.offsetParent !== null).map(e => { const r = e.getBoundingClientRect(); return [r.width, r.height]; })"
    )
    small = [b for b in boxes if b[1] < 43.5 or b[0] < 43.5]
    check(len(boxes) > 0 and not small, f"{where}: {len(boxes)} targets, all >= 44 px (small: {small})")


# 1. Recents: tap = add with the last portion, undo removes; the 2-tap repeat; chevron = portion panel
def check_recents(browser, size_name, size):
    recents = [
        {"foodId": "food-yen-mach", "servingLabel": "45 g"},
        {"foodId": "food-chuoi", "servingLabel": "1 quả"},
        {"foodId": "food-cha-la", "servingLabel": "30 g"},
    ]
    ctx, pg = new_page(browser, size, recents=recents)
    go(pg, "/diary")
    before = dinner_items(pg)
    clicks = 0

    pg.locator("#mobile-add-dinner").click()
    clicks += 1
    pg.wait_for_url("**/add**")
    pg.wait_for_timeout(300)
    rows = pg.locator("section[aria-label='Gần đây'] li:visible")
    check(rows.count() >= 1 and pg.locator("[data-quick-row]:visible").count() >= 1, f"{size_name} add: Gần đây cards are listed ({rows.count()})")
    check("Gần đây" in text(pg), f"{size_name} add: Gần đây section")
    shot(pg, "add", size_name)
    no_h_scroll(pg, f"{size_name} add")
    tap_targets_ok(pg, "[data-quick-row] button", f"{size_name} add: recent row controls")

    pg.locator("button[aria-label^='Thêm Yến mạch']:visible").first.click()
    clicks += 1
    pg.wait_for_url("**/diary")
    pg.wait_for_timeout(400)
    msg = toast_text(pg)
    check("Yến mạch 45 g" in msg and "Bữa tối" in msg, f"{size_name} recent tap: toast names the last portion and the meal by the clock ({msg!r})")
    check(dinner_items(pg) == before + 1, f"{size_name} recent tap: the entry is in Bữa tối ({before} -> {dinner_items(pg)})")
    check(clicks == 2, f"{size_name} repeat meal: [+] then the recent row = {clicks} taps")
    shot(pg, "toast", size_name)

    undo = pg.locator("button:has-text('Hoàn tác'):visible").first
    check(undo.count() == 1, f"{size_name} recent tap: the toast offers Hoàn tác")
    undo.click()
    pg.wait_for_timeout(300)
    check(dinner_items(pg) == before, f"{size_name} recent tap: Hoàn tác removes it again")

    # chevron opens the portion panel on that food and portion, nothing is added
    go(pg, "/add?meal=dinner")
    pg.locator("button[aria-label='Chọn khẩu phần Yến mạch']:visible").first.click()
    pg.wait_for_timeout(300)
    check(path_of(pg) == "/add", f"{size_name} chevron: stays on the add sheet")
    check(pg.locator("button:has-text('Thêm vào'):visible").count() > 0, f"{size_name} chevron: the portion panel with its add button is open")
    go(pg, "/diary")
    check(dinner_items(pg) == before, f"{size_name} chevron: nothing was added")
    ctx.close()


# 2. Favourites: with history = add, without history = portion panel
def check_favourites(browser, size_name, size):
    recents = [{"foodId": "food-chuoi", "servingLabel": "1 quả"}]
    ctx, pg = new_page(browser, size, recents=recents, favourites=["food-cha-la", "food-chuoi"])
    go(pg, "/add?meal=dinner")
    pg.locator("[aria-label='Lọc món theo nhóm'] button:has-text('Yêu thích'):visible").first.click()
    pg.wait_for_timeout(300)
    chevrons = pg.locator("button[aria-label^='Chọn khẩu phần']:visible")
    check(chevrons.count() >= 2, f"{size_name} favourites: each row has a portion chevron ({chevrons.count()})")

    pg.locator("[data-food-row]:visible:has-text('Chà là')").first.click()
    pg.wait_for_timeout(300)
    check(path_of(pg) == "/add", f"{size_name} favourite with no history: stays on /add")
    check(pg.locator("button:has-text('Thêm vào'):visible").count() > 0, f"{size_name} favourite with no history: opens the portion panel")

    pg.locator("[data-food-row]:visible:has-text('Chuối')").first.click()
    pg.wait_for_url("**/diary")
    pg.wait_for_timeout(300)
    check("Chuối 1 quả" in toast_text(pg), f"{size_name} favourite with history: adds with its last portion ({toast_text(pg)!r})")
    ctx.close()


# 3. One + per meal header, no "+ Thêm món"; past days have no add affordance
def check_diary_plus(browser, size_name, size):
    ctx, pg = new_page(browser, size)
    go(pg, "/diary")
    meals = pg.locator("section[id^='meal-']")
    n = meals.count()
    check(n == 5, f"{size_name} diary: five meals ({n})")
    for i in range(n):
        links = meals.nth(i).locator("a[href^='/add']").count()
        check(links == 1, f"{size_name} diary: meal {i + 1} has one + ({links})")
    check("+ Thêm món" not in text(pg), f"{size_name} diary: no '+ Thêm món' link")

    go(pg, "/diary?date=2026-10-11")
    check(pg.locator("section[id^='meal-'] a[href^='/add']").count() == 0, f"{size_name} past day: no + on any meal")
    check(pg.locator("#add-first, a:has-text('Thêm món'):not(#desktop-add-btn):not(#mobile-add-fab):visible").count() == 0, f"{size_name} past day: no add link in the content")
    menus = pg.locator("button[id^='meal-menu-']")
    check(menus.count() >= 1, f"{size_name} past day: meals with food keep their ⋯ for Lưu thành Bữa ăn của tôi ({menus.count()})")
    menus.first.click()
    pg.wait_for_timeout(300)
    dialog = re.sub(r"\s+", " ", pg.locator("[role=dialog]").first.inner_text())
    check("Lưu thành Bữa ăn của tôi" in dialog, f"{size_name} past day ⋯: Lưu thành Bữa ăn của tôi is offered")
    check("Xóa bữa này" not in dialog and "Chép hôm qua" not in dialog, f"{size_name} past day ⋯: no Xóa bữa này or Chép hôm qua")
    ctx.close()


# 4. Bữa ăn của tôi: save, list, one tap adds all, one undo, rename, delete
def check_saved_meals(browser, size_name, size):
    ctx, pg = new_page(browser, size)
    go(pg, "/diary")
    pg.locator("#meal-menu-breakfast").click()
    pg.wait_for_timeout(300)
    pg.get_by_role("button", name=re.compile("Lưu thành Bữa ăn của tôi")).click()
    pg.wait_for_timeout(200)
    name_input = pg.locator("#save-meal-name")
    check(name_input.input_value() == "Bữa sáng 12/10", f"{size_name} save: default name is '<Bữa> <dd/mm>' ({name_input.input_value()!r})")
    shot(pg, "save-name", size_name)
    name_input.fill("Sáng của tôi")
    pg.get_by_role("button", name="Lưu", exact=True).click()
    pg.wait_for_timeout(400)
    check("Đã lưu Sáng của tôi vào Bữa ăn của tôi" in toast_text(pg), f"{size_name} save: toast confirms ({toast_text(pg)!r})")

    # an empty meal cannot be saved
    pg.locator("#meal-menu-dinner").click()
    pg.wait_for_timeout(300)
    save_btn = pg.get_by_role("button", name=re.compile("Lưu thành Bữa ăn của tôi"))
    check(save_btn.is_disabled(), f"{size_name} save: an empty meal's item is disabled")
    pg.keyboard.press("Escape")

    # listed in Khám phá
    go(pg, "/explore")
    section = pg.locator("section[aria-labelledby=explore-saved-meals]")
    body = re.sub(r"\s+", " ", section.inner_text())
    check("Sáng của tôi" in body, f"{size_name} explore: Bữa ăn của tôi lists the saved meal")
    m = re.search(r"(\d+) món", body)
    count = int(m.group(1)) if m else 0
    check(count == 3, f"{size_name} explore: it holds the 3 foods of Bữa sáng ({count})")
    section.scroll_into_view_if_needed()
    pg.evaluate("() => window.scrollBy(0, 200)")
    pg.wait_for_timeout(200)
    shot(pg, "saved-meals", size_name)
    no_h_scroll(pg, f"{size_name} explore")
    tap_targets_ok(pg, "section[aria-labelledby=explore-saved-meals] button", f"{size_name} explore: Bữa ăn của tôi controls")

    # one tap adds every food to the meal by the clock, one undo removes all
    pg.locator("button[aria-label^='Thêm Sáng của tôi']:visible").first.click()
    pg.wait_for_timeout(400)
    msg = toast_text(pg)
    check("Sáng của tôi · 3 món vào Bữa tối" in msg, f"{size_name} saved meal tap: one toast for all foods ({msg!r})")
    # The toast is in memory, so undo it here, on the page that shows it. Nhật ký is no longer a nav tab (cc2-31a),
    # so the diary is loaded directly afterwards, and it must hold no foods.
    pg.locator("button:has-text('Hoàn tác'):visible").first.click()
    pg.wait_for_timeout(300)
    go(pg, "/diary")
    check(dinner_items(pg) == 0, f"{size_name} saved meal undo: one Hoàn tác removes all ({dinner_items(pg)})")

    # in the add sheet, with the chosen meal
    go(pg, "/add?meal=lunch")
    check("Bữa ăn của tôi" in text(pg) and "Sáng của tôi" in text(pg), f"{size_name} add: Bữa ăn của tôi section lists it")
    pg.locator("button[aria-label^='Thêm Sáng của tôi']:visible").first.click()
    pg.wait_for_url("**/diary")
    pg.wait_for_timeout(300)
    lunch = pg.locator("#meal-lunch a[href^='/entry/']").count()
    check(lunch == 2 + 3, f"{size_name} add sheet: one tap adds the three foods to the chosen meal ({lunch})")
    pg.locator("button:has-text('Hoàn tác'):visible").first.click()
    pg.wait_for_timeout(300)
    check(pg.locator("#meal-lunch a[href^='/entry/']").count() == 2, f"{size_name} add sheet: one undo removes them")

    # rename, then delete with a confirm step
    go(pg, "/explore")
    pg.locator("button[aria-label='Tùy chọn Sáng của tôi']:visible").first.click()
    pg.wait_for_timeout(300)
    pg.locator("#saved-meal-name").fill("Sáng nhanh")
    pg.get_by_role("button", name="Lưu tên").click()
    pg.wait_for_timeout(300)
    check("Sáng nhanh" in text(pg) and "Sáng của tôi" not in text(pg), f"{size_name} rename: the new name shows")
    pg.locator("button[aria-label='Tùy chọn Sáng nhanh']:visible").first.click()
    pg.wait_for_timeout(300)
    pg.get_by_role("button", name="Xóa", exact=True).click()
    pg.wait_for_timeout(200)
    check("sẽ bị xóa" in text(pg), f"{size_name} delete: asks for a confirm step first")
    pg.get_by_role("button", name="Xóa Bữa ăn của tôi").click()
    pg.wait_for_timeout(300)
    check("Sáng nhanh" not in text(pg) and "Chưa có Bữa ăn của tôi" in text(pg), f"{size_name} delete: gone, empty state shown")
    ctx.close()


# 5. Chỉ ghi kcal
def check_quick(browser, size_name, size):
    ctx, pg = new_page(browser, size)
    go(pg, "/diary")
    micros_before = pg.locator("a[href^='/micros']:visible").first.inner_text()
    go(pg, "/add?meal=dinner")
    pg.locator("button[aria-label='Chỉ thêm kcal']:visible").first.click()
    pg.wait_for_timeout(300)
    shot(pg, "quick", size_name)
    no_h_scroll(pg, f"{size_name} quick add")
    tap_targets_ok(pg, "[role=dialog] input, [role=dialog] button", f"{size_name} quick add: controls")

    submit = pg.get_by_role("button", name=re.compile("^Thêm vào Bữa tối"))
    pg.fill("#quick-kcal", "0")
    submit.click()
    pg.wait_for_timeout(200)
    check("Nhập kcal lớn hơn 0" in text(pg), f"{size_name} quick add: kcal must be above 0")
    check(path_of(pg) == "/add", f"{size_name} quick add: an invalid form stays")

    pg.fill("#quick-name", "Bánh mì")
    pg.fill("#quick-kcal", "420,4")
    pg.fill("#quick-protein", "12,5")
    submit.click()
    pg.wait_for_url("**/diary")
    pg.wait_for_timeout(400)
    dinner = re.sub(r"\s+", " ", pg.locator("#meal-dinner").inner_text())
    check("Bánh mì" in dinner and "Thêm nhanh" in dinner and "420" in dinner, f"{size_name} quick add: listed with the Thêm nhanh label ({dinner!r})")
    micros_after = pg.locator("a[href^='/micros']:visible").first.inner_text()
    check(micros_after == micros_before, f"{size_name} quick add: Vi chất row unchanged ({micros_before!r} -> {micros_after!r})")
    check("Hoàn tác" in toast_text(pg) or pg.locator("button:has-text('Hoàn tác'):visible").count() == 1, f"{size_name} quick add: the toast offers Hoàn tác")

    # no name, only kcal = Ghi nhanh with every macro unknown: "—", and no total moves except kcal
    def protein_total():
        m = re.search(r"Đạm (\d+) / ", text(pg))
        return m.group(1) if m else None

    go(pg, "/diary")
    protein_before = protein_total()
    micros_mid = pg.locator("a[href^='/micros']:visible").first.inner_text()
    check(protein_before is not None, f"{size_name} quick add: the day shows an Đạm total ({protein_before})")
    go(pg, "/add?meal=dinner")
    pg.locator("button[aria-label='Chỉ thêm kcal']:visible").first.click()
    pg.fill("#quick-kcal", "150")
    pg.get_by_role("button", name=re.compile("^Thêm vào Bữa tối")).click()
    pg.wait_for_url("**/diary")
    pg.wait_for_timeout(300)
    check(dinner_items(pg) == 2, f"{size_name} quick add: a second entry with the default name ({dinner_items(pg)})")
    dinner_text = re.sub(r"s+", " ", pg.locator("#meal-dinner").inner_text())
    check("Đạm — · Tinh bột — · Chất béo —" in dinner_text, f"{size_name} quick add: unknown macros show — ({dinner_text!r})")
    check("Đạm 0 g" not in dinner_text, f"{size_name} quick add: no unknown macro is shown as 0 g")
    check(protein_total() == protein_before, f"{size_name} quick add: the day's Đạm total did not move ({protein_before} -> {protein_total()})")
    check(pg.locator("a[href^='/micros']:visible").first.inner_text() == micros_mid, f"{size_name} quick add: Vi chất count did not move")

    # editable on /entry/[id]
    pg.locator("#meal-dinner a[href^='/entry/']:has-text('Bánh mì')").click()
    pg.wait_for_url("**/entry/**")
    pg.wait_for_timeout(300)
    check(pg.locator("#entry-quick-kcal").input_value() == "420", f"{size_name} entry: kcal field holds 420")
    pg.fill("#entry-quick-kcal", "500")
    pg.get_by_role("button", name="Lưu thay đổi").click()
    pg.wait_for_url("**/diary")
    pg.wait_for_timeout(300)
    check("500" in pg.locator("#meal-dinner").inner_text(), f"{size_name} entry: the edited kcal shows in the meal")
    ctx.close()


def check_naming():
    """The feature is called "Bữa ăn của tôi" everywhere in apps/web (13/10 review)."""
    root = Path(__file__).resolve().parent.parent.parent
    old = "Bữa " + "của tôi"
    skip = {"node_modules", ".next", ".screenshots", "out", "__pycache__"}
    hits = []
    for path in root.rglob("*"):
        if not path.is_file() or skip & set(path.relative_to(root).parts):
            continue
        if path.suffix not in {".ts", ".tsx", ".py", ".md", ".json", ".css", ".mjs"}:
            continue
        try:
            body = path.read_text(encoding="utf-8")
        except (UnicodeDecodeError, OSError):
            continue
        if old in body:
            hits.append(str(path.relative_to(root)))
    check(not hits, f"naming: no '{old}' left in apps/web ({hits})")


def main():
    check_naming()
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for size_name, size in SIZES:
            check_recents(browser, size_name, size)
            check_favourites(browser, size_name, size)
            check_diary_plus(browser, size_name, size)
            check_saved_meals(browser, size_name, size)
            check_quick(browser, size_name, size)
        browser.close()
    print("\n".join(notes))
    if problems:
        print("\nPROBLEMS:")
        for item in problems:
            print("[FAIL] " + item)
        sys.exit(1)
    print("\ncc2-12: no problems")


if __name__ == "__main__":
    main()
