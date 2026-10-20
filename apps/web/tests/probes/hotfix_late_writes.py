"""Hotfix 20/10 (late writes): a write is judged by when the user made it. Live-mode build only (NEXT_PUBLIC_API_MODE=live,
NEXT_PUBLIC_SUPABASE_URL=https://probe68.supabase.co), not in probe:all. The API is a fake in this file that applies the new
date rule (made_at within 14 days, else 409 PAST_DAY_READ_ONLY; without made_at only today and yesterday).
  A  the exact state of the two phones: 4 FINAL 409 items for a day three days back sit in the IndexedDB outbox, the marker
     of this app version is not there yet. On load they go back to queued, are sent with made_at (their own createdAt), are
     saved, the outbox is empty and the header reads Đã lưu (or nothing waiting)
  B  one item 20 days old (past the 14 days): it stays, the header says Chưa lưu (n), the list shows the day, the food and the
     plain reason "Máy chủ từ chối: ngày đã khóa" with Chuyển sang hôm nay and Bỏ món này; Thử lại is never silent (it says
     "Còn 2 món chưa lưu được, xem lý do"); Chuyển sang hôm nay sends it for today under the same id; Bỏ món này asks first, then takes it off
  C  Đăng xuất with an item that cannot be sent: Đồng bộ rồi đăng xuất says how many are left and why, and offers Xem các món and
     Vẫn đăng xuất (mất N món) (it does not just stop)
  D  the Chưa lưu pill in the header takes every tap, today and yesterday, at 360, 390 and 430 wide: five points across it all hit the
     pill, and no other control (the day arrows, the date) shares its box
Run with: LIVE_BUILD=1 ALIGN_BASE_URL=http://localhost:3112 npm run probe -- tests/probes/hotfix_late_writes.py
Pick parts with HLW_ONLY=A,B,C,D
"""
# PROBE_COVERS: app/(app)/(tabs)/app/** app/(app)/settings/account/**
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
ONLY = set(filter(None, os.environ.get("HLW_ONLY", "").split(",")))
SHOTS = Path(__file__).resolve().parent.parent.parent / ".screenshots" / "hotfix-late-writes"
SHOTS.mkdir(parents=True, exist_ok=True)
PHONE = {"viewport": {"width": 390, "height": 844}}
SUPABASE = os.environ.get("PROBE_SUPABASE_ORIGIN", "https://probe68.supabase.co")
EMAIL = "probehlw@example.com"
NOW = datetime.now(timezone.utc)
NOW_VN = NOW + timedelta(hours=7)
TODAY = NOW_VN.strftime("%Y-%m-%d")
THREE_BACK = (NOW_VN - timedelta(days=3)).strftime("%Y-%m-%d")
TWENTY_BACK = (NOW_VN - timedelta(days=20)).strftime("%Y-%m-%d")
PROFILE = {"sex": "male", "birth_year": 2000, "weight_kg": 65, "goal": "maintain", "display_name": "Probe", "training_minutes_default": 60}
FOOD_ID = "00000000-0000-4000-8000-000000000001"
FOODS = [{"id": FOOD_ID, "name_vi": "Khoai lang luộc", "category": "tinh_bot", "source": "USDA", "servings": [{"label": "100 g", "grams": 100}], "nutrients": {"energy": 101, "carbs": 20, "protein": 2, "fat": 1}}]
problems = []


def check(cond, msg):
    print(("[PASS] " if cond else "[FAIL] ") + msg)
    if not cond:
        problems.append(msg)


def parse_iso(text):
    return datetime.fromisoformat(text.replace("Z", "+00:00"))


class FakeApi:
    """The server with the new date rule. `posts` are the adds it saw: (day, id, made_at, status)."""

    def __init__(self):
        self.entries = {}
        self.posts = []
        self.deleted = []

    def accepts(self, day, made_at):
        if made_at is None:
            floor = (NOW_VN - timedelta(days=1)).strftime("%Y-%m-%d")
            return day >= floor
        when = parse_iso(made_at)
        if when > NOW + timedelta(minutes=5) or NOW - when > timedelta(days=14):
            return False
        floor = ((when + timedelta(hours=7)) - timedelta(days=1)).strftime("%Y-%m-%d")
        return day >= floor

    def handler(self):
        def handle(route):
            req = route.request
            path = req.url.split("/api/v1", 1)[1].split("?")[0]
            ok = lambda body, status=200: route.fulfill(status=status, content_type="application/json", body=json.dumps(body))
            if req.method == "POST" and path == "/client-errors":
                return route.fulfill(status=204, body="")
            if req.method == "GET" and path == "/me":
                return ok({"data": PROFILE})
            if req.method == "GET" and path == "/foods":
                return ok({"data": {"items": FOODS, "total": len(FOODS)}})
            if req.method == "GET" and path == "/days":
                return route.fulfill(status=404, content_type="application/json", body='{"error":{"code":"NOT_FOUND"}}')
            m = re.fullmatch(r"/days/([\d-]+)", path)
            if req.method == "GET" and m:
                rows = [e for e in self.entries.values() if e["date"] == m.group(1)]
                return ok({"data": {"date": m.group(1), "training_minutes": 0, "is_read_only": False, "meals": [{"slot": "all", "entries": rows}]}})
            m = re.fullmatch(r"/days/([\d-]+)/entries", path)
            if req.method == "POST" and m:
                body = json.loads(req.post_data or "{}")
                if not self.accepts(m.group(1), body.get("made_at")):
                    self.posts.append((m.group(1), body["id"], body.get("made_at"), 409))
                    return ok({"error": {"code": "PAST_DAY_READ_ONLY", "message": "Cannot write to past dates"}}, 409)
                entry = {"id": body["id"], "date": m.group(1), "food_id": body.get("food_id"), "food_name": "Khoai lang luộc", "grams": body.get("grams") or 100, "serving_label": "100 g", "meal_slot": body.get("meal_slot"), "calories": 101, "nutrients": {}, "created_at": NOW.isoformat()}
                self.entries.setdefault(entry["id"], entry)
                self.posts.append((m.group(1), body["id"], body.get("made_at"), 201))
                return ok({"entry": entry}, 201)
            m = re.fullmatch(r"/entries/([0-9a-f-]+)", path)
            if m and req.method == "DELETE":
                self.deleted.append(m.group(1))
                return route.fulfill(status=204, body="")
            route.fulfill(status=200, content_type="application/json", body=json.dumps({"data": []}))

        return handle


def b64url(data):
    return base64.urlsafe_b64encode(data).decode().rstrip("=")


def supabase_session(email):
    now = int(time.time())
    user = {"id": "00000000-0000-4000-8000-0000000000a1", "aud": "authenticated", "role": "authenticated", "email": email, "app_metadata": {"provider": "email", "providers": ["email"]}, "user_metadata": {"has_password": True}, "identities": [{"provider": "email"}], "created_at": "2026-10-01T00:00:00Z"}
    jwt = ".".join([b64url(b'{"alg":"HS256","typ":"JWT"}'), b64url(json.dumps({"sub": user["id"], "email": email, "aud": "authenticated", "role": "authenticated", "exp": now + 3600}).encode()), "sig"])
    session = {"access_token": jwt, "token_type": "bearer", "expires_in": 3600, "expires_at": now + 3600, "refresh_token": "refreshhlw", "user": user}
    return user, "base64-" + base64.b64encode(json.dumps(session).encode()).decode()


def device(browser, api):
    ctx = browser.new_context(**PHONE)
    ctx.add_init_script(f"try {{ localStorage.setItem('h1t_auth_current_email', '{EMAIL}'); }} catch (e) {{}}")
    user, cookie = supabase_session(EMAIL)
    ctx.add_cookies([{"name": "sb-probe68-auth-token", "value": cookie, "url": BASE}])
    ctx.route(SUPABASE + "/**", lambda route: route.fulfill(status=200, content_type="application/json", body="{}"))
    ctx.route(SUPABASE + "/auth/v1/user", lambda route: route.fulfill(status=200, content_type="application/json", body=json.dumps(user)))
    ctx.route(SUPABASE + "/auth/v1/logout*", lambda route: route.fulfill(status=204, body=""))
    ctx.route("**/api/v1/**", api.handler())
    ctx.route(BASE + "/auth/session", lambda route: route.fulfill(status=204, body=""))
    return ctx, ctx.new_page()


def close_tips(pg):
    for name in ("Đã hiểu", "Để sau"):
        button = pg.get_by_role("button", name=name).locator("visible=true")
        for _ in range(3):
            if button.count() == 0:
                break
            button.first.click()
            pg.wait_for_timeout(400)


def open_home(pg):
    pg.goto(BASE + "/app", wait_until="domcontentloaded")
    pg.locator('[data-align-group="home-page"]').first.wait_for(state="visible", timeout=20000)
    pg.wait_for_timeout(1200)
    close_tips(pg)


def item(n, day, days_ago, label=None, key=None):
    """An add made `days_ago` days ago for `day`, held FINAL by the old rule (409), as found on the phones."""
    created = int((NOW - timedelta(days=days_ago)).timestamp() * 1000) + n * 60000
    record = {
        "key": key or f"hlw{n}:{created}",
        "seq": created * 1000 + n,
        "id": f"{n}{n}{n}{n}{n}{n}{n}{n}-1111-4111-8111-111111111111",
        "date": day,
        "payload": {"id": f"{n}{n}{n}{n}{n}{n}{n}{n}-1111-4111-8111-111111111111", "kind": "food", "meal_slot": "lunch", "food_id": FOOD_ID, "grams": 100, "serving_size_g": 100},
        "createdAt": created,
        "state": "held",
        "attempts": 1,
        "retries": 1,
        "held": {"status": 409, "final": True},
        "scope": EMAIL,
    }
    if label:
        record["label"] = label
    return record


def seed(pg, items):
    """Puts the items in the outbox and removes this version's marker, as on a phone that has never seen the new version."""
    pg.evaluate(
        """({ items, email }) => new Promise((resolve, reject) => {
             const open = indexedDB.open('h1t');
             open.onerror = () => reject(open.error);
             open.onsuccess = () => {
               const db = open.result;
               const tx = db.transaction(['outbox', 'kv'], 'readwrite');
               const outbox = tx.objectStore('outbox');
               outbox.getAll().onsuccess = (e) => {
                 e.target.result.filter((r) => r.scope === email).forEach((r) => outbox.delete(r.key));
                 items.forEach((i) => outbox.put(i));
               };
               const kv = tx.objectStore('kv');
               kv.getAllKeys().onsuccess = (e) => e.target.result.filter((k) => String(k).startsWith('unstick-late-writes:')).forEach((k) => kv.delete(k));
               tx.oncomplete = () => { db.close(); resolve(true); };
               tx.onerror = () => reject(tx.error);
             };
           })""",
        {"items": items, "email": EMAIL},
    )


def outbox(pg):
    return pg.evaluate(
        """(email) => new Promise((resolve) => {
             const open = indexedDB.open('h1t');
             open.onerror = () => resolve([]);
             open.onsuccess = () => {
               try {
                 const db = open.result;
                 const all = db.transaction('outbox').objectStore('outbox').getAll();
                 all.onsuccess = () => { resolve(all.result.filter((i) => i.scope === email).map((i) => ({ id: i.id, date: i.date, state: i.state, final: !!(i.held && i.held.final) }))); db.close(); };
                 all.onerror = () => resolve([]);
               } catch (e) { resolve([]); }
             };
           })""",
        EMAIL,
    )


def header_state(pg):
    return pg.evaluate("() => { const el = document.querySelector('[data-tour=\"sync-status\"]'); return el ? el.getAttribute('data-sync-state') : null; }")


def want(key):
    return not ONLY or key in ONLY


with sync_playwright() as p:
    browser = p.chromium.launch()

    if want("A"):
        api = FakeApi()
        ctx, pg = device(browser, api)
        open_home(pg)  # the database exists now
        items = [item(n, THREE_BACK, 3, label="Khoai lang luộc") for n in (1, 2, 3, 4)]
        seed(pg, items)
        check(len(outbox(pg)) == 4 and all(i["final"] for i in outbox(pg)), "A: four FINAL items for a day three days back are in the outbox")
        # Watch the header while the page loads and the items go
        pg.add_init_script("window.__hlwStates = []; setInterval(() => { const el = document.querySelector('[data-tour=\"sync-status\"]'); if (el) window.__hlwStates.push(el.getAttribute('data-sync-state')); }, 100);")
        pg.reload(wait_until="domcontentloaded")
        pg.locator('[data-align-group="home-page"]').first.wait_for(state="visible", timeout=20000)
        for _ in range(40):
            if len([x for x in api.posts if x[3] == 201]) >= 4:
                break
            pg.wait_for_timeout(250)
        pg.wait_for_timeout(1500)
        saved = [x for x in api.posts if x[3] == 201]
        check(len(saved) == 4, f"A: all four were saved by the server ({api.posts})")
        check(all(x[0] == THREE_BACK for x in saved), "A: …for the day they were made (three days back)")
        wanted = {datetime.fromtimestamp(i["createdAt"] / 1000, timezone.utc) for i in items}
        got = {parse_iso(x[2]) for x in saved if x[2]}
        check(wanted == got, "A: …each with made_at = its own createdAt")
        check(len(outbox(pg)) == 0, f"A: the outbox is empty ({outbox(pg)})")
        states = pg.evaluate("window.__hlwStates") or []
        check("saved" in states or header_state(pg) in ("idle", "saved"), f"A: the header reads Đã lưu / nothing waiting (seen: {sorted(set(states))})")
        check(pg.get_by_text("Chưa lưu (").count() == 0, "A: no Chưa lưu in the header")
        pg.screenshot(path=str(SHOTS / "A-saved-390.png"))
        ctx.close()

    if want("B"):
        api = FakeApi()
        ctx, pg = device(browser, api)
        open_home(pg)
        move_item = item(1, TWENTY_BACK, 20, label="Khoai lang luộc")
        drop_item = item(2, TWENTY_BACK, 20)  # no name known: the list says "một món"
        seed(pg, [move_item, drop_item])
        pg.reload(wait_until="domcontentloaded")
        pg.locator('[data-align-group="home-page"]').first.wait_for(state="visible", timeout=20000)
        pg.wait_for_timeout(2500)
        check(len(outbox(pg)) == 2, f"B: the two 20-day-old items stay ({outbox(pg)})")
        check(not any(x[3] == 201 for x in api.posts), "B: …nothing was saved for them on load")
        header = pg.get_by_role("button", name=re.compile(r"^Chưa lưu 2")).locator("visible=true")
        check(header.count() >= 1, "B: the header says Chưa lưu (2)")
        header.first.click()
        pg.wait_for_selector("[data-sync-list]", timeout=10000)
        text = pg.locator("[data-sync-list]").inner_text()
        day = (NOW_VN - timedelta(days=20)).strftime("%d/%m")
        check(f"Khoai lang luộc · {day}" in text and f"một món · {day}" in text, f"B: the list shows the food and the day ({text!r})")
        check(text.count("Máy chủ từ chối: ngày đã khóa") == 2, "B: …and the plain reason for each")
        check(pg.get_by_role("button", name="Chuyển sang hôm nay").count() == 2 and pg.get_by_role("button", name="Bỏ món này").count() == 2, "B: …with Chuyển sang hôm nay and Bỏ món này")
        title = pg.locator("#sync-list-title").inner_text()
        check("(2)" in title, f"B: the list title counts the same 2 ({title!r})")
        pg.screenshot(path=str(SHOTS / "B-list-390.png"))

        # Thử lại is never silent
        pg.get_by_role("button", name="Thử lại", exact=True).click()
        pg.wait_for_function("() => (document.querySelector('[data-sync-outcome]') || {}).innerText?.includes('Còn 2 món')", timeout=10000)
        check(True, "B: Thử lại says: " + pg.locator("[data-sync-outcome]").inner_text())
        check(sum(1 for x in api.posts if x[3] == 409) >= 2, "B: …it sent both again (the server refused them again)")
        pg.screenshot(path=str(SHOTS / "B-retry-390.png"))

        # Chuyển sang hôm nay: the first item (the list is oldest first)
        pg.get_by_role("button", name="Chuyển sang hôm nay").first.click()
        for _ in range(30):
            if any(x[3] == 201 for x in api.posts):
                break
            pg.wait_for_timeout(250)
        moved = [x for x in api.posts if x[3] == 201]
        check(len(moved) == 1 and moved[0][0] == TODAY and moved[0][1] == move_item["id"], f"B: Chuyển sang hôm nay sent the item for today under the same id ({moved})")
        check(moved and abs((parse_iso(moved[0][2]) - NOW).total_seconds()) < 600, "B: …made now")
        pg.wait_for_timeout(800)
        check(len(outbox(pg)) == 1, f"B: one item is left ({outbox(pg)})")

        # Bỏ món này asks first
        pg.get_by_role("button", name="Bỏ món này").first.click()
        check(pg.get_by_text("Bỏ món này? Món sẽ mất khỏi máy này.").count() == 1, "B: Bỏ món này asks first")
        pg.get_by_role("button", name="Giữ lại").first.click()
        check(len(outbox(pg)) == 1, "B: Giữ lại keeps it")
        pg.get_by_role("button", name="Bỏ món này").click()
        pg.get_by_role("button", name="Bỏ món này").click()
        pg.wait_for_timeout(800)
        check(len(outbox(pg)) == 0, f"B: confirmed: the item is gone ({outbox(pg)})")
        check(pg.get_by_text("Đã lưu hết.").count() == 1, "B: the list says Đã lưu hết.")
        ctx.close()

    if want("C"):
        api = FakeApi()
        ctx, pg = device(browser, api)
        open_home(pg)
        seed(pg, [item(1, TWENTY_BACK, 20, label="Khoai lang luộc")])
        pg.goto(BASE + "/settings/account", wait_until="domcontentloaded")
        pg.get_by_text("Đăng xuất", exact=True).locator("visible=true").first.wait_for(timeout=20000)
        pg.wait_for_timeout(800)
        pg.get_by_text("Đăng xuất", exact=True).locator("visible=true").first.click()
        pg.get_by_role("button", name="Đồng bộ rồi đăng xuất").wait_for(timeout=10000)
        check(pg.get_by_text("Còn 1 món chưa đồng bộ.").count() == 1, "C: with one item waiting, Đăng xuất asks first")
        pg.get_by_role("button", name="Đồng bộ rồi đăng xuất").click()
        pg.wait_for_selector("[data-sign-out-failure]", timeout=15000)
        failure = pg.locator("[data-sign-out-failure]").inner_text()
        check("Còn 1 món chưa đồng bộ được" in failure and "ngày đã khóa" in failure, f"C: it says how many are left and why ({failure!r})")
        check(pg.get_by_role("button", name="Xem các món").count() == 1, "C: …offers Xem các món")
        check(pg.get_by_role("button", name="Vẫn đăng xuất (mất 1 món)").count() == 1, "C: …and Vẫn đăng xuất (mất 1 món)")
        check("/settings/account" in pg.url, "C: it did not leave")
        pg.screenshot(path=str(SHOTS / "C-signout-390.png"))
        pg.get_by_role("button", name="Xem các món").click()
        pg.wait_for_selector("[data-sync-list]", timeout=10000)
        check(pg.locator("[data-sync-list]").inner_text().count("ngày đã khóa") == 1, "C: Xem các món opens the list with the reason")
        ctx.close()

    if want("D"):
        yesterday = (NOW_VN - timedelta(days=1)).strftime("%Y-%m-%d")
        js = """() => {
          const pill = [...document.querySelectorAll('button')].find((b) => /Chưa lưu/.test(b.getAttribute('aria-label') || ''));
          if (!pill) return null;
          const pr = pill.getBoundingClientRect();
          const hits = [0.03, 0.25, 0.5, 0.75, 0.97].map((f) => { const el = document.elementFromPoint(pr.left + pr.width * f, pr.top + pr.height / 2); return !!el && (el === pill || pill.contains(el)); });
          const others = [...document.querySelectorAll('header button, header a')].filter((b) => b !== pill && !pill.contains(b) && b.getBoundingClientRect().width > 0);
          const overlap = others.filter((b) => { const r = b.getBoundingClientRect(); return r.left < pr.right && r.right > pr.left && r.top < pr.bottom && r.bottom > pr.top; }).map((b) => b.getAttribute('aria-label') || b.textContent.trim());
          return { hits, overlap, scrollW: document.documentElement.scrollWidth, width: window.innerWidth };
        }"""
        for width in (360, 390, 430):
            for label, day in (("today", None), ("yesterday", yesterday)):
                api = FakeApi()
                ctx = browser.new_context(viewport={"width": width, "height": 844})
                ctx.add_init_script(f"try {{ localStorage.setItem('h1t_auth_current_email', '{EMAIL}'); }} catch (e) {{}}")
                user, cookie = supabase_session(EMAIL)
                ctx.add_cookies([{"name": "sb-probe68-auth-token", "value": cookie, "url": BASE}])
                ctx.route(SUPABASE + "/**", lambda route: route.fulfill(status=200, content_type="application/json", body="{}"))
                ctx.route(SUPABASE + "/auth/v1/user", lambda route, user=user: route.fulfill(status=200, content_type="application/json", body=json.dumps(user)))
                ctx.route("**/api/v1/**", api.handler())
                ctx.route(BASE + "/auth/session", lambda route: route.fulfill(status=204, body=""))
                pg = ctx.new_page()
                open_home(pg)
                seed(pg, [item(1, TWENTY_BACK, 20), item(2, TWENTY_BACK, 20)])
                pg.goto(BASE + "/app" + (f"?date={day}" if day else ""), wait_until="domcontentloaded")
                pg.locator('[data-align-group="home-page"]').first.wait_for(state="visible", timeout=20000)
                pg.wait_for_timeout(2500)
                close_tips(pg)
                got = pg.evaluate(js)
                check(got is not None and all(got["hits"]), f"D: {width} {label}: every tap point on the Chưa lưu pill reaches it ({got})")
                check(got is not None and got["overlap"] == [], f"D: {width} {label}: no other control shares the pill's box ({got and got['overlap']})")
                if width == 390 and label == "yesterday":
                    pg.get_by_role("button", name=re.compile(r"^Chưa lưu 2")).locator("visible=true").first.click(position={"x": 6, "y": 20})
                    pg.wait_for_selector("[data-sync-list]", timeout=10000)
                    check(True, "D: a tap on the left edge of the pill opens the list")
                    pg.screenshot(path=str(SHOTS / "D-yesterday-390.png"))
                ctx.close()

    browser.close()

print()
if problems:
    print(f"{len(problems)} problem(s):")
    for msg in problems:
        print(" -", msg)
    sys.exit(1)
print("all pass")
