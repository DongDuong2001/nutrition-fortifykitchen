"""Screenshots for docs/design/impeccable-audit-2026-10-19.md: Hôm nay, the /add portion panel and the Khay (tray bar and
review sheet), Tổng quan > Năng lượng, all at 390 x 844, 2x, demo build. No checks; it writes the pictures.
Run with: ALIGN_BASE_URL=http://localhost:3107 npm run probe -- tests/probes/impeccable_shots.py
"""
import os
import re
from pathlib import Path

from playwright.sync_api import sync_playwright
import _demo  # noqa: F401  (demo mode, tour and tips off)

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3100")
OUT = Path(__file__).resolve().parents[4] / "docs" / "design" / "impeccable-audit-2026-10-19"
PHONE = dict(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True)


def settle(pg, ms=900):
    pg.wait_for_timeout(ms)
    pg.evaluate("() => document.fonts.ready")


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch()
        ctx = browser.new_context(**PHONE)
        pg = ctx.new_page()

        pg.goto(BASE + "/app", wait_until="networkidle")
        settle(pg, 1500)
        later = pg.get_by_role("button", name="Để sau")
        if later.count():
            later.first.tap()
            settle(pg, 600)
        pg.screenshot(path=str(OUT / "01-hom-nay.png"))
        # /add: the list, the portion panel (a dish with parts), the tray
        pg.goto(BASE + "/add", wait_until="networkidle")
        settle(pg, 1200)
        pg.screenshot(path=str(OUT / "02-add-list.png"))
        field = pg.locator('[data-add-panel] input').first
        field.fill("phở bò")
        settle(pg, 600)
        pg.locator("[data-add-panel] button[data-food-row]").filter(has_text="Phở bò").first.tap()
        pg.locator('[data-tour="portion-panel"]:visible').first.wait_for(state="visible")
        settle(pg, 800)
        pg.screenshot(path=str(OUT / "03-add-portion-panel.png"))
        pg.get_by_role("button", name=re.compile("Lưu & chọn tiếp")).first.tap()
        settle(pg, 700)
        field.fill("chuối")
        settle(pg, 600)
        pg.locator("[data-add-panel] button[data-tray-toggle]").first.tap()
        settle(pg, 700)
        pg.screenshot(path=str(OUT / "04-add-khay-bar.png"))
        review = pg.get_by_role("button", name=re.compile("Xem lại|Xem khay|Xem")).filter(has_text=re.compile("Xem")).first
        if review.count():
            review.tap()
            settle(pg, 900)
            pg.screenshot(path=str(OUT / "05-add-khay-review.png"))
        ctx.close()

        ctx = browser.new_context(**PHONE)
        pg = ctx.new_page()
        pg.goto(BASE + "/trends/energy", wait_until="networkidle")
        settle(pg, 1500)
        pg.screenshot(path=str(OUT / "06-tong-quan-nang-luong.png"))
        pg.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        settle(pg, 500)
        pg.screenshot(path=str(OUT / "07-tong-quan-nang-luong-scrolled.png"))
        ctx.close()
        browser.close()
    for f in sorted(OUT.glob("*.png")):
        print(f.name, f.stat().st_size)


if __name__ == "__main__":
    main()
