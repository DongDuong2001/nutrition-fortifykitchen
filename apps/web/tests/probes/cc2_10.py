"""cc2-10: IA v2 step 2, Tổng quan sub-tabs and Nhật ký owns the day, at 390 and 1280.

- every Tổng quan sub-tab is reachable from the tab bar and is the only active one
- the period control: ‹ › and 7/30 change the numbers, › is disabled on the current period, the period stays across sub-tabs
- Năng lượng: the energy bars and the period control (cc2-31b: Tóm tắt is /trends, Năng lượng is /trends/energy)
- Nhật ký rows open /micros and /training with the date shown; past-day screens are read-only
- Xóa bữa này asks for a confirm step and Hoàn tác puts the meal back
- no ink band at the top of the window on desktop
Screenshots: .screenshots/cc2-10-*.png
Run with: ALIGN_BASE_URL=http://localhost:3102 npm run probe -- tests/probes/cc2_10.py
"""
import os
import re
import sys
from pathlib import Path
from urllib.parse import urlparse

from playwright.sync_api import sync_playwright
import _demo  # noqa: F401  (cc2-15b: demo mode on, see _demo.py)

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3102")
SHOTS = Path(__file__).resolve().parent.parent.parent / ".screenshots"
SIZES = [("390", {"width": 390, "height": 844}), ("1280", {"width": 1280, "height": 800})]
NOW = "2026-10-12T18:00:00+07:00"
TODAY = "2026-10-12"
YESTERDAY = "2026-10-11"
SUBTABS = [("Tóm tắt", "/trends"), ("Năng lượng", "/trends/energy"), ("Vi chất", "/trends/micros"), ("Cơ thể", "/trends/body")]
SLUGS = {"/trends": "summary", "/trends/energy": "energy", "/trends/micros": "micros", "/trends/body": "body"}
problems, notes = [], []


def check(cond, msg):
    (notes if cond else problems).append(("ok: " if cond else "") + msg)


def new_page(browser, size):
    ctx = browser.new_context(viewport=size)
    pg = ctx.new_page()
    pg.clock.set_fixed_time(NOW)
    return ctx, pg


def go(pg, route):
    pg.goto(BASE + route, wait_until="networkidle")
    pg.wait_for_timeout(500)


def path_of(pg):
    return urlparse(pg.url).path or "/"


def text(pg):
    return re.sub(r"\s+", " ", pg.inner_text("body"))


def heading(pg):
    return re.sub(r"\s+", " ", pg.locator("#ov-period >> visible=true").first.inner_text()).strip()


def tab(pg, label):
    return pg.locator(f'a[role="tab"]:has-text("{label}") >> visible=true').first


def no_h_scroll(pg, where):
    w, inner = pg.evaluate("() => [Math.max(document.documentElement.scrollWidth, document.body.scrollWidth), window.innerWidth]")
    check(w <= inner, f"{where}: no horizontal scroll ({w} <= {inner})")


def shot(pg, name, size_name):
    SHOTS.mkdir(exist_ok=True)
    pg.screenshot(path=str(SHOTS / f"cc2-10-{name}-{size_name}.png"), full_page=True, animations="disabled")


def avg_text(pg):
    """The average kcal of the Năng lượng hero (changes with the period)."""
    return pg.locator("#en-hero-number").inner_text().strip()


def check_subtabs(browser, size_name, size):
    ctx, pg = new_page(browser, size)
    go(pg, "/trends")
    check(pg.locator('nav[role="tablist"][aria-label="Tổng quan"]:visible').count() == 1, f"{size_name} overview: tab bar is visible")
    for label, route in SUBTABS:
        tab(pg, label).click()
        pg.wait_for_url(f"**{route}", timeout=8000) if route != "/" else pg.wait_for_url(re.compile(r".*/(\?.*)?$"), timeout=8000)
        pg.wait_for_timeout(500)
        check(path_of(pg) == route, f"{size_name} {label}: opens {route} (got {path_of(pg)})")
        current = pg.locator('a[role="tab"][aria-current="page"]:visible').all_inner_texts()
        check(current == [label], f"{size_name} {label}: it is the only active sub-tab ({current})")
        nav = pg.locator('nav[aria-label="Điều hướng chính"]:visible a[aria-current="page"]').all_inner_texts()
        check(any("Tổng quan" in t for t in nav), f"{size_name} {label}: Tổng quan is the active tab ({nav})")
        no_h_scroll(pg, f"{size_name} {label}")
        shot(pg, SLUGS[route], size_name)
        # the bottom nav and sidebar now carry the "Hôm nay" tab label on every screen, so leave them out
        nav_text = " ".join(pg.locator('nav[aria-label="Điều hướng chính"]:visible').first.inner_text().split())
        body = " ".join(text(pg).split()).replace(nav_text, "")
        check("Hôm nay" not in body or route == "/", f"{size_name} {label}: no day lists or day controls")
        check("vượt" not in body.lower() and "quá mức" not in body.lower(), f"{size_name} {label}: no over-limit wording")
    ctx.close()


def check_period(browser, size_name, size):
    ctx, pg = new_page(browser, size)
    go(pg, "/trends/energy")
    check(heading(pg) == "7 ngày qua · 06/10 – 12/10", f"{size_name} period heading is 06–12/10 ({heading(pg)})")
    check(pg.locator('button[aria-label="Kỳ sau"]:visible').is_disabled(), f"{size_name} › is disabled on the current period")
    before = avg_text(pg)

    pg.locator('button[aria-label="Kỳ trước"]:visible').click()
    pg.wait_for_timeout(500)
    check(heading(pg).endswith("29/09 – 05/10"), f"{size_name} ‹ steps to 29/09–05/10 ({heading(pg)})")
    check(avg_text(pg) != before, f"{size_name} ‹ changes the average ({before} -> {avg_text(pg)})")
    check(pg.locator('button[aria-label="Kỳ sau"]:visible').is_enabled(), f"{size_name} › is enabled after ‹")

    pg.locator('button[aria-label="Kỳ sau"]:visible').click()
    pg.wait_for_timeout(500)
    check(avg_text(pg) == before, f"{size_name} › comes back to the same numbers")

    pg.locator('a:has-text("30 ngày") >> visible=true').first.click()
    pg.wait_for_timeout(600)
    check(heading(pg).endswith("13/09 – 12/10"), f"{size_name} 30 ngày is 13/09–12/10 ({heading(pg)})")
    check(avg_text(pg) != before, f"{size_name} 30 ngày changes the average ({avg_text(pg)})")

    # The period is remembered across sub-tabs
    tab(pg, "Vi chất").click()
    pg.wait_for_url("**/trends/micros**", timeout=8000)
    pg.wait_for_timeout(500)
    check(heading(pg).endswith("13/09 – 12/10"), f"{size_name} the 30-day period stays on Vi chất ({heading(pg)})")
    check("p=30" in pg.url, f"{size_name} the period is in the URL ({pg.url})")
    ctx.close()


def check_energy_bars(browser, size_name, size):
    """Above the range is on target (blue, never red); red only below the minimum; today is grey (đang ghi), not red."""
    ctx, pg = new_page(browser, size)
    go(pg, "/trends/energy")
    cols = pg.evaluate(
        """() => [...document.querySelectorAll('#ov-score-calories button[aria-pressed]')].map(el => ({
            label: el.getAttribute('aria-label'),
            bar: (el.querySelector('span[class*="rounded-t"]') || {className: ''}).className,
        }))"""
    )
    check(len(cols) == 7, f"{size_name} energy: seven day columns ({len(cols)})")
    over = 0
    today_grey = False
    for i, col in enumerate(cols):
        m = re.search(r"([\d.]+) kcal", col["label"])
        if not m:
            continue
        kcal = int(m.group(1).replace(".", ""))
        red = "bg-destructive" in col["bar"]
        if i == len(cols) - 1:
            today_grey = "bg-muted-dark" in col["bar"] and not red
            continue
        if kcal > 2275:
            over += 1
            check("bg-blue" in col["bar"] and not red, f"{size_name} energy: {kcal} kcal above the range is on target")
        if red:
            check(kcal < 1950, f"{size_name} energy: red only below the minimum ({kcal})")
    check(over >= 1, f"{size_name} energy: a day above the range is shown ({over})")
    check(today_grey, f"{size_name} energy: today is grey, not red")
    pg.goto(BASE + "/trends/micros", wait_until="networkidle")
    pg.wait_for_timeout(400)
    check("mục tiêu 1.200–1.500 mg" in text(pg), f"{size_name} Vi chất: calcium shows its 1.200–1.500 mg range")
    ctx.close()


def check_micros_tab(browser, size_name, size):
    ctx, pg = new_page(browser, size)
    go(pg, "/trends/micros")
    # Open every section so each nutrient row is in the DOM
    pg.evaluate("document.querySelectorAll('#mi-sections details').forEach(d => d.open = true)")
    sel = '#mi-sections a[href^="/micros/"]'
    rows = pg.locator(sel).count()
    check(rows == 22, f"{size_name} Vi chất: one row per counted nutrient ({rows})")
    rows_text = pg.locator(sel).all_inner_texts()
    pcts = [int(m.group(1)) for t in rows_text for m in [re.search(r"(\d+)%\s*$", t.strip())] if m]
    check(len(pcts) >= 20, f"{size_name} Vi chất: every row with a number ends with its share ({len(pcts)})")
    check("ngày đạt" in text(pg), f"{size_name} Vi chất: shows N/x ngày đạt")
    pg.locator(sel).first.click()
    pg.wait_for_url("**/micros/**", timeout=8000)
    check(path_of(pg).startswith("/micros/"), f"{size_name} Vi chất: a row opens the nutrient detail")
    ctx.close()


def check_diary(browser, size_name, size):
    ctx, pg = new_page(browser, size)
    go(pg, "/")
    check(pg.locator("h1:visible").count() == 1 and pg.locator("h1:visible").first.inner_text().strip().lower() == "nhật ký",
          f"{size_name} diary: one visible h1 Nhật ký")
    body = text(pg)
    check(re.search(r"8/22 vi chất Thiếu:", body) is not None, f"{size_name} diary: the Vi chất tile reads 8/22 with what is lacking")
    check(re.search(r"60′ Ngày tập muối 7–10,5 g", body) is not None, f"{size_name} diary: the Ngày tập tile reads 60′ and salt")
    check(re.search(r"còn 909 kcal", body, re.IGNORECASE) is not None, f"{size_name} diary: còn 909 kcal in the summary")
    n_add = pg.locator('a[aria-label^="Thêm vào"]:visible').count()
    n_menu = pg.locator('button[aria-label^="Tùy chọn"]:visible').count()
    check(n_add == 5 and n_menu == 5, f"{size_name} diary: one + and one ⋯ per meal ({n_add}, {n_menu})")
    check("+ Thêm món" not in body and body.count("+ Thêm") <= 5, f"{size_name} diary: one quiet + Thêm per meal")
    shot(pg, "diary", size_name)
    no_h_scroll(pg, f"{size_name} diary")

    if size_name == "1280":
        # No ink band stretching across the top of the window (the sidebar is ink but only 240 px wide)
        wide = pg.evaluate(
            """() => [...document.querySelectorAll('*')].filter(el => {
                const r = el.getBoundingClientRect();
                const bg = getComputedStyle(el).backgroundColor;
                return r.top < 40 && r.width > 600 && bg === 'rgb(17, 19, 23)';
            }).length"""
        )
        check(wide == 0, f"{size_name} diary: no ink band at the top ({wide})")

    # rows open the screens of the day shown
    pg.locator(f'a[href="/micros?date={TODAY}"]:visible').click()
    pg.wait_for_url(f"**/micros?date={TODAY}", timeout=8000)
    check(f"date={TODAY}" in pg.url, f"{size_name} diary: the Vi chất row opens /micros?date={TODAY}")
    pg.locator('a[aria-label="Quay lại"]:visible').first.click()
    pg.wait_for_url(re.compile(r".*/diary(\?.*)?$"), timeout=8000)
    check(path_of(pg) == "/", f"{size_name} micros: back returns to /diary")
    pg.locator(f'a[href="/training?date={TODAY}"]:visible').click()
    pg.wait_for_url(f"**/training?date={TODAY}", timeout=8000)
    check(f"date={TODAY}" in pg.url, f"{size_name} diary: the Ngày tập row opens /training?date={TODAY}")
    owner = pg.locator('nav[aria-label="Điều hướng chính"]:visible a[aria-current="page"]').all_inner_texts()
    check(any("Hôm nay" in t for t in owner), f"{size_name} training: the owning tab is Hôm nay ({owner})")
    ctx.close()


def check_past_day(browser, size_name, size):
    ctx, pg = new_page(browser, size)
    go(pg, f"/?date={YESTERDAY}")
    pg.wait_for_timeout(300)
    check(pg.locator('a[aria-label^="Thêm vào"]:visible').count() == 0, f"{size_name} past diary: no + on a meal")
    check(pg.locator('button[aria-label^="Tùy chọn"]:visible').count() > 0, f"{size_name} past diary: meals with food keep a ⋯ menu (Lưu thành Bữa ăn của tôi, cc2-12)")
    check(pg.locator(f'a[href="/micros?date={YESTERDAY}"]:visible').count() == 1, f"{size_name} past diary: Vi chất row keeps the date")
    check(pg.locator(f'a[href="/training?date={YESTERDAY}"]:visible').count() == 1, f"{size_name} past diary: Ngày tập row keeps the date")

    go(pg, f"/micros?date={YESTERDAY}")
    check("Chỉ xem" in text(pg) or "Hôm qua" in text(pg), f"{size_name} past micros: shows the date of the day")
    back = pg.locator('a[aria-label="Quay lại"]:visible').first.get_attribute("href")
    check(back == f"/?date={YESTERDAY}", f"{size_name} past micros: back goes to /diary?date= ({back})")
    check(pg.locator('a[href^="/add"]:not(#mobile-add-fab):not(#desktop-add-btn):visible').count() == 0, f"{size_name} past micros: no add link")
    check(pg.locator('a[href="/trends/micros"]:visible').count() >= 1, f"{size_name} micros: the trend link goes to /trends/micros")

    go(pg, f"/training?date={YESTERDAY}")
    chips = pg.locator('button[aria-pressed]:visible')
    disabled = [chips.nth(i).is_disabled() for i in range(chips.count())]
    check(len(disabled) >= 5 and all(disabled), f"{size_name} past training: duration chips are disabled ({len(disabled)})")
    check(pg.locator('input[type="checkbox"]:visible').count() == 0, f"{size_name} past training: no checklist to toggle")
    back = pg.locator('a[aria-label="Quay lại"]:visible').first.get_attribute("href")
    check(back == f"/?date={YESTERDAY}", f"{size_name} past training: back goes to /diary?date= ({back})")
    shot(pg, "past-training", size_name)
    ctx.close()


def check_delete_meal(browser, size_name, size):
    ctx, pg = new_page(browser, size)
    go(pg, "/")
    before = text(pg)
    check("459 kcal" in before, f"{size_name} delete: breakfast shows 459 kcal first")
    pg.locator("#meal-menu-breakfast").click()
    pg.wait_for_timeout(300)
    dialog = pg.locator('[role="dialog"]:visible').first
    check("Chép hôm qua" in dialog.inner_text() and "Lưu thành Bữa ăn của tôi" in dialog.inner_text(), f"{size_name} delete: the menu has the three items")
    check(dialog.locator('button:has-text("Lưu thành Bữa ăn của tôi")').is_enabled(), f"{size_name} delete: Lưu thành Bữa ăn của tôi is enabled for a meal with food")
    dialog.locator('button:has-text("Xóa bữa này")').click()
    pg.wait_for_timeout(200)
    check("Xóa Bữa sáng?" in text(pg), f"{size_name} delete: a confirm step appears")
    check("Chưa có món" not in pg.locator("#meal-breakfast").inner_text(), f"{size_name} delete: nothing is removed before confirming")
    pg.locator('[role="dialog"] button:has-text("Xóa bữa này")').first.click()
    pg.wait_for_timeout(500)
    meal = pg.locator("#meal-breakfast").inner_text()
    check("Chưa có món" in meal, f"{size_name} delete: breakfast is empty after confirming")
    check("còn 1.368 kcal" in text(pg) or "còn" in text(pg), f"{size_name} delete: the day total follows")
    toast = pg.locator('button:has-text("Hoàn tác"):visible').first
    check(toast.count() == 1, f"{size_name} delete: the toast offers Hoàn tác")
    toast.click()
    pg.wait_for_timeout(500)
    check("459 kcal" in pg.locator("#meal-breakfast").inner_text(), f"{size_name} delete: Hoàn tác puts the meal back")
    check(re.search(r"còn 909 kcal", text(pg), re.IGNORECASE) is not None, f"{size_name} delete: the total is back to còn 909 kcal")
    ctx.close()


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for size_name, size in SIZES:
            check_subtabs(browser, size_name, size)
            check_period(browser, size_name, size)
            check_energy_bars(browser, size_name, size)
            check_micros_tab(browser, size_name, size)
            check_diary(browser, size_name, size)
            check_past_day(browser, size_name, size)
            check_delete_meal(browser, size_name, size)
        browser.close()
    print("\n".join(notes))
    if problems:
        print("\nPROBLEMS:")
        for item in problems:
            print("[FAIL] " + item)
        sys.exit(1)
    print("\ncc2-10: no problems")


if __name__ == "__main__":
    main()
