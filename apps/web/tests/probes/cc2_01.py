"""cc2-01: nutrient detail, date labels without a comma, and the removed /foods catalog.
The Vi chất row for Canxi opens /micros/calcium. The detail shows 331 / 1.000 mg and 33 %. An unknown
amount shows "—", never "0" (alcohol on the sample day). /foods redirects to /explore. The date label has no comma.
Screenshots at 390 and 1440 go to apps/web/.screenshots/cc2-01-*.png.
Run with: ALIGN_BASE_URL=http://localhost:3102 npm run probe -- tests/probes/cc2_01.py
"""
# PROBE_COVERS: app/(app)/(tabs)/app/** app/(app)/(tabs)/explore/** app/(app)/micros/** app/(app)/micros/[nutrient]/** app/page.tsx
import datetime
import os
import re
import sys

from playwright.sync_api import sync_playwright
import _demo  # noqa: F401  (cc2-15b: demo mode on, see _demo.py)

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3102")
SHOTS = os.path.join(os.path.dirname(__file__), "..", "..", ".screenshots")
PHONE = {"width": 390, "height": 844}
DESKTOP = {"width": 1440, "height": 900}
VN = datetime.timezone(datetime.timedelta(hours=7))
TODAY = datetime.datetime.now(VN).date()
problems = []
notes = []
os.makedirs(SHOTS, exist_ok=True)


def check(cond, msg):
    if cond:
        notes.append("ok: " + msg)
    else:
        problems.append(msg)


def shot(name):
    return os.path.join(SHOTS, name)


def page_text(pg):
    # The amount and percentage sit in the header, so read the whole visible body
    return pg.inner_text("body")


def probe_micros_rows(pg):
    pg.goto(BASE + "/micros", wait_until="networkidle")
    pg.wait_for_timeout(300)
    hrefs = pg.eval_on_selector_all(
        'a[href^="/micros/"]', "els => els.map(e => e.getAttribute('href'))"
    )
    unique = set(hrefs)
    check(len(unique) == 59, f"every Vi chất row links to a detail (unique links: {len(unique)}, want 59)")
    check("/micros/water" in unique, "a row with no target (Nước) links to its detail too")


def probe_open_from_row(pg, width_name):
    pg.goto(BASE + "/micros", wait_until="networkidle")
    row = pg.locator('a[href="/micros/calcium"] >> visible=true').first
    row.wait_for(state="visible", timeout=8000)
    row.click()
    pg.wait_for_url("**/micros/calcium", timeout=8000)
    pg.wait_for_timeout(400)
    text = page_text(pg)
    check(pg.url.endswith("/micros/calcium"), f"{width_name}: tapping the Canxi row opens /micros/calcium")
    check("1.000 mg" in text, f"{width_name}: the recommended 1.000 mg shows on the detail (cc-73b)")
    check("331 mg" in text, f"{width_name}: today's amount 331 mg shows on the detail")
    check("33%" in pg.inner_text("body"), f"{width_name}: percentage 33% shows in the header")
    check("Gợi ý để bù" not in pg.inner_text("body"), f"{width_name}: no Gợi ý để bù section yet")
    pg.screenshot(path=shot(f"cc2-01-calcium-{width_name}.png"), full_page=True)


def probe_null_dash(pg):
    # Alcohol has no target and no amount on the sample day: the detail must show a dash, not 0
    pg.goto(BASE + "/micros/alcohol", wait_until="networkidle")
    pg.wait_for_timeout(400)
    text = page_text(pg)
    check("—" in text, "null amount shows a dash on the Cồn detail")
    check(not re.search(r"(?<![\d.,])0 g", text), "null amount does not show 0 g")


def probe_foods_redirect(pg):
    response = pg.goto(BASE + "/foods", wait_until="networkidle")
    check(pg.url.rstrip("/").endswith("/explore"), f"/foods redirects to /explore (landed on {pg.url})")
    check(response is not None and response.status < 400, "/foods does not return an error")


def probe_date_label(pg):
    pg.goto(BASE + "/app", wait_until="networkidle")
    pg.wait_for_timeout(400)
    body = pg.inner_text("body")
    expected = f"Hôm nay {TODAY.day:02d}/{TODAY.month:02d}"
    check(expected in body, f"today's label reads '{expected}' (no comma)")
    check("Hôm nay," not in body, "no 'Hôm nay,' label with a comma")


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        phone = browser.new_page(viewport=PHONE)
        probe_micros_rows(phone)
        probe_open_from_row(phone, "390")
        probe_null_dash(phone)
        probe_foods_redirect(phone)
        probe_date_label(phone)
        phone.goto(BASE + "/micros", wait_until="networkidle")
        phone.screenshot(path=shot("cc2-01-micros-390.png"), full_page=False)

        desktop = browser.new_page(viewport=DESKTOP)
        probe_open_from_row(desktop, "1440")
        desktop.goto(BASE + "/micros", wait_until="networkidle")
        desktop.screenshot(path=shot("cc2-01-micros-1440.png"), full_page=False)
        browser.close()

    for line in notes:
        print(line)
    for line in problems:
        print("PROBLEM: " + line)
    print("cc2-01:", "no problems" if not problems else f"{len(problems)} problem(s)")
    sys.exit(1 if problems else 0)


if __name__ == "__main__":
    main()
