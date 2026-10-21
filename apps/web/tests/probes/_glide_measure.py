"""feat/glide: how the switches feel, measured on a phone (390 x 844, demo build) at 1x and 4x CPU (CDP throttle).
One row per switch type:
  chip       /add: tap the Đạm chip -> the list changes
  giau-open  Khám phá: tap the Giàu Calcium tile -> the screen opens (the view transitions started, counted in the page)
  giau-tab   Giàu Calcium: tap Thực phẩm bổ sung -> the list changes
  nav-tab    bottom nav: Hôm nay -> Khám phá
Numbers per run (the median of --runs):
  first      ms from the touch to the first frame where something changed (new content, or an animation running)
  animated   frames in which the change is in motion: the glide wrapper's opacity < 1 or its transform moved, or a ::view-transition
             animation is running
  jank       frames later than 25 ms (1.5 frames) / 33 ms (2 frames) since the previous one, from the tap to the end of the window
  pop        frames where the content changed while nothing was in motion before or after (the hard swap Hao saw)
  vt         document.startViewTransition calls (counted in the page)
Frames come from requestAnimationFrame in the page; the filmstrips from the CDP screencast.
Run (a built demo server must be up; about 3 minutes):
  ALIGN_BASE_URL=http://localhost:3101 npm run probe -- tests/probes/_glide_measure.py --label after
  --label NAME   names the output files (docs/screenshots/glide/NAME/*.png, docs/pr/feat-glide-probe-NAME.json)
  --runs N       repeats per scenario and rate (default 3)
It prints the table and exits 0: a helper (the name starts with _, so probe:all skips it); the assertions are in glide_switch.py.
"""
import argparse
import asyncio
import json
import os
import statistics
import sys
import time
from pathlib import Path

from playwright.async_api import async_playwright

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3101")
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
RECORDER_JS = """
(() => {
  const rec = { on: false, frames: [], down: null, vt: 0, active: 0 };
  window.__g = rec;
  const orig = document.startViewTransition && document.startViewTransition.bind(document);
  if (orig) document.startViewTransition = function (...a) {
    rec.vt += 1;
    rec.active += 1;
    const vt = orig(...a);
    vt.finished.catch(() => {}).finally(() => { rec.active -= 1; });
    return vt;
  };
  const visible = (el) => !!el && el.getClientRects().length > 0;
  const first = (sel) => { for (const el of document.querySelectorAll(sel)) if (visible(el)) return el; return null; };
  const sample = (t) => {
    // The glide wrapper of the thing that switches (SwitchGlide, or EnterGlide of a tab): the one on screen
    const g = first('[data-glide]') || first('[data-glide-enter]');
    const cs = g ? getComputedStyle(g) : null;
    const m = cs && cs.transform !== 'none' ? new DOMMatrixReadOnly(cs.transform) : null;
    const row = first('[data-food-row]');
    const h1 = first('h1, h2');
    return {
      t,
      sig: (row ? row.textContent.slice(0, 40) : '') + '|' + location.pathname + '|' + (h1 ? h1.textContent.slice(0, 20) : ''),
      op: cs ? Number(cs.opacity) : 1,
      tx: m ? m.m41 : 0,
      pseudo: rec.active + document.getAnimations().filter((a) => a.playState !== 'finished' && a.effect && String(a.effect.pseudoElement || '').startsWith('::view-transition')).length,
    };
  };
  const loop = (t) => { if (!rec.on) return; rec.frames.push(sample(t)); requestAnimationFrame(loop); };
  rec.start = () => { rec.frames = []; rec.vt = 0; rec.active = 0; rec.down = null; rec.on = true; requestAnimationFrame(loop); };
  rec.stop = () => { rec.on = false; return rec.frames; };
  const pd = () => { if (rec.on && rec.down === null) rec.down = performance.now(); };
  document.addEventListener('pointerdown', pd, { capture: true });
  document.addEventListener('touchstart', pd, { capture: true, passive: true });
  rec.origin = performance.timeOrigin;
})();
"""
STRIP_HTML = """<!doctype html><meta charset=utf-8><style>
body{margin:0;background:#1b1b1b;font:12px/1.2 -apple-system,Helvetica,sans-serif;color:#eee}
.row{display:flex;gap:6px;padding:8px;align-items:flex-start}
.f{flex:none;width:130px}.f img{width:130px;display:block;border:1px solid #444}
.f b{display:block;padding:2px 0}h1{margin:0;padding:8px 8px 0;font-size:13px}</style>"""


class Screencast:
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


async def write_strip(page, path, title, frames, t0, max_frames=12, window_ms=500):
    keep = [i for i, f in enumerate(frames) if -60 <= f[0] - t0 <= window_ms]
    if not keep:
        return
    step = max(1, -(-len(keep) // max_frames))
    cells = [f'<div class="f"><b>{round(frames[i][0] - t0)} ms</b><img src="data:image/jpeg;base64,{frames[i][1]}"></div>' for i in keep[::step][:max_frames]]
    await page.set_content(STRIP_HTML + f"<h1>{title}</h1><div class=row>{''.join(cells)}</div>")
    await page.wait_for_timeout(50)
    path.parent.mkdir(parents=True, exist_ok=True)
    await page.locator(".row").screenshot(path=str(path))


def analyse(rows, down):
    """first / animated / jank / pop from the rAF samples, counted from the touch."""
    rows = [r for r in rows if down is None or r["t"] >= down - 20]
    if not rows:
        return {}
    moving = lambda r: r["op"] < 0.99 or abs(r["tx"]) > 0.5 or r["pseudo"] > 0
    sig0 = rows[0]["sig"]
    first = next((r["t"] - down for r in rows if r["sig"] != sig0 or moving(r)), None) if down is not None else None
    animated = sum(1 for r in rows if moving(r))
    deltas = [b["t"] - a["t"] for a, b in zip(rows, rows[1:])]
    pop = sum(1 for a, b in zip(rows, rows[1:]) if a["sig"] != b["sig"] and not moving(a) and not moving(b))
    return {
        "first_ms": None if first is None else round(first, 1),
        "animated": animated,
        "jank25": sum(1 for d in deltas if d > 25),
        "jank33": sum(1 for d in deltas if d > 33),
        "pop": pop,
    }


async def new_ctx(browser, rate):
    ctx = await browser.new_context(**PHONE)
    await ctx.add_init_script(SEED_JS)
    await ctx.add_init_script(RECORDER_JS)
    page = await ctx.new_page()
    cdp = await ctx.new_cdp_session(page)
    return ctx, page, cdp


async def record(page, cdp, action, settle_ms=900):
    sc = Screencast(cdp)
    await page.evaluate("window.__g.start()")
    await sc.start()
    wall0 = time.time() * 1000
    await action()
    await page.wait_for_timeout(settle_ms)
    rows = await page.evaluate("window.__g.stop()")
    down = await page.evaluate("window.__g.down")
    vt = await page.evaluate("window.__g.vt")
    origin = await page.evaluate("window.__g.origin")
    shots = await sc.stop()
    return rows, down, vt, shots, (origin + down if down is not None else wall0)


async def scenario(browser, name, rate, strip_page, label):
    ctx, page, cdp = await new_ctx(browser, rate)
    try:
        if name == "chip":
            await page.goto(BASE + "/add", wait_until="networkidle")
            await page.locator("[data-food-row]:visible").first.wait_for(timeout=15000)
            await page.wait_for_timeout(1500)
            await cdp.send("Emulation.setCPUThrottlingRate", {"rate": rate})
            chip = page.get_by_role("button", name="Đạm", exact=True)
            act = lambda: chip.tap()
        elif name == "giau-open":
            await page.goto(BASE + "/explore", wait_until="networkidle")
            await page.wait_for_timeout(1500)
            await cdp.send("Emulation.setCPUThrottlingRate", {"rate": rate})
            tile = page.locator("a[href='/explore/rich/calcium']").first
            act = lambda: tile.tap()
        elif name == "giau-tab":
            await page.goto(BASE + "/explore/rich/calcium", wait_until="networkidle")
            await page.locator("a[data-food-row]:visible").first.wait_for(timeout=15000)
            await page.wait_for_timeout(1500)
            await cdp.send("Emulation.setCPUThrottlingRate", {"rate": rate})
            tab = page.get_by_role("tab", name="Thực phẩm bổ sung", exact=True)
            act = lambda: tab.tap()
        else:
            await page.goto(BASE + "/app", wait_until="networkidle")
            await page.wait_for_timeout(1800)
            await cdp.send("Emulation.setCPUThrottlingRate", {"rate": rate})
            link = page.get_by_role("link", name="Khám phá").locator("visible=true").first
            act = lambda: link.tap()
        rows, down, vt, shots, t0 = await record(page, cdp, act)
        out = analyse(rows, down)
        out["vt"] = vt
        if strip_page is not None and rate == 1:
            await write_strip(strip_page, ROOT / "docs" / "screenshots" / "glide" / label / f"{name}.png", f"{label}: {name}", shots, t0)
        return out
    finally:
        await ctx.close()


def median(xs):
    xs = [x for x in xs if x is not None]
    return statistics.median(xs) if xs else None


async def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--label", default="after")
    ap.add_argument("--runs", type=int, default=3)
    ap.add_argument("--only", default="")
    args = ap.parse_args()
    names = [n for n in ["chip", "giau-open", "giau-tab", "nav-tab"] if not args.only or n in args.only.split(",")]
    result = {}
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        strip_ctx = await browser.new_context(viewport={"width": 1900, "height": 400})
        strip_page = await strip_ctx.new_page()
        for name in names:
            for rate in (1, 4):
                runs = []
                for i in range(args.runs):
                    runs.append(await scenario(browser, name, rate, strip_page if i == 0 else None, args.label))
                keys = ["first_ms", "animated", "jank25", "jank33", "pop", "vt"]
                result[f"{name}@{rate}x"] = {k: median([r.get(k) for r in runs]) for k in keys}
                print(f"{name:10} {rate}x  " + "  ".join(f"{k}={result[f'{name}@{rate}x'][k]}" for k in keys), flush=True)
        await browser.close()
    out = ROOT / "docs" / "pr" / f"feat-glide-probe-{args.label}.json"
    out.write_text(json.dumps(result, indent=1) + "\n")
    print(f"wrote {out}")


if __name__ == "__main__":
    asyncio.run(main())
    sys.exit(0)
