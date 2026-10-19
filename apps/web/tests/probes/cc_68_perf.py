"""cc-68 (Part 5, no lag): numbers, not looks. Live-mode build only (NEXT_PUBLIC_API_MODE=live, NEXT_PUBLIC_SUPABASE_URL=http://localhost:54399),
not in probe:all. The API is a small fake in this file.
  R  re-renders per refresh: the diary is open on Hôm nay with a few entries; the page is refreshed five times the way the 60 s poll
     does it (focus -> outbox, GET /days/today and yesterday) and the React commits are counted (a DevTools hook counts them).
     Nothing changed on the server, so the answer is 0 commits per refresh.
  C  catalogue: 3,000 foods served by /foods, the CPU slowed 4x. Cold (download, map, copy to IndexedDB) and warm (read the copy)
     loads: the h1t:catalogue User Timing measure, and the long tasks (> 50 ms) of the page in the seconds after it.
Run with: LIVE_BUILD=1 ALIGN_BASE_URL=http://localhost:3112 npm run probe -- tests/probes/cc_68_perf.py
Pick parts with CC68_ONLY=R or C
"""
import json
import os
import re
import sys
from datetime import datetime, timedelta, timezone

from playwright.sync_api import sync_playwright
import _seed  # noqa: F401

if os.environ.get("LIVE_BUILD") != "1":
    print("skipped: set LIVE_BUILD=1 with a live-mode build")
    sys.exit(0)

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3112")
ONLY = set(filter(None, os.environ.get("CC68_ONLY", "").split(",")))
EMAIL = "probe68@example.com"
NOW_VN = datetime.now(timezone.utc) + timedelta(hours=7)
TODAY = NOW_VN.strftime("%Y-%m-%d")
YESTERDAY = (NOW_VN - timedelta(days=1)).strftime("%Y-%m-%d")
PROFILE = {"sex": "male", "birth_year": 2000, "weight_kg": 65, "goal": "maintain", "display_name": "Probe", "training_minutes_default": 60}
NUTRIENTS = {k: 1.5 for k in ["energy", "carbs", "protein", "fat", "fiber", "sugars", "sodium", "potassium", "calcium", "iron", "magnesium", "zinc",
                              "vitamin_c", "vitamin_a", "vitamin_d", "vitamin_e", "vitamin_k", "b1", "b2", "b3", "b6", "b9", "b12", "phosphorus", "selenium"]}
# A real row carries about 60 values; the rest are filled in so the payload is the size of the real catalogue
NUTRIENTS.update({f"nutrient_{i}": 0.25 * i for i in range(35)})
problems = []

# React calls a DevTools hook on every commit, in a production build too: the number of commits is the number of renders that reached the DOM
HOOK = """(() => { const h = { supportsFiber: true, renderers: new Map(), inject(r) { this.renderers.set(this.renderers.size + 1, r); return this.renderers.size; },
  onCommitFiberRoot() { window.__commits = (window.__commits || 0) + 1; }, onCommitFiberUnmount() {}, onPostCommitFiberRoot() {}, checkDCE() {}, on() {}, off() {}, emit() {}, sub() { return () => {}; } };
  Object.defineProperty(window, '__REACT_DEVTOOLS_GLOBAL_HOOK__', { value: h, configurable: true }); })()"""
LONG = """(() => { window.__long = []; try { new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__long.push([Math.round(e.startTime), Math.round(e.duration)]); }).observe({ type: 'longtask', buffered: true }); } catch (e) {} })()"""


def check(cond, msg):
    print(("[PASS] " if cond else "[FAIL] ") + msg)
    if not cond:
        problems.append(msg)


def food(i):
    return {"id": f"00000000-0000-4000-8000-{i:012d}", "name_vi": f"Món thử {i}", "category": "tinh_bot", "source": "USDA", "servings": [{"label": "100 g", "grams": 100}, {"label": "1 chén", "grams": 150}], "nutrients": dict(NUTRIENTS)}


class Api:
    def __init__(self, foods, entries):
        self.foods = foods
        self.entries = entries
        self.calls = []

    def handle(self, route):
        req = route.request
        path = req.url.split("/api/v1", 1)[1].split("?")[0]
        self.calls.append(f"{req.method} {path}")
        ok = lambda body, status=200: route.fulfill(status=status, content_type="application/json", body=json.dumps(body))
        if path == "/client-errors":
            return route.fulfill(status=204, body="")
        if req.method == "GET" and path == "/me":
            return ok({"data": PROFILE})
        if req.method == "GET" and path == "/foods":
            return ok({"data": {"items": self.foods, "total": len(self.foods)}})
        if req.method == "GET" and path == "/days":
            return ok({"error": {"code": "NOT_FOUND"}}, 404)
        m = re.fullmatch(r"/days/([\d-]+)", path)
        if req.method == "GET" and m:
            rows = [e for e in self.entries if e["date"] == m.group(1)]
            return ok({"data": {"date": m.group(1), "training_minutes": 0, "is_read_only": False, "meals": [{"slot": "all", "entries": rows}]}})
        return ok({"data": []})


def entry(i, date):
    return {"id": f"aaaaaaaa-aaaa-4aaa-8aaa-{i:012d}", "date": date, "food_id": food(1)["id"], "food_name": "Món thử 1", "grams": 100, "serving_label": "100 g",
            "meal_slot": "lunch", "calories": 120, "nutrients": {"protein": 2, "carbs": 20, "fat": 1, "fiber": 1}, "created_at": f"{date}T03:00:0{i % 10}.000Z"}


def device(browser, api, scripts):
    ctx = browser.new_context(viewport={"width": 390, "height": 844})
    ctx.add_init_script(f"try {{ localStorage.setItem('h1t_auth_current_email', '{EMAIL}'); }} catch (e) {{}}")
    for s in scripts:
        ctx.add_init_script(s)
    ctx.route("**/api/v1/**", api.handle)
    ctx.route(BASE + "/auth/session", lambda route: route.fulfill(status=204, body=""))
    return ctx, ctx.new_page()


def open_app(pg):
    pg.goto(BASE + "/app", wait_until="domcontentloaded")
    pg.locator('[data-align-group="home-page"]').first.wait_for(state="visible", timeout=40000)


def want(key):
    return not ONLY or key in ONLY


with sync_playwright() as p:
    browser = p.chromium.launch()

    if want("R"):
        api = Api([food(i) for i in range(1, 7)], [entry(i, TODAY) for i in range(1, 4)] + [entry(i, YESTERDAY) for i in range(4, 6)])
        ctx, pg = device(browser, api, [HOOK])
        open_app(pg)
        pg.wait_for_timeout(4000)
        n = len(api.calls)
        base = pg.evaluate("window.__commits || 0")
        check(base > 0, f"R: the commit counter works ({base} commits since load)")
        runs = 5
        counts = []
        for _ in range(runs):
            before = pg.evaluate("window.__commits || 0")
            pg.evaluate("window.dispatchEvent(new Event('focus'))")
            pg.wait_for_timeout(2500)
            counts.append(pg.evaluate("window.__commits || 0") - before)
        reads = len([c for c in api.calls[n:] if c.startswith("GET /days/")])
        check(reads >= runs, f"R: every refresh read the server's days ({reads} reads in {runs} refreshes)")
        print(f"MEASURE re-renders per refresh (commits): {counts}  mean {sum(counts) / runs:.1f}")
        check(sum(counts) == 0, f"R: refreshes with nothing new cause 0 commits ({counts})")
        ctx.close()

    if want("C"):
        foods = [food(i) for i in range(1, 3001)]
        api = Api(foods, [])
        ctx, pg = device(browser, api, [LONG])
        cdp = ctx.new_cdp_session(pg)
        cdp.send("Emulation.setCPUThrottlingRate", {"rate": 4})
        for label in ("cold", "warm"):
            if label == "cold":
                open_app(pg)
            else:
                pg.reload(wait_until="domcontentloaded")
                pg.locator('[data-align-group="home-page"]').first.wait_for(state="visible", timeout=40000)
            pg.wait_for_timeout(9000)
            measure = pg.evaluate("performance.getEntriesByName('h1t:catalogue').map((e) => [Math.round(e.startTime), Math.round(e.duration)])")
            long = pg.evaluate("window.__long")
            worst = max([d for _, d in long], default=0)
            print(f"MEASURE catalogue {label}: load {measure} ms (start, duration); long tasks {len(long)}, longest {worst} ms, total {sum(d for _, d in long)} ms; list {long}")
            check(bool(measure), f"C: {label}: the catalogue load was measured")
            if label == "cold":
                check(len(api.calls) > 0 and "GET /foods" in api.calls, "C: cold: the foods came from the server")
        check(api.calls.count("GET /foods") == 1, f"C: warm: the copy on the device was used, /foods was asked once ({api.calls.count('GET /foods')})")
        ctx.close()

    browser.close()

print(f"\n{len(problems)} problem(s)")
sys.exit(1 if problems else 0)
