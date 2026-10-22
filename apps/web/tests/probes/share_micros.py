"""fix/share-micros: the share image's nutrient column never overlaps, and "Thiếu nhiều nhất" lists only what is under 100 %.

For a long day (20 foods, every nutrient reached), a mixed day (12 foods) and a short day (2 foods), at Level 0 and
Level 5, the share image is made (Lưu ảnh) and its SVG laid out as a page: in the nutrient column no text line
crosses another, every row is drawn, the "x/N đạt" summary heads the card (V3ShareB), above the first group, and the colour key
sits below the last row. The PNGs go to docs/screenshots/share-micros/. A day with every nutrient reached has no "Thiếu nhiều nhất".
SHARE_MICROS_HOME=<tag> also saves Hôm nay at 390 and 1440 (sample day) as .screenshots/share-micros-home-<tag>-<w>.png,
to compare before and after.
Run with: ALIGN_BASE_URL=http://localhost:3101 npm run probe -- tests/probes/share_micros.py
"""
# PROBE_COVERS: app/(app)/(tabs)/app/** components/home/share-day.tsx components/home/nutrient-column.tsx
import base64
import json
import os
import sys
import urllib.parse
from pathlib import Path

import _demo  # noqa: F401
from playwright.sync_api import sync_playwright

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3101")
HOME_TAG = os.environ.get("SHARE_MICROS_HOME", "")
# SHARE_KEY_TAG=<tag> saves the colour key at 150 % text as .screenshots/share-key-150-<tag>.png (before / after)
KEY_TAG = os.environ.get("SHARE_KEY_TAG", "")
WEB = Path(__file__).resolve().parent.parent.parent
OUT = WEB.parent.parent / "docs" / "screenshots" / "share-micros"
OUT.mkdir(parents=True, exist_ok=True)
SHOTS = WEB / ".screenshots"
SHOTS.mkdir(exist_ok=True)
NOW = "2026-10-20T20:00:00+07:00"
ADDED_AT = "2026-10-20T02:00:00.000Z"
problems = []

# Day totals, spread evenly over the day's foods. "long": every nutrient well over its target (wide amounts such as
# 4.560 mg, so name and amount wrap); "mixed": about half reached; "short": two foods, little of anything.
FULL = {
    "sodium": 3420, "potassium": 4560, "calcium": 1380, "magnesium": 512, "phosphorus": 1640, "iron": 24.6, "zinc": 16.8,
    "copper": 2.34, "manganese": 4.82, "selenium": 112, "vitamin_a": 1260, "vitamin_c": 248, "vitamin_d": 21.5,
    "vitamin_e": 18.4, "vitamin_k": 186, "b1": 1.86, "b2": 2.14, "b3": 24.8, "b5": 7.2, "b6": 2.46, "folate": 612,
    "b12": 6.8, "monounsaturated_fat": 28.4, "polyunsaturated_fat": 18.6, "omega3": 2.84, "omega6": 14.2,
    "soluble_fiber": 6.4, "insoluble_fiber": 18.2,
}
HALF = {k: (v if i % 2 == 0 else v * 0.35) for i, (k, v) in enumerate(FULL.items())}
LOW = {k: v * 0.12 for k, v in FULL.items()}
NAMES = [
    "Phở bò tái nạm gầu", "Bánh mì thịt nướng pa tê", "Sữa chua Hy Lạp không đường", "Cơm gạo lứt", "Cá hồi áp chảo",
    "Rau muống xào tỏi", "Canh chua cá lóc", "Đậu hũ non sốt cà chua", "Trứng gà luộc", "Chuối tiêu",
    "Cam sành", "Sữa tươi không đường", "Hạt điều rang muối", "Thịt heo nạc rim", "Bông cải xanh luộc",
    "Khoai lang mật nướng", "Gỏi cuốn tôm thịt", "Yến mạch cán dẹt", "Bò lúc lắc khoai tây", "Nước ép cà rốt",
]
SLOTS = ["breakfast", "lunch", "dinner", "snack"]


def day(total, count):
    entries = []
    for i in range(count):
        n = {"energy": 120, "protein": 8, "carbs": 14, "fat": 4, "fiber": 2}
        n.update({k: round(v / count, 4) for k, v in total.items()})
        entries.append({
            "id": f"share-{i}", "foodId": f"share-food-{i}", "foodName": NAMES[i % len(NAMES)], "grams": 150,
            "displayQty": "150 g", "mealSlot": SLOTS[i % 4], "calories": 120, "protein": 8, "carbs": 14, "fat": 4,
            "fiber": 2, "nutrients": n, "addedAt": ADDED_AT,
        })
    return entries


# Two supplements on the long day (22 foods): amounts and percents in the thousands, so name, amount and percent no
# longer fit on one line in the 198 px column and the amount moves under the name
SUPPLEMENTS = [
    ("Viên uống vitamin C 1000", {"vitamin_c": 1000, "vitamin_d": 50, "b12": 500, "folate": 400}),
    ("Viên khoáng tổng hợp", {"potassium": 9900, "phosphorus": 9800, "magnesium": 1200, "calcium": 1200, "selenium": 200}),
]


def long_day():
    entries = day(FULL, 20)
    for i, (name, extra) in enumerate(SUPPLEMENTS):
        n = {"energy": 0, "protein": 0, "carbs": 0, "fat": 0, "fiber": 0, **extra}
        entries.append({
            "id": f"share-sup-{i}", "foodId": f"share-sup-{i}", "foodName": name, "grams": 1, "displayQty": "1 viên",
            "mealSlot": "dinner", "calories": 0, "protein": 0, "carbs": 0, "fat": 0, "fiber": 0, "nutrients": n, "addedAt": ADDED_AT,
        })
    return entries


DAYS = {"long": long_day(), "mixed": day(HALF, 12), "short": day(LOW, 2)}
NO_SAMPLE = json.dumps({f"item-{i}": {"deleted": True} for i in range(1, 8)})
PROFILE = {"sex": "male", "birthYear": 2003, "weightKg": 65.4, "goal": "maintain", "periodMode": False,
           "trainingMinutesDefault": 60, "displayName": "Học viên A", "hintSeen": True}

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

# The nutrient column of the laid-out share page: text lines of different texts must not cross; the summary sits
# above the first row; the colour key below the last row (bar included); the column ends above the footer.
COLUMN = """() => {
  const aside = document.querySelector('[data-share-root] aside[aria-label="Vi chất"]');
  if (!aside) return null;
  const lines = [];
  const walker = document.createTreeWalker(aside, NodeFilter.SHOW_TEXT);
  let n = 0;
  while (walker.nextNode()) {
    const t = walker.currentNode;
    if (!t.textContent.trim()) continue;
    const range = document.createRange();
    range.selectNodeContents(t);
    [...range.getClientRects()].filter((r) => r.width > 0 && r.height > 0).forEach((r) => lines.push({ n, r, text: t.textContent.trim() }));
    n++;
  }
  const overlap = [];
  for (let i = 0; i < lines.length; i++) for (let j = i + 1; j < lines.length; j++) {
    const a = lines[i], b = lines[j];
    if (a.n === b.n) continue;
    const w = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left);
    const h = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
    // As cc_44: lines cross when they share more than a third of the shorter one's height (a glyph box's leading
    // reaching into the next line is not a crossing) and more than 2 px of width
    if (w > 2 && h > Math.min(a.r.height, b.r.height) / 3) overlap.push(a.text + ' × ' + b.text);
  }
  // Text crossing a bar (a row's bar under the next row's name): more than half the bar's height
  const bars = [...aside.querySelectorAll('[role=progressbar]')].map((b) => b.getBoundingClientRect());
  const onBar = [];
  for (const l of lines) for (const b of bars) {
    const w = Math.min(l.r.right, b.right) - Math.max(l.r.left, b.left);
    const h = Math.min(l.r.bottom, b.bottom) - Math.max(l.r.top, b.top);
    if (w > 2 && h > (b.bottom - b.top) / 2) onBar.push(l.text);
  }
  const rows = [...aside.querySelectorAll('[data-align-group=home-nutrient]')];
  const summary = aside.querySelector('[data-level-summary]');
  const key = aside.querySelector('ul');
  // The last row's box and its bar
  const firstRow = Math.min(...rows.map((r) => r.getBoundingClientRect().top));
  const lastRow = Math.max(...rows.map((r) => r.getBoundingClientRect().bottom), ...bars.map((b) => b.bottom));
  const footer = document.querySelector('[data-share-footer]');
  const s = summary.getBoundingClientRect(), k = key.getBoundingClientRect(), a = aside.getBoundingClientRect();
  // Each key item holds its own label: nothing runs past the item's box, and no two items overlap (150 % text wraps the label)
  const items = [...key.querySelectorAll('li')];
  const keyOverflow = items.filter((li) => li.scrollWidth > li.clientWidth + 1).map((li) => li.innerText.trim() + ' ' + li.scrollWidth + '/' + li.clientWidth);
  const keyOverlap = [];
  for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
    const a = items[i].getBoundingClientRect(), b = items[j].getBoundingClientRect();
    if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1) keyOverlap.push(items[i].innerText.trim() + ' × ' + items[j].innerText.trim());
  }
  const keyLines = lines.filter((l) => key.contains(document.elementFromPoint(l.r.left + 1, l.r.top + 1)));
  return {
    overlap, onBar, keyOverflow, keyOverlap, rows: rows.length, bars: bars.length,
    firstRow, lastRow, summaryTop: s.top, summaryBottom: s.bottom, keyTop: k.top, keyBottom: k.bottom, asideBottom: a.bottom,
    footerTop: footer ? footer.getBoundingClientRect().top : null,
    summaryText: summary.innerText.replace(/\\s+/g, ' ').trim(),
    textBottom: Math.max(...lines.map((l) => l.r.bottom)),
    keyTexts: keyLines.length,
  };
}"""


def check(cond, msg):
    print(("[PASS] " if cond else "[FAIL] ") + msg)
    if not cond:
        problems.append(msg)
    return cond


def new_context(browser, entries, size, text=100):
    ctx = browser.new_context(viewport=size, accept_downloads=True)
    seed = ""
    if entries is not None:
        seed += f"localStorage.setItem('h1t_sample_edits_v1_demo', {json.dumps(NO_SAMPLE)});"
        seed += f"localStorage.setItem('h1t_added_entries_v1_demo', {json.dumps(json.dumps(entries))});"
    seed += f"localStorage.setItem('h1t_profile_v1_demo', {json.dumps(json.dumps(PROFILE))});"
    ctx.add_init_script("try {" + seed + "} catch (e) {}")
    ctx.add_init_script("Object.defineProperty(navigator, 'canShare', { value: undefined }); Object.defineProperty(navigator, 'share', { value: undefined });")
    ctx.add_init_script(GRAB_SVG)
    if text != 100:
        # The phone's text size (as cc_64_worst_case): every rem in the image grows with it
        ctx.add_init_script("document.addEventListener('DOMContentLoaded', () => { document.documentElement.style.fontSize = '%d%%'; });" % text)
    return ctx


def share(browser, kind, level, engine="chromium", text=100):
    tag = f"{kind}-L{level}" + ("" if engine == "chromium" else f"-{engine}") + ("" if text == 100 else f"-text{text}")
    ctx = new_context(browser, DAYS[kind], {"width": 390, "height": 844}, text)
    pg = ctx.new_page()
    pg.clock.set_fixed_time(NOW)
    pg.goto(f"{BASE}/app?level={level}", wait_until="networkidle")
    pg.wait_for_timeout(500)
    pg.locator("[aria-label='Chia sẻ ngày này'] >> visible=true").first.click()
    dlg = pg.get_by_role("dialog")
    try:
        dlg.get_by_role("img").wait_for(state="visible", timeout=30000)
    except Exception:
        check(False, f"{tag}: the preview never showed")
        ctx.close()
        return
    with pg.expect_download() as info:
        dlg.get_by_role("button", name="Lưu ảnh").click()
    # The a11y pass draws the same image as Chromium (the share page ignores the text scale): kept out of docs
    path = (SHOTS if engine == "a11y" or text != 100 else OUT) / f"share-{tag}.png"
    info.value.save_as(str(path))
    w = pg.evaluate(
        "async (b64) => { const i = new Image(); i.src = 'data:image/png;base64,' + b64; await i.decode(); return i.naturalWidth; }",
        base64.b64encode(path.read_bytes()).decode(),
    )
    check(w == 1080, f"{tag}: PNG 1080 wide ({w}) -> {path}")
    svgs = pg.evaluate("window.__shareSvgs")
    ctx.close()
    if not check(bool(svgs), f"{tag}: the SVG of the image was grabbed"):
        return
    body = urllib.parse.unquote(svgs[-1].split(",", 1)[1])
    for mode in ("", "stress"):
        column_checks(browser, body, kind, level, tag + MODE_TAG[mode], mode, text)


# A phone draws the SVG a hair wider than it laid out the page (another rasteriser, rounding at the 1080 px scale):
# the column must still not run over itself
STRESS = "[data-share-root] aside * { letter-spacing: 0.15px !important; }"
MODE_TAG = {"": "", "stress": " (text 0,15 px/char wider)"}


def column_checks(browser, body, kind, level, tag, mode, text=100):
    lay = browser.new_context(viewport={"width": 1080, "height": 900})
    lp = lay.new_page()
    lp.set_content('<!doctype html><html><head>' + (f"<style>{STRESS}</style>" if mode == "stress" else "") + '</head><body style="margin:0">' + body + "</body></html>")
    lp.wait_for_timeout(300)
    r = lp.evaluate(COLUMN)
    if text != 100 and KEY_TAG and kind == "mixed" and level == 0:
        lp.locator('[data-share-root] aside[aria-label="Vi chất"] ul').screenshot(path=str(SHOTS / f"share-key-150-{KEY_TAG}.png"))
    lay.close()
    if not check(r is not None, f"{tag}: the nutrient column is in the SVG"):
        return
    want_rows = 8 if level <= 1 else 28
    check(r["rows"] == want_rows, f"{tag}: every row drawn ({r['rows']}/{want_rows})")
    check(not r["overlap"], f"{tag}: no text line crosses another in the column ({r['overlap'][:4]})")
    # The stress pass widens every glyph after the columns were fixed: a label may then run 2 px into the card's padding, so it
    # only has to stay clear of its neighbours there
    check(not (r["keyOverflow"] if not mode else []) and not r["keyOverlap"], f"{tag}: the colour key wraps inside its items, none overlaps ({r['keyOverflow']} {r['keyOverlap']})")
    check(not r["onBar"], f"{tag}: no text over a bar ({r['onBar'][:4]})")
    check(r["summaryBottom"] <= r["firstRow"] + 0.5, f"{tag}: summary above the first row (summary bottom {r['summaryBottom']:.1f} ≤ first row {r['firstRow']:.1f})")
    check(r["keyTop"] >= r["lastRow"] - 0.5, f"{tag}: colour key below the last row (key {r['keyTop']:.1f} ≥ last row {r['lastRow']:.1f})")
    check(r["keyBottom"] <= r["asideBottom"] + 0.5 and (r["footerTop"] is None or r["textBottom"] <= r["footerTop"] + 0.5),
          f"{tag}: column text ends above the footer ({r['textBottom']:.1f} ≤ {r['footerTop']})")
    lacking = "Thiếu nhiều nhất" in r["summaryText"]
    if kind == "long":
        check(not lacking, f"{tag}: every nutrient reached, no Thiếu nhiều nhất ({r['summaryText']!r})")
    else:
        check(lacking, f"{tag}: Thiếu nhiều nhất lists what is under target ({r['summaryText']!r})")


def home(browser):
    for w, size in (("390", {"width": 390, "height": 844}), ("1440", {"width": 1440, "height": 900})):
        ctx = new_context(browser, None, size)
        pg = ctx.new_page()
        pg.clock.set_fixed_time("2026-10-15T10:00:00+07:00")
        pg.goto(f"{BASE}/app?level=2", wait_until="networkidle")
        pg.wait_for_timeout(900)
        pg.screenshot(path=str(SHOTS / f"share-micros-home-{HOME_TAG}-{w}.png"))
        ctx.close()


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        if HOME_TAG:
            home(browser)
        for kind in DAYS:
            for level in (0, 5):
                share(browser, kind, level)
        browser.close()
        # Android's font size setting (Chromium's text scaling) and WebKit (Safari, every iPhone browser): wider text,
        # so name and amount wrap onto two lines in more rows
        a11y = p.chromium.launch(args=["--blink-settings=textAutosizingEnabled=true,accessibilityFontScaleFactor=1.3"])
        for kind in ("long", "mixed"):
            for level in (0, 5):
                share(a11y, kind, level, "a11y")
        a11y.close()
        # The text size at 150 % (a phone's accessibility setting): the colour key wraps instead of running into itself
        big = p.chromium.launch()
        for kind in ("mixed", "short"):
            for level in (0, 5):
                share(big, kind, level, text=150)
        big.close()
        try:
            webkit = p.webkit.launch()
        except Exception as e:
            print(f"[SKIP] WebKit: not installed ({str(e).splitlines()[0]})")
        else:
            for kind in DAYS:
                for level in (0, 5):
                    share(webkit, kind, level, "webkit")
            webkit.close()
    print(f"\n{len(problems)} problem(s)")
    sys.exit(1 if problems else 0)


if __name__ == "__main__":
    main()
