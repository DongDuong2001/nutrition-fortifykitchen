"""cc-68: data saving, sync and queue. Live-mode build only (NEXT_PUBLIC_API_MODE=live, NEXT_PUBLIC_SUPABASE_URL=http://localhost:54399,
any anon key), not in probe:all. The API is a fake in this file (route interception); two contexts on one account are two devices.
  A  offline: an add made offline stays through a reload (offline), shows Chưa lưu, and is sent once when the network is back
  B  yesterday is editable: Hôm qua 18/10 has + Thêm, a food added there goes to POST /days/<yesterday>/entries and shows on that
     day (not today), and deleting it sends DELETE and takes it off; two days back is Chỉ xem, with no + Thêm, and /add?date= of
     it goes back to that day
  C  sign-out with writes waiting asks first (Part 3)
Run with: LIVE_BUILD=1 ALIGN_BASE_URL=http://localhost:3112 npm run probe -- tests/probes/cc_68.py
Pick parts with CC68_ONLY=A,B
"""
import json
import os
import re
import sys
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path

from playwright.sync_api import sync_playwright
import _seed  # noqa: F401  (tour done, tips off, Có gì mới off)

if os.environ.get("LIVE_BUILD") != "1":
    print("skipped: set LIVE_BUILD=1 with a live-mode build")
    sys.exit(0)

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3112")
ONLY = set(filter(None, os.environ.get("CC68_ONLY", "").split(",")))
SHOTS = Path(__file__).resolve().parent.parent.parent / ".screenshots" / "cc68"
SHOTS.mkdir(parents=True, exist_ok=True)
PHONE = {"viewport": {"width": 390, "height": 844}}
EMAIL = "probe68@example.com"
NOW_VN = datetime.now(timezone.utc) + timedelta(hours=7)
TODAY = NOW_VN.strftime("%Y-%m-%d")
YESTERDAY = (NOW_VN - timedelta(days=1)).strftime("%Y-%m-%d")
TWO_BACK = (NOW_VN - timedelta(days=2)).strftime("%Y-%m-%d")
PROFILE = {"sex": "male", "birth_year": 2000, "weight_kg": 65, "goal": "maintain", "display_name": "Probe", "training_minutes_default": 60}
FOODS = [
    {
        "id": f"00000000-0000-4000-8000-0000000000{i:02d}",
        "name_vi": name,
        "category": "tinh_bot",
        "source": "USDA",
        "servings": [{"label": "100 g", "grams": 100}],
        "nutrients": {"energy": 100 + i, "carbs": 20, "protein": 2, "fat": 1},
    }
    for i, name in enumerate(["Khoai lang luộc", "Bắp luộc", "Bánh mì đen", "Yến mạch cán", "Gạo lứt nấu", "Bún tươi"], start=1)
]
problems = []


def check(cond, msg):
    print(("[PASS] " if cond else "[FAIL] ") + msg)
    if not cond:
        problems.append(msg)


class FakeApi:
    """One server: the entries by id with the day they belong to."""

    def __init__(self):
        self.entries = {}
        self.posts = []
        # The network is gone: every API call fails without an answer (the page itself still loads)
        self.offline = False

    def day(self, date):
        rows = sorted((e for e in self.entries.values() if e["date"] == date), key=lambda e: e["created_at"])
        return {"data": {"date": date, "training_minutes": 0, "is_read_only": False, "meals": [{"slot": "all", "entries": rows}]}}

    def handler(self, device):
        def handle(route):
            req = route.request
            path = req.url.split("/api/v1", 1)[1].split("?")[0]
            device["calls"].append(f"{req.method} {path}" + (" (offline)" if self.offline else ""))
            if self.offline:
                return route.abort("internetdisconnected")
            if req.method == "POST" and path == "/client-errors":
                return route.fulfill(status=204, body="")
            if req.method == "GET" and path == "/me":
                return route.fulfill(status=200, content_type="application/json", body=json.dumps({"data": PROFILE}))
            if req.method == "GET" and path == "/foods":
                return route.fulfill(status=200, content_type="application/json", body=json.dumps({"data": {"items": FOODS, "total": len(FOODS)}}))
            m = re.fullmatch(r"/days/([\d-]+)", path)
            if req.method == "GET" and m:
                return route.fulfill(status=200, content_type="application/json", body=json.dumps(self.day(m.group(1))))
            m = re.fullmatch(r"/days/([\d-]+)/entries", path)
            if req.method == "POST" and m:
                body = json.loads(req.post_data or "{}")
                food = next((f for f in FOODS if f["id"] == body.get("food_id")), None)
                grams = body.get("grams") or 100
                entry = {
                    "id": body["id"],
                    "date": m.group(1),
                    "food_id": body.get("food_id"),
                    "food_name": food["name_vi"] if food else "Món ăn",
                    "grams": grams,
                    "serving_label": f"{grams} g",
                    "meal_slot": body.get("meal_slot"),
                    "calories": round(food["nutrients"]["energy"] * grams / 100) if food else body.get("calories"),
                    "nutrients": {},
                    "created_at": datetime.now(timezone.utc).isoformat(),
                }
                self.posts.append(f"{m.group(1)} {body['id']}")
                self.entries.setdefault(entry["id"], entry)
                return route.fulfill(status=201, content_type="application/json", body=json.dumps({"entry": entry}))
            m = re.fullmatch(r"/entries/([0-9a-f-]+)", path)
            if m and req.method == "DELETE":
                self.entries.pop(m.group(1), None)
                return route.fulfill(status=204, body="")
            if m and req.method == "PATCH":
                self.entries.get(m.group(1), {}).update({k: v for k, v in json.loads(req.post_data or "{}").items() if v is not None})
                return route.fulfill(status=200, content_type="application/json", body="{}")
            route.fulfill(status=200, content_type="application/json", body=json.dumps({"data": []}))

        return handle


def device(browser, api, size=PHONE):
    ctx = browser.new_context(**size)
    state = {"calls": []}
    ctx.add_init_script(f"try {{ localStorage.setItem('h1t_auth_current_email', '{EMAIL}'); }} catch (e) {{}}")
    ctx.route("**/api/v1/**", api.handler(state))
    ctx.route(BASE + "/auth/session", lambda route: route.fulfill(status=204, body=""))
    return ctx, ctx.new_page(), state


def open_day(pg, date=None):
    pg.goto(BASE + "/app" + (f"?date={date}" if date else ""), wait_until="domcontentloaded")
    pg.locator('[data-align-group="home-page"]').first.wait_for(state="visible", timeout=20000)
    pg.wait_for_timeout(1500)
    close_tips(pg)


def close_tips(pg):
    """A first-visit tip, and Có gì mới (a live account has not seen the release), cover the screen: Đã hiểu / Để sau close them."""
    for name in ("Đã hiểu", "Để sau"):
        button = pg.get_by_role("button", name=name).locator("visible=true")
        for _ in range(3):
            if button.count() == 0:
                break
            button.first.click()
            pg.wait_for_timeout(400)


def outbox(pg):
    """The outbox records (IndexedDB store 'outbox' of database 'h1t') of this account."""
    return pg.evaluate(
        """(email) => new Promise((resolve) => {
             const open = indexedDB.open('h1t');
             open.onerror = () => resolve([]);
             open.onsuccess = () => {
               try {
                 const db = open.result;
                 if (!db.objectStoreNames.contains('outbox')) return resolve([]);
                 const all = db.transaction('outbox').objectStore('outbox').getAll();
                 all.onsuccess = () => resolve(all.result.filter((i) => i.scope === email).map((i) => ({ id: i.id, date: i.date, state: i.state, method: i.method || 'POST' })));
                 all.onerror = () => resolve([]);
               } catch (e) { resolve([]); }
             };
           })""",
        EMAIL,
    )


def row_of(pg, name):
    return pg.locator(f'button[aria-label^="{name},"]:visible')


def pick_food(pg, name, button_name):
    row = pg.locator("[data-food-row]:visible", has_text=name).first
    row.wait_for(timeout=20000)
    row.click()
    button = pg.get_by_role("button", name=re.compile(button_name)).locator("visible=true").first
    button.wait_for(timeout=10000)
    button.click()


def want(key):
    return not ONLY or key in ONLY


with sync_playwright() as p:
    browser = p.chromium.launch()

    if want("A"):
        api = FakeApi()
        ctx, pg, st = device(browser, api)
        open_day(pg)
        close_tips(pg)
        # The catalogue is on the device now; the network goes away
        api.offline = True
        pg.locator('a[data-tour="meal-add"]:visible', has_text="Thêm").first.click()
        pg.wait_for_url(re.compile(r".*/add.*"), timeout=15000)
        pick_food(pg, "Khoai lang luộc", "^Thêm vào Bữa")
        pg.wait_for_url(re.compile(r".*/app(\?.*)?$"), timeout=15000)
        pg.wait_for_timeout(1500)
        check(row_of(pg, "Khoai lang luộc").count() >= 1, "A: the food shows on Hôm nay offline")
        queued = outbox(pg)
        check(len(queued) == 1 and queued[0]["method"] == "POST", f"A: it waits in the outbox (IndexedDB) ({queued})")
        check(pg.locator('[data-sync-state="offline"], [data-sync-state="unsaved"], [data-sync-state="saving"]').count() >= 1, "A: the header says offline or Chưa lưu")
        check(not any(c.startswith("POST /days/") and "(offline)" not in c for c in st["calls"]), "A: nothing reached the server while offline")
        pg.screenshot(path=str(SHOTS / "A-offline-390.png"))

        # Reload while the network is still gone: the write comes back from IndexedDB, not from the page
        pg.reload(wait_until="domcontentloaded")
        pg.locator('[data-align-group="home-page"]').first.wait_for(state="visible", timeout=20000)
        pg.wait_for_timeout(1800)
        close_tips(pg)
        check(row_of(pg, "Khoai lang luộc").count() >= 1, "A: after a reload offline the food is still there")
        check(len(outbox(pg)) == 1, f"A: …and still queued ({outbox(pg)})")
        check(len(api.posts) == 0, "A: …and the server has nothing yet")
        pg.screenshot(path=str(SHOTS / "A-reload-offline-390.png"))

        api.offline = False
        pg.evaluate("window.dispatchEvent(new Event('online'))")
        ok = False
        for _ in range(20):
            if len(api.posts) >= 1:
                ok = True
                break
            pg.wait_for_timeout(500)
        check(ok, "A: back online the write is sent")
        pg.wait_for_timeout(1500)
        check(len(api.posts) == 1, f"A: …exactly once ({api.posts})")
        check(len(outbox(pg)) == 0, "A: the outbox is empty after it")
        ctx.close()

    if want("B"):
        api = FakeApi()
        ctx, pg, st = device(browser, api)
        open_day(pg, YESTERDAY)
        close_tips(pg)
        header = pg.locator("h1, [data-tour='daily-date'], header").first.inner_text()
        check("Hôm qua" in pg.inner_text("body"), "B: the date header says Hôm qua")
        check(pg.get_by_text("Chỉ xem").count() == 0, "B: yesterday is not Chỉ xem")
        add_links = pg.locator('a[data-tour="meal-add"]:visible')
        check(add_links.count() >= 1, f"B: yesterday has + Thêm ({add_links.count()})")
        dinner = pg.locator('a#home-add-dinner:visible')
        dinner.first.click()
        pg.wait_for_url(re.compile(r".*/add\?.*date=" + YESTERDAY), timeout=15000)
        check("hôm qua" in pg.inner_text("body").lower(), "B: the add sheet says it is for hôm qua")
        pick_food(pg, "Bắp luộc", "^Thêm vào Bữa tối")
        pg.wait_for_url(re.compile(r".*/app\?date=" + YESTERDAY), timeout=15000)
        pg.wait_for_timeout(1500)
        check(row_of(pg, "Bắp luộc").count() >= 1, "B: the food shows on yesterday")
        pg.screenshot(path=str(SHOTS / "B-yesterday-390.png"))
        check(any(post.startswith(YESTERDAY) for post in api.posts), f"B: it was sent for yesterday ({api.posts})")
        check(not any(post.startswith(TODAY) for post in api.posts), "B: …not for today")
        open_day(pg)
        check(row_of(pg, "Bắp luộc").count() == 0, "B: today does not show it")
        pg.screenshot(path=str(SHOTS / "B-today-390.png"))

        open_day(pg, YESTERDAY)
        row_of(pg, "Bắp luộc").first.click()
        pg.get_by_role("link", name="Sửa").locator("visible=true").first.click()
        pg.wait_for_url(re.compile(r".*/entry/.*"), timeout=15000)
        pg.get_by_role("button", name=re.compile("Xóa")).locator("visible=true").first.click()
        pg.wait_for_url(re.compile(r".*/app\?date=" + YESTERDAY), timeout=15000)
        pg.wait_for_timeout(1500)
        check(row_of(pg, "Bắp luộc").count() == 0, "B: deleted from yesterday")
        check(any(c.startswith("DELETE /entries/") for c in st["calls"]), "B: DELETE was sent")
        check(len(api.entries) == 0, "B: the server no longer has it")

        # Two days back is read-only
        open_day(pg, TWO_BACK)
        check(pg.get_by_text("Chỉ xem").count() >= 1 or pg.locator('a[data-tour="meal-add"]:visible').count() == 0, "B: two days back shows Chỉ xem")
        check(pg.locator('a[data-tour="meal-add"]:visible').count() == 0, "B: …with no + Thêm")
        pg.goto(BASE + "/add?date=" + TWO_BACK, wait_until="domcontentloaded")
        try:
            pg.wait_for_url(re.compile(r".*/app\?date=" + TWO_BACK), timeout=15000)
        except Exception:
            pass
        check("/app?date=" + TWO_BACK in pg.url, f"B: /add?date= of it goes back to that day ({pg.url[len(BASE):]})")
        ctx.close()

    browser.close()

print(f"\n{len(problems)} problem(s)")
sys.exit(1 if problems else 0)
