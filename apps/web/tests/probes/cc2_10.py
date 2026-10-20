"""cc2-10: IA v2 step 2, Tổng quan sub-tabs and Hôm nay owns the day, at 390 and 1280.

- every Tổng quan sub-tab is reachable from the tab bar and is the only active one
- the period control: ‹ › and 7/30 change the numbers, › is disabled on the current period, the period stays across sub-tabs
- Năng lượng: the energy bars and the period control (cc2-31b: Tóm tắt is /trends, Năng lượng is /trends/energy)
- Hôm nay (/) opens /micros and /training with the date shown; back returns to /; past-day screens keep the date and are read-only
- Xóa bữa này deletes at once (cc-62: no confirm step) and Hoàn tác puts the meal back
- no ink band at the top of the window on desktop
Screenshots: .screenshots/cc2-10-*.png
Run with: ALIGN_BASE_URL=http://localhost:3102 npm run probe -- tests/probes/cc2_10.py
"""
# PROBE_COVERS: app/(app)/(dashboard)/training/** app/(app)/(tabs)/app/** app/(app)/(tabs)/trends/** app/(app)/(tabs)/trends/body/** app/(app)/(tabs)/trends/energy/** app/(app)/(tabs)/trends/micros/** app/(app)/add/** app/(app)/micros/** app/page.tsx
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
    return pg.locator(f'nav[aria-label="Tổng quan"] a:has-text("{label}") >> visible=true').first


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
    check(pg.locator('nav[aria-label="Tổng quan"]:visible').count() == 1, f"{size_name} overview: tab bar is visible")
    for label, route in SUBTABS:
        tab(pg, label).click()
        pg.wait_for_url(f"**{route}", timeout=8000) if route != "/app" else pg.wait_for_url(re.compile(r".*/app(\?.*)?$"), timeout=8000)
        pg.wait_for_timeout(500)
        check(path_of(pg) == route, f"{size_name} {label}: opens {route} (got {path_of(pg)})")
        current = pg.locator('nav[aria-label="Tổng quan"] a[aria-current="page"]:visible').all_inner_texts()
        check(current == [label], f"{size_name} {label}: it is the only active sub-tab ({current})")
        nav = pg.locator('nav[aria-label="Điều hướng chính"]:visible a[aria-current="page"]').all_inner_texts()
        check(any("Tổng quan" in t for t in nav), f"{size_name} {label}: Tổng quan is the active tab ({nav})")
        no_h_scroll(pg, f"{size_name} {label}")
        shot(pg, SLUGS[route], size_name)
        # the bottom nav and sidebar now carry the "Hôm nay" tab label on every screen, so leave them out
        nav_text = " ".join(pg.locator('nav[aria-label="Điều hướng chính"]:visible').first.inner_text().split())
        body = " ".join(text(pg).split()).replace(nav_text, "")
        check("Hôm nay" not in body or route == "/app", f"{size_name} {label}: no day lists or day controls")
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
            today_grey = "bg-secondary" in col["bar"] and not red
            continue
        if kcal > 2275:
            over += 1
            check("bg-cobalt" in col["bar"] and not red, f"{size_name} energy: {kcal} kcal above the target is on target")
        if red:
            check(kcal < 2275, f"{size_name} energy: red only below the target ({kcal})")
    check(over >= 1, f"{size_name} energy: a day above the target is shown ({over})")
    check(today_grey, f"{size_name} energy: today is grey, not red")
    pg.goto(BASE + "/trends/micros", wait_until="networkidle")
    pg.wait_for_timeout(400)
    check("mục tiêu 1.000 mg" in text(pg), f"{size_name} Vi chất: calcium shows its 1.000 mg target (cc-73b)")
    ctx.close()


def check_micros_tab(browser, size_name, size):
    ctx, pg = new_page(browser, size)
    go(pg, "/trends/micros")
    # Open every section so each nutrient row is in the DOM
    pg.evaluate("document.querySelectorAll('#mi-sections button[aria-expanded=\"false\"]').forEach(b => b.click())")
    pg.wait_for_timeout(500)
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


def check_home_rows(browser, size_name, size):
    """The Vi chất and Ngày tập links on Hôm nay open the day shown, and back returns to /."""
    ctx, pg = new_page(browser, size)
    go(pg, "/app")
    check(pg.locator("h1:visible").count() >= 1, f"{size_name} home: a visible h1")
    shot(pg, "home", size_name)
    no_h_scroll(pg, f"{size_name} home")
    if size_name == "1280":
        # No ink band stretching across the top of the window (the sidebar is ink but only 240 px wide)
        wide = pg.evaluate(
            """() => [...document.querySelectorAll('*')].filter(el => {
                const r = el.getBoundingClientRect();
                const bg = getComputedStyle(el).backgroundColor;
                return r.top < 40 && r.width > 600 && bg === 'rgb(17, 19, 23)';
            }).length"""
        )
        check(wide == 0, f"{size_name} home: no ink band at the top ({wide})")

    pg.locator('a:has-text("Đủ 22 vi chất"):visible').first.click()
    pg.wait_for_url(f"**/micros?date={TODAY}", timeout=8000)
    check(f"date={TODAY}" in pg.url, f"{size_name} home: Đủ 22 vi chất › opens /micros?date={TODAY}")
    pg.locator('a[aria-label="Quay lại"]:visible').first.click()
    pg.wait_for_url(re.compile(r".*/app(\?.*)?$"), timeout=8000)
    check(path_of(pg) == "/app", f"{size_name} micros: back returns to / (now {path_of(pg)})")
    pg.locator(f'a[href="/training?date={TODAY}"]:visible').first.click()
    pg.wait_for_url(f"**/training?date={TODAY}", timeout=8000)
    check(f"date={TODAY}" in pg.url, f"{size_name} home: the Ngày tập pill opens /training?date={TODAY}")
    owner = pg.locator('nav[aria-label="Điều hướng chính"]:visible a[aria-current="page"]').all_inner_texts()
    check(any("Hôm nay" in t for t in owner), f"{size_name} training: the owning tab is Hôm nay ({owner})")
    ctx.close()


def check_past_day(browser, size_name, size):
    ctx, pg = new_page(browser, size)
    go(pg, f"/app?date={YESTERDAY}")
    pg.wait_for_timeout(300)
    add = 'a[href^="/add"]:not(#mobile-add-fab):not(#desktop-add-btn):visible'
    check(pg.locator(add).count() == 0, f"{size_name} past home: no add link on a meal")
    check(pg.locator('a[aria-label^="Thêm vào"]:visible').count() == 0, f"{size_name} past home: no + on a meal")
    # ⋯ lives in meal mode: tap the header of a meal with food, then look for the pill
    with_food = pg.locator("button[aria-label^='Xem riêng']:visible", has_text="kcal")
    check(with_food.count() > 0, f"{size_name} past home: a meal with food is listed ({with_food.count()})")
    if with_food.count():
        with_food.first.click()
        pg.wait_for_timeout(300)
        check(pg.locator('button[aria-label^="Tùy chọn"]:visible').count() == 1,
              f"{size_name} past home: a meal with food keeps a ⋯ menu (Lưu thành Bữa ăn của tôi, cc2-12)")
    check(pg.locator(f'a[href="/micros?date={YESTERDAY}"]:visible').count() >= 1, f"{size_name} past home: Vi chất link keeps the date")
    pg.locator('button:has-text("Xem cả ngày"):visible').first.click()
    pg.wait_for_timeout(300)
    check(pg.locator(f'a[href="/training?date={YESTERDAY}"]:visible').count() == 1, f"{size_name} past home: Ngày tập link keeps the date")

    go(pg, f"/micros?date={YESTERDAY}")
    check("Chỉ xem" in text(pg) or "Hôm qua" in text(pg), f"{size_name} past micros: shows the date of the day")
    back = pg.locator('a[aria-label="Quay lại"]:visible').first.get_attribute("href")
    check(back == f"/app?date={YESTERDAY}", f"{size_name} past micros: back goes to /?date= ({back})")
    check(pg.locator(add).count() == 0, f"{size_name} past micros: no add link")
    check(pg.locator('a[href="/trends/micros"]:visible').count() >= 1, f"{size_name} micros: the trend link goes to /trends/micros")

    go(pg, f"/training?date={YESTERDAY}")
    chips = pg.locator('button[aria-pressed]:visible')
    disabled = [chips.nth(i).is_disabled() for i in range(chips.count())]
    check(len(disabled) >= 5 and all(disabled), f"{size_name} past training: duration chips are disabled ({len(disabled)})")
    check(pg.locator('input[type="checkbox"]:visible').count() == 0, f"{size_name} past training: no checklist to toggle")
    back = pg.locator('a[aria-label="Quay lại"]:visible').first.get_attribute("href")
    check(back == f"/app?date={YESTERDAY}", f"{size_name} past training: back goes to /?date= ({back})")
    shot(pg, "past-training", size_name)
    ctx.close()


def check_delete_meal(browser, size_name, size):
    """cc2-32: the meal ⋯ sheet lives on Hôm nay. Tap the breakfast header (meal mode), then the ⋯ pill."""
    ctx, pg = new_page(browser, size)
    go(pg, "/app")
    breakfast = pg.locator("section[aria-label='Bữa sáng']")
    before = re.sub(r"\s+", " ", breakfast.inner_text())
    check("459" in before, f"{size_name} delete: breakfast shows 459 kcal first ({before[:80]!r})")
    pg.locator("button[aria-label='Xem riêng bữa sáng']:visible").first.click()
    pg.wait_for_timeout(300)
    pg.locator("button[aria-label='Tùy chọn Bữa sáng']:visible").first.click()
    pg.wait_for_timeout(300)
    dialog = pg.locator('[role="dialog"]:visible').first
    check("Lưu thành Bữa ăn của tôi" in dialog.inner_text(), f"{size_name} delete: the menu has Lưu thành Bữa ăn của tôi")
    check(dialog.locator('button:has-text("Lưu thành Bữa ăn của tôi")').is_enabled(), f"{size_name} delete: Lưu thành Bữa ăn của tôi is enabled for a meal with food")
    dialog.locator('button:has-text("Xóa bữa này")').click()
    pg.wait_for_timeout(500)
    check("Xóa Bữa sáng?" not in text(pg), f"{size_name} delete: no confirm step (cc-62, undo instead)")
    check("Chưa ăn" in breakfast.inner_text(), f"{size_name} delete: breakfast is empty at once (Chưa ăn)")
    toast = pg.locator('button:has-text("Hoàn tác"):visible').first
    check(toast.count() == 1, f"{size_name} delete: the toast offers Hoàn tác")
    toast.click()
    pg.wait_for_timeout(500)
    check("459" in re.sub(r"\s+", " ", breakfast.inner_text()), f"{size_name} delete: Hoàn tác puts the meal back")
    # cc2-32: Hôm nay's hero shows the eaten total over the target ("1.041 / 2.275 kcal"), not the remainder
    check(re.search(r"1\.041\s*/\s*2\.275", text(pg)) is not None, f"{size_name} delete: the hero total is back to 1.041 eaten")
    ctx.close()


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for size_name, size in SIZES:
            check_subtabs(browser, size_name, size)
            check_period(browser, size_name, size)
            check_energy_bars(browser, size_name, size)
            check_micros_tab(browser, size_name, size)
            check_home_rows(browser, size_name, size)
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
