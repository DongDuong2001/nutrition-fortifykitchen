"""cc-26 / cc-27g: share image = the Hôm nay screen.

Production build, clock fixed at 2026-10-15 10:00 Asia/Ho_Chi_Minh, sizes 390x844 and 1440x900.
- Empty day: the share icon is disabled and the reason "Chưa có món nào để chia sẻ" is visible.
- Today (demo): the sheet opens with a skeleton, then a preview; Lưu ảnh downloads h1t-micro-2026-10-15.png,
  1080 wide, at least 1920 high, paper at every edge (nothing clipped), not blank; no weight or email.
- The page behind the PNG (read while it is drawn): name on top when set, the date under it; no header, tab bar,
  Thêm, ⋯, dots, "Đủ 22 vi chất"; meals with no food absent; the four-level key today and on a
  past day; footer wordmark and line, pinned to the bottom (gap 0, within 12 px).
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
        return { first: c(ps[0]), date: ps.length > 1 ? c(ps[1]) : null, badge: b ? c(b) : null, firstFs: parseFloat(getComputedStyle(ps[0]).fontSize), dateFs: ps.length > 1 ? parseFloat(getComputedStyle(ps[1]).fontSize) : null }; })(),
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
  const PAPER = '243,241,236';
  const near = (k) => k.split(',').every((v, i) => Math.abs(Number(v) - [243, 241, 236][i]) <= 2);
  let edgeBad = 0; const badAt = []; const mark = (ix, iy) => { edgeBad++; if (badAt.length < 4) badAt.push([ix, iy, px(ix, iy)]); };
  // Hôm nay runs edge to edge in its body (the two columns), so the side edges are checked above the body and
  // in the footer; the top and bottom rows are paper everywhere.
  const bodyTop = Math.round(H * 0), headRows = 330;
  for (let i = bodyTop; i < Math.min(H, headRows); i++) { if (!near(px(0, i))) mark(0, i); if (!near(px(W - 1, i))) mark(W - 1, i); }
  for (let i = H - 100; i < H; i++) { if (!near(px(0, i))) mark(0, i); if (!near(px(W - 1, i))) mark(W - 1, i); }
  for (let i = 0; i < W; i++) { if (!near(px(i, 0))) mark(i, 0); if (!near(px(i, H - 1))) mark(i, H - 1); }
  let lastInk = -1;
  for (let y = H - 1; y >= 0 && lastInk < 0; y--) for (let ix = 0; ix < W; ix += 2) if (px(ix, y) !== PAPER) { lastInk = y; break; }
  const levels = { red: '217,63,68', yellow: '176,120,0', green: '23,148,95', blue: '18,56,214' };
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
    """cc-27 fix: name and badge in one row, centred on each other; the date under the name (or in row 1 with no name)."""
    h = s and s.get("head")
    if not h:
        check(False, f"{tag} {label}: header geometry was not read")
        return
    check(h["badge"] is not None and abs(h["first"]["mid"] - h["badge"]["mid"]) <= 1.5, f"{tag} {label}: first row is centred with the badge ({h['first']['mid']:.1f} vs {h['badge']['mid']:.1f})")
    check(h["firstFs"] >= 18.5, f"{tag} {label}: first row is 19 px ({h['firstFs']})")
    if named:
        check(h["date"] is not None and h["date"]["top"] >= h["first"]["bottom"] - 1 and abs(h["dateFs"] - 13) < 0.5, f"{tag} {label}: the date is under the name at 13 px ({h['dateFs']})")
        check(abs(h["date"]["left"] - h["first"]["left"]) <= 1, f"{tag} {label}: date and name share a left edge")
    else:
        check(h["date"] is None, f"{tag} {label}: no second row without a name")


def check_png(info, snapshot, tag, label):
    check(info["w"] == 1080 and info["h"] >= 1920, f"{tag} {label}: PNG is {info['w']}x{info['h']} (1080 wide, 1920 high at least)")
    check(info["edgeBad"] == 0, f"{tag} {label}: paper at every edge, nothing clipped ({info['edgeBad']} off-paper edge pixels {info['badAt']})")
    check(info["colours"] >= 8, f"{tag} {label}: not blank ({info['colours']} colours)")
    if snapshot:
        want = max(1920, math.ceil(snapshot["rootH"] * SCALE - 1e-6))
        check(abs(info["h"] - want) <= 1, f"{tag} {label}: height follows the content ({info['h']} vs {want} from {snapshot['rootH']:.1f} px)")
        check(snapshot["footerGap"] <= 12 and snapshot["footerGap"] >= -0.5, f"{tag} {label}: footer is at the bottom edge (gap {snapshot['footerGap']:.1f} px)")
        # the lowest ink of the image is inside the footer: no more than its 24 px line + 12 px padding above the edge
        low = info["h"] - 1 - info["lastInk"]
        check(low <= (12 + 24) * SCALE, f"{tag} {label}: the footer ink ends near the bottom ({low} px from the edge)")


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
    check(info["corner"] == "243,241,236", f"{tag} paper background {info['corner']}")
    lv = info["found"]
    check(lv["red"] + lv["yellow"] + lv["green"] + lv["blue"] > 0, f"{tag} today uses the level colours in the image {lv}")
    if s:
        t = s["text"]
        check(s["top"].startswith("Học viên Có Tên Khá Dài Mẫu") and "Hôm nay 15/10" in s["top"], f"{tag} name then the date on top ({s['top']!r})")
        check_head(s, tag, "today", named=True)
        check("Cả ngày · 7 món" in t, f"{tag} the summary card is in the image")
        for banned in ["Thêm", "Chia sẻ", "Đủ 22 vi chất", "Chưa ăn", "●", "⋯", "Tổng quan", "Khám phá", "Cài đặt", "Về hôm nay", "Ngày tập"]:
            check(banned not in t, f"{tag} no {banned!r} in the image")
        check(s["controls"] == 0 and not s["header"], f"{tag} nothing interactive, no header or nav ({s['controls']})")
        check(all(x in t for x in ["Thiếu <50%", "Trung bình", "Gần đủ", "Đạt ≥100%"]) and "Xanh: đạt mục tiêu" not in t, f"{tag} today's key is the four levels")
        check("H1T MICRO" in t.replace("H1T MICRO", "H1T MICRO") and "Theo dõi vi chất mỗi ngày" in t, f"{tag} footer wordmark and line")
        check(s["footerH"] >= 48 - 0.5, f"{tag} footer is 24 px line + 12 px above and below ({s['footerH']})")
        check("Khoáng chất" in t and "Vitamin" in t, f"{tag} nutrient column groups are in the image")
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
    check(s is not None and s["top"].startswith("Học viên C"), f"{tag} no name: the image has the name ({s['top'] if s else None!r})")
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
    check(s is not None and s["top"].startswith("Học viên A"), f"{tag} short day: the name is on top ({s['top'] if s else None!r})")
    check_head(s, tag, "short day", named=True)
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
        check("Hôm qua 14/10" in s["top"] and s["top"].startswith("Học viên A"), f"{tag} past: name and date label ({s['top']!r})")
        check_head(s, tag, "past day", named=True)
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
