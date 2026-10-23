"""dark_foundation: the dark mode foundation (job 14) changes nothing while its flag is off, and works as designed with it on.

Flag OFF (no h1t_dark_preview), even with h1t_theme_v1="dark" stored and a phone set to dark: <html> has no data-theme on
Hôm nay and Cài đặt, Cài đặt has no "Giao diện" row, the page is still the light colour (rgb(242, 242, 247)), and
/settings/appearance is the 404 page.
Flag ON (h1t_dark_preview=1, the demo build's preview switch): Cài đặt shows "Giao diện" = "Hệ thống" linking to
/settings/appearance, which has a radiogroup Hệ thống / Sáng / Tối. Tối puts data-theme="dark" on <html> at once (body
rgb(0, 0, 0)) and, after a reload, it is already there when DOMContentLoaded fires (the head script, before the first
paint). Sáng takes it off. Hệ thống follows the emulated phone (dark -> dark, light -> none) and flips live with
page.emulate_media, with no reload.
Screenshots (flag on) go to docs/screenshots/overnight-1023/dark/: Hôm nay in Tối at 390 and 1440, Cài đặt and Giao diện in
Tối at 390, and Hôm nay in Sáng at 390 for a side-by-side.
Each failure prints as "[FAIL] <check>: <detail>"; the probe exits 1 on any.
Run with: ALIGN_BASE_URL=http://localhost:3181 npm run probe -- tests/probes/dark_foundation.py
"""
# PROBE_COVERS: lib/theme.ts components/theme-sync.tsx app/globals.css app/layout.tsx app/(app)/settings/appearance/** components/settings/profile-cards.tsx
import os
import sys
from pathlib import Path

import _demo  # noqa: F401
from playwright.sync_api import sync_playwright

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3101")
NOW = "2026-10-15T10:00:00+07:00"
SHOTS = Path(__file__).resolve().parents[4] / "docs" / "screenshots" / "overnight-1023" / "dark"
LIGHT_BG = "rgb(242, 242, 247)"
DARK_BG = "rgb(0, 0, 0)"

SET_THEME = "try { localStorage.setItem('h1t_theme_v1', %s); } catch (e) {}"
PREVIEW_ON = "try { localStorage.setItem('h1t_dark_preview', '1'); } catch (e) {}"
# What <html data-theme> was when DOMContentLoaded fired: the head script must have run before that (and before paint)
DCL = "document.addEventListener('DOMContentLoaded', () => { window.__themeAtDCL = document.documentElement.dataset.theme || null; });"

failures = []


def check(name, ok, detail=""):
    if ok:
        print(f"[ok] {name}", flush=True)
    else:
        failures.append(name)
        print(f"[FAIL] {name}: {detail}", flush=True)


def theme(pg):
    return pg.evaluate("document.documentElement.dataset.theme || null")


def body_bg(pg):
    return pg.evaluate("getComputedStyle(document.body).backgroundColor")


def load(pg, route):
    pg.goto(BASE + route, wait_until="load")
    try:
        pg.wait_for_load_state("networkidle", timeout=4000)
    except Exception:
        pass
    pg.wait_for_timeout(500)


def context(browser, *, preview, stored=None, scheme="light", size=None):
    ctx = browser.new_context(viewport=size or {"width": 390, "height": 844}, color_scheme=scheme, reduced_motion="reduce")
    if preview:
        ctx.add_init_script(PREVIEW_ON)
    if stored:
        ctx.add_init_script(SET_THEME % repr(stored))
    ctx.add_init_script(DCL)
    pg = ctx.new_page()
    pg.clock.set_fixed_time(NOW)
    return ctx, pg


def flag_off(browser):
    ctx, pg = context(browser, preview=False, stored="dark", scheme="dark")
    for route in ("/app", "/settings"):
        load(pg, route)
        check(f"off {route}: no data-theme", theme(pg) is None, f"data-theme={theme(pg)!r}")
        check(f"off {route}: light page colour", body_bg(pg) == LIGHT_BG, body_bg(pg))
    check("off /settings: no Giao diện row", pg.get_by_text("Giao diện", exact=True).count() == 0, "the row is there")
    check("off /settings: no link to /settings/appearance", pg.locator('a[href="/settings/appearance"]').count() == 0)
    load(pg, "/settings/appearance")
    check("off /settings/appearance: the 404 page", pg.get_by_text("Không có trang").count() > 0 and pg.get_by_role("radiogroup").count() == 0, pg.inner_text("body")[:80])
    check("off /settings/appearance: no data-theme", theme(pg) is None)
    ctx.close()


def radio(pg, name):
    return pg.get_by_role("radio", name=name, exact=True)


def flag_on(browser):
    ctx, pg = context(browser, preview=True, scheme="light")
    # the row on Cài đặt
    load(pg, "/settings")
    row = pg.locator('a[href="/settings/appearance"]')
    check("on /settings: Giao diện row links to /settings/appearance", row.count() == 1, f"{row.count()} links")
    if row.count() == 1:
        text = row.inner_text()
        check("on /settings: row says Giao diện with value Hệ thống", "Giao diện" in text and "Hệ thống" in text, repr(text))
    # the page
    load(pg, "/settings/appearance")
    group = pg.get_by_role("radiogroup")
    check("on /settings/appearance: a radiogroup", group.count() == 1, f"{group.count()}")
    labels = [r.inner_text().strip() for r in group.get_by_role("radio").all()] if group.count() else []
    check("on /settings/appearance: Hệ thống, Sáng, Tối", labels == ["Hệ thống", "Sáng", "Tối"], str(labels))
    check("on /settings/appearance: Hệ thống is the checked one", radio(pg, "Hệ thống").get_attribute("aria-checked") == "true"
          and radio(pg, "Sáng").get_attribute("aria-checked") == "false" and radio(pg, "Tối").get_attribute("aria-checked") == "false")
    check("on: light phone, Hệ thống -> no data-theme", theme(pg) is None)

    # Tối at once, then after a reload
    radio(pg, "Tối").click()
    pg.wait_for_timeout(150)
    check("Tối: data-theme=dark at once", theme(pg) == "dark", f"{theme(pg)!r}")
    check("Tối: body rgb(0, 0, 0)", body_bg(pg) == DARK_BG, body_bg(pg))
    check("Tối: aria-checked moves", radio(pg, "Tối").get_attribute("aria-checked") == "true" and radio(pg, "Hệ thống").get_attribute("aria-checked") == "false")
    check("Tối: kept on the device", pg.evaluate("localStorage.getItem('h1t_theme_v1')") == "dark")
    pg.reload(wait_until="load")
    pg.wait_for_timeout(500)
    at_dcl = pg.evaluate("window.__themeAtDCL")
    check("Tối after reload: data-theme was already dark at DOMContentLoaded", at_dcl == "dark", f"{at_dcl!r}")
    check("Tối after reload: still dark and checked", theme(pg) == "dark" and radio(pg, "Tối").get_attribute("aria-checked") == "true")
    # and on another screen, straight from a navigation
    load(pg, "/app")
    check("Tối on /app: data-theme=dark at DOMContentLoaded", pg.evaluate("window.__themeAtDCL") == "dark" and body_bg(pg) == DARK_BG, f"{pg.evaluate('window.__themeAtDCL')!r} {body_bg(pg)}")
    load(pg, "/settings")
    row = pg.locator('a[href="/settings/appearance"]')
    check("Tối on /settings: the row now says Tối", row.count() == 1 and "Tối" in row.inner_text(), repr(row.inner_text() if row.count() else ""))

    # Sáng takes it off, whatever the phone says
    load(pg, "/settings/appearance")
    radio(pg, "Sáng").click()
    pg.wait_for_timeout(150)
    check("Sáng: no data-theme", theme(pg) is None, f"{theme(pg)!r}")
    check("Sáng: light page colour", body_bg(pg) == LIGHT_BG, body_bg(pg))
    pg.emulate_media(color_scheme="dark")
    pg.wait_for_timeout(200)
    check("Sáng with a dark phone: still no data-theme", theme(pg) is None, f"{theme(pg)!r}")
    pg.emulate_media(color_scheme="light")

    # Hệ thống follows the phone, live
    radio(pg, "Hệ thống").click()
    pg.wait_for_timeout(150)
    check("Hệ thống, light phone: no data-theme", theme(pg) is None, f"{theme(pg)!r}")
    pg.emulate_media(color_scheme="dark")
    pg.wait_for_timeout(300)
    check("Hệ thống, phone switches to dark (no reload): dark", theme(pg) == "dark" and body_bg(pg) == DARK_BG, f"{theme(pg)!r} {body_bg(pg)}")
    pg.emulate_media(color_scheme="light")
    pg.wait_for_timeout(300)
    check("Hệ thống, phone switches back to light (no reload): none", theme(pg) is None and body_bg(pg) == LIGHT_BG, f"{theme(pg)!r} {body_bg(pg)}")
    ctx.close()

    # Hệ thống on a phone that is already dark, from a cold load
    ctx, pg = context(browser, preview=True, scheme="dark")
    load(pg, "/app")
    check("Hệ thống, dark phone, cold load: dark at DOMContentLoaded", pg.evaluate("window.__themeAtDCL") == "dark" and body_bg(pg) == DARK_BG, f"{pg.evaluate('window.__themeAtDCL')!r} {body_bg(pg)}")
    ctx.close()


def shots(browser):
    SHOTS.mkdir(parents=True, exist_ok=True)

    def shot(pg, route, name):
        load(pg, route)
        path = SHOTS / name
        pg.screenshot(path=str(path))
        check(f"screenshot {name}", path.exists() and path.stat().st_size > 2000)

    ctx, pg = context(browser, preview=True, stored="dark", scheme="light", size={"width": 390, "height": 844})
    shot(pg, "/app", "today-dark-390.png")
    check("shots: /app is dark", theme(pg) == "dark")
    shot(pg, "/settings", "settings-dark-390.png")
    shot(pg, "/settings/appearance", "appearance-dark-390.png")
    ctx.close()
    ctx, pg = context(browser, preview=True, stored="dark", scheme="light", size={"width": 1440, "height": 900})
    shot(pg, "/app", "today-dark-1440.png")
    ctx.close()
    ctx, pg = context(browser, preview=True, stored="light", scheme="dark", size={"width": 390, "height": 844})
    shot(pg, "/app", "today-light-390.png")
    check("shots: Sáng /app has no data-theme", theme(pg) is None)
    ctx.close()


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        flag_off(browser)
        flag_on(browser)
        shots(browser)
        browser.close()
    if failures:
        print(f"dark_foundation: {len(failures)} failed: {failures}", flush=True)
        sys.exit(1)
    print("dark_foundation: all checks passed", flush=True)


if __name__ == "__main__":
    main()
