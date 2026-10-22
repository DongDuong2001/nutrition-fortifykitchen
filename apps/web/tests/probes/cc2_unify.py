"""cc2-unify: one header and one UI system on every route, at 390 and 1280.

Phone (V3): a header on the grey page (no ink slab) with the Saira title (34 px on a tab root and on Thiết lập xong, 28 px on
a pushed screen); one h1; the back chevron is at least 44 px where there is one.
Desktop: no full-width ink element at the top of the window, h1 is 32 px, the header starts at the same top offset.
Everywhere: no all-caps text outside the h1, Saira display text; no horizontal scroll.
Screenshots: .screenshots/cc2-unify-{overview,diary,explore,settings,micros,food}-{390,1280}.png
Run with: ALIGN_BASE_URL=http://localhost:3102 npm run probe -- tests/probes/cc2_unify.py
"""
# PROBE_COVERS: app/(app)/(dashboard)/training/** app/(app)/(tabs)/app/** app/(app)/(tabs)/explore/** app/(app)/(tabs)/settings/** app/(app)/(tabs)/trends/** app/(app)/(tabs)/trends/body/** app/(app)/(tabs)/trends/micros/** app/(app)/entry/[id]/** app/(app)/foods/[id]/** app/(app)/foods/new/** app/(app)/micros/** app/(app)/micros/[nutrient]/** app/(app)/settings/delete-account/** app/(app)/settings/language/** app/(app)/settings/notifications/** app/(app)/settings/profile/** app/(app)/settings/profile/weight/** app/(app)/setup/done/** app/(app)/setup/goal/** app/(app)/setup/profile/** app/install/** app/paywall/**
import os
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright
import _demo  # noqa: F401  (cc2-15b: demo mode on, see _demo.py)

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3102")
SHOTS = Path(__file__).resolve().parent.parent.parent / ".screenshots"
SIZES = [("390", {"width": 390, "height": 844}), ("1280", {"width": 1280, "height": 800})]
ROUTES = [
    "/app", "/trends", "/trends/micros", "/trends/body", "/micros", "/micros/calcium", "/training",
    "/explore", "/foods/food-cha-la", "/foods/new", "/entry/item-1", "/settings", "/settings/profile",
    "/settings/profile/weight", "/settings/language", "/settings/notifications", "/settings/delete-account",
    "/paywall", "/install", "/setup/profile", "/setup/goal", "/setup/done", "/this-page-does-not-exist",
]
# V3 (Cài đặt group): no ink slab; the screens ported so far
V3_SETTINGS = {"/settings", "/settings/profile", "/settings/profile/weight", "/settings/language", "/settings/notifications", "/settings/delete-account"}
# V3 push screens and status screens (Thêm món ăn detail, Tạo món mới, Sửa món, Gói, Cài đặt app, Thiết lập): the grey page, no ink slab
V3_PUSH = {"/micros", "/micros/calcium", "/training", "/foods/food-cha-la", "/foods/new", "/entry/item-1", "/paywall", "/install"}
V3_SETUP = {"/setup/profile", "/setup/goal", "/setup/done"}
# V3 status screen (§3.6): the 404 has a centred title, no header bar
STATUS_NO_HEADER = {"/this-page-does-not-exist"}
# Setup keeps its own desktop card layout (no header at desktop), see IA-v2 Decided 12/10
NO_HEADER_DESKTOP = {"/setup/profile", "/setup/goal", "/setup/done"}
SHOT_NAMES = {"/app": "diary", "/explore": "explore", "/settings": "settings", "/micros": "micros", "/foods/food-cha-la": "food"}
problems, notes = [], []

HEADER_JS = """() => {
  const vis = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden'; };
  const h = Array.from(document.querySelectorAll('header')).find(vis);
  const h1s = Array.from(document.querySelectorAll('h1')).filter(vis);
  const out = { header: null, h1Count: h1s.length };
  if (h) {
    const cs = getComputedStyle(h), r = h.getBoundingClientRect();
    const inner = h.firstElementChild, ics = inner ? getComputedStyle(inner) : null;
    const h1 = h.querySelector('h1');
    const h1cs = h1 ? getComputedStyle(h1) : null;
    const back = h.querySelector('a[aria-label="Quay lại"], button[aria-label="Quay lại"]');
    const br = back ? back.getBoundingClientRect() : null;
    out.header = {
      bg: cs.backgroundColor, radius: cs.borderBottomLeftRadius, top: Math.round(r.top), width: Math.round(r.width),
      padLeft: ics ? ics.paddingLeft : null, font: h1cs ? h1cs.fontFamily : null, size: h1cs ? h1cs.fontSize : null,
      h1Visible: h1 ? vis(h1) : false, backW: br ? Math.round(br.width) : null, backH: br ? Math.round(br.height) : null,
    };
  }
  // full-width ink element near the top of the window
  const inkBands = [];
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect();
    if (r.top > 160 || r.width < window.innerWidth * 0.9 || r.height < 24) continue;
    if (getComputedStyle(el).backgroundColor === 'rgb(17, 19, 23)') inkBands.push(el.tagName.toLowerCase() + '.' + String(el.className).slice(0, 40));
  }
  out.inkBands = inkBands;
  const caps = [];
  for (const el of document.body.querySelectorAll('*')) {
    if (!(el instanceof HTMLElement)) continue;
    const cs = getComputedStyle(el);
    if (cs.textTransform !== 'uppercase') continue;
    if (!Array.from(el.childNodes).some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
    if (!vis(el)) continue;
    if (cs.fontFamily.toLowerCase().includes('saira')) continue;
    caps.push((el.textContent || '').trim().slice(0, 30));
  }
  out.caps = caps;
  out.hScroll = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) > window.innerWidth;
  return out;
}"""


def check(cond, msg):
    (notes if cond else problems).append(("ok: " if cond else "") + msg)


def main():
    SHOTS.mkdir(exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for size_name, size in SIZES:
            ctx = browser.new_context(viewport=size)
            pg = ctx.new_page()
            seen = {}
            for route in ROUTES:
                pg.goto(BASE + route, wait_until="networkidle")
                pg.wait_for_timeout(400)
                d = pg.evaluate(HEADER_JS)
                where = f"{route} @ {size_name}"
                h = d["header"]
                desktop = size["width"] >= 1024
                if desktop and route in NO_HEADER_DESKTOP:
                    pass
                elif route in STATUS_NO_HEADER:
                    check(h is None and d["h1Count"] == 1, f"{where}: V3 status screen, one h1 and no header bar")
                else:
                    check(h is not None, f"{where}: has a header")
                if h:
                    check(d["h1Count"] == 1, f"{where}: exactly one visible h1 (got {d['h1Count']})")
                    check("saira" in (h["font"] or "").lower(), f"{where}: title font is Saira ({h['font']})")
                    if desktop:
                        # V3: Gọn 32 px; the Thiết lập done screen's title is the 34 px large title
                        check(h["size"] == ("34px" if route == "/setup/done" else "32px") or not h["h1Visible"], f"{where}: desktop title size (got {h['size']})")
                        check(h["bg"] != "rgb(17, 19, 23)" or h["width"] < 1000, f"{where}: no full-width ink header on desktop")
                    elif route in ("/app", "/explore"):
                        # V3 tab roots on the grey page: Hôm nay a 24 px title beside the wordmark, Khám phá the 34 px large title; 16 px sides
                        check(h["bg"] == "rgb(242, 242, 247)", f"{where}: V3 header sits on the page ({h['bg']})")
                        check(h["size"] == ("24px" if route == "/app" else "34px"), f"{where}: V3 title size ({h['size']})")
                        check(h["padLeft"] == "16px", f"{where}: 16 px sides ({h['padLeft']})")
                        check(h["top"] == 0, f"{where}: header at the top ({h['top']})")
                    elif route in V3_PUSH or route in V3_SETUP:
                        # V3: the grey page (setup: the page shows through), the glass Back and a 28 px title; Thiết lập xong a 34 px large title
                        check(h["bg"] in ("rgb(242, 242, 247)", "rgba(0, 0, 0, 0)"), f"{where}: V3 header sits on the page ({h['bg']})")
                        check(h["radius"] == "0px", f"{where}: no rounded ink slab ({h['radius']})")
                        check(h["size"] == ("34px" if route == "/setup/done" else "28px"), f"{where}: V3 title size ({h['size']})")
                        check(h["top"] == (16 if route == "/setup/done" else 0), f"{where}: header at the top ({h['top']})")
                    elif route in V3_SETTINGS:
                        # V3 Cài đặt: the tab root has a 34 px page title, its push screens the glass Back and a 28 px title, all on the grey page
                        check(h["bg"] == "rgb(242, 242, 247)", f"{where}: V3 header sits on the page ({h['bg']})")
                        check(h["size"] == ("34px" if route == "/settings" else "28px"), f"{where}: V3 title size ({h['size']})")
                        check(h["top"] == 0, f"{where}: header at the top ({h['top']})")
                    elif route.startswith("/trends"):
                        # V3: Tổng quan is a 34 px page title on the grey page (no ink slab)
                        check(h["bg"] == "rgb(242, 242, 247)", f"{where}: V3 header sits on the page ({h['bg']})")
                        check(h["size"] == "34px", f"{where}: V3 large title 34px ({h['size']})")
                        check(h["padLeft"] == "16px", f"{where}: 16 px sides ({h['padLeft']})")
                        check(h["top"] == 0, f"{where}: header at the top ({h['top']})")
                    else:
                        check(h["bg"] == "rgb(17, 19, 23)", f"{where}: phone header is ink ({h['bg']})")
                        check(h["radius"] == "20px", f"{where}: bottom radius 20 ({h['radius']})")
                        check(h["size"] == "24px", f"{where}: phone title 24px ({h['size']})")
                        check(h["padLeft"] == "16px", f"{where}: 16 px sides ({h['padLeft']})")
                        check(h["top"] == 0, f"{where}: header at the top ({h['top']})")
                    if h["backW"] is not None and not (desktop and route in NO_HEADER_DESKTOP):
                        check(h["backW"] >= 44 and h["backH"] >= 44, f"{where}: back is 44 px ({h['backW']}x{h['backH']})")
                if desktop:
                    check(not d["inkBands"], f"{where}: no ink band at the top ({d['inkBands']})")
                check(not d["caps"], f"{where}: no all-caps text outside titles ({d['caps']})")
                check(not d["hScroll"], f"{where}: no horizontal scroll")
                if route in SHOT_NAMES:
                    pg.screenshot(path=str(SHOTS / f"cc2-unify-{SHOT_NAMES[route]}-{size_name}.png"), full_page=True, animations="disabled")
            ctx.close()
        browser.close()

    for n in notes:
        print("[ok]", n[4:] if n.startswith("ok: ") else n)
    for pr in problems:
        print("[FAIL]", pr)
    print(f"\ncc2-unify: {len(notes)} ok, {len(problems)} fail")
    sys.exit(1 if problems else 0)


if __name__ == "__main__":
    main()
