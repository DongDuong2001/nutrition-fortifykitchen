"""Overnight 22→23/10, PR 1: what the portion step costs, measured on a phone (390 x 844, demo build) at 1x and 4x CPU (CDP throttle).
Two moves, each from the tap until 700 ms after it:
  open   + sheet with "gà" searched: tap a result -> the portion (main: a second sheet; this branch: a step inside the sheet)
  back   the portion's close (main: ✕ of the portion sheet; this branch: ‹ of the step) -> the list
Numbers per move (the median of --runs):
  first     ms from the tap to the first frame where the portion (or the list) is on screen
  frames    frames drawn in the window
  long      the longest gap between two frames (ms)
  jank25    gaps longer than 25 ms (1.5 frames); jank33: longer than 33 ms (2 frames)
Frames come from requestAnimationFrame in the page.
Run against a built demo server (about 2 minutes per server):
  ALIGN_BASE_URL=http://localhost:3101 npm run probe -- tests/probes/_one_sheet_measure.py --label after
It prints the table and exits 0: a helper (the name starts with _, so probe:all skips it); the assertions are in one_sheet_add.py.
"""
import argparse
import json
import os
import statistics

from playwright.sync_api import sync_playwright

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3101")
SEED_JS = """
try {
  localStorage.setItem('h1t_onboarding_off', '1');
  localStorage.setItem('h1t_whats_new_off', '1');
  localStorage.setItem('h1t_training_prefs_v1_demo', '{"size":null,"asked":true,"own":[]}');
  localStorage.setItem('h1t_demo_v1', '1');
  localStorage.setItem('h1t_profile_v1_demo', JSON.stringify({sex:'male',birthYear:2003,weightKg:65,goal:'maintain',periodMode:false,trainingMinutesDefault:60,displayName:'',hintSeen:true}));
  localStorage.setItem('h1t_settings_v1_demo', JSON.stringify({installPrompt:{dismissCount:0,snoozeUntil:0,done:true,firstSeenIso:'2026-01-01'}}));
} catch (e) {}
"""
RECORDER_JS = """
window.__m = { on: false, frames: [], tap: 0, seen: null };
window.__mStart = (sel) => {
  const m = window.__m;
  m.frames = []; m.on = true; m.seen = null; m.tap = performance.now();
  const loop = (t) => {
    if (!m.on) return;
    m.frames.push(t);
    if (m.seen === null && sel && document.querySelector(sel)) m.seen = t;
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
};
window.__mStop = () => { const m = window.__m; m.on = false; return { tap: m.tap, seen: m.seen, frames: m.frames }; };
"""
# The portion is on screen: the step (this branch) or the portion sheet (main); the list: neither
OPEN_SEL = "[data-add-panel] section[data-sheet-view][data-state=open], [role=dialog][aria-labelledby='portion-sheet-title']"


def stats(rec):
    f = rec["frames"]
    gaps = [b - a for a, b in zip(f, f[1:])]
    return {
        "first": round(rec["seen"] - rec["tap"]) if rec["seen"] else None,
        "frames": len(f),
        "long": round(max(gaps)) if gaps else 0,
        "jank25": sum(g > 25 for g in gaps),
        "jank33": sum(g > 33 for g in gaps),
    }


def tap_on_screen_row(pg, n):
    idx = pg.evaluate("""(n) => { const head = document.querySelector('[data-add-panel] .glass-bar').getBoundingClientRect().bottom;
      const rows = [...document.querySelectorAll('[data-add-panel] button[data-food-row]')];
      const shown = rows.map((r, i) => [r.getBoundingClientRect(), i]).filter(([b]) => b.height > 0 && b.top > head + 4 && b.bottom < innerHeight - 100);
      return shown[n][1]; }""", n)
    pg.locator("[data-add-panel] button[data-food-row]").nth(idx).tap()


def run_once(browser, rate):
    ctx = browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    ctx.add_init_script(SEED_JS)
    ctx.add_init_script(RECORDER_JS)
    pg = ctx.new_page()
    cdp = ctx.new_cdp_session(pg)
    pg.goto(BASE + "/app", wait_until="networkidle")
    pg.wait_for_timeout(600)
    pg.locator('a[href^="/add"]:visible').first.click()
    pg.locator("[data-add-panel] button[data-food-row]").first.wait_for(state="visible", timeout=15000)
    pg.locator("[data-add-panel] input").first.fill("gà")
    pg.wait_for_timeout(1200)
    cdp.send("Emulation.setCPUThrottlingRate", {"rate": rate})
    out = {}
    pg.evaluate("(s) => window.__mStart(s)", OPEN_SEL)
    tap_on_screen_row(pg, 1)
    pg.wait_for_timeout(700)
    out["open"] = stats(pg.evaluate("window.__mStop()"))
    pg.wait_for_timeout(400)
    back = pg.locator("section[data-sheet-view] [data-testid='sheet-view-back'], [data-testid='portion-close']").first
    pg.evaluate("window.__mStart(null)")
    t0 = pg.evaluate("performance.now()")
    back.tap()
    # The list is back when no portion is on screen
    pg.wait_for_function("(s) => !document.querySelector(s)", arg=OPEN_SEL, timeout=5000)
    t1 = pg.evaluate("performance.now()")
    pg.wait_for_timeout(max(0, 700 - (t1 - t0)))
    rec = pg.evaluate("window.__mStop()")
    out["back"] = stats(rec)
    out["back"]["first"] = round(t1 - t0)
    cdp.send("Emulation.setCPUThrottlingRate", {"rate": 1})
    ctx.close()
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--label", default="run")
    ap.add_argument("--runs", type=int, default=5)
    args = ap.parse_args()
    table = {}
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for rate in (1, 4):
            runs = [run_once(browser, rate) for _ in range(args.runs)]
            for move in ("open", "back"):
                row = {k: statistics.median([r[move][k] for r in runs if r[move][k] is not None] or [0]) for k in ("first", "frames", "long", "jank25", "jank33")}
                table[f"{move} {rate}x"] = row
        browser.close()
    print(f"{args.label} ({BASE})")
    print(f"{'move':<10}{'first':>7}{'frames':>8}{'long':>7}{'jank25':>8}{'jank33':>8}")
    for name, r in table.items():
        print(f"{name:<10}{r['first']:>7}{r['frames']:>8}{r['long']:>7}{r['jank25']:>8}{r['jank33']:>8}")
    print(json.dumps(table))


main()
