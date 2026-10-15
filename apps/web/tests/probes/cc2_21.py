"""cc2-21: Tổng quan sub-tabs Năng lượng, Vi chất and Cơ thể in the Tóm tắt system, at 390 and 1280.

- Năng lượng: dark hero with the average kcal, five scoreboard rows (one open at a time, a bar updates the day line),
  the kcal split, training vs rest days, best and worst day, Cần chú ý
- Vi chất: x/22 hero with 22 squares (a square names the nutrient and links to its detail), four collapsible
  sections, Cần chú ý with the lowest three and the foods that gave the most
- Cơ thể: latest weight hero, the weight line (a point and the stepper update the line), weigh-ins n/6, targets
  before -> now
Screenshots: .screenshots/cc2-21-*.png
Run with: ALIGN_BASE_URL=http://localhost:3102 npm run probe -- tests/probes/cc2_21.py
"""
import os
import re
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright
import _demo  # noqa: F401  (demo mode on, see _demo.py)

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3102")
SHOTS = Path(__file__).resolve().parent.parent.parent / ".screenshots"
SIZES = [("390", {"width": 390, "height": 844}), ("1280", {"width": 1280, "height": 800})]
NOW = "2026-10-12T18:00:00+07:00"
problems, notes = [], []


def check(cond, msg):
    (notes if cond else problems).append(("ok: " if cond else "") + msg)


def squash(s):
    return re.sub(r"\s+", " ", s)


def text(pg):
    return squash(pg.inner_text("body"))


def new_page(browser, size, route):
    ctx = browser.new_context(viewport=size)
    pg = ctx.new_page()
    pg.clock.set_fixed_time(NOW)
    pg.goto(BASE + route, wait_until="networkidle")
    pg.wait_for_timeout(600)
    return ctx, pg


def shot(pg, name, size_name):
    SHOTS.mkdir(parents=True, exist_ok=True)
    pg.screenshot(path=str(SHOTS / f"cc2-21-{name}-{size_name}.png"), full_page=True, animations="disabled")


def no_h_scroll(pg, where):
    w, inner = pg.evaluate("() => [Math.max(document.documentElement.scrollWidth, document.body.scrollWidth), window.innerWidth]")
    check(w <= inner, f"{where}: no horizontal scroll ({w} <= {inner})")


def energy(browser, size_name, size):
    ctx, pg = new_page(browser, size, "/trends/energy")
    w = f"{size_name} Năng lượng"
    num = pg.locator("#en-hero-number")
    check(num.count() == 1 and re.fullmatch(r"[\d.]+", num.inner_text().strip()) is not None, f"{w}: hero number is the average kcal ({num.inner_text() if num.count() else None})")
    rows = pg.locator("section[aria-label='Năng lượng và chất sinh năng lượng'] > ul > li > button")
    titles = [squash(rows.nth(i).inner_text()).split(" ")[0] for i in range(rows.count())]
    check(rows.count() == 5, f"{w}: five scoreboard rows ({rows.count()})")
    full = [squash(rows.nth(i).inner_text()) for i in range(rows.count())]
    check(full[0].startswith("Kcal") and full[1].startswith("Đạm") and full[2].startswith("Chất béo") and full[3].startswith("Tinh bột") and full[4].startswith("Chất xơ*"),
          f"{w}: Kcal, Đạm, Chất béo, Tinh bột, Chất xơ* ({[f[:14] for f in full]})")
    check(re.search(r"% kcal", full[2]) is not None and re.search(r"% kcal", full[3]) is not None, f"{w}: béo and tinh bột show their share of kcal")
    check("so với 7 ngày trước" in full[0] and "ngày đạt" in full[0], f"{w}: change in words and n/6")
    opened = lambda: pg.locator("section[aria-label='Năng lượng và chất sinh năng lượng'] button[aria-expanded='true']").count()
    check(opened() == 1 and rows.nth(0).get_attribute("aria-expanded") == "true", f"{w}: Kcal open by default")
    rows.nth(3).click()
    pg.wait_for_timeout(150)
    check(opened() == 1 and rows.nth(3).get_attribute("aria-expanded") == "true", f"{w}: opening Tinh bột closes Kcal")
    bars = pg.locator("#ov-score-carbs button[aria-pressed]")
    check(bars.count() == 7, f"{w}: seven bars ({bars.count()})")
    line = lambda: squash(pg.locator("#ov-score-carbs p[aria-live]").inner_text())
    before = line()
    bars.nth(1).click()
    pg.wait_for_timeout(150)
    check(before != line() and bars.nth(1).get_attribute("aria-pressed") == "true", f"{w}: a bar updates the day line ({before!r} -> {line()!r})")
    t = text(pg)
    split = pg.locator("[role='img'][aria-label^='Đạm']")
    shares = [int(x) for x in re.findall(r"(\d+)%", split.get_attribute("aria-label") or "")]
    check(len(shares) == 3 and sum(shares) == 100, f"{w}: kcal split adds up to 100 ({shares})")
    check("Ngày tập và ngày nghỉ" in t and "Ngày tập" in t and "Ngày nghỉ" in t, f"{w}: training vs rest days")
    check("Gần mục tiêu nhất" in t and "Xa mục tiêu nhất" in t, f"{w}: best and worst day")
    check("Cần chú ý" in t, f"{w}: Cần chú ý")
    check("vượt" not in t.lower(), f"{w}: no over-limit wording")
    no_h_scroll(pg, w)
    shot(pg, "energy", size_name)
    # The 30-day view still draws seven bars
    pg.locator('a:has-text("30 ngày") >> visible=true').first.click()
    pg.wait_for_timeout(500)
    check(pg.locator("#ov-score-calories button[aria-pressed]").count() == 7, f"{w}: 30 days chart shows the last 7 days")
    ctx.close()


def micros(browser, size_name, size):
    ctx, pg = new_page(browser, size, "/trends/micros")
    w = f"{size_name} Vi chất"
    hero = squash(pg.locator("#mi-hero").inner_text())
    check(re.search(r"\d+\s*/22", hero) is not None, f"{w}: hero reads n/22 ({hero[:60]!r})")
    squares = pg.locator("#mi-grid ul button")
    check(squares.count() == 22, f"{w}: 22 squares ({squares.count()})")
    squares.nth(2).click()
    pg.wait_for_timeout(150)
    name = (squares.nth(2).get_attribute("aria-label") or "").split(" ")[0]
    sel = squash(pg.locator("#mi-grid p[aria-live]").inner_text())
    check(name in sel and "%" in sel, f"{w}: a square names the nutrient, share and level ({sel!r})")
    link = pg.locator("#mi-grid a[href^='/micros/']")
    check(link.count() == 1, f"{w}: the selected nutrient links to its detail")
    details = pg.locator("#mi-sections details")
    labels = [squash(details.nth(i).locator("summary").inner_text()) for i in range(details.count())]
    check(details.count() >= 4 and [l.split(" ")[0] for l in labels][:4] == ["Thiếu", "Trung", "Gần", "Đạt"], f"{w}: Thiếu, Trung bình, Gần đủ, Đạt sections ({labels})")
    first = details.nth(0)
    check(first.evaluate("e => e.open") is True, f"{w}: Thiếu is open")
    first.locator("summary").click()
    pg.wait_for_timeout(150)
    check(first.evaluate("e => e.open") is False, f"{w}: a section collapses")
    first.locator("summary").click()
    pg.wait_for_timeout(100)
    att = pg.locator("section[aria-labelledby='ov-attention'] > ul > li")
    check(1 <= att.count() <= 3, f"{w}: Cần chú ý has 1-3 rows ({att.count()})")
    atext = squash(pg.locator("section[aria-labelledby='ov-attention']").inner_text())
    check("Nhiều nhất từ" in atext or "Chưa có món nào" in atext, f"{w}: Cần chú ý names the foods ({atext[:140]!r})")
    check(re.search(r"/ [\d.,]+ [^\s]+ mỗi ngày · còn thiếu", atext) is not None, f"{w}: amount / target and the gap per day")
    no_h_scroll(pg, w)
    shot(pg, "micros", size_name)
    ctx.close()


def body(browser, size_name, size):
    ctx, pg = new_page(browser, size, "/trends/body")
    w = f"{size_name} Cơ thể"
    num = pg.locator("#bd-hero-number")
    check(num.count() == 1 and re.fullmatch(r"\d+,\d", num.inner_text().strip()) is not None, f"{w}: hero shows the latest weight ({num.inner_text() if num.count() else None})")
    points = pg.locator("section[aria-labelledby='bd-line'] button[aria-pressed]")
    check(points.count() >= 5, f"{w}: a button per weigh-in ({points.count()})")
    line = lambda: squash(pg.locator("section[aria-labelledby='bd-line'] p[aria-live]").inner_text())
    before = line()
    points.nth(1).click()
    pg.wait_for_timeout(150)
    after = line()
    check(before != after and points.nth(1).get_attribute("aria-pressed") == "true", f"{w}: a point updates the line ({before!r} -> {after!r})")
    check(re.search(r"\d+,\d kg", after) is not None, f"{w}: the line shows date and kg ({after!r})")
    pg.get_by_role("button", name="Lần cân sau").click()
    pg.wait_for_timeout(150)
    check(points.nth(2).get_attribute("aria-pressed") == "true", f"{w}: the stepper moves to the next weigh-in")
    t = text(pg)
    check(re.search(r"Số lần cân \d+/7", t) is not None, f"{w}: weigh-ins n/6")
    check("So với kỳ trước" in t and "Mục tiêu theo cân nặng" in t, f"{w}: change vs previous and targets that follow weight")
    shift = squash(pg.locator("section[aria-labelledby='bd-shift']").inner_text())
    check(all(k in shift for k in ("Kcal", "Đạm", "Kali")), f"{w}: kcal, đạm and kali ({shift[:120]!r})")
    check("→" in shift, f"{w}: before → now shown ({shift[:160]!r})")
    no_h_scroll(pg, w)
    shot(pg, "body", size_name)
    ctx.close()


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for size_name, size in SIZES:
            energy(browser, size_name, size)
            micros(browser, size_name, size)
            body(browser, size_name, size)
        browser.close()
    for n in notes:
        print(n)
    for pr in problems:
        print("[FAIL]", pr)
    print(f"cc2-21: {len(notes)} ok, {len(problems)} fail")
    sys.exit(1 if problems else 0)


if __name__ == "__main__":
    main()
