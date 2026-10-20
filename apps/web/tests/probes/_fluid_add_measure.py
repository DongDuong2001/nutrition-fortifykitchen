"""feat/fluid-add: how the add flow, the tabs and the lazy sheets feel, measured on a phone (390 x 844, demo build) at 1x and
4x CPU (CDP throttle). One number per thing the brief names:
  open     tap on + -> first frame with the /add sheet on screen (ms and frames), where that frame starts (px from the bottom),
           blank frames (nothing painted in the lower page), janky frames (> 16.7 ms and > 33 ms between two frames)
  close    tap on the X -> the slide (frames the sheet moves), hard cut or not, blank frames, janky frames
  addtray  tick a food, press the tray button: the same slide as the X, no "Thêm 0 món" on the button mid-close, and Hôm nay
           behind it plays the kcal count-up / bar growth after the add
  tabs     Hôm nay -> Khám phá -> Hôm nay: nav highlight and new screen in ms, blank frames, ms until the food list is drawn
  rich     Khám phá -> a "Giàu ..." tile: pressed state and new screen in ms
  sheets   first and second open of the calendar and of the day's ⋯ menu: tap -> first sheet frame in ms
Frames come from two sources: requestAnimationFrame in the page (timing, the sheet's position) and the CDP screencast
(pixels: a frame whose lower page is one flat colour is blank; also the filmstrips).
Run (a built demo server must be up; each run takes about 4 minutes):
  ALIGN_BASE_URL=http://localhost:3101 npm run probe -- tests/probes/_fluid_add_measure.py --label after
  --label NAME   names the output files (docs/screenshots/fluid-add/NAME/*.png, docs/pr/fluid-add-probe-NAME.json)
  --runs N       repeats per scenario and rate (default 3; the median is reported)
  --only a,b     run only some scenarios
It prints the table and exits 0. A helper (the name starts with _, so probe:all skips it: it takes minutes and asserts nothing);
the assertions live in fluid_add.py.
"""
import argparse
import asyncio
import base64
import json
import os
import re
import statistics
import sys
import time
from pathlib import Path

from playwright.async_api import async_playwright


BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3100")
ROOT = Path(__file__).resolve().parents[4]
PHONE = dict(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
W, H = 390, 844
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
# The in-page recorder: one sample per animation frame
RECORDER_JS = """
(() => {
  const rec = { on: false, frames: [], down: null, marks: {} };
  window.__fa = rec;
  const visible = (el) => !!el && el.getClientRects().length > 0;
  const sheetOf = () => {
    for (const el of document.querySelectorAll('[data-add-panel]')) if (visible(el)) return el;
    return null;
  };
  const kcalOf = () => {
    for (const el of document.querySelectorAll('[aria-label="Tổng kcal và dinh dưỡng đa lượng"]')) {
      if (visible(el) && !el.closest('[aria-hidden="true"]')) return (el.querySelector('span.font-display') || el).textContent;
    }
    return null;
  };
  const barOf = () => {
    for (const el of document.querySelectorAll('[aria-label="Kcal so với mục tiêu ngày"]')) {
      if (visible(el) && !el.closest('[aria-hidden="true"]')) {
        const fill = el.querySelector('[style*="transform"]') || el.firstElementChild;
        return fill ? fill.style.transform || getComputedStyle(fill).transform : null;
      }
    }
    return null;
  };
  const sample = (t) => {
    const s = sheetOf();
    const r = s ? s.getBoundingClientRect() : null;
    const home = document.querySelector('[data-align-group="home-page"]');
    const trayBtn = document.querySelector('[data-testid="tray-add"]');
    return {
      t,
      sheetTop: r ? Math.round(r.top * 10) / 10 : null,
      sheetOpacity: s ? getComputedStyle(s).opacity : null,
      homeKids: home ? home.children.length : null,
      homeRows: home ? home.querySelectorAll('[data-testid="meal-header"]').length : null,
      kcal: kcalOf(),
      bar: barOf(),
      trayText: trayBtn ? trayBtn.textContent : null,
      path: location.pathname,
      navCurrent: (document.querySelector('nav[aria-label="Điều hướng chính"] a[aria-current="page"]') || {}).textContent || null,
      hero: !!document.querySelector('[aria-label="Tổng kcal và dinh dưỡng đa lượng"]'),
      meals: document.querySelectorAll('[data-testid="meal-header"]').length,
      explore: !!document.querySelector('[data-align-group="add-list"]'),
      anims: document.getAnimations().filter((a) => a.playState === 'running').length,
    };
  };
  const loop = (t) => { if (!rec.on) return; rec.frames.push(sample(t)); requestAnimationFrame(loop); };
  rec.start = () => { rec.frames = []; rec.on = true; requestAnimationFrame(loop); };
  rec.stop = () => { rec.on = false; return rec.frames; };
  const pd = (e) => { if (rec.on && rec.down === null) rec.down = performance.now(); };
  document.addEventListener('pointerdown', pd, { capture: true });
  document.addEventListener('touchstart', pd, { capture: true, passive: true });
  rec.reset = () => { rec.down = null; rec.frames = []; };
  rec.origin = performance.timeOrigin;
})();
"""


class Screencast:
    """CDP screencast: every frame's JPEG and its wall-clock time (ms)."""

    def __init__(self, cdp):
        self.cdp = cdp
        self.frames = []
        cdp.on("Page.screencastFrame", self._on)

    def _on(self, ev):
        self.frames.append((ev["metadata"]["timestamp"] * 1000.0, ev["data"]))
        asyncio.ensure_future(self.cdp.send("Page.screencastFrameAck", {"sessionId": ev["sessionId"]}))

    async def start(self):
        self.frames = []
        await self.cdp.send("Page.startScreencast", {"format": "jpeg", "quality": 45, "maxWidth": W, "maxHeight": H, "everyNthFrame": 1})

    async def stop(self):
        await self.cdp.send("Page.stopScreencast")
        await asyncio.sleep(0.05)
        return self.frames


BLANK_JS = """
async (frames) => {
  // A frame is blank when the lower page (y 36% - 90%) is one flat colour: nothing of the screen is drawn there
  const out = [];
  const c = document.createElement('canvas');
  const cw = 78, ch = 169;
  c.width = cw; c.height = ch;
  const g = c.getContext('2d', { willReadFrequently: true });
  for (const b64 of frames) {
    const img = new Image();
    img.src = 'data:image/jpeg;base64,' + b64;
    await img.decode();
    g.drawImage(img, 0, 0, cw, ch);
    const y0 = Math.round(ch * 0.36), y1 = Math.round(ch * 0.9);
    const d = g.getImageData(0, y0, cw, y1 - y0).data;
    const counts = new Map();
    let n = 0;
    for (let i = 0; i < d.length; i += 4) {
      const k = (d[i] >> 3) + ',' + (d[i + 1] >> 3) + ',' + (d[i + 2] >> 3);
      counts.set(k, (counts.get(k) || 0) + 1);
      n++;
    }
    let top = 0;
    for (const v of counts.values()) if (v > top) top = v;
    out.push(top / n);
  }
  return out;
}
"""

STRIP_HTML = """<!doctype html><meta charset=utf-8><style>
body{margin:0;background:#1b1b1b;font:12px/1.2 -apple-system,Helvetica,sans-serif;color:#eee}
.row{display:flex;gap:6px;padding:8px;align-items:flex-start}
.f{flex:none;width:130px}.f img{width:130px;display:block;border:1px solid #444}
.f b{display:block;padding:2px 0}.blank img{outline:3px solid #e5484d}
h1{margin:0;padding:8px 8px 0;font-size:13px}</style>"""


async def blank_ratios(page, frames):
    if not frames:
        return []
    return await page.evaluate(BLANK_JS, [f[1] for f in frames])


async def write_strip(page, path, title, frames, blanks, t0, max_frames=14):
    """A filmstrip PNG: evenly thinned frames from the tap, each labelled with ms since the tap; blank frames outlined red."""
    if not frames:
        return
    step = max(1, len(frames) // max_frames)
    picked = list(range(0, len(frames), step))[:max_frames]
    cells = []
    for i in picked:
        ms = round(frames[i][0] - t0)
        cls = "f blank" if blanks[i] > 0.97 else "f"
        cells.append(f'<div class="{cls}"><b>{ms} ms</b><img src="data:image/jpeg;base64,{frames[i][1]}"></div>')
    await page.set_content(STRIP_HTML + f"<h1>{title}</h1><div class=row>{''.join(cells)}</div>")
    await page.wait_for_timeout(50)
    path.parent.mkdir(parents=True, exist_ok=True)
    await page.locator(".row").screenshot(path=str(path))


def median(xs):
    xs = [x for x in xs if x is not None]
    return statistics.median(xs) if xs else None


async def new_ctx(browser, rate):
    ctx = await browser.new_context(**PHONE)
    await ctx.add_init_script(SEED_JS)
    await ctx.add_init_script(RECORDER_JS)
    page = await ctx.new_page()
    cdp = await ctx.new_cdp_session(page)
    return ctx, page, cdp


async def open_home(page, cdp, rate):
    await page.goto(BASE + "/app", wait_until="networkidle")
    await page.locator('[data-testid="meal-header"]:visible').first.wait_for(state="visible", timeout=10000)
    await page.wait_for_timeout(1800)
    later = page.get_by_role("button", name="Để sau")
    if await later.count():
        await later.first.tap()
        await page.wait_for_timeout(500)
    await cdp.send("Emulation.setCPUThrottlingRate", {"rate": rate})


async def record(page, cdp, action, settle_ms=900):
    """Run `action` (an async callable doing the tap) with the recorder and the screencast on. Returns (rows, shots, t_down_wall)."""
    sc = Screencast(cdp)
    await page.evaluate("window.__fa.reset(); window.__fa.start()")
    await sc.start()
    t_wall0 = time.time() * 1000
    await action()
    await page.wait_for_timeout(settle_ms)
    rows = await page.evaluate("window.__fa.stop()")
    down = await page.evaluate("window.__fa.down")
    origin = await page.evaluate("window.__fa.origin")
    shots = await sc.stop()
    t_down_wall = origin + down if down is not None else t_wall0
    return rows, down, origin, shots, t_down_wall


def jank(rows, t_from, t_to):
    ts = [r["t"] for r in rows if t_from <= r["t"] <= t_to]
    d = [b - a for a, b in zip(ts, ts[1:])]
    return {"frames": len(ts), "gt16": sum(1 for x in d if x > 18.0), "gt33": sum(1 for x in d if x > 34.0), "max_ms": round(max(d), 1) if d else None}


def blank_count(blanks, frames, t_from_wall, t_to_wall):
    idx = [i for i, f in enumerate(frames) if t_from_wall <= f[0] <= t_to_wall]
    return sum(1 for i in idx if blanks[i] > 0.97), len(idx)


# ---------------------------------------------------------------- scenarios
async def sc_open_close(browser, rate, label, strip_page, runs):
    """Hôm nay -> + -> the sheet; then the X."""
    res = {"open": [], "close": []}
    for run in range(runs):
        ctx, page, cdp = await new_ctx(browser, rate)
        await open_home(page, cdp, rate)
        fab = page.locator("#mobile-add-fab")
        rows, down, origin, shots, tdw = await record(page, cdp, lambda: fab.tap())
        blanks = await blank_ratios(strip_page, shots)
        tdown = down or 0
        first = next((r for r in rows if r["t"] >= tdown and r["sheetTop"] is not None and r["sheetTop"] < H), None)
        first_i = rows.index(first) if first else None
        n_before = len([r for r in rows if r["t"] >= tdown and (first is None or r["t"] < first["t"])])
        b, n = blank_count(blanks, shots, tdw, tdw + 800)
        res["open"].append({
            "first_sheet_ms": round(first["t"] - tdown, 1) if first else None,
            "first_sheet_frames": n_before + 1 if first else None,
            "first_top_px": first["sheetTop"] if first else None,
            "from_bottom": bool(first and first["sheetTop"] >= H * 0.85),
            "blank": b, "shots": n, "jank": jank(rows, tdown, tdown + 700),
            "hard_url": rows[-1]["path"] if rows else None,
        })
        if run == 0:
            await write_strip(strip_page, ROOT / f"docs/screenshots/fluid-add/{label}/open-{rate}x.png", f"open, {rate}x CPU: tap on + ({label})", shots, blanks, tdw)
        # the X
        await page.wait_for_timeout(700)
        close = page.locator("[data-add-panel]").get_by_role("button", name="Đóng")
        rows, down, origin, shots, tdw = await record(page, cdp, lambda: close.first.tap())
        blanks = await blank_ratios(strip_page, shots)
        tdown = down or 0
        top0 = next((r["sheetTop"] for r in rows if r["sheetTop"] is not None), None)
        moving = [r for r in rows if r["t"] >= tdown and r["sheetTop"] is not None and top0 is not None and r["sheetTop"] > top0 + 2]
        gone = next((r for r in rows if r["t"] >= tdown and r["sheetTop"] is None), None)
        b, n = blank_count(blanks, shots, tdw, tdw + 800)
        res["close"].append({
            "slide_frames": len(moving), "gone_ms": round(gone["t"] - tdown, 1) if gone else None,
            "hard_cut": len(moving) < 4, "blank": b, "shots": n, "jank": jank(rows, tdown, tdown + 600),
            "path_after": rows[-1]["path"] if rows else None,
        })
        if run == 0:
            await write_strip(strip_page, ROOT / f"docs/screenshots/fluid-add/{label}/close-{rate}x.png", f"close with the X, {rate}x CPU ({label})", shots, blanks, tdw)
        await ctx.close()
    return res


async def sc_addtray(browser, rate, label, strip_page, runs):
    """Open /add, tick one food with the + circle, press the tray button: the sheet's slide, the button label, Hôm nay's count-up."""
    out = []
    for run in range(runs):
        ctx, page, cdp = await new_ctx(browser, rate)
        await open_home(page, cdp, rate)
        await cdp.send("Emulation.setCPUThrottlingRate", {"rate": 1})
        await page.locator("#mobile-add-fab").tap()
        await page.locator("[data-add-panel] [data-testid=food-search]").first.wait_for(state="visible", timeout=8000)
        await page.wait_for_timeout(700)
        await page.locator("[data-add-panel] [data-testid=food-search]").first.fill("trứng")
        toggle = page.locator("[data-add-panel] [data-testid=tray-toggle]").first
        await toggle.wait_for(state="visible", timeout=8000)
        await toggle.tap()
        add = page.locator("[data-add-panel] [data-testid=tray-add]").first
        await add.wait_for(state="visible", timeout=4000)
        await page.wait_for_timeout(500)
        await cdp.send("Emulation.setCPUThrottlingRate", {"rate": rate})
        rows, down, origin, shots, tdw = await record(page, cdp, lambda: add.tap(), settle_ms=1400)
        blanks = await blank_ratios(strip_page, shots)
        tdown = down or 0
        top0 = next((r["sheetTop"] for r in rows if r["t"] >= tdown - 50 and r["sheetTop"] is not None), None)
        moving = [r for r in rows if r["t"] >= tdown and r["sheetTop"] is not None and top0 is not None and r["sheetTop"] > top0 + 2]
        gone = next((r for r in rows if r["t"] >= tdown and r["sheetTop"] is None), None)
        kcals = []
        for r in rows:
            if r["t"] >= tdown and r["kcal"] is not None and (not kcals or kcals[-1] != r["kcal"]):
                kcals.append(r["kcal"])
        bars = []
        for r in rows:
            if r["t"] >= tdown and r["bar"] is not None and (not bars or bars[-1] != r["bar"]):
                bars.append(r["bar"])
        b, n = blank_count(blanks, shots, tdw, tdw + 1200)
        out.append({
            "slide_frames": len(moving), "hard_cut": len(moving) < 4,
            "gone_ms": round(gone["t"] - tdown, 1) if gone else None,
            "label_zero_seen": any(r["trayText"] and "Thêm 0" in r["trayText"] for r in rows if r["t"] >= tdown),
            "kcal_steps": len(kcals), "bar_steps": len(bars), "blank": b, "shots": n,
            "jank": jank(rows, tdown, tdown + 900), "path_after": rows[-1]["path"] if rows else None,
        })
        if run == 0:
            await write_strip(strip_page, ROOT / f"docs/screenshots/fluid-add/{label}/addtray-{rate}x.png", f"add from the tray, {rate}x CPU ({label})", shots, blanks, tdw)
        await ctx.close()
    return out


async def sc_tabs(browser, rate, label, strip_page, runs):
    """Hôm nay -> Khám phá -> Hôm nay (all from the frame samples)."""
    out = []
    for run in range(runs):
        ctx, page, cdp = await new_ctx(browser, rate)
        await open_home(page, cdp, rate)
        nav = page.locator('nav[aria-label="Điều hướng chính"]').locator("visible=true")
        explore = nav.get_by_role("link", name="Khám phá")
        rows, down, origin, shots, tdw = await record(page, cdp, lambda: explore.first.tap(), settle_ms=700)
        tdown = down or 0
        after = [r for r in rows if r["t"] >= tdown]
        n = next((r for r in after if r["navCurrent"] and "Khám phá" in r["navCurrent"]), None)
        sc = next((r for r in after if r["path"] == "/explore" and r["explore"]), None)
        row = {"to_explore": {"nav_ms": round(n["t"] - tdown, 1) if n else None, "screen_ms": round(sc["t"] - tdown, 1) if sc else None, "jank": jank(rows, tdown, tdown + 500)}}
        await page.wait_for_timeout(500)
        today = nav.get_by_role("link", name="Hôm nay")
        rows, down, origin, shots, tdw = await record(page, cdp, lambda: today.first.tap(), settle_ms=900)
        blanks = await blank_ratios(strip_page, shots)
        tdown = down or 0
        after = [r for r in rows if r["t"] >= tdown]
        n = next((r for r in after if r["navCurrent"] and "Hôm nay" in r["navCurrent"]), None)
        sc = next((r for r in after if r["path"] == "/app" and r["hero"]), None)
        listed = next((r for r in after if r["path"] == "/app" and r["meals"] > 0), None)
        empty_frames = sum(1 for r in after if r["path"] == "/app" and r["hero"] and r["meals"] == 0)
        b, nshots = blank_count(blanks, shots, tdw, tdw + 700)
        row["to_today"] = {
            "nav_ms": round(n["t"] - tdown, 1) if n else None, "screen_ms": round(sc["t"] - tdown, 1) if sc else None,
            "list_ms": round(listed["t"] - tdown, 1) if listed else None, "empty_dom_frames": empty_frames, "blank": b, "shots": nshots,
            "jank": jank(rows, tdown, tdown + 500),
        }
        if run == 0:
            await write_strip(strip_page, ROOT / f"docs/screenshots/fluid-add/{label}/tab-today-{rate}x.png", f"tab to Hôm nay, {rate}x CPU ({label})", shots, blanks, tdw)
        out.append(row)
        await ctx.close()
    return out


async def sc_rich(browser, rate, label, strip_page, runs):
    out = []
    for run in range(runs):
        ctx, page, cdp = await new_ctx(browser, rate)
        await page.goto(BASE + "/explore", wait_until="networkidle")
        await page.wait_for_timeout(1500)
        await cdp.send("Emulation.setCPUThrottlingRate", {"rate": rate})
        tile = page.locator('a[href^="/explore/rich/"]:visible').first
        await tile.wait_for(state="visible", timeout=8000)
        await page.evaluate("""
          window.__rich = {};
          const t = () => performance.now();
          addEventListener('pointerdown', () => { const a = document.querySelector('a[href^="/explore/rich/"]'); }, true);
          new MutationObserver(() => {
            if (location.pathname.startsWith('/explore/rich/') && window.__rich.screen === undefined && document.querySelector('main, h1')) window.__rich.screen = performance.now();
          }).observe(document.documentElement, { subtree: true, childList: true });
          const pressed = setInterval(() => {
            const a = document.querySelector('a[href^="/explore/rich/"]:active, a[data-pressed]');
            const el = [...document.querySelectorAll('a[href^="/explore/rich/"]')].find((x) => { const s = getComputedStyle(x); return (s.scale !== 'none' && s.scale !== '1') || (s.transform !== 'none' && s.transform !== 'matrix(1, 0, 0, 1, 0, 0)'); });
            if (el && window.__rich.pressed === undefined) { window.__rich.pressed = performance.now(); clearInterval(pressed); }
          }, 1);
        """)
        rows, down, origin, shots, tdw = await record(page, cdp, lambda: tile.tap(), settle_ms=900)
        t = await page.evaluate("window.__rich")
        tdown = down or 0
        out.append({"pressed_ms": round(t["pressed"] - tdown, 1) if t.get("pressed") else None,
                    "screen_ms": round(t["screen"] - tdown, 1) if t.get("screen") else None, "jank": jank(rows, tdown, tdown + 600)})
        await ctx.close()
    return out


async def sc_sheets(browser, rate, label, strip_page, runs):
    """First and second open of the calendar and of the day's ⋯ menu: tap -> first frame with the sheet in view."""
    out = {"calendar": [], "menu": []}
    for name, sel in (("calendar", 'button[aria-label^="Chọn ngày"]'), ("menu", "#home-day-menu")):
        for run in range(runs):
            ctx, page, cdp = await new_ctx(browser, rate)
            await open_home(page, cdp, rate)
            btn = page.locator(sel).locator("visible=true").first
            row = {}
            for nth in ("first", "second"):
                await page.evaluate("""
                  window.__sh = { };
                  const iv = setInterval(() => {
                    const d = [...document.querySelectorAll('[role="dialog"][data-state="open"]')].find((x) => x.getClientRects().length && !x.hasAttribute('data-add-panel'));
                    if (d) { const r = d.getBoundingClientRect(); if (r.top < innerHeight && window.__sh.t === undefined) { window.__sh.t = performance.now(); window.__sh.top = r.top; clearInterval(iv); } }
                  }, 1);
                """)
                rows, down, origin, shots, tdw = await record(page, cdp, lambda: btn.tap(), settle_ms=700)
                t = await page.evaluate("window.__sh")
                row[nth] = round(t["t"] - (down or 0), 1) if t.get("t") else None
                # close it with Escape (a key) so the next tap is on the same page
                await page.keyboard.press("Escape")
                await page.wait_for_timeout(600)
            out[name].append(row)
            await ctx.close()
    return out


SCENARIOS = {"openclose": sc_open_close, "addtray": sc_addtray, "tabs": sc_tabs, "rich": sc_rich, "sheets": sc_sheets}


def summarize(name, rate, data):
    """One flat dict of medians per scenario, for the table and the JSON."""
    def med(rows, *path):
        vals = []
        for r in rows:
            v = r
            for p in path:
                v = v.get(p) if isinstance(v, dict) else None
            vals.append(v)
        vals = [x for x in vals if x is not None and not isinstance(x, bool)]
        return median(vals)

    def anyof(rows, key):
        return sum(1 for r in rows if r.get(key))

    if name == "openclose":
        o, c = data["open"], data["close"]
        return {
            "open first sheet frame (ms)": med(o, "first_sheet_ms"), "open first sheet frame (frames)": med(o, "first_sheet_frames"),
            "open first frame top (px, 844 = bottom)": med(o, "first_top_px"), "open blank frames": med(o, "blank"),
            "open janky >16.7 / >33 ms": f'{med(o, "jank", "gt16")} / {med(o, "jank", "gt33")}',
            "close slide frames": med(c, "slide_frames"), "close hard cuts (runs)": anyof(c, "hard_cut"), "close blank frames": med(c, "blank"),
            "close janky >16.7 / >33 ms": f'{med(c, "jank", "gt16")} / {med(c, "jank", "gt33")}',
        }
    if name == "addtray":
        return {
            "tray add slide frames": med(data, "slide_frames"), "tray add hard cuts (runs)": anyof(data, "hard_cut"),
            "tray button said Thêm 0 (runs)": anyof(data, "label_zero_seen"), "kcal count-up steps": med(data, "kcal_steps"),
            "kcal bar steps": med(data, "bar_steps"), "tray add blank frames": med(data, "blank"),
            "tray add janky >16.7 / >33 ms": f'{med(data, "jank", "gt16")} / {med(data, "jank", "gt33")}',
        }
    if name == "tabs":
        return {
            "tab -> Khám phá nav highlight (ms)": med(data, "to_explore", "nav_ms"), "tab -> Khám phá screen (ms)": med(data, "to_explore", "screen_ms"),
            "tab -> Hôm nay nav highlight (ms)": med(data, "to_today", "nav_ms"), "tab -> Hôm nay screen (ms)": med(data, "to_today", "screen_ms"),
            "tab -> Hôm nay food list drawn (ms)": med(data, "to_today", "list_ms"), "tab -> Hôm nay empty-list DOM frames": med(data, "to_today", "empty_dom_frames"),
            "tab -> Hôm nay blank frames": med(data, "to_today", "blank"),
        }
    if name == "rich":
        return {"Giàu tile pressed (ms)": med(data, "pressed_ms"), "Giàu screen (ms)": med(data, "screen_ms")}
    if name == "sheets":
        return {
            "calendar first open (ms)": med(data["calendar"], "first"), "calendar second open (ms)": med(data["calendar"], "second"),
            "⋯ menu first open (ms)": med(data["menu"], "first"), "⋯ menu second open (ms)": med(data["menu"], "second"),
        }
    return {}


async def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--label", default="run")
    ap.add_argument("--runs", type=int, default=3)
    ap.add_argument("--only", default="")
    ap.add_argument("--rates", default="1,4")
    args = ap.parse_args()
    only = [s for s in args.only.split(",") if s] or list(SCENARIOS)
    rates = [int(r) for r in args.rates.split(",")]
    summary = {}
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        sctx = await browser.new_context(viewport={"width": 1800, "height": 600})
        strip_page = await sctx.new_page()
        for name in only:
            for rate in rates:
                t0 = time.time()
                data = await SCENARIOS[name](browser, rate, args.label, strip_page, args.runs)
                summary[f"{name}@{rate}x"] = {"summary": summarize(name, rate, data), "raw": data}
                print(f"[{name} {rate}x] {round(time.time() - t0)} s", flush=True)
                for k, v in summary[f"{name}@{rate}x"]["summary"].items():
                    print(f"    {k}: {v}", flush=True)
        await browser.close()
    out = ROOT / f"docs/pr/fluid-add-probe-{args.label}.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(summary, ensure_ascii=False, indent=1))
    print(f"written {out.relative_to(ROOT)}")


if __name__ == "__main__":
    asyncio.run(main())
