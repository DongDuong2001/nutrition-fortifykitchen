"""cc-28b: the Level decides what Hôm nay and the share image show.

Production build, clock fixed at 2026-10-15 10:00 Asia/Ho_Chi_Minh, demo mode (?level=0..5), 390x844 and 1440x900.
- The nutrient column lists exactly the Level's nutrients, in order; Level 3 and up has the Chi tiết béo & xơ band
  first with amounts only (no bar, no percent, "—" when unknown).
- "x/N đạt" counts the Level's micros: x/8, x/8, x/14, x/18, x/22.
- /micros keeps all 22 at every Level.
- The share image carries the Level badge, the Level's lists, and at Level 0 a short page is filled to 1920 with the
  footer at the bottom edge.
Run with: ALIGN_BASE_URL=http://localhost:3104 npm run probe -- tests/probes/cc_28b.py
"""
# PROBE_COVERS: app/(app)/(tabs)/app/** app/(app)/micros/**
import base64
import os
import re
import sys

import _demo  # noqa: F401
from playwright.sync_api import sync_playwright

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3104")
NOW = "2026-10-15T10:00:00+07:00"
SHOTS = os.path.join(os.path.dirname(__file__), "..", "..", ".screenshots")
HERO = "section[aria-label='Tổng kcal và dinh dưỡng đa lượng']"
BASIC_M = ["Sodium", "Potassium", "Calcium", "Magnesium", "Iron", "Zinc"]
LISTS = {
    0: {"Khoáng chất": BASIC_M, "Vitamin": ["Vitamin A", "Vitamin C"]},
    1: {"Khoáng chất": BASIC_M, "Vitamin": ["Vitamin A", "Vitamin C"]},
    2: {"Khoáng chất": BASIC_M + ["Selenium"], "Vitamin": ["Vitamin A", "Vitamin D", "Vitamin E", "Vitamin K", "Vitamin B6", "Folate", "Vitamin B12"]},
    3: {
        "Chi tiết béo & xơ": ["Béo không bão hòa đơn", "Béo không bão hòa đa", "Omega-3", "Omega-6", "Xơ hòa tan", "Xơ không tan"],
        "Khoáng chất": ["Sodium", "Potassium", "Calcium", "Magnesium", "Phosphorus", "Iron", "Zinc", "Copper", "Selenium"],
        "Vitamin": ["Vitamin A", "Vitamin D", "Vitamin E", "Vitamin K", "Vitamin B1", "Vitamin B3", "Vitamin B6", "Folate", "Vitamin B12"],
    },
    5: {
        "Chi tiết béo & xơ": ["Béo không bão hòa đơn", "Béo không bão hòa đa", "Omega-3", "Omega-6", "Xơ hòa tan", "Xơ không tan"],
        "Khoáng chất": ["Sodium", "Potassium", "Calcium", "Magnesium", "Phosphorus", "Iron", "Zinc", "Copper", "Manganese", "Selenium"],
        "Vitamin": ["Vitamin A", "Vitamin C", "Vitamin D", "Vitamin E", "Vitamin K", "Vitamin B1", "Vitamin B2", "Vitamin B3", "Vitamin B5", "Vitamin B6", "Folate", "Vitamin B12"],
    },
}
TOTAL = {0: 8, 1: 8, 2: 14, 3: 18, 5: 22}
problems, notes = [], []

WATCH = """
window.__shareSnaps = [];
(() => {
  let seen = false;
  setInterval(() => {
    const r = document.querySelector('[data-share-root]');
    if (!r) { seen = false; return; }
    if (seen) return;
    const f = r.querySelector('[data-share-footer]');
    if (!f) return;
    seen = true;
    const rr = r.getBoundingClientRect(), fr = f.getBoundingClientRect();
    const badge = r.querySelector('[data-level-badge]');
    window.__shareSnaps.push({
      text: r.innerText.replace(/\\s+/g, ' '),
      rootH: rr.height, footerGap: rr.bottom - fr.bottom,
      badge: badge ? badge.getAttribute('data-level-badge') : null,
      badgeText: badge ? badge.innerText.replace(/\\s+/g, ' ').trim() : null,
      top: r.firstElementChild ? r.firstElementChild.innerText.replace(/\\s+/g, ' ') : '',
      head: (() => { const h = r.querySelector('[data-share-header]'); if (!h) return null; const p0 = h.querySelector('h1, h2') || h.querySelector('p'); const b = h.querySelector('[data-level-badge]');
        const m = (e) => { const q = e.getBoundingClientRect(); return (q.top + q.bottom) / 2; };
        return { name: p0.innerText.trim(), nameMid: m(p0.parentElement), badgeMid: b ? m(b) : null }; })(),
      groups: [...r.querySelectorAll('aside[aria-label="Vi chất"] h3')].map(h => h.textContent.trim()),
      rows: [...r.querySelectorAll('aside[aria-label="Vi chất"] [data-align-group=home-nutrient]')].length,
    });
  }, 5);
})();
"""

SIZE_JS = """async (b64) => {
  const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
  return { w: img.naturalWidth, h: img.naturalHeight };
}"""


def check(cond, msg):
    (notes if cond else problems).append(("ok: " if cond else "") + msg)


def squash(t):
    return re.sub(r"\s+", " ", t).strip()


NAMED = '{"sex":"male","birthYear":2003,"weightKg":65.4,"goal":"maintain","periodMode":false,"trainingMinutesDefault":60,"displayName":"Học viên A","hintSeen":true}'


def new_page(browser, size, named=True):
    ctx = browser.new_context(viewport=size, accept_downloads=True)
    ctx.add_init_script(WATCH)
    # a demo account with a display name: the share image shows it beside the Level badge (named=False: a blank name)
    if named:
        ctx.add_init_script("try { localStorage.setItem('h1t_profile_v1_demo', JSON.stringify(%s)); } catch (e) {}" % NAMED)
    ctx.add_init_script("Object.defineProperty(navigator, 'canShare', { value: undefined }); Object.defineProperty(navigator, 'share', { value: undefined });")
    pg = ctx.new_page()
    pg.clock.set_fixed_time(NOW)
    return ctx, pg


def go(pg, route):
    pg.goto(BASE + route, wait_until="networkidle")
    pg.locator(HERO + " >> visible=true").first.wait_for(state="visible", timeout=8000)
    pg.wait_for_timeout(500)


def column(pg):
    """{group title: [row names]} and the extras rows' texts of the visible nutrient column."""
    return pg.evaluate(
        """() => {
          const aside = [...document.querySelectorAll("aside[aria-label='Vi chất']")].find(a => a.getBoundingClientRect().width > 0);
          const out = {}; const extras = [];
          for (const sec of aside.querySelectorAll('section')) {
            const title = sec.querySelector('h3').textContent.trim();  // cc-44: the pill draws it uppercase
            out[title] = [...sec.querySelectorAll('[data-align-group=home-nutrient]')].map(r => r.innerText.split('\\n')[0].trim());
            if (title.startsWith('Chi tiết')) for (const r of sec.querySelectorAll('[data-extra]')) extras.push({ text: r.innerText.replace(/\\s+/g, ' ').trim(), bars: r.querySelectorAll('[role=progressbar]').length, pct: /%/.test(r.innerText) });
          }
          return { groups: out, extras, summary: (aside.querySelector('[data-level-summary]') || {}).innerText || '' };
        }"""
    )


def level_run(browser, size, tag, level):
    w = size["width"]
    ctx, pg = new_page(browser, size)
    go(pg, f"/app?level={level}")
    col = column(pg)
    want = LISTS[level]
    check(list(col["groups"].keys()) == list(want.keys()), f"{tag} L{level}: groups {list(col['groups'].keys())}")
    for title, names in want.items():
        got = col["groups"].get(title, [])
        check(got == names, f"{tag} L{level}: {title} = {got}")
    m = re.search(r"(\d+)/(\d+) đạt", col["summary"])
    check(m is not None and int(m.group(2)) == TOTAL[level], f"{tag} L{level}: x/{TOTAL[level]} đạt ({squash(col['summary'])!r})")
    check("Thiếu nhiều nhất" in col["summary"], f"{tag} L{level}: Thiếu nhiều nhất is there")
    if level >= 3:
        check(len(col["extras"]) == 6, f"{tag} L{level}: six extras")
        check(all(e["bars"] == 0 and not e["pct"] for e in col["extras"]), f"{tag} L{level}: extras are amounts only {col['extras'][:2]}")
        check(any(e["text"].endswith("—") for e in col["extras"]) or any(re.search(r"\d", e["text"]) for e in col["extras"]), f"{tag} L{level}: extras show an amount or a dash")
        # V3 22/10: the extras header is the first section header, under the x/N đạt header (no ink band any more)
        top = pg.evaluate("""() => { const h = [...document.querySelectorAll("aside[aria-label='Vi chất'] h3")].find(x => x.getBoundingClientRect().width > 0); const s = document.querySelector("aside[aria-label='Vi chất'] [data-level-summary]"); return [h.getBoundingClientRect().top, s.getBoundingClientRect().bottom]; }""")
        check(top[0] >= top[1] - 1, f"{tag} L{level}: the first section header sits under the x/N đạt header ({top})")
    bars = pg.evaluate("[...document.querySelectorAll(\"aside[aria-label='Vi chất'] [role=progressbar]\")].filter(b => b.getBoundingClientRect().width > 0).length")
    check(bars == TOTAL[level], f"{tag} L{level}: one bar per counted nutrient ({bars})")
    pg.screenshot(path=os.path.join(SHOTS, f"cc-28b-home-L{level}-{w}.png"))
    if level in (0, 3):
        # /micros keeps all 22
        pg.goto(BASE + "/micros", wait_until="networkidle")
        pg.wait_for_timeout(500)
        body = squash(pg.inner_text("body"))
        # V3Micros: the segmented pair (phone) and the chips (desktop) carry the counts, x of the 12 vitamins and the 10 minerals
        check(re.search(r"Vitamin · \d+/12", body) is not None and re.search(r"Khoáng chất · \d+/10", body) is not None, f"{tag} L{level}: /micros lists all 12 vitamins and 10 minerals")
    ctx.close()


def share_run(browser, size, tag):
    w = size["width"]
    # Level 2, today, from a BLANK name: the sheet asks for the name first, then the image carries it
    ctx, pg = new_page(browser, size, named=False)
    go(pg, "/app?level=2")
    pg.get_by_role("button", name="Chia sẻ ngày này").click()
    dlg = pg.get_by_role("dialog")
    dlg.get_by_label("Tên hiện trên ảnh").wait_for(state="visible", timeout=5000)
    check(dlg.get_by_role("button", name="Tiếp tục", exact=True).is_disabled(), f"{tag} blank name: Tiếp tục is disabled")
    check(pg.evaluate("window.__shareSnaps.length") == 0, f"{tag} blank name: nothing is drawn before the name")
    dlg.get_by_label("Tên hiện trên ảnh").fill("Học viên A")
    dlg.get_by_role("button", name="Tiếp tục", exact=True).click()
    pg.get_by_role("dialog").get_by_role("img").wait_for(state="visible", timeout=20000)
    s = pg.evaluate("window.__shareSnaps[window.__shareSnaps.length - 1]")
    check(s and s["badge"] == "2" and "LEVEL 2" in s["badgeText"].upper(), f"{tag} share L2: badge ({s and s['badgeText']!r})")
    check(s and s["head"] and s["head"]["name"] == "HỌC VIÊN A" and abs(s["head"]["nameMid"] - s["head"]["badgeMid"]) <= 1.5, f"{tag} share L2: the badge is centred on the name column ({s and s['head']})")
    check(s and s["groups"] == ["Khoáng chất", "Vitamin"] and s["rows"] == 14, f"{tag} share L2: 14 nutrients ({s and s['rows']})")
    check(s and re.search(r"\d+/14 đạt", s["text"]) is not None, f"{tag} share L2: x/14 đạt in the image")
    with pg.expect_download() as info:
        pg.get_by_role("button", name="Lưu ảnh").click()
    path = os.path.join(SHOTS, f"cc-28b-share-L2-today-{w}.png")
    info.value.save_as(path)
    ctx.close()

    # Level 0 on a past day: short, so the page is filled to 1920 and the footer sits at the bottom
    ctx, pg = new_page(browser, size)
    go(pg, "/app?level=0&date=2026-10-14")
    pg.get_by_role("button", name="Chia sẻ ngày này").click()
    pg.get_by_role("dialog").get_by_role("img").wait_for(state="visible", timeout=20000)
    s = pg.evaluate("window.__shareSnaps[window.__shareSnaps.length - 1]")
    check(s and s["badge"] == "0", f"{tag} share L0: the badge is there at Level 0 ({s and s['badge']})")
    check(s and s["head"] and s["head"]["name"] == "HỌC VIÊN A" and abs(s["head"]["nameMid"] - s["head"]["badgeMid"]) <= 1.5, f"{tag} share L0: the badge is centred on the name column ({s and s['head']})")
    check(s and s["rows"] == 8, f"{tag} share L0: 8 nutrients ({s and s['rows']})")
    with pg.expect_download() as info:
        pg.get_by_role("button", name="Lưu ảnh").click()
    path = os.path.join(SHOTS, f"cc-28b-share-L0-past-{w}.png")
    info.value.save_as(path)
    with open(path, "rb") as f:
        dim = pg.evaluate(SIZE_JS, base64.b64encode(f.read()).decode())
    check(dim["w"] == 1080 and dim["h"] >= 1920, f"{tag} share L0: PNG {dim['w']}x{dim['h']}")
    check(s and s["footerGap"] <= 12, f"{tag} share L0: footer at the bottom edge (gap {s and s['footerGap']:.1f})")
    check(s and s["rootH"] >= 693.3 - 0.5, f"{tag} share L0: page is at least 1920 high when drawn ({s and s['rootH']:.1f})")
    ctx.close()

    # a long day at Level 5
    ctx, pg = new_page(browser, size)
    go(pg, "/app?level=5")
    pg.get_by_role("button", name="Chia sẻ ngày này").click()
    pg.get_by_role("dialog").get_by_role("img").wait_for(state="visible", timeout=20000)
    s = pg.evaluate("window.__shareSnaps[window.__shareSnaps.length - 1]")
    check(s and s["head"] and s["head"]["name"] == "HỌC VIÊN A", f"{tag} share L5: the name is on top ({s and s['head']})")
    check(s and s["badge"] == "5" and s["rows"] == 22 + 6, f"{tag} share L5: badge 5 and 22 nutrients plus 6 extras ({s and (s['badge'], s['rows'])})")
    with pg.expect_download() as info:
        pg.get_by_role("button", name="Lưu ảnh").click()
    path = os.path.join(SHOTS, f"cc-28b-share-L5-long-{w}.png")
    info.value.save_as(path)
    with open(path, "rb") as f:
        dim = pg.evaluate(SIZE_JS, base64.b64encode(f.read()).decode())
    check(dim["w"] == 1080 and dim["h"] > 1920, f"{tag} share L5: taller than 1920 ({dim['h']})")
    ctx.close()


with sync_playwright() as p:
    os.makedirs(SHOTS, exist_ok=True)
    browser = p.chromium.launch()
    for size, tag in [({"width": 390, "height": 844}, "390"), ({"width": 1440, "height": 900}, "1440")]:
        for level in (0, 1, 2, 3, 5):
            level_run(browser, size, tag, level)
        share_run(browser, size, tag)
    browser.close()

for line in notes:
    print(line)
for line in problems:
    print("FAIL: " + line)
print(f"{len(notes)} ok, {len(problems)} FAIL")
sys.exit(1 if problems else 0)
