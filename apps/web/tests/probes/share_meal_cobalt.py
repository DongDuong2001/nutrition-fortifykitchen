"""fix/share-meal-cobalt (24/10, Hao): in the share image the meal names are cobalt, as on Hôm nay.

The demo sample day, the image made with Lưu ảnh (1080 wide, the real export), its SVG laid out as a page: each meal header is the 8 px
meal dot, the name in cobalt (Saira, uppercase, as Hôm nay's meal header: same size, tracking and line height), then the kcal in ink at
75 %. Cobalt on white is above 4.5:1. SHARE_TAG=<before|after> names the PNG: .screenshots/share-meal-cobalt/share-<tag>.png.
Run with: ALIGN_BASE_URL=http://localhost:3114 SHARE_TAG=after npm run probe -- tests/probes/share_meal_cobalt.py
"""
# PROBE_COVERS: app/(app)/(tabs)/app/** components/home/share-day.tsx components/home/food-list.tsx
import base64
import json
import os
import sys
import urllib.parse
from pathlib import Path

import _demo  # noqa: F401
from playwright.sync_api import sync_playwright

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3114")
TAG = os.environ.get("SHARE_TAG", "after")
OUT = Path(__file__).resolve().parent.parent.parent / ".screenshots" / "share-meal-cobalt"
OUT.mkdir(parents=True, exist_ok=True)
NOW = "2026-10-12T20:00:00+07:00"
problems = []
PROFILE = json.dumps(json.dumps({"sex": "male", "birthYear": 2003, "weightKg": 65.4, "goal": "maintain", "periodMode": False, "trainingMinutesDefault": 60, "displayName": "Học viên A", "hintSeen": True}))

GRAB_SVG = """
(() => {
  window.__shareSvgs = [];
  const desc = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
  Object.defineProperty(HTMLImageElement.prototype, 'src', {
    set(v) { if (typeof v === 'string' && v.startsWith('data:image/svg+xml')) window.__shareSvgs.push(v); desc.set.call(this, v); },
    get() { return desc.get.call(this); },
  });
})();
"""

HEADERS = """() => [...document.querySelectorAll('[data-share-root] [data-align-group=share-meals]')]
  .filter((el) => el.children.length >= 3 && el.querySelector('[aria-hidden=true]') && el.querySelector('span.font-display'))
  .map((el) => {
    const [dot, name, kcal] = el.children;
    const n = getComputedStyle(name), k = getComputedStyle(kcal), d = getComputedStyle(dot);
    return { label: name.textContent.trim(), color: n.color, look: [n.fontSize, n.letterSpacing, n.lineHeight, n.textTransform, n.fontWeight, n.fontStyle, n.fontFamily],
             kcalColor: k.color, dot: [d.width, d.height], gap: getComputedStyle(el).columnGap };
  })"""

COBALT = "rgb(36, 87, 245)"


def check(cond, msg):
    print(("[PASS] " if cond else "[FAIL] ") + msg)
    if not cond:
        problems.append(msg)


def run(browser):
    ctx = browser.new_context(viewport={"width": 390, "height": 844}, accept_downloads=True)
    ctx.add_init_script("Object.defineProperty(navigator, 'canShare', { value: undefined }); Object.defineProperty(navigator, 'share', { value: undefined });")
    ctx.add_init_script(GRAB_SVG)
    ctx.add_init_script("try { localStorage.setItem('h1t_profile_v1_demo', " + PROFILE + "); } catch (e) {}")
    pg = ctx.new_page()
    pg.clock.set_fixed_time(NOW)
    pg.goto(BASE + "/app", wait_until="networkidle")
    pg.wait_for_timeout(800)
    pg.screenshot(path=str(OUT / f"home-{TAG}-390.png"))
    home_color = pg.evaluate("() => getComputedStyle(document.querySelector('[data-testid=meal-header] span:nth-child(2)')).color")
    home = pg.evaluate("""() => { const el = document.querySelector('[data-testid=meal-header]'); const n = getComputedStyle(el.children[1]); const b = el.children[0].getBoundingClientRect();
      return { look: [n.fontSize, n.letterSpacing, n.lineHeight, n.textTransform, n.fontWeight, n.fontStyle, n.fontFamily], dot: [b.width, b.height], gap: getComputedStyle(el).columnGap }; }""")
    pg.locator("[aria-label='Chia sẻ ngày này'] >> visible=true").first.click()
    dlg = pg.get_by_role("dialog")
    dlg.get_by_role("img").wait_for(state="visible", timeout=30000)
    with pg.expect_download() as info:
        dlg.get_by_role("button", name="Lưu ảnh").click()
    path = OUT / f"share-{TAG}.png"
    info.value.save_as(str(path))
    w, h = pg.evaluate(
        "async (b64) => { const i = new Image(); i.src = 'data:image/png;base64,' + b64; await i.decode(); return [i.naturalWidth, i.naturalHeight]; }",
        base64.b64encode(path.read_bytes()).decode(),
    )
    check(w == 1080, f"the export is 1080 wide ({w}x{h}) -> {path}")
    svgs = pg.evaluate("window.__shareSvgs")
    ctx.close()
    body = urllib.parse.unquote(svgs[-1].split(",", 1)[1])
    lay = browser.new_context(viewport={"width": 1080, "height": 900})
    lp = lay.new_page()
    lp.set_content('<!doctype html><html><head></head><body style="margin:0">' + body + "</body></html>")
    lp.wait_for_timeout(300)
    headers = lp.evaluate(HEADERS)
    lay.close()
    check(len(headers) >= 3, f"the image has its meal headers ({[h['label'] for h in headers]})")
    for h in headers:
        check(h["color"] == COBALT, f"{h['label']}: the name is cobalt, like Hôm nay's ({h['color']}; Hôm nay {home_color})")
        # Only Saira's italic face is loaded (globals.css), so Hôm nay's display text is italic whatever font-style says; the image's class says it
        # too. The laid-out SVG rounds the size a tenth of a pixel (14.9 for 15)
        same = abs(float(h["look"][0][:-2]) - float(home["look"][0][:-2])) <= 0.2 and h["look"][1:5] == home["look"][1:5] and h["look"][6] == home["look"][6]
        check(same, f"{h['label']}: size, tracking, line height, case, weight and face as Hôm nay's ({h['look']} vs {home['look']})")
        check(h["dot"] == ["8px", "8px"] and home["dot"] == [8, 8], f"{h['label']}: the dot is 8 px, as on Hôm nay ({h['dot']})")
        check(h["gap"] == home["gap"], f"{h['label']}: the gap to the name is Hôm nay's ({h['gap']} vs {home['gap']})")
        check(h["kcalColor"] != COBALT, f"{h['label']}: the kcal stays ink ({h['kcalColor']})")


with sync_playwright() as p:
    browser = p.chromium.launch()
    try:
        run(browser)
    finally:
        browser.close()

print(f"\n{len(problems)} problem(s)")
sys.exit(1 if problems else 0)
