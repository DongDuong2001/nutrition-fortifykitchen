"""cc2-15c: the diary survives sessions, demo has its own storage, no profile goes to setup.

Production build, clock fixed at 18:00 Asia/Ho_Chi_Minh (Bữa tối). No _demo helper: this probe drives the switch itself.
- an empty account (no profile) opening a tab route lands on /setup/profile; auth, /offline and /install stay
- a meal is added, the context is closed, a new one opens with the saved storage: the meal, Gần đây and Tổng quan
  ("Kỳ này có 1 ngày đã ghi") still show it
- an old sessionStorage diary is moved to localStorage once
- demo entries never show after ?demo=0, and real entries never show in demo
- "Bột củ dền" is not found by search outside demo (Khám phá and the add sheet), and is found in demo
- each account has its own diary: A logs a food and signs out, B signs in and sees an empty diary, A signs back in and
  the food is there (client navigation, no reload); nobody signed in goes to /signin
- the first paint of / on a fresh profile is the skeleton (server HTML, no script run), and it does not shimmer
  under prefers-reduced-motion
Run with: ALIGN_BASE_URL=http://localhost:3102 npm run probe -- tests/probes/cc2_15c.py
"""
import hashlib
import json
import os
import re
import sys

from playwright.sync_api import sync_playwright
import _seed  # noqa: F401  (cc-42: tour done, tips off)

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


def sign_in_magic(pg, email):
    # cc-19 exception (approved by reviewer 13/10 20:58): outside demo mode the mock store has no account until someone signs
    # in. The magic-link request signs the email in (lib/auth-actions.ts requestMagicLink), so this is the sign-in the probe needs.
    go(pg, "/signin")
    pg.locator('input[type="email"]').fill(email)
    pg.get_by_role("button", name="Gửi liên kết đăng nhập qua email").click()
    pg.wait_for_url("**/signin/check-email")


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
            pg.wait_for_url(re.compile(r".*/(\?.*)?$"))
            pg.wait_for_timeout(500)
            return name
    return ""


def run(browser, name, size):
    where = name

    # 1. No profile: tab routes go to setup
    ctx, pg = new_page(browser, size, profile=False)
    # cc-21: nobody signed in goes to /signin first (no account can have a profile yet); setup applies once someone is in
    for route in ("/", "/", "/explore", "/settings", "/add", "/micros", "/training"):
        go(pg, route)
        # cc-41: signed out, the root of a desktop window is the landing page; everything else goes to /signin
        want = "/landing" if route == "/" and size["width"] >= 1024 else "/signin"
        check(pg.url.endswith(want), f"{where} nobody signed in: {route} goes to {want} ({pg.url[len(BASE):]})")
    sign_in_magic(pg, "ban@email.com")  # an account with no profile
    for route in ("/", "/", "/explore", "/settings", "/add", "/micros", "/training"):
        go(pg, route)
        check(pg.url.endswith("/setup/profile"), f"{where} no profile: {route} lands on /setup/profile ({pg.url[len(BASE):]})")
    for route in ("/signin", "/signup", "/offline", "/install", "/setup/profile"):
        go(pg, route)
        check(pg.url.endswith(route), f"{where} no profile: {route} is not redirected ({pg.url[len(BASE):]})")
    ctx.close()

    # 2. A meal survives a closed context
    ctx, pg = new_page(browser, size)
    sign_in_magic(pg, "ban@email.com")  # the key check below is for ban@email.com's storage keys
    go(pg, "/trends")
    check("Chưa có ngày nào được ghi" in text(pg), f"{where} empty account with a profile: Tổng quan shows the empty line")
    food = add_food(pg, SAMPLE_FOODS)
    check(food != "" and food in text(pg), f"{where} meal added: {food} is in Hôm nay")
    state = ctx.storage_state()
    keys = {k["name"] for o in state["origins"] for k in o["localStorage"]}
    check(
        "h1t_added_entries_v1_ban@email.com" in keys and "h1t_recent_foods_v2_ban@email.com" in keys,
        f"{where} localStorage holds the entries and Gần đây under the account's keys",
    )
    check("h1t_added_entries_v1" not in keys, f"{where} no unscoped entries key is left")
    ctx.close()

    ctx, pg = new_page(browser, size, state=state)
    go(pg, "/")
    check(food in text(pg) and "Chưa có món nào hôm nay" not in text(pg), f"{where} new context: the meal ({food}) is still in Hôm nay")
    go(pg, "/explore")
    check(food in text(pg), f"{where} new context: Gần đây still lists {food}")
    go(pg, "/trends")
    t = text(pg)
    check("Kỳ này có 1 ngày đã ghi" in t, f"{where} Tổng quan: 'Kỳ này có 1 ngày đã ghi' (page: {t[:240]!r})")

    # 3. Demo sandbox
    go(pg, "/?demo=1")
    t = text(pg)
    check("Yến mạch" in t and food not in t, f"{where} ?demo=1: the sample day, and not the real meal ({food})")
    demo_food = add_food(pg, SAMPLE_FOODS + [food])
    check(demo_food != "" and demo_food in text(pg), f"{where} ?demo=1: a demo meal ({demo_food}) is added")
    go(pg, "/?demo=0")
    t = text(pg)
    check(food in t and demo_food not in t and "Yến mạch" not in t, f"{where} ?demo=0: the real meal only, no demo meal ({demo_food})")
    go(pg, "/?demo=1")
    t = text(pg)
    check(demo_food in t and food not in t, f"{where} ?demo=1 again: the demo meal is back, the real one is not")

    # 4. Bột củ dền
    go(pg, "/explore")
    pg.get_by_label("Tìm món").locator("visible=true").first.fill("Bột củ dền")
    pg.wait_for_timeout(400)
    check(pg.locator(BOT_CU_DEN).count() > 0, f"{where} demo: Bột củ dền is found in Khám phá")
    go(pg, "/?demo=0")
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
    # cc-19 exception: sign in before the old entry is seeded, so the seed runs once, on the diary load (the one migration)
    sign_in_magic(pg, "ban@email.com")  # the diary belongs to a signed-in account (the key checked below)
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
    go(pg, "/")
    check("Chà là hạt dẻ cũ" in text(pg), f"{where} migration: the session entry shows in Hôm nay")
    moved = pg.evaluate(
        "() => [localStorage.getItem('h1t_added_entries_v1_ban@email.com') !== null, sessionStorage.getItem('h1t_added_entries_v1'),"
        " localStorage.getItem('h1t_added_entries_v1')]"
    )
    check(
        moved[0] is True and moved[1] is None and moved[2] is None,
        f"{where} migration: now under the account's key in localStorage, gone from sessionStorage and the old key ({moved})",
    )
    ctx.close()

    # 6. Each account has its own diary
    password = "Abcdef12"
    digest = hashlib.sha256(password.encode()).hexdigest()
    accounts = {e: {"hash": digest, "providers": ["password"]} for e in ("a@example.com", "b@example.com")}
    store = json.dumps({"current": "a@example.com", "accounts": accounts})
    ctx, pg = new_page(browser, size)
    ctx.add_init_script(
        f"try {{ if (localStorage.getItem('h1t_mock_auth_v1') === null) localStorage.setItem('h1t_mock_auth_v1', {json.dumps(store)}); }} catch (e) {{}}"
    )

    def sign_in(email):
        # cc-21: the email field has a placeholder, not a label (cc2_15c's old label lookup no longer finds it)
        pg.locator('input[type="email"]').fill(email)
        pg.locator('input[type="password"]').first.fill(password)
        pg.locator('button[type="submit"]').first.click()
        pg.wait_for_url(BASE + "/")
        pg.wait_for_timeout(500)

    def open_tab(label, url_end):
        pg.get_by_role("link", name=label).locator("visible=true").first.click()
        pg.wait_for_url("**" + url_end)
        pg.wait_for_timeout(500)

    def sign_out():
        open_tab("Cài đặt", "/settings")
        pg.get_by_text("Tài khoản", exact=True).locator("visible=true").first.click()
        pg.wait_for_url("**/settings/account")
        pg.get_by_text("Đăng xuất", exact=True).locator("visible=true").first.click()
        pg.wait_for_url("**/signin")
        pg.wait_for_timeout(300)

    go(pg, "/")
    a_food = add_food(pg, SAMPLE_FOODS)
    check(a_food != "" and a_food in text(pg), f"{where} accounts: A logs {a_food}")
    keys = pg.evaluate("() => Object.keys(localStorage)")
    check("h1t_added_entries_v1_a@example.com" in keys, f"{where} accounts: A's entries are under A's key ({keys})")
    sign_out()
    go(pg, "/")
    want = "/landing" if size["width"] >= 1024 else "/signin"
    check(pg.url.endswith(want), f"{where} accounts: nobody signed in, /diary goes to {want} ({pg.url[len(BASE):]})")
    go(pg, "/signin")
    sign_in("b@example.com")
    go(pg, "/trends")  # cc2-31b: Tổng quan is /trends (sign-in lands on the home screen)
    check("Chưa có ngày nào được ghi" in text(pg), f"{where} accounts: B's Tổng quan is empty")
    go(pg, "/")  # Hôm nay is no longer a nav tab (cc2-31a), so load it directly
    t = text(pg)
    check(a_food not in t, f"{where} accounts: B's Hôm nay does not show A's {a_food}")
    check("Chưa có món nào hôm nay" in t, f"{where} accounts: B's Hôm nay is empty ('Chưa có món hôm nay')")
    sign_out()
    sign_in("a@example.com")
    go(pg, "/")  # Hôm nay is no longer a nav tab (cc2-31a), so load it directly
    check(a_food in text(pg), f"{where} accounts: A signs back in and {a_food} is there")
    ctx.close()

    # 7. First paint of / on a fresh profile is the skeleton, not a blank page
    for scheme, expect in (("no-preference", "pulse"), ("reduce", "none")):
        ctx = browser.new_context(viewport=size, reduced_motion=scheme)
        pg = ctx.new_page()
        pg.route("**/*", lambda r: r.abort() if r.request.resource_type == "script" else r.continue_())
        pg.goto(BASE + "/", wait_until="load")
        busy = pg.locator('[aria-busy="true"]')
        check(busy.count() == 1 and busy.first.is_visible(), f"{where} first paint of / ({scheme}): the skeleton is on screen")
        check(len(text(pg).strip()) > 0 and "kcal" not in text(pg), f"{where} first paint ({scheme}): not blank, no sample targets")
        cards = busy.first.locator("> div")
        check(cards.count() == 2, f"{where} first paint ({scheme}): two card-shaped blocks ({cards.count()})")
        header = pg.locator("header").first
        box = header.bounding_box()
        check(box is not None and box["height"] > 40 and header.inner_text().strip() == "", f"{where} first paint ({scheme}): header shape, no title text")
        if name == "390":
            style = header.evaluate("(h) => [getComputedStyle(h).borderBottomLeftRadius, getComputedStyle(h).backgroundColor]")
            check(style[0] == "20px" and style[1] != "rgba(0, 0, 0, 0)", f"{where} first paint ({scheme}): ink header, 20 px bottom radius ({style})")
        anim = cards.first.evaluate("(c) => getComputedStyle(c).animationName")
        check(expect in anim, f"{where} first paint ({scheme}): card animation is {anim!r} (expect {expect})")
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
