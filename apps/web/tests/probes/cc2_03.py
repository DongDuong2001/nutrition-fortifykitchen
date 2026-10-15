"""cc2-03: audit items from docs/audit-ag04.md (Profile red text, CalorieDial track, AppHeader date button).
Run with: ALIGN_BASE_URL=http://localhost:3102 npm run probe -- tests/probes/cc2_03.py
"""
import os
import re
import sys
from playwright.sync_api import sync_playwright
import _demo  # noqa: F401  (cc2-15b: demo mode on, see _demo.py)

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3102")
PHONE = {"width": 390, "height": 844}
DESKTOP = {"width": 1440, "height": 900}
INK = (0x11, 0x13, 0x17)  # --color-ink
SURFACE_DARK = (0x1A, 0x1C, 0x22)  # --color-surface-dark (inset summary panel)
DESTRUCTIVE_TEXT = "rgb(196, 55, 60)"  # --color-destructive-text #C4373C, 5.30:1 on white
PROFILE_RED_LABELS = ["Vùng nguy hiểm", "Xóa tài khoản"]

problems = []
notes = []

# Records whether the date button was ever in the DOM with aria-busy="true" (it is unresolved before mount)
BUSY_OBSERVER = """
window.__dateBusySeen = false;
new MutationObserver(() => {
  document.querySelectorAll('button[aria-haspopup="dialog"]').forEach((b) => {
    if ((b.getAttribute('aria-label') || '').startsWith('Chọn ngày') && b.getAttribute('aria-busy') === 'true') {
      window.__dateBusySeen = true;
    }
  });
}).observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ['aria-busy', 'aria-label'] });
"""


def check(cond, msg):
    if cond:
        notes.append("ok: " + msg)
    else:
        problems.append(msg)


def lum(rgb):
    def chan(v):
        v = v / 255
        return v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4
    r, g, b = (chan(v) for v in rgb)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast(a, b):
    hi, lo = sorted((lum(a), lum(b)), reverse=True)
    return (hi + 0.05) / (lo + 0.05)


def parse_rgb(css):
    return tuple(int(float(v)) for v in re.findall(r"[\d.]+", css)[:3])


def test_profile_red(browser):
    # Small red text on Cài đặt (IA v2: the account and danger zone live there) uses the text-destructive-text token (4.5:1 or better on the paper and card)
    for vp_name, vp in (("390", PHONE), ("1440", DESKTOP)):
        ctx = browser.new_context(viewport=vp)
        pg = ctx.new_page()
        pg.goto(BASE + "/settings", wait_until="networkidle")
        pg.wait_for_timeout(300)
        for label in PROFILE_RED_LABELS:
            color = pg.get_by_text(label, exact=True).first.evaluate("el => getComputedStyle(el).color")
            check(color == DESTRUCTIVE_TEXT, f"settings @ {vp_name}: '{label}' is {color}, want {DESTRUCTIVE_TEXT}")
        # Đăng xuất moved from Cài đặt to Tài khoản (cc-18)
        pg.goto(BASE + "/settings/account", wait_until="networkidle")
        pg.wait_for_timeout(300)
        color = pg.get_by_text("Đăng xuất", exact=True).first.evaluate("el => getComputedStyle(el).color")
        check(color == DESTRUCTIVE_TEXT, f"account @ {vp_name}: 'Đăng xuất' is {color}, want {DESTRUCTIVE_TEXT}")
        ctx.close()


def test_calorie_dial_track(browser):
    # The track circle reaches 3:1 non-text contrast on the ink header and on the surface it actually sits on (the inset panel)
    for vp_name, vp in (("390", PHONE), ("1440", DESKTOP)):
        ctx = browser.new_context(viewport=vp)
        pg = ctx.new_page()
        pg.goto(BASE + "/", wait_until="networkidle")
        pg.wait_for_timeout(600)
        track = pg.evaluate("""() => {
            const dial = [...document.querySelectorAll('svg[role="img"]')].find((s) => s.querySelectorAll('circle').length >= 2);
            if (!dial) return null;
            // The colour of the surface the ring really sits on: the nearest ancestor with a solid background
            let el = dial.parentElement, bg = 'rgba(0, 0, 0, 0)';
            while (el) { bg = getComputedStyle(el).backgroundColor; if (!bg.startsWith('rgba(0, 0, 0, 0') && bg !== 'transparent') break; el = el.parentElement; }
            return { ring: getComputedStyle(dial.querySelector('circle')).color, bg };
        }""")
        check(track is not None, f"today @ {vp_name}: calorie dial found")
        if track:
            rgb = parse_rgb(track["ring"])
            panel = parse_rgb(track["bg"])
            r_ink = contrast(rgb, INK)
            r_panel = contrast(rgb, panel)
            check(r_ink >= 3.0 and r_panel >= 3.0,
                  f"today @ {vp_name}: dial ring {track['ring']} is {r_ink:.2f}:1 on ink, {r_panel:.2f}:1 on its panel {track['bg']} (want >= 3:1 on both)")
        ctx.close()


def test_date_button_busy(browser):
    # The date button is aria-busy="true" until its label is resolved, then the attribute is gone
    for vp_name, vp in (("390", PHONE), ("1440", DESKTOP)):
        ctx = browser.new_context(viewport=vp)
        ctx.add_init_script(BUSY_OBSERVER)
        pg = ctx.new_page()
        pg.goto(BASE + "/", wait_until="networkidle")
        pg.wait_for_timeout(400)
        busy_seen = pg.evaluate("() => window.__dateBusySeen")
        check(busy_seen, f"today @ {vp_name}: date button was aria-busy=\"true\" before its date resolved")
        final = pg.evaluate("""() => {
            const b = [...document.querySelectorAll('button[aria-haspopup="dialog"]')]
                .find((x) => (x.getAttribute('aria-label') || '').startsWith('Chọn ngày'));
            return b ? b.getAttribute('aria-busy') : 'no-button';
        }""")
        check(final is None, f"today @ {vp_name}: date button has no aria-busy once resolved (found {final})")
        ctx.close()


def main():
    print(f"=== Running cc2-03 probe against {BASE} ===")
    with sync_playwright() as p:
        browser = p.chromium.launch()
        test_profile_red(browser)
        test_calorie_dial_track(browser)
        test_date_button_busy(browser)
        browser.close()

    print("\n--- Notes ---")
    for n in notes:
        print("  " + n)

    if problems:
        print("\n--- Problems ---")
        for pr in problems:
            print("  FAIL: " + pr)
        sys.exit(1)
    print(f"\nALL {len(notes)} CHECKS PASSED.")


if __name__ == "__main__":
    main()
