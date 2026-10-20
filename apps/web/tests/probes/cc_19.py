"""cc-19: CC1 screens at 200% zoom (reflow), the keyboard pass, Nguồn dữ liệu, the food detail source link, demo-only accounts.

Reflow (WCAG 1.4.10): at 640 CSS px (1280 px at 200% zoom) the page must not scroll sideways on the CC1 screens
(/settings/**, /training, /micros, /micros/[nutrient]). 320 CSS px is measured too and reported, not gated.
Keyboard: Tab from the top of each CC1 screen at 390 and 1280; every stop has a name, a focus ring (any visible change
from its idle state) and sits in the viewport; no positive tabindex.
Cài đặt has a Nguồn dữ liệu row that opens /settings/data-sources; the page is one column on the phone and two
columns on desktop; the food detail source link is at least 44 x 44 px.
Demo mode: the CC1 checks run in demo mode (the sample day and profile, as Hao sees them); outside it /settings sends a new
visitor to /setup. Sample account: on a production build, outside demo mode, ban@email.com does not sign in (skipped on
dev, which always runs demo mode).
Run with: ALIGN_BASE_URL=http://localhost:3101 npm run probe -- tests/probes/cc_19.py
"""
# PROBE_COVERS: app/(app)/(dashboard)/training/** app/(app)/(tabs)/settings/** app/(app)/foods/[id]/** app/(app)/micros/** app/(app)/micros/[nutrient]/** app/(app)/settings/account/** app/(app)/settings/account/password/** app/(app)/settings/data-sources/** app/(app)/settings/delete-account/** app/(app)/settings/language/** app/(app)/settings/notifications/** app/(app)/settings/profile/** app/(app)/settings/profile/weight/** app/(app)/settings/targets/** app/reset-password/** app/signin/** app/signin/forgot/** app/signup/**
import os
import sys

from _motion import settled  # noqa: E402  (cc-55: measure after the pop)
from playwright.sync_api import sync_playwright
import _seed  # noqa: F401  (cc-42: tour done, tips off)

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3101")
SHOTS = os.path.join(os.path.dirname(__file__), "..", "..", ".screenshots")
PHONE = {"width": 390, "height": 844}
DESKTOP = {"width": 1280, "height": 900}
REFLOW = {"width": 640, "height": 800}
NARROW = {"width": 320, "height": 800}
SAMPLE_EMAIL = "ban@email.com"
DEMO_INIT = "try { localStorage.setItem('h1t_demo_v1', '1'); } catch (e) {}"

REFLOW_PATHS = [
    "/settings",
    "/settings/profile",
    "/settings/profile/weight",
    "/settings/targets",
    "/settings/account",
    "/settings/account/password",
    "/settings/data-sources",
    "/settings/language",
    "/settings/notifications",
    "/settings/delete-account",
    "/training",
    "/micros",
    "/micros/calcium",
    "/micros/vitamin-d",
]

problems = []
notes = []


def check(cond, msg):
    if cond:
        notes.append("ok: " + msg)
    else:
        problems.append(msg)


def go(pg, path):
    pg.goto(BASE + path, wait_until="networkidle")


def new_demo_context(browser, size):
    # Demo mode (lib/demo.ts) gives the sample day and profile the CC1 screens are checked with. Outside it a new visitor
    # is sent to /setup (setup-gate), so the screens would not be tested at all.
    context = browser.new_context(viewport=size)
    context.add_init_script(DEMO_INIT)
    return context


def overflow(pg):
    # Page-level sideways scroll only; a scrolling chip bar inside its own box is not counted
    return pg.evaluate("() => document.documentElement.scrollWidth - document.documentElement.clientWidth")


# Keyboard pass: walk Tab from the top of each CC1 screen. Every stop needs a name, a visible focus ring and to sit in the
# viewport; no tabindex above 0 (it would break the DOM order).
KEYBOARD_PATHS = [
    "/settings",
    "/settings/profile",
    "/settings/profile/weight",
    "/settings/targets",
    "/settings/account",
    "/settings/account/password",
    "/settings/data-sources",
    "/settings/language",
    "/settings/notifications",
    "/settings/delete-account",
    "/signin",
    "/signin/forgot",
    "/signup",
    "/reset-password",
    "/training",
    "/micros",
    "/micros/calcium",
]
MAX_TABS = 150  # the walk stops earlier when focus leaves the page

# Visual state of a control: outline, shadow and border colours. A focus ring shows as any change from the idle state,
# so a border turning blue (focus:border-cobalt on the inputs) counts. nextjs-portal is the dev-only error overlay.
IDLE_SNAPSHOT = """() => {
  const snap = (s) => [s.outlineStyle, s.outlineWidth, s.outlineColor, s.boxShadow, s.borderTopColor, s.borderRightColor, s.borderBottomColor, s.borderLeftColor].join('|');
  window.__idle = new Map();
  document.querySelectorAll('a[href],button,input,select,textarea,[tabindex]').forEach(el => {
    if (el.closest('nextjs-portal')) return;
    window.__idle.set(el, snap(getComputedStyle(el)));
    // A peer input (an invisible overlay) shows its focus ring on the visible sibling that follows it
    if (el.classList.contains('peer') && el.nextElementSibling) window.__idle.set(el.nextElementSibling, snap(getComputedStyle(el.nextElementSibling)));
  });
  return window.__idle.size;
}"""

FOCUS_INFO = """() => {
  const el = document.activeElement;
  if (!el || el === document.body) return null;
  if (el.closest('nextjs-portal')) return { skip: true };
  const snap = (s) => [s.outlineStyle, s.outlineWidth, s.outlineColor, s.boxShadow, s.borderTopColor, s.borderRightColor, s.borderBottomColor, s.borderLeftColor].join('|');
  const s = getComputedStyle(el);
  const r = el.getBoundingClientRect();
  const lb = el.getAttribute('aria-labelledby');
  let name = '';
  if (lb) name = lb.split(/\\s+/).map(id => (document.getElementById(id) || {}).textContent || '').join(' ').trim();
  if (!name) name = (el.getAttribute('aria-label') || '').trim();
  if (!name && el.id) { const l = document.querySelector('label[for="' + CSS.escape(el.id) + '"]'); if (l) name = l.textContent.trim(); }
  if (!name) { const wl = el.closest('label'); if (wl) name = wl.textContent.trim(); }
  if (!name && el.tagName === 'INPUT' && el.value && ['submit', 'button'].includes(el.type)) name = el.value.trim();
  if (!name) name = (el.textContent || '').trim();
  if (!name) name = (el.getAttribute('title') || el.getAttribute('placeholder') || '').trim();
  const target = el.classList.contains('peer') && el.nextElementSibling ? el.nextElementSibling : el;
  const idle = window.__idle && window.__idle.get(target);
  const changed = idle !== undefined && idle !== snap(getComputedStyle(target));
  const visibleOutline = s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0 && s.outlineColor !== 'rgba(0, 0, 0, 0)';
  const ring = changed || visibleOutline;
  const inView = r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < window.innerHeight && r.right > 0 && r.left < window.innerWidth;
  return { tag: el.tagName.toLowerCase(), name: name.slice(0, 60), ring, inView, sel: el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') };
}"""


def keyboard_pass(browser, label, size):
    context = new_demo_context(browser, size)
    pg = context.new_page()
    for path in KEYBOARD_PATHS:
        go(pg, path)
        pg.wait_for_timeout(200)
        bad_order = pg.evaluate("() => [...document.querySelectorAll('[tabindex]')].filter(e => parseInt(e.getAttribute('tabindex'), 10) > 0).length")
        check(bad_order == 0, f"{label} {path}: no positive tabindex")
        seen = []
        for _ in range(MAX_TABS):
            # Snapshot the idle state before each Tab: a control can be re-mounted after load, so one early snapshot misses it
            pg.evaluate(IDLE_SNAPSHOT)
            pg.keyboard.press("Tab")
            pg.wait_for_timeout(200)  # colour transitions run 150 ms; read the settled focus style
            info = pg.evaluate(FOCUS_INFO)
            if info is None:
                break  # focus left the page (the walk has cycled to the browser UI)
            if info.get("skip"):
                continue  # dev-only error overlay, not part of the page
            seen.append(info)
            if not info["name"]:
                problems.append(f"{label} {path}: unnamed {info['sel']} at tab stop {len(seen)}")
            if not info["ring"]:
                problems.append(f"{label} {path}: no focus ring on {info['sel']} ({info['name'] or 'unnamed'}) at tab stop {len(seen)}")
            if not info["inView"]:
                problems.append(f"{label} {path}: focused {info['sel']} ({info['name']}) is outside the viewport")
        check(len(seen) > 0, f"{label} {path}: has tab stops ({len(seen)})")
        notes.append(f"info: {label} {path}: {len(seen)} tab stops")
    context.close()


def min_target(locator, label, minimum=44):
    box = locator.bounding_box()
    check(box is not None and box["height"] >= minimum and box["width"] >= minimum, f"{label}: target at least {minimum} px ({box})")


def check_settings_row_and_sources(browser):
    for label, size in (("390", PHONE), ("1280", DESKTOP)):
        context = new_demo_context(browser, size)
        pg = context.new_page()
        go(pg, "/settings")
        pg.wait_for_selector('section[aria-label="Ứng dụng"]', timeout=10000)
        pg.screenshot(path=os.path.join(SHOTS, f"cc-19-settings-{label}.png"), full_page=True)
        rows = pg.locator('section[aria-label="Ứng dụng"] a')
        names = [rows.nth(i).inner_text().split("\n")[0].strip() for i in range(rows.count())]
        check("Nguồn dữ liệu" in names, f"{label} /settings: Ứng dụng card has a Nguồn dữ liệu row ({names})")
        if "Nguồn dữ liệu" in names:
            i = names.index("Nguồn dữ liệu")
            check(0 < i < len(names) - 1 and names[i - 1] == "Nhắc nhở" and names[i + 1] == "Thêm vào màn hình chính",
                  f"{label} /settings: the row sits between Nhắc nhở and Thêm vào màn hình chính")
            check(rows.nth(i).get_attribute("href") == "/settings/data-sources", f"{label} /settings: the row links to /settings/data-sources")
            min_target(rows.nth(i), f"{label} /settings: Nguồn dữ liệu row")

        go(pg, "/settings/data-sources")
        pg.wait_for_selector("main article", timeout=10000)
        pg.screenshot(path=os.path.join(SHOTS, f"cc-19-data-sources-{label}.png"), full_page=True)
        check(pg.get_by_role("heading", name="Các cơ sở dữ liệu dinh dưỡng", level=2).count() == 1,
              f"{label} data-sources: the section heading is an h2")
        cards = pg.locator("main article")
        check(cards.count() == 5, f"{label} data-sources: four sources and the reading guide ({cards.count()} cards)")
        if cards.count() == 5:
            boxes = [cards.nth(i).bounding_box() for i in range(5)]
            if label == "1280":
                a, b, guide = boxes[0], boxes[1], boxes[4]
                check(abs(a["y"] - b["y"]) < 1 and b["x"] > a["x"] + a["width"] - 1, "1280 data-sources: the first two sources sit side by side")
                check(guide["width"] > a["width"] * 1.5, "1280 data-sources: the reading guide spans both columns")
            else:
                check(max(b["x"] for b in boxes) - min(b["x"] for b in boxes) < 1, "390 data-sources: one column")
        main_x = pg.locator("main").bounding_box()["x"]
        go(pg, "/settings/targets")
        pg.wait_for_selector("main", timeout=10000)
        targets_x = pg.locator("main").bounding_box()["x"]
        check(abs(main_x - targets_x) < 1, f"{label}: data-sources content starts at the same left edge as Mục tiêu mỗi ngày")
        context.close()


def check_source_link(browser):
    for label, size in (("390", PHONE), ("1280", DESKTOP)):
        context = new_demo_context(browser, size)
        pg = context.new_page()
        go(pg, "/foods/food-cha-la")
        # cc-27d: the source in the header opens the Nguồn dữ liệu sheet, which links to all sources
        src = pg.locator("header").first.get_by_role("button", name="USDA")
        src.wait_for(state="visible", timeout=10000)
        min_target(src, f"{label} food detail: source button")
        src.click()
        link = pg.get_by_role("dialog").locator('a[href="/settings/data-sources"]').first
        link.wait_for(state="visible", timeout=10000)
        settled(pg)
        check(link.inner_text().strip() != "", f"{label} food detail: the source link has a name")
        min_target(link, f"{label} food detail: source link")
        context.close()


def check_sample_account_outside_demo(browser):
    # A visitor outside demo mode has no sample account: signing in with ban@email.com gets the one generic message.
    # The Next.js dev overlay only exists on the dev server, which always runs demo mode: the check is for production builds.
    context = browser.new_context(viewport=PHONE)
    pg = context.new_page()
    go(pg, "/signin")
    if pg.locator("nextjs-portal").count() > 0:
        notes.append("info: dev server always runs demo mode, so the sample-account check is skipped here (run on the prod build)")
    else:
        pg.locator('input[type="email"]').fill(SAMPLE_EMAIL)
        pg.locator('input[type="password"]').first.fill("abcdef12")
        pg.get_by_role("button", name="Đăng nhập", exact=True).click()
        message = pg.get_by_text("Email hoặc mật khẩu không đúng", exact=False).first
        try:
            message.wait_for(state="visible", timeout=8000)
            shown = True
        except Exception:
            shown = False
        check(shown, "outside demo mode: the sample account does not sign in (one generic message)")
    context.close()


def check_reflow(browser, label, size, gate):
    context = new_demo_context(browser, size)
    pg = context.new_page()
    for path in REFLOW_PATHS:
        go(pg, path)
        o = overflow(pg)
        if gate:
            check(o <= 0, f"{label} {path}: no horizontal scroll (overflow {o}px)")
        elif o > 0:
            notes.append(f"info: {label} {path}: overflow {o}px (not gated)")
    context.close()


def main():
    os.makedirs(SHOTS, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch()
        check_reflow(browser, "640 (200% zoom)", REFLOW, gate=True)
        check_reflow(browser, "320 (400% zoom)", NARROW, gate=False)
        keyboard_pass(browser, "390", PHONE)
        keyboard_pass(browser, "1280", DESKTOP)
        check_settings_row_and_sources(browser)
        check_source_link(browser)
        check_sample_account_outside_demo(browser)
        browser.close()

    for line in notes:
        print(line)
    for line in problems:
        print("[FAIL] " + line)
    print(f"cc-19: {len([n for n in notes if n.startswith('ok')])} ok, {len(problems)} FAIL")
    sys.exit(1 if problems else 0)


if __name__ == "__main__":
    main()
