"""cc-67 part 5: taps from Hôm nay to a logged food (390 x 844, demo build). Counts every tap the flow needs; typing is not a tap.

A recent food (Gần đây card +), B recent food through the portion sheet (card body, Thêm), C a searched food (row, Thêm),
D a dish with one part changed (Phở bò, Bánh phở 200 → 150 g: row, Thành phần, the gram field and typing 150, Thêm; on main the closest is the
+ Thịt bò chip), E the same dish a second time (Thành phần is open already).
Run with: ALIGN_BASE_URL=http://localhost:3101 npm run probe -- tests/probes/cc_67_taps.py
"""
import os
import re

from playwright.sync_api import sync_playwright
import _demo  # noqa: F401  (demo mode, tour and tips off)

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3100")
PHONE = dict(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
taps = 0
counted = {}


def tap(locator, force=False):
    global taps
    taps += 1
    # force: a card of a scroll-snap carousel never reads as "stable" to Playwright, a finger taps it fine
    locator.tap(force=force)


def open_add(pg):
    pg.goto(BASE + "/app", wait_until="networkidle")
    pg.wait_for_timeout(1200)
    # The first-visit pop-up of the demo account is not part of logging a food
    later = pg.get_by_role("button", name="Để sau")
    try:
        later.first.wait_for(state="visible", timeout=3000)
        later.first.tap()
        pg.wait_for_timeout(600)
    except Exception:
        pass
    add = pg.locator('[data-tour="nav-add"]:visible').first
    tap(add)
    pg.wait_for_url(re.compile(r".*/add.*"))
    pg.wait_for_timeout(900)


def done(pg, label):
    pg.wait_for_url(re.compile(r".*/app(\?.*)?$"))
    pg.wait_for_timeout(400)
    print(f"{label}: {taps} taps")
    counted[label[0]] = taps


def change_part(pg, section):
    """Bánh phở 200 → 150 g: one tap on the gram field, then typing (on main the closest is the + Thịt bò chip, one tap)"""
    field = section.get_by_role("textbox", name="Số gam Bánh phở (tươi)")
    tap(field)
    pg.keyboard.type("150")
    pg.wait_for_timeout(200)


def search(pg, text):
    field = pg.locator('[data-add-panel] input').first
    field.fill(text)
    pg.wait_for_timeout(700)


def row(pg, name):
    return pg.locator("[data-add-panel] button[data-food-row]").filter(has_text=name).first


def main():
    global taps
    with sync_playwright() as p:
        browser = p.chromium.launch()

        def fresh():
            ctx = browser.new_context(**PHONE)
            return ctx, ctx.new_page()

        ctx, pg = fresh()
        taps = 0
        open_add(pg)
        tap(pg.locator('[data-tour="add-recents"]:visible button[aria-label^="Thêm "]').first)
        done(pg, "A recent food, one tap on its card")
        ctx.close()

        ctx, pg = fresh()
        taps = 0
        open_add(pg)
        tap(pg.locator('[data-tour="add-recents"]:visible button[aria-label^="Chọn khẩu phần "]').first)
        tap(pg.locator('[data-tour="portion-add"]:visible').first)
        done(pg, "B recent food through the portion sheet")
        ctx.close()

        ctx, pg = fresh()
        taps = 0
        open_add(pg)
        search(pg, "chuối")
        tap(row(pg, "Chuối"))
        tap(pg.locator('[data-tour="portion-add"]:visible').first)
        done(pg, "C searched food")
        ctx.close()

        ctx, pg = fresh()
        taps = 0
        open_add(pg)
        search(pg, "phở bò")
        tap(row(pg, "Phở bò"))
        pg.locator('[data-tour="dish-parts"]:visible').first.wait_for(state="visible", timeout=8000)
        section = pg.locator('[data-tour="dish-parts"]:visible').first
        if section.get_by_role("button", name=re.compile("^Thành phần")).get_attribute("aria-expanded") != "true":
            tap(section.get_by_role("button", name=re.compile("^Thành phần")))
            pg.wait_for_timeout(500)
        change_part(pg, section)
        tap(pg.locator('[data-tour="portion-add"]:visible').first)
        done(pg, "D dish with one part changed (main: the + Thịt bò chip, 5 taps)")

        # E: the same context, the parts stay open
        taps = 0
        open_add(pg)
        search(pg, "phở bò")
        tap(row(pg, "Phở bò"))
        section = pg.locator('[data-tour="dish-parts"]:visible').first
        section.wait_for(state="visible", timeout=8000)
        pg.wait_for_timeout(600)
        if section.get_by_role("button", name=re.compile("^Thành phần")).get_attribute("aria-expanded") != "true":
            tap(section.get_by_role("button", name=re.compile("^Thành phần")))
            pg.wait_for_timeout(500)
        change_part(pg, section)
        tap(pg.locator('[data-tour="portion-add"]:visible').first)
        done(pg, "E the same dish again")
        ctx.close()
        browser.close()
    # Targets: a recent food is at most 3 taps, a changed dish no more than the chip it replaces (5)
    assert counted["A"] <= 3 and counted["B"] <= 3, counted
    assert counted["C"] <= 3 and counted["D"] <= 5 and counted["E"] <= counted["D"], counted


if __name__ == "__main__":
    main()
