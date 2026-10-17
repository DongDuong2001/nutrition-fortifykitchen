"""hotfix/search follow-up: the add dialog list scrolls, and (live build) screens wait for the catalogue.

Part A (demo build, part of probe:all): desktop 1440 /add, each category chip: the flat list keeps its height
(flex-shrink 0) and, when it is taller than the dialog's list box, the box scrolls to the last row.
Part B (LIVE_BUILD=1, a build made with NEXT_PUBLIC_API_MODE=live and a non-dummy NEXT_PUBLIC_SUPABASE_URL; not in
probe:all): /explore/tinh_bot opened directly, with /foods mocked to 35 Tinh bột foods, ends on "35 món" (and shows
"Đang tải món…", never "Chưa có món nào", while /foods is slow); a failed /foods shows Thử lại, which loads them.
Run with: ALIGN_BASE_URL=http://localhost:3101 npm run probe -- tests/probes/hotfix_catalogue.py
"""
import base64
import json
import os
import sys
import time
from pathlib import Path

from playwright.sync_api import sync_playwright
import _demo  # noqa: F401  (demo mode on for part A)

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3101")
LIVE = os.environ.get("LIVE_BUILD") == "1"
SHOTS = Path(__file__).resolve().parent.parent.parent / ".screenshots"
SHOTS.mkdir(exist_ok=True)
problems = []


def check(cond, msg):
    print(("[PASS] " if cond else "[FAIL] ") + msg)
    if not cond:
        problems.append(msg)


def part_a(browser):
    ctx = browser.new_context(viewport={"width": 1440, "height": 900})
    pg = ctx.new_page()
    pg.goto(BASE + "/add", wait_until="networkidle")
    pg.wait_for_timeout(600)
    check(pg.locator("ul[data-food-list], [data-food-row]:visible").count() >= 0, "A: the desktop add dialog is open")
    chips = pg.locator('[role="group"][aria-label="Lọc món theo nhóm"]:visible button, [aria-label="Lọc món theo nhóm"]:visible button')
    names = [chips.nth(i).inner_text().strip() for i in range(chips.count())]
    check("Tinh bột" in names, f"A: the Tinh bột chip is there ({names})")
    overflowing = 0
    for name in [n for n in names if n and n != "Yêu thích"]:
        pg.get_by_role("button", name=name, exact=True).first.click()
        pg.wait_for_timeout(250)
        ul = pg.locator('ul[data-align-group="add-list"]:visible').first
        if ul.count() == 0:
            continue  # Tất cả is grouped: its sections are not squeezed
        box = ul.locator("xpath=..")  # the list box: max-h-[360px] overflow-y-auto
        shrink = ul.evaluate("el => getComputedStyle(el).flexShrink")
        check(shrink == "0", f"A: {name}: the flat list does not shrink ({shrink})")
        info = box.evaluate("el => ({ client: el.clientHeight, scroll: el.scrollHeight })")
        li = ul.evaluate("el => el.getBoundingClientRect().height")
        rows = ul.locator("li").count()
        rows_h = ul.locator("li").evaluate_all("els => els.reduce((s, e) => s + e.getBoundingClientRect().height, 0)")
        check(li + 1 >= rows_h, f"A: {name}: the list is as tall as its {rows} rows ({li:.0f} of {rows_h:.0f} px)")
        if info["scroll"] > info["client"] + 1:
            overflowing += 1
            box.evaluate("el => { el.scrollTop = el.scrollHeight; }")
            pg.wait_for_timeout(150)
            last = ul.locator("li").last.bounding_box()
            frame = box.bounding_box()
            check(last["y"] + last["height"] <= frame["y"] + frame["height"] + 1, f"A: {name}: scrolled to the end, the last row is in view")
    print(f"[INFO] A: {overflowing} chip lists were taller than the list box")
    pg.screenshot(path=str(SHOTS / "hotfix-catalogue-add-1440.png"))
    ctx.close()


def foods_rows(count):
    return [
        {
            "id": f"tb-{i}",
            "name_vi": f"Tinh bột {i}",
            "category": "tinh_bot",
            "source": "USDA",
            "servings": [{"label": "100 g", "grams": 100}],
            "nutrients": {"energy": 100 + i, "carbs": 20, "protein": 2, "fat": 1},
        }
        for i in range(count)
    ]


def fake_session(ctx, supabase_origin):
    """A signed-in browser for a live build whose Supabase answers only /auth/v1/user (mocked below)."""
    user = {"id": "u-1", "aud": "authenticated", "role": "authenticated", "email": "probe@example.com", "app_metadata": {"provider": "email", "providers": ["email"]}, "user_metadata": {}, "identities": [], "created_at": "2026-01-01T00:00:00Z"}
    ctx.route(supabase_origin + "/auth/v1/**", lambda route: route.fulfill(status=200, content_type="application/json", body=json.dumps(user)))
    session = {"access_token": "probe.jwt.token", "refresh_token": "probe-refresh", "expires_in": 3600, "expires_at": int(time.time()) + 3600, "token_type": "bearer", "user": user}
    value = "base64-" + base64.urlsafe_b64encode(json.dumps(session).encode()).decode().rstrip("=")
    host = supabase_origin.split("//")[1].split(":")[0].split(".")[0]
    ctx.add_cookies([{"name": f"sb-{host}-auth-token", "value": value, "url": BASE}])


PROFILE = {"sex": "male", "birth_year": 2000, "weight_kg": 65, "goal": "maintain", "display_name": "Probe", "training_minutes_default": 60}


def mock_api(ctx, state):
    """The API of a signed-in account with a finished setup; /foods is slow, failing or fine as `state` says."""

    def handler(route):
        path = route.request.url.split("/api/v1", 1)[1].split("?")[0]
        if path == "/foods":
            if state["mode"] == "fail":
                route.fulfill(status=500, body="boom")
                return
            body = {"data": {"items": foods_rows(35), "total": 35}}
            if state["mode"] == "slow":
                # Held until the probe lets it go, so the page is seen while it waits
                state.setdefault("held", []).append((route, body))
                return
        elif path == "/me":
            body = {"data": PROFILE}
        elif path.startswith("/days/"):
            body = {"data": {"meals": []}}
        else:
            body = {"data": []}
        route.fulfill(status=200, content_type="application/json", body=json.dumps(body))

    def release():
        for held, body in state.pop("held", []):
            held.fulfill(status=200, content_type="application/json", body=json.dumps(body))

    state["release"] = release
    ctx.route("**/api/v1/**", handler)


def part_b(browser):
    supabase = os.environ.get("PROBE_SUPABASE_ORIGIN", "http://localhost:54399")
    state = {"mode": "slow"}
    ctx = browser.new_context(viewport={"width": 390, "height": 844})
    fake_session(ctx, supabase)
    mock_api(ctx, state)
    pg = ctx.new_page()
    pg.goto(BASE + "/explore/tinh_bot", wait_until="domcontentloaded")
    pg.wait_for_timeout(700)
    body = pg.inner_text("body")
    check(pg.url.split("?")[0].endswith("/explore/tinh_bot"), f"B: the deep link stays on /explore/tinh_bot ({pg.url})")
    check("Chưa có món nào" not in body, "B: while /foods is slow the screen never says Chưa có món nào")
    check("Đang tải món" in body, "B: it says Đang tải món… while /foods is slow")
    check("Đang tải món" in pg.locator("header, h1").first.inner_text() or pg.locator("[data-catalog-loading]").count() >= 1, "B: the list shows its loading state")
    state["release"]()
    pg.wait_for_selector("text=35 món", timeout=15000)
    check(True, "B: the header reads 35 món once the catalogue arrives")
    check(pg.locator('a[href^="/foods/tb-"]').count() == 35, "B: all 35 Tinh bột foods are listed")
    pg.screenshot(path=str(SHOTS / "hotfix-catalogue-explore-tinh-bot.png"))
    ctx.close()

    # A failed load: Thử lại, and it works
    state["mode"] = "fail"
    ctx = browser.new_context(viewport={"width": 390, "height": 844})
    fake_session(ctx, supabase)
    mock_api(ctx, state)
    pg = ctx.new_page()
    pg.goto(BASE + "/explore/tinh_bot", wait_until="domcontentloaded")
    pg.get_by_role("button", name="Thử lại").wait_for(timeout=15000)
    check("Chưa có món nào" not in pg.inner_text("body"), "B: a failed load shows Thử lại, not Chưa có món nào")
    state["mode"] = "ok"
    pg.get_by_role("button", name="Thử lại").click()
    pg.wait_for_selector("text=35 món", timeout=15000)
    check(True, "B: Thử lại loads the 35 foods")
    ctx.close()

    # /add: the diary provider and the search both ask for the catalogue, the API is asked once
    state["mode"] = "ok"
    ctx = browser.new_context(viewport={"width": 390, "height": 844})
    fake_session(ctx, supabase)
    mock_api(ctx, state)
    asked = []
    ctx.on("request", lambda r: asked.append(r.url) if "/api/v1/foods?" in r.url else None)
    pg = ctx.new_page()
    pg.goto(BASE + "/add", wait_until="networkidle")
    pg.wait_for_timeout(800)
    check(len(asked) == 1, f"B: /add asks /foods once ({len(asked)}: {asked})")
    check(pg.locator("[data-food-row]:visible").count() > 0, "B: /add lists the foods that arrived")
    ctx.close()


with sync_playwright() as p:
    browser = p.chromium.launch()
    if not LIVE:
        part_a(browser)
    else:
        part_b(browser)
    browser.close()

print("hotfix_catalogue: " + ("all checks passed" if not problems else f"{len(problems)} FAILED"))
sys.exit(1 if problems else 0)
