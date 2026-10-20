"""cc-03 favourites: heart on the Chà là detail page, Yêu thích on /add, the empty state and Bỏ lọc,
reload persistence, the small heart in the grouped list, and one × in the search box.
Run with: ALIGN_BASE_URL=http://localhost:3101 PATH=/usr/bin:$PATH npm run probe -- tests/probes/cc03.py
"""
# PROBE_COVERS: app/(app)/add/** app/(app)/foods/[id]/**
import os
import sys

from playwright.sync_api import sync_playwright
import _demo  # noqa: F401  (cc2-15b: demo mode on, see _demo.py)

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3100")
SHOTS = os.path.join(os.path.dirname(__file__), "..", "..", ".screenshots")
PHONE = {"width": 390, "height": 844}
DESKTOP = {"width": 1440, "height": 900}
DETAIL = BASE + "/foods/food-cha-la?meal=snack"
ADD = BASE + "/add?meal=snack"
problems = []
notes = []


def check(cond, msg):
    if cond:
        notes.append("ok: " + msg)
    else:
        problems.append(msg)


def shown(pg, selector):
    return pg.locator(selector + " >> visible=true").count() > 0


def heart(pg, saved):
    # The label flips with the state: "Bỏ yêu thích" when saved, "Thêm vào yêu thích" when not
    label = "Bỏ yêu thích" if saved else "Thêm vào yêu thích"
    return pg.locator(f'button[aria-label="{label}"] >> visible=true')


def filter_group(pg):
    return pg.locator('[role=group][aria-label="Lọc món theo nhóm"]:visible')


def favourites_chip(pg):
    return filter_group(pg).get_by_role("button", name="Yêu thích", exact=True)


def all_chip(pg):
    return filter_group(pg).get_by_role("button", name="Tất cả", exact=True)


def food_rows(pg):
    return pg.locator("[data-food-row]:visible")


def row(pg, text):
    return food_rows(pg).filter(has_text=text)


def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()

        for name, vp in (("390", PHONE), ("1440", DESKTOP)):
            # A fresh context per width, so localStorage starts empty at each width
            ctx = browser.new_context(viewport=vp)
            pg = ctx.new_page()
            errors = []
            pg.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)

            # 1. heart on the Chà là detail page
            pg.goto(DETAIL, wait_until="networkidle")
            pg.wait_for_timeout(300)
            check(heart(pg, False).count() == 1, f"{name}: Chà là detail shows the outline heart")
            check(heart(pg, False).get_attribute("aria-pressed") == "false", f"{name}: heart starts unpressed")
            heart(pg, False).click()
            pg.wait_for_timeout(200)
            check(shown(pg, 'text="Đã thêm vào yêu thích"'), f"{name}: save toast shows")
            check(heart(pg, True).get_attribute("aria-pressed") == "true", f"{name}: heart is pressed after save")
            if name == "390":
                pg.screenshot(path=os.path.join(SHOTS, "cc03-detail-heart-390.png"), animations="disabled")

            # 2. /add: Yêu thích lists Chà là
            pg.goto(ADD, wait_until="networkidle")
            pg.wait_for_timeout(300)
            favourites_chip(pg).click()
            pg.wait_for_timeout(200)
            check(favourites_chip(pg).get_attribute("aria-pressed") == "true", f"{name}: Yêu thích chip is pressed")
            check(row(pg, "Chà là").count() == 1, f"{name}: Yêu thích shows Chà là")
            check(food_rows(pg).count() == 1, f"{name}: Yêu thích shows only the favourite")
            if name == "390":
                pg.screenshot(path=os.path.join(SHOTS, "cc03-add-fav-390.png"), animations="disabled")

            # 3. un-heart: empty state, then Bỏ lọc returns to Tất cả
            pg.goto(DETAIL, wait_until="networkidle")
            pg.wait_for_timeout(300)
            heart(pg, True).click()
            pg.wait_for_timeout(200)
            check(shown(pg, 'text="Đã bỏ khỏi yêu thích"'), f"{name}: remove toast shows")
            check(heart(pg, False).count() == 1, f"{name}: un-heart returns the outline label")
            pg.goto(ADD, wait_until="networkidle")
            pg.wait_for_timeout(300)
            favourites_chip(pg).click()
            pg.wait_for_timeout(200)
            check(shown(pg, 'text="Chưa có món yêu thích"'), f"{name}: empty favourites title shows")
            check(shown(pg, 'text="Bấm ♡ ở trang chi tiết món để lưu."'), f"{name}: empty favourites hint shows")
            check(food_rows(pg).count() == 0, f"{name}: no rows in the empty state")
            if name == "1440":
                pg.screenshot(path=os.path.join(SHOTS, "cc03-add-fav-empty-1440.png"), animations="disabled")
            pg.locator("button >> visible=true").filter(has_text="Bỏ lọc").first.click()
            pg.wait_for_timeout(200)
            check(all_chip(pg).get_attribute("aria-pressed") == "true", f"{name}: Bỏ lọc returns to Tất cả")
            check(food_rows(pg).count() > 1, f"{name}: Tất cả lists the foods again")

            # 4. reload keeps the favourite
            pg.goto(DETAIL, wait_until="networkidle")
            pg.wait_for_timeout(200)
            heart(pg, False).click()
            pg.wait_for_timeout(100)
            pg.reload(wait_until="networkidle")
            pg.wait_for_timeout(300)
            check(heart(pg, True).count() == 1, f"{name}: favourite survives a reload")
            pg.goto(ADD, wait_until="networkidle")
            pg.wait_for_timeout(300)
            favourites_chip(pg).click()
            pg.wait_for_timeout(200)
            check(row(pg, "Chà là").count() == 1, f"{name}: Yêu thích still lists Chà là after reload")
            all_chip(pg).click()
            pg.wait_for_timeout(200)

            # 5. grouped Tất cả: a small filled heart after Chà là, and no other row has one
            hearts = pg.locator("[data-food-row]:visible span.line-clamp-2 svg")
            check(hearts.count() == 1, f"{name}: one small heart in the grouped list (found {hearts.count()})")
            mark = row(pg, "Chà là").locator("span.line-clamp-2 svg")
            check(mark.count() == 1, f"{name}: Chà là row has the small heart")
            if mark.count() == 1:
                box = mark.first.bounding_box()
                width = round(box["width"]) if box else None
                check(width == 14, f"{name}: small heart is 14 px (found {width})")
                check(mark.first.get_attribute("aria-hidden") == "true", f"{name}: small heart is aria-hidden")
                if name == "390":
                    row(pg, "Chà là").first.scroll_into_view_if_needed()
                    pg.wait_for_timeout(150)
                    pg.screenshot(path=os.path.join(SHOTS, "cc03-add-grouped-heart-390.png"), animations="disabled")

            # 6. still only one × in the search box
            search = pg.locator('input[type="search"] >> visible=true').first
            search.fill("chà là")
            pg.wait_for_timeout(150)
            ours = pg.locator('button[aria-label="Xóa tìm kiếm"] >> visible=true').count()
            check(ours == 1, f"{name}: exactly one × in the search box (found {ours})")
            search.fill("")

            if errors:
                problems.append(f"{name}: console errors: {errors[:3]}")
            ctx.close()

        browser.close()


if __name__ == "__main__":
    run()
    print("\n".join(notes))
    print("PROBLEMS:", problems or "none")
    sys.exit(1 if problems else 0)
