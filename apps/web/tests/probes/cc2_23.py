"""cc2-23: Khám phá and Cài đặt with an accent element each, at 390 and 1280.

- Khám phá: Món giàu vi chất is the first section under the chips, a snapping horizontal carousel of coloured
  "Giàu <chất>" tiles in Saira; Gần đây and Yêu thích are carousels (or a one-line empty state); no horizontal scroll
- Cài đặt: the profile card is the one dark card, with the targets in Saira ("2.275 kcal", "đạm 143 g");
  rows have icons; the danger zone is last and red; Pro is not a second dark card
Screenshots: .screenshots/cc2-23-*.png
Run with: ALIGN_BASE_URL=http://localhost:3102 npm run probe -- tests/probes/cc2_23.py
"""
# PROBE_COVERS: app/(app)/(tabs)/explore/** app/(app)/(tabs)/settings/** app/(app)/explore/[category]/** app/(app)/settings/profile/**
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


def shot(pg, name, size_name):
    SHOTS.mkdir(parents=True, exist_ok=True)
    pg.screenshot(path=str(SHOTS / f"cc2-23-{name}-{size_name}.png"), full_page=True, animations="disabled")


def no_h_scroll(pg, where):
    w, inner = pg.evaluate("() => [Math.max(document.documentElement.scrollWidth, document.body.scrollWidth), window.innerWidth]")
    check(w <= inner, f"{where}: no horizontal scroll ({w} <= {inner})")


def explore(browser, size_name, size):
    ctx, pg = new_page(browser, size, "/explore")
    w = f"{size_name} Khám phá"
    rich = pg.locator("section#explore-rich")
    check(rich.count() == 1, f"{w}: Món giàu vi chất section")
    # V3 order (design/v3 V3KhamPhaB): Món giàu vi chất, Nhóm món, Gần đây, Của bạn; the demo-only leaderboard banner and
    # coaches are not in the design and sit below them
    body = pg.inner_text("body")
    # (the Saira section headers are uppercase on screen, so compare lower-cased)
    order = [body.lower().find(t.lower()) for t in ("Món giàu vi chất", "Gần đây", "Của bạn", "Bảng xếp hạng kỷ luật", "Huấn luyện viên tiêu biểu")]
    check(all(i >= 0 for i in order) and order == sorted(order),
          f"{w}: Món giàu vi chất, Gần đây, Của bạn, leaderboard, coaches in that order ({order})")
    tiles = rich.locator("ul[role='list'] > li a")
    check(tiles.count() == 17, f"{w}: seventeen tiles: 7 minerals, 8 vitamins, đạm and chất xơ ({tiles.count()})")
    hrefs = [tiles.nth(i).get_attribute("href") for i in range(tiles.count())]
    check(all(h and h.startswith("/explore/rich/") for h in hrefs), f"{w}: tiles open /explore/rich/[chất]")
    colours = {tiles.nth(i).evaluate("e => getComputedStyle(e).backgroundColor") for i in range(tiles.count())}
    check(len(colours) >= 2, f"{w}: tiles are coloured by nutrient group ({len(colours)} colours)")
    fam = tiles.first.locator("span").first.evaluate("e => getComputedStyle(e).fontFamily").lower()
    check("saira" in fam, f"{w}: tile name is Saira")
    check(tiles.first.bounding_box()["height"] >= 88, f"{w}: tiles are tap-sized")
    ul = rich.locator("ul[role='list']")
    info = ul.evaluate("e => [e.scrollWidth, e.clientWidth, getComputedStyle(e).scrollSnapType]")
    if size_name == "390":
        check(info[0] > info[1] and "x" in info[2], f"{w}: carousel scrolls sideways and snaps ({info})")
        ul.evaluate("e => { e.scrollLeft = 150; }")
        pg.wait_for_timeout(100)
        check(ul.evaluate("e => e.scrollLeft") > 0, f"{w}: carousel scrolled")
        ul.evaluate("e => { e.scrollLeft = 0; }")
    body = squash(pg.inner_text("body"))
    for label in ["Gần đây", "Yêu thích", "Món ăn của tôi", "Tạo món mới"]:
        # Section headers are drawn in capitals (V3): compare without case
        check(label.lower() in body.lower(), f"{w}: shows {label}")
    cb = pg.locator("a", has_text="Tạo món mới").first.bounding_box()
    check(cb["height"] >= 48, f"{w}: Tạo món mới is a 48 px button")
    no_h_scroll(pg, w)
    shot(pg, "explore", size_name)
    # A tile opens its list
    tiles.first.click()
    pg.wait_for_url("**/explore/rich/**", timeout=8000)
    check("/explore/rich/" in pg.url, f"{w}: a tile opens its list ({pg.url})")
    ctx.close()


def settings(browser, size_name, size):
    ctx, pg = new_page(browser, size, "/settings")
    w = f"{size_name} Cài đặt"
    hero = pg.locator("main a[href='/settings/profile']").first
    check(hero.count() == 1, f"{w}: the profile card links to Hồ sơ")
    bg = hero.evaluate("e => getComputedStyle(e).backgroundColor")
    check(bg == "rgb(17, 19, 23)", f"{w}: the profile card is the ink surface ({bg})")
    t = squash(hero.inner_text())
    check(re.search(r"\d\.\d{3} kcal", t) is not None and re.search(r"đạm \d+ g", t) is not None, f"{w}: targets in the card ({t!r})")
    big = hero.locator("span", has_text=re.compile(r"kcal$")).last
    check("saira" in big.evaluate("e => getComputedStyle(e).fontFamily").lower(), f"{w}: targets are Saira")
    dark = pg.evaluate(
        """() => [...document.querySelectorAll('main *')].filter(e => {
            const r = e.getBoundingClientRect();
            return getComputedStyle(e).backgroundColor === 'rgb(17, 19, 23)' && r.width > 250 && r.height > 60;
        }).length"""
    )
    check(dark == 1, f"{w}: one dark accent card ({dark})")
    body = squash(pg.inner_text("body"))
    for label in ["Mục tiêu mỗi ngày", "Tài khoản", "Ngôn ngữ", "Nhắc nhở", "Nguồn dữ liệu", "Thêm vào màn hình chính", "Vùng nguy hiểm", "Xóa tài khoản", "H1T MICRO Pro"]:
        # Section headers are drawn in capitals (V3): compare without case
        check(label.lower() in body.lower(), f"{w}: shows {label}")
    icons = pg.locator("main a svg[aria-hidden='true']").count()
    check(icons >= 6, f"{w}: rows carry icons ({icons})")
    danger = pg.locator("section[aria-labelledby='settings-danger-title']")
    dc = danger.locator("h2").evaluate("e => getComputedStyle(e).color")
    check(dc != "rgb(17, 19, 23)", f"{w}: the danger title is not body text colour ({dc})")
    if size_name == "390":
        db = danger.bounding_box()
        last_bottom = pg.evaluate("() => Math.max(...[...document.querySelectorAll('main section, main a')].map(e => e.getBoundingClientRect().bottom))")
        check(abs(db["y"] + db["height"] - last_bottom) < 2, f"{w}: the danger zone is last")
    no_h_scroll(pg, w)
    shot(pg, "settings", size_name)
    hero.click()
    pg.wait_for_url("**/settings/profile", timeout=8000)
    check(pg.url.endswith("/settings/profile"), f"{w}: the card opens Hồ sơ")
    ctx.close()


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for size_name, size in SIZES:
            explore(browser, size_name, size)
            settings(browser, size_name, size)
        browser.close()
    for n in notes:
        print(n)
    for pr in problems:
        print("[FAIL]", pr)
    print(f"cc2-23: {len(notes)} ok, {len(problems)} fail")
    sys.exit(1 if problems else 0)


if __name__ == "__main__":
    main()
