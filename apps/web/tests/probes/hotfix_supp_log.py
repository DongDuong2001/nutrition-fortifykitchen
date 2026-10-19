"""hotfix/supp-log: a supplement whose pack label states no energy can be logged, on live-shaped data.

Needs a live build (NEXT_PUBLIC_API_MODE=live, a non-dummy NEXT_PUBLIC_SUPABASE_URL such as http://localhost:54399 and
any anon key) and LIVE_BUILD=1; the API is mocked here. On a demo build (probe:all) it prints SKIP and exits 0.
The capsule is the catalogue row of CanPrev Magnesium Bis-Glycinate 80 Ultra Gentle: bo_sung, source "label",
portion "1 viên" = 1 g, magnesium 8000 mg per 100 g (80 mg per capsule), no energy and no macros.
- Log it: Hôm nay has a 200 kcal food; the capsule's food page at ×2 adds "2 viên" (grams 2). Hôm nay then reads
  magnesium 160 mg and still 200 kcal, also after a reload (the server stores the capsule's kcal as NULL).
- Its food page: no "chưa thể ghi" warning, the note "Nhãn không ghi năng lượng; tính là 0 kcal.", the macro card
  reads "—" (never "0" / "0 g"), the ×N stepper and no gram field; Thêm is enabled.
- A label powder with a "100 g" portion (whey) keeps the gram field (Tùy chỉnh) and has no stepper.
- Hôm nay with the capsule alone reads 0 kcal, not "—".
Run with: LIVE_BUILD=1 ALIGN_BASE_URL=http://localhost:3101 npm run probe -- tests/probes/hotfix_supp_log.py
"""
# PROBE_COVERS: app/(app)/(tabs)/app/** app/(app)/foods/[id]/** app/page.tsx
import base64
import json
import os
import sys
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3101")
SUPABASE = os.environ.get("PROBE_SUPABASE_ORIGIN", "http://localhost:54399")
SHOTS = Path(__file__).resolve().parent.parent.parent / ".screenshots"
SHOTS.mkdir(exist_ok=True)
problems = []

CAPSULE_ID = "11111111-2222-4333-8444-555555555555"
WHEY_ID = "11111111-2222-4333-8444-666666666666"
RICE_ID = "11111111-2222-4333-8444-777777777777"
CAPSULE = {"id": CAPSULE_ID, "name_vi": "CanPrev Magnesium Bis-Glycinate 80 Ultra Gentle", "brand": "CanPrev", "category": "bo_sung",
           "source": "label", "servings": [{"label": "1 viên", "grams": 1}], "nutrients": {"magnesium": 8000}}
WHEY = {"id": WHEY_ID, "name_vi": "Isopure Whey", "category": "bo_sung", "source": "label",
        "servings": [{"label": "1 muỗng", "grams": 31}, {"label": "100 g", "grams": 100}],
        "nutrients": {"energy": 360, "protein": 80, "carbs": 3, "fat": 1}}
RICE = {"id": RICE_ID, "name_vi": "Cơm trắng", "category": "tinh_bot", "source": "USDA",
        "servings": [{"label": "100 g", "grams": 100}], "nutrients": {"energy": 200, "carbs": 44, "protein": 4, "fat": 0.4}}
FOODS = [CAPSULE, WHEY, RICE]
PROFILE = {"sex": "male", "birth_year": 2000, "weight_kg": 65, "goal": "maintain", "display_name": "Probe", "training_minutes_default": 60}


def check(cond, msg):
    print(("[PASS] " if cond else "[FAIL] ") + msg)
    if not cond:
        problems.append(msg)


def server_entry(eid, food, label, grams):
    """An entry as GET /days returns it: nutrients scaled from the food's per-100 g, NULL where the food has none."""
    scaled = {k: (v * grams / 100 if v is not None else None) for k, v in food["nutrients"].items()}
    for k in ("energy", "protein", "carbs", "fat"):
        scaled.setdefault(k, None)
    return {"id": eid, "food_id": food["id"], "food_name": food["name_vi"], "kind": "food", "meal_slot": "breakfast",
            "serving_label": label, "grams": grams, "calories": scaled["energy"], "nutrients": scaled,
            "created_at": "2026-10-18T01:00:00Z"}


RICE_ENTRY = server_entry("aaaaaaaa-0000-4000-8000-000000000002", RICE, "100 g", 100)
PILL_ENTRY = server_entry("aaaaaaaa-0000-4000-8000-000000000001", CAPSULE, "1 viên", 1)


def fake_session(ctx):
    """A signed-in browser for a live build whose Supabase answers only /auth/v1/user (mocked)."""
    user = {"id": "u-1", "aud": "authenticated", "role": "authenticated", "email": "probe@example.com", "app_metadata": {"provider": "email", "providers": ["email"]}, "user_metadata": {}, "identities": [], "created_at": "2026-01-01T00:00:00Z"}
    ctx.route(SUPABASE + "/auth/v1/**", lambda route: route.fulfill(status=200, content_type="application/json", body=json.dumps(user)))
    session = {"access_token": "probe.jwt.token", "refresh_token": "probe-refresh", "expires_in": 3600, "expires_at": int(time.time()) + 3600, "token_type": "bearer", "user": user}
    value = "base64-" + base64.urlsafe_b64encode(json.dumps(session).encode()).decode().rstrip("=")
    host = SUPABASE.split("//")[1].split(":")[0].split(".")[0]
    ctx.add_cookies([{"name": f"sb-{host}-auth-token", "value": value, "url": BASE}])


def mock_api(ctx, day, posted):
    """The API of a signed-in account; a POSTed entry joins `day` the way the server stores it (kcal NULL for the capsule)."""

    def handler(route):
        req = route.request
        path = req.url.split("/api/v1", 1)[1].split("?")[0]
        status = 200
        if path == "/foods":
            body = {"data": {"items": FOODS, "total": len(FOODS)}}
        elif path.startswith("/foods/"):
            food = next((f for f in FOODS if f["id"] == path.split("/")[2]), None)
            body, status = ({"data": food}, 200) if food else ({"error": "not found"}, 404)
        elif path == "/me":
            body = {"data": PROFILE}
        elif path.startswith("/days/") and path.endswith("/entries") and req.method == "POST":
            sent = json.loads(req.post_data or "{}")
            posted.append(sent)
            food = next((f for f in FOODS if f["id"] == sent.get("food_id")), None)
            if food:
                day.append(server_entry(sent["id"], food, sent.get("serving_label") or f"{sent['grams']} g", sent["grams"]))
            body, status = {"data": {"id": sent.get("id")}}, 201
        elif path.startswith("/days/"):
            body = {"data": {"meals": [{"slot": "breakfast", "name_vi": "Bữa sáng", "total_kcal": 0, "target_min_kcal": 0, "entries": list(day)}]}}
        else:
            body = {"data": []}
        route.fulfill(status=status, content_type="application/json", body=json.dumps(body))

    ctx.route("**/api/v1/**", handler)


def page(browser, day, posted=None):
    ctx = browser.new_context(viewport={"width": 390, "height": 844})
    fake_session(ctx)
    mock_api(ctx, day, posted if posted is not None else [])
    return ctx, ctx.new_page()


def hero_kcal(pg):
    hero = pg.locator('[data-align-group="home-hero"] span.font-display').first
    hero.wait_for(timeout=15000)
    pg.wait_for_timeout(1500)  # the kcal number eases to its value
    return hero.inner_text().strip()


def magnesium(pg):
    row = pg.locator('[aria-label^="Magnesium, "]').first
    row.wait_for(state="attached", timeout=10000)
    return row.get_attribute("aria-label") or ""


if os.environ.get("LIVE_BUILD") != "1":
    print("hotfix_supp_log: SKIP (needs a live build and LIVE_BUILD=1)")
    sys.exit(0)

with sync_playwright() as p:
    browser = p.chromium.launch()

    # Log 2 viên on today, next to a 200 kcal food
    day, posted = [RICE_ENTRY], []
    ctx, pg = page(browser, day, posted)
    pg.goto(BASE + "/app", wait_until="networkidle")
    check(hero_kcal(pg) == "200", "log: Hôm nay starts at 200 kcal")
    pg.goto(BASE + f"/foods/{CAPSULE_ID}?meal=breakfast", wait_until="networkidle")
    pg.get_by_text("CanPrev Magnesium Bis-Glycinate 80 Ultra Gentle").first.wait_for(timeout=15000)
    pg.wait_for_timeout(600)
    body = pg.inner_text("body")
    check("chưa thể ghi vào nhật ký" not in body, "food page: the no-energy warning is not shown for the capsule")
    check(pg.get_by_role("note").filter(has_text="Nhãn không ghi năng lượng; tính là 0 kcal.").count() == 1, "food page: the label note is shown")
    card_text = pg.locator('[data-align-group="food-detail"]').filter(has_text="Tinh bột").first.inner_text()
    check("—" in card_text and "0 g" not in card_text and "\n0\n" not in f"\n{card_text}\n", f"food page: the macro card reads — and never 0 / 0 g ({card_text!r})")
    check(pg.get_by_label("Khối lượng theo gam").count() == 0 and pg.get_by_role("button", name="Tùy chỉnh").count() == 0, "food page: no gram field for the capsule")
    check(pg.get_by_role("group", name="Số lượng").count() == 1, "food page: the ×N stepper is shown")
    pg.get_by_role("button", name="Tăng số lượng").click()
    pg.wait_for_timeout(200)
    check(pg.locator('output[aria-label="Số lượng hiện tại"]').inner_text().strip() == "×2", "food page: the stepper reads ×2")
    add = pg.get_by_role("button", name="Thêm vào Bữa sáng")
    check(add.count() == 1 and add.is_enabled(), "food page: Thêm vào Bữa sáng is enabled")
    pg.screenshot(path=str(SHOTS / "hotfix-supp-log-capsule-390.png"), full_page=True)
    add.click()
    pg.wait_for_url("**/app**", timeout=10000)
    pg.wait_for_timeout(1500)
    sent = [b for b in posted if b.get("food_id") == CAPSULE_ID]
    check(len(sent) == 1 and sent[0].get("serving_label") == "2 viên" and sent[0].get("grams") == 2, f"log: Thêm sends 2 viên at 2 g ({sent})")
    kcal = hero_kcal(pg)
    check(kcal == "200", f"log: kcal is unchanged at 200 after the capsule ({kcal!r})")
    mg = magnesium(pg)
    check("160 mg" in mg, f"log: Hôm nay reads magnesium 160 mg ({mg!r})")
    pg.screenshot(path=str(SHOTS / "hotfix-supp-log-home-390.png"))
    pg.reload(wait_until="networkidle")
    kcal = hero_kcal(pg)
    mg = magnesium(pg)
    check(kcal == "200" and "160 mg" in mg, f"log: after a reload (capsule kcal NULL from the server) still 200 kcal and 160 mg ({kcal!r}, {mg!r})")
    ctx.close()

    # A label powder with a "100 g" portion keeps grams
    ctx, pg = page(browser, [])
    pg.goto(BASE + f"/foods/{WHEY_ID}?meal=breakfast", wait_until="networkidle")
    pg.get_by_text("Isopure Whey").first.wait_for(timeout=15000)
    pg.wait_for_timeout(600)
    check(pg.get_by_role("button", name="Tùy chỉnh").count() == 1, "whey: the Tùy chỉnh (grams) chip is there")
    check(pg.get_by_role("group", name="Số lượng").count() == 0, "whey: no ×N stepper")
    check("Nhãn không ghi năng lượng" not in pg.inner_text("body"), "whey: no label note (its energy is known)")
    pg.screenshot(path=str(SHOTS / "hotfix-supp-log-whey-390.png"), full_page=True)
    ctx.close()

    # Hôm nay: the capsule alone
    ctx, pg = page(browser, [PILL_ENTRY])
    pg.goto(BASE + "/app", wait_until="networkidle")
    kcal = hero_kcal(pg)
    check(kcal == "0", f"Hôm nay: the capsule alone reads 0, not — ({kcal!r})")
    ctx.close()

    browser.close()

print("hotfix_supp_log: " + ("all checks passed" if not problems else f"{len(problems)} FAILED"))
sys.exit(1 if problems else 0)
