"""_glass_frames: how smooth the glass is. Frame timings of three cases on a production demo build, Chrome with the CPU at 4x slower,
390x844 phone:
  scroll  Hôm nay (sample day, a full day logged) scrolled from top to bottom by a script, a fixed step per frame
  sheet   the + sheet opened and closed, five times
  toast   an add from the portion sheet and the add toast sliding in over Hôm nay, 1,5 s
For each case, three runs, the mean of: average FPS (frames / seconds), dropped frames (the 16,7 ms slots a frame was late by), long frames
(requestAnimationFrame gaps over 50 ms) and long tasks (PerformanceObserver "longtask", over 50 ms).
FRAMES_TAG=<tag> names the result file .screenshots/v3-cleanup/frames-<tag>.json (default "run"). It measures; it asserts nothing, so it
exits 0; the leading underscore keeps it out of probe:all (it needs a quiet machine and takes minutes). Run it on a quiet machine (nothing else building) once against origin/main and once against this branch:
ALIGN_BASE_URL=http://localhost:3101 FRAMES_TAG=v3 npm run probe -- tests/probes/_glass_frames.py
"""
# PROBE_COVERS: components/ui/bottom-nav.tsx components/ui/sheet.tsx components/diary-toast.tsx app/globals.css
import json
import os
import re
import statistics
from pathlib import Path

import _demo  # noqa: F401  (demo mode, tour and tips off)
from playwright.sync_api import sync_playwright
from share_micros import HALF, NO_SAMPLE, NOW as FULL_DAY_NOW, PROFILE, day

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3101")
TAG = os.environ.get("FRAMES_TAG", "run")
RUNS = int(os.environ.get("FRAMES_RUNS", "3"))
OUT = Path(__file__).resolve().parent.parent.parent / ".screenshots" / "v3-cleanup"
OUT.mkdir(parents=True, exist_ok=True)
PHONE = dict(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
SEED = {"installPrompt": {"dismissCount": 0, "snoozeUntil": 0, "done": True, "firstSeenIso": "2026-01-01"}}

# window.__fm.start() records every animation frame and long task until stop() returns them
INSTALL = """() => {
  window.__fm = {
    start() {
      this.t = []; this.long = 0; this.on = true;
      this.po = new PerformanceObserver((l) => { this.long += l.getEntries().filter((e) => e.duration > 50).length; });
      try { this.po.observe({ entryTypes: ['longtask'] }); } catch (e) {}
      const tick = (now) => { if (!this.on) return; this.t.push(now); requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    },
    stop() {
      this.on = false; this.po.disconnect();
      const d = this.t.slice(1).map((v, i) => v - this.t[i]);
      const secs = (this.t[this.t.length - 1] - this.t[0]) / 1000;
      return { frames: this.t.length, secs, fps: secs ? (this.t.length - 1) / secs : 0,
               dropped: d.reduce((s, x) => s + Math.max(0, Math.round(x / (1000 / 60)) - 1), 0),
               longFrames: d.filter((x) => x > 50).length, longTasks: this.long, worst: Math.max(0, ...d) };
    },
  };
}"""


def new_page(browser, full_day=False):
    """full_day: the sample day is replaced by 20 logged foods over four meals (as share_micros's long day), so Hôm nay is long."""
    ctx = browser.new_context(**PHONE)
    seed = "localStorage.setItem('h1t_settings_v1_demo', %r);" % json.dumps(SEED)
    if full_day:
        seed += "localStorage.setItem('h1t_sample_edits_v1_demo', %r);" % json.dumps(NO_SAMPLE)
        seed += "localStorage.setItem('h1t_added_entries_v1_demo', %r);" % json.dumps(json.dumps(day(HALF, 20)))
        seed += "localStorage.setItem('h1t_profile_v1_demo', %r);" % json.dumps(json.dumps(PROFILE))
    ctx.add_init_script("try { " + seed + " } catch (e) {}")
    pg = ctx.new_page()
    pg.clock.set_fixed_time(FULL_DAY_NOW if full_day else "2026-10-15T10:00:00+07:00")
    cdp = ctx.new_cdp_session(pg)
    cdp.send("Emulation.setCPUThrottlingRate", {"rate": 4})
    return ctx, pg


def home(pg):
    pg.goto(BASE + "/app", wait_until="networkidle")
    pg.locator("#mobile-add-fab").wait_for(state="visible", timeout=15000)
    pg.wait_for_timeout(1500)
    pg.evaluate(INSTALL)


def run_scroll(pg):
    home(pg)
    # the page's scroller: the document, or the tallest scrollable box when the screen scrolls inside itself
    pg.evaluate(
        """() => {
          const cands = [document.scrollingElement, ...[...document.querySelectorAll('*')].filter((e) => /(auto|scroll)/.test(getComputedStyle(e).overflowY) && e.scrollHeight > e.clientHeight + 50)];
          cands.sort((a, b) => (b.scrollHeight - b.clientHeight) - (a.scrollHeight - a.clientHeight));
          window.__scroller = cands[0];
        }"""
    )
    height = pg.evaluate("window.__scroller.scrollHeight - window.__scroller.clientHeight")
    print(f"  scroller: {pg.evaluate('window.__scroller.tagName')} {height} px to scroll")
    pg.evaluate("window.__fm.start()")
    # a fixed step per frame (about 600 px/s at 60 fps): the same work on every build. Top to bottom at least once, and back and forth
    # until 3 s have passed, so a screen with a short scroller (the old Hôm nay scrolls two lists inside a one-screen page) still gives a sample
    pg.evaluate(
        """(max) => new Promise((done) => {
          const el = window.__scroller; const t0 = performance.now(); let y = 0, dir = 1, bottom = false;
          const step = () => {
            y += 10 * dir; if (y >= max) { y = max; dir = -1; bottom = true; } if (y <= 0) { y = 0; dir = 1; }
            el.scrollTop = y;
            if (bottom && performance.now() - t0 >= 3000) done(); else requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        })""",
        height,
    )
    pg.wait_for_timeout(200)
    return pg.evaluate("window.__fm.stop()")


def run_sheet(pg):
    home(pg)
    pg.evaluate("window.__fm.start()")
    for _ in range(5):
        pg.locator("#mobile-add-fab").tap()
        pg.locator("[data-add-panel] [data-testid=food-search]").first.wait_for(state="visible", timeout=10000)
        pg.wait_for_timeout(500)
        pg.locator("[data-add-panel] button[aria-label=Đóng]").first.tap()
        pg.wait_for_url(re.compile(r".*/app(\?.*)?$"), timeout=8000)
        pg.wait_for_timeout(500)
    return pg.evaluate("window.__fm.stop()")


def run_toast(pg):
    home(pg)
    pg.locator("#mobile-add-fab").tap()
    pg.locator("[data-add-panel] [data-testid=food-search]").first.wait_for(state="visible", timeout=10000)
    pg.wait_for_timeout(800)
    pg.locator("[data-add-panel] [data-testid=food-search]").first.fill("trứng")
    row = pg.locator("[data-add-panel] button[data-food-row]:visible").first
    row.wait_for(state="visible", timeout=10000)
    row.tap()
    add = pg.locator('[data-testid="portion-add"]:visible').first
    add.wait_for(state="visible", timeout=8000)
    pg.wait_for_timeout(500)
    # frames from the tap on Thêm: the sheet leaves, Hôm nay is back and the toast slides in
    pg.evaluate("window.__fm.start()")
    add.tap()
    pg.wait_for_url(re.compile(r".*/app(\?.*)?$"), timeout=8000)
    pg.locator(".m-toast:not([data-state=closed])").first.wait_for(state="visible", timeout=8000)
    pg.wait_for_timeout(1500)
    return pg.evaluate("window.__fm.stop()")


CASES = [("scroll", run_scroll, True), ("sheet", run_sheet, False), ("toast", run_toast, False)]


def main():
    result = {}
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for name, fn, full_day in CASES:
            runs = []
            for _ in range(RUNS):
                ctx, pg = new_page(browser, full_day)
                try:
                    runs.append(fn(pg))
                except Exception as e:  # a case that cannot run says so; the others still report
                    print(f"[SKIP] {name}: {str(e).splitlines()[0]}")
                ctx.close()
            if runs:
                result[name] = {k: round(statistics.mean(r[k] for r in runs), 2) for k in ("fps", "dropped", "longFrames", "longTasks", "worst", "secs")}
                result[name]["runs"] = len(runs)
                print(f"{name}: {result[name]}")
        browser.close()
    (OUT / f"frames-{TAG}.json").write_text(json.dumps({"base": BASE, "cpuThrottle": 4, "result": result}, indent=2))
    print(f"saved {OUT / f'frames-{TAG}.json'}")


if __name__ == "__main__":
    main()
