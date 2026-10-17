"""cc-50: what the catalogue costs a page load, before and after the device copy (lib/catalog-cache). REPORT probe.

Live-mode build only (as cc_49), not in probe:all. 390 x 844, Fast 4G for the page itself through CDP (40 ms latency,
9 Mbps down, 1.5 Mbps up). /foods is mocked like production on 18/10: 683 foods (~800 bytes each, ~137 kB compressed over
two pages), each answer delayed by server time (180 ms, production's median) + one round trip + its compressed size at
9 Mbps (a fulfilled route skips CDP throttling, so the delay is added here).
Per run: a first visit (nothing on the device) and a second visit in a new tab of the same browser profile.
- /app: ms until Hôm nay is shown, and the /foods requests made in the first 5 s with their compressed bytes
- /explore/tinh_bot: ms until its list is shown (the screen waits for the catalogue)
Run with: LIVE_BUILD=1 ALIGN_BASE_URL=http://localhost:3101 npm run probe -- tests/probes/cc_50_catalog_timing.py
"""
import asyncio
import json
import os
import re
import sys
import time

from playwright.async_api import async_playwright

if os.environ.get("LIVE_BUILD") != "1":
    print("skipped: set LIVE_BUILD=1 with a live-mode build")
    sys.exit(0)

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3101")
LABEL = os.environ.get("CC50_LABEL", "this build")
EMAIL = "timing@example.com"
RTT_S = 0.040
SERVER_S = 0.180
DOWN_BPS = 9_000_000 / 8
TOTAL = 683
PROFILE = {"sex": "male", "birth_year": 2000, "weight_kg": 65, "goal": "maintain", "display_name": "Probe", "training_minutes_default": 60}
NUTRIENTS = ["energy", "protein", "carbs", "fat", "fiber", "sodium", "potassium", "calcium", "magnesium", "iron", "zinc", "phosphorus",
             "vitamin_a", "vitamin_c", "vitamin_d", "vitamin_e", "vitamin_k", "b1", "b2", "b3", "b6", "b9", "b12", "selenium", "copper"]


def food(i):
    return {
        "id": f"00000000-0000-4000-8000-{i:012d}",
        "name_vi": f"Món thử số {i} nấu kiểu nhà",
        "category": "tinh_bot" if i % 6 == 0 else "khac",
        "source": "USDA",
        "source_id": f"usda-{100000 + i}",
        "servings": [{"label": "100 g", "grams": 100}, {"label": "1 chén", "grams": 150}],
        "nutrients": {k: round(1 + (i * 7 + j) % 97 * 0.37, 2) for j, k in enumerate(NUTRIENTS)},
    }


FOODS = [food(i) for i in range(TOTAL)]


async def handler(route, stats):
    req = route.request
    path = req.url.split("/api/v1", 1)[1].split("?")[0]
    if path == "/foods":
        q = req.url.split("?", 1)[1] if "?" in req.url else ""
        limit = int(re.search(r"limit=(\d+)", q).group(1)) if "limit=" in q else 50
        page = int(re.search(r"page=(\d+)", q).group(1)) if "page=" in q else 1
        body = json.dumps({"data": {"items": FOODS[(page - 1) * limit: page * limit], "total": TOTAL}})
        wire = len(body) // 4  # zstd on production: ~4x on this JSON
        stats["foods"].append((time.time(), wire))
        await asyncio.sleep(SERVER_S + RTT_S + wire / DOWN_BPS)
        return await route.fulfill(status=200, content_type="application/json", body=body)
    if path == "/me":
        return await route.fulfill(status=200, content_type="application/json", body=json.dumps({"data": PROFILE}))
    if path.startswith("/days/"):
        return await route.fulfill(status=200, content_type="application/json", body=json.dumps({"data": {"meals": []}}))
    await route.fulfill(status=200, content_type="application/json", body=json.dumps({"data": []}))


async def visit(ctx, url, ready, stats):
    pg = await ctx.new_page()
    cdp = await ctx.new_cdp_session(pg)
    await cdp.send("Network.enable")
    await cdp.send("Network.emulateNetworkConditions", {"offline": False, "latency": RTT_S * 1000, "downloadThroughput": DOWN_BPS, "uploadThroughput": 1_500_000 / 8})
    stats["foods"].clear()
    t0 = time.time()
    await pg.goto(BASE + url, wait_until="commit")
    await pg.locator(ready).first.wait_for(state="visible", timeout=60000)
    shown = (time.time() - t0) * 1000
    await pg.wait_for_timeout(5000)
    requests = [r for r in stats["foods"] if r[0] - t0 < 5]
    await pg.close()
    return shown, len(requests), sum(w for _, w in requests)


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        rows = []
        for url, ready, name in [
            ("/app", '[data-align-group="home-page"]', "/app Hôm nay shown"),
            ("/explore/tinh_bot", 'a[href^="/foods/00000000"]', "/explore/tinh_bot list shown"),
        ]:
            ctx = await browser.new_context(viewport={"width": 390, "height": 844})
            await ctx.add_init_script(
                f"try {{ localStorage.setItem('h1t_auth_current_email', '{EMAIL}'); localStorage.setItem('h1t_onboarding_off', '1'); localStorage.setItem('h1t_whats_new_off', '1'); }} catch (e) {{}}"
            )
            stats = {"foods": []}
            def api(s):
                async def handle(route):
                    await handler(route, s)
                return handle

            await ctx.route("**/api/v1/**", api(stats))
            await ctx.route(BASE + "/auth/session", lambda route: route.fulfill(status=204, body=""))
            for visit_name in ("first visit", "second visit (new tab)"):
                ms, n, wire = await visit(ctx, url, ready, stats)
                rows.append((name, visit_name, ms, n, wire))
            await ctx.close()
        await browser.close()
    print(f"[REPORT] {LABEL}: Fast 4G (40 ms, 9 Mbps), 683 foods")
    for name, visit_name, ms, n, wire in rows:
        print(f"[REPORT] {name:32} {visit_name:24} {ms:6.0f} ms   /foods requests: {n}, {wire / 1024:.0f} kB on the wire")


asyncio.run(main())
