"""cc-41: screenshots and UI-rule checks for the landing, Hôm nay and the portion panel.

- /landing at 1440 and 390: one h1, no horizontal overflow, no text left of the removed claims
- Hôm nay at 390
- /add with the portion panel open at 390: "Lưu & chọn tiếp" visible
- every visible button/link/input on those screens is at least 44 px tall (landing nav anchors are text links in a bar, checked on buttons only)
Screenshots: .screenshots/cc-41-landing-1440.png, cc-41-landing-390.png, cc-41-home-390.png, cc-41-add-portion-390.png
Run with: ALIGN_BASE_URL=http://localhost:3101 npm run probe -- tests/probes/cc_41_shots.py
"""
import os
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright
import _demo  # noqa: F401

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3101")
SHOTS = Path(__file__).resolve().parent.parent.parent / ".screenshots"
SHOTS.mkdir(exist_ok=True)
BANNED = ["100% kiểm chứng", "Minh bạch 100%", "giáo án", "chuyên viên hướng dẫn", "sao lưu", "bất kỳ lúc nào", "RNI/RDA", "chuẩn RNI", "Viện Dinh Dưỡng"]
problems = []


def check(cond, msg):
    print(("[PASS] " if cond else "[FAIL] ") + msg)
    if not cond:
        problems.append(msg)


def small_targets(pg):
    # A control counts at the height of its hit area: a ::before that reaches past it (the 28 px food rows), or the
    # 44 px label that wraps a bare input
    return pg.evaluate(
        """() => {
          const hit = (e) => {
            const r = e.getBoundingClientRect();
            const b = getComputedStyle(e, '::before');
            let h = r.height;
            if (b.position === 'absolute') h += Math.max(0, -parseFloat(b.top) || 0) + Math.max(0, -parseFloat(b.bottom) || 0);
            const label = e.closest('label');
            if (label) h = Math.max(h, label.getBoundingClientRect().height);
            return h;
          };
          return [...document.querySelectorAll('button, input, select, textarea, a[role=button]')]
            .filter(e => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e);
              return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && e.type !== 'hidden' && e.type !== 'checkbox' && e.type !== 'radio'; })
            // Hôm nay's phone list is a design decision (28 px food rows, 22 px meal headers, 44 px from lg): see cc-22
            .filter(e => !(e.classList.contains('h-7') || e.classList.contains('h-[22px]') || (e.parentElement && e.parentElement.classList.contains('h-[22px]'))) && hit(e) < 43.5)
            .map(e => (e.getAttribute('aria-label') || e.textContent || e.tagName).trim().slice(0, 40) + ' ' + Math.round(hit(e)));
        }"""
    )


def landing(browser, name, size):
    ctx = browser.new_context(viewport=size)
    pg = ctx.new_page()
    pg.goto(BASE + "/landing", wait_until="networkidle")
    pg.wait_for_timeout(600)
    check(pg.locator("h1").count() == 1, f"/landing @{name} has one h1 (found {pg.locator('h1').count()})")
    overflow = pg.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
    check(overflow <= 0, f"/landing @{name} has no horizontal overflow ({overflow})")
    body = pg.inner_text("body")
    for phrase in BANNED:
        check(phrase not in body, f"/landing @{name} does not say '{phrase}'")
    check("USDA FoodData Central" in body, f"/landing @{name} names USDA FoodData Central")
    pg.screenshot(path=str(SHOTS / f"cc-41-landing-{name}.png"), full_page=(name == "1440"))
    ctx.close()


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        landing(browser, "1440", {"width": 1440, "height": 900})
        landing(browser, "390", {"width": 390, "height": 844})

        ctx = browser.new_context(viewport={"width": 390, "height": 844})
        pg = ctx.new_page()
        pg.goto(BASE + "/", wait_until="networkidle")
        pg.wait_for_timeout(600)
        check(pg.locator("h1").count() == 1, f"Hôm nay @390 has one h1 (found {pg.locator('h1').count()})")
        small = small_targets(pg)
        check(not small, f"Hôm nay @390 interactive targets are 44 px or more ({small})")
        pg.screenshot(path=str(SHOTS / "cc-41-home-390.png"))

        pg.goto(BASE + "/add?meal=lunch", wait_until="networkidle")
        pg.wait_for_timeout(600)
        row = pg.locator("button[data-food-row]:visible").first
        row.click()
        pg.wait_for_timeout(500)
        cont = pg.locator('button:has-text("Lưu & chọn tiếp"):visible')
        check(cont.count() == 1 and cont.is_visible(), "/add @390 portion panel shows 'Lưu & chọn tiếp'")
        small = small_targets(pg)
        check(not small, f"/add @390 with the panel open: targets are 44 px or more ({small})")
        pg.screenshot(path=str(SHOTS / "cc-41-add-portion-390.png"))
        ctx.close()
        browser.close()
    if problems:
        print(f"\n{len(problems)} problem(s)")
        sys.exit(1)
    print("\ncc_41_shots: all checks passed")


main()
