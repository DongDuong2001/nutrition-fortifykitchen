"""cc2-07: IA v2 navigation shell, at 390 and 1280.

- each tab (Hôm nay, Tổng quan, Khám phá, Cài đặt) is reachable from the nav and is the only active item
- pushed screens (/micros, /micros/calcium, /training, /trends, /foods/[id], /settings/profile) highlight their owning tab
- [+] (phone) / "Thêm món" (sidebar) opens the add sheet from every tab and closing returns to that tab
- old URLs redirect permanently and keep the query string
- back from /micros, /trends and /training returns to the previous page; a direct link falls back to the owning tab
- no horizontal scroll on any visited route
Screenshots: .screenshots/cc2-07-*.png
Run with: ALIGN_BASE_URL=http://localhost:3102 npm run probe -- tests/probes/cc2_07.py
"""
# PROBE_COVERS: app/(app)/(dashboard)/training/** app/(app)/(tabs)/app/** app/(app)/(tabs)/explore/** app/(app)/(tabs)/settings/** app/(app)/(tabs)/trends/** app/(app)/(tabs)/trends/body/** app/(app)/(tabs)/trends/micros/** app/(app)/add/** app/(app)/foods/[id]/** app/(app)/foods/new/** app/(app)/micros/** app/(app)/micros/[nutrient]/** app/(app)/settings/profile/** app/(app)/settings/profile/weight/** app/(app)/setup/profile/** app/page.tsx
import os
import sys
from datetime import date, timedelta
from pathlib import Path
from urllib.parse import urlparse

from playwright.sync_api import sync_playwright
import _demo  # noqa: F401  (cc2-15b: demo mode on, see _demo.py)

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3102")
SHOTS = Path(__file__).resolve().parent.parent.parent / ".screenshots"
SIZES = [("390", {"width": 390, "height": 844}), ("1280", {"width": 1280, "height": 800})]
TABS = [("Hôm nay", "/app"), ("Tổng quan", "/trends"), ("Khám phá", "/explore"), ("Cài đặt", "/settings")]
SLUGS = {"Hôm nay": "today", "Tổng quan": "overview", "Khám phá": "explore", "Cài đặt": "settings"}
NAV = 'nav[aria-label="Điều hướng chính"]:visible'
YESTERDAY = (date.today() - timedelta(days=1)).isoformat()
problems, notes = [], []


def check(cond, msg):
    (notes if cond else problems).append(("ok: " if cond else "") + msg)


def path_of(pg):
    return urlparse(pg.url).path or "/"


def settle(pg, ms=500):
    pg.wait_for_load_state("networkidle")
    pg.wait_for_timeout(ms)


def go(pg, route):
    pg.goto(BASE + route, wait_until="networkidle")
    pg.wait_for_timeout(500)


def active_tabs(pg):
    """Labels of the nav items marked aria-current=page in the visible nav."""
    return pg.locator(f'{NAV} a[aria-current="page"]').all_inner_texts()


def no_h_scroll(pg, where):
    scroll_w, inner_w = pg.evaluate(
        "() => [Math.max(document.documentElement.scrollWidth, document.body.scrollWidth), window.innerWidth]"
    )
    check(scroll_w <= inner_w, f"{where}: no horizontal scroll ({scroll_w} <= {inner_w})")


def add_control(pg, name):
    if name == "390":
        return pg.locator("#mobile-add-fab >> visible=true")
    return pg.locator("#desktop-add-btn >> visible=true")


def back_button(pg):
    # Phone: icon button with aria-label. Desktop: text button above the title.
    return pg.locator('[aria-label="Quay lại"]:visible, button:has-text("Quay lại"):visible')


def probe_tabs(pg, name):
    go(pg, "/app")
    nav = pg.locator(NAV)
    check(nav.count() == 1, f"{name}: one visible main nav (found {nav.count()})")
    labels = [t.strip() for t in pg.locator(f"{NAV} a").all_inner_texts() if t.strip()]
    check(labels == [t for t, _ in TABS], f"{name}: nav lists {', '.join(t for t, _ in TABS)} in order (got {labels})")
    for label, route in TABS:
        go(pg, "/app")
        pg.locator(f'{NAV} a:has-text("{label}")').first.click()
        pg.wait_for_url(lambda u, r=route: (urlparse(u).path or "/") == r, timeout=8000)
        settle(pg)
        actives = [a.strip() for a in active_tabs(pg)]
        check(actives == [label], f"{name}: {route} has only '{label}' active (got {actives})")
        no_h_scroll(pg, f"{name} {route}")
        h = pg.locator("nav[aria-label='Điều hướng chính'] a:visible").evaluate_all(
            "els => els.map(e => e.getBoundingClientRect().height)"
        )
        check(all(x >= 44 for x in h), f"{name}: every nav link is at least 44 px tall ({min(h) if h else 0:.0f})")
        shot = "cc2-07-nav-390" if name == "390" else "cc2-07-sidebar-1280"
        pg.screenshot(path=str(SHOTS / f"{shot}-{SLUGS[label]}.png"))


def probe_owner(pg, name):
    owners = [
        ("/micros", "Hôm nay"),
        ("/micros/calcium", "Hôm nay"),
        ("/training", "Hôm nay"),
        ("/trends", "Tổng quan"),
        ("/trends/micros", "Tổng quan"),
        ("/trends/body", "Tổng quan"),
        ("/foods/food-cha-la", "Khám phá"),
        ("/foods/new", "Khám phá"),
        ("/settings/profile", "Cài đặt"),
    ]
    for route, label in owners:
        go(pg, route)
        actives = [a.strip() for a in active_tabs(pg)]
        check(actives == [label], f"{name}: {route} highlights '{label}' (got {actives})")
        no_h_scroll(pg, f"{name} {route}")


def probe_add(pg, name):
    for label, route in TABS:
        go(pg, route)
        ctl = add_control(pg, name)
        check(ctl.count() == 1, f"{name}: {route} has one add control")
        if ctl.count() != 1:
            continue
        ctl.first.click()
        pg.wait_for_url(lambda u: path_of_url(u) == "/add", timeout=8000)
        settle(pg)
        dialog = pg.locator('[role="dialog"] >> visible=true')
        check(dialog.count() >= 1, f"{name}: [+] on {route} opens the add sheet")
        check("Thêm vào:" in pg.inner_text("body"), f"{name}: the sheet names the meal ('Thêm vào:')")
        pg.locator('button[aria-label="Đóng"] >> visible=true').first.click()
        pg.wait_for_url(lambda u, r=route: path_of_url(u) == r, timeout=8000)
        check(path_of(pg) == route, f"{name}: closing the sheet returns to {route} (now {path_of(pg)})")


def path_of_url(u):
    return urlparse(u).path or "/"


def probe_redirects(pg, name):
    cases = [
        (f"/today?date={YESTERDAY}", "/app", f"date={YESTERDAY}"),
        ("/today", "/app", ""),
        ("/profile", "/settings/profile", ""),
        ("/profile/weight", "/settings/profile/weight", ""),
        ("/foods", "/explore", ""),
    ]
    for src, dest, query in cases:
        resp = pg.goto(BASE + src, wait_until="networkidle")
        landed = urlparse(pg.url)
        check(landed.path == dest, f"{name}: {src} lands on {dest} (got {landed.path})")
        if query:
            check(query in landed.query, f"{name}: {src} keeps ?{query} (got ?{landed.query})")
        first = resp.request
        while first.redirected_from:
            first = first.redirected_from
        status = first.response().status if first.response() else None
        check(status == 308, f"{name}: {src} is a permanent redirect (status {status})")
    # A past day stays read-only on /diary
    go(pg, f"/app?date={YESTERDAY}")
    # cc2-32: Hôm nay marks a past day read-only with "Chỉ xem" in its header (the diary's "Đang xem ngày cũ" is gone)
    if name == "1280":
        check("Chỉ xem" in pg.inner_text("body"), f"{name}: /?date=<past> shows the read-only past day (Chỉ xem)")
    else:  # the phone header has no "Chỉ xem"; read-only shows as no add links on the past day
        check(pg.locator("a[aria-label^='Thêm vào']").count() == 0, f"{name}: /?date=<past> has no add links (read-only)")
    # A past ?date= on /add goes to that day's diary
    pg.goto(BASE + f"/add?date={YESTERDAY}", wait_until="networkidle")
    pg.wait_for_timeout(500)
    check(
        path_of(pg) == "/app" and f"date={YESTERDAY}" in pg.url,
        f"{name}: /add?date=<past> goes to /diary?date=<past> (got {pg.url})",
    )


def open_micros_from_diary(pg, name):
    # Nhật ký owns the day: its Vi chất row opens /micros?date=<today>
    pg.locator('a[href^="/micros?date="] >> visible=true').first.click()
    pg.wait_for_url(lambda u: path_of_url(u) == "/micros", timeout=8000)
    settle(pg)


def probe_back(pg, name):
    go(pg, "/app")
    open_micros_from_diary(pg, name)
    btn = back_button(pg)
    check(btn.count() == 1, f"{name}: /micros has one back control (found {btn.count()})")
    if name == "390":
        pg.screenshot(path=str(SHOTS / "cc2-07-micros-390.png"))
    btn.first.click()
    pg.wait_for_url(lambda u: path_of_url(u) == "/app", timeout=8000)
    check(path_of(pg) == "/app", f"{name}: back from /micros returns to /diary (now {path_of(pg)})")

    # /diary -> /training -> back -> /diary
    go(pg, "/app")
    pg.locator('a[href^="/training?date="] >> visible=true').first.click()
    pg.wait_for_url(lambda u: path_of_url(u) == "/training", timeout=8000)
    settle(pg)
    btn = back_button(pg)
    check(btn.count() == 1, f"{name}: /training has one back control (found {btn.count()})")
    btn.first.click()
    pg.wait_for_url(lambda u: path_of_url(u) == "/app", timeout=8000)
    check(path_of(pg) == "/app", f"{name}: back from /training returns to /diary (now {path_of(pg)})")

    # Tổng quan sub-tabs are tabs: no back control
    go(pg, "/trends")
    check(back_button(pg).count() == 0, f"{name}: /trends is a tab screen with no back control")

    # Direct link: no in-app history, so back goes to the owning tab
    for route, owner in (("/micros", "/app"), ("/training", "/app"), ("/micros/calcium", "/micros")):
        go(pg, route)
        btn = back_button(pg)
        if btn.count() != 1:
            check(False, f"{name}: {route} direct: one back control (found {btn.count()})")
            continue
        btn.first.click()
        pg.wait_for_url(lambda u, o=owner: path_of_url(u) == o, timeout=8000)
        check(path_of(pg) == owner, f"{name}: back from {route} (direct link) goes to {owner} (now {path_of(pg)})")


def probe_explore(pg, name):
    go(pg, "/explore")
    h1 = pg.locator("h1 >> visible=true")
    check(h1.count() == 1 and "KHÁM PHÁ" in h1.first.inner_text().upper(), f"{name}: /explore shows the Khám phá heading")
    check(pg.locator('input[type="search"] >> visible=true').count() == 1, f"{name}: /explore has the food search")
    # V3: a phone shows the Nhóm món grid, from 1024 px the category chips take its place
    chips = pg.locator('[aria-label="Lọc món theo nhóm"] button >> visible=true').count()
    groups = pg.locator('nav[aria-label="Nhóm món"] a >> visible=true').count()
    if name == "390":
        check(groups >= 11, f"{name}: /explore shows the Nhóm món groups ({groups})")
    else:
        check(chips >= 3, f"{name}: /explore shows the category chips ({chips})")
    pg.locator('input[type="search"] >> visible=true').fill("trứng")
    pg.wait_for_timeout(300)
    rows = pg.locator("[data-food-row] >> visible=true")
    check(rows.count() >= 1, f"{name}: searching 'trứng' lists foods ({rows.count()})")
    rows.first.click()
    pg.wait_for_url(lambda u: path_of_url(u).startswith("/foods/"), timeout=8000)
    check(path_of(pg).startswith("/foods/"), f"{name}: tapping a food opens its detail ({path_of(pg)})")
    check(active_tabs(pg) and active_tabs(pg)[0].strip() == "Khám phá", f"{name}: food detail keeps Khám phá active")
    back_button(pg).first.click()
    pg.wait_for_url(lambda u: path_of_url(u) == "/explore", timeout=8000)
    check(path_of(pg) == "/explore", f"{name}: back from the food detail returns to /explore (now {path_of(pg)})")
    no_h_scroll(pg, f"{name} /explore")
    if name == "390":
        pg.screenshot(path=str(SHOTS / "cc2-07-explore-390.png"))
    else:
        pg.screenshot(path=str(SHOTS / "cc2-07-explore-1280.png"))


def probe_settings(pg, name):
    go(pg, "/settings")
    txt = " ".join(pg.inner_text("body").split())
    check("Hồ sơ của bạn" in txt and "Mục tiêu mỗi ngày" in txt, f"{name}: /settings shows the Cài đặt content (IA v2)")
    go(pg, "/settings/profile")
    txt = " ".join(pg.inner_text("body").split())
    check("Cân nặng" in txt and "Năm sinh" in txt, f"{name}: /settings/profile shows the Hồ sơ content")
    go(pg, "/settings/profile/weight")
    check(pg.locator("#weight-input").count() == 1, f"{name}: /settings/profile/weight shows the weight form")


def probe_setup(browser):
    ctx = browser.new_context(viewport={"width": 390, "height": 844})
    pg = ctx.new_page()
    go(pg, "/setup/profile")
    pg.locator("#setup-display-name").fill("Học viên A")
    pg.get_by_role("button", name="Tiếp tục").click()
    pg.wait_for_url("**/setup/goal", timeout=8000)
    pg.get_by_role("button", name="Hoàn tất").click()
    pg.wait_for_url("**/setup/done", timeout=8000)
    pg.get_by_role("link", name="Để sau").click()
    pg.wait_for_url(lambda u: path_of_url(u) == "/app", timeout=8000)
    check(path_of(pg) == "/app", "390: finishing setup lands on /")
    ctx.close()


def main():
    SHOTS.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for name, size in SIZES:
            ctx = browser.new_context(viewport=size)
            pg = ctx.new_page()
            errors = []
            pg.on("pageerror", lambda e: errors.append(str(e)))
            for probe in (probe_tabs, probe_owner, probe_add, probe_redirects, probe_back, probe_explore, probe_settings):
                try:
                    probe(pg, name)
                except Exception as err:  # a missing control must show up as a failed check, not a crash
                    check(False, f"{name}: {probe.__name__} stopped: {str(err).splitlines()[0][:160]}")
            check(not errors, f"{name}: no uncaught page errors ({errors[:2]})")
            ctx.close()
        probe_setup(browser)
        browser.close()

    for n in notes:
        print("  " + n)
    for pr in problems:
        print("  FAIL: " + pr)
    if problems:
        print(f"[FAIL] cc2-07: {len(problems)} problems, {len(notes)} ok")
        sys.exit(1)
    print(f"ALL {len(notes)} CHECKS PASSED.")


if __name__ == "__main__":
    main()
