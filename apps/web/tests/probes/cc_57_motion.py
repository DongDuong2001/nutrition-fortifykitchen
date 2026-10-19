"""cc-57: tap-to-first-frame numbers and "stays mounted" checks. Mobile emulation 390 x 844, CPU throttled 4x, demo build.

Measured in the page (performance.now at pointerdown, then the first frame after the thing appears):
  tabs      Hôm nay -> Tổng quan -> Khám phá -> Cài đặt -> Hôm nay: ms until the tapped tab is aria-current,
            ms until the new screen's own content is on the page, and whether the nav bar element survived
  subtabs   Tổng quan Năng lượng -> Vi chất -> Cơ thể -> Tóm tắt: same, and whether the header + tab bar survived
  plus      Hôm nay + -> /add: ms until the sheet panel exists and ms until its first moved frame
Also long tasks (>50 ms) seen on the main thread during each tap.
Run with:  ALIGN_BASE_URL=http://localhost:3107 PERF_LABEL=after npm run probe -- tests/probes/cc_57_motion.py
Writes .screenshots/cc57/perf-<label>.json and prints it.
"""
# PROBE_COVERS: app/(app)/(tabs)/app/** app/(app)/(tabs)/explore/** app/(app)/(tabs)/settings/** app/(app)/(tabs)/trends/** app/(app)/(tabs)/trends/body/** app/(app)/(tabs)/trends/energy/** app/(app)/(tabs)/trends/micros/**
import json
import os
from pathlib import Path

from playwright.sync_api import sync_playwright
import _demo  # noqa: F401  (demo mode, tour and tips off)

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3100")
LABEL = os.environ.get("PERF_LABEL", "run")
RUNS = int(os.environ.get("PERF_RUNS", "3"))
OUT = Path(__file__).resolve().parent.parent.parent / ".screenshots" / "cc57"
PHONE = dict(viewport={"width": 390, "height": 844}, device_scale_factor=3, is_mobile=True, has_touch=True)

# What proves a screen's own content is on the page
CONTENT = {
    "/app": "section[aria-label='Tổng kcal và dinh dưỡng đa lượng']",
    "/trends": "#ov-period",
    "/trends/energy": "main #ov-period, main [data-align-group]",
    "/trends/micros": "main",
    "/trends/body": "main",
    "/explore": "[aria-label='Lọc món theo nhóm']",
    "/settings": "main [data-align-group='settings-row']",
}

# Hôm nay: the heavy part (food list rows, nutrient column) is on the page
FULL = {"/app": "[data-tour='nutrient-column']"}

HOOK = """
([contentSel, tabHref, tag, fullSel]) => {
  const nav = document.querySelector('nav[aria-label="Điều hướng chính"]');
  const header = document.querySelector('header');
  if (nav) nav.__kept = tag;
  if (header) header.__kept = tag;
  const out = { t0: 0, active: null, content: null, full: fullSel ? null : 0, longTasks: [], done: false };
  window.__m = out;
  let obs;
  try {
    obs = new PerformanceObserver((l) => { for (const e of l.getEntries()) out.longTasks.push(Math.round(e.duration)); });
    obs.observe({ type: 'longtask', buffered: false });
  } catch (e) {}
  const finish = () => {
    clearInterval(timer);
    if (obs) obs.disconnect();
    const nav2 = document.querySelector('nav[aria-label="Điều hướng chính"]');
    const header2 = document.querySelector('header');
    out.navKept = !!nav2 && nav2.__kept === tag;
    out.headerKept = !!header2 && header2.__kept === tag;
    out.done = true;
  };
  const paint = (cb) => requestAnimationFrame(() => requestAnimationFrame(cb));
  document.addEventListener('pointerdown', () => { out.t0 = performance.now(); }, { capture: true, once: true });
  const timer = setInterval(() => {
    if (!out.t0) return;
    const now = performance.now();
    if (out.active === null && tabHref) {
      const a = [...document.querySelectorAll('a[aria-current="page"]')].find((x) => x.getAttribute('href') && x.getAttribute('href').split('?')[0] === tabHref);
      if (a) paint(() => { if (out.active === null) out.active = Math.round(performance.now() - out.t0); });
    }
    if (out.content === null && location.pathname === tabHref.split('?')[0]) {
      const el = [...document.querySelectorAll(contentSel)].find((x) => x.getClientRects().length);
      if (el) paint(() => { if (out.content === null) out.content = Math.round(performance.now() - out.t0); });
    }
    if (out.full === null && location.pathname === tabHref.split('?')[0]) {
      const el = [...document.querySelectorAll(fullSel)].find((x) => x.getClientRects().length);
      if (el) paint(() => { if (out.full === null) out.full = Math.round(performance.now() - out.t0); });
    }
    if (out.active !== null && out.content !== null && out.full !== null) finish();
    if (now - out.t0 > 3000) finish();
  }, 4);
  setTimeout(finish, 6000);
}
"""


def throttle(pg):
    cdp = pg.context.new_cdp_session(pg)
    cdp.send("Emulation.setCPUThrottlingRate", {"rate": 4})


def open_today(pg):
    pg.goto(BASE + "/app", wait_until="networkidle")
    pg.locator('[data-align-group="home-page"]').first.wait_for(state="visible")
    pg.wait_for_timeout(1500)
    later = pg.get_by_role("button", name="Để sau")
    if later.count():
        later.first.tap()
        pg.locator('[role="dialog"]').wait_for(state="detached")
        pg.wait_for_timeout(400)


def tap_and_measure(pg, locator, href, tag):
    """Taps `locator`; returns the page's own numbers for the screen at `href`."""
    sel = CONTENT.get(href.split("?")[0], "main")
    pg.evaluate(HOOK, [sel, href, tag, FULL.get(href.split("?")[0], "")])
    pg.wait_for_timeout(50)
    locator.tap()
    pg.wait_for_function("() => window.__m && window.__m.done", timeout=9000)
    res = pg.evaluate("() => window.__m")
    pg.wait_for_timeout(500)
    return res


def run_tabs(pg):
    rows = []
    for i in range(RUNS):
        for name, href in [("Tổng quan", "/trends"), ("Khám phá", "/explore"), ("Cài đặt", "/settings"), ("Hôm nay", "/app")]:
            link = pg.locator(f'nav[aria-label="Điều hướng chính"] a[href="{href}"]:visible').first
            r = tap_and_measure(pg, link, href, f"tabs{i}{href}")
            r.update(kind="tab", to=href)
            rows.append(r)
    return rows


def run_subtabs(pg):
    rows = []
    pg.locator('nav[aria-label="Điều hướng chính"] a[href="/trends"]:visible').first.tap()
    pg.wait_for_url("**/trends")
    pg.wait_for_timeout(900)
    for i in range(RUNS):
        for href in ["/trends/energy", "/trends/micros", "/trends/body", "/trends"]:
            link = pg.locator(f'nav[aria-label="Tổng quan"] a[href="{href}"], nav[aria-label="Tổng quan"] a[href^="{href}?"]').locator("visible=true").first
            r = tap_and_measure(pg, link, href, f"sub{i}{href}")
            r.update(kind="subtab", to=href)
            rows.append(r)
    return rows


def run_plus(pg):
    rows = []
    for i in range(RUNS):
        pg.goto(BASE + "/app", wait_until="networkidle")
        pg.locator('[data-align-group="home-page"]').first.wait_for(state="visible")
        pg.wait_for_timeout(900)
        pg.evaluate(
            """() => { window.__plus = { t0: 0, exists: null, moved: null, long: [] };
              try { new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__plus.long.push(Math.round(e.duration)); }).observe({ type: 'longtask' }); } catch (e) {}
              document.addEventListener('pointerdown', () => { window.__plus.t0 = performance.now(); }, { capture: true, once: true });
              const t = setInterval(() => {
                const p = window.__plus; if (!p.t0) return;
                const el = [...document.querySelectorAll('[data-sheet-route]')].find((x) => x.getClientRects().length);
                if (el && p.exists === null) p.exists = Math.round(performance.now() - p.t0);
                if (el && p.moved === null) {
                  const m = new DOMMatrix(getComputedStyle(el).transform === 'none' ? undefined : getComputedStyle(el).transform);
                  p.first = p.first === undefined ? m.m42 : p.first;
                  if (m.m42 !== p.first) p.moved = Math.round(performance.now() - p.t0);
                }
                if (performance.now() - p.t0 > 2500) clearInterval(t);
              }, 2); }"""
        )
        pg.locator("#mobile-add-fab").tap()
        pg.wait_for_url("**/add**")
        pg.wait_for_timeout(1200)
        r = pg.evaluate("() => window.__plus")
        r.update(kind="plus")
        rows.append(r)
    return rows


def summarise(rows):
    out = {}
    for kind in ("tab", "subtab", "plus"):
        sel = [r for r in rows if r["kind"] == kind]
        if not sel:
            continue
        keys = ["active", "content", "full"] if kind != "plus" else ["exists", "moved"]
        agg = {}
        for k in keys:
            vals = sorted(v for v in (r.get(k) for r in sel) if v is not None)
            agg[k] = {"median": vals[len(vals) // 2] if vals else None, "max": vals[-1] if vals else None, "n": len(vals), "of": len(sel)}
        agg["long_tasks"] = sorted(sum((r.get("longTasks") or r.get("long") or [] for r in sel), []), reverse=True)[:8]
        if kind != "plus":
            agg["nav_kept"] = sum(1 for r in sel if r.get("navKept"))
            agg["header_kept"] = sum(1 for r in sel if r.get("headerKept"))
        out[kind] = agg
    return out


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch()
        ctx = browser.new_context(**PHONE)
        pg = ctx.new_page()
        open_today(pg)
        throttle(pg)
        rows = run_tabs(pg)
        rows += run_subtabs(pg)
        rows += run_plus(pg)
        browser.close()
    data = {"label": LABEL, "runs": RUNS, "summary": summarise(rows), "rows": rows}
    (OUT / f"perf-{LABEL}.json").write_text(json.dumps(data, ensure_ascii=False, indent=1))
    print(json.dumps(data["summary"], ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
