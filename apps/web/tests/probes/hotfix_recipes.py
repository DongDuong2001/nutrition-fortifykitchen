"""hotfix/recipes-server: a dish made with Tính từ nguyên liệu reaches the server, and so do its entries.

Live-mode build only (NEXT_PUBLIC_API_MODE=live, NEXT_PUBLIC_SUPABASE_URL=http://localhost:54399, any anon key), not in
probe:all. The API is a fake in this file (route interception); POST /foods/custom adds a food that GET /foods then lists,
as the real server does for the signed-in user.
  A  /foods/new: build a dish from two ingredients, Lưu món → POST /foods/custom (serving_unit "phần", per-serving
     values that the server turns into the dish's per-100 g ones); log it → the entry's POST names the new uuid, never
     the local id; reload /app: the entry is still there, not "Chỉ trên máy này", and on the server
  B  a dish made before the fix (local id only) with one entry on the device (Chỉ trên máy này) and one queued write that
     the server refused (400): opening the app creates the dish once, both entries are sent with the uuid, the row
     loses "Chỉ trên máy này", and a reload creates nothing again
Run with: LIVE_BUILD=1 ALIGN_BASE_URL=http://localhost:3104 npm run probe -- tests/probes/hotfix_recipes.py
"""
# PROBE_COVERS: app/(app)/(tabs)/app/** app/(app)/add/** app/(app)/foods/[id]/** app/(app)/foods/new/**
import json
import os
import re
import sys
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

from playwright.sync_api import sync_playwright
import _seed  # noqa: F401  (tour done, tips off, Có gì mới off)

if os.environ.get("LIVE_BUILD") != "1":
    print("skipped: set LIVE_BUILD=1 with a live-mode build")
    sys.exit(0)

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3104")
SHOTS = Path(__file__).resolve().parent.parent.parent / ".screenshots"
SHOTS.mkdir(exist_ok=True)
EMAIL = "probe-recipes@example.com"
TODAY = (datetime.now(timezone.utc) + timedelta(hours=7)).strftime("%Y-%m-%d")
PROFILE = {"sex": "male", "birth_year": 2000, "weight_kg": 65, "goal": "maintain", "display_name": "Probe", "training_minutes_default": 60}
UUID = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$")
RICE = "00000000-0000-4000-8000-000000000001"
EGG = "00000000-0000-4000-8000-000000000002"
BASE_FOODS = [
    {"id": RICE, "name_vi": "Cơm trắng", "category": "tinh_bot", "source": "USDA", "servings": [{"label": "100 g", "grams": 100}],
     "nutrients": {"energy": 130, "protein": 2.7, "carbs": 28, "fat": 0.3, "fiber": 0.4, "iron": 0.2, "zinc": 0.5}},
    {"id": EGG, "name_vi": "Trứng gà luộc", "category": "dam", "source": "USDA", "servings": [{"label": "100 g", "grams": 100}],
     "nutrients": {"energy": 155, "protein": 13, "carbs": 1.1, "fat": 11, "fiber": 0, "iron": 1.2, "zinc": 1.1}},
]
problems = []


def check(cond, msg):
    print(("[PASS] " if cond else "[FAIL] ") + msg)
    if not cond:
        problems.append(msg)


class FakeApi:
    def __init__(self):
        self.foods = list(BASE_FOODS)
        self.entries = {}
        self.created = []  # POST /foods/custom bodies
        self.entry_posts = []  # POST /days/…/entries bodies
        self.refuse_local = True

    def handle(self, route):
        req = route.request
        path = req.url.split("/api/v1", 1)[1].split("?")[0]
        ok = lambda body, status=200: route.fulfill(status=status, content_type="application/json", body=json.dumps(body))
        if req.method == "GET" and path == "/me":
            return ok({"data": PROFILE})
        if req.method == "GET" and path == "/foods":
            return ok({"data": {"items": self.foods, "total": len(self.foods)}})
        if req.method == "POST" and path == "/foods/custom":
            body = json.loads(req.post_data or "{}")
            self.created.append(body)
            factor = 100 / body["serving_size"]
            per100 = {k: (round(v * factor, 2) if v is not None else None) for k, v in (body.get("micros") or {}).items()}
            for k, key in (("calories", "energy"), ("protein", "protein"), ("carbs", "carbs"), ("fat", "fat")):
                per100[key] = round(body[k] * factor, 2) if body.get(k) is not None else None
            food = {"id": str(uuid.uuid4()), "name_vi": body["name_vi"], "category": "cua_toi", "source": "custom", "is_custom": True,
                    "servings": [{"label": f"{body['serving_size']:g} {body['serving_unit']}", "grams": body["serving_size"]}, {"label": "100 g", "grams": 100}],
                    "per_100g_nutrients": per100}
            self.foods.append(food)
            return ok({"data": food}, 201)
        if req.method == "GET" and re.fullmatch(r"/days/[\d-]+", path):
            rows = sorted(self.entries.values(), key=lambda e: e["created_at"])
            return ok({"data": {"date": TODAY, "training_minutes": 0, "is_read_only": False, "meals": [{"slot": "all", "entries": rows}]}})
        if req.method == "POST" and re.fullmatch(r"/days/[\d-]+/entries", path):
            body = json.loads(req.post_data or "{}")
            self.entry_posts.append(body)
            food = next((f for f in self.foods if f["id"] == body.get("food_id")), None)
            if not UUID.match(str(body.get("food_id", ""))):
                # What the Go API does with a non-uuid food_id: the body does not decode
                return ok({"error": {"code": "VALIDATION_FAILED", "message": "Invalid request body"}}, 400)
            grams = body.get("grams") or 100
            n = food.get("per_100g_nutrients") or food.get("nutrients") if food else {}
            entry = {"id": body["id"], "food_id": body["food_id"], "food_name": food["name_vi"] if food else "Món ăn", "grams": grams,
                     "serving_label": body.get("serving_label") or f"{grams} g", "meal_slot": body.get("meal_slot"),
                     "calories": round(n["energy"] * grams / 100) if n.get("energy") is not None else None, "nutrients": {},
                     "created_at": datetime.now(timezone.utc).isoformat()}
            self.entries.setdefault(entry["id"], entry)
            return ok({"entry": entry}, 201)
        route.fulfill(status=200, content_type="application/json", body=json.dumps({"data": []}))


def device(browser, api, init=""):
    ctx = browser.new_context(viewport={"width": 390, "height": 844})
    ctx.add_init_script(f"try {{ localStorage.setItem('h1t_auth_current_email', '{EMAIL}'); {init} }} catch (e) {{}}")
    ctx.route("**/api/v1/**", api.handle)
    ctx.route(BASE + "/auth/session", lambda route: route.fulfill(status=204, body=""))
    pg = ctx.new_page()
    errors = []
    pg.on("pageerror", lambda e: errors.append(str(e)))
    return ctx, pg, errors


def open_today(pg):
    pg.goto(BASE + "/app", wait_until="domcontentloaded")
    pg.locator('[data-align-group="home-page"]').first.wait_for(state="visible", timeout=20000)
    pg.wait_for_timeout(1500)


def close_tips(pg):
    """A first-visit tip or tour of a live account covers the screen: Đã hiểu, or Esc, closes it."""
    for _ in range(4):
        pg.wait_for_timeout(400)
        if pg.locator("[data-onboarding-overlay]:visible").count() == 0:
            return
        tip = pg.get_by_role("button", name="Đã hiểu").locator("visible=true")
        if tip.count():
            tip.first.click()
        else:
            pg.keyboard.press("Escape")


def row_label(pg, name):
    rows = pg.locator(f'button[aria-label^="{name},"]:visible')
    return rows.first.get_attribute("aria-label") if rows.count() else None


def wait_for(pg, fn, ms=10000):
    for _ in range(ms // 250):
        if fn():
            return True
        pg.wait_for_timeout(250)
    return fn()


def add_ingredient(pg, search, name):
    close_tips(pg)
    pg.get_by_role("button", name="+ Thêm nguyên liệu").click()
    dlg = pg.get_by_role("dialog", name="Chọn nguyên liệu")
    dlg.wait_for(state="visible", timeout=6000)
    dlg.get_by_label("Tìm món").fill(search)
    pg.wait_for_timeout(400)
    dlg.locator("[data-food-row]").filter(has_text=re.compile(rf"^{re.escape(name)}")).first.click()
    pg.wait_for_timeout(200)
    dlg.get_by_role("button", name="Thêm vào món").click()
    pg.wait_for_timeout(200)


def part_a(browser):
    api = FakeApi()
    ctx, pg, errors = device(browser, api)
    open_today(pg)  # the catalogue loads, as when the user opens the app first
    pg.goto(BASE + "/foods/new?meal=dinner", wait_until="domcontentloaded")
    pg.locator("#rb-name").wait_for(timeout=15000)
    close_tips(pg)
    check("Món được lưu vào tài khoản. Danh sách nguyên liệu chỉ có trên máy này." in pg.inner_text("body"), "A: the note says the dish is saved to the account")
    pg.locator("#rb-name").fill("Cơm trứng probe")
    pg.get_by_role("button", name="Thêm một phần").click()
    add_ingredient(pg, "cơm", "Cơm trắng")
    add_ingredient(pg, "trứng", "Trứng gà luộc")
    pg.get_by_label("Khối lượng Cơm trắng").fill("300")
    pg.get_by_label("Khối lượng Trứng gà luộc").fill("100")
    pg.get_by_role("button", name="Lưu món").click()
    pg.wait_for_url(re.compile(r".*/foods/recipe-\d+.*"), timeout=10000)
    close_tips(pg)
    recipe_id = pg.url.split("/foods/")[1].split("?")[0]
    check(wait_for(pg, lambda: len(api.created) == 1), f"A: Lưu món creates the dish on the server once ({len(api.created)})")
    if api.created:
        body = api.created[0]
        check(body.get("serving_unit") == "phần" and body.get("serving_size") == 200, f"A: one phần of 200 g ({body.get('serving_unit')}, {body.get('serving_size')})")
        # Per 100 g of the dish: (300 g rice + 100 g egg) / 400 g
        stored_kcal = round(body["calories"] * 100 / body["serving_size"], 2)
        check(abs(stored_kcal - (130 * 3 + 155) / 4) < 0.01, f"A: the server stores the dish's kcal per 100 g ({stored_kcal})")
        check(len(body.get("micros") or {}) == 23 and "fiber" in body["micros"] and "zinc" in body["micros"], f"A: fiber and the 22 micros are sent ({len(body.get('micros') or {})})")
        check(abs(round(body["micros"]["zinc"] * 100 / body["serving_size"], 2) - (0.5 * 3 + 1.1) / 4) < 0.01, "A: zinc per 100 g is the dish's")
    server_id = next((f["id"] for f in api.foods if f.get("name_vi") == "Cơm trứng probe"), None)
    stored = pg.evaluate("(k) => JSON.parse(localStorage.getItem(k) || '[]')", f"h1t_recipes_v1_{EMAIL}")
    check(bool(stored) and stored[0].get("serverFoodId") == server_id, "A: the recipe keeps the server food's id")

    pg.get_by_role("button", name=re.compile("^Thêm vào Bữa tối")).locator("visible=true").first.click()
    pg.wait_for_timeout(1500)
    check(wait_for(pg, lambda: len(api.entry_posts) >= 1), f"A: logging it sends the entry ({len(api.entry_posts)})")
    ids = [b.get("food_id") for b in api.entry_posts]
    check(ids == [server_id] and all(UUID.match(i or "") for i in ids), f"A: the POST names the uuid, not {recipe_id} ({ids})")
    check(any(e["food_id"] == server_id for e in api.entries.values()), "A: the entry is on the server")

    open_today(pg)
    pg.reload(wait_until="domcontentloaded")
    pg.locator('[data-align-group="home-page"]').first.wait_for(state="visible", timeout=20000)
    pg.wait_for_timeout(2000)
    label = row_label(pg, "Cơm trứng probe")
    check(label is not None, f"A: after a reload the entry is still on Hôm nay ({label})")
    check(label is not None and "chỉ trên máy này" not in label and "chưa lưu" not in label, f"A: …saved, not Chỉ trên máy này ({label})")
    check(len(api.created) == 1, f"A: a reload does not create the dish again ({len(api.created)})")
    pg.goto(BASE + "/add?meal=dinner", wait_until="domcontentloaded")
    pg.wait_for_timeout(1500)
    close_tips(pg)
    rows = pg.locator("[data-food-row]:visible", has_text="Cơm trứng probe").count()
    check(rows == 1, f"A: the dish is listed once in Thêm món ({rows})")
    pg.screenshot(path=str(SHOTS / "hotfix-recipes-a-390.png"), full_page=True)
    check(not errors, f"A: no page errors ({errors[:2]})")
    ctx.close()


def part_b(browser):
    api = FakeApi()
    rid = "recipe-1760000000000"
    local_entry = str(uuid.uuid4())
    queued_entry = str(uuid.uuid4())
    recipe = {"id": rid, "name": "Món cũ probe", "servings": 1, "cookedGrams": None, "createdAt": "2026-10-18T00:00:00.000Z",
              "ingredients": [{"foodId": RICE, "name": "Cơm trắng", "grams": 200, "unit": "g"}, {"foodId": EGG, "name": "Trứng gà luộc", "grams": 50, "unit": "g"}]}
    entry = {"id": local_entry, "foodId": rid, "foodName": "Món cũ probe", "grams": 250, "displayQty": "1 phần · 250 g", "mealSlot": "lunch",
             "calories": 338, "protein": 11.9, "carbs": 56.6, "fat": 6.1, "fiber": 0.8, "nutrients": {}, "addedAt": f"{TODAY}T05:00:00.000Z"}
    queued = {"id": queued_entry, "date": TODAY, "method": "POST", "path": f"/days/{TODAY}/entries", "key": f"{queued_entry}:1:k", "createdAt": 1, "retries": 1,
              "payload": {"id": queued_entry, "kind": "food", "meal_slot": "dinner", "food_id": rid, "grams": 250, "serving_size_g": 250},
              "held": {"status": 400, "message": "Invalid request body"}}
    seed = (
        f"if (!localStorage.getItem('probe_seeded')) {{ localStorage.setItem('probe_seeded', '1');"
        f" localStorage.setItem('h1t_recipes_v1_{EMAIL}', {json.dumps(json.dumps([recipe]))});"
        f" localStorage.setItem('h1t_added_entries_v1_{EMAIL}', {json.dumps(json.dumps([entry]))});"
        f" localStorage.setItem('h1t_offline_outbox_{EMAIL}', {json.dumps(json.dumps([queued]))}); }}"
    )
    ctx, pg, errors = device(browser, api, seed)
    open_today(pg)
    check(wait_for(pg, lambda: len(api.created) == 1, 15000), f"B: opening the app creates the old dish on the server once ({len(api.created)})")
    server_id = next((f["id"] for f in api.foods if f.get("name_vi") == "Món cũ probe"), None)
    check(wait_for(pg, lambda: {local_entry, queued_entry} <= set(api.entries), 15000), f"B: the device-only entry and the refused write reach the server ({len(api.entries)})")
    check(all(api.entries[i]["food_id"] == server_id for i in (local_entry, queued_entry) if i in api.entries), "B: both name the server food")
    check(all(b.get("food_id") != rid for b in api.entry_posts), f"B: the local id is never sent ({[b.get('food_id') for b in api.entry_posts]})")
    check(wait_for(pg, lambda: (row_label(pg, "Món cũ probe") or "chỉ").find("chỉ trên máy này") < 0), f"B: the row no longer says Chỉ trên máy này ({row_label(pg, 'Món cũ probe')})")
    outbox = pg.evaluate("(k) => JSON.parse(localStorage.getItem(k) || '[]')", f"h1t_offline_outbox_{EMAIL}")
    check(outbox == [], f"B: the outbox is empty ({len(outbox)})")
    pg.reload(wait_until="domcontentloaded")
    pg.wait_for_timeout(2500)
    check(len(api.created) == 1, f"B: a reload creates nothing again ({len(api.created)})")
    pg.screenshot(path=str(SHOTS / "hotfix-recipes-b-390.png"), full_page=True)
    check(not errors, f"B: no page errors ({errors[:2]})")
    ctx.close()


with sync_playwright() as p:
    browser = p.chromium.launch()
    part_a(browser)
    part_b(browser)
    browser.close()

print(f"\n{len(problems)} problem(s)")
sys.exit(1 if problems else 0)
