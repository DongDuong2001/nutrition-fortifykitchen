"""perf/live-bundle (a measure, not a probe: the leading _ keeps it out of probe:all): what opening Hôm nay and adding one food cost the main thread (demo build), for the PR's before/after.

Chromium at 4x CPU slowdown (a mid-range phone), 390 wide, demo day. Two measures, each the median of RUNS fresh pages:
- open: /app until the first meal row is there and the page is idle; ScriptDuration and TaskDuration (CDP Performance).
- add: from Chà là's food page, Thêm vào Bữa … until Hôm nay shows the new row; the same two numbers for that span.
Prints a small table; never fails (a measure, not a check), except when the page never shows the row.
Run with: ALIGN_BASE_URL=http://localhost:3104 npm run probe -- tests/probes/_live_bundle_perf.py
"""
# PROBE_COVERS:
import os
import re
import statistics
import sys

import _demo  # noqa: F401
from playwright.sync_api import sync_playwright

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3101")
RUNS = int(os.environ.get("PERF_RUNS", "5"))
NOW = "2026-10-20T08:00:00+07:00"


def metrics(cdp):
    m = {x["name"]: x["value"] for x in cdp.send("Performance.getMetrics")["metrics"]}
    return m["ScriptDuration"] * 1000, m["TaskDuration"] * 1000


def page(browser):
    ctx = browser.new_context(viewport={"width": 390, "height": 844})
    pg = ctx.new_page()
    pg.clock.set_fixed_time(NOW)
    cdp = ctx.new_cdp_session(pg)
    cdp.send("Performance.enable")
    cdp.send("Emulation.setCPUThrottlingRate", {"rate": 4})
    return ctx, pg, cdp


def one(browser):
    ctx, pg, cdp = page(browser)
    pg.goto(f"{BASE}/app", wait_until="networkidle")
    pg.locator("[data-entry-id] >> visible=true").first.wait_for(timeout=30000)
    pg.wait_for_timeout(800)
    opened = metrics(cdp)
    rows = pg.locator("[data-entry-id] >> visible=true").count()
    pg.goto(f"{BASE}/foods/food-cha-la?meal=breakfast", wait_until="networkidle")
    button = pg.get_by_role("button", name=re.compile("^Thêm vào Bữa")).locator("visible=true").first
    button.wait_for(timeout=30000)
    pg.wait_for_timeout(500)
    before = metrics(cdp)
    button.click()
    pg.wait_for_url(re.compile(r"/app"), timeout=30000)
    # The CSP has no unsafe-eval, so the row count is polled from here, not with wait_for_function
    for _ in range(300):
        if pg.locator("[data-entry-id] >> visible=true").count() > rows:
            break
        pg.wait_for_timeout(50)
    else:
        raise SystemExit("the added row never showed")
    pg.wait_for_timeout(800)
    after = metrics(cdp)
    ctx.close()
    return opened, (after[0] - before[0], after[1] - before[1])


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        one(browser)  # warm the server's caches
        runs = [one(browser) for _ in range(RUNS)]
        browser.close()
    med = lambda xs: statistics.median(xs)
    print(f"median of {RUNS} runs, 4x CPU, ms")
    print("| | script | task |\n|---|---|---|")
    print(f"| open Hôm nay | {med([r[0][0] for r in runs]):.0f} | {med([r[0][1] for r in runs]):.0f} |")
    print(f"| add one food (Thêm → Hôm nay) | {med([r[1][0] for r in runs]):.0f} | {med([r[1][1] for r in runs]):.0f} |")
    sys.exit(0)


if __name__ == "__main__":
    main()
