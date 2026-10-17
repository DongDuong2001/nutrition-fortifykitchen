"""cc-49: a food that was added is always saved, other devices see it within a minute, signed-out desktop goes to /signin.

Live-mode build only (NEXT_PUBLIC_API_MODE=live, NEXT_PUBLIC_SUPABASE_URL=http://localhost:54399, any anon key), not in
probe:all. The API is a fake in this file (route interception), shared by every browser context, so two contexts on one
account are two devices on one server. /auth/session is intercepted too: a context whose session "expired" gets 401 from
every API call until it asks /auth/session, which is what the middleware's cookie refresh does in production.
  1  POST 401 (expired session) → /auth/session → POST again → 201: saved, no marker
  2  POST 500 → Chưa lưu marker, kept in the outbox → retried on `online` → saved, marker gone
  3  reload while the POST keeps failing: the entry stays (Chưa lưu); reload while GET /days fails: nothing is wiped
  4  a 400: the entry stays, toast "Chưa lưu được món. Thử lại"; Thử lại with a healthy server saves it
  5  two contexts on one account, B a 390 px phone left open: B shows A's new food within 65 s without focus or
     reload; B hidden, A adds, B shown again: it is there within 10 s (the session refresh first); the same after a
     pageshow from the back-forward cache; deleted on the server: B drops it
  6  signed out at 1440: /app and the link page's Truy cập end on /signin; /landing still opens directly
Run with: LIVE_BUILD=1 ALIGN_BASE_URL=http://localhost:3101 npm run probe -- tests/probes/cc_49.py
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

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3101")
ONLY = set(filter(None, os.environ.get("CC49_ONLY", "").split(",")))
SHOTS = Path(__file__).resolve().parent.parent.parent / ".screenshots" / "cc49"
SHOTS.mkdir(parents=True, exist_ok=True)
PHONE = {"viewport": {"width": 390, "height": 844}}
DESKTOP = {"viewport": {"width": 1440, "height": 900}}
EMAIL = "probe49@example.com"
TODAY = (datetime.now(timezone.utc) + timedelta(hours=7)).strftime("%Y-%m-%d")
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
    """One server: the day's entries by id, and scripted answers for the next writes."""

    def __init__(self):
        self.entries = {}
        self.script = {"POST": [], "GET_DAY": []}

    def day(self):
        rows = sorted(self.entries.values(), key=lambda e: e["created_at"])
        return {"data": {"date": TODAY, "training_minutes": 0, "is_read_only": False, "meals": [{"slot": "all", "entries": rows}]}}

    def handler(self, device):
        def handle(route):
            req = route.request
            path = req.url.split("/api/v1", 1)[1].split("?")[0]
            device["calls"].append(f"{req.method} {path}")
            if device["expired"]:
                route.fulfill(status=401, content_type="application/json", body='{"error":"unauthorized"}')
                return
            if req.method == "GET" and path == "/me":
                return route.fulfill(status=200, content_type="application/json", body=json.dumps({"data": PROFILE}))
            if req.method == "GET" and path == "/foods":
                return route.fulfill(status=200, content_type="application/json", body=json.dumps({"data": {"items": FOODS, "total": len(FOODS)}}))
            if req.method == "GET" and re.fullmatch(r"/days/[\d-]+", path):
                if self.script["GET_DAY"]:
                    return route.fulfill(status=self.script["GET_DAY"].pop(0), body="boom")
                return route.fulfill(status=200, content_type="application/json", body=json.dumps(self.day()))
            if req.method == "POST" and re.fullmatch(r"/days/[\d-]+/entries", path):
                if self.script["POST"]:
                    return route.fulfill(status=self.script["POST"].pop(0), content_type="application/json", body='{"error":"scripted"}')
                body = json.loads(req.post_data or "{}")
                food = next((f for f in FOODS if f["id"] == body.get("food_id")), None)
                grams = body.get("grams") or 100
                entry = {
                    "id": body["id"],
                    "food_id": body.get("food_id"),
                    "food_name": food["name_vi"] if food else "Món ăn",
                    "grams": grams,
                    "serving_label": f"{grams} g",
                    "meal_slot": body.get("meal_slot"),
                    "calories": round(food["nutrients"]["energy"] * grams / 100) if food else body.get("calories"),
                    "nutrients": {},
                    "created_at": datetime.now(timezone.utc).isoformat(),
                }
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


def device(browser, api, size=PHONE, signed_in=True):
    """A browser context on the fake API. `state["expired"]` makes every API call 401 until /auth/session is asked."""
    ctx = browser.new_context(**size)
    state = {"expired": False, "calls": [], "refreshes": 0}
    if signed_in:
        ctx.add_init_script(f"try {{ localStorage.setItem('h1t_auth_current_email', '{EMAIL}'); }} catch (e) {{}}")
    ctx.route("**/api/v1/**", api.handler(state))

    def session(route):
        state["refreshes"] += 1
        state["calls"].append("GET /auth/session")
        state["expired"] = False
        route.fulfill(status=204, body="")

    ctx.route(BASE + "/auth/session", session)
    return ctx, ctx.new_page(), state


def open_today(pg):
    pg.goto(BASE + "/app", wait_until="domcontentloaded")
    pg.locator('[data-align-group="home-page"]').first.wait_for(state="visible", timeout=20000)
    pg.wait_for_timeout(800)


def close_tips(pg):
    """A first-visit tip of a live account covers the screen; Đã hiểu closes it."""
    tip = pg.get_by_role("button", name="Đã hiểu").locator("visible=true")
    for _ in range(3):
        if tip.count() == 0:
            return
        tip.first.click()
        pg.wait_for_timeout(300)


def add_food(pg, name, before_add=None):
    pg.goto(BASE + "/add?meal=dinner", wait_until="domcontentloaded")
    row = pg.locator("[data-food-row]:visible", has_text=name).first
    row.wait_for(timeout=20000)
    row.click()
    button = pg.get_by_role("button", name=re.compile("^Thêm vào Bữa tối")).locator("visible=true").first
    button.wait_for(timeout=10000)
    if before_add:
        before_add()
    button.click()
    pg.wait_for_url(re.compile(r".*/app(\?.*)?$"), timeout=15000)
    pg.wait_for_timeout(1200)


def row_of(pg, name):
    return pg.locator(f'button[aria-label^="{name},"]:visible')


def on_server(api, name):
    return any(e["food_name"] == name for e in api.entries.values())


def outbox_ids(pg):
    return pg.evaluate(
        """(email) => { try { return JSON.parse(localStorage.getItem('h1t_offline_outbox_' + email) || '[]').map((i) => i.id); }
           catch (e) { return []; } }""",
        EMAIL,
    )


def wait_until(fn, timeout_s, step_ms=500, pg=None):
    end = time.time() + timeout_s
    while time.time() < end:
        if fn():
            return True
        if pg is not None:
            pg.wait_for_timeout(step_ms)
        else:
            time.sleep(step_ms / 1000)
    return fn()


def set_visible(pg, visible):
    """The tab goes to the background (a phone switching apps) or comes back: visibilityState and its event."""
    pg.evaluate(
        """(state) => {
             Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state });
             Object.defineProperty(document, 'hidden', { configurable: true, get: () => state === 'hidden' });
             document.dispatchEvent(new Event('visibilitychange'));
           }""",
        "visible" if visible else "hidden",
    )


def session_before_refetch(calls, since):
    """After index `since`, /auth/session is asked before the next GET /days/…"""
    later = calls[since:]
    day = next((i for i, c in enumerate(later) if re.fullmatch(r"GET /days/[\d-]+", c)), None)
    return day is not None and "GET /auth/session" in later[:day]


def want(n):
    return not ONLY or str(n) in ONLY


with sync_playwright() as p:
    browser = p.chromium.launch()

    if want(1):
        api = FakeApi()
        ctx, pg, st = device(browser, api)
        open_today(pg)
        # The app stayed open past the token life: the cookie expires just before the tap on Thêm vào
        add_food(pg, "Khoai lang luộc", before_add=lambda: st.update(expired=True))
        ok = wait_until(lambda: on_server(api, "Khoai lang luộc"), 10, pg=pg)
        check(ok, "1: POST 401 with an expired session: the food reaches the server after the refresh")
        check(st["refreshes"] >= 1, f"1: /auth/session was asked ({st['refreshes']} times)")
        posts = [c for c in st["calls"] if c.startswith("POST /days/")]
        check(len(posts) == 2, f"1: the POST was sent twice: 401, then again ({posts})")
        check(row_of(pg, "Khoai lang luộc").count() == 1, "1: the row is on Hôm nay")
        check(pg.locator("[data-unsaved]:visible").count() == 0, "1: no Chưa lưu marker once saved")
        ctx.close()

    if want(2):
        api = FakeApi()
        ctx, pg, st = device(browser, api)
        open_today(pg)
        api.script["POST"] = [500]
        add_food(pg, "Bắp luộc")
        check(not on_server(api, "Bắp luộc"), "2: POST 500: not on the server yet")
        check(len(outbox_ids(pg)) == 1, f"2: the entry waits in the outbox ({outbox_ids(pg)})")
        check(row_of(pg, "Bắp luộc").count() == 1, "2: the row stays on Hôm nay")
        check(pg.locator("[data-unsaved]:visible").count() == 1, "2: the row shows Chưa lưu")
        # Tutorials: the Chưa lưu tip (tips are on in a live build) puts its ring on the marker
        card = pg.locator("[data-onboarding-card]:visible")
        try:
            card.first.wait_for(timeout=4000)
        except Exception:
            pass
        check(card.count() == 1 and "Món chưa lưu" in card.first.inner_text(), "2: the tip Món chưa lưu opens")
        ring = pg.locator("[data-onboarding-overlay] > div.border-sky").first.bounding_box()
        mark = pg.locator("[data-unsaved]:visible").first.bounding_box()
        check(
            ring is not None and mark is not None and ring["x"] <= mark["x"] + 1 and ring["y"] <= mark["y"] + 1
            and ring["x"] + ring["width"] >= mark["x"] + mark["width"] - 1 and ring["y"] + ring["height"] >= mark["y"] + mark["height"] - 1,
            f"2: …its ring holds the Chưa lưu marker ({ring}, {mark})",
        )
        pg.screenshot(path=str(SHOTS / "cc49-unsaved-390.png"))
        close_tips(pg)
        pg.set_viewport_size({"width": 1440, "height": 900})
        pg.wait_for_timeout(600)
        check(pg.locator("[data-unsaved]:visible").count() == 1, "2: 1440: the row shows Chưa lưu")
        pg.screenshot(path=str(SHOTS / "cc49-unsaved-1440.png"))
        pg.set_viewport_size(PHONE["viewport"])
        pg.wait_for_timeout(400)
        pg.evaluate("window.dispatchEvent(new Event('online'))")
        ok = wait_until(lambda: on_server(api, "Bắp luộc"), 10, pg=pg)
        check(ok, "2: back online, the outbox sends it: saved")
        pg.wait_for_timeout(800)
        check(outbox_ids(pg) == [], "2: the outbox is empty after the retry")
        check(pg.locator("[data-unsaved]:visible").count() == 0, "2: the Chưa lưu marker is gone")
        check(len([e for e in api.entries.values() if e["food_name"] == "Bắp luộc"]) == 1, "2: saved once, not twice")
        ctx.close()

    if want(3):
        api = FakeApi()
        ctx, pg, st = device(browser, api)
        open_today(pg)
        api.script["POST"] = [503] * 20
        add_food(pg, "Bánh mì đen")
        pg.reload(wait_until="domcontentloaded")
        pg.wait_for_timeout(2500)
        check(row_of(pg, "Bánh mì đen").count() == 1, "3: reload while the POST keeps failing: the entry stays")
        check(pg.locator("[data-unsaved]:visible").count() == 1, "3: …marked Chưa lưu")
        api.script["POST"] = []
        pg.evaluate("window.dispatchEvent(new Event('focus'))")
        ok = wait_until(lambda: on_server(api, "Bánh mì đen"), 10, pg=pg)
        check(ok, "3: the next focus saves it")
        # A saved day and a refetch that fails: nothing is wiped
        api.script["GET_DAY"] = [500] * 5
        pg.reload(wait_until="domcontentloaded")
        pg.wait_for_timeout(2500)
        check(row_of(pg, "Bánh mì đen").count() == 1, "3: reload while GET /days answers 500: the saved entry is still shown")
        api.script["GET_DAY"] = []
        st["expired"] = True
        pg.reload(wait_until="domcontentloaded")
        pg.wait_for_timeout(2500)
        check(row_of(pg, "Bánh mì đen").count() == 1, "3: reload with an expired session: still shown")
        ctx.close()

    if want(4):
        api = FakeApi()
        ctx, pg, st = device(browser, api)
        open_today(pg)
        api.script["POST"] = [400]
        add_food(pg, "Yến mạch cán")
        check(row_of(pg, "Yến mạch cán").count() == 1, "4: POST 400: the entry stays on Hôm nay")
        check(pg.locator("[data-unsaved]:visible").count() == 1, "4: …marked Chưa lưu")
        toast = pg.get_by_text("Chưa lưu được món", exact=False)
        check(toast.count() >= 1, "4: the toast says Chưa lưu được món")
        pg.screenshot(path=str(SHOTS / "cc49-held-toast-390.png"))
        close_tips(pg)
        retry = pg.get_by_role("button", name="Thử lại").locator("visible=true")
        check(retry.count() >= 1, "4: the toast offers Thử lại")
        if retry.count():
            retry.first.click()
        ok = wait_until(lambda: on_server(api, "Yến mạch cán"), 10, pg=pg)
        check(ok, "4: Thử lại saves it")
        pg.wait_for_timeout(800)
        check(pg.locator("[data-unsaved]:visible").count() == 0, "4: the marker clears after Thử lại")
        ctx.close()

    if want(5):
        api = FakeApi()
        ctx_a, a, _ = device(browser, api)
        ctx_b, b, st_b = device(browser, api)
        open_today(a)
        open_today(b)
        add_food(a, "Gạo lứt nấu")
        check(on_server(api, "Gạo lứt nấu"), "5: A saved Gạo lứt nấu")
        started = time.time()
        seen = wait_until(lambda: row_of(b, "Gạo lứt nấu").count() == 1, 70, step_ms=1000, pg=b)
        check(seen, f"5: B shows A's food without focus or reload ({time.time() - started:.0f} s)")
        check(time.time() - started <= 66, f"5: …within a minute ({time.time() - started:.0f} s)")
        b.screenshot(path=str(SHOTS / "cc49-other-device-390.png"))

        # The phone puts the tab in the background; the laptop adds a food; the phone comes back
        set_visible(b, False)
        add_food(a, "Bún tươi")
        b.wait_for_timeout(3000)
        check(row_of(b, "Bún tươi").count() == 0, "5: while B is hidden it does not refetch (no Bún tươi yet)")
        mark = len(st_b["calls"])
        set_visible(b, True)
        started = time.time()
        seen = wait_until(lambda: row_of(b, "Bún tươi").count() == 1, 10, pg=b)
        check(seen, f"5: B shown again: Bún tươi is there ({time.time() - started:.1f} s)")
        check(session_before_refetch(st_b["calls"], mark), "5: …the session was renewed before the refetch")

        # Restored from the back-forward cache (pageshow with persisted)
        add_food(a, "Khoai lang luộc")
        mark = len(st_b["calls"])
        b.evaluate("window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }))")
        started = time.time()
        seen = wait_until(lambda: row_of(b, "Khoai lang luộc").count() == 1, 10, pg=b)
        check(seen, f"5: pageshow from the back-forward cache: B shows Khoai lang luộc ({time.time() - started:.1f} s)")
        check(session_before_refetch(st_b["calls"], mark), "5: …the session was renewed before the refetch")
        b.screenshot(path=str(SHOTS / "cc49-other-device-shown-again-390.png"))
        # A deletes it on the server (another device): B drops it on its next refetch, it was saved before
        for k in [k for k, e in api.entries.items() if e["food_name"] == "Gạo lứt nấu"]:
            api.entries.pop(k)
        gone = wait_until(lambda: row_of(b, "Gạo lứt nấu").count() == 0, 70, step_ms=1000, pg=b)
        check(gone, "5: deleted elsewhere: B drops it on a refetch")
        ctx_a.close()
        ctx_b.close()

    if want(6):
        api = FakeApi()
        ctx, pg, _ = device(browser, api, size=DESKTOP, signed_in=False)
        pg.goto(BASE + "/app", wait_until="domcontentloaded")
        try:
            pg.wait_for_url(re.compile(r".*/signin(\?.*)?$"), timeout=15000)
        except Exception:
            pass
        check(pg.url.split("?")[0].endswith("/signin"), f"6: 1440 signed out: /app ends on /signin ({pg.url[len(BASE):]})")
        pg.goto(BASE + "/", wait_until="domcontentloaded")
        pg.locator('a[data-align-group="link-rows"]:has-text("Truy cập")').first.click()
        try:
            pg.wait_for_url(re.compile(r".*/signin(\?.*)?$"), timeout=15000)
        except Exception:
            pass
        check(pg.url.split("?")[0].endswith("/signin"), f"6: 1440 signed out: Truy cập ends on /signin ({pg.url[len(BASE):]})")
        pg.goto(BASE + "/landing", wait_until="domcontentloaded")
        pg.wait_for_timeout(1000)
        check(pg.url.split("?")[0].endswith("/landing"), f"6: /landing still opens directly ({pg.url[len(BASE):]})")
        ctx.close()

    browser.close()

print(f"\n{len(problems)} problem(s)")
sys.exit(1 if problems else 0)
