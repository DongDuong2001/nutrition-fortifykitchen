"""fix/macro-split-save: "Chia theo đa lượng" keeps the saved split (coach's report 21/10).

The split (macroMode, macroRatios, macroFixed, customEnergyKcal) lives on the device only; the API has no columns for it yet.
Two bugs wiped it: adopting the server's /me profile on load and on route changes replaced the stored profile, and the form
read the profile before the store had loaded it, so it opened with 25/55/20.

For each mode (Tỉ lệ 30/40/30, then Cố định 150/200/60 g):
  save on Mục tiêu đa lượng → reload → Hôm nay → back to Mục tiêu đa lượng: the form still shows the saved values, and
  Hôm nay's Đạm, Tinh bột and Chất béo targets are the saved split's grams.

Demo build (probe:all): the stored profile is the demo one. With LIVE_BUILD=1 on a live build (NEXT_PUBLIC_API_MODE=live, a
non-dummy NEXT_PUBLIC_SUPABASE_URL such as http://localhost:54399) the same flow runs signed in, with a fake API whose GET /me
has none of the macro fields, so adoptServerProfile runs on every load and route change.
Run with: npm run probe -- tests/probes/macro-split.py   (LIVE_BUILD=1 for the live-like pass)
"""
# PROBE_COVERS: app/(app)/settings/targets/macros/** app/(app)/(tabs)/app/** components/settings/macro-targets-screen.tsx lib/profile.ts lib/diary-store.tsx
import base64
import json
import os
import re
import sys
import time
from pathlib import Path

import _demo  # noqa: F401
from playwright.sync_api import sync_playwright

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3101")
LIVE = os.environ.get("LIVE_BUILD") == "1"
SUPABASE = os.environ.get("PROBE_SUPABASE_ORIGIN", "http://localhost:54399")
NOW = "2026-10-15T10:00:00+07:00"
SHOTS = Path(__file__).resolve().parent.parent.parent / ".screenshots"
SHOTS.mkdir(exist_ok=True)
MACROS = "/settings/targets/macros"
HERO = "section[aria-label='Tổng kcal và dinh dưỡng đa lượng']"
# GET /me of a live account: no macro fields (the API has no columns for them)
PROFILE = {"sex": "male", "birth_year": 2003, "weight_kg": 65, "goal": "maintain", "display_name": "Probe", "training_minutes_default": 60}
problems = []


def check(cond, msg):
    print(("[PASS] " if cond else "[FAIL] ") + msg)
    if not cond:
        problems.append(msg)


def fake_session(ctx):
    """A signed-in browser for a live build whose Supabase answers only /auth/v1/user (mocked)."""
    user = {"id": "u-1", "aud": "authenticated", "role": "authenticated", "email": "probe@example.com", "app_metadata": {"provider": "email", "providers": ["email"]}, "user_metadata": {}, "identities": [], "created_at": "2026-01-01T00:00:00Z"}
    ctx.route(SUPABASE + "/auth/v1/**", lambda route: route.fulfill(status=200, content_type="application/json", body=json.dumps(user)))
    session = {"access_token": "probe.jwt.token", "refresh_token": "probe-refresh", "expires_in": 3600, "expires_at": int(time.time()) + 3600, "token_type": "bearer", "user": user}
    value = "base64-" + base64.urlsafe_b64encode(json.dumps(session).encode()).decode().rstrip("=")
    host = SUPABASE.split("//")[1].split(":")[0].split(".")[0]
    ctx.add_cookies([{"name": f"sb-{host}-auth-token", "value": value, "url": BASE}])


def mock_api(ctx):
    def handler(route):
        path = route.request.url.split("/api/v1", 1)[1].split("?")[0]
        if path == "/me":
            body = {"data": PROFILE}
        elif path == "/foods":
            body = {"data": {"items": [], "total": 0}}
        elif path.startswith("/days/"):
            body = {"data": {"meals": []}}
        else:
            body = {"data": []}
        route.fulfill(status=200, content_type="application/json", body=json.dumps(body))

    ctx.route("**/api/v1/**", handler)


def new_page(browser):
    ctx = browser.new_context(viewport={"width": 390, "height": 844})
    if LIVE:
        _demo.enable(False)
        fake_session(ctx)
        mock_api(ctx)
    pg = ctx.new_page()
    pg.clock.set_fixed_time(NOW)
    return ctx, pg


def open_macros(pg):
    pg.goto(BASE + MACROS, wait_until="networkidle")
    try:
        pg.locator("h1:has-text('Mục tiêu đa lượng')").first.wait_for(state="visible", timeout=10000)
    except Exception:
        pg.screenshot(path=str(SHOTS / "macro-split-stuck.png"))
        raise RuntimeError(f"Mục tiêu đa lượng did not open (at {pg.url})")
    pg.locator("[role='group'][aria-label='Cách chia đa lượng']").wait_for(state="visible", timeout=10000)
    pg.wait_for_timeout(300)


def set_field(pg, label, value):
    field = pg.get_by_label(label, exact=True)
    field.click()
    field.fill(str(value))
    field.blur()
    pg.wait_for_timeout(100)


def field_value(pg, label):
    field = pg.get_by_label(label, exact=True)
    return field.input_value() if field.count() else None


def hero_targets(pg):
    """Hôm nay's hero: the target grams of Đạm, Tinh bột and Chất béo ("62/143 g" → 143)."""
    pg.goto(BASE + "/app", wait_until="networkidle")
    hero = pg.locator(HERO)
    hero.wait_for(state="visible", timeout=10000)
    pg.wait_for_timeout(500)
    text = hero.inner_text()
    out = {}
    for name in ("Đạm", "Tinh bột", "Chất béo"):
        m = re.search(re.escape(name) + r"\s*\n?\s*(?:[\d.,]+|—)/([\d.]+) g", text)
        out[name] = int(m.group(1).replace(".", "")) if m else None
    return out


def save(pg):
    pg.locator("button:has-text('Lưu mục tiêu đa lượng')").click()
    pg.wait_for_url("**/settings/targets", timeout=5000)
    pg.wait_for_timeout(300)


def ratio_grams(kcal, pct, per_gram):
    # lib/targets calculateMacrosFromRatios: kcal rounded first, then grams (JS Math.round: halves go up)
    part = int(kcal * pct / 100 + 0.5)
    return int(part / per_gram + 0.5)


def run_mode(browser, mode):
    ctx, pg = new_page(browser)
    open_macros(pg)
    if mode == "ratios":
        pg.locator("[role='group'][aria-label='Cách chia đa lượng'] button:has-text('Tỉ lệ')").click()
        fields = {"Tỉ lệ phần trăm đạm": 30, "Tỉ lệ phần trăm tinh bột": 40, "Tỉ lệ phần trăm chất béo": 30}
        kcal = 2275  # the sample profile's energy target (65 kg, Giữ cân: 35 kcal/kg)
        expect = {"Đạm": ratio_grams(kcal, 30, 4), "Tinh bột": ratio_grams(kcal, 40, 4), "Chất béo": ratio_grams(kcal, 30, 9)}
    else:
        pg.locator("[role='group'][aria-label='Cách chia đa lượng'] button:has-text('Cố định')").click()
        fields = {"Số gram đạm cố định": 150, "Số gram tinh bột cố định": 200, "Số gram chất béo cố định": 60}
        expect = {"Đạm": 150, "Tinh bột": 200, "Chất béo": 60}
    pg.wait_for_timeout(200)
    for label, value in fields.items():
        set_field(pg, label, value)
    save(pg)

    pg.reload(wait_until="networkidle")
    pg.wait_for_timeout(500)
    got = hero_targets(pg)
    check(got == expect, f"{mode}: Hôm nay's targets follow the saved split after a reload ({got} vs {expect})")

    open_macros(pg)
    pressed = pg.locator("[role='group'][aria-label='Cách chia đa lượng'] button[aria-pressed='true']").inner_text().strip()
    check(pressed == ("Tỉ lệ" if mode == "ratios" else "Cố định"), f"{mode}: the form opens on the saved mode ({pressed})")
    shown = {label: field_value(pg, label) for label in fields}
    check(shown == {k: str(v) for k, v in fields.items()}, f"{mode}: the form opens with the saved values ({shown})")
    pg.screenshot(path=str(SHOTS / f"macro-split-{mode}-{'live' if LIVE else 'demo'}-390.png"), full_page=True)

    # Straight to the form on a fresh load (the store hydrates under it): still the saved values, never 25/55/20
    pg.goto(BASE + MACROS, wait_until="commit")
    pg.locator("[role='group'][aria-label='Cách chia đa lượng']").wait_for(state="visible", timeout=10000)
    pg.wait_for_timeout(1500)  # adoptServerProfile answers after the first paint in live mode
    shown = {label: field_value(pg, label) for label in fields}
    check(shown == {k: str(v) for k, v in fields.items()}, f"{mode}: a cold load of the form shows the saved values ({shown})")
    got = hero_targets(pg)
    check(got == expect, f"{mode}: Hôm nay still follows the split after the route changes ({got})")
    ctx.close()


def main():
    print(f"macro-split: {'live-like (LIVE_BUILD=1)' if LIVE else 'demo'} pass on {BASE}")
    with sync_playwright() as p:
        browser = p.chromium.launch()
        run_mode(browser, "ratios")
        run_mode(browser, "fixed")
        browser.close()
    if problems:
        print(f"macro-split: {len(problems)} problem(s)", file=sys.stderr)
        sys.exit(1)
    print("ALL OK")


if __name__ == "__main__":
    main()
