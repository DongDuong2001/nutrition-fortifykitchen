"""cc-55: motion cost on a phone. Mobile emulation at 390 x 844, CPU throttled 4x (CDP), demo build.

Traces each interaction with the Chrome tracer and reports frames (presented / dropped), long tasks over 50 ms on the
renderer main thread, and Layout / Paint / style-recalc counts:
  1. Hôm nay: tap + -> /add      2. back (browser Back) -> Hôm nay
  3. open and close the calendar sheet on Hôm nay      4. open and close the meal switcher on /add
Then a load check on /app (Lighthouse-style, measured in the page): FCP, LCP, CLS and TBT (long-task time over 50 ms
after FCP), with the same 4x CPU and a slow 4G network.
Writes .screenshots/cc55/perf-<label>.json. Run with:
  ALIGN_BASE_URL=http://localhost:3106 PERF_LABEL=before npm run probe -- tests/probes/cc_55_perf.py
"""
# PROBE_COVERS: app/(app)/(tabs)/app/**
import json
import os
from pathlib import Path

from playwright.sync_api import sync_playwright
import _demo  # noqa: F401  (demo mode, tour and tips off)

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3100")
LABEL = os.environ.get("PERF_LABEL", "run")
RUNS = int(os.environ.get("PERF_RUNS", "3"))
OUT = Path(__file__).resolve().parent.parent.parent / ".screenshots" / "cc55"
PHONE = dict(viewport={"width": 390, "height": 844}, device_scale_factor=3, is_mobile=True, has_touch=True)
CATEGORIES = [
    "devtools.timeline",
    "disabled-by-default-devtools.timeline",
    "disabled-by-default-devtools.timeline.frame",
    "toplevel",
    "benchmark",
    "cc",
    "viz",
]
SETTLE = 700


def analyse(raw: bytes) -> dict:
    events = json.loads(raw)["traceEvents"]
    names = {(e["pid"], e["tid"]): e["args"]["name"] for e in events if e.get("name") == "thread_name"}
    main = {k for k, v in names.items() if v == "CrRendererMain"}
    on_main = [e for e in events if (e.get("pid"), e.get("tid")) in main]
    long_tasks = [round(e["dur"] / 1000, 1) for e in on_main if e.get("name") == "RunTask" and e.get("dur", 0) > 50_000]
    count = lambda n: sum(1 for e in on_main if e.get("name") == n and e.get("ph") in ("X", "B"))
    states = {}
    for e in events:
        if e.get("name") == "PipelineReporter" and e.get("ph") == "b":
            s = e.get("args", {}).get("frame_reporter", {}).get("state", "?")
            states[s] = states.get(s, 0) + 1
    dropped = states.get("STATE_DROPPED", 0) + sum(1 for e in events if e.get("name") == "DroppedFrame")
    presented = states.get("STATE_PRESENTED_ALL", 0) + states.get("STATE_PRESENTED_PARTIAL", 0)
    return {
        "frames_presented": presented,
        "frames_dropped": dropped,
        "long_tasks_ms": long_tasks,
        "layouts": count("Layout"),
        "style_recalcs": count("UpdateLayoutTree"),
        "paints": count("Paint"),
    }


def throttle(pg):
    cdp = pg.context.new_cdp_session(pg)
    cdp.send("Emulation.setCPUThrottlingRate", {"rate": 4})
    return cdp


def open_today(pg):
    pg.goto(BASE + "/app", wait_until="networkidle")
    pg.locator('[data-align-group="home-page"]').first.wait_for(state="visible")
    pg.wait_for_timeout(1200)
    # A touch phone gets the install pop-up once per session; close it first
    later = pg.get_by_role("button", name="Để sau")
    if later.count():
        later.first.tap()
        pg.locator('[role="dialog"]').wait_for(state="detached")
        pg.wait_for_timeout(400)


def traced(browser, pg, action) -> dict:
    browser.start_tracing(page=pg, categories=CATEGORIES)
    action()
    pg.wait_for_timeout(SETTLE)
    raw = browser.stop_tracing()
    if os.environ.get("PERF_DUMP"):
        (OUT / f"trace-{LABEL}-{action.__name__}.json").write_bytes(raw)
    return analyse(raw)


def interactions(browser) -> dict:
    ctx = browser.new_context(**PHONE)
    pg = ctx.new_page()
    open_today(pg)
    throttle(pg)
    res = {}

    def to_add():
        pg.locator("#mobile-add-fab").tap()
        pg.wait_for_url("**/add**")
        pg.get_by_role("button", name="Đổi bữa").wait_for(state="visible")

    res["today_plus_to_add"] = traced(browser, pg, to_add)

    def switcher():
        pg.get_by_role("button", name="Đổi bữa").tap()
        pg.locator('[role="dialog"][aria-labelledby="meal-switcher-title"]').wait_for(state="visible")
        pg.wait_for_timeout(SETTLE)
        pg.keyboard.press("Escape")
        pg.locator('[role="dialog"][aria-labelledby="meal-switcher-title"]').wait_for(state="detached")

    res["meal_switcher_open_close"] = traced(browser, pg, switcher)

    def back():
        pg.go_back()
        pg.locator('[data-align-group="home-page"]').first.wait_for(state="visible")

    res["back_to_today"] = traced(browser, pg, back)

    def calendar():
        pg.locator('button[aria-label^="Chọn ngày"]:visible').first.tap()
        pg.locator('[role="dialog"]').first.wait_for(state="visible")
        pg.wait_for_timeout(SETTLE)
        pg.keyboard.press("Escape")
        pg.locator('[role="dialog"]').wait_for(state="detached")

    pg.wait_for_timeout(600)
    res["calendar_sheet_open_close"] = traced(browser, pg, calendar)
    ctx.close()
    return res


LOAD_OBSERVERS = """
window.__perf = { lcp: 0, cls: 0, long: [], fcp: 0 };
new PerformanceObserver(l => l.getEntries().forEach(e => window.__perf.lcp = e.startTime)).observe({ type: 'largest-contentful-paint', buffered: true });
new PerformanceObserver(l => l.getEntries().forEach(e => { if (!e.hadRecentInput) window.__perf.cls += e.value })).observe({ type: 'layout-shift', buffered: true });
new PerformanceObserver(l => l.getEntries().forEach(e => window.__perf.long.push([e.startTime, e.duration]))).observe({ type: 'longtask', buffered: true });
new PerformanceObserver(l => l.getEntries().forEach(e => { if (e.name === 'first-contentful-paint') window.__perf.fcp = e.startTime })).observe({ type: 'paint', buffered: true });
"""


def load(browser) -> dict:
    ctx = browser.new_context(**PHONE, service_workers="block")
    ctx.add_init_script(LOAD_OBSERVERS)
    pg = ctx.new_page()
    pg.goto(BASE + "/app", wait_until="networkidle")  # warm the server and the demo seed
    cdp = throttle(pg)
    cdp.send("Network.enable")
    cdp.send("Network.emulateNetworkConditions", {"offline": False, "latency": 150, "downloadThroughput": 1.6 * 1024 * 1024 / 8, "uploadThroughput": 750 * 1024 / 8})
    cdp.send("Network.setCacheDisabled", {"cacheDisabled": True})
    pg.goto(BASE + "/app", wait_until="networkidle")
    pg.wait_for_timeout(3000)
    p = pg.evaluate("window.__perf")
    tbt = sum(max(0, d - 50) for s, d in p["long"] if s >= p["fcp"])
    ctx.close()
    return {"fcp_ms": round(p["fcp"]), "lcp_ms": round(p["lcp"]), "cls": round(p["cls"], 4), "tbt_ms": round(tbt)}


def median(values):
    s = sorted(values)
    return s[len(s) // 2]


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chromium")
        runs = [interactions(browser) for _ in range(RUNS)]
        loads = [load(browser) for _ in range(RUNS)]
        browser.close()
    summary = {}
    for key in runs[0]:
        summary[key] = {
            m: (median([r[key][m] for r in runs]) if m != "long_tasks_ms" else max((r[key][m] for r in runs), key=len))
            for m in runs[0][key]
        }
    summary["load_app"] = {m: median([l[m] for l in loads]) for m in loads[0]}
    (OUT / f"perf-{LABEL}.json").write_text(json.dumps({"summary": summary, "runs": runs, "loads": loads}, indent=1))
    print(f"=== {LABEL} (median of {RUNS}; long tasks: the worst run) ===")
    for key, val in summary.items():
        print(f"{key}: {json.dumps(val)}")


if __name__ == "__main__":
    main()
