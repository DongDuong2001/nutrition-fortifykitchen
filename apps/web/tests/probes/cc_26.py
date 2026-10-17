"""cc-26 / cc-27g: share image = the Hôm nay screen.

Production build, clock fixed at 2026-10-15 10:00 Asia/Ho_Chi_Minh, sizes 390x844 and 1440x900.
- Empty day: the share icon is disabled and the reason "Chưa có món nào để chia sẻ" is visible.
- Today (demo): the sheet opens with a skeleton, then a preview; Lưu ảnh downloads h1t-micro-2026-10-15.png,
  1080 wide, at least 1920 high, paper at every edge (nothing clipped), not blank; no weight or email.
- The page behind the PNG (read while it is drawn): name on top when set, the date under it; no header, tab bar,
  Thêm, ⋯, dots, "Đủ 22 vi chất"; meals with no food absent; the four-level key today and on a
  past day, as a 2x2 grid; footer (ink band, wordmark, site and line), pinned to the bottom (gap 0, within 12 px).
- Header: the name in Saira 38 px uppercase over the date, the Level badge centred on that column, 86 px tall (a long name
  wraps and the header grows); footer: 58 px ink band, H1T white + MICRO in the dark cobalt token, lehongkhanh.vn over the line.
- A long day (12+ foods) is taller than 1920 with the footer fully inside; the height follows the content.
- Past day: the PNG uses level colours (4 levels), today's PNG uses them too (Hao, 16/10).
- Without file sharing, Lưu ảnh is the only (primary) button. With it, Chia sẻ calls navigator.share with one
  PNG file inside the tap; a cancelled share shows nothing; a failure shows a message and Thử lại.
- Esc closes and focus returns to the icon.
PNGs are saved to .screenshots/cc-27g-*.png (short, long and past days use the account "Học viên A").
Run with: ALIGN_BASE_URL=http://localhost:3104 npm run probe -- tests/probes/cc_26.py
"""
import base64
import json
import math
import os
import re
import sys

import _demo  # noqa: F401  (demo mode on; the empty-account check switches it off for its own page)
from playwright.sync_api import sync_playwright
from _home import wait_home

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3104")
NOW = "2026-10-15T10:00:00+07:00"
TODAY, PAST = "2026-10-15", "2026-10-14"
SHOTS = os.path.join(os.path.dirname(__file__), "..", "..", ".screenshots")
BUTTON = "[aria-label='Chia sẻ ngày này']"
SCALE = 1080 / 390
problems, notes = [], []

STUB_SHARE = """
window.__shares = []; window.__shareMode = 'ok';
navigator.canShare = () => true;
navigator.share = (data) => {
  window.__shares.push({ n: data.files.length, name: data.files[0].name, type: data.files[0].type, size: data.files[0].size });
  if (window.__shareMode === 'abort') return Promise.reject(new DOMException('cancelled', 'AbortError'));
  if (window.__shareMode === 'fail') return Promise.reject(new Error('boom'));
  return Promise.resolve();
};
"""
NO_SHARE = "Object.defineProperty(navigator, 'canShare', { value: undefined }); Object.defineProperty(navigator, 'share', { value: undefined });"

# Reads the page the PNG is drawn from while it is in the DOM (it is removed once the picture is made)
WATCH = """
window.__shareSnaps = [];
(() => {
  let seen = false;
  setInterval(() => {
    const r = document.querySelector('[data-share-root]');
    if (!r) { seen = false; return; }
    if (seen) return;
    seen = true;
    const f = r.querySelector('[data-share-footer]');
    if (!f) { seen = false; return; }
    const rr = r.getBoundingClientRect(), fr = f.getBoundingClientRect();
    window.__shareSnaps.push({
      text: r.innerText.replace(/\\s+/g, ' '),
      top: r.firstElementChild ? r.firstElementChild.innerText.replace(/\\s+/g, ' ') : '',
      rootW: rr.width, rootH: rr.height, footerGap: rr.bottom - fr.bottom, footerH: fr.height,
      controls: r.querySelectorAll('button, a, input, select, textarea').length,
      head: (() => { const h = r.querySelector('[data-share-header]'); if (!h) return null; const ps = [...h.querySelectorAll('p')]; const b = h.querySelector('[data-level-badge]');
        const c = (e) => { const q = e.getBoundingClientRect(); return { top: q.top, bottom: q.bottom, mid: (q.top + q.bottom) / 2, left: q.left, right: q.right }; };
        const cs0 = getComputedStyle(ps[0]), cs1 = ps.length > 1 ? getComputedStyle(ps[1]) : null;
        return { height: h.getBoundingClientRect().height, box: c(h), bg: getComputedStyle(h).backgroundColor, col: c(ps[0].parentElement), first: c(ps[0]), date: ps.length > 1 ? c(ps[1]) : null, badge: b ? c(b) : null,
          firstFs: parseFloat(cs0.fontSize), firstLh: cs0.lineHeight, firstTransform: cs0.textTransform, firstFamily: cs0.fontFamily, firstWeight: cs0.fontWeight, firstStyle: cs0.fontStyle, firstColor: cs0.color, firstText: ps[0].innerText,
          dateFs: cs1 ? parseFloat(cs1.fontSize) : null, dateWeight: cs1 ? cs1.fontWeight : null, dateColor: cs1 ? cs1.color : null, dateTransform: cs1 ? cs1.textTransform : null,
          paddingTop: parseFloat(getComputedStyle(h).paddingTop), paddingLeft: parseFloat(getComputedStyle(h).paddingLeft), badgeW: b ? b.getBoundingClientRect().width : null }; })(),
      foot: (() => { const cs = getComputedStyle(f); const spans = [...f.querySelectorAll('span')];
        const find = (t) => spans.find(x => x.children.length === 0 && x.textContent.trim() === t);
        const css = (e) => { const g = getComputedStyle(e), q = e.getBoundingClientRect(); return e ? { fs: parseFloat(g.fontSize), fw: g.fontWeight, color: g.color, family: g.fontFamily, style: g.fontStyle, right: q.right, left: q.left } : null; };
        return { bg: cs.backgroundColor, h: f.getBoundingClientRect().height, padL: parseFloat(cs.paddingLeft), padR: parseFloat(cs.paddingRight), h1t: css(find('H1T')), micro: css(find('MICRO')), site: css(find('lehongkhanh.vn')), line: css(find('Theo dõi vi chất mỗi ngày')),
          siteBox: find('lehongkhanh.vn').getBoundingClientRect(), lineBox: find('Theo dõi vi chất mỗi ngày').getBoundingClientRect(), right: f.getBoundingClientRect().right, left: f.getBoundingClientRect().left }; })(),
      keyGrid: (() => { const li = [...r.querySelectorAll('li')].filter(x => ['Thiếu <50%', 'Trung bình', 'Gần đủ', 'Đạt ≥100%'].includes(x.textContent.trim())); if (li.length !== 4) return null;
        const q = li.map(x => x.getBoundingClientRect()), sw = li.map(x => x.firstElementChild.getBoundingClientRect()); const ul = li[0].parentElement;
        const g = getComputedStyle(ul); return { labels: li.map(x => x.textContent.trim()), lefts: q.map(x => x.left), tops: q.map(x => x.top), heights: q.map(x => x.height), widths: q.map(x => x.width), swW: sw[0].width,
          colGap: g.columnGap, rowGap: g.rowGap, fs: getComputedStyle(li[0]).fontSize, nowrap: li.map(x => getComputedStyle(x).whiteSpace), colRight: ul.getBoundingClientRect().right, rights: q.map(x => x.right), swatchLabelGap: getComputedStyle(li[0]).columnGap, display: g.display }; })(),
      sections: [...r.querySelectorAll('section[aria-label]')].map(s => s.getAttribute('aria-label')).filter(n => n.startsWith('Bữa')),
      header: !!r.querySelector('header, nav'),
    });
  }, 5);
})();
"""

ANALYSE = """async (b64) => {
  const img = new Image();
  img.src = 'data:image/png;base64,' + b64;
  await img.decode();
  const c = document.createElement('canvas');
  c.width = img.naturalWidth; c.height = img.naturalHeight;
  const x = c.getContext('2d');
  x.drawImage(img, 0, 0);
  const W = c.width, H = c.height;
  const all = x.getImageData(0, 0, W, H).data;
  const px = (ix, iy) => { const o = (iy * W + ix) * 4; return all[o] + ',' + all[o + 1] + ',' + all[o + 2]; };
  const PAPER = '255,255,255';
  // White, or the 1 px divider under the header (ShareC2) that runs edge to edge
  const near = (k) => k.split(',').every((v, i) => Number(v) >= [228, 224, 216][i]);  // between the divider and white (the scaled line blends)
  let edgeBad = 0; const badAt = []; const mark = (ix, iy) => { edgeBad++; if (badAt.length < 4) badAt.push([ix, iy, px(ix, iy)]); };
  // Hôm nay runs edge to edge in its body (the two columns), so the side edges are checked above the body (paper)
  // and in the footer (an ink band); the top row is paper and the bottom row is ink.
  const bodyTop = Math.round(H * 0), headRows = 330;
  for (let i = bodyTop; i < Math.min(H, headRows); i++) { if (!near(px(0, i))) mark(0, i); if (!near(px(W - 1, i))) mark(W - 1, i); }
  // 6, not 2: when the page height is not a whole number of image rows, the last row's two corner pixels blend a
  // few levels lighter (anti-aliasing, cc-44)
  const INK = [17, 19, 23]; const nearInk = (k) => k.split(',').every((v, i) => Math.abs(Number(v) - INK[i]) <= 6);
  for (let i = H - 150; i < H; i++) { if (!nearInk(px(0, i))) mark(0, i); if (!nearInk(px(W - 1, i))) mark(W - 1, i); }
  for (let i = 0; i < W; i++) { if (!near(px(i, 0))) mark(i, 0); if (!nearInk(px(i, H - 1))) mark(i, H - 1); }
  let lastInk = -1;
  for (let y = H - 1; y >= 0 && lastInk < 0; y--) for (let ix = 0; ix < W; ix += 2) if (px(ix, y) !== PAPER) { lastInk = y; break; }
  const levels = { red: '242,69,61', yellow: '255,176,32', green: '128,216,160', blue: '47,196,107' };
  const found = { red: 0, yellow: 0, green: 0, blue: 0 };
  const whole = new Set();
  for (let i = 0; i < all.length; i += 4) {
    const key = all[i] + ',' + all[i + 1] + ',' + all[i + 2];
    for (const [name, rgb] of Object.entries(levels)) if (key === rgb) found[name]++;
    if (i % (4 * 97) === 0) whole.add(key);
  }
  return { w: W, h: H, corner: px(4, 4), edgeBad, badAt, lastInk, found, colours: whole.size };
}"""


def check(cond, msg):
    (notes if cond else problems).append(("ok: " if cond else "") + msg)


def entry(i, slot, name):
    return {
        "id": f"seed-{i}", "foodId": "food-seed", "foodName": name, "grams": 100 + i, "displayQty": f"{100 + i} g",
        "mealSlot": slot, "calories": 50 + i, "protein": 2, "carbs": 8, "fat": 1, "fiber": 1,
        "nutrients": {}, "addedAt": "2026-10-15T01:00:00.000Z",
    }


def seeded(slots):
    return json.dumps([entry(i, s, f"Món thử {i}") for i, s in enumerate(slots)])


NAMED = {"sex": "male", "birthYear": 2003, "weightKg": 65.4, "goal": "maintain", "periodMode": False, "trainingMinutesDefault": 60, "displayName": "Học viên A", "hintSeen": True}
NAMED_INIT = f"try {{ localStorage.setItem('h1t_profile_v1_demo', {json.dumps(json.dumps(NAMED))}); }} catch (e) {{}}"

NO_SAMPLE = json.dumps({f"item-{i}": {"deleted": True} for i in range(1, 8)})


def init(*parts):
    return "\n".join(["try {"] + list(parts) + ["} catch (e) {}"])


def local(key, value):
    return f"localStorage.setItem({json.dumps(key)}, {json.dumps(value)});"


def page(browser, size, init_script=None):
    ctx = browser.new_context(viewport=size, accept_downloads=True)
    ctx.add_init_script(WATCH)
    if init_script:
        ctx.add_init_script(init_script)
    pg = ctx.new_page()
    pg.on("pageerror", lambda e: problems.append(f"page error: {e}"))
    pg.on("console", lambda m: problems.append(f"console error: {m.text}") if m.type == "error" else None)
    pg.clock.set_fixed_time(NOW)
    return ctx, pg


def go(pg, route):
    pg.goto(BASE + route, wait_until="networkidle")
    try:
        wait_home(pg)
    except Exception:
        problems.append(f"{route} did not show Hôm nay; url {pg.url}; text {pg.inner_text('body')[:160]!r}")
        raise


def vis(pg, selector):
    return pg.locator(selector + " >> visible=true").first


def open_sheet(pg):
    vis(pg, BUTTON).click()
    pg.get_by_role("dialog").wait_for(state="visible", timeout=4000)


def wait_preview(pg):
    pg.get_by_role("dialog").get_by_role("img").wait_for(state="visible", timeout=15000)


def download(pg, name):
    with pg.expect_download() as info:
        pg.get_by_role("button", name="Lưu ảnh").click()
    path = os.path.join(SHOTS, name)
    info.value.save_as(path)
    return info.value.suggested_filename, path


def analyse(pg, path):
    with open(path, "rb") as f:
        return pg.evaluate(ANALYSE, base64.b64encode(f.read()).decode())


def snap(pg):
    snaps = pg.evaluate("window.__shareSnaps")
    return snaps[-1] if snaps else None


def check_head(s, tag, label, named):
    """Header (ShareC2): the name big over the date (8 px between), all centred in 86 px with the Level badge, a 1 px divider under it."""
    h = s and s.get("head")
    if not h:
        check(False, f"{tag} {label}: header geometry was not read")
        return
    check(h["badge"] is not None and abs(h["col"]["mid"] - h["badge"]["mid"]) <= 1.5, f"{tag} {label}: the badge is centred on the name column ({h['col']['mid']:.1f} vs {h['badge']['mid']:.1f})")
    check(h["height"] >= 86 - 0.5 and h["bg"] in ("rgba(0, 0, 0, 0)", "rgb(255, 255, 255)"), f"{tag} {label}: the header is at least 86 px on paper ({h['height']}, {h['bg']})")
    check(h["paddingLeft"] == 12 and abs(h["col"]["mid"] - (h["box"]["top"] + h["box"]["bottom"] - 1) / 2) <= 1.5, f"{tag} {label}: 12 px sides, name and date centred in the header above its 1 px divider (ShareC2) ({h['paddingLeft']}, {h['col']['mid']:.1f} vs {h['box']['top']:.1f}-{h['box']['bottom']:.1f})")
    check(abs(h["firstFs"] - 38) < 0.5 and h["firstTransform"] == "uppercase" and h["firstWeight"] in ("800", "900") and h["firstStyle"] == "italic" and "Saira" in h["firstFamily"] and h["firstColor"] == "rgb(17, 19, 23)",
          f"{tag} {label}: the name is Saira italic 38 px uppercase ink ({h['firstFs']}, {h['firstTransform']}, {h['firstWeight']}, {h['firstFamily'][:24]}, {h['firstColor']})")
    check(h["firstText"] == h["firstText"].upper(), f"{tag} {label}: the name reads in capitals ({h['firstText']!r})")
    check(h["badgeW"] is not None and h["badgeW"] >= 80, f"{tag} {label}: the badge keeps its width ({h['badgeW']})")
    check(h["badge"] is not None and h["first"]["right"] <= h["badge"]["left"] - 4, f"{tag} {label}: the name stops short of the badge (the skewed badge's box reaches 4.7 px left of its face) ({h['first']['right']:.1f} vs {h['badge']['left']:.1f})")
    if named:
        lh = h["first"]["bottom"] - h["first"]["top"]
        check(abs(lh / h["firstFs"] / round(lh / (h["firstFs"] * 0.9)) - 0.9) < 0.02, f"{tag} {label}: name line-height 0.9 ({lh:.1f} px for {h['firstFs']} px)")
        check(h["date"] is not None and abs(h["date"]["top"] - h["first"]["bottom"] - 8) <= 1, f"{tag} {label}: the date sits 8 px under the name ({h['date'] and h['date']['top'] - h['first']['bottom']:.1f})")
        check(abs(h["dateFs"] - 13) < 0.5 and h["dateWeight"] == "500" and h["dateTransform"] == "none" and h["dateColor"] == "rgb(107, 106, 102)", f"{tag} {label}: the date is 13 px 500 secondary, sentence case ({h['dateFs']}, {h['dateWeight']}, {h['dateTransform']}, {h['dateColor']})")
        check(abs(h["date"]["left"] - h["first"]["left"]) <= 1, f"{tag} {label}: date and name share a left edge")
    else:
        check(h["date"] is None, f"{tag} {label}: no second row without a name")


def check_frame(s, tag, label):
    """Footer band and the 2x2 colour key."""
    f = s and s.get("foot")
    if not f:
        check(False, f"{tag} {label}: footer geometry was not read")
        return
    check(f["bg"] == "rgb(17, 19, 23)" and abs(f["h"] - 58) <= 0.5 and f["padL"] == 16 and f["padR"] == 16, f"{tag} {label}: footer is a 58 px ink band, padding 16 ({f['bg']}, {f['h']}, {f['padL']}, {f['padR']})")
    check(f["h1t"]["color"] == "rgb(255, 255, 255)" and f["micro"]["color"] == "rgb(92, 134, 242)" and f["h1t"]["fs"] == 24 and f["micro"]["fs"] == 24 and f["h1t"]["style"] == "italic" and "Saira" in f["h1t"]["family"],
          f"{tag} {label}: H1T white, MICRO #5C86F2 token, Saira italic 24 px ({f['h1t']['color']}, {f['micro']['color']}, {f['h1t']['fs']})")
    check(f["site"]["fs"] == 13 and f["site"]["fw"] == "800" and f["site"]["color"] == "rgb(255, 255, 255)", f"{tag} {label}: lehongkhanh.vn 13 px 800 white ({f['site']['fs']}, {f['site']['fw']}, {f['site']['color']})")
    check(f["line"]["fs"] == 11 and f["line"]["fw"] == "500" and f["line"]["color"] == "rgb(169, 168, 163)", f"{tag} {label}: the line is 11 px 500 #A9A8A3 ({f['line']['fs']}, {f['line']['fw']}, {f['line']['color']})")
    check(abs(f["siteBox"]["right"] - f["lineBox"]["right"]) <= 0.6 and abs(f["right"] - 16 - f["siteBox"]["right"]) <= 0.6, f"{tag} {label}: the right column is right-aligned on the 16 px edge")
    check(abs((f["lineBox"]["top"] - f["siteBox"]["bottom"]) - 2) <= 1, f"{tag} {label}: 2 px between site and line ({f['lineBox']['top'] - f['siteBox']['bottom']:.1f})")
    check(abs(f["h1t"]["left"] - (f["left"] + 16)) <= 0.6, f"{tag} {label}: the wordmark starts on the 16 px edge")
    k = s.get("keyGrid")
    if not k:
        check(False, f"{tag} {label}: the colour key was not read")
        return
    check(k["display"] == "grid" and k["labels"] == ["Thiếu <50%", "Trung bình", "Gần đủ", "Đạt ≥100%"], f"{tag} {label}: the key is a grid in the order Thiếu, Trung bình / Gần đủ, Đạt ({k['labels']})")
    check(abs(k["tops"][0] - k["tops"][1]) < 0.5 and abs(k["tops"][2] - k["tops"][3]) < 0.5 and k["tops"][2] > k["tops"][0] and abs(k["lefts"][0] - k["lefts"][2]) < 0.5 and abs(k["lefts"][1] - k["lefts"][3]) < 0.5 and k["lefts"][1] > k["lefts"][0], f"{tag} {label}: 2 columns by 2 rows")
    check(k["colGap"] == "10px" and k["rowGap"] == "6px" and k["swatchLabelGap"] == "6px" and k["fs"] == "11px", f"{tag} {label}: gaps 10 / 6 / 6 and 11 px labels ({k['colGap']}, {k['rowGap']}, {k['swatchLabelGap']}, {k['fs']})")
    check(all(w == "nowrap" for w in k["nowrap"]) and all(h < 16 for h in k["heights"]), f"{tag} {label}: labels never wrap ({k['heights']})")
    check(max(k["rights"]) <= k["colRight"] + 0.5, f"{tag} {label}: the grid stays inside the column")


def check_png(info, snapshot, tag, label):
    check(info["w"] == 1080 and info["h"] >= 1920, f"{tag} {label}: PNG is {info['w']}x{info['h']} (1080 wide, 1920 high at least)")
    check(info["edgeBad"] == 0, f"{tag} {label}: paper above the body, ink in the footer, nothing clipped ({info['edgeBad']} off-paper edge pixels {info['badAt']})")
    check(info["colours"] >= 8, f"{tag} {label}: not blank ({info['colours']} colours)")
    if snapshot:
        want = max(1920, math.ceil(snapshot["rootH"] * SCALE - 1e-6))
        check(abs(info["h"] - want) <= 1, f"{tag} {label}: height follows the content ({info['h']} vs {want} from {snapshot['rootH']:.1f} px)")
        check(snapshot["footerGap"] <= 12 and snapshot["footerGap"] >= -0.5, f"{tag} {label}: footer is at the bottom edge (gap {snapshot['footerGap']:.1f} px)")
        # the ink band runs to the bottom edge
        low = info["h"] - 1 - info["lastInk"]
        check(low <= 1, f"{tag} {label}: the footer band ends at the bottom edge ({low} px from it)")


def run(browser, size, tag):
    w = size["width"]
    # an empty day: every sample item deleted (demo history keeps yesterday)
    ctx, pg = page(browser, size, init(local("h1t_sample_edits_v1_demo", NO_SAMPLE)))
    go(pg, "/")
    btn = vis(pg, BUTTON)
    check(btn.is_disabled(), f"{tag} empty day: share icon is disabled")
    check(pg.get_by_text("Chưa có món nào để chia sẻ").is_visible(), f"{tag} empty day: the reason is visible")
    box = btn.bounding_box()
    check(box["width"] >= 44 and box["height"] >= 44, f"{tag} icon is 44 px ({box['width']}x{box['height']})")
    ctx.close()

    # today with a name, no file sharing: Lưu ảnh is the primary button
    profile = {"sex": "male", "birthYear": 2003, "weightKg": 65.4, "goal": "maintain", "periodMode": False, "trainingMinutesDefault": 60, "displayName": "Học viên Có Tên Khá Dài Mẫu"}
    ctx, pg = page(browser, size, init(NO_SHARE, local("h1t_profile_v1_demo", json.dumps(profile))))
    go(pg, "/")
    btn = vis(pg, BUTTON)
    check(btn.is_enabled(), f"{tag} today: share icon enabled")
    btn.click()
    pg.get_by_role("dialog").wait_for(state="visible")
    wait_preview(pg)
    dialog = pg.get_by_role("dialog")
    check(dialog.get_by_role("button", name="Chia sẻ", exact=True).count() == 0, f"{tag} no Chia sẻ without file sharing")
    check(dialog.get_by_role("button", name="Lưu ảnh").is_enabled(), f"{tag} Lưu ảnh is the primary button")
    alt = dialog.get_by_role("img").get_attribute("alt") or ""
    check("Hôm nay 15/10" in alt and "Vi chất đạt" in alt, f"{tag} preview alt: {alt[:90]}")
    check("kg" not in alt and "@" not in alt, f"{tag} preview text has no weight or email")
    check(pg.locator("[data-share-root]").count() == 0, f"{tag} the drawn page is removed from the DOM once the PNG exists")
    pg.screenshot(path=os.path.join(SHOTS, f"cc-27g-sheet-{w}.png"))
    name, path = download(pg, f"cc-27g-today-{w}.png")
    check(name == f"h1t-micro-{TODAY}.png", f"{tag} filename {name}")
    info = analyse(pg, path)
    s = snap(pg)
    check(s is not None, f"{tag} the drawn page was read")
    check_png(info, s, tag, "today")
    check(info["corner"] == "255,255,255", f"{tag} white background {info['corner']}")
    lv = info["found"]
    check(lv["red"] + lv["yellow"] + lv["green"] + lv["blue"] > 0, f"{tag} today uses the level colours in the image {lv}")
    if s:
        t = s["text"]
        check(s["top"].startswith("HỌC VIÊN CÓ TÊN KHÁ DÀI MẪU") and "Hôm nay 15/10" in s["top"], f"{tag} name (capitals) then the date on top ({s['top']!r})")
        check_head(s, tag, "today", named=True)
        hh = s["head"]
        check((hh["first"]["bottom"] - hh["first"]["top"]) >= 2 * 34 - 1, f"{tag} today: the long name wraps to 2 lines ({hh['first']['bottom'] - hh['first']['top']:.1f} px) and the badge stays put ({hh['badgeW']})")
        check("Cả ngày · 7 món" in t, f"{tag} the summary card is in the image")
        for banned in ["Thêm", "Chia sẻ", "Đủ 22 vi chất", "Chưa ăn", "●", "⋯", "Tổng quan", "Khám phá", "Cài đặt", "Về hôm nay", "Ngày tập"]:
            check(banned not in t, f"{tag} no {banned!r} in the image")
        check(s["controls"] == 0 and not s["header"], f"{tag} nothing interactive, no header or nav ({s['controls']})")
        check(all(x in t for x in ["Thiếu <50%", "Trung bình", "Gần đủ", "Đạt ≥100%"]) and "Xanh: đạt mục tiêu" not in t, f"{tag} today's key is the four levels")
        check("H1T MICRO" in t and "lehongkhanh.vn" in t and "Theo dõi vi chất mỗi ngày" in t, f"{tag} footer wordmark, site and line")
        check_frame(s, tag, "today")
        check("KHOÁNG CHẤT" in t.upper() and "VITAMIN" in t.upper(), f"{tag} nutrient column groups are in the image (uppercase pills, cc-44)")
        check(abs(s["rootW"] - 390) <= 0.5, f"{tag} drawn at 390 px ({s['rootW']})")
    pg.keyboard.press("Escape")
    pg.wait_for_timeout(200)
    check(pg.get_by_role("dialog").count() == 0, f"{tag} Esc closes the sheet")
    check(pg.evaluate("document.activeElement?.getAttribute('aria-label')") == "Chia sẻ ngày này", f"{tag} focus returns to the icon")
    ctx.close()

    # cc-27 fix: no display name -> the sheet asks for it first and draws nothing until it has one
    ctx, pg = page(browser, size, NO_SHARE)
    go(pg, "/")
    open_sheet(pg)
    dlg = pg.get_by_role("dialog")
    field = dlg.get_by_label("Tên hiện trên ảnh")
    check(field.count() == 1, f"{tag} no name: the sheet opens on the name step")
    go_on = dlg.get_by_role("button", name="Tiếp tục", exact=True)
    check(go_on.is_disabled(), f"{tag} no name: Tiếp tục is disabled while the field is empty")
    check(dlg.get_by_role("button", name="Lưu ảnh").count() == 0 and dlg.get_by_role("img").count() == 0, f"{tag} no name: no image and no Lưu ảnh yet")
    field.fill("   ")
    check(go_on.is_disabled(), f"{tag} no name: spaces alone do not count")
    pg.wait_for_timeout(800)
    check(pg.evaluate("window.__shareSnaps.length") == 0, f"{tag} no name: nothing was drawn")
    pg.screenshot(path=os.path.join(SHOTS, f"cc-27g-name-step-{w}.png"))
    field.fill("Học viên C")
    check(go_on.is_enabled() and go_on.bounding_box()["height"] >= 43.5, f"{tag} no name: Tiếp tục enables with a name (44 px)")
    go_on.click()
    wait_preview(pg)
    s = snap(pg)
    check(s is not None and s["top"].startswith("HỌC VIÊN C"), f"{tag} no name: the image has the name ({s['top'] if s else None!r})")
    check_head(s, tag, "name step", named=True)
    pg.keyboard.press("Escape")
    pg.reload(wait_until="networkidle")
    wait_home(pg)
    open_sheet(pg)
    wait_preview(pg)
    check(dlg.get_by_label("Tên hiện trên ảnh").count() == 0, f"{tag} no name: the name is saved, the next share goes straight to the image")
    ctx.close()

    # a day with two meals only: the empty meals are absent
    ctx, pg = page(browser, size, init(NO_SHARE, NAMED_INIT, local("h1t_sample_edits_v1_demo", NO_SAMPLE), local("h1t_added_entries_v1_demo", seeded(["breakfast", "breakfast", "lunch"]))))
    go(pg, "/")
    open_sheet(pg)
    wait_preview(pg)
    s = snap(pg)
    check(s is not None and s["sections"] == ["Bữa sáng", "Bữa trưa"], f"{tag} meals with no food are absent ({s['sections'] if s else None})")
    check(s is not None and s["top"].startswith("HỌC VIÊN A"), f"{tag} short day: the name is on top ({s['top'] if s else None!r})")
    check_head(s, tag, "short day", named=True)
    check_frame(s, tag, "short day")
    name, path = download(pg, f"cc-27g-short-{w}.png")
    check_png(analyse(pg, path), s, tag, "two meals")
    ctx.close()

    # a long day: taller than 1920, footer inside
    ctx, pg = page(browser, size, init(NO_SHARE, NAMED_INIT, local("h1t_added_entries_v1_demo", seeded(["breakfast", "lunch", "snack", "dinner"] * 6))))
    go(pg, "/")
    open_sheet(pg)
    wait_preview(pg)
    s = snap(pg)
    name, path = download(pg, f"cc-27g-long-{w}.png")
    info = analyse(pg, path)
    check_png(info, s, tag, "long day")
    check_head(s, tag, "long day", named=True)
    check(info["h"] > 2300, f"{tag} long day: the image grew ({info['h']})")
    ctx.close()

    # past day
    ctx, pg = page(browser, size, init(NO_SHARE, NAMED_INIT))
    go(pg, f"/?date={PAST}")
    check(vis(pg, BUTTON).is_enabled(), f"{tag} past day: share icon enabled")
    open_sheet(pg)
    wait_preview(pg)
    name, path = download(pg, f"cc-27g-past-{w}.png")
    check(name == f"h1t-micro-{PAST}.png", f"{tag} past filename {name}")
    info = analyse(pg, path)
    s = snap(pg)
    lv = info["found"]
    check_png(info, s, tag, "past day")
    check(lv["red"] + lv["yellow"] + lv["green"] + lv["blue"] > 0, f"{tag} past day uses the four levels {lv}")
    if s:
        check(all(x in s["text"] for x in ["Thiếu <50%", "Trung bình", "Gần đủ", "Đạt ≥100%"]) and "Xanh: đạt mục tiêu" not in s["text"], f"{tag} past day's 4-level key")
        check("Hôm qua 14/10" in s["top"] and s["top"].startswith("HỌC VIÊN A"), f"{tag} past: name and date label ({s['top']!r})")
        check_head(s, tag, "past day", named=True)
    check_frame(s, tag, "past day")
    alt = pg.get_by_role("dialog").get_by_role("img").get_attribute("alt") or ""
    check(alt.startswith("Ảnh tóm tắt Hôm qua 14/10"), f"{tag} past alt: {alt[:60]}")
    ctx.close()

    # with file sharing
    ctx, pg = page(browser, size, init(STUB_SHARE, NAMED_INIT))
    go(pg, "/")
    open_sheet(pg)
    wait_preview(pg)
    dialog = pg.get_by_role("dialog")
    share = dialog.get_by_role("button", name="Chia sẻ", exact=True)
    check(share.count() == 1 and dialog.get_by_role("button", name="Lưu ảnh").count() == 1, f"{tag} Chia sẻ and Lưu ảnh both shown")
    bs = [b.bounding_box() for b in (share.element_handle(), dialog.get_by_role("button", name="Lưu ảnh").element_handle())]
    check(abs(bs[0]["x"] - bs[1]["x"]) <= 1 and abs(bs[0]["width"] - bs[1]["width"]) <= 1, f"{tag} the two buttons share edges")
    check(all(b["height"] >= 44 for b in bs), f"{tag} buttons are 44 px or more")
    pg.evaluate("window.__shareMode = 'abort'")
    share.click()
    pg.wait_for_timeout(200)
    check(pg.get_by_role("dialog").get_by_role("alert").count() == 0, f"{tag} cancelled share shows no error")
    pg.evaluate("window.__shareMode = 'fail'")
    share.click()
    pg.get_by_role("dialog").get_by_role("alert").wait_for(state="visible", timeout=2000)
    check("Không chia sẻ được" in pg.get_by_role("dialog").get_by_role("alert").inner_text(), f"{tag} failed share shows a message")
    pg.evaluate("window.__shareMode = 'ok'")
    pg.get_by_role("button", name="Thử lại").click()
    pg.wait_for_timeout(200)
    check(pg.get_by_role("dialog").get_by_role("alert").count() == 0, f"{tag} Thử lại shares again and clears the message")
    shares = pg.evaluate("window.__shares")
    check(len(shares) == 3 and all(s["n"] == 1 and s["type"] == "image/png" and s["name"] == f"h1t-micro-{TODAY}.png" for s in shares), f"{tag} navigator.share got one PNG file each time {shares}")
    check(shares[0]["size"] > 20000, f"{tag} shared file size {shares[0]['size']}")
    ctx.close()


def main():
    os.makedirs(SHOTS, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for size, tag in [({"width": 390, "height": 844}, "390"), ({"width": 1440, "height": 900}, "1440")]:
            try:
                run(browser, size, tag)
            except Exception as e:  # keep the page errors collected so far in the report
                problems.append(f"{tag} aborted: {str(e).splitlines()[0]}")
        browser.close()
    for line in notes:
        print(line)
    for line in problems:
        print("FAIL:", line)
    print(f"{len(notes)} ok, {len(problems)} failed")
    sys.exit(1 if problems else 0)


main()
