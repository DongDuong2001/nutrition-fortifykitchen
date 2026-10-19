"""cc-44: white background, level colours and bar, English nutrient names, Hôm nay meal pills, desktop fixes.

Screenshots of the main routes at 390x844 and 1440x900 into .screenshots/cc-44-<route>-<w>.png (demo mode; the
empty day is the demo account with the seven sample foods deleted, as cc_26). CC44_TAG=<tag> adds the tag to the names (cc-44-<tag>-...), for work-in-progress shots.
Run with: ALIGN_BASE_URL=http://localhost:3101 npm run probe -- tests/probes/cc_44.py
"""
# PROBE_COVERS: app/(app)/(tabs)/app/** app/(app)/(tabs)/explore/** app/(app)/(tabs)/settings/** app/(app)/(tabs)/trends/** app/(app)/add/** app/(app)/micros/**
import json
import os
import re
import sys
import urllib.parse
from pathlib import Path

import _demo  # noqa: F401
from playwright.sync_api import sync_playwright

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3101")
TAG = os.environ.get("CC44_TAG", "")
SHOTS = Path(__file__).resolve().parent.parent.parent / ".screenshots"
SHOTS.mkdir(exist_ok=True)
SIZES = {"390": {"width": 390, "height": 844}, "1440": {"width": 1440, "height": 900}}
ROUTES = [
    ("home", "/app"),
    ("micros", "/micros"),
    ("trends", "/trends"),
    ("explore", "/explore"),
    ("add", "/add"),
    ("settings", "/settings"),
]
ONLY = [r for r in os.environ.get("CC44_ONLY", "").split(",") if r]
problems = []


# cc-47: records the SVG the share image is drawn from (the last data:image/svg+xml the page loads)
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

# cc-47: in the SVG laid out as a page: every text but data-share-wrap (food names, the name, "Thiếu nhiều nhất") is one
# line; a wrapped food name breaks between words; no line of one text crosses a line of another (a row running over
# the next); no box with text is wider than its box.
SHARE_LAYOUT = """() => {
  const root = document.querySelector('[data-share-root]');
  const multi = [], midWord = [], overlap = [], overflowH = [], lines = [];
  const linesOf = (range) => [...range.getClientRects()].filter((r) => r.width > 0 && r.height > 0);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let n = 0;
  while (walker.nextNode()) {
    const t = walker.currentNode, text = t.textContent;
    if (!text.trim()) continue;
    const range = document.createRange();
    range.selectNodeContents(t);
    const rects = linesOf(range);
    rects.forEach((r) => lines.push({ n, r, text: text.trim() }));
    n++;
    const wrap = t.parentElement.closest('[data-share-wrap]');
    if (!wrap && new Set(rects.map((r) => Math.round(r.top))).size > 1) multi.push(text.trim());
    if (wrap) {
      for (const m of text.matchAll(/\\S+/g)) {
        const w = document.createRange();
        w.setStart(t, m.index);
        w.setEnd(t, m.index + m[0].length);
        if (new Set(linesOf(w).map((r) => Math.round(r.top))).size > 1) midWord.push(m[0]);
      }
    }
  }
  // Lines cross when they share more than a third of the shorter one's height and more than 2 px of width
  for (let i = 0; i < lines.length; i++) {
    for (let j = i + 1; j < lines.length; j++) {
      const a = lines[i], b = lines[j];
      if (a.n === b.n) continue;
      const w = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left);
      const h = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
      if (w > 2 && h > Math.min(a.r.height, b.r.height) / 3) overlap.push(a.text + " × " + b.text);
    }
  }
  root.querySelectorAll('*').forEach((el) => {
    if (!el.textContent.trim() || ['inline', 'contents', 'none'].includes(getComputedStyle(el).display)) return;
    if (el.scrollWidth > el.clientWidth + 1) overflowH.push(el.textContent.trim().slice(0, 32));
  });
  return { multi, midWord, overlap, overflowH, texts: n };
}"""


def share_layout(browser, svg, tag):
    """The share SVG laid out as a page, with its fonts and without them (a phone where the fonts did not load)."""
    text = urllib.parse.unquote(svg.split(",", 1)[1])
    for fonts in (True, False):
        # Without fonts: no @font-face, and family names no machine has (this Mac has Manrope and Saira installed)
        body = text if fonts else re.sub(r"Manrope|Saira Condensed", "No Such Face", re.sub(r"@font-face\s*{[^}]*}", "", text))
        ctx = browser.new_context(viewport={"width": 1080, "height": 900})
        pg = ctx.new_page()
        pg.set_content('<!doctype html><html><body style="margin:0">' + body + "</body></html>")
        pg.wait_for_timeout(300)
        r = pg.evaluate(SHARE_LAYOUT)
        which = "with its fonts" if fonts else "without its fonts"
        check(r["texts"] > 40 and not r["multi"], f"share {tag} {which}: {r['texts']} texts, labels on one line ({r['multi']})")
        check(not r["midWord"], f"share {tag} {which}: food names break between words ({r['midWord']})")
        check(not r["overlap"], f"share {tag} {which}: no text runs over another ({r['overlap'][:6]})")
        if fonts:
            check(not r["overflowH"], f"share {tag} {which}: no text runs past its box ({r['overflowH']})")
        else:
            # A wider face cannot fit every box (the nutrient names); the fonts are checked before the picture is drawn
            print(f"[INFO] share {tag} {which}: wider than their box: {r['overflowH']}")
        ctx.close()


# cc-47: text enlarged by the phone. boost: text-size-adjust 130 % on html (mobile emulation). scale: every font size
# in the share page ×1.15 before it is measured. a11y: Chromium's own text scaling (Android's font size setting,
# the accessibility font scale factor, launched with --blink-settings).
BOOST = """document.addEventListener('DOMContentLoaded', () => {
  const s = document.createElement('style');
  s.textContent = 'html { -webkit-text-size-adjust: 130% !important; text-size-adjust: 130% !important; }';
  document.head.appendChild(s);
});"""
SCALE = """new MutationObserver((records, observer) => {
  const root = document.querySelector('[data-share-root]');
  if (!root || root.dataset.scaled) return;
  root.dataset.scaled = '1';
  const els = [root, ...root.querySelectorAll('*')];
  const sizes = els.map((el) => parseFloat(getComputedStyle(el).fontSize));
  els.forEach((el, i) => { el.style.fontSize = sizes[i] * 1.15 + 'px'; });
}).observe(document, { childList: true, subtree: true });"""
A11Y_ARGS = ["--blink-settings=textAutosizingEnabled=true,accessibilityFontScaleFactor=1.3"]
MOBILE = {"is_mobile": True, "has_touch": True, "device_scale_factor": 3}


def check(cond, msg):
    print(("[PASS] " if cond else "[FAIL] ") + msg)
    if not cond:
        problems.append(msg)
    return cond


def name(route, w):
    return f"cc-44-{TAG + '-' if TAG else ''}{route}-{w}.png"


# An empty day: the demo account with the seven sample foods deleted (cc_26's NO_SAMPLE)
NO_SAMPLE = json.dumps({f"item-{i}": {"deleted": True} for i in range(1, 8)})


def shoot(browser, route, path, w, empty=False):
    ctx = browser.new_context(viewport=SIZES[w])
    if empty:
        ctx.add_init_script(f"try {{ localStorage.setItem('h1t_sample_edits_v1_demo', {json.dumps(NO_SAMPLE)}); }} catch (e) {{}}")
    pg = ctx.new_page()
    pg.goto(BASE + path, wait_until="networkidle")
    pg.wait_for_timeout(900)
    overflow = pg.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
    check(overflow <= 0, f"{route} @{w}: no horizontal overflow ({overflow})")
    if route == "home":
        # Food names wrap (line-clamp-2, leading-tight): no descender or dot below is clipped ("Yogurt", "Cơm gạo lứt")
        names = pg.evaluate(
            """() => [...document.querySelectorAll("button[aria-pressed][aria-label*=', '] > span > span[title]")]
              .filter(e => e.getBoundingClientRect().width > 0)
              .map(e => ({ t: e.textContent.trim(), sh: e.scrollHeight, ch: e.clientHeight }))"""
        )
        clipped = [n for n in names if n["sh"] > n["ch"] + 1]
        check(len(names) >= 7 and not clipped, f"{route} @{w}: {len(names)} food names, none clipped ({clipped})")
    pg.screenshot(path=str(SHOTS / name(route, w)))
    ctx.close()


def share(browser, named, engine="chromium", variant="normal"):
    """The share image of the sample day at Level 2 ("5/14 đạt"; Lưu ảnh, no file sharing): saved PNG, 1080 wide, 972 CSS px high."""
    tag = "-".join(["named" if named else "unnamed"] + ([engine] if engine != "chromium" else []) + ([variant] if variant != "normal" else []))
    ctx = browser.new_context(viewport=SIZES["390"], accept_downloads=True, **(MOBILE if variant != "normal" else {}))
    if variant == "boost":
        ctx.add_init_script(BOOST)
    if variant == "scale":
        ctx.add_init_script(SCALE)
    profile = '{"sex":"male","birthYear":2003,"weightKg":65.4,"goal":"maintain","periodMode":false,"trainingMinutesDefault":60,"displayName":"%s","hintSeen":true}' % ("Học viên A" if named else "")
    ctx.add_init_script("try { localStorage.setItem('h1t_profile_v1_demo', JSON.stringify(%s)); } catch (e) {}" % profile)
    ctx.add_init_script("Object.defineProperty(navigator, 'canShare', { value: undefined }); Object.defineProperty(navigator, 'share', { value: undefined });")
    ctx.add_init_script(GRAB_SVG)
    pg = ctx.new_page()
    pg.clock.set_fixed_time("2026-10-15T10:00:00+07:00")
    pg.goto(BASE + "/app?level=2", wait_until="networkidle")
    if variant != "normal":
        # Mobile emulation: the install sheet opens first
        later = pg.get_by_role("dialog").get_by_text("Để sau", exact=True)
        if later.count():
            later.first.click()
            pg.wait_for_timeout(400)
    pg.locator("[aria-label='Chia sẻ ngày này'] >> visible=true").first.click()
    dlg = pg.get_by_role("dialog")
    if not named:
        # No display name: the sheet asks for one first (lib/share-card: the image always has a name)
        field = dlg.get_by_label("Tên hiện trên ảnh")
        field.wait_for(state="visible", timeout=10000)
        pg.screenshot(path=str(SHOTS / name("share-unnamed-step", "390")))
        field.fill("Minh")
        dlg.get_by_role("button", name="Tiếp tục", exact=True).click()
    try:
        dlg.get_by_role("img").wait_for(state="visible", timeout=30000)
    except Exception:
        pg.screenshot(path=str(SHOTS / name(f"share-{tag}-failed", "390")))
        check(False, f"share {tag}: the preview never showed")
        ctx.close()
        return
    with pg.expect_download() as info:
        dlg.get_by_role("button", name="Lưu ảnh").click()
    path = SHOTS / name(f"share-{tag}", "390")
    info.value.save_as(str(path))
    w, h = pg.evaluate(
        """async (b64) => { const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode(); return [img.naturalWidth, img.naturalHeight]; }""",
        __import__("base64").b64encode(path.read_bytes()).decode(),
    )
    css_h = round(h * 390 / 1080)
    check(w == 1080, f"share {tag}: 1080 wide ({w})")
    # ShareC2 says 972; "Thiếu nhiều nhất: Vitamin D, Calcium" wraps to a second 18 px line in the 174 px column: 989 (Hao accepted, 17/10)
    # WebKit's text metrics give 988 for Chromium's 989
    if variant == "normal":
        check(abs(css_h - 972) <= 1 or abs(css_h - 990) <= 2, f"share {tag}: 972 CSS px high, or 990 with the summary on two lines ({css_h}, PNG {h})")
    svgs = pg.evaluate("window.__shareSvgs")
    ctx.close()
    if check(bool(svgs), f"share {tag}: the SVG of the image was grabbed"):
        share_layout(browser, svgs[-1], tag)


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for w in SIZES:
            for route, path in ROUTES:
                if not ONLY or route in ONLY:
                    shoot(browser, route, path, w)
            if not ONLY or "home-empty" in ONLY:
                shoot(browser, "home-empty", "/app", w, empty=True)
        if not ONLY or "share" in ONLY:
            share(browser, True)
            share(browser, False)
            share(browser, True, variant="boost")
            share(browser, True, variant="scale")
        browser.close()
        if not ONLY or "share" in ONLY:
            a11y = p.chromium.launch(args=A11Y_ARGS)
            share(a11y, True, variant="a11y")
            a11y.close()
        # The share image is drawn in an SVG foreignObject: WebKit (Safari, every iPhone browser) lays it out on its own
        if not ONLY or "share" in ONLY:
            try:
                webkit = p.webkit.launch()
            except Exception as e:
                print(f"[SKIP] share on WebKit: not installed ({str(e).splitlines()[0]})")
            else:
                share(webkit, True, "webkit")
                webkit.close()
    print(f"\n{len(problems)} problem(s)")
    sys.exit(1 if problems else 0)


if __name__ == "__main__":
    main()
