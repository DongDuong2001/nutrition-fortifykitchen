"""cc-26: share image of Hôm nay.

Production build, clock fixed at 2026-10-15 10:00 Asia/Ho_Chi_Minh, sizes 390x844 and 1280x800.
- Empty day: the share icon is disabled and the reason "Chưa có món nào để chia sẻ" is visible.
- Today (demo): the sheet opens with a skeleton, then a preview; Lưu ảnh downloads h1t-micro-2026-10-15.png,
  1080x1920 and not blank; no weight, email or food names in the preview text.
- Past day: the PNG uses level colours (4 levels), today's PNG is two-tone (none in the bar rows).
- Without file sharing, Lưu ảnh is the only (primary) button. With it, Chia sẻ calls navigator.share with one
  PNG file inside the tap; a cancelled share shows nothing; a failure shows a message and Thử lại.
- Esc closes and focus returns to the icon.
PNGs are saved to .screenshots/cc-26-*.png.
Run with: ALIGN_BASE_URL=http://localhost:3103 npm run probe -- tests/probes/cc_26.py
"""
import base64
import json
import os
import re
import sys

import _demo  # noqa: F401  (demo mode on; the empty-account check switches it off for its own page)
from playwright.sync_api import sync_playwright
from _home import wait_home

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3103")
NOW = "2026-10-15T10:00:00+07:00"
TODAY, PAST = "2026-10-15", "2026-10-14"
SHOTS = os.path.join(os.path.dirname(__file__), "..", "..", ".screenshots")
BUTTON = "[aria-label='Chia sẻ ngày này']"
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

ANALYSE = """async (b64) => {
  const img = new Image();
  img.src = 'data:image/png;base64,' + b64;
  await img.decode();
  const c = document.createElement('canvas');
  c.width = img.naturalWidth; c.height = img.naturalHeight;
  const x = c.getContext('2d');
  x.drawImage(img, 0, 0);
  const at = (px, py) => Array.from(x.getImageData(px, py, 1, 1).data.slice(0, 3)).join(',');
  const data = x.getImageData(120, 804, 840, 432).data;
  const levels = { red: '217,63,68', yellow: '176,120,0', green: '23,148,95', blue: '18,56,214' };
  const found = { red: 0, yellow: 0, green: 0, blue: 0 };
  const seen = new Set();
  for (let i = 0; i < data.length; i += 4) {
    const key = data[i] + ',' + data[i + 1] + ',' + data[i + 2];
    seen.add(key);
    for (const [name, rgb] of Object.entries(levels)) if (key === rgb) found[name]++;
  }
  const all = x.getImageData(0, 0, c.width, c.height).data;
  const whole = new Set();
  for (let i = 0; i < all.length; i += 4 * 97) whole.add(all[i] + ',' + all[i + 1] + ',' + all[i + 2]);
  return { w: c.width, h: c.height, corner: at(4, 4), topBand: at(540, 100), found, colours: whole.size, barColours: seen.size };
}"""


def check(cond, msg):
    (notes if cond else problems).append(("ok: " if cond else "") + msg)


def page(browser, size, init=None):
    ctx = browser.new_context(viewport=size, accept_downloads=True)
    if init:
        ctx.add_init_script(init)
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
    pg.get_by_role("dialog").get_by_role("img").wait_for(state="visible", timeout=10000)


def download(pg, name):
    with pg.expect_download() as info:
        pg.get_by_role("button", name="Lưu ảnh").click()
    path = os.path.join(SHOTS, name)
    info.value.save_as(path)
    return info.value.suggested_filename, path


def analyse(pg, path):
    with open(path, "rb") as f:
        return pg.evaluate(ANALYSE, base64.b64encode(f.read()).decode())


def run(browser, size, tag):
    w = size["width"]
    # an empty day: every sample item deleted (demo history keeps yesterday)
    deleted = json.dumps({f"item-{i}": {"deleted": True} for i in range(1, 8)})
    ctx, pg = page(browser, size, f"try {{ localStorage.setItem('h1t_sample_edits_v1_demo', {json.dumps(deleted)}); }} catch (e) {{}}")
    go(pg, "/")
    btn = vis(pg, BUTTON)
    check(btn.is_disabled(), f"{tag} empty day: share icon is disabled")
    check(pg.get_by_text("Chưa có món nào để chia sẻ").is_visible(), f"{tag} empty day: the reason is visible")
    box = btn.bounding_box()
    check(box["width"] >= 44 and box["height"] >= 44, f"{tag} icon is 44 px ({box['width']}x{box['height']})")
    ctx.close()

    # today, no file sharing: Lưu ảnh is the primary button
    ctx, pg = page(browser, size, NO_SHARE)
    go(pg, "/")
    btn = vis(pg, BUTTON)
    check(btn.is_enabled(), f"{tag} today: share icon enabled")
    btn.click()
    pg.get_by_role("dialog").wait_for(state="visible")
    skeleton = pg.get_by_role("dialog").get_by_role("status").count()
    wait_preview(pg)
    dialog = pg.get_by_role("dialog")
    check(dialog.get_by_role("button", name="Chia sẻ", exact=True).count() == 0, f"{tag} no Chia sẻ without file sharing")
    check(dialog.get_by_role("button", name="Lưu ảnh").is_enabled(), f"{tag} Lưu ảnh is the primary button")
    alt = dialog.get_by_role("img").get_attribute("alt") or ""
    check("Hôm nay 15/10" in alt and "Vi chất đạt" in alt, f"{tag} preview alt: {alt[:90]}")
    check("kg" not in alt and "@" not in alt, f"{tag} preview text has no weight or email")
    pg.screenshot(path=os.path.join(SHOTS, f"cc-26-sheet-{w}.png"))
    name, path = download(pg, f"cc-26-today-{w}.png")
    check(name == f"h1t-micro-{TODAY}.png", f"{tag} filename {name}")
    info = analyse(pg, path)
    check(info["w"] == 1080 and info["h"] == 1920, f"{tag} PNG is {info['w']}x{info['h']}")
    check(info["corner"] == "243,241,236", f"{tag} paper background {info['corner']}")
    check(info["colours"] >= 8, f"{tag} PNG is not blank ({info['colours']} colours)")
    lv = info["found"]
    check(lv["red"] + lv["yellow"] + lv["green"] == 0, f"{tag} today is two-tone: no red/yellow/green in the bar rows {lv}")
    pg.keyboard.press("Escape")
    pg.wait_for_timeout(200)
    check(pg.get_by_role("dialog").count() == 0, f"{tag} Esc closes the sheet")
    check(pg.evaluate("document.activeElement?.getAttribute('aria-label')") == "Chia sẻ ngày này", f"{tag} focus returns to the icon")
    ctx.close()

    # past day
    ctx, pg = page(browser, size, NO_SHARE)
    go(pg, f"/?date={PAST}")
    check(vis(pg, BUTTON).is_enabled(), f"{tag} past day: share icon enabled")
    open_sheet(pg)
    wait_preview(pg)
    name, path = download(pg, f"cc-26-past-{w}.png")
    check(name == f"h1t-micro-{PAST}.png", f"{tag} past filename {name}")
    info = analyse(pg, path)
    lv = info["found"]
    check(info["w"] == 1080 and info["h"] == 1920, f"{tag} past PNG is {info['w']}x{info['h']}")
    check(lv["red"] + lv["yellow"] + lv["green"] + lv["blue"] > 0, f"{tag} past day uses the four levels {lv}")
    alt = pg.get_by_role("dialog").get_by_role("img").get_attribute("alt") or ""
    check(alt.startswith("Ảnh tóm tắt Hôm qua 14/10"), f"{tag} past alt: {alt[:60]}")
    ctx.close()

    # with file sharing
    ctx, pg = page(browser, size, STUB_SHARE)
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
        for size, tag in [({"width": 390, "height": 844}, "390"), ({"width": 1280, "height": 800}, "1280")]:
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
