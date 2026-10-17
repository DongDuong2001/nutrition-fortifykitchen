"""cc-45: the coach link page at "/" and Hôm nay at /app.

Link page at 390, 360, 768 and 1440 (sizes from LinkKhanh / LinkKhanhDesktop.dc.html, no horizontal overflow), the
"Truy cập" chooser on a phone (Esc, scrim and close button return focus to the row; Cài app opens the install steps;
Tiếp tục trên web lands on Hôm nay), straight to /app at 1440, an installed app on "/" lands on /app before the link
page paints, ?install=1 opens the install steps on a phone only, old "/?date=" links redirect with their query, the nav's Hôm nay goes to /app, and reduced motion stops
the background. Screenshots: .screenshots/cc-45-{link,chooser,app}-{390,1440}.png (plus link-360, link-768, and the two design files as\ncc-45-design-{390,1440}.png).
Run with: ALIGN_BASE_URL=http://localhost:3101 npm run probe -- tests/probes/cc_45.py
"""
import os
import sys
from pathlib import Path

import _demo  # noqa: F401
from playwright.sync_api import sync_playwright

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3101")
SHOTS = Path(__file__).resolve().parent.parent.parent / ".screenshots"
SHOTS.mkdir(exist_ok=True)
PHONE = {"viewport": {"width": 390, "height": 844}, "has_touch": True, "is_mobile": True}
DESKTOP = {"viewport": {"width": 1440, "height": 900}}
ROW = 'a[data-align-group="link-rows"]:has-text("Truy cập")'
CHOOSER = 'div[role="dialog"][aria-labelledby="access-sheet-title"]'
problems = []


def check(cond, msg):
    print(("[PASS] " if cond else "[FAIL] ") + msg)
    if not cond:
        problems.append(msg)


SIZES_JS = """() => {
  const px = (el, p) => el ? parseFloat(getComputedStyle(el)[p]) : null;
  const main = document.querySelector('main');
  const header = main.querySelector('header');
  const list = main.querySelector('ul');
  const avatar = header.querySelector('[role="img"]');
  const rows = [...document.querySelectorAll('a[data-align-group="link-rows"]')];
  return {
    padTop: px(main, 'paddingTop'), padLeft: px(main, 'paddingLeft'), mainWidth: main.getBoundingClientRect().width,
    headerToList: list.getBoundingClientRect().top - header.getBoundingClientRect().bottom,
    avatar: avatar.getBoundingClientRect().width, h1: px(header.querySelector('h1'), 'fontSize'),
    tagline: px(header.querySelector('p'), 'fontSize'), taglineColor: getComputedStyle(header.querySelector('p')).color,
    rows: rows.map(r => Math.round(r.closest('li').getBoundingClientRect().height)),
    socials: [...header.querySelectorAll('a[aria-label]')].map(a => [a.getAttribute('aria-label'), Math.round(a.getBoundingClientRect().width), Math.round(a.getBoundingClientRect().height)]),
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    svg: [...document.querySelectorAll('svg[viewBox="0 0 390 844"], svg[viewBox="0 0 1440 900"]')].filter(s => s.getBoundingClientRect().width > 0).length,
  };
}"""


# Line boxes of the smallest element whose text starts with each label (the wordmark; the meal pill with its kcal)
LINES_JS = """() => {
  const lines = (el) => {
    const r = document.createRange();
    r.selectNodeContents(el);
    return new Set([...r.getClientRects()].filter(b => b.width > 0).map(b => Math.round(b.top + b.height / 2))).size;
  };
  const out = {};
  for (const [label, needs] of [['H1T MICRO', ''], ['TRƯỚC TẬP', 'KCAL']]) {
    const hits = [...document.querySelectorAll('body *')].filter(e => {
      const t = e.textContent.replace(/\\s+/g, ' ').trim().toUpperCase();
      return e.getBoundingClientRect().width > 0 && t.startsWith(label) && t.includes(needs) && t.length < 40;
    });
    const leaf = hits.find(e => !hits.some(h => h !== e && e.contains(h)));
    out[label] = leaf ? lines(leaf) : null;
  }
  return out;
}"""


def link_page(browser):
    expect = {
        390: {"padTop": 64, "padLeft": 24, "gap": 40, "avatar": 56, "h1": 32, "tagline": 14, "row": 68},
        360: {"padTop": 64, "padLeft": 24, "gap": 40, "avatar": 56, "h1": 32, "tagline": 14, "row": 68},
        768: {"padTop": 64, "padLeft": 24, "gap": 40, "avatar": 56, "h1": 32, "tagline": 14, "row": 68},
        1440: {"padTop": 168, "padLeft": 0, "gap": 44, "avatar": 64, "h1": 40, "tagline": 15, "row": 72},
    }
    for w, e in expect.items():
        ctx = browser.new_context(viewport={"width": w, "height": 900 if w == 1440 else 844})
        pg = ctx.new_page()
        errors = []
        pg.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
        pg.goto(BASE + "/", wait_until="networkidle")
        check(pg.url.rstrip("/") == BASE, f"@{w}: / stays on the link page ({pg.url})")
        check(pg.title() == "Lê Hồng Khánh · HIT1 Coaching", f"@{w}: title ({pg.title()})")
        check(pg.locator("h1").inner_text().strip().upper() == "LÊ HỒNG KHÁNH", f"@{w}: coach name")
        check(pg.locator('nav[aria-label="Điều hướng chính"]').count() == 0, f"@{w}: no app nav on the link page")
        s = pg.evaluate(SIZES_JS)
        check(s["overflow"] <= 0, f"@{w}: no horizontal overflow ({s['overflow']})")
        check(s["padTop"] == e["padTop"], f"@{w}: top padding {s['padTop']} = {e['padTop']}")
        if w == 1440:
            check(round(s["mainWidth"]) == 480, f"@{w}: 480 px column ({s['mainWidth']})")
        else:
            check(s["padLeft"] == e["padLeft"], f"@{w}: side padding {s['padLeft']} = {e['padLeft']}")
        check(round(s["headerToList"]) == e["gap"], f"@{w}: header to list {s['headerToList']} = {e['gap']}")
        check(s["avatar"] == e["avatar"], f"@{w}: avatar {s['avatar']}")
        check(s["h1"] == e["h1"], f"@{w}: name {s['h1']} px")
        check(s["tagline"] == e["tagline"], f"@{w}: tagline {s['tagline']} px")
        check(s["taglineColor"] == "rgb(74, 73, 69)", f"@{w}: tagline colour {s['taglineColor']}")
        check(s["rows"] == [e["row"], e["row"]] if w == 1440 else len(s["rows"]) == 2 and all(h >= e["row"] for h in s["rows"]), f"@{w}: two rows of {e['row']} px, divider included ({s['rows']})")
        check(all(sw >= 44 and sh >= 44 for _, sw, sh in s["socials"]) and [n for n, _, _ in s["socials"]] == ["Facebook", "YouTube", "TikTok"], f"@{w}: social links 44 px ({s['socials']})")
        check(s["svg"] == 1, f"@{w}: one background drawing shown ({s['svg']})")
        check(not errors, f"@{w}: no console errors {errors[:2]}")
        pg.wait_for_timeout(400)
        pg.screenshot(path=str(SHOTS / f"cc-45-link-{w}.png"))
        ctx.close()


def chooser(browser):
    ctx = browser.new_context(**PHONE)
    pg = ctx.new_page()
    pg.goto(BASE + "/", wait_until="networkidle")
    check(pg.evaluate("matchMedia('(pointer: coarse)').matches"), "390 touch: a coarse pointer (a phone)")
    pg.click(ROW)
    dialog = pg.locator(CHOOSER)
    dialog.wait_for(state="visible")
    check(dialog.locator("h2").inner_text().strip().upper() == "DÙNG H1T MICRO", "chooser: title Dùng H1T MICRO")
    check(dialog.get_by_text("Cài app lên màn hình chính để mở nhanh, như một ứng dụng.").count() == 1, "chooser: body copy")
    sizes = dialog.evaluate("d => [...d.querySelectorAll('a,button')].map(b => [b.textContent.trim() || b.getAttribute('aria-label'), Math.round(b.getBoundingClientRect().height), Math.round(b.getBoundingClientRect().width)])")
    check([s[0] for s in sizes] == ["Đóng", "Cài app", "Tiếp tục trên web"], f"chooser: close, Cài app, Tiếp tục trên web ({[s[0] for s in sizes]})")
    check(all(h >= 44 for _, h, _ in sizes), f"chooser: 44 px targets {sizes}")
    check(sizes[1][2] == sizes[2][2] and sizes[1][2] > 300, f"chooser: both buttons full width {sizes[1][2]}, {sizes[2][2]}")
    pg.wait_for_timeout(350)
    pg.screenshot(path=str(SHOTS / "cc-45-chooser-390.png"))
    pg.keyboard.press("Tab")
    pg.keyboard.press("Tab")
    pg.keyboard.press("Tab")
    check(dialog.evaluate("d => d.contains(document.activeElement)"), "chooser: focus stays inside (trapped)")

    def row_focused():
        return pg.evaluate("document.activeElement && document.activeElement.matches('a[data-align-group=\"link-rows\"]') && document.activeElement.textContent.includes('Truy cập')")

    pg.keyboard.press("Escape")
    check(dialog.count() == 0 and row_focused(), "chooser: Esc closes, focus back on the row")
    pg.click(ROW)
    dialog.wait_for(state="visible")
    pg.mouse.click(195, 40)
    check(dialog.count() == 0 and row_focused(), "chooser: the scrim closes, focus back on the row")
    pg.click(ROW)
    dialog.locator('button[aria-label="Đóng"]').click()
    check(dialog.count() == 0 and row_focused(), "chooser: Đóng closes, focus back on the row")

    pg.click(ROW)
    dialog.get_by_role("button", name="Cài app").click()
    install = pg.locator('div[role="dialog"][aria-labelledby="install-sheet-title"]')
    install.wait_for(state="visible")
    check(dialog.count() == 0, "Cài app: the chooser closes")
    check(install.get_by_text("CÀI H1T MICRO VÀO MÁY CỦA BẠN").count() == 1, "Cài app: the install sheet asks for the phone")
    install.get_by_role("button", name="iPhone Safari").click()
    check(install.get_by_text("CÀI TRÊN IPHONE").count() == 1, "Cài app: the iPhone steps open")
    pg.keyboard.press("Escape")
    check(install.count() == 0 and row_focused(), "install sheet: Esc closes, focus back on the row")

    pg.click(ROW)
    dialog.get_by_role("link", name="Tiếp tục trên web").click()
    pg.wait_for_url(BASE + "/app")
    pg.locator('[data-align-group="home-hero"]').first.wait_for(state="visible")
    check(True, "Tiếp tục trên web: /app shows Hôm nay")
    lock = pg.evaluate("[document.body.style.overflow, [...document.querySelectorAll('[role=dialog]')].map(d => d.getAttribute('aria-labelledby'))]")
    # Hôm nay's own sheets (the install pop-up in demo mode) may lock the page; the chooser's lock must be gone
    check(lock[0] == "" or (lock[1] and "access-sheet-title" not in lock[1]), f"Hôm nay: the chooser's scroll lock is gone ({lock})")
    if lock[1]:
        pg.keyboard.press("Escape")
    pg.wait_for_timeout(500)
    pg.evaluate("document.fonts.ready")
    lines = pg.evaluate(LINES_JS)
    check(lines.get("H1T MICRO") == 1, f"Hôm nay 390: the H1T MICRO wordmark on one line ({lines})")
    check(lines.get("TRƯỚC TẬP") == 1, f"Hôm nay 390: the Trước tập pill (name and kcal) on one line ({lines})")
    loaded = pg.evaluate("[...new Set([...document.fonts].filter(f => f.status === 'loaded').map(f => f.family))]")
    check(any("Manrope" in f for f in loaded) and any("Saira" in f for f in loaded), f"Hôm nay 390: Manrope and Saira Condensed loaded ({loaded})")
    pg.screenshot(path=str(SHOTS / "cc-45-app-390.png"))
    ctx.close()


def desktop(browser):
    ctx = browser.new_context(**DESKTOP)
    pg = ctx.new_page()
    pg.goto(BASE + "/", wait_until="networkidle")
    pg.click(ROW)
    pg.wait_for_url(BASE + "/app")
    check(pg.locator(CHOOSER).count() == 0, "1440: Truy cập goes straight to /app, no chooser")
    pg.locator('[data-align-group="home-page"]').first.wait_for(state="visible")
    pg.wait_for_timeout(500)
    # The desktop has no chooser: this is what Truy cập opens there
    pg.screenshot(path=str(SHOTS / "cc-45-chooser-1440.png"))
    pg.screenshot(path=str(SHOTS / "cc-45-app-1440.png"))
    side = pg.locator('nav[aria-label="Điều hướng chính"] a:has-text("Hôm nay")').first
    check(side.get_attribute("href") == "/app", f"1440: the sidebar's Hôm nay goes to /app ({side.get_attribute('href')})")
    ctx.close()

    ctx = browser.new_context(**PHONE)
    pg = ctx.new_page()
    pg.goto(BASE + "/trends", wait_until="networkidle")
    tab = pg.locator('nav a:has-text("Hôm nay")').first
    check(tab.get_attribute("href") == "/app", f"390: the bottom nav's Hôm nay goes to /app ({tab.get_attribute('href')})")
    ctx.close()


# Records the root's visibility when the link page's name is parsed: "hidden" (or nothing: it left first) is no flash
STANDALONE = """
(() => {
  const fake = (q) => q === '(display-mode: standalone)';
  const real = window.matchMedia.bind(window);
  window.matchMedia = (q) => fake(q) ? { matches: true, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} } : real(q);
  if (location.pathname !== '/') return;
  new MutationObserver((_, obs) => {
    if (document.querySelector('h1')) {
      sessionStorage.setItem('cc45-flash', getComputedStyle(document.documentElement).visibility);
      obs.disconnect();
    }
  }).observe(document, { childList: true, subtree: true });
})();
"""
IOS_STANDALONE = "Object.defineProperty(window.navigator, 'standalone', { get: () => true });"


def standalone_and_redirects(browser):
    for label, script in [("display-mode standalone", STANDALONE), ("iOS navigator.standalone", IOS_STANDALONE + STANDALONE.replace("q === '(display-mode: standalone)'", "false"))]:
        ctx = browser.new_context(**PHONE)
        ctx.add_init_script(script)
        pg = ctx.new_page()
        pg.goto(BASE + "/", wait_until="networkidle")
        check(pg.url == BASE + "/app", f"{label}: / lands on /app ({pg.url})")
        flash = pg.evaluate("sessionStorage.getItem('cc45-flash')")
        check(flash in (None, "hidden"), f"{label}: the link page never shows ({flash})")
        pg.goto(BASE + "/?date=2026-10-15", wait_until="networkidle")
        check(pg.url == BASE + "/app?date=2026-10-15", f"{label}: query kept ({pg.url})")
        ctx.close()

    ctx = browser.new_context(**PHONE)
    pg = ctx.new_page()
    for old, new in [("/?date=2026-10-15", "/app?date=2026-10-15"), ("/?demo=1", "/app?demo=1"), ("/?level=2&as=coach", "/app?level=2&as=coach"), ("/today?date=2026-10-15", "/app?date=2026-10-15")]:
        pg.goto(BASE + old, wait_until="networkidle")
        check(pg.url == BASE + new, f"{old} redirects to {new} ({pg.url})")
    pg.goto(BASE + "/?utm_source=zalo", wait_until="networkidle")
    check(pg.url == BASE + "/?utm_source=zalo" and pg.locator("h1").count() == 1, "/?utm_source stays on the link page")
    ctx.close()


def reduced_motion(browser):
    for mode, expect_bob, expect_wind in [("reduce", "none", "none"), ("no-preference", "link-bob", "link-wind")]:
        for size in (PHONE, DESKTOP):
            ctx = browser.new_context(**size, reduced_motion=mode)
            pg = ctx.new_page()
            pg.goto(BASE + "/", wait_until="networkidle")
            names = pg.evaluate("""() => {
              const svg = [...document.querySelectorAll('svg[viewBox="0 0 390 844"], svg[viewBox="0 0 1440 900"]')].find(s => s.getBoundingClientRect().width > 0);
              const pick = (sel) => [...new Set([...svg.querySelectorAll(sel)].map(e => getComputedStyle(e).animationName))];
              return { d: pick('.link-d'), p: pick('.link-p'), dn: svg.querySelectorAll('.link-d').length, pn: svg.querySelectorAll('.link-p').length };
            }""")
            w = size["viewport"]["width"]
            check(names["d"] == [expect_bob] and names["p"] == [expect_wind], f"{mode} @{w}: objects {names['d']}, dust {names['p']}")
            if mode == "reduce":
                count = (15, 26) if w == 390 else (15, 44)
                check((names["dn"], names["pn"]) == count, f"@{w}: {count[0] - 1} objects + barbell, {count[1]} dust ({names['dn']}, {names['pn']})")
            ctx.close()


def install_param(browser):
    """?install=1 (the link the in-app browser copies): a phone opens the install steps, a desktop stays on the page."""
    install = 'div[role="dialog"][aria-labelledby="install-sheet-title"]'
    for size, phone in [(PHONE, True), (DESKTOP, False)]:
        ctx = browser.new_context(**size)
        pg = ctx.new_page()
        pg.goto(BASE + "/?install=1", wait_until="networkidle")
        pg.wait_for_timeout(400)
        w = size["viewport"]["width"]
        check(pg.url == BASE + "/", f"?install=1 @{w}: the param is dropped ({pg.url})")
        check(pg.locator(ROW).count() == 1, f"?install=1 @{w}: the link page stays")
        sheet = pg.locator(install)
        if phone:
            check(sheet.count() == 1 and sheet.get_by_text("CÀI H1T MICRO VÀO MÁY CỦA BẠN").count() == 1, "?install=1 @390: the install steps open")
            check(pg.locator(CHOOSER).count() == 0, "?install=1 @390: straight to the steps, no chooser")
            pg.keyboard.press("Escape")
            check(sheet.count() == 0 and pg.url == BASE + "/", "?install=1 @390: Esc closes, still on /")
        else:
            check(sheet.count() == 0, "?install=1 @1440: no install sheet on a desktop")
        ctx.close()


DESIGNS = Path(__file__).resolve().parents[4] / "design" / "screens"


def design_shots(browser):
    """The two design files as drawn, for the side-by-side check: .screenshots/cc-45-design-{390,1440}.png."""
    for w, h, name in [(390, 844, "LinkKhanh.dc.html"), (1440, 900, "LinkKhanhDesktop.dc.html")]:
        ctx = browser.new_context(viewport={"width": w, "height": h})
        pg = ctx.new_page()
        pg.goto((DESIGNS / name).as_uri(), wait_until="load")
        pg.wait_for_timeout(600)
        pg.screenshot(path=str(SHOTS / f"cc-45-design-{w}.png"))
        ctx.close()


with sync_playwright() as p:
    browser = p.chromium.launch()
    design_shots(browser)
    link_page(browser)
    chooser(browser)
    install_param(browser)
    desktop(browser)
    standalone_and_redirects(browser)
    reduced_motion(browser)
    browser.close()

print(f"\n{len(problems)} problem(s)")
sys.exit(1 if problems else 0)
