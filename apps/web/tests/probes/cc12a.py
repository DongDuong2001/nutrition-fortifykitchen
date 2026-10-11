"""cc-12a: Trends (ag-03) aligned with the profile, the runtime date, the kcal rule and the fonts.
Checks: the 7-day window ends today and the last bar says "nay"; the calcium target on /trends matches /micros;
no red bar for a day above the kcal range; /micros -> Xu hướng -> /trends -> back to /micros; Saira Condensed for
the title and the protein number, Manrope for body text. Screenshots: cc12a-trends-{390,1440}.png and
cc12a-micros-link-390.png.
Run with: ALIGN_BASE_URL=http://localhost:3101 npm run probe -- tests/probes/cc12a.py
"""
import datetime
import os
import re
import sys

from playwright.sync_api import sync_playwright

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3100")
SHOTS = os.path.join(os.path.dirname(__file__), "..", "..", ".screenshots")
PHONE = {"width": 390, "height": 844}
DESKTOP = {"width": 1440, "height": 900}
VN = datetime.timezone(datetime.timedelta(hours=7))
TODAY = datetime.datetime.now(VN).date()
KCAL_MAX = 2275
KCAL_MIN = 1950
problems = []
notes = []
os.makedirs(SHOTS, exist_ok=True)


def check(cond, msg):
    if cond:
        notes.append("ok: " + msg)
    else:
        problems.append(msg)


def body_text(pg):
    # innerText puts line breaks between flex spans, so collapse whitespace before matching copy
    return re.sub(r"\s+", " ", pg.inner_text("body"))


def visible(pg, selector):
    return pg.locator(selector + " >> visible=true").first


def open_trends(pg):
    pg.goto(BASE + "/trends", wait_until="networkidle")
    visible(pg, "#t-energy").wait_for(state="visible", timeout=8000)
    pg.wait_for_timeout(300)


def check_date_window(browser):
    context = browser.new_context(viewport=PHONE)
    pg = context.new_page()
    open_trends(pg)
    start = TODAY - datetime.timedelta(days=6)
    expected = f"{start.day:02d}–{TODAY.day:02d}/{TODAY.month:02d}"
    text = body_text(pg)
    check(expected in text, f"trends: 7-day window reads {expected} (today {TODAY})")
    check(f"{TODAY.day:02d} · nay" in text, "trends: last bar is labelled today (nay)")
    check(text.count("· nay") == 1, "trends: only the last day is labelled nay")
    context.close()


def check_calcium_target(browser):
    context = browser.new_context(viewport=PHONE)
    pg = context.new_page()
    open_trends(pg)
    trends_text = body_text(pg)
    check("Mục tiêu: 1.200 mg" in trends_text, "trends: calcium target reads 1.200 mg")
    pg.goto(BASE + "/micros", wait_until="networkidle")
    visible(pg, '[data-align-container="micros-page"]').wait_for(state="visible", timeout=8000)
    micros_text = body_text(pg)
    check("1.200–1.500 mg" in micros_text, "micros: calcium range is 1.200–1.500 mg (profile target)")
    context.close()


def check_no_red_above_range(browser):
    context = browser.new_context(viewport=PHONE)
    pg = context.new_page()
    open_trends(pg)
    bars = pg.evaluate(
        """() => [...document.querySelectorAll('[role="img"][aria-label^="Biểu đồ năng lượng"] [aria-label*="kcal,"]')]
            .map(el => ({
                label: el.getAttribute('aria-label'),
                bar: el.querySelector('div.rounded-t-md').className,
            }))"""
    )
    check(len(bars) > 0, f"trends: kcal bars found ({len(bars)})")
    for item in bars:
        kcal = int(re.search(r":\s*([\d.]+) kcal", item["label"]).group(1).replace(".", ""))
        is_red = "bg-destructive" in item["bar"]
        if kcal > KCAL_MAX:
            check(not is_red, f"trends: {item['label']} above the range is not red")
        if is_red:
            check(kcal < KCAL_MIN, f"trends: red bar only below the minimum ({item['label']})")
    context.close()


def check_nav(browser):
    context = browser.new_context(viewport=PHONE)
    pg = context.new_page()
    pg.goto(BASE + "/micros", wait_until="networkidle")
    link = pg.locator('a[href="/trends"] >> visible=true').first
    link.wait_for(state="visible", timeout=8000)
    link.click()
    pg.wait_for_url(re.compile(r".*/trends$"), timeout=8000)
    pg.wait_for_timeout(300)
    check(pg.url.endswith("/trends"), "nav: Xu hướng opens /trends")
    back = pg.locator('a[href="/micros"] >> visible=true').first
    back.click()
    pg.wait_for_url(re.compile(r".*/micros$"), timeout=8000)
    check(pg.url.endswith("/micros"), "nav: back returns to /micros")
    context.close()


def check_fonts(browser):
    context = browser.new_context(viewport=PHONE)
    pg = context.new_page()
    open_trends(pg)
    fonts = pg.evaluate(
        """() => {
            const title = [...document.querySelectorAll('div,h1,h2,p')]
                .find(e => e.childElementCount === 0 && e.textContent.trim() === 'XU HƯỚNG');
            const protein = document.getElementById('t-pro').parentElement.children[1];
            return {
                title: title ? getComputedStyle(title).fontFamily : null,
                protein: getComputedStyle(protein).fontFamily,
                body: getComputedStyle(document.body).fontFamily,
                heading: getComputedStyle(document.getElementById('t-energy')).fontFamily,
            };
        }"""
    )
    check(fonts["title"] is not None and "Saira" in fonts["title"], f"fonts: title is Saira ({fonts['title']})")
    check("Saira" in fonts["protein"], f"fonts: protein number is Saira ({fonts['protein']})")
    check("Manrope" in fonts["body"], f"fonts: body is Manrope ({fonts['body']})")
    check("Manrope" in fonts["heading"], f"fonts: section heading is Manrope ({fonts['heading']})")
    context.close()


def shots(browser):
    context = browser.new_context(viewport=PHONE)
    pg = context.new_page()
    open_trends(pg)
    pg.screenshot(path=os.path.join(SHOTS, "cc12a-trends-390.png"), full_page=True)
    pg.goto(BASE + "/micros", wait_until="networkidle")
    visible(pg, 'a[href="/trends"]').wait_for(state="visible", timeout=8000)
    pg.screenshot(path=os.path.join(SHOTS, "cc12a-micros-link-390.png"))
    context.close()
    context = browser.new_context(viewport=DESKTOP)
    pg = context.new_page()
    open_trends(pg)
    pg.screenshot(path=os.path.join(SHOTS, "cc12a-trends-1440.png"), full_page=True)
    context.close()


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        check_date_window(browser)
        check_calcium_target(browser)
        check_no_red_above_range(browser)
        check_nav(browser)
        check_fonts(browser)
        shots(browser)
        browser.close()
    for line in notes:
        print(line)
    print("PROBLEMS: none" if not problems else "PROBLEMS:")
    for line in problems:
        print("  -", line)
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
