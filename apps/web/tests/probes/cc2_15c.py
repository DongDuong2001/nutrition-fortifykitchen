"""cc2-15c: the diary survives sessions, demo has its own storage, no profile goes to setup.

Production build, clock fixed at 18:00 Asia/Ho_Chi_Minh (Bữa tối). No _demo helper: this probe drives the switch itself.
- an empty account (no profile) opening a tab route lands on /setup/profile; auth, /offline and /install stay
- a meal is added, the context is closed, a new one opens with the saved storage: the meal, Gần đây and Tổng quan
  ("Kỳ này có 1 ngày đã ghi") still show it
- an old sessionStorage diary is moved to localStorage once
- demo entries never show after ?demo=0, and real entries never show in demo
- "Bột củ dền" is not found by search outside demo (Khám phá and the add sheet), and is found in demo
Run with: ALIGN_BASE_URL=http://localhost:3102 npm run probe -- tests/probes/cc2_15c.py
"""
import json
import os
import re
import sys

from playwright.sync_api import sync_playwright

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3102")
SIZES = [("390", {"width": 390, "height": 844}), ("1280", {"width": 1280, "height": 800})]
NOW = "2026-10-13T18:00:00+07:00"
PROFILE = '{"sex":"male","birthYear":2003,"weightKg":65,"goal":"maintain","periodMode":false,"trainingMinutesDefault":60,"displayName":""}'
SAMPLE_FOODS = ["Yến mạch", "Yogurt kefir", "Chuối", "Cơm gạo lứt", "Thịt bò nạc", "Chà là", "Bột củ dền"]
BOT_CU_DEN = 'a[href="/foods/food-bot-cu-den"]'
problems, notes = [], []


def check(cond, msg):
    (notes if cond else problems).append(("ok: " if cond else "") + msg)


def text(pg):
    return re.sub(r"\s+", " ", pg.inner_text("body"))


def go(pg, route):
    pg.goto(BASE + route, wait_until="networkidle")
    pg.wait_for_timeout(600)


def with_profile(ctx):
    ctx.add_init_script(
        f"try {{ if (localStorage.getItem('h1t_profile_v1') === null) localStorage.setItem('h1t_profile_v1', JSON.stringify({PROFILE})); }} catch (e) {{}}"
    )


def new_page(browser, size, state=None, profile=True):
    ctx = browser.new_context(viewport=size, storage_state=state) if state else browser.new_context(viewport=size)
    if profile:
        with_profile(ctx)
    pg = ctx.new_page()
    pg.clock.set_fixed_time(NOW)
    return ctx, pg


def add_food(pg, avoid):
    """Adds the first food of the add sheet whose name is not in `avoid`. Returns its name."""
    go(pg, "/add?meal=dinner")
    rows = pg.locator("[data-food-row]:visible")
    for i in range(rows.count()):
        name = rows.nth(i).inner_text().split("\n")[0].strip()
        if name and name not in avoid:
            rows.nth(i).click()
            pg.get_by_role("button", name=re.compile("^Thêm vào Bữa tối")).locator("visible=true").first.click()
            pg.wait_for_url("**/diary")
            pg.wait_for_timeout(500)
            return name
    return ""


def run(browser, name, size):
    where = name

    # 1. No profile: tab routes go to setup
    ctx, pg = new_page(browser, size, profile=False)
    for route in ("/", "/diary", "/explore", "/settings", "/add", "/micros", "/training"):
        go(pg, route)
        check(pg.url.endswith("/setup/profile"), f"{where} no profile: {route} lands on /setup/profile ({pg.url[len(BASE):]})")
    for route in ("/signin", "/signup", "/offline", "/install", "/setup/profile"):
        go(pg, route)
        check(pg.url.endswith(route), f"{where} no profile: {route} is not redirected ({pg.url[len(BASE):]})")
    ctx.close()

    # 2. A meal survives a closed context
    ctx, pg = new_page(browser, size)
    go(pg, "/")
    check("Chưa có ngày nào được ghi" in text(pg), f"{where} empty account with a profile: Tổng quan shows the empty line")
    food = add_food(pg, SAMPLE_FOODS)
    check(food != "" and food in text(pg), f"{where} meal added: {food} is in Nhật ký")
    state = ctx.storage_state()
    keys = {k["name"] for o in state["origins"] for k in o["localStorage"]}
    check("h1t_added_entries_v1" in keys and "h1t_recent_foods_v2" in keys, f"{where} localStorage holds the entries and Gần đây")
    ctx.close()

    ctx, pg = new_page(browser, size, state=state)
    go(pg, "/diary")
    check(food in text(pg) and "Chưa có món hôm nay" not in text(pg), f"{where} new context: the meal ({food}) is still in Nhật ký")
    go(pg, "/explore")
    check(food in text(pg), f"{where} new context: Gần đây still lists {food}")
    go(pg, "/")
    t = text(pg)
    check("Kỳ này có 1 ngày đã ghi" in t, f"{where} Tổng quan: 'Kỳ này có 1 ngày đã ghi' (page: {t[:240]!r})")

    # 3. Demo sandbox
    go(pg, "/diary?demo=1")
    t = text(pg)
    check("Yến mạch" in t and food not in t, f"{where} ?demo=1: the sample day, and not the real meal ({food})")
    demo_food = add_food(pg, SAMPLE_FOODS + [food])
    check(demo_food != "" and demo_food in text(pg), f"{where} ?demo=1: a demo meal ({demo_food}) is added")
    go(pg, "/diary?demo=0")
    t = text(pg)
    check(food in t and demo_food not in t and "Yến mạch" not in t, f"{where} ?demo=0: the real meal only, no demo meal ({demo_food})")
    go(pg, "/diary?demo=1")
    t = text(pg)
    check(demo_food in t and food not in t, f"{where} ?demo=1 again: the demo meal is back, the real one is not")

    # 4. Bột củ dền
    go(pg, "/explore")
    pg.get_by_label("Tìm món").locator("visible=true").first.fill("Bột củ dền")
    pg.wait_for_timeout(400)
    check(pg.locator(BOT_CU_DEN).count() > 0, f"{where} demo: Bột củ dền is found in Khám phá")
    go(pg, "/diary?demo=0")
    go(pg, "/explore")
    pg.get_by_label("Tìm món").locator("visible=true").first.fill("Bột củ dền")
    pg.wait_for_timeout(400)
    check(pg.locator(BOT_CU_DEN).count() == 0, f"{where} no demo: Bột củ dền is not found in Khám phá")
    go(pg, "/add?meal=dinner")
    pg.get_by_label("Tìm món").locator("visible=true").first.fill("Bột củ dền")
    pg.wait_for_timeout(400)
    check("food-bot-cu-den" not in pg.content(), f"{where} no demo: Bột củ dền is not found in the add sheet")
    ctx.close()

    # 5. An old sessionStorage diary moves to localStorage once
    ctx, pg = new_page(browser, size)
    entry = {
        "id": "old-session-1", "foodId": "food-cha-la", "foodName": "Chà là hạt dẻ cũ", "grams": 30, "mealSlot": "snack",
        "displayQty": "30 g", "calories": 85, "carbs": 22.5, "protein": 0.7, "fat": 0.1, "fiber": 2.0,
        "nutrients": {"energy": 85, "carbs": 22.5, "protein": 0.7, "fat": 0.1, "potassium": 195, "fiber": 2.0},
        "addedAt": "2026-10-13T10:00:00.000Z",
    }
    ctx.add_init_script(
        "try { if (localStorage.getItem('h1t_added_entries_v1') === null) "
        f"sessionStorage.setItem('h1t_added_entries_v1', JSON.stringify([{json.dumps(entry)}])); }} catch (e) {{}}"
    )
    go(pg, "/diary")
    check("Chà là hạt dẻ cũ" in text(pg), f"{where} migration: the session entry shows in Nhật ký")
    moved = pg.evaluate(
        "() => [localStorage.getItem('h1t_added_entries_v1') !== null, sessionStorage.getItem('h1t_added_entries_v1')]"
    )
    check(moved[0] is True and moved[1] is None, f"{where} migration: now in localStorage, gone from sessionStorage ({moved})")
    ctx.close()


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        try:
            for name, size in SIZES:
                run(browser, name, size)
        except Exception as error:
            problems.append(f"probe stopped: {type(error).__name__}: {str(error).splitlines()[0]}")
        finally:
            browser.close()
    print("\n".join(notes))
    if problems:
        print("\nFAIL:")
        print("\n".join(problems))
        print(f"\n{len(notes)} ok, {len(problems)} FAIL")
        sys.exit(1)
    print(f"\n{len(notes)} ok, 0 FAIL")


if __name__ == "__main__":
    main()
