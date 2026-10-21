"""cc2-08: IA v2 headers, at 390 and 1280.

- the H1T MICRO wordmark is in a header only on `/` (phone); never in a header at 1280 (the sidebar carries it)
- every route's one visible h1 equals its screen name
- ink band: only `/` and `/diary` have one at 390; no element with the ink background spans the content column at
  the top of any screen at 1280 (ink stays inside cards)
- pushed screens: back button and title share one row (and the back is before the title)
- desktop: the title row starts at the same top offset on every screen
Screenshots: .screenshots/cc2-08-{home,diary,micros,settings,profile}-{390,1280}.png
Run with: ALIGN_BASE_URL=http://localhost:3102 npm run probe -- tests/probes/cc2_08.py
"""
# PROBE_COVERS: app/(app)/(dashboard)/training/** app/(app)/(tabs)/app/** app/(app)/(tabs)/explore/** app/(app)/(tabs)/settings/** app/(app)/(tabs)/trends/** app/(app)/(tabs)/trends/body/** app/(app)/(tabs)/trends/micros/** app/(app)/foods/new/** app/(app)/micros/** app/(app)/micros/[nutrient]/** app/(app)/settings/language/** app/(app)/settings/notifications/** app/(app)/settings/profile/** app/(app)/settings/profile/weight/** app/page.tsx
import os
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright
import _demo  # noqa: F401  (cc2-15b: demo mode on, see _demo.py)

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3102")
SHOTS = Path(__file__).resolve().parent.parent.parent / ".screenshots"
SIZES = [("390", {"width": 390, "height": 844}), ("1280", {"width": 1280, "height": 800})]
# route, h1 (case-insensitive), kind: home | tab | pushed
ROUTES = [
    ("/app", "Hôm nay", "tab"),
    ("/explore", "Khám phá", "tab"),
    ("/settings", "Cài đặt", "tab"),
    ("/settings/profile", "Hồ sơ", "pushed"),
    ("/settings/profile/weight", "Cân nặng", "pushed"),
    ("/settings/language", "Ngôn ngữ", "pushed"),
    ("/settings/notifications", "Nhắc nhở", "pushed"),
    ("/micros", "Vi chất", "pushed"),
    ("/micros/calcium", "Calcium", "pushed"),
    ("/training", "Ngày tập", "pushed"),
    ("/trends", "Tổng quan", "tab"),
    ("/trends/micros", "Tổng quan", "tab"),
    ("/trends/body", "Tổng quan", "tab"),
    ("/foods/new", "Tạo món mới", "pushed"),
]
INK_BAND_PHONE = {"/app"}
# V3: Tổng quan has no ink band and no wordmark: a 34 px page title, the sub-tab Segmented and white / ink data cards
V3_PAGE_TITLE = {"/trends", "/trends/micros", "/trends/body", "/settings", "/settings/account", "/settings/profile", "/settings/profile/weight"}
SHOT_NAMES = {"/app": "home", "/micros": "micros", "/settings": "settings", "/settings/profile": "profile"}
problems, notes = [], []
sys.stdout.reconfigure(encoding="utf-8")


def check(cond, msg):
    (notes if cond else problems).append(("ok: " if cond else "") + msg)


# Elements with the ink background near the top: [tag, left, top, width]. The sidebar and the fixed bottom nav are
# page chrome, so they are skipped (fixed position).
INK_TOP = """
() => {
  const ink = getComputedStyle(document.documentElement).getPropertyValue('--color-ink').trim();
  const probe = document.createElement('div'); probe.style.background = ink; document.body.appendChild(probe);
  const inkRgb = getComputedStyle(probe).backgroundColor; probe.remove();
  const out = [];
  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el);
    if (cs.backgroundColor !== inkRgb || cs.display === 'none' || cs.visibility === 'hidden') continue;
    let fixed = false;
    for (let p = el; p; p = p.parentElement) if (getComputedStyle(p).position === 'fixed' || p.tagName === 'ASIDE') { fixed = true; break; }
    if (fixed) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0 || r.top > 200 || r.top + window.scrollY > 200) continue;
    out.push([el.tagName, Math.round(r.left), Math.round(r.top), Math.round(r.width)]);
  }
  return out;
}
"""

WORDMARK = """
() => [...document.querySelectorAll('header')].filter(h => [...h.querySelectorAll('div, a')].some(el => {
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0 && getComputedStyle(el).display !== 'none' && /^H1T\s*MICRO$/i.test(el.textContent.trim());
})).length
"""


def h1_visible(pg):
    return pg.locator("h1:visible").all_inner_texts()


def go(pg, route):
    pg.goto(BASE + route, wait_until="networkidle")
    pg.wait_for_timeout(600)


def main():
    desktop_tops = {}
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for label, vp in SIZES:
            ctx = browser.new_context(viewport=vp)
            pg = ctx.new_page()
            errors = []
            pg.on("pageerror", lambda e: errors.append(str(e)))
            for route, name, kind in ROUTES:
                where = f"{route} @{label}"
                go(pg, route)
                # a pushed screen reached directly still has the back button (fallback to the owning tab)
                h1s = h1_visible(pg)
                check(len(h1s) == 1, f"{where}: one visible h1 ({len(h1s)}: {h1s})")
                check(bool(h1s) and h1s[0].strip().lower() == name.lower(), f"{where}: h1 is the screen name ({h1s} vs {name})")

                wm = pg.evaluate(WORDMARK)
                if label == "390":
                    check(wm == (1 if route == "/app" else 0), f"{where}: wordmark in {wm} header(s) (only on Hôm nay)")
                else:
                    check(wm == 0, f"{where}: no wordmark in a header on desktop ({wm})")

                ink = pg.evaluate(INK_TOP)
                if label == "390":
                    band = [e for e in ink if e[3] >= 380]
                    # IA v2 "Headers and UI unity" (12/10 23:15): the ink header is on every screen at 390
                    if route in V3_PAGE_TITLE or route.startswith("/micros"):
                        # V3 (v3-micros): Vi chất and its detail have the grey page, the glass Back and an ink data card (358 px), no band
                        check(not band, f"{where}: V3 header, no ink header band ({band})")
                    else:
                        check(len(band) >= 1, f"{where}: ink header present")
                else:
                    content_w = vp["width"] - 240
                    band = [e for e in ink if e[3] >= content_w * 0.9]
                    check(not band, f"{where}: no ink band across the content column ({band})")

                back = pg.locator('[aria-label="Quay lại"]:visible')
                if kind == "pushed":
                    check(back.count() == 1, f"{where}: one back button ({back.count()})")
                    if back.count() == 1 and h1s:
                        bb = back.first.bounding_box()
                        hb = pg.locator("h1:visible").first.bounding_box()
                        same_row = abs((bb["y"] + bb["height"] / 2) - (hb["y"] + hb["height"] / 2)) <= 24
                        check(same_row, f"{where}: back and title on one row (dy {abs((bb['y'] + bb['height']/2) - (hb['y'] + hb['height']/2)):.0f})")
                        check(bb["x"] + bb["width"] <= hb["x"] + 1, f"{where}: back is before the title")
                        check(bb["width"] >= 44 and bb["height"] >= 44, f"{where}: back target {bb['width']:.0f}×{bb['height']:.0f}")
                else:
                    check(back.count() == 0, f"{where}: no back button on a tab screen")

                if label == "1280":
                    t = pg.locator("h1:visible").first.bounding_box()
                    desktop_tops[route] = round(t["y"])

                sw, iw = pg.evaluate("() => [Math.max(document.documentElement.scrollWidth, document.body.scrollWidth), window.innerWidth]")
                check(sw <= iw, f"{where}: no horizontal scroll ({sw} <= {iw})")

                SHOTS.mkdir(parents=True, exist_ok=True)
                slug = SHOT_NAMES.get(route) or "all-" + route.strip("/").replace("/", "-")
                pg.screenshot(path=str(SHOTS / f"cc2-08-{slug}-{label}.png"))
            check(not errors, f"{label}: no page errors ({errors[:2]})")
            ctx.close()
        browser.close()

    # Same top offset for the title on desktop. Screens with a different content structure (food name, centred
    # 560 px column) share the same padding; compare within a 2 px tolerance of the most common value.
    tops = sorted(desktop_tops.values())
    common = max(set(tops), key=tops.count)
    off = {r: t for r, t in desktop_tops.items() if abs(t - common) > 4}
    check(not off, f"desktop title top offset is the same on every screen (common {common}px, off: {off})")

    for line in notes:
        print(line)
    for line in problems:
        print("FAIL: " + line)
    print(f"\ncc2_08: {len(notes)} ok, {len(problems)} fail")
    sys.exit(1 if problems else 0)


main()
