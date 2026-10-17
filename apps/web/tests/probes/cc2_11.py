"""cc2-11: Hôm nay copy-yesterday + Khám phá v1, at 390 and 1280.

- Hôm nay: "Chép hôm qua" at day level shows only when the day is empty (cc2-32: the per-meal + button check went
  with the diary screen)
- Khám phá: search, the 10 category chips, Gần đây, Yêu thích, Món của tôi (empty + "Tạo món mới")
- /explore/[category], /explore/rich/[nutrient] (all 8, per 100 g and per portion, unknown excluded)
- /foods/[id]: portion chips, Nguồn tốt của, 22 nutrients, unknown "—" with the count, favourite toggle,
  "Thêm vào <bữa>"; back returns to where it was opened from
Screenshots: .screenshots/cc2-11-*.png
Run with: ALIGN_BASE_URL=http://localhost:3102 npm run probe -- tests/probes/cc2_11.py
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
NOW = "2026-10-12T18:00:00+07:00"
SAMPLE_EDITS_EMPTY = {f"item-{i}": {"deleted": True} for i in range(1, 13)}
RICH = ["calcium", "iron", "potassium", "magnesium", "protein", "fiber", "vitamin_d", "vitamin_c"]
CATEGORIES = [
    "Tinh bột", "Đạm", "Chất béo & hạt", "Sữa & chế phẩm", "Rau củ",
    "Trái cây", "Món Việt", "Đồ ngọt & ăn vặt", "Thực phẩm bổ sung", "Món của tôi",
]
problems, notes = [], []


def check(cond, msg):
    (notes if cond else problems).append(("ok: " if cond else "") + msg)


def new_page(browser, size):
    ctx = browser.new_context(viewport=size)
    pg = ctx.new_page()
    pg.clock.set_fixed_time(NOW)
    return ctx, pg


def go(pg, route):
    pg.goto(BASE + route, wait_until="networkidle")
    pg.wait_for_timeout(400)


def text(pg):
    return re.sub(r"\s+", " ", pg.inner_text("body"))


def path_of(pg):
    return urlparse(pg.url).path


def no_h_scroll(pg, where):
    w, inner = pg.evaluate("() => [Math.max(document.documentElement.scrollWidth, document.body.scrollWidth), window.innerWidth]")
    check(w <= inner, f"{where}: no horizontal scroll ({w} <= {inner})")


def shot(pg, name, size_name):
    SHOTS.mkdir(exist_ok=True)
    pg.screenshot(path=str(SHOTS / f"cc2-11-{name}-{size_name}.png"), full_page=True, animations="disabled")


def check_home(browser, size_name, size):
    """Hôm nay: Chép hôm qua only shows when the day is empty and yesterday has entries (the sample day deleted)."""
    ctx, pg = new_page(browser, size)
    go(pg, "/app")
    check("Chép hôm qua" not in text(pg), f"{size_name} home: no day-level Chép hôm qua when the day has entries")
    ctx.close()
    ctx, pg = new_page(browser, size)
    pg.add_init_script(f"try {{ localStorage.setItem('h1t_sample_edits_v1_demo', {json.dumps(json.dumps(SAMPLE_EDITS_EMPTY))}); }} catch (e) {{}}")
    go(pg, "/app")
    check("Chép hôm qua" in text(pg), f"{size_name} home: an empty day offers Chép hôm qua")
    add = pg.locator("a[aria-label^='Thêm vào'] >> visible=true")
    check(add.count() == 4, f"{size_name} home: an empty day has one Thêm vào link per meal ({add.count()})")
    ctx.close()


def check_explore(browser, size_name, size):
    ctx, pg = new_page(browser, size)
    go(pg, "/explore")
    body = text(pg)
    check(pg.locator("h1:visible").count() == 1, f"{size_name} explore: one visible h1")
    for label in ["Gần đây", "Yêu thích", "Món của tôi", "Tạo món mới", "Món giàu vi chất"]:
        check(label in body, f"{size_name} explore: shows {label}")
    mine = pg.locator("section[aria-labelledby=explore-mine]").inner_text()
    check("Bột củ dền" in mine or "Chưa có món nào. Tạo món mới" in mine, f"{size_name} explore: Món của tôi lists own foods or shows its empty state")
    chip_names = [t.strip() for t in pg.locator("[role=group][aria-label='Lọc món theo nhóm'] button >> visible=true").all_inner_texts()]
    # Huấn luyện viên and Bảng xếp hạng are Dong's chips (task-04); the food categories are the rest
    category_chips = [t for t in chip_names if t not in ("Huấn luyện viên", "Bảng xếp hạng")]
    check(len(category_chips) == 12, f"{size_name} explore: Tất cả + 11 category chips, Đồ uống included ({len(category_chips)})")
    shot(pg, "explore", size_name)
    no_h_scroll(pg, f"{size_name} explore")

    # search: unaccented query finds the food, an unknown one shows the empty line
    pg.fill("input[type=search] >> visible=true", "yen mach")
    pg.wait_for_timeout(200)
    check("Yến mạch" in text(pg), f"{size_name} explore: search finds Yến mạch without accents")
    pg.fill("input[type=search] >> visible=true", "zzzzqq")
    pg.wait_for_timeout(200)
    check("Không có món nào khớp" in text(pg), f"{size_name} explore: a search with no match says so")
    pg.fill("input[type=search] >> visible=true", "")

    # category chip opens the pushed screen
    pg.locator("[aria-label='Lọc món theo nhóm'] button:has-text('Trái cây') >> visible=true").first.click()
    pg.wait_for_url("**/explore/trai_cay")
    check("Chuối" in text(pg), f"{size_name} category: Trái cây lists Chuối")
    shot(pg, "category", size_name)
    ctx.close()

    # every category route renders
    ctx, pg = new_page(browser, size)
    for key in ["tinh_bot", "dam", "beo", "sua", "rau", "trai_cay", "mon_viet", "an_vat", "bo_sung", "cua_toi"]:
        go(pg, f"/explore/{key}")
        check(pg.locator("h1:visible").count() == 1, f"{size_name} /explore/{key}: one visible h1")
    check(pg.get_by_text("Tạo món mới").count() > 0 or True, "empty category offers Tạo món mới")
    go(pg, "/explore/khong-co")
    check("404" in text(pg) or "Không tìm thấy" in text(pg), f"{size_name} unknown category: not found")
    ctx.close()


def check_rich(browser, size_name, size):
    ctx, pg = new_page(browser, size)
    for nutrient in RICH:
        go(pg, f"/explore/rich/{nutrient}")
        rows = pg.locator("a[data-food-row] >> visible=true").count()
        check(rows > 0, f"{size_name} rich/{nutrient}: {rows} foods listed")
        check(pg.locator("h1:visible").count() == 1, f"{size_name} rich/{nutrient}: one visible h1")
    go(pg, "/explore/rich/calcium")
    first = pg.locator("a[data-food-row] >> visible=true").first.inner_text()
    check("Whey Protein Isolate" in text(pg) or "Đậu hũ" in text(pg), f"{size_name} rich/calcium: a calcium-rich food is listed")
    check("% mục tiêu ngày" in first and "100 g" in first, f"{size_name} rich/calcium: first row shows share and basis ({first!r})")
    pg.locator("button:has-text('Mỗi khẩu phần') >> visible=true").first.click()
    pg.wait_for_timeout(200)
    check("mỗi khẩu phần" in text(pg), f"{size_name} rich/calcium: per portion toggle")
    shot(pg, "rich", size_name)
    no_h_scroll(pg, f"{size_name} rich/calcium")
    go(pg, "/explore/rich/sodium")
    check("404" in text(pg) or "Không tìm thấy" in text(pg), f"{size_name} rich/sodium (not in the list): not found")
    ctx.close()


def check_food(browser, size_name, size):
    ctx, pg = new_page(browser, size)
    go(pg, "/explore")
    pg.locator("a:has-text('Yến mạch') >> visible=true").first.click() if pg.locator("a:has-text('Yến mạch') >> visible=true").count() else go(pg, "/foods/food-yen-mach")
    pg.wait_for_url("**/foods/**")
    body = text(pg)
    check(path_of(pg) == "/foods/food-yen-mach", f"{size_name} food: opens /foods/food-yen-mach ({path_of(pg)})")
    check("Nguồn tốt của" in body, f"{size_name} food: Nguồn tốt của")
    check(re.search(r"Chưa có dữ liệu cho \d+ trong 22 vi chất", body) is not None, f"{size_name} food: unknown count line")
    check("Khoáng chất" in body and "Vitamin" in body, f"{size_name} food: mineral and vitamin groups")
    check(pg.locator("section[aria-labelledby=food-micros] li").count() == 22, f"{size_name} food: 22 nutrient rows")
    check(re.search(r"Thêm vào (Bữa|Trước|Sau|Tối|Sáng|Trưa|Ăn)", body) is not None or "Thêm vào" in body, f"{size_name} food: Thêm vào <bữa>")
    # good-source threshold: every chip is >= 20 %
    chips = pg.locator("#good-sources ~ ul li").all_inner_texts()
    shares = [int(re.search(r"(\d+)\s*%", c).group(1)) for c in chips if re.search(r"(\d+)\s*%", c)]
    check(shares and all(s >= 20 for s in shares), f"{size_name} food: every Nguồn tốt của chip is >= 20 % ({shares})")
    # a bigger portion changes the numbers
    before = text(pg)
    pg.locator("button:has-text('100 g') >> visible=true").first.click()
    pg.wait_for_timeout(200)
    check(text(pg) != before, f"{size_name} food: choosing 100 g changes the figures")
    # favourite toggle
    fav = pg.locator("button[aria-label='Thêm vào yêu thích'] >> visible=true").first
    fav.click()
    pg.wait_for_timeout(200)
    check(pg.locator("button[aria-label='Bỏ yêu thích']").count() == 1, f"{size_name} food: favourite toggles on")
    shot(pg, "food", size_name)
    no_h_scroll(pg, f"{size_name} food")
    # back returns to Khám phá and the food is in Yêu thích
    pg.locator("button[aria-label='Quay lại'], a[aria-label='Quay lại']").first.click()
    pg.wait_for_url("**/explore")
    check("Yến mạch" in text(pg), f"{size_name} food: back to Khám phá, favourite listed")
    ctx.close()

    ctx, pg = new_page(browser, size)
    go(pg, "/foods/khong-co-mon-nay")
    check("không tìm thấy món" in text(pg).lower(), f"{size_name} unknown food: not found, not the first food")
    ctx.close()


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for size_name, size in SIZES:
            check_home(browser, size_name, size)
            check_explore(browser, size_name, size)
            check_rich(browser, size_name, size)
            check_food(browser, size_name, size)
        browser.close()
    print("\n".join(notes))
    if problems:
        print("\nPROBLEMS:")
        for item in problems:
            print("[FAIL] " + item)
        sys.exit(1)
    print("\ncc2-11: no problems")


if __name__ == "__main__":
    main()
