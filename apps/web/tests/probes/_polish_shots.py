"""fix/polish-1020: screenshots at 390 and 1440 of the screens this PR touches, for the PR note: /add, the portion sheet, and Hôm nay with
an update waiting ("Có bản mới" above the bottom nav). Not a probe (probe:all skips names that start with _).
Run with: ALIGN_BASE_URL=http://localhost:3101 python3 tests/probes/_polish_shots.py
Writes docs/screenshots/polish-1020/<name>-<390|1440>.png
"""
import json
import os
from pathlib import Path

from playwright.sync_api import sync_playwright

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3100")
OUT = Path(__file__).resolve().parents[4] / "docs" / "screenshots" / "polish-1020"
OUT.mkdir(parents=True, exist_ok=True)
SETTINGS_KEY = "h1t_settings_v1_demo"
SEED = {"installPrompt": {"dismissCount": 0, "snoozeUntil": 0, "done": True, "firstSeenIso": "2026-01-01"}}
INIT = f"""
try {{
  localStorage.setItem('h1t_onboarding_off', '1');
  localStorage.setItem('h1t_whats_new_off', '1');
  localStorage.setItem('h1t_demo_v1', '1');
  localStorage.setItem('h1t_training_prefs_v1_demo', '{{"size":null,"asked":true,"own":[]}}');
  localStorage.setItem('h1t_profile_v1_demo', JSON.stringify({{sex:'male',birthYear:2003,weightKg:65,goal:'maintain',periodMode:false,trainingMinutesDefault:60,displayName:'',hintSeen:true}}));
  if (localStorage.getItem('{SETTINGS_KEY}') === null) localStorage.setItem('{SETTINGS_KEY}', {json.dumps(json.dumps(SEED))});
}} catch (e) {{}}
"""
SIZES = {390: dict(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True), 1440: dict(viewport={"width": 1440, "height": 900}, device_scale_factor=1)}


def context(browser, width):
    ctx = browser.new_context(**SIZES[width])
    ctx.add_init_script(INIT)
    return ctx


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for width in (390, 1440):
            # /add and the portion sheet
            ctx = context(browser, width)
            pg = ctx.new_page()
            pg.goto(BASE + "/app", wait_until="networkidle")
            pg.locator('[data-testid="meal-header"]:visible').first.wait_for(state="visible", timeout=10000)
            pg.wait_for_timeout(1500)
            (pg.locator("#mobile-add-fab") if width == 390 else pg.locator("#desktop-add-btn")).click()
            field = pg.locator("[data-testid=food-search]:visible").first
            field.wait_for(state="visible", timeout=8000)
            pg.wait_for_timeout(1200)
            pg.screenshot(path=str(OUT / f"add-{width}.png"))
            field.fill("chuối")
            row = pg.locator("button[data-food-row]:visible").filter(has_text="Chuối").first
            row.wait_for(state="visible", timeout=6000)
            pg.wait_for_timeout(500)
            row.click()
            pg.locator('[data-testid="portion-add"]:visible').first.wait_for(state="visible", timeout=6000)
            pg.wait_for_timeout(900)
            pg.screenshot(path=str(OUT / f"portion-{width}.png"))
            ctx.close()

            # Hôm nay with an update waiting: a second sw.js (the first is served as it is) makes the browser find an update
            ctx = context(browser, width)
            calls = []

            def sw_route(route):
                calls.append(1)
                resp = route.fetch()
                body = resp.text()
                if len(calls) > 1:
                    body = body.replace('const VERSION = "', 'const VERSION = "x', 1)
                route.fulfill(response=resp, body=body)

            ctx.route("**/sw.js", sw_route)
            pg = ctx.new_page()
            pg.goto(BASE + "/app", wait_until="networkidle")
            pg.evaluate("() => navigator.serviceWorker.ready.then(() => true)")
            pg.reload(wait_until="networkidle")
            pg.wait_for_timeout(1500)
            pg.evaluate("() => navigator.serviceWorker.getRegistration().then((r) => r.update())")
            toast = pg.locator(".m-toast", has_text="Có bản mới").first
            toast.wait_for(state="visible", timeout=15000)
            pg.wait_for_timeout(900)
            pg.screenshot(path=str(OUT / f"home-update-{width}.png"))
            ctx.close()
        browser.close()
    print("written", OUT)


main()
