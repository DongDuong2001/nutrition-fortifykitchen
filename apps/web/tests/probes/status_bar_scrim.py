"""fix/status-bar-scrim: the status bar of the installed app (lib/status-bar). Run it against both builds:
  translucent (the default build): ALIGN_BASE_URL=http://localhost:3111 npm run probe -- tests/probes/status_bar_scrim.py
  default (STATUS_BAR=default build): STATUS_BAR_BUILD=default ALIGN_BASE_URL=http://localhost:3111 NEXT_DIST_DIR=.next-default (its own build and server) npm run probe -- tests/probes/status_bar_scrim.py
Production build, demo mode, 390x844 at 2x, the safe area faked with CDP (Emulation.setSafeAreaInsetsOverride, top 59 px = a Dynamic Island iPhone).
Hôm nay (/app), Chất béo (/micros/fat) and Ngày tập (/training).

translucent (iOS black-translucent: content runs under the bar, the clock is white):
- the meta tag says black-translucent; one scrim per page: fixed at the top, safe area + 12 px (71 px), dark glass (rgba 28 28 30 .82) with a blur,
  no pointer events, the first control at rest at y >= 59
- OFF at rest (opacity 0, no data-scrolled: the page and its wash show through), ON after the page scrolls (data-scrolled, opacity 1), OFF again at the top
- reduced transparency: solid ink, no blur, still fades; reduced motion: on/off (no transition); no safe area: 0 px; 1280: not drawn
default (iOS draws its own bar, black clock, content never under it):
- the meta tag says default; on an iPhone user agent the scrim never turns on; on Android's it does, as the tab bar's white glass (rgba 255 .86)
Screenshots: .screenshots/status-bar-scrim/<build>/<page>-rest.png, -scrolled.png (and -top.png strips). The clock is drawn by iOS, not by Chromium, so the
screenshots carry a mock one: white "19:54" over the page for translucent, a white bar with a black clock above the page for default.
"""
# PROBE_COVERS: components/ui/app-header.tsx app/globals.css lib/status-bar.ts app/layout.tsx app/(app)/(tabs)/app/** app/(app)/micros/** app/(app)/(dashboard)/training/**
import base64
import os
import sys

import _demo  # noqa: F401  (demo mode on for every page)
from playwright.sync_api import sync_playwright

BUILD = os.environ.get("STATUS_BAR_BUILD", "translucent")
BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3111")
NOW = "2026-10-23T20:15:00+07:00"
SHOTS = os.path.join(os.path.dirname(__file__), "..", "..", ".screenshots", "status-bar-scrim", BUILD)
INSET = 59
BAR = 54  # the height of iOS's own bar in "default" mode, for the mock
PAGES = [("homnay", "/app"), ("micros-fat", "/micros/fat"), ("ngay-tap", "/training")]
IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1"
ANDROID = "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36"
problems, notes = [], []


def check(cond, msg):
    (notes if cond else problems).append(("ok: " if cond else "") + msg)


def new_page(browser, width=390, height=844, inset=INSET, **kw):
    media = kw.pop("media", None)
    ctx = browser.new_context(viewport={"width": width, "height": height}, device_scale_factor=2, **kw)
    pg = ctx.new_page()
    pg.clock.set_fixed_time(NOW)
    cdp = ctx.new_cdp_session(pg)
    if inset:
        cdp.send("Emulation.setSafeAreaInsetsOverride", {"insets": {"top": inset, "bottom": 34}})
    if media:
        cdp.send("Emulation.setEmulatedMedia", {"features": [{"name": k, "value": v} for k, v in media.items()]})
    return ctx, pg


SCRIM = """() => {
  const el = document.querySelector('[data-status-scrim]');
  if (!el) return null;
  const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
  return { n: document.querySelectorAll('[data-status-scrim]').length, top: r.top, height: r.height, position: cs.position,
           bg: cs.backgroundColor, blur: cs.backdropFilter || cs.webkitBackdropFilter, events: cs.pointerEvents, mask: cs.maskImage || cs.webkitMaskImage,
           opacity: parseFloat(cs.opacity), scrolled: el.hasAttribute('data-scrolled'), tint: el.getAttribute('data-tint'), transition: cs.transitionDuration };
}"""
UNDER_CLOCK = """() => {
  const card = document.querySelector('.bg-ink');
  if (!card) return null;
  window.scrollTo(0, card.getBoundingClientRect().top + window.scrollY - 16);
  return card.getBoundingClientRect().top;
}"""
FIRST_CONTROL = "() => { const c = document.querySelector('header a, header button'); return c ? c.getBoundingClientRect().top : null; }"
# What iOS draws in translucent mode: its clock in white, and the signal, wifi and battery, over the page (it is not in Chromium)
MOCK_CLOCK = """() => {
  const bar = document.createElement('div');
  bar.setAttribute('data-mock-ios-bar', '');
  bar.style.cssText = 'position:fixed;top:0;left:0;right:0;height:59px;z-index:2147483647;pointer-events:none;color:#fff;font:600 17px -apple-system,BlinkMacSystemFont,sans-serif;';
  bar.innerHTML = '<span style="position:absolute;left:52px;top:18px">19:54</span><span style="position:absolute;right:28px;top:20px;display:flex;gap:6px;align-items:center"><i style="width:18px;height:11px;background:#fff;border-radius:2px;display:block"></i><i style="width:16px;height:11px;background:#fff;border-radius:6px;display:block"></i><i style="width:27px;height:13px;border:1.5px solid #fff;border-radius:4px;display:block"></i></span>';
  document.body.appendChild(bar);
}"""
NO_CLOCK = "() => document.querySelector('[data-mock-ios-bar]')?.remove()"


def mock_bar_html():
    return (
        f'<div style="width:390px;height:{BAR}px;background:#fff;color:#000;font:600 17px -apple-system,BlinkMacSystemFont,sans-serif;position:relative">'
        '<span style="position:absolute;left:52px;top:16px">19:54</span>'
        '<span style="position:absolute;right:28px;top:18px;display:flex;gap:6px;align-items:center"><i style="width:18px;height:11px;background:#000;border-radius:2px;display:block"></i>'
        '<i style="width:16px;height:11px;background:#000;border-radius:6px;display:block"></i><i style="width:27px;height:13px;border:1.5px solid #000;border-radius:4px;display:block"></i></span></div>'
    )


def stitch(browser, png_bytes, path):
    """The page under iOS's own bar (default mode): the mock bar above a screenshot of the page, in one picture."""
    ctx = browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2)
    pg = ctx.new_page()
    data = base64.b64encode(png_bytes).decode()
    pg.set_content(f'<body style="margin:0">{mock_bar_html()}<img src="data:image/png;base64,{data}" style="display:block;width:390px"></body>')
    pg.wait_for_timeout(200)
    pg.screenshot(path=path, clip={"x": 0, "y": 0, "width": 390, "height": 844})
    ctx.close()


def shots(browser, pg, name, tag):
    """One screenshot of the page as it is, with the mock iOS bar, and a strip of the top 150 px."""
    path = os.path.join(SHOTS, f"{name}-{tag}.png")
    if BUILD == "translucent":
        pg.evaluate(MOCK_CLOCK)
        pg.screenshot(path=path)
        pg.screenshot(path=os.path.join(SHOTS, f"{name}-{tag}-top.png"), clip={"x": 0, "y": 0, "width": 390, "height": 150})
        pg.evaluate(NO_CLOCK)
    else:
        stitch(browser, pg.screenshot(), path)


def run_translucent(browser):
    for name, route in PAGES:
        ctx, pg = new_page(browser)
        pg.goto(BASE + route, wait_until="networkidle")
        pg.wait_for_timeout(900)
        meta = pg.evaluate("() => document.querySelector('meta[name=apple-mobile-web-app-status-bar-style]')?.content")
        check(meta == "black-translucent", f"{name}: the status bar style is black-translucent ({meta})")
        s = pg.evaluate(SCRIM)
        check(s is not None and s["n"] == 1, f"{name}: one scrim")
        if s:
            check(s["position"] == "fixed" and s["top"] == 0, f"{name}: fixed at the top ({s['position']}, {s['top']})")
            check(abs(s["height"] - (INSET + 12)) < 0.5, f"{name}: {INSET} px of safe area + a 12 px fade ({s['height']} px)")
            check(s["tint"] == "dark" and "rgba(28, 28, 30, 0.82)" in s["bg"], f"{name}: dark glass for the white clock ({s['bg']})")
            check("blur" in s["blur"], f"{name}: blurred ({s['blur']})")
            check(s["events"] == "none", f"{name}: no pointer events")
            check("gradient" in (s["mask"] or ""), f"{name}: fades out at its lower edge")
            check(s["opacity"] == 0 and not s["scrolled"], f"{name}: OFF at rest (opacity {s['opacity']})")
            check(s["transition"] not in ("0s", ""), f"{name}: it fades ({s['transition']})")
        top = pg.evaluate(FIRST_CONTROL)
        check(top is not None and top >= INSET - 0.5, f"{name}: at rest the first control starts below the safe area ({top})")
        check(pg.evaluate("() => document.elementFromPoint(195, 30)?.closest('[data-status-scrim]') === null"), f"{name}: a tap at the clock reaches what is under the scrim")
        shots(browser, pg, name, "rest")
        under = pg.evaluate(UNDER_CLOCK)
        check(under is not None, f"{name}: an ink card to scroll under the clock")
        pg.wait_for_timeout(500)
        s = pg.evaluate(SCRIM)
        check(s["scrolled"] and s["opacity"] == 1, f"{name}: ON once the page has scrolled (opacity {s['opacity']})")
        shots(browser, pg, name, "scrolled")
        pg.evaluate("window.scrollTo(0, 0)")
        pg.wait_for_timeout(500)
        s = pg.evaluate(SCRIM)
        check(not s["scrolled"] and s["opacity"] == 0, f"{name}: OFF again at the top")
        ctx.close()

    # reduced transparency: solid ink, no blur, still fades
    ctx, pg = new_page(browser, media={"prefers-reduced-transparency": "reduce"})
    pg.goto(BASE + "/micros/fat", wait_until="networkidle")
    pg.wait_for_timeout(600)
    pg.evaluate(UNDER_CLOCK)
    pg.wait_for_timeout(500)
    s = pg.evaluate(SCRIM)
    check(s["bg"] == "rgb(17, 19, 23)" and s["blur"] in ("none", ""), f"reduced transparency: solid ink, no blur ({s['bg']}, {s['blur']})")
    check("gradient" in (s["mask"] or ""), "reduced transparency: still fades")
    shots(browser, pg, "micros-fat-reduced-transparency", "scrolled")
    ctx.close()

    # reduced motion: on/off, no fade
    ctx, pg = new_page(browser, reduced_motion="reduce")
    pg.goto(BASE + "/micros/fat", wait_until="networkidle")
    pg.wait_for_timeout(600)
    s = pg.evaluate(SCRIM)
    check(s["transition"] in ("0s", ""), f"reduced motion: no transition, just on and off ({s['transition']})")
    pg.evaluate(UNDER_CLOCK)
    pg.wait_for_timeout(150)
    s = pg.evaluate(SCRIM)
    check(s["scrolled"] and s["opacity"] == 1, "reduced motion: on at once after a scroll")
    ctx.close()

    # no safe area (a browser tab): nothing is drawn
    ctx, pg = new_page(browser, inset=0)
    pg.goto(BASE + "/micros/fat", wait_until="networkidle")
    pg.wait_for_timeout(600)
    pg.evaluate(UNDER_CLOCK)
    pg.wait_for_timeout(500)
    s = pg.evaluate(SCRIM)
    check(s["height"] == 0, f"no safe area: the scrim is 0 px high even scrolled ({s['height']})")
    ctx.close()

    # a page that is already scrolled when it is shown (Back) is on at once
    ctx, pg = new_page(browser)
    pg.goto(BASE + "/micros/fat", wait_until="networkidle")
    pg.wait_for_timeout(600)
    pg.evaluate("window.scrollTo(0, 300)")
    pg.wait_for_timeout(500)
    check(pg.evaluate(SCRIM)["scrolled"], "scrolled 300 px: on")
    ctx.close()

    # desktop: not drawn
    ctx, pg = new_page(browser, width=1280, height=800, inset=0)
    pg.goto(BASE + "/micros/fat", wait_until="networkidle")
    pg.wait_for_timeout(600)
    shown = pg.evaluate("() => { const el = document.querySelector('[data-status-scrim]'); return el ? getComputedStyle(el).display : 'none'; }")
    check(shown == "none", f"1280: the scrim is not drawn ({shown})")
    ctx.close()


def run_default(browser):
    for name, route in PAGES:
        # an iPhone: iOS draws its own bar, so there is no scrim at all, at rest or scrolled (the safe area there is 0; faked here as 0)
        ctx, pg = new_page(browser, inset=0, user_agent=IPHONE)
        pg.goto(BASE + route, wait_until="networkidle")
        pg.wait_for_timeout(900)
        meta = pg.evaluate("() => document.querySelector('meta[name=apple-mobile-web-app-status-bar-style]')?.content")
        check(meta == "default", f"{name}: the status bar style is default ({meta})")
        shots(browser, pg, name, "rest")
        pg.evaluate(UNDER_CLOCK)
        pg.wait_for_timeout(500)
        s = pg.evaluate(SCRIM)
        check(s is not None and not s["scrolled"] and s["opacity"] == 0, f"{name}: iPhone: the scrim never turns on")
        shots(browser, pg, name, "scrolled")
        ctx.close()
    # the same on an iPhone even if it reports a safe area: still never on
    ctx, pg = new_page(browser, user_agent=IPHONE)
    pg.goto(BASE + "/micros/fat", wait_until="networkidle")
    pg.wait_for_timeout(600)
    pg.evaluate(UNDER_CLOCK)
    pg.wait_for_timeout(500)
    check(not pg.evaluate(SCRIM)["scrolled"], "iPhone with a safe area: the scrim never turns on")
    ctx.close()
    # Android: it does, as the tab bar's white glass
    ctx, pg = new_page(browser, user_agent=ANDROID)
    pg.goto(BASE + "/micros/fat", wait_until="networkidle")
    pg.wait_for_timeout(600)
    pg.evaluate(UNDER_CLOCK)
    pg.wait_for_timeout(500)
    s = pg.evaluate(SCRIM)
    check(s["scrolled"] and s["opacity"] == 1, "Android: on once the page has scrolled")
    check(s["tint"] is None and "rgba(255, 255, 255, 0.86)" in s["bg"], f"Android: the tab bar's white glass ({s['bg']})")
    ctx.close()


with sync_playwright() as p:
    os.makedirs(SHOTS, exist_ok=True)
    browser = p.chromium.launch()
    (run_default if BUILD == "default" else run_translucent)(browser)
    browser.close()

for line in notes:
    print(line)
for line in problems:
    print("FAIL: " + line)
print(f"{len(notes)} ok, {len(problems)} FAIL")
sys.exit(1 if problems else 0)
