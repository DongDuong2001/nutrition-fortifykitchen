"""cc-12b: Trends counts a day above the max as on target (đạt colour, no over-limit), the calcium row shows its
range, and the kcal legend has three items. Checks: the over-range kcal bar uses the đạt token (bg-blue), never the
thiếu colour; the calcium row reads "Mục tiêu: 1.200–1.500 mg" (same as /micros); the legend lists exactly
"Trong mục tiêu", "Thiếu" and "Hôm nay (đang ghi)". Also re-checks the date window, nav and fonts.
Screenshots: cc12b-trends-390.png, cc12b-trends-1440.png.
Run with: ALIGN_BASE_URL=http://localhost:3101 npm run probe -- tests/probes/cc12b.py
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
LEGEND = ["Trong mục tiêu", "Thiếu", "Hôm nay (đang ghi)"]
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
    context.close()


def check_over_range_bar(browser):
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
    over = []
    for item in bars:
        kcal = int(re.search(r":\s*([\d.]+) kcal", item["label"]).group(1).replace(".", ""))
        is_red = "bg-destructive" in item["bar"]
        if kcal > KCAL_MAX:
            over.append(item)
            check("bg-blue" in item["bar"] and not is_red,
                  f"trends: over-range bar uses the đạt colour ({item['label']})")
            check("trong mục tiêu" in item["label"],
                  f"trends: over-range bar is labelled on target ({item['label']})")
        if is_red:
            check(kcal < KCAL_MIN, f"trends: red bar only below the minimum ({item['label']})")
    check(len(over) >= 1, f"trends: an over-range day is shown ({len(over)} bar(s) above {KCAL_MAX})")
    context.close()


def check_calcium_range(browser):
    context = browser.new_context(viewport=PHONE)
    pg = context.new_page()
    open_trends(pg)
    trends_text = body_text(pg)
    check("Mục tiêu: 1.200–1.500 mg" in trends_text, "trends: calcium row shows 1.200–1.500 mg")
    pg.goto(BASE + "/micros", wait_until="networkidle")
    visible(pg, '[data-align-container="micros-page"]').wait_for(state="visible", timeout=8000)
    check("1.200–1.500 mg" in body_text(pg), "micros: calcium range is 1.200–1.500 mg (same as Trends)")
    context.close()


def check_legend(browser):
    context = browser.new_context(viewport=PHONE)
    pg = context.new_page()
    open_trends(pg)
    items = pg.evaluate(
        """() => {
            const section = document.getElementById('t-energy').closest('section');
            return [...section.querySelectorAll('span.inline-flex')].map(s => s.textContent.trim());
        }"""
    )
    check(items == LEGEND, f"trends: kcal legend has the three items {LEGEND} (found {items})")
    context.close()


def check_nav(browser):
    context = browser.new_context(viewport=PHONE)
    pg = context.new_page()
    pg.goto(BASE + "/micros", wait_until="networkidle")
    link = pg.locator('a[href="/trends"] >> visible=true').first
    link.wait_for(state="visible", timeout=8000)
    link.click()
    pg.wait_for_url(re.compile(r".*/trends$"), timeout=8000)
    check(pg.url.endswith("/trends"), "nav: Xu hướng opens /trends")
    pg.locator('[aria-label="Quay lại"]:visible').first.click()
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
            };
        }"""
    )
    check(fonts["title"] is not None and "Saira" in fonts["title"], f"fonts: title is Saira ({fonts['title']})")
    check("Saira" in fonts["protein"], "fonts: protein number is Saira")
    check("Manrope" in fonts["body"], "fonts: body is Manrope")
    context.close()


def shots(browser):
    for viewport, label in [(PHONE, "390"), (DESKTOP, "1440")]:
        context = browser.new_context(viewport=viewport)
        pg = context.new_page()
        open_trends(pg)
        pg.screenshot(path=os.path.join(SHOTS, f"cc12b-trends-{label}.png"), full_page=True)
        context.close()


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        check_date_window(browser)
        check_over_range_bar(browser)
        check_calcium_range(browser)
        check_legend(browser)
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
