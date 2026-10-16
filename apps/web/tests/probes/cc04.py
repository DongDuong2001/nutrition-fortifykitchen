"""cc-04: AppHeader on food, new food, entry and setup screens; the favourite heart in the header;
setup step bars; the meal chips grid; the sticky /add group header covering the rows at 390.
Run with: ALIGN_BASE_URL=http://localhost:3101 PATH=/usr/bin:$PATH npm run probe -- tests/probes/cc04.py
"""
import os
import sys
from urllib.parse import urlparse

from playwright.sync_api import sync_playwright
import _demo  # noqa: F401  (cc2-15b: demo mode on, see _demo.py)

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3100")
SHOTS = os.path.join(os.path.dirname(__file__), "..", "..", ".screenshots")
PHONE = {"width": 390, "height": 844}
DESKTOP = {"width": 1440, "height": 900}
problems = []
notes = []


def check(cond, msg):
    if cond:
        notes.append("ok: " + msg)
    else:
        problems.append(msg)


def back_link(pg):
    return pg.locator('[aria-label="Quay lại"] >> visible=true')


def path_and_query(url):
    parts = urlparse(url)
    return parts.path + (("?" + parts.query) if parts.query else "")


def go_back_and_check(pg, start, expected, name):
    pg.goto(BASE + start, wait_until="networkidle")
    pg.wait_for_timeout(400)
    count = back_link(pg).count()
    check(count == 1, f"{name}: one visible back control on {start} (found {count})")
    back_link(pg).first.click()
    try:
        pg.wait_for_url(lambda u: path_and_query(u) == expected, timeout=5000)
        landed = True
    except Exception:
        landed = False
    check(landed, f"{name}: back goes to {expected} (now {path_and_query(pg.url)})")


def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()

        # 1. Back buttons: one AppHeader back control per screen, and each goes to the right place
        ctx = browser.new_context(viewport=PHONE)
        pg = ctx.new_page()
        go_back_and_check(pg, "/foods/food-cha-la?meal=snack", "/explore", "food detail")  # direct link: no in-app history, so the owning tab
        go_back_and_check(pg, "/foods/new?meal=snack", "/explore", "new food")
        go_back_and_check(pg, "/entry/item-1", "/", "entry")
        go_back_and_check(pg, "/setup/profile", "/signin", "setup profile")  # Dong (main): back from setup goes to /signin
        go_back_and_check(pg, "/setup/goal", "/setup/profile", "setup goal")

        # 2. Setup step bars: Bước 1 / 2 on profile (1 bar done), Bước 2 / 2 on goal (2 bars done)
        for route, text, done in (("/setup/profile", "Bước 1 / 2", 1), ("/setup/goal", "Bước 2 / 2", 2)):
            pg.goto(BASE + route, wait_until="networkidle")
            pg.wait_for_timeout(400)
            check(pg.locator(f'text="{text}" >> visible=true').count() == 1, f"{route}: shows {text}")
            bars = pg.locator("header span.h-1 >> visible=true")
            filled = pg.locator("header span.h-1.bg-blue >> visible=true").count()
            check(bars.count() == 2 and filled == done, f"{route}: step bars {filled}/{bars.count()} done, want {done}/2")
            if route == "/setup/profile":
                pg.screenshot(path=os.path.join(SHOTS, "cc04-setup-profile-390.png"), animations="disabled")

        # 3. Food detail: heart lives in the header (44 px) and still saves with the same toast
        pg.goto(BASE + "/foods/food-cha-la?meal=snack", wait_until="networkidle")
        pg.wait_for_timeout(400)
        heart = pg.locator('header button[aria-label="Thêm vào yêu thích"] >> visible=true')
        check(heart.count() == 1, "food detail: heart is in the header")
        if heart.count() == 1:
            box = heart.first.bounding_box()
            check(box is not None and box["width"] >= 44 and box["height"] >= 44, f"food detail: heart is 44 px ({box})")
            heart.first.click()
            pg.wait_for_timeout(200)
            check(pg.locator('text="Đã thêm vào yêu thích" >> visible=true').count() == 1, "food detail: save toast shows")
            check(pg.locator('header button[aria-pressed="true"]').count() == 1, "food detail: heart pressed after save")
        check(pg.locator('[data-align-group="food-detail"]:visible').count() > 0, "food detail: body cards still present")
        pg.screenshot(path=os.path.join(SHOTS, "cc04-food-detail-390.png"), animations="disabled")

        # 4. Meal chips: ChipGroup grid, 3 columns on phone and 5 on desktop
        for vp, cols, label in ((PHONE, 3, "390"), (DESKTOP, 5, "1440")):
            page = ctx.new_page() if label == "1440" else pg
            if label == "1440":
                page.set_viewport_size(DESKTOP)
            page.goto(BASE + "/entry/item-1", wait_until="networkidle")
            page.wait_for_timeout(400)
            chips = page.locator('fieldset button >> visible=true')
            check(chips.count() == 5, f"{label}: entry has five meal chips ({chips.count()})")
            tracks = page.evaluate(
                "() => getComputedStyle(document.querySelector('fieldset > div')).gridTemplateColumns.split(' ').length"
            )
            check(tracks == cols, f"{label}: meal chip grid has {cols} columns (found {tracks})")
            if label == "1440":
                page.screenshot(path=os.path.join(SHOTS, "cc04-entry-1440.png"), animations="disabled")
                page.close()
            else:
                check(pg.locator('[aria-label="Quay lại"] >> visible=true').count() == 1, "390: entry has one back control")
        ctx.close()

        # 5. /add sticky group header: at every scroll position the header is on top across its full
        # width, including the 12 px bleed on each side, so no row shows through it
        ctx = browser.new_context(viewport=PHONE)
        pg = ctx.new_page()
        pg.goto(BASE + "/add?meal=snack", wait_until="networkidle")
        pg.wait_for_timeout(400)
        result = pg.evaluate("""() => {
            const headers = [...document.querySelectorAll('[role=group] > div.sticky')].filter(e => e.offsetParent);
            const sc = (headers[0].closest('[data-add-scroll]') || headers[0].parentElement.parentElement);
            const r = sc.getBoundingClientRect();
            const failures = []; let stuckChecks = 0;
            for (let y = 0; y <= sc.scrollHeight; y += 17) {
                sc.scrollTop = y;
                for (const h of headers) {
                    const hr = h.getBoundingClientRect();
                    if (hr.top < r.top - 0.5 || hr.top > r.top + 1) continue; // only the header stuck at the top
                    stuckChecks++;
                    const my = hr.top + hr.height / 2;
                    const xs = [hr.left + 1, hr.left + 8, hr.left + 4, (hr.left + hr.right) / 2, hr.right - 4, hr.right - 8, hr.right - 1];
                    for (const x of xs) {
                        const el = document.elementFromPoint(x, my);
                        const hit = el && el.closest('div.sticky');
                        if (hit !== h) failures.push([y, h.textContent.trim().slice(0, 12), Math.round(x)]);
                    }
                }
            }
            return { stuckChecks, failures: failures.slice(0, 5), failCount: failures.length };
        }""")
        check(result["stuckChecks"] > 20, f"/add: stuck header checked at many positions ({result['stuckChecks']})")
        check(result["failCount"] == 0, f"/add: sticky header covers the rows at every scroll position ({result['failCount']} misses {result['failures']})")
        pg.evaluate("""() => { const h = [...document.querySelectorAll('[role=group] > div.sticky')].find(e => e.offsetParent);
            (h.closest('[data-add-scroll]') || h.parentElement.parentElement).scrollTop = 390; }""")
        pg.wait_for_timeout(200)
        pg.screenshot(path=os.path.join(SHOTS, "cc04-add-sticky-390.png"), animations="disabled")
        ctx.close()
        browser.close()


if __name__ == "__main__":
    run()
    print("\n".join(notes))
    print("PROBLEMS:", problems or "none")
    sys.exit(1 if problems else 0)
