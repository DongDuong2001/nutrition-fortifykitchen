"""backend-sync-1022: the macro split and Ngày ăn mẫu follow the account (migrations 000015/000016, PUT /me/profile, /day-templates).

Live-mode build only, like cc_68.py (NEXT_PUBLIC_API_MODE=live, NEXT_PUBLIC_SUPABASE_URL=https://probe68.supabase.co, any anon key); it
skips on the demo build of probe:all. The API is a fake in this file that keeps state the way apps/api does (a key left out of
PUT /me/profile is unchanged, null clears it, updatedAt moves; templates by client id, soft delete). Two contexts on one account are two
devices with nothing in common but the server.
  A  device 1 sets Tỉ lệ 30/40/30 on Mục tiêu đa lượng and saves today as a template; the server gets the split (all five keys) and
     PUT /day-templates/<uuid>
  B  device 2 (empty storage, same account) opens Mục tiêu đa lượng and sees Tỉ lệ 30/40/30, Hôm nay's macro targets are the split's
     grams, and Ngày ăn mẫu lists the template
  C  device 2 deletes the template (DELETE, soft); device 1 reloads and no longer has it
  D  a device with a split and a template from before the sync (device-only, an old dt- id) uploads both once, the template under a
     new uuid; a second load sends nothing again
Run with: LIVE_BUILD=1 ALIGN_BASE_URL=http://localhost:3101 npm run probe -- tests/probes/backend_sync.py
"""
# PROBE_COVERS: app/(app)/settings/targets/macros/** app/(app)/explore/ngay-mau/** components/settings/macro-targets-screen.tsx components/templates/** lib/profile.ts lib/day-templates.ts lib/day-template-store.ts
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

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3101")
SUPABASE = os.environ.get("PROBE_SUPABASE_ORIGIN", "https://probe68.supabase.co")
EMAIL = "probe-sync@example.com"
SHOTS = Path(__file__).resolve().parent.parent.parent / ".screenshots" / "backend-sync"
SHOTS.mkdir(parents=True, exist_ok=True)
NOW_VN = datetime.now(timezone.utc) + timedelta(hours=7)
TODAY = NOW_VN.strftime("%Y-%m-%d")
UUID = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$")
HERO = "section[aria-label='Tổng kcal và dinh dưỡng đa lượng']"
SETTINGS = ["macroMode", "macroRatios", "macroFixed", "customEnergyKcal", "customTargets"]
FOODS = [
    {
        "id": f"00000000-0000-4000-8000-0000000000{i:02d}",
        "name_vi": name,
        "category": "tinh_bot",
        "source": "USDA",
        "servings": [{"label": "100 g", "grams": 100}],
        "nutrients": {"energy": 100 + i, "carbs": 20, "protein": 2, "fat": 1},
    }
    for i, name in enumerate(["Khoai lang luộc", "Bắp luộc"], start=1)
]
problems = []


def check(cond, msg):
    print(("[PASS] " if cond else "[FAIL] ") + msg)
    if not cond:
        problems.append(msg)


def now_iso():
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


class FakeApi:
    """One account's server: the profile (with the five settings and updatedAt), today's entries, the templates."""

    def __init__(self):
        self.profile = {"sex": "male", "birth_year": 2000, "weight_kg": 65, "goal": "maintain", "display_name": "Probe", "training_minutes_default": 60, "updatedAt": now_iso()}
        for key in SETTINGS:
            self.profile[key] = None
        self.entries = []
        self.templates = {}
        self.calls = []

    def live_templates(self):
        rows = [t for t in self.templates.values() if not t.get("deletedAt")]
        return sorted(rows, key=lambda t: t["createdAt"], reverse=True)

    def handle(self, route):
        req = route.request
        path = req.url.split("/api/v1", 1)[1].split("?")[0]
        body = json.loads(req.post_data or "{}") if req.method in ("PUT", "POST", "PATCH") else {}
        self.calls.append((req.method, path, body))
        ok = lambda data, status=200: route.fulfill(status=status, content_type="application/json", body=json.dumps({"data": data}))
        if req.method == "GET" and path == "/me":
            return ok(self.profile)
        if req.method == "PUT" and path == "/me/profile":
            for key, value in body.items():
                if key in SETTINGS or key in ("sex", "birth_year", "weight_kg", "goal", "display_name", "training_minutes_default", "near_period"):
                    self.profile[key] = value
            self.profile["updatedAt"] = now_iso()
            return ok(self.profile)
        if req.method == "GET" and path == "/foods":
            return ok({"items": FOODS, "total": len(FOODS)})
        m = re.fullmatch(r"/days/([\d-]+)", path)
        if req.method == "GET" and m:
            rows = [e for e in self.entries if e["date"] == m.group(1)]
            return ok({"date": m.group(1), "training_minutes": 60, "is_read_only": False, "meals": [{"slot": "all", "entries": rows}]})
        m = re.fullmatch(r"/days/([\d-]+)/entries", path)
        if req.method == "POST" and m:
            food = next((f for f in FOODS if f["id"] == body.get("food_id")), None)
            grams = body.get("grams") or 100
            entry = {"id": body["id"], "date": m.group(1), "food_id": body.get("food_id"), "food_name": food["name_vi"] if food else "Món ăn", "grams": grams,
                     "serving_label": body.get("serving_label") or f"{grams} g", "meal_slot": body.get("meal_slot"),
                     "calories": round(food["nutrients"]["energy"] * grams / 100) if food else None, "nutrients": {}, "created_at": now_iso()}
            if all(e["id"] != entry["id"] for e in self.entries):
                self.entries.append(entry)
            return route.fulfill(status=201, content_type="application/json", body=json.dumps({"entry": entry}))
        if req.method == "GET" and path == "/day-templates":
            return ok({"items": self.live_templates()})
        m = re.fullmatch(r"/day-templates/([^/]+)", path)
        if m and req.method == "PUT":
            if not UUID.match(m.group(1)):
                return route.fulfill(status=400, content_type="application/json", body='{"error":{"code":"VALIDATION_FAILED"}}')
            old = self.templates.get(m.group(1))
            self.templates[m.group(1)] = {
                "id": m.group(1), "name": body["name"].strip(), "tag": body["tag"], "meals": body["meals"],
                "createdAt": old["createdAt"] if old else body.get("createdAt") or now_iso(), "updatedAt": now_iso(),
            }
            return ok(self.templates[m.group(1)])
        if m and req.method == "DELETE":
            if m.group(1) in self.templates:
                self.templates[m.group(1)]["deletedAt"] = now_iso()
            return ok({"success": True})
        if req.method == "POST" and path == "/client-errors":
            return route.fulfill(status=204, body="")
        return ok([])

    def sent(self, method, prefix):
        return [(p, b) for (m, p, b) in self.calls if m == method and p.startswith(prefix)]


def b64url(data):
    return base64.urlsafe_b64encode(data).decode().rstrip("=")


def device(browser, api, seed=None):
    """A signed-in device on the fake API (the same session pattern as cc_68.py), with nothing stored but `seed` (localStorage)."""
    ctx = browser.new_context(viewport={"width": 390, "height": 844})
    now = int(time.time())
    user = {"id": "00000000-0000-4000-8000-0000000000a1", "aud": "authenticated", "role": "authenticated", "email": EMAIL, "app_metadata": {"provider": "email", "providers": ["email"]}, "user_metadata": {"has_password": True}, "identities": [{"provider": "email"}], "created_at": "2026-10-01T00:00:00Z"}
    jwt = ".".join([b64url(b'{"alg":"HS256","typ":"JWT"}'), b64url(json.dumps({"sub": user["id"], "email": EMAIL, "aud": "authenticated", "role": "authenticated", "exp": now + 3600}).encode()), "sig"])
    session = {"access_token": jwt, "token_type": "bearer", "expires_in": 3600, "expires_at": now + 3600, "refresh_token": "refresh-sync", "user": user}
    host = SUPABASE.split("//")[1].split(".")[0].split(":")[0]
    ctx.add_cookies([{"name": f"sb-{host}-auth-token", "value": "base64-" + base64.b64encode(json.dumps(session).encode()).decode(), "url": BASE}])
    # The account has done the tour, turned the tips off, used Chia sẻ and seen Có gì mới: nothing covers the controls
    flags = {"onboarding": {"tourDone": True, "tipsOff": True, "seen": [], "used": ["share-day", "share-tip-try"], "whatsNewSeen": "2026-10-22b", "shareLater": 2}}
    stored = {"h1t_auth_current_email": EMAIL, f"h1t_settings_v1_{EMAIL}": json.dumps(flags), **(seed or {})}
    ctx.add_init_script("(() => { if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1'); const s = " + json.dumps(stored) + "; for (const k in s) { try { localStorage.setItem(k, s[k]); } catch (e) {} } })()")
    ctx.route("**/api/v1/**", api.handle)
    ctx.route(BASE + "/auth/session", lambda route: route.fulfill(status=204, body=""))
    ctx.route(SUPABASE + "/**", lambda route: route.fulfill(status=200, content_type="application/json", body="{}"))
    ctx.route(SUPABASE + "/auth/v1/user", lambda route: route.fulfill(status=200, content_type="application/json", body=json.dumps(user)))
    pg = ctx.new_page()
    # A live build shows the tips, Có gì mới and the share spotlight (h1t_onboarding_off counts only in a demo build); they come up
    # late and come back after Để sau, so they are put away whenever one is in the way of an action
    for name in ("Để sau", "Đã hiểu"):
        pg.add_locator_handler(pg.get_by_role("button", name=name, exact=True).locator("visible=true").first, lambda loc: loc.click(), no_wait_after=True)
    errors = []
    pg.on("pageerror", lambda e: errors.append(str(e)))
    return ctx, pg, errors


def home(pg):
    pg.goto(BASE + "/app", wait_until="domcontentloaded")
    pg.locator('[data-align-group="home-page"]').first.wait_for(state="visible", timeout=20000)
    pg.wait_for_timeout(1500)


def open_macros(pg):
    pg.goto(BASE + "/settings/targets/macros", wait_until="domcontentloaded")
    pg.locator("[role='group'][aria-label='Cách chia đa lượng']").wait_for(state="visible", timeout=20000)
    pg.wait_for_timeout(800)


def field(pg, label):
    f = pg.get_by_label(label, exact=True)
    return f.input_value() if f.count() else None


def hero_targets(pg):
    home(pg)
    text = pg.locator(HERO).inner_text()
    out = {}
    for name in ("Đạm", "Tinh bột", "Chất béo"):
        m = re.search(re.escape(name) + r"\s*\n?\s*(?:[\d.,]+|—)/([\d.]+) g", text)
        out[name] = int(m.group(1).replace(".", "")) if m else None
    return out


def template_cards(pg):
    pg.goto(BASE + "/explore/ngay-mau", wait_until="domcontentloaded")
    pg.wait_for_timeout(2000)
    return [re.sub(r"\s+", " ", c).strip() for c in pg.locator("a[href^='/explore/ngay-mau/']:visible").all_inner_texts()]


def ratio_grams(kcal, pct, per_gram):
    return int(int(kcal * pct / 100 + 0.5) / per_gram + 0.5)


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        api = FakeApi()

        # ---- A: device 1 sets a split and saves today as a template ----
        ctx1, pg1, errors1 = device(browser, api)
        open_macros(pg1)
        pg1.locator("[role='group'][aria-label='Cách chia đa lượng'] button:has-text('Tỉ lệ')").click()
        pg1.wait_for_timeout(200)
        for label, value in {"Tỉ lệ phần trăm đạm": 30, "Tỉ lệ phần trăm tinh bột": 40, "Tỉ lệ phần trăm chất béo": 30}.items():
            f = pg1.get_by_label(label, exact=True)
            f.click()
            f.fill(str(value))
            f.blur()
        pg1.locator("button:has-text('Lưu mục tiêu đa lượng')").click()
        pg1.wait_for_url("**/settings/targets", timeout=8000)
        pg1.wait_for_timeout(1500)
        puts = [b for _, b in api.sent("PUT", "/me/profile") if "macroMode" in b]
        check(len(puts) >= 1, f"A: device 1's save sends the split in PUT /me/profile ({len(puts)})")
        if puts:
            last = puts[-1]
            check(last.get("macroMode") == "ratios" and last.get("macroRatios") == {"proteinPct": 30, "carbsPct": 40, "fatPct": 30}, f"A: the split as sent ({last.get('macroMode')}, {last.get('macroRatios')})")
            check(all(key in last for key in SETTINGS), "A: all five settings travel together (null for one not set)")
        check(api.profile["macroMode"] == "ratios", "A: the server holds the split")

        # Today gets a food the way a person adds one (+ of a meal, pick, Thêm vào Bữa …), then the day is saved as a template
        home(pg1)
        pg1.locator('a[data-tour="meal-add"]:visible').first.click()
        pg1.wait_for_url(re.compile(r".*/add.*"), timeout=15000)
        row = pg1.locator("[data-food-row]:visible", has_text=FOODS[0]["name_vi"]).first
        row.wait_for(timeout=20000)
        row.click()
        pg1.get_by_role("button", name=re.compile("^Thêm vào Bữa")).locator("visible=true").first.click()
        pg1.wait_for_url(re.compile(r".*/app(\?.*)?$"), timeout=15000)
        pg1.wait_for_timeout(1500)
        pg1.get_by_role("button", name="Tùy chọn ngày").locator("visible=true").first.click()
        pg1.wait_for_timeout(500)
        pg1.get_by_role("dialog").locator("visible=true").first.get_by_role("button", name=re.compile("Lưu ngày này thành mẫu")).click()
        pg1.wait_for_timeout(700)
        save = pg1.get_by_role("dialog", name="Lưu ngày này thành mẫu")
        save.locator("input#save-day-name").fill("Ngày tập đồng bộ")
        save.get_by_role("button", name="Lưu mẫu").click()
        pg1.wait_for_timeout(1500)
        tpl_puts = api.sent("PUT", "/day-templates/")
        check(len(tpl_puts) == 1, f"A: the save sends one PUT /day-templates/<id> ({len(tpl_puts)})")
        tpl_id = tpl_puts[0][0].rsplit("/", 1)[1] if tpl_puts else ""
        check(UUID.match(tpl_id) is not None, f"A: the template's id is a uuid ({tpl_id})")
        check(tpl_puts and tpl_puts[0][1].get("name") == "Ngày tập đồng bộ" and tpl_puts[0][1]["meals"][0]["items"][0]["foodId"] == FOODS[0]["id"], "A: the PUT carries the name and the day's food")
        pg1.screenshot(path=str(SHOTS / "device1-saved.png"))

        # ---- B: device 2, same account, nothing stored ----
        ctx2, pg2, errors2 = device(browser, api)
        expect = {"Đạm": ratio_grams(2275, 30, 4), "Tinh bột": ratio_grams(2275, 40, 4), "Chất béo": ratio_grams(2275, 30, 9)}
        got = hero_targets(pg2)
        check(got == expect, f"B: device 2's Hôm nay targets are the split's grams ({got} vs {expect})")
        open_macros(pg2)
        mode = pg2.locator("[role='group'][aria-label='Cách chia đa lượng'] button[aria-pressed='true']")
        mode_text = mode.first.inner_text().strip() if mode.count() else ""
        values = [field(pg2, label) for label in ("Tỉ lệ phần trăm đạm", "Tỉ lệ phần trăm tinh bột", "Tỉ lệ phần trăm chất béo")]
        check("Tỉ lệ" in mode_text and values == ["30", "40", "30"], f"B: device 2's Mục tiêu đa lượng shows Tỉ lệ 30/40/30 ({mode_text!r}, {values})")
        pg2.screenshot(path=str(SHOTS / "device2-macros.png"))
        cards = template_cards(pg2)
        # The card's title is upper-cased by CSS
        check(len(cards) == 1 and "ngày tập đồng bộ" in cards[0].lower(), f"B: device 2's Ngày ăn mẫu lists the template ({cards})")
        pg2.screenshot(path=str(SHOTS / "device2-templates.png"))
        stored = json.loads(pg2.evaluate(f"() => localStorage.getItem('h1t_day_templates_v1_{EMAIL}') || '[]'"))
        check([t["id"] for t in stored] == [tpl_id], f"B: device 2 keeps it under the same id ({[t['id'] for t in stored]})")
        check(not api.sent("PUT", "/day-templates/")[1:], "B: device 2 uploads nothing (its first sync had no templates of its own)")

        # ---- C: device 2 deletes it; device 1 follows ----
        pg2.locator("a[href^='/explore/ngay-mau/']:visible").first.click()
        pg2.wait_for_url(re.compile(r".*/explore/ngay-mau/[^/]+$"), timeout=8000)
        pg2.wait_for_timeout(900)
        pg2.get_by_role("button", name="Xóa mẫu", exact=True).click()
        pg2.wait_for_timeout(600)
        pg2.get_by_role("dialog").locator("visible=true").first.get_by_role("button", name="Xóa mẫu").click()
        pg2.wait_for_url(re.compile(r".*/explore/ngay-mau$"), timeout=8000)
        pg2.wait_for_timeout(1200)
        check([p for p, _ in api.sent("DELETE", "/day-templates/")] == [f"/day-templates/{tpl_id}"], "C: device 2's Xóa mẫu sends DELETE /day-templates/<id>")
        check(api.live_templates() == [], "C: the server has no live template")
        home(pg1)
        cards = template_cards(pg1)
        check(cards == [], f"C: device 1 no longer lists it after a reload ({cards})")
        for tag, errors in (("device 1", errors1), ("device 2", errors2)):
            check(not errors, f"no page errors on {tag} ({errors[:2]})")
        ctx1.close()
        ctx2.close()

        # ---- D: a device with a split and a template from before the sync uploads them once ----
        fresh = FakeApi()
        legacy_template = {"id": "dt-1729000000000-abcde", "name": "Ngày nghỉ cũ", "tag": "nghi", "createdAt": "2026-10-20T01:00:00.000Z",
                           "meals": [{"slot": "lunch", "items": [{"foodId": FOODS[1]["id"], "servingLabel": "100 g", "grams": 150}]}]}
        # The stored profile as the app writes it (lib/profile), with a split set before it was synced: no targetsSynced, no date
        legacy_profile = {"sex": "male", "birthYear": 2000, "weightKg": 65, "goal": "maintain", "trainingMinutesDefault": 60, "periodMode": False,
                          "displayName": "Probe", "macroMode": "fixed", "macroFixed": {"proteinGrams": 150, "carbsGrams": 200, "fatGrams": 60}}
        seed = {f"h1t_day_templates_v1_{EMAIL}": json.dumps([legacy_template]), f"h1t_profile_v1_{EMAIL}": json.dumps(legacy_profile)}
        ctx3, pg3, errors3 = device(browser, fresh, seed)
        home(pg3)
        pg3.wait_for_timeout(1500)
        check(fresh.profile["macroMode"] == "fixed" and fresh.profile["macroFixed"] == {"proteinGrams": 150, "carbsGrams": 200, "fatGrams": 60}, f"D: the device-only split is uploaded ({fresh.profile['macroMode']}, {fresh.profile['macroFixed']})")
        uploaded = fresh.live_templates()
        check(len(uploaded) == 1 and uploaded[0]["name"] == "Ngày nghỉ cũ" and UUID.match(uploaded[0]["id"]) is not None and uploaded[0]["createdAt"] == legacy_template["createdAt"],
              f"D: the old template is uploaded under a new uuid, with its own date ({uploaded})")
        stored = json.loads(pg3.evaluate(f"() => localStorage.getItem('h1t_day_templates_v1_{EMAIL}') || '[]'"))
        check([t["id"] for t in stored] == [t["id"] for t in uploaded], f"D: the device keeps it under the new id ({[t['id'] for t in stored]})")
        before = len(fresh.calls)
        home(pg3)
        pg3.wait_for_timeout(1500)
        again = [(m, p) for (m, p, b) in fresh.calls[before:] if m in ("PUT", "DELETE")]
        check(again == [], f"D: a second load uploads nothing again ({again})")
        check(not errors3, f"no page errors on device 3 ({errors3[:2]})")
        ctx3.close()
        browser.close()

    if problems:
        print(f"\n{len(problems)} problem(s)")
        sys.exit(1)
    print("\nbackend_sync: all checks passed")


if __name__ == "__main__":
    main()
