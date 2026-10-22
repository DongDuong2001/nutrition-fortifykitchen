"""cc-68: data saving, sync and queue. Live-mode build only (NEXT_PUBLIC_API_MODE=live, NEXT_PUBLIC_SUPABASE_URL=https://probe68.supabase.co (the CSP allows *.supabase.co only; every call to it is answered here),
any anon key), not in probe:all. The API is a fake in this file (route interception); two contexts on one account are two devices.
  A  offline: an add made offline stays through a reload (offline), shows Chưa lưu, and is sent once when the network is back
  B  yesterday is editable: Hôm qua 18/10 has + Thêm, a food added there goes to POST /days/<yesterday>/entries and shows on that
     day (not today), and deleting it sends DELETE and takes it off; two days back is Chỉ xem, with no + Thêm, and /add?date= of
     it goes back to that day
  E  one sync status on every tab: offline add, then Tổng quan's header shows Chưa lưu (1) (lasting, not a toast); a tap opens the list
     (the food, where it stands) with Thử lại, which sends it once; two 401s after the session renewal raise the lasting banner
     "Phiên đăng nhập hết hạn · Đăng nhập lại"
  D  history is the server's: a day three days back that this device never saw is read from GET /days/{date}, shows on Hôm nay
     (Chỉ xem), is cached (one IndexedDB record), shows again from the cache with the network gone, and a second device sees it too
  C  sign-out with writes waiting asks first (X8): "Còn 1 món chưa đồng bộ. Đăng xuất bây giờ sẽ xóa chúng khỏi máy này." with
     "Đồng bộ rồi đăng xuất" (the default) and "Vẫn đăng xuất"; offline the first keeps the dialog and says "Còn 1 món chưa đồng bộ
     được: <why>." (the count stays), online it sends
     the write and signs out; sign-out with nothing waiting goes straight to /signin; either way what the device kept is gone
Run with: LIVE_BUILD=1 ALIGN_BASE_URL=http://localhost:3112 npm run probe -- tests/probes/cc_68.py
Pick parts with CC68_ONLY=A,B
"""
# PROBE_COVERS: app/(app)/(tabs)/app/** app/(app)/add/** app/(app)/settings/account/** app/signin/**
import base64
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
SUPABASE = os.environ.get("PROBE_SUPABASE_ORIGIN", "https://probe68.supabase.co")
EMAIL = "probe68@example.com"
NOW_VN = datetime.now(timezone.utc) + timedelta(hours=7)
TODAY = NOW_VN.strftime("%Y-%m-%d")
YESTERDAY = (NOW_VN - timedelta(days=1)).strftime("%Y-%m-%d")
TWO_BACK = (NOW_VN - timedelta(days=2)).strftime("%Y-%m-%d")
THREE_BACK = (NOW_VN - timedelta(days=3)).strftime("%Y-%m-%d")
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
        # Every call answers 401 (the session ran out)
        self.unauthorized = False

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
            if self.unauthorized and path != "/client-errors":
                return route.fulfill(status=401, content_type="application/json", body='{"error":"unauthorized"}')
            if req.method == "POST" and path == "/client-errors":
                return route.fulfill(status=204, body="")
            if req.method == "GET" and path == "/me":
                return route.fulfill(status=200, content_type="application/json", body=json.dumps({"data": PROFILE}))
            if req.method == "GET" and path == "/foods":
                return route.fulfill(status=200, content_type="application/json", body=json.dumps({"data": {"items": FOODS, "total": len(FOODS)}}))
            if req.method == "GET" and path == "/days":
                # There is no range endpoint yet (apps/api has GET /days/{date} only)
                return route.fulfill(status=404, content_type="application/json", body='{"error":{"code":"NOT_FOUND"}}')
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


def b64url(data):
    return base64.urlsafe_b64encode(data).decode().rstrip("=")


def supabase_session(email):
    """A signed-in Supabase session as the browser client keeps it (cookie sb-probe68-auth-token), and the fake /auth/v1/user for it."""
    now = int(time.time())
    user = {"id": "00000000-0000-4000-8000-000000000068", "aud": "authenticated", "role": "authenticated", "email": email, "app_metadata": {"provider": "email", "providers": ["email"]}, "user_metadata": {"has_password": True}, "identities": [{"provider": "email"}], "created_at": "2026-10-01T00:00:00Z"}
    jwt = ".".join([b64url(b'{"alg":"HS256","typ":"JWT"}'), b64url(json.dumps({"sub": user["id"], "email": email, "aud": "authenticated", "role": "authenticated", "exp": now + 3600}).encode()), "sig"])
    session = {"access_token": jwt, "token_type": "bearer", "expires_in": 3600, "expires_at": now + 3600, "refresh_token": "refresh68", "user": user}
    return user, "base64-" + base64.b64encode(json.dumps(session).encode()).decode()


def signed_in_device(browser, api):
    """A device on the fake API whose Supabase session is real enough for Cài đặt › Tài khoản to show the account and Đăng xuất."""
    ctx, pg, st = device(browser, api)
    user, cookie = supabase_session(EMAIL)
    ctx.add_cookies([{"name": "sb-probe68-auth-token", "value": cookie, "url": BASE}])
    # The last route registered wins: the catch-all first, then the two the account screen uses
    ctx.route(SUPABASE + "/**", lambda route: route.fulfill(status=200, content_type="application/json", body="{}"))
    ctx.route(SUPABASE + "/auth/v1/user", lambda route: route.fulfill(status=200, content_type="application/json", body=json.dumps(user)))
    ctx.route(SUPABASE + "/auth/v1/logout*", lambda route: route.fulfill(status=204, body=""))
    return ctx, pg, st


def local_keys(pg):
    return pg.evaluate("(email) => Object.keys(localStorage).filter((k) => k.endsWith('_' + email))", EMAIL)


def open_account(pg):
    pg.goto(BASE + "/settings/account", wait_until="domcontentloaded")
    pg.get_by_text("Đăng xuất", exact=True).locator("visible=true").first.wait_for(timeout=20000)
    pg.wait_for_timeout(500)


def day_records(pg):
    """The history cache: one record per day in IndexedDB (store 'days' of database 'h1t') for this account."""
    return pg.evaluate(
        """(email) => new Promise((resolve) => {
             const open = indexedDB.open('h1t');
             open.onerror = () => resolve([]);
             open.onsuccess = () => {
               try {
                 const db = open.result;
                 if (!db.objectStoreNames.contains('days')) return resolve([]);
                 const all = db.transaction('days').objectStore('days').getAll();
                 all.onsuccess = () => resolve(all.result.filter((r) => r.scope === email).map((r) => ({ date: r.date, n: r.entries.length, final: r.final })));
                 all.onerror = () => resolve([]);
               } catch (e) { resolve([]); }
             };
           })""",
        EMAIL,
    )


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
        pg.locator('a[data-tour="meal-add"]:visible').first.click()
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

    if want("E"):
        api = FakeApi()
        ctx, pg, st = device(browser, api)
        open_day(pg)
        api.offline = True
        pg.locator('a[data-tour="meal-add"]:visible').first.click()
        pg.wait_for_url(re.compile(r".*/add.*"), timeout=15000)
        pick_food(pg, "Khoai lang luộc", "^Thêm vào Bữa")
        pg.wait_for_url(re.compile(r".*/app(\?.*)?$"), timeout=15000)
        pg.wait_for_timeout(1200)
        # Another tab of the app: Tổng quan (the Chưa lưu tip of a live account covers the screen first)
        close_tips(pg)
        pg.get_by_role("link", name="Tổng quan").locator("visible=true").first.click()
        pg.wait_for_url(re.compile(r".*/trends.*"), timeout=15000)
        pg.wait_for_timeout(1500)
        status = pg.locator('[data-sync-state="unsaved"]:visible').first
        check(status.count() == 1 and "Chưa lưu (1)" in status.inner_text(), f"E: Tổng quan's header says Chưa lưu (1) ({status.count()})")
        pg.wait_for_timeout(8000)
        check(pg.locator('[data-sync-state="unsaved"]:visible').count() == 1, "E: it is still there after the toast time (lasting)")
        pg.screenshot(path=str(SHOTS / "E-status-trends-390.png"))
        close_tips(pg)
        pg.locator('[data-sync-state="unsaved"]:visible button').first.click()
        dialog = pg.get_by_role("dialog", name="Chưa lưu")
        dialog.wait_for(timeout=10000)
        text = dialog.inner_text()
        check("Khoai lang luộc" in text and any(w in text for w in ("Đang chờ mạng", "Đang chờ gửi", "Đang gửi")), f"E: the list names the food and where it stands ({text[:80]!r})")
        pg.screenshot(path=str(SHOTS / "E-list-390.png"))
        api.offline = False
        dialog.get_by_role("button", name="Thử lại").click()
        ok = False
        for _ in range(20):
            if len(api.posts) >= 1:
                ok = True
                break
            pg.wait_for_timeout(500)
        check(ok, "E: Thử lại sends it")
        pg.wait_for_timeout(1500)
        check(len(api.posts) == 1, f"E: …once ({api.posts}) {[c for c in st['calls'] if c.startswith('POST /days')]}")
        check(len(outbox(pg)) == 0, "E: the outbox is empty")
        check("Đã lưu hết" in pg.get_by_role("dialog", name="Chưa lưu").inner_text() or pg.get_by_role("dialog", name="Chưa lưu").count() == 0, "E: the list says everything is saved")
        ctx.close()

        # The session ran out: two writes get 401 after the renewal
        api = FakeApi()
        ctx, pg, st = device(browser, api)
        open_day(pg)
        api.unauthorized = True
        for food in ("Bắp luộc", "Bún tươi"):
            close_tips(pg)
            pg.locator('a[data-tour="meal-add"]:visible').first.click()
            pg.wait_for_url(re.compile(r".*/add.*"), timeout=15000)
            pick_food(pg, food, "^Thêm vào Bữa")
            pg.wait_for_url(re.compile(r".*/app(\?.*)?$"), timeout=15000)
            pg.wait_for_timeout(1500)
        banner = pg.locator('[data-sync-alert="session"]')
        try:
            banner.first.wait_for(timeout=8000)
        except Exception:
            pass
        check(banner.count() == 1 and "Phiên đăng nhập hết hạn" in banner.inner_text() and "Đăng nhập lại" in banner.inner_text(), "E: the lasting banner: Phiên đăng nhập hết hạn · Đăng nhập lại")
        link = banner.get_by_role("link", name="Đăng nhập lại")
        check(link.count() == 1 and (link.get_attribute("href") or "").startswith("/signin"), "E: it links to /signin")
        pg.screenshot(path=str(SHOTS / "E-session-390.png"))
        ctx.close()

    if want("D"):
        api = FakeApi()
        api.entries["d1"] = {"id": "d1", "date": THREE_BACK, "food_id": FOODS[5]["id"], "food_name": "Bún tươi", "grams": 200, "serving_label": "200 g", "meal_slot": "lunch", "calories": 210, "nutrients": {}, "created_at": "2026-10-16T05:00:00Z"}
        ctx, pg, st = device(browser, api)
        open_day(pg, THREE_BACK)
        try:
            row_of(pg, "Bún tươi").first.wait_for(timeout=15000)
        except Exception:
            pass
        check(row_of(pg, "Bún tươi").count() >= 1, "D: a day this device never saw comes from the server")
        check(any(c == f"GET /days/{THREE_BACK}" for c in st["calls"]), "D: it asked GET /days/{date}")
        check(pg.get_by_text("Chỉ xem").count() >= 1 or pg.locator('a[data-tour="meal-add"]:visible').count() == 0, "D: it is Chỉ xem (two or more days back)")
        pg.wait_for_timeout(800)
        records = day_records(pg)
        check(any(r["date"] == THREE_BACK and r["n"] == 1 and r["final"] for r in records), f"D: one cached record, final ({records})")
        pg.screenshot(path=str(SHOTS / "D-history-390.png"))
        # The network is gone: the cache shows it
        api.offline = True
        pg.reload(wait_until="domcontentloaded")
        pg.locator('[data-align-group="home-page"]').first.wait_for(state="visible", timeout=20000)
        pg.wait_for_timeout(1800)
        close_tips(pg)
        check(row_of(pg, "Bún tươi").count() >= 1, "D: offline, after a reload, the day shows from the cache")
        ctx.close()
        # Another device, nothing on it: the same day
        ctx2, pg2, st2 = device(browser, api)
        api.offline = False
        open_day(pg2, THREE_BACK)
        try:
            row_of(pg2, "Bún tươi").first.wait_for(timeout=15000)
        except Exception:
            pass
        check(row_of(pg2, "Bún tươi").count() >= 1, "D: a second device shows the same day (one diary on every device)")
        ctx2.close()

    if want("C"):
        # Writes waiting: the person is asked first
        api = FakeApi()
        ctx, pg, st = signed_in_device(browser, api)
        open_day(pg)
        api.offline = True
        pg.locator('a[data-tour="meal-add"]:visible').first.click()
        pg.wait_for_url(re.compile(r".*/add.*"), timeout=15000)
        pick_food(pg, "Gạo lứt nấu", "^Thêm vào Bữa")
        pg.wait_for_url(re.compile(r".*/app(\?.*)?$"), timeout=15000)
        pg.wait_for_timeout(1200)
        check(len(outbox(pg)) == 1, "C: one write waits in the outbox")
        open_account(pg)
        pg.get_by_text("Đăng xuất", exact=True).locator("visible=true").first.click()
        dialog = pg.get_by_role("dialog", name="Đăng xuất?")
        dialog.wait_for(timeout=10000)
        text = dialog.inner_text()
        check("Còn 1 món chưa đồng bộ. Đăng xuất bây giờ sẽ xóa chúng khỏi máy này." in text, f"C: the confirm says how many ({text[:90]!r})")
        sync_button = dialog.get_by_role("button", name="Đồng bộ rồi đăng xuất")
        leave_button = dialog.get_by_role("button", name="Vẫn đăng xuất")
        check(sync_button.count() == 1 and leave_button.count() == 1, "C: Đồng bộ rồi đăng xuất and Vẫn đăng xuất")
        focused = pg.evaluate("() => document.activeElement && document.activeElement.textContent.trim()")
        check(focused == "Đồng bộ rồi đăng xuất", f"C: Đồng bộ rồi đăng xuất is the default ({focused!r})")
        check(pg.evaluate("() => location.pathname") == "/settings/account", "C: still signed in, on the account screen")
        pg.screenshot(path=str(SHOTS / "C-confirm-390.png"))
        # Offline the sync cannot send it: the dialog stays and says so
        sync_button.click()
        pg.wait_for_timeout(2500)
        check(dialog.count() == 1 and "Còn 1 món chưa đồng bộ được:" in dialog.inner_text(), f"C: offline the sync keeps the dialog and the count ({dialog.inner_text()[:160]!r})")
        check(len(outbox(pg)) == 1, "C: the write is still in the outbox")
        # Back online: it is sent, then the person is signed out and the device is clean
        api.offline = False
        sync_button.click()
        try:
            pg.wait_for_url(re.compile(r".*/signin.*"), timeout=20000)
        except Exception:
            pass
        check("/signin" in pg.url, f"C: online it signs out to /signin ({pg.url[len(BASE):]})")
        check(len(api.posts) == 1, f"C: the write reached the server first ({api.posts})")
        check(local_keys(pg) == [] or all("settings" in k for k in local_keys(pg)), f"C: the device kept nothing of the account ({local_keys(pg)})")
        check(len(outbox(pg)) == 0, "C: the outbox is empty")
        ctx.close()

        # Vẫn đăng xuất: signs out and drops what waits
        api = FakeApi()
        ctx, pg, st = signed_in_device(browser, api)
        open_day(pg)
        api.offline = True
        pg.locator('a[data-tour="meal-add"]:visible').first.click()
        pg.wait_for_url(re.compile(r".*/add.*"), timeout=15000)
        pick_food(pg, "Bún tươi", "^Thêm vào Bữa")
        pg.wait_for_url(re.compile(r".*/app(\?.*)?$"), timeout=15000)
        pg.wait_for_timeout(1000)
        open_account(pg)
        pg.get_by_text("Đăng xuất", exact=True).locator("visible=true").first.click()
        dialog = pg.get_by_role("dialog", name="Đăng xuất?")
        dialog.wait_for(timeout=10000)
        dialog.get_by_role("button", name="Vẫn đăng xuất").click()
        try:
            pg.wait_for_url(re.compile(r".*/signin.*"), timeout=20000)
        except Exception:
            pass
        check("/signin" in pg.url, f"C: Vẫn đăng xuất signs out ({pg.url[len(BASE):]})")
        check(len(api.posts) == 0 and len(outbox(pg)) == 0, "C: …and drops the write that waited (nothing was sent, nothing is kept)")
        check(local_keys(pg) == [] or all("settings" in k for k in local_keys(pg)), f"C: the device kept nothing of the account ({local_keys(pg)})")
        ctx.close()

        # Nothing waiting: no dialog
        api = FakeApi()
        ctx, pg, st = signed_in_device(browser, api)
        open_day(pg)
        pg.locator('a[data-tour="meal-add"]:visible').first.click()
        pg.wait_for_url(re.compile(r".*/add.*"), timeout=15000)
        pick_food(pg, "Bắp luộc", "^Thêm vào Bữa")
        pg.wait_for_url(re.compile(r".*/app(\?.*)?$"), timeout=15000)
        pg.wait_for_timeout(1500)
        check(len(api.posts) == 1 and len(outbox(pg)) == 0, "C: the write was saved: nothing waits")
        check(len(local_keys(pg)) > 0, f"C: the device holds the account's data before Đăng xuất ({len(local_keys(pg))} keys)")
        open_account(pg)
        pg.get_by_text("Đăng xuất", exact=True).locator("visible=true").first.click()
        try:
            pg.wait_for_url(re.compile(r".*/signin.*"), timeout=20000)
        except Exception:
            pass
        check("/signin" in pg.url and pg.get_by_role("dialog", name="Đăng xuất?").count() == 0, f"C: nothing waiting: straight to /signin, no dialog ({pg.url[len(BASE):]})")
        check(local_keys(pg) == [] or all("settings" in k for k in local_keys(pg)), f"C: the device kept nothing of the account ({local_keys(pg)})")
        ctx.close()

    browser.close()

print(f"\n{len(problems)} problem(s)")
sys.exit(1 if problems else 0)
