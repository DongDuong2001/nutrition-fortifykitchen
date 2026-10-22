"""feat/compare-in-add (Hao 21/10, prompts/compare-in-add.md): "So sánh" is back in the add flow.

At 390 (the portion sheet over the + sheet) and 1280 (the add dialog's right pane): open /add, pick a food, the panel shows
So sánh (44 px, under the kcal card, V3Portion) beside the existing Xem chi tiết →; So sánh opens the compare picker with
that food locked; picking one more and confirming opens /foods/compare with both foods; Back returns to the add flow
(the + sheet on /add, never a blank page). Screenshots: .screenshots/compare-in-add-<width>-{panel,picker,table}.png.
Run with: ALIGN_BASE_URL=http://localhost:3101 npm run probe -- tests/probes/compare_in_add.py
"""
# PROBE_COVERS: app/(app)/add/** app/(app)/(tabs)/@sheet/** app/(app)/foods/compare/** components/add/** components/ui/portion-panel.tsx components/foods/compare-picker.tsx
import os
import re
import sys
from pathlib import Path

import _demo  # noqa: F401
from playwright.sync_api import sync_playwright

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3101")
NOW = "2026-10-15T10:00:00+07:00"
SHOTS = Path(__file__).resolve().parent.parent.parent / ".screenshots"
SHOTS.mkdir(exist_ok=True)
problems = []


def check(cond, msg):
    print(("[PASS] " if cond else "[FAIL] ") + msg)
    if not cond:
        problems.append(msg)


def run(browser, width, height):
    tag = str(width)
    ctx = browser.new_context(viewport={"width": width, "height": height})
    pg = ctx.new_page()
    pg.clock.set_fixed_time(NOW)
    pg.goto(BASE + "/app", wait_until="networkidle")
    pg.wait_for_timeout(600)
    pg.goto(BASE + "/add?meal=lunch", wait_until="networkidle")
    pg.wait_for_timeout(800)
    field = pg.locator('[data-tour="food-search"] input:visible').first
    field.fill("yến mạch")
    pg.wait_for_timeout(600)
    pg.locator("button[data-food-row]:visible").filter(has_text="Yến mạch").first.click()
    pg.wait_for_timeout(700)

    compare = pg.locator('[data-tour="portion-compare"]:visible')
    check(compare.count() == 1, f"{tag}: the portion panel has So sánh")
    if compare.count() != 1:
        ctx.close()
        return
    box = compare.bounding_box()
    check(box is not None and box["height"] >= 43.5, f"{tag}: So sánh is a 44 px target ({box and box['height']})")
    check(pg.locator('[data-tour="portion-detail"]:visible').count() == 1, f"{tag}: Xem chi tiết → is still there")
    pg.screenshot(path=str(SHOTS / f"compare-in-add-{tag}-panel.png"))

    compare.click()
    pg.wait_for_timeout(700)
    dialog = pg.get_by_role("dialog").filter(has_text=re.compile(r"Đã chọn \d/\d món"))
    check(dialog.count() >= 1, f"{tag}: So sánh opens the compare picker")
    text = dialog.first.inner_text() if dialog.count() else ""
    check("Đã chọn 1/" in text, f"{tag}: the food is locked in the picker ({text[:40]!r})")
    pg.screenshot(path=str(SHOTS / f"compare-in-add-{tag}-picker.png"))

    # Pick one more food: the first row in the picker that is not the locked one
    rows = dialog.first.locator("button[data-food-row]:not([disabled])")
    picked = None
    for i in range(min(rows.count(), 12)):
        name = rows.nth(i).inner_text().split("\n")[0].strip()
        if "Yến mạch" not in name:
            rows.nth(i).click()
            picked = name
            break
    pg.wait_for_timeout(300)
    check(picked is not None, f"{tag}: picked a second food ({picked})")
    dialog.first.get_by_role("button", name=re.compile(r"^So sánh \(2\)$")).click()
    pg.wait_for_url(re.compile(r".*/foods/compare\?ids=.*"), timeout=8000)
    pg.wait_for_timeout(900)
    body = pg.inner_text("body")
    check("Yến mạch" in body and (picked or "") in body, f"{tag}: the comparison shows both foods")
    pg.screenshot(path=str(SHOTS / f"compare-in-add-{tag}-table.png"))

    pg.go_back(wait_until="networkidle")
    pg.wait_for_timeout(900)
    on_add = pg.url.split("?")[0].endswith("/add") and pg.locator('[data-tour="food-search"]:visible').count() >= 1
    check(on_add, f"{tag}: Back returns to the add flow ({pg.url})")
    ctx.close()


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        run(browser, 390, 844)
        run(browser, 1280, 900)
        browser.close()
    if problems:
        print(f"compare_in_add: {len(problems)} problem(s)", file=sys.stderr)
        sys.exit(1)
    print("ALL OK")


if __name__ == "__main__":
    main()
