"""feat/level-ui in live mode: the Level comes from GET /me (level, levelSeen), there is no coach object and no join screen.

Live-mode build only, like backend_sync.py (NEXT_PUBLIC_API_MODE=live, NEXT_PUBLIC_SUPABASE_URL=https://probe68.supabase.co, any anon
key); it skips on the demo build of probe:all. The API is a fake in this file.
  A  GET /me without the Level fields, and with level 0: the header shows the grey LEVEL 0 mini badge, never "+ HLV"
  B  level 3, levelSeen 2: the celebration names no coach ("Bạn vừa được nâng lên Level 3."); ✕ sends PUT /me/profile with levelSeen 3
     and never `level`; the header shows Level 3; a reload does not play it again
  C  level 1, levelSeen 3: the calm card "Level của bạn đã đổi thành 1", no celebration; closing it sends levelSeen 1
Screenshots: .screenshots/level-ui/header-L0-live-390.png, celebration-live-390.png, card-lowered-live-390.png.
Run with: LIVE_BUILD=1 ALIGN_BASE_URL=http://localhost:3108 npm run probe -- tests/probes/level_ui_live.py
"""
# PROBE_COVERS: app/(app)/(tabs)/app/** components/coaching/** components/profile/level-badge.tsx
import base64
import json
import os
import re
import sys
import time

from playwright.sync_api import sync_playwright
import _seed  # noqa: F401  (tour done, tips off, Có gì mới off)

if os.environ.get("LIVE_BUILD") != "1":
    print("skipped: set LIVE_BUILD=1 with a live-mode build")
    sys.exit(0)

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3101")
SUPABASE = os.environ.get("PROBE_SUPABASE_ORIGIN", "https://probe68.supabase.co")
EMAIL = "probe-level@example.com"
SHOTS = os.path.join(os.path.dirname(__file__), "..", "..", ".screenshots", "level-ui")
problems, notes = [], []


def check(cond, msg):
    (notes if cond else problems).append(("ok: " if cond else "") + msg)
    return cond


def squash(t):
    return re.sub(r"\s+", " ", t or "").strip()


class FakeApi:
    """One account: the profile with or without level / levelSeen (migration 000021), an empty day."""

    def __init__(self, level=None, seen=None):
        self.profile = {"sex": "male", "birth_year": 2000, "weight_kg": 65, "goal": "maintain", "display_name": "Probe", "training_minutes_default": 60, "updatedAt": "2026-10-23T03:00:00Z"}
        if level is not None:
            self.profile.update(level=level, levelSeen=seen)
        self.calls = []

    def handle(self, route):
        req = route.request
        path = req.url.split("/api/v1", 1)[1].split("?")[0]
        body = json.loads(req.post_data or "{}") if req.method in ("PUT", "POST", "PATCH") else {}
        self.calls.append((req.method, path, body))
        ok = lambda data, status=200: route.fulfill(status=status, content_type="application/json", body=json.dumps({"data": data}))
        if req.method == "GET" and path == "/me":
            return ok(self.profile)
        if req.method == "PUT" and path == "/me/profile":
            if "level" in body:
                return route.fulfill(status=400, content_type="application/json", body='{"error":{"code":"VALIDATION_FAILED","message":"level is set by your coach"}}')
            if "levelSeen" in body and "level" in self.profile:
                self.profile["levelSeen"] = min(body["levelSeen"], self.profile["level"])
            return ok(self.profile)
        m = re.fullmatch(r"/days/([\d-]+)", path)
        if req.method == "GET" and m:
            return ok({"date": m.group(1), "training_minutes": 60, "is_read_only": False, "meals": [{"slot": "all", "entries": []}]})
        if req.method == "GET" and path == "/foods":
            return ok({"items": [], "total": 0})
        if req.method == "POST" and path == "/client-errors":
            return route.fulfill(status=204, body="")
        return ok([])

    def puts(self):
        return [b for (m, p, b) in self.calls if m == "PUT" and p == "/me/profile"]


def b64url(data):
    return base64.urlsafe_b64encode(data).decode().rstrip("=")


def device(browser, api):
    """A signed-in phone on the fake API (the session pattern of backend_sync.py / cc_68.py)."""
    ctx = browser.new_context(viewport={"width": 390, "height": 844})
    now = int(time.time())
    user = {"id": "00000000-0000-4000-8000-0000000000b2", "aud": "authenticated", "role": "authenticated", "email": EMAIL, "app_metadata": {"provider": "email", "providers": ["email"]}, "user_metadata": {"has_password": True}, "identities": [{"provider": "email"}], "created_at": "2026-10-01T00:00:00Z"}
    jwt = ".".join([b64url(b'{"alg":"HS256","typ":"JWT"}'), b64url(json.dumps({"sub": user["id"], "email": EMAIL, "aud": "authenticated", "role": "authenticated", "exp": now + 3600}).encode()), "sig"])
    session = {"access_token": jwt, "token_type": "bearer", "expires_in": 3600, "expires_at": now + 3600, "refresh_token": "refresh-level", "user": user}
    host = SUPABASE.split("//")[1].split(".")[0].split(":")[0]
    ctx.add_cookies([{"name": f"sb-{host}-auth-token", "value": "base64-" + base64.b64encode(json.dumps(session).encode()).decode(), "url": BASE}])
    # Tour done, tips off, Chia sẻ used, Có gì mới seen up to the newest release: nothing else opens over Hôm nay
    flags = {"onboarding": {"tourDone": True, "tipsOff": True, "seen": [], "used": ["share-day", "share-tip-try"], "whatsNewSeen": "2026-10-23a", "shareLater": 2}}
    stored = {"h1t_auth_current_email": EMAIL, f"h1t_settings_v1_{EMAIL}": json.dumps(flags)}
    ctx.add_init_script("(() => { if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1'); const s = " + json.dumps(stored) + "; for (const k in s) { try { localStorage.setItem(k, s[k]); } catch (e) {} } })()")
    ctx.route("**/api/v1/**", api.handle)
    ctx.route(BASE + "/auth/session", lambda route: route.fulfill(status=204, body=""))
    ctx.route(SUPABASE + "/**", lambda route: route.fulfill(status=200, content_type="application/json", body="{}"))
    ctx.route(SUPABASE + "/auth/v1/user", lambda route: route.fulfill(status=200, content_type="application/json", body=json.dumps(user)))
    pg = ctx.new_page()
    for name in ("Để sau", "Đã hiểu"):
        pg.add_locator_handler(pg.get_by_role("button", name=name, exact=True).locator("visible=true").first, lambda loc: loc.click(), no_wait_after=True)
    errors = []
    pg.on("pageerror", lambda e: errors.append(str(e)))
    return ctx, pg, errors


def home(pg):
    pg.goto(BASE + "/app", wait_until="domcontentloaded")
    pg.locator('[data-align-group="home-page"]').first.wait_for(state="visible", timeout=20000)
    pg.wait_for_timeout(1500)


def header_level(pg):
    b = pg.locator("[data-header-level] >> visible=true").first
    return b.locator("[data-level-badge]").get_attribute("data-level-badge") if b.count() else None


with sync_playwright() as p:
    os.makedirs(SHOTS, exist_ok=True)
    browser = p.chromium.launch()

    # A: Level 0, without the fields and with level 0
    for label, api in (("no fields", FakeApi()), ("level 0", FakeApi(0, 0))):
        ctx, pg, errors = device(browser, api)
        home(pg)
        check(header_level(pg) == "0", f"A {label}: the header shows the grey LEVEL 0 mini badge ({header_level(pg)})")
        check(pg.get_by_role("link", name="Nhập mã huấn luyện viên").count() == 0 and "+ HLV" not in pg.inner_text("header"), f"A {label}: no '+ HLV' (no join screen in live mode)")
        check(pg.locator("[data-level-up]").count() == 0 and pg.locator("[data-level-card]").count() == 0, f"A {label}: no celebration, no card")
        if label == "level 0":
            pg.screenshot(path=os.path.join(SHOTS, "header-L0-live-390.png"), clip={"x": 0, "y": 0, "width": 390, "height": 120})
        check(errors == [], f"A {label}: no page errors {errors[:1]}")
        ctx.close()

    # B: a promotion with no coach object
    api = FakeApi(3, 2)
    ctx, pg, errors = device(browser, api)
    home(pg)
    stage = pg.locator("[data-level-up]")
    stage.wait_for(state="attached", timeout=10000)
    check(header_level(pg) == "2", f"B: the header keeps Level 2 while it plays ({header_level(pg)})")
    pg.wait_for_timeout(4200)
    pg.evaluate("() => document.querySelector('[data-level-up]').getAnimations({ subtree: true }).forEach((a) => { a.pause(); a.currentTime = 6000; })")
    text = squash(pg.get_by_role("dialog", name=re.compile("Lên Level 3")).inner_text())
    check("Bạn vừa được nâng lên Level 3." in text and "HLV" not in text.replace("Hỏi HLV", ""), f"B: no coach is named ({text[:90]!r})")
    check("14 → 18" in text, f"B: the reward counts 14 → 18")
    pg.screenshot(path=os.path.join(SHOTS, "celebration-live-390.png"))
    pg.get_by_role("dialog").get_by_role("button", name="Đóng").click()
    pg.wait_for_timeout(1500)
    puts = api.puts()
    check(any(b.get("levelSeen") == 3 for b in puts), f"B: ✕ sends levelSeen 3 ({[b.get('levelSeen') for b in puts]})")
    check(all("level" not in b for b in puts), "B: the web never sends level")
    check(header_level(pg) == "3", f"B: the header shows Level 3 ({header_level(pg)})")
    home(pg)
    pg.wait_for_timeout(3000)
    check(stage.count() == 0, "B: not again after a reload")
    check(errors == [], f"B: no page errors {errors[:1]}")
    ctx.close()

    # C: a lower Level: the calm card, no coach named
    api = FakeApi(1, 3)
    ctx, pg, errors = device(browser, api)
    home(pg)
    pg.wait_for_timeout(2500)
    card = pg.locator("[data-level-card]")
    check(pg.locator("[data-level-up]").count() == 0 and card.count() == 1 and squash(card.inner_text()).startswith("Level của bạn đã đổi thành 1"), f"C: the calm card ({squash(card.inner_text()) if card.count() else None!r})")
    pg.screenshot(path=os.path.join(SHOTS, "card-lowered-live-390.png"), clip={"x": 0, "y": 0, "width": 390, "height": 260})
    card.get_by_role("button", name="Đóng thông báo").click()
    pg.wait_for_timeout(1500)
    check(any(b.get("levelSeen") == 1 for b in api.puts()), f"C: closing sends levelSeen 1 ({[b.get('levelSeen') for b in api.puts()]})")
    ctx.close()
    browser.close()

for line in notes:
    print(line)
for line in problems:
    print("FAIL: " + line)
print(f"{len(notes)} ok, {len(problems)} FAIL")
sys.exit(1 if problems else 0)
