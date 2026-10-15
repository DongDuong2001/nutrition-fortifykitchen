"""cc-05 edit entry and undo (part 1): /entry/[id] opened directly, then the Today numbers.
Scenarios: portion change updates totals, move to another meal, delete with Hoàn tác, delete without
undo gone after reload with edits kept, unknown id, and the entry rows share edges.
Run with: ALIGN_BASE_URL=http://localhost:3101 PATH=/usr/bin:$PATH npm run probe -- tests/probes/cc05.py
"""
import os
import re
import sys

from playwright.sync_api import sync_playwright
import _demo  # noqa: F401  (cc2-15b: demo mode on, see _demo.py)

# Reuse the shared edge check from tests/alignment.py (its main() only runs under __main__)
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from alignment import check_align_groups  # noqa: E402

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3100")
SHOTS = os.path.join(os.path.dirname(__file__), "..", "..", ".screenshots")
PHONE = {"width": 390, "height": 844}
DESKTOP = {"width": 1440, "height": 900}
problems = []
notes = []


def check(cond, msg):
    if cond:
        notes.append("ok: " + msg)
    else:
        problems.append(msg)


def shown(pg, selector):
    return pg.locator(selector + " >> visible=true").count() > 0


MEAL_NAME = {"breakfast": "Bữa sáng", "lunch": "Bữa trưa", "snack": "Bữa phụ", "dinner": "Bữa tối"}


def meal_text(pg, slot):
    # Hôm nay: one section per meal, a header with the kcal and one row per food ("Yến mạch 90 g")
    return re.sub(r"\s+", " ", pg.locator(f"section[aria-label='{MEAL_NAME[slot]}'] >> visible=true").first.inner_text())


def button(pg, label):
    return pg.locator("button >> visible=true").filter(has_text=label).first


def grams_input(pg):
    return pg.locator('input[aria-label="Số gam"] >> visible=true').first


def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()

        for name, vp in (("390", PHONE), ("1440", DESKTOP)):
            # A fresh context per width: sessionStorage starts empty at each width
            ctx = browser.new_context(viewport=vp)
            pg = ctx.new_page()
            errors = []
            pg.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)

            # 1. the entry screen for Yến mạch (item-1), opened directly
            pg.goto(BASE + "/entry/item-1", wait_until="networkidle")
            pg.wait_for_timeout(300)
            check(pg.locator("h1 >> visible=true").filter(has_text="Yến mạch").count() == 1, f"{name}: entry shows Yến mạch")
            check(grams_input(pg).input_value() == "60", f"{name}: entry starts at 60 g (found {grams_input(pg).input_value()})")
            check(shown(pg, 'fieldset button[aria-pressed=true]:has-text("Bữa sáng")'), f"{name}: entry starts in Bữa sáng")
            res = check_align_groups(pg, "entry")
            check(not res["errors"], f"{name}: entry rows share edges ({res['errors']})")
            check(res["pairs"].get("entry", 0) >= 2, f"{name}: entry group compares pairs ({res['pairs'].get('entry', 0)})")
            if name == "390":
                pg.screenshot(path=os.path.join(SHOTS, "cc05-entry-390.png"), animations="disabled")
            else:
                pg.screenshot(path=os.path.join(SHOTS, "cc05-entry-1440.png"), animations="disabled")

            # 2. unknown id shows the empty state
            pg.goto(BASE + "/entry/no-such-item", wait_until="networkidle")
            pg.wait_for_timeout(200)
            check(shown(pg, 'text="Không tìm thấy món này"'), f"{name}: unknown id shows the empty state")

            # Baseline on Today before any edit
            pg.goto(BASE + "/", wait_until="networkidle")
            pg.wait_for_timeout(300)
            check("459 kcal" in meal_text(pg, "breakfast"), f"{name}: breakfast starts at 459 kcal")
            check("1.041" in pg.inner_text("body"), f"{name}: day starts at 1.041 kcal")

            # 3. change Yến mạch to 90 g, save, totals update
            pg.goto(BASE + "/entry/item-1", wait_until="networkidle")
            grams_input(pg).fill("90")
            button(pg, "Lưu thay đổi").click()
            pg.wait_for_url(re.compile(r".*/(\?.*)?$"))
            pg.wait_for_timeout(300)
            check("Yến mạch 90 g" in meal_text(pg, "breakfast"), f"{name}: Yến mạch shows 90 g on Today")
            check("573 kcal" in meal_text(pg, "breakfast"), f"{name}: breakfast total updates to 573 kcal")
            check("1.155" in pg.inner_text("body"), f"{name}: day total updates to 1.155 kcal")

            # 4. move Yến mạch to Bữa tối
            pg.goto(BASE + "/entry/item-1", wait_until="networkidle")
            pg.locator('fieldset button >> visible=true').filter(has_text="Bữa tối").first.click()
            pg.wait_for_timeout(200)
            button(pg, "Lưu thay đổi").click()
            pg.wait_for_url(re.compile(r".*/(\?.*)?$"))
            pg.wait_for_timeout(300)
            check("Yến mạch 90 g" in meal_text(pg, "dinner"), f"{name}: moved entry shows under Bữa tối")
            check("Yến mạch" not in meal_text(pg, "breakfast"), f"{name}: moved entry leaves Bữa sáng")
            check("231 kcal" in meal_text(pg, "breakfast"), f"{name}: Bữa sáng drops to 231 kcal")
            check("1.155" in pg.inner_text("body"), f"{name}: moving keeps the day total at 1.155")

            # 5. delete Yogurt kefir: toast shows, Hoàn tác puts it back in place
            pg.goto(BASE + "/entry/item-2", wait_until="networkidle")
            button(pg, "Xóa món này").click()
            pg.wait_for_url(re.compile(r".*/(\?.*)?$"))
            pg.wait_for_timeout(300)
            toast = pg.locator('[role=status] >> visible=true').filter(has_text="Đã xóa Yogurt kefir")
            check(toast.count() == 1, f"{name}: delete shows the undo toast")
            check("Yogurt kefir" not in meal_text(pg, "breakfast"), f"{name}: deleted item leaves Bữa sáng")
            if name == "390":
                pg.screenshot(path=os.path.join(SHOTS, "cc05-undo-toast-390.png"), animations="disabled")
            button(pg, "Hoàn tác").click()
            pg.wait_for_timeout(300)
            breakfast = meal_text(pg, "breakfast")
            check("Yogurt kefir 200 g" in breakfast, f"{name}: Hoàn tác restores Yogurt kefir")
            check(breakfast.index("Yogurt kefir") < breakfast.index("Chuối"), f"{name}: restored item is back in its place")
            check(pg.locator('[role=status] >> visible=true').filter(has_text="Đã xóa").count() == 0,
                  f"{name}: toast goes after Hoàn tác")

            # 6. delete Chuối without undo: gone after reload, and the earlier edits survive
            pg.goto(BASE + "/entry/item-3", wait_until="networkidle")
            button(pg, "Xóa món này").click()
            pg.wait_for_url(re.compile(r".*/(\?.*)?$"))
            pg.wait_for_timeout(200)
            pg.reload(wait_until="networkidle")
            pg.wait_for_timeout(300)
            check("Chuối" not in meal_text(pg, "breakfast"), f"{name}: deleted Chuối stays gone after reload")
            check("Yến mạch 90 g" in meal_text(pg, "dinner"), f"{name}: moved edit survives reload")
            check("Yogurt kefir 200 g" in meal_text(pg, "breakfast"), f"{name}: restored item survives reload")

            if errors:
                problems.append(f"{name}: console errors: {errors[:3]}")
            ctx.close()

        browser.close()


if __name__ == "__main__":
    run()
    print("\n".join(notes))
    print("PROBLEMS:", problems or "none")
    sys.exit(1 if problems else 0)
