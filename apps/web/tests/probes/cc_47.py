"""cc-47: the share image on WebKit (Safari, every iPhone browser) and with its fonts missing.

Grabs the SVG the share image is drawn from (an init script records every data:image/svg+xml the page loads) and
checks its embedded fonts: Manrope and Saira Condensed, as data URLs. It also draws that SVG with its fonts removed,
what a phone shows when the fonts are not in the picture, into .screenshots/cc-47-nofonts-<engine>.png (cc_44
checks that layout: nothing runs over anything else).
Run with: ALIGN_BASE_URL=http://localhost:3101 npm run probe -- tests/probes/cc_47.py
"""
import base64
import os
import re
import sys
import urllib.parse
from pathlib import Path

import _demo  # noqa: F401
from playwright.sync_api import sync_playwright

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3101")
SHOTS = Path(__file__).resolve().parent.parent.parent / ".screenshots"
SHOTS.mkdir(exist_ok=True)
problems = []

PROFILE = '{"sex":"male","birthYear":2003,"weightKg":65.4,"goal":"maintain","periodMode":false,"trainingMinutesDefault":60,"displayName":"Học viên A","hintSeen":true}'

# Records the SVG html-to-image hands to an <img> (its last step before the canvas)
GRAB = """
(() => {
  window.__shareSvgs = [];
  const desc = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
  Object.defineProperty(HTMLImageElement.prototype, 'src', {
    set(v) { if (typeof v === 'string' && v.startsWith('data:image/svg+xml')) window.__shareSvgs.push(v); desc.set.call(this, v); },
    get() { return desc.get.call(this); },
  });
})();
"""

# Draws an SVG data URL 1:1 into a canvas and returns it as a PNG data URL
DRAW = """async (src) => {
  const img = new Image();
  img.src = src;
  await img.decode();
  await new Promise((r) => setTimeout(r, 300));
  const c = document.createElement('canvas');
  c.width = img.naturalWidth; c.height = img.naturalHeight;
  c.getContext('2d').drawImage(img, 0, 0);
  return c.toDataURL('image/png');
}"""


def check(cond, msg):
    print(("[PASS] " if cond else "[FAIL] ") + msg)
    if not cond:
        problems.append(msg)


def grab(browser, engine):
    ctx = browser.new_context(viewport={"width": 390, "height": 844}, accept_downloads=True)
    ctx.add_init_script("try { localStorage.setItem('h1t_profile_v1_demo', JSON.stringify(%s)); } catch (e) {}" % PROFILE)
    ctx.add_init_script("Object.defineProperty(navigator, 'canShare', { value: undefined }); Object.defineProperty(navigator, 'share', { value: undefined });")
    ctx.add_init_script(GRAB)
    pg = ctx.new_page()
    pg.clock.set_fixed_time("2026-10-15T10:00:00+07:00")
    pg.goto(BASE + "/app?level=2", wait_until="networkidle")
    pg.locator("[aria-label='Chia sẻ ngày này'] >> visible=true").first.click()
    pg.get_by_role("dialog").get_by_role("img").wait_for(state="visible", timeout=30000)
    svgs = pg.evaluate("window.__shareSvgs")
    svg = next((s for s in reversed(svgs) if "data-share-root" in urllib.parse.unquote(s)), None)
    check(svg is not None, f"{engine}: the share SVG was grabbed ({len(svgs)} SVG(s))")
    return ctx, pg, svg


def main():
    with sync_playwright() as p:
        for engine in ("chromium", "webkit"):
            browser = getattr(p, engine).launch()
            ctx, pg, svg = grab(browser, engine)
            if svg:
                text = urllib.parse.unquote(svg.split(",", 1)[1])
                faces = re.findall(r"@font-face\s*{[^}]*}", text)
                families = sorted({m.strip("'\" ") for f in faces for m in re.findall(r"font-family:\s*([^;]+);", f)})
                print(f"  {engine}: {len(faces)} @font-face, families {families}, {len(text) // 1024} KB")
                check(any("manrope" in f.lower() for f in families), f"{engine}: Manrope is embedded")
                check(any("saira" in f.lower() for f in families), f"{engine}: Saira Condensed is embedded")
                (SHOTS / f"cc-47-{engine}.svg").write_text(text)
                # The same SVG with its fonts removed: what a phone draws when the fonts are not in the picture
                bare = re.sub(r"Manrope|Saira Condensed", "No Such Face", re.sub(r"@font-face\s*{[^}]*}", "", text))
                png = pg.evaluate(DRAW, "data:image/svg+xml;charset=utf-8," + urllib.parse.quote(bare))
                (SHOTS / f"cc-47-nofonts-{engine}.png").write_bytes(base64.b64decode(png.split(",", 1)[1]))
            ctx.close()
            browser.close()
    print(f"\n{len(problems)} problem(s)")
    sys.exit(1 if problems else 0)


if __name__ == "__main__":
    main()
