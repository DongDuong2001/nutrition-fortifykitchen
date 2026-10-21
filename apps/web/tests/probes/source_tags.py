"""Source tags on /add (fix/source-tags). Live-mode build only (NEXT_PUBLIC_API_MODE=live,
NEXT_PUBLIC_SUPABASE_URL=https://probe68.supabase.co), not in probe:all: the demo catalogue has no cnf, asean or literature food.
/foods is a fake in this file with one food per source. At 360, 390 and 430 wide a search for each food shows its tag: Canada, ASEAN, Tài liệu,
VN and Chưa rõ (an unknown source), sits on one line (24 px high, nothing cut) and inside the row, and the long food name wraps
beside it instead of pushing it out.
Run with: LIVE_BUILD=1 ALIGN_BASE_URL=http://localhost:3101 npm run probe -- tests/probes/source_tags.py
"""
# PROBE_COVERS: app/(app)/add/**
import base64
import json
import os
import sys
import time
from pathlib import Path

from playwright.sync_api import sync_playwright
import _seed  # noqa: F401  (tour done, tips off, Có gì mới off)

if os.environ.get("LIVE_BUILD") != "1":
    print("skipped: set LIVE_BUILD=1 with a live-mode build")
    sys.exit(0)

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3101")
SHOTS = Path(__file__).resolve().parent.parent.parent / ".screenshots" / "source-tags"
SHOTS.mkdir(parents=True, exist_ok=True)
SUPABASE = "https://probe68.supabase.co"
EMAIL = "probetags@example.com"
PROFILE = {"sex": "male", "birth_year": 2000, "weight_kg": 65, "goal": "maintain", "display_name": "Probe", "training_minutes_default": 60}


def food(n, name, source):
    return {"id": f"00000000-0000-4000-8000-00000000000{n}", "name_vi": name, "category": "rau", "source": source, "servings": [{"label": "100 g", "grams": 100}], "nutrients": {"energy": 40, "carbs": 8, "protein": 2, "fat": 0.3}}


FOODS = [
    food(1, "Cá hồi Đại Tây Dương nuôi, phi lê nướng chín, không da", "cnf"),
    food(2, "Bông so đũa", "asean"),
    food(3, "Cá cơm cả xương", "asean"),
    food(4, "Rau dớn luộc", "literature"),
    food(5, "Rau muống luộc", "vn_fct"),
    food(6, "Một món không rõ nguồn", "openfoodfacts"),
]
WANT = {"Cá hồi Đại Tây Dương nuôi, phi lê nướng chín, không da": "Canada", "Bông so đũa": "ASEAN", "Cá cơm cả xương": "ASEAN", "Rau dớn luộc": "Tài liệu", "Rau muống luộc": "VN", "Một món không rõ nguồn": "Chưa rõ"}
problems = []


def check(cond, msg):
    print(("[PASS] " if cond else "[FAIL] ") + msg)
    if not cond:
        problems.append(msg)


def b64url(data):
    return base64.urlsafe_b64encode(data).decode().rstrip("=")


def session():
    now = int(time.time())
    user = {"id": "00000000-0000-4000-8000-0000000000b2", "aud": "authenticated", "role": "authenticated", "email": EMAIL, "app_metadata": {"provider": "email"}, "user_metadata": {"has_password": True}, "identities": [{"provider": "email"}], "created_at": "2026-10-01T00:00:00Z"}
    jwt = ".".join([b64url(b'{"alg":"HS256","typ":"JWT"}'), b64url(json.dumps({"sub": user["id"], "email": EMAIL, "aud": "authenticated", "role": "authenticated", "exp": now + 3600}).encode()), "sig"])
    data = {"access_token": jwt, "token_type": "bearer", "expires_in": 3600, "expires_at": now + 3600, "refresh_token": "refreshtags", "user": user}
    return user, "base64-" + base64.b64encode(json.dumps(data).encode()).decode()


def api(route):
    path = route.request.url.split("/api/v1", 1)[1].split("?")[0]
    if path == "/me":
        return route.fulfill(status=200, content_type="application/json", body=json.dumps({"data": PROFILE}))
    if path == "/foods":
        return route.fulfill(status=200, content_type="application/json", body=json.dumps({"data": {"items": FOODS, "total": len(FOODS)}}))
    if path == "/days":
        return route.fulfill(status=404, content_type="application/json", body='{"error":{"code":"NOT_FOUND"}}')
    route.fulfill(status=200, content_type="application/json", body=json.dumps({"data": []}))


JS = """(want) => [...document.querySelectorAll('[data-food-row]')].filter((r) => r.getBoundingClientRect().width > 0).flatMap((row) => {
  const name = Object.keys(want).find((n) => row.textContent.includes(n));
  if (!name) return [];
  const tag = [...row.querySelectorAll('span')].find((s) => s.className.includes('rounded-full') && s.className.includes('h-6'));
  if (!tag) return [{ name, tag: null }];
  const t = tag.getBoundingClientRect(), r = row.getBoundingClientRect();
  return [{ name, tag: tag.textContent.trim(), h: Math.round(t.height), lines: tag.getClientRects().length, cut: tag.scrollWidth > tag.clientWidth, inside: t.left >= r.left - 0.5 && t.right <= r.right + 0.5 }];
})"""

with sync_playwright() as p:
    browser = p.chromium.launch()
    for width in (360, 390, 430):
        ctx = browser.new_context(viewport={"width": width, "height": 844})
        ctx.add_init_script(f"try {{ localStorage.setItem('h1t_auth_current_email', '{EMAIL}'); }} catch (e) {{}}")
        user, cookie = session()
        ctx.add_cookies([{"name": "sb-probe68-auth-token", "value": cookie, "url": BASE}])
        ctx.route(SUPABASE + "/**", lambda route: route.fulfill(status=200, content_type="application/json", body="{}"))
        ctx.route(SUPABASE + "/auth/v1/user", lambda route, user=user: route.fulfill(status=200, content_type="application/json", body=json.dumps(user)))
        ctx.route("**/api/v1/**", api)
        ctx.route(BASE + "/auth/session", lambda route: route.fulfill(status=204, body=""))
        pg = ctx.new_page()
        pg.goto(BASE + "/add", wait_until="networkidle")
        pg.locator("[data-food-row]:visible").first.wait_for(timeout=20000)
        search = pg.get_by_role("searchbox", name="Tìm món").locator("visible=true").first
        for name, want in WANT.items():
            search.fill(name)
            pg.wait_for_timeout(600)
            rows = pg.evaluate(JS, {name: want})
            check(len(rows) >= 1, f"{width}: a search for {name!r} lists it")
            for r in rows[:1]:
                check(r["tag"] == want, f"{width}: {name} → {r['tag']!r} (want {want!r})")
                check(r["tag"] is not None and r["h"] == 24 and r["lines"] == 1 and not r["cut"] and r["inside"], f"{width}: …on one line, whole, inside the row ({r})")
            for _ in range(3):
                tip = pg.get_by_role("button", name="Đã hiểu").locator("visible=true")
                if tip.count() == 0:
                    break
                tip.first.click()
                pg.wait_for_timeout(400)
            if width == 390 and name in ("Cá hồi Đại Tây Dương nuôi, phi lê nướng chín, không da", "Rau dớn luộc"):
                pg.screenshot(path=str(SHOTS / f"add-390-{want.lower().replace(' ', '-')}.png"))
        search.fill("Cá")
        pg.wait_for_timeout(600)
        pg.screenshot(path=str(SHOTS / f"add-{width}.png"))
        ctx.close()
    browser.close()

print()
if problems:
    print(f"{len(problems)} problem(s):")
    for msg in problems:
        print(" -", msg)
    sys.exit(1)
print("all pass")
