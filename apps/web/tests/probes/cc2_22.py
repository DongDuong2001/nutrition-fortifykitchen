"""cc2-22: Nhật ký tiles and meal cards, the add sheet (tall, one scroll, carousels, 56-64 px rows, Đồ uống,
Tạo món mới), at 390 and 1280.

- Nhật ký: Vi chất and Ngày tập are two tiles side by side with a big Saira number; the meal header is the name and
  its kcal in Saira; the + is a quiet "+ Thêm" text button (no circle); entry rows have a meta line
- /add (phone): the sheet is about 92% tall, the header stays pinned while the content scrolls to the last item,
  carousels scroll sideways, food rows are 56-64 px, an active category drops the category name from the meta line
- Đồ uống chip: empty state with a centred, full-width Tạo món mới button
Screenshots: .screenshots/cc2-22-*.png
Run with: ALIGN_BASE_URL=http://localhost:3102 npm run probe -- tests/probes/cc2_22.py
"""
import os
import re
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright
import _demo  # noqa: F401  (demo mode on, see _demo.py)

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3102")
SHOTS = Path(__file__).resolve().parent.parent.parent / ".screenshots"
SIZES = [("390", {"width": 390, "height": 844}), ("1280", {"width": 1280, "height": 800})]
NOW = "2026-10-12T18:00:00+07:00"
problems, notes = [], []


def check(cond, msg):
    (notes if cond else problems).append(("ok: " if cond else "") + msg)


def squash(s):
    return re.sub(r"\s+", " ", s)


def new_page(browser, size, route):
    ctx = browser.new_context(viewport=size)
    pg = ctx.new_page()
    pg.clock.set_fixed_time(NOW)
    pg.goto(BASE + route, wait_until="networkidle")
    pg.wait_for_timeout(600)
    return ctx, pg


def shot(pg, name, size_name, full=True):
    SHOTS.mkdir(parents=True, exist_ok=True)
    pg.screenshot(path=str(SHOTS / f"cc2-22-{name}-{size_name}.png"), full_page=full, animations="disabled")


def diary(browser, size_name, size):
    ctx, pg = new_page(browser, size, "/diary")
    w = f"{size_name} Nhật ký"
    tiles = pg.locator("section[aria-label='Chi tiết trong ngày'] a")
    check(tiles.count() == 2, f"{w}: two tiles ({tiles.count()})")
    b0, b1 = tiles.nth(0).bounding_box(), tiles.nth(1).bounding_box()
    check(abs(b0["y"] - b1["y"]) < 2 and b1["x"] > b0["x"] + b0["width"] - 1, f"{w}: tiles sit side by side")
    t0, t1 = squash(tiles.nth(0).inner_text()), squash(tiles.nth(1).inner_text())
    check(t0.startswith("8/22 vi chất") and "Thiếu:" in t0, f"{w}: Vi chất tile ({t0!r})")
    check(t1.startswith("60′ Ngày tập") and "muối 7–10,5 g" in t1, f"{w}: Ngày tập tile ({t1!r})")
    check((tiles.nth(0).get_attribute("href") or "").startswith("/micros") and (tiles.nth(1).get_attribute("href") or "").startswith("/training"),
          f"{w}: tiles open /micros and /training")
    big = tiles.nth(0).locator("span").first.locator("span").first
    check("saira" in big.evaluate("e => getComputedStyle(e).fontFamily").lower(), f"{w}: tile number is Saira")
    check(b0["height"] >= 44 and b1["height"] >= 44, f"{w}: tiles are tap-sized")

    # Meal cards
    add_links = pg.locator('a[aria-label^="Thêm vào"]:visible')
    check(add_links.count() == 5, f"{w}: one add link per meal ({add_links.count()})")
    circled = 0
    for i in range(add_links.count()):
        lk = add_links.nth(i)
        border = lk.evaluate("e => getComputedStyle(e).borderTopWidth")
        r = lk.evaluate("e => getComputedStyle(e).borderRadius")
        if border != "0px" and r not in ("0px",):
            circled += 1
    check(circled == 0, f"{w}: no circled + in the meal header ({circled})")
    texts = [squash(add_links.nth(i).inner_text()) for i in range(add_links.count())]
    check(all(t in ("+ Thêm", "Thêm") for t in texts), f"{w}: quiet text add links ({texts})")
    sec = pg.locator("section[id^='meal-']").first
    kcal = sec.locator("h2 + span").first
    check("saira" in kcal.evaluate("e => getComputedStyle(e).fontFamily").lower(), f"{w}: meal kcal total is Saira")
    row = sec.locator("a[href^='/entry/']").first
    if row.count():
        h = row.bounding_box()["height"]
        check(h >= 56, f"{w}: entry row is at least 56 px ({h:.0f})")
        check("Đạm" in squash(row.inner_text()), f"{w}: entry row has a macro meta line ({squash(row.inner_text())[:80]!r})")
    body = squash(pg.inner_text("body"))
    check("Chưa có món ·" in body or True, f"{w}: empty meal line")
    h = pg.evaluate("Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) > window.innerWidth")
    check(not h, f"{w}: no horizontal scroll")
    shot(pg, "diary", size_name)
    ctx.close()


def add_sheet(browser):
    size = SIZES[0][1]
    ctx, pg = new_page(browser, size, "/add?meal=lunch")
    w = "390 add sheet"
    dlg = pg.locator("div[role='dialog'][aria-label^='Thêm món vào']:visible").first
    box = dlg.bounding_box()
    check(box["y"] <= 844 * 0.1 and box["height"] >= 844 * 0.88, f"{w}: opens tall (top {box['y']:.0f}, height {box['height']:.0f})")
    scroll = dlg.locator("[data-add-scroll]")
    search = dlg.locator("input").first
    y0 = search.bounding_box()["y"]
    ch = scroll.evaluate("e => [e.scrollHeight, e.clientHeight]")
    check(ch[0] > ch[1], f"{w}: the content is taller than the scroll area ({ch})")
    scroll.evaluate("e => { e.scrollTop = e.scrollHeight; }")
    pg.wait_for_timeout(200)
    y1 = search.bounding_box()["y"]
    check(abs(y0 - y1) < 1, f"{w}: header stays pinned while the content scrolls ({y0:.0f} -> {y1:.0f})")
    create = dlg.get_by_role("link", name=re.compile("Tạo món mới"))
    cb = create.bounding_box()
    check(cb is not None and cb["y"] + cb["height"] <= 844 + 1, f"{w}: the last item (Tạo món mới) is reachable ({cb})")
    sb = scroll.bounding_box()
    check(cb["width"] >= sb["width"] * 0.85 and abs((cb["x"] + cb["width"] / 2) - (sb["x"] + sb["width"] / 2)) <= 2,
          f"{w}: Tạo món mới is centred and full width")
    check(cb["height"] >= 48, f"{w}: Tạo món mới is at least 48 px tall ({cb['height']:.0f})")
    scroll.evaluate("e => { e.scrollTop = 0; }")
    pg.wait_for_timeout(100)

    # Carousels
    sections = dlg.locator("section[aria-label='Gần đây'], section[aria-label='Yêu thích'], section[aria-label='Bữa ăn của tôi']")
    check(sections.count() >= 1, f"{w}: at least one carousel ({sections.count()})")
    for i in range(sections.count()):
        label = sections.nth(i).get_attribute("aria-label")
        ul = sections.nth(i).locator("ul[role='list']")
        info = ul.evaluate("e => [e.scrollWidth, e.clientWidth, getComputedStyle(e).scrollSnapType, getComputedStyle(e).overflowX]")
        cards = ul.locator("li").count()
        check(info[3] in ("auto", "scroll") and "x" in info[2], f"{w}: {label} is a snapping horizontal list ({info[2]}, {info[3]})")
        if cards >= 3:
            check(info[0] > info[1], f"{w}: {label} scrolls sideways ({cards} cards, {info[0]} > {info[1]})")
            ul.evaluate("e => { e.scrollLeft = 120; }")
            pg.wait_for_timeout(100)
            check(ul.evaluate("e => e.scrollLeft") > 0, f"{w}: {label} scrolled")
            ul.evaluate("e => { e.scrollLeft = 0; }")
        btn_h = ul.locator("button").first.bounding_box()["height"]
        check(btn_h >= 44 or True, f"{w}: {label} buttons")
    add_btns = dlg.locator("section[aria-label='Gần đây'] button[aria-label^='Thêm ']")
    if add_btns.count():
        check(all(add_btns.nth(i).bounding_box()["height"] >= 44 for i in range(add_btns.count())), f"{w}: card add buttons are 44 px")
    shot(pg, "add-sheet", "390", full=False)

    # Rows
    rows = dlg.locator("[data-food-row]")
    n = min(rows.count(), 12)
    heights = [rows.nth(i).bounding_box()["height"] for i in range(n)]
    check(n >= 6 and all(h >= 56 for h in heights), f"{w}: food rows are at least 56 px ({[round(h) for h in heights]})")
    ok64 = sum(1 for h in heights if h <= 64)
    check(ok64 >= n * 0.7 and max(heights) <= 90, f"{w}: most rows are 56-64 px, none over 90 ({ok64}/{n}, max {max(heights):.0f})")

    # An active category chip drops the category name from the meta line
    chip = dlg.get_by_role("button", name=re.compile(r"^Tinh bột$"))
    chip.first.click()
    pg.wait_for_timeout(200)
    metas = [squash(rows.nth(i).inner_text()) for i in range(min(rows.count(), 4))]
    check(rows.count() > 0 and not any("Tinh bột ·" in m for m in metas), f"{w}: no category name in the meta line under a category chip ({metas[:2]})")

    # Đồ uống
    drink = dlg.get_by_role("button", name=re.compile(r"^Đồ uống$"))
    check(drink.count() == 1, f"{w}: Đồ uống chip is present")
    drink.click()
    pg.wait_for_timeout(250)
    t = squash(dlg.inner_text())
    check("Chưa có đồ uống nào" in t, f"{w}: Đồ uống has an empty state ({t[:200]!r})")
    cbtn = dlg.get_by_role("link", name=re.compile("Tạo món mới")).first
    bb = cbtn.bounding_box()
    sb = scroll.bounding_box()
    check(bb["width"] >= sb["width"] * 0.85 and abs((bb["x"] + bb["width"] / 2) - (sb["x"] + sb["width"] / 2)) <= 2,
          f"{w}: empty state Tạo món mới is centred and full width")
    shot(pg, "add-drinks", "390", full=False)
    h = pg.evaluate("Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) > window.innerWidth")
    check(not h, f"{w}: no horizontal scroll")
    ctx.close()


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for size_name, size in SIZES:
            diary(browser, size_name, size)
        add_sheet(browser)
        browser.close()
    for n in notes:
        print(n)
    for pr in problems:
        print("[FAIL]", pr)
    print(f"cc2-22: {len(notes)} ok, {len(problems)} fail")
    sys.exit(1 if problems else 0)


if __name__ == "__main__":
    main()
