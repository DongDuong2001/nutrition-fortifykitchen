"""cc-24: Dong's new screens follow the UI rules, at 390 and 1280.

Screens: /explore (leaderboard banner, coaches carousel), /explore/leaderboard, /explore/coaches,
/explore/coaches/[id] (found and not found), /admin/review, /privacy, /terms, and the coach application sheet.
Per screen and width: no console or hydration errors, no horizontal scroll, one h1, colours from the tokens
(spot check of text, background and border colours), every button and link in the page at least 44 px, no text under
11 px, no all caps outside headings, no ellipsis truncation. The sheet closes with Esc and returns focus. No normal
screen links to /admin. Leaderboard rows show only the name and the score. Screenshots: .screenshots/cc-24-{leaderboard,coaches,admin,error}-390.png.
Run with: ALIGN_BASE_URL=http://localhost:3101 npm run probe -- tests/probes/cc_24.py
"""
import os
import re
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright
import _demo  # noqa: F401  (demo mode on, see _demo.py)

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3101")
SHOTS = Path(__file__).resolve().parent.parent.parent / ".screenshots"
SIZES = [("390", {"width": 390, "height": 844}), ("1280", {"width": 1280, "height": 800})]
SCREENS = [
    ("explore", "/explore"),
    ("leaderboard", "/explore/leaderboard"),
    ("coaches", "/explore/coaches"),
    ("coach", "/explore/coaches/coach-khanh"),
    ("coach-missing", "/explore/coaches/khong-co"),
    ("admin", "/admin/review?as=admin"),
    ("privacy", "/privacy"),
    ("terms", "/terms"),
]
HYDRATION = re.compile(r"hydrat|React error #(418|419|423|425)|did not match", re.I)
BRAND_CAPS = {"H1T", "H1T MICRO", "H1T SYSTEM"}
problems, notes = [], []


def check(cond, msg):
    (notes if cond else problems).append(("ok: " if cond else "") + msg)


AUDIT_JS = """() => {
  const root = document.documentElement;
  const cs = getComputedStyle(root);
  // The tokens: every --color-* variable resolved to rgb through a probe element
  const probe = document.createElement('span');
  document.body.appendChild(probe);
  const allowed = new Set(['rgba(0, 0, 0, 0)', 'transparent']);
  for (const sheet of document.styleSheets) {
    let rules; try { rules = sheet.cssRules; } catch (e) { continue; }
    for (const r of rules) {
      const text = r.cssText || '';
      for (const m of text.matchAll(/--color-[a-z0-9-]+/g)) {
        probe.style.color = 'var(' + m[0] + ')';
        const c = getComputedStyle(probe).color;
        if (c) allowed.add(c);
      }
    }
  }
  probe.remove();
  const rgbOnly = (c) => { const m = c.match(/^rgba?\\(([^)]+)\\)$/); if (!m) return null; const p = m[1].split(/[ ,\\/]+/).filter(Boolean); return 'rgb(' + p.slice(0,3).join(', ') + ')'; };
  const allowedRgb = new Set([...allowed].map(c => rgbOnly(c) || c));
  const main = document.querySelector('main') || document.body;
  const out = { raw: [], small: [], tap: [], caps: [], ellipsis: [], h1: document.querySelectorAll('h1').length };
  const visible = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && s.opacity !== '0'; };
  const label = (el) => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + ':' + (el.textContent || '').trim().slice(0, 28);
  for (const el of main.querySelectorAll('*')) {
    if (!(el instanceof HTMLElement) || !visible(el)) continue;
    if (el.closest('.sr-only')) continue;
    const s = getComputedStyle(el);
    for (const prop of ['color', 'backgroundColor']) {
      const c = rgbOnly(s[prop]);
      if (c && !allowedRgb.has(c) && !(prop === 'backgroundColor' && s[prop].endsWith(', 0)'))) out.raw.push(label(el) + ' ' + prop + ' ' + s[prop]);
    }
    if (parseFloat(s.borderTopWidth) > 0) { const c = rgbOnly(s.borderTopColor); if (c && !allowedRgb.has(c)) out.raw.push(label(el) + ' border ' + s.borderTopColor); }
    const own = Array.from(el.childNodes).filter(n => n.nodeType === Node.TEXT_NODE && n.textContent.trim()).map(n => n.textContent.trim()).join(' ');
    if (own) {
      if (parseFloat(s.fontSize) < 11) out.small.push(label(el) + ' ' + s.fontSize);
      const inHeading = !!el.closest('h1, h2, h3');
      const letters = own.replace(/[^A-Za-zÀ-ỹ]/g, '');
      const caps = (s.textTransform === 'uppercase') || (letters.length >= 4 && own === own.toLocaleUpperCase('vi-VN') && own !== own.toLocaleLowerCase('vi-VN'));
      if (caps && !inHeading && !el.closest('code')) out.caps.push(label(el));
      if (s.textOverflow === 'ellipsis' && el.scrollWidth > el.clientWidth + 1) out.ellipsis.push(label(el));
    }
    if (el.matches('a[href], button, select, input:not([type=hidden]), textarea, [role=button], [role=switch]')) {
      const r = el.getBoundingClientRect();
      if (Math.min(r.width, r.height) < 43.5) out.tap.push(label(el) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
    }
  }
  out.scroll = Math.max(root.scrollWidth, document.body.scrollWidth) > window.innerWidth;
  return out;
}"""


def audit(browser, size_name, size, name, route):
    ctx = browser.new_context(viewport=size)
    pg = ctx.new_page()
    errors = []
    pg.on("console", lambda m: errors.append(m.text) if m.type in ("error", "warning") else None)
    pg.on("pageerror", lambda e: errors.append(str(e)))
    pg.goto(BASE + route, wait_until="networkidle")
    pg.wait_for_timeout(700)
    w = f"{size_name} {route}"
    hyd = [e for e in errors if HYDRATION.search(e)]
    other = [e for e in errors if not HYDRATION.search(e) and "preloaded using link preload" not in e]
    check(not hyd, f"{w}: no hydration errors {hyd[:1]}")
    check(not other, f"{w}: no console errors or warnings {other[:1]}")
    res = pg.evaluate(AUDIT_JS)
    check(not res["scroll"], f"{w}: no horizontal scroll")
    check(res["h1"] == 1, f"{w}: one h1 ({res['h1']})")
    check(not res["raw"], f"{w}: colours come from the tokens ({res['raw'][:3]})")
    check(not res["small"], f"{w}: no text under 11 px ({res['small'][:3]})")
    check(not res["tap"], f"{w}: every button and link is 44 px ({res['tap'][:4]})")
    check(not res["caps"], f"{w}: no all caps outside headings ({res['caps'][:3]})")
    check(not res["ellipsis"], f"{w}: no ellipsis truncation ({res['ellipsis'][:3]})")
    if size_name == "390" and name in ("leaderboard", "coaches", "admin"):
        SHOTS.mkdir(parents=True, exist_ok=True)
        pg.screenshot(path=str(SHOTS / f"cc-24-{name}-390.png"), full_page=True, animations="disabled")
    ctx.close()


def leaderboard_behaviour(browser, size_name, size):
    ctx = browser.new_context(viewport=size)
    pg = ctx.new_page()
    pg.goto(BASE + "/explore/leaderboard", wait_until="networkidle")
    pg.wait_for_timeout(500)
    w = f"{size_name} leaderboard"
    sw = pg.get_by_role("switch", name="Tham gia Bảng xếp hạng")
    check(sw.count() == 1 and sw.get_attribute("aria-checked") == "false", f"{w}: the opt-in switch starts off")
    check("Đang ở chế độ ẩn danh" in pg.inner_text("main"), f"{w}: off reads ẩn danh")
    check(pg.locator("text=Vị trí của bạn").count() == 0, f"{w}: no own rank while not opted in")
    sw.click()
    pg.wait_for_timeout(300)
    check(sw.get_attribute("aria-checked") == "true", f"{w}: the switch turns on")
    check("Vị trí của bạn" in pg.inner_text("main"), f"{w}: own rank shows after opting in")
    body = pg.inner_text("main")
    check("Chỉ hiển thị tên hiển thị và điểm kỷ luật vi chất" in body, f"{w}: the opt-in text states what is shown")
    # Hao 15/10: a place shows the display name and the discipline score, nothing else (the opt-in promise)
    extra = pg.evaluate("""() => [...document.querySelectorAll('main li')]
        .map(li => li.innerText.replace(/\\s+/g, ' ').trim())
        .filter(t => /Cấp|ngày ghi|vi chất|%/.test(t))""")
    check(not extra, f"{w}: rows and podium show only name and score ({extra[:2]})")
    rows = pg.evaluate("document.querySelectorAll('main ol li, main section ul li').length")
    check(rows >= 8, f"{w}: the ranking lists its places ({rows})")
    pg.get_by_role("button", name="Tháng này").click()
    pg.wait_for_timeout(200)
    check(pg.get_by_role("button", name="Tháng này").get_attribute("aria-pressed") == "true", f"{w}: the month period is pressed")
    ctx.close()


def application_sheet(browser, size_name, size):
    """The Cấp 5 application sheet. No real user reaches it yet (the mock level is 3), so it opens from /dev/ui."""
    ctx = browser.new_context(viewport=size)
    pg = ctx.new_page()
    pg.goto(BASE + "/dev/ui", wait_until="networkidle")
    pg.wait_for_timeout(500)
    w = f"{size_name} application sheet"
    opener = pg.get_by_role("button", name="Mở đơn ứng tuyển huấn luyện viên")
    check(opener.count() == 1, f"{w}: the showcase has the opener")
    opener.scroll_into_view_if_needed()
    opener.click()
    pg.wait_for_timeout(400)
    check(pg.locator("[role=dialog]").count() == 1, f"{w}: opens a dialog")
    inside = pg.evaluate("() => { const d = document.querySelector('[role=dialog]'); return !!d && d.contains(document.activeElement); }")
    check(inside, f"{w}: focus is inside")
    small = pg.evaluate("""() => [...document.querySelectorAll('[role=dialog] button, [role=dialog] input, [role=dialog] select, [role=dialog] textarea')]
        .map(e => e.getBoundingClientRect()).filter(r => r.width > 0 && Math.min(r.width, r.height) < 43.5).length""")
    check(small == 0, f"{w}: every control is 44 px ({small} too small)")
    fonts = pg.evaluate("""() => [...document.querySelectorAll('[role=dialog] *')].filter(e => [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()))
        .map(e => parseFloat(getComputedStyle(e).fontSize)).filter(f => f < 12)""")
    check(not fonts, f"{w}: no text under 12 px in the form ({fonts[:3]})")
    # a validation message comes through
    pg.get_by_role("button", name="Nộp hồ sơ xét duyệt").click()
    pg.wait_for_timeout(200)
    check(pg.locator("[role=dialog] [role=alert]").count() == 1, f"{w}: an empty form says what is missing")
    pg.keyboard.press("Escape")
    pg.wait_for_timeout(300)
    check(pg.locator("[role=dialog]").count() == 0, f"{w}: Esc closes the sheet")
    focused = pg.evaluate("() => document.activeElement && (document.activeElement.textContent || '').trim()")
    check(focused == "Mở đơn ứng tuyển huấn luyện viên", f"{w}: focus returns to the button ({focused!r})")
    ctx.close()


def back_and_links(browser, size_name, size):
    ctx = browser.new_context(viewport=size)
    pg = ctx.new_page()
    pg.goto(BASE + "/explore/coaches/coach-ha", wait_until="networkidle")
    pg.wait_for_timeout(400)
    pg.locator('[aria-label="Quay lại"]:visible').first.click()
    pg.wait_for_url("**/explore/coaches", timeout=8000)
    check(urlpath(pg) == "/explore/coaches", f"{size_name}: back from a coach with no history goes to the directory ({urlpath(pg)})")
    pg.goto(BASE + "/privacy", wait_until="networkidle")
    pg.wait_for_timeout(400)
    pg.locator('[aria-label="Quay lại"]:visible').first.click()
    pg.wait_for_url("**/settings", timeout=8000)
    check(urlpath(pg) == "/settings", f"{size_name}: back from the privacy page goes to Cài đặt ({urlpath(pg)})")
    # nobody links to /admin
    bad = []
    for route in ("/", "/explore", "/explore/leaderboard", "/explore/coaches", "/settings", "/settings/profile", "/trends", "/micros", "/privacy", "/terms"):
        pg.goto(BASE + route, wait_until="networkidle")
        pg.wait_for_timeout(250)
        hrefs = pg.evaluate("[...document.querySelectorAll('a[href]')].map(a => a.getAttribute('href'))")
        bad += [f"{route} -> {h}" for h in hrefs if h and h.startswith("/admin")]
    check(not bad, f"{size_name}: no screen links to /admin ({bad[:3]})")
    ctx.close()


def error_page_source():
    """global-error.tsx renders outside the root layout, so it must import the token CSS and use no raw colour.
    Its styled render was checked by forcing a root error in a production build (cc-24-error-390.png)."""
    src = (Path(__file__).resolve().parent.parent.parent / "app" / "global-error.tsx").read_text(encoding="utf-8")
    check('import "./globals.css"' in src, "error page: imports globals.css (the token CSS)")
    check(re.search(r"#[0-9A-Fa-f]{3,8}\b", src) is None, "error page: no raw hex colour")
    check(re.search(r"\b(?:bg|text|border)-(?:slate|gray|zinc|amber|red|green|blue)-\d", src) is None, "error page: no Tailwind palette colour")
    check("min-h-[44px]" in src or "h-[52px]" in src, "error page: the actions are 44 px or taller")


def urlpath(pg):
    return re.sub(r"^https?://[^/]+", "", pg.url).split("?")[0]


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for size_name, size in SIZES:
            for name, route in SCREENS:
                try:
                    audit(browser, size_name, size, name, route)
                except Exception as err:
                    check(False, f"{size_name} {route}: stopped: {str(err).splitlines()[0][:160]}")
            for fn in (leaderboard_behaviour, application_sheet, back_and_links):
                try:
                    fn(browser, size_name, size)
                except Exception as err:
                    check(False, f"{size_name} {fn.__name__}: stopped: {str(err).splitlines()[0][:160]}")
        browser.close()
    error_page_source()
    for n in notes:
        print("  " + n)
    for pr in problems:
        print("[FAIL] " + pr)
    print(f"cc-24: {len(notes)} ok, {len(problems)} fail")
    sys.exit(1 if problems else 0)


if __name__ == "__main__":
    main()
