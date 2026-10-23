"""fix/status-bar-scrim: the status bar of the installed app (black-translucent) no longer shows scrolled content under the clock.

Production build, demo mode, 390x844, the safe area faked with CDP (Emulation.setSafeAreaInsetsOverride, top 59 px = a Dynamic Island
iPhone). Hôm nay (/app), Chất béo (/micros/fat) and Ngày tập (/training):
- every phone header carries one scrim: fixed at the top, safe area + 12 px tall (71 px), the tab bar's glass (white .86 and a blur),
  no pointer events (a tap at the clock goes to what is under it)
- at rest the content still starts at the safe area (the first control is at or below 59 px)
- scrolled so that the ink card sits under the clock, the card's top 59 px is covered by the glass (a screenshot, and the blur is on)
- reduced transparency: solid white, no blur; no safe area (a browser tab): the scrim is 0 px high
- from 1024 px the scrim is not drawn
Screenshots: .screenshots/status-bar-scrim/<page>-rest.png and <page>-scrolled.png (390 at 2x), and -top.png (the top 150 px).
Run with: ALIGN_BASE_URL=http://localhost:3111 npm run probe -- tests/probes/status_bar_scrim.py
"""
# PROBE_COVERS: components/ui/app-header.tsx app/globals.css app/(app)/(tabs)/app/** app/(app)/micros/** app/(app)/(dashboard)/training/**
import os
import sys

import _demo  # noqa: F401  (demo mode on for every page)
from playwright.sync_api import sync_playwright

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3111")
NOW = "2026-10-23T20:15:00+07:00"
SHOTS = os.path.join(os.path.dirname(__file__), "..", "..", ".screenshots", "status-bar-scrim")
INSET = 59
PAGES = [("homnay", "/app"), ("micros-fat", "/micros/fat"), ("ngay-tap", "/training")]
problems, notes = [], []


def check(cond, msg):
    (notes if cond else problems).append(("ok: " if cond else "") + msg)


def new_page(browser, width=390, height=844, inset=INSET, **media):
    ctx = browser.new_context(viewport={"width": width, "height": height}, device_scale_factor=2)
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
           bg: cs.backgroundColor, blur: cs.backdropFilter || cs.webkitBackdropFilter, events: cs.pointerEvents, mask: cs.maskImage || cs.webkitMaskImage };
}"""
# Scroll the first ink card so its top sits 16 px from the top of the screen, under the clock
UNDER_CLOCK = """() => {
  const card = document.querySelector('.bg-ink');
  if (!card) return null;
  window.scrollTo(0, card.getBoundingClientRect().top + window.scrollY - 16);
  return card.getBoundingClientRect().top;
}"""
FIRST_CONTROL = "() => { const c = document.querySelector('header a, header button'); return c ? c.getBoundingClientRect().top : null; }"


def run(browser):
    os.makedirs(SHOTS, exist_ok=True)
    for name, route in PAGES:
        ctx, pg = new_page(browser)
        pg.goto(BASE + route, wait_until="networkidle")
        pg.wait_for_timeout(900)
        s = pg.evaluate(SCRIM)
        check(s is not None and s["n"] == 1, f"{name}: one scrim")
        if s:
            check(s["position"] == "fixed" and s["top"] == 0, f"{name}: fixed at the top ({s['position']}, {s['top']})")
            check(abs(s["height"] - (INSET + 12)) < 0.5, f"{name}: {INSET} px of safe area + a 12 px fade ({s['height']} px)")
            check("rgba(255, 255, 255, 0.86)" in s["bg"], f"{name}: the tab bar's glass fill ({s['bg']})")
            check("blur" in s["blur"], f"{name}: blurred ({s['blur']})")
            check(s["events"] == "none", f"{name}: no pointer events")
            check("gradient" in (s["mask"] or ""), f"{name}: fades out at its lower edge")
        top = pg.evaluate(FIRST_CONTROL)
        check(top is not None and top >= INSET - 0.5, f"{name}: at rest the first control starts below the safe area ({top})")
        hit = pg.evaluate("() => document.elementFromPoint(195, 30)?.closest('[data-status-scrim]') === null")
        check(hit, f"{name}: a tap at the clock reaches what is under the scrim")
        pg.screenshot(path=os.path.join(SHOTS, f"{name}-rest.png"))
        pg.screenshot(path=os.path.join(SHOTS, f"{name}-rest-top.png"), clip={"x": 0, "y": 0, "width": 390, "height": 150})
        under = pg.evaluate(UNDER_CLOCK)
        check(under is not None, f"{name}: an ink card to scroll under the clock")
        pg.wait_for_timeout(400)
        pg.screenshot(path=os.path.join(SHOTS, f"{name}-scrolled.png"))
        pg.screenshot(path=os.path.join(SHOTS, f"{name}-scrolled-top.png"), clip={"x": 0, "y": 0, "width": 390, "height": 150})
        ctx.close()

    # reduced transparency: solid, no blur
    ctx, pg = new_page(browser, **{"prefers-reduced-transparency": "reduce"})
    pg.goto(BASE + "/micros/fat", wait_until="networkidle")
    pg.wait_for_timeout(600)
    s = pg.evaluate(SCRIM)
    check(s is not None and s["bg"] == "rgb(255, 255, 255)" and s["blur"] in ("none", ""), f"reduced transparency: solid white, no blur ({s and (s['bg'], s['blur'])})")
    check(s is not None and "gradient" in (s["mask"] or ""), "reduced transparency: still fades")
    pg.evaluate(UNDER_CLOCK)
    pg.wait_for_timeout(300)
    pg.screenshot(path=os.path.join(SHOTS, "micros-fat-scrolled-reduced-transparency.png"))
    ctx.close()

    # no safe area (a browser tab): nothing is drawn
    ctx, pg = new_page(browser, inset=0)
    pg.goto(BASE + "/micros/fat", wait_until="networkidle")
    pg.wait_for_timeout(600)
    s = pg.evaluate(SCRIM)
    check(s is not None and s["height"] == 0, f"no safe area: the scrim is 0 px high ({s and s['height']})")
    ctx.close()

    # desktop: not drawn
    ctx, pg = new_page(browser, width=1280, height=800, inset=0)
    pg.goto(BASE + "/micros/fat", wait_until="networkidle")
    pg.wait_for_timeout(600)
    shown = pg.evaluate("() => { const el = document.querySelector('[data-status-scrim]'); return el ? getComputedStyle(el).display : 'none'; }")
    check(shown == "none", f"1280: the scrim is not drawn ({shown})")
    ctx.close()


with sync_playwright() as p:
    browser = p.chromium.launch()
    run(browser)
    browser.close()

for line in notes:
    print(line)
for line in problems:
    print("FAIL: " + line)
print(f"{len(notes)} ok, {len(problems)} FAIL")
sys.exit(1 if problems else 0)
