"""hotfix/tutorials: the 2026-10-18c tour and the new first-visit tips, on a production demo build at 390x844.

Tour, tips and "Có gì mới" are on here (`_seed.onboarding(True)`, `_seed.whats_new(True)`).
- A returning user (first-run tour done, every older tip seen, 18b seen) opens Hôm nay: Có gì mới opens with Thử ngay;
  Thử ngay runs 5 steps (Mới · n/5), each ring on its real control: header sync status (the header actions when there
  is no status, as in demo), the food list, the nutrient column, the meal pill, the Khám phá tab; Xong ends it and the
  entries never change
- A step whose target is gone is skipped; a target that leaves the page mid-step moves the tour on (no stuck ring)
- The ×N stepper tip shows once for an egg (Trứng gà, 1 quả) and for a supplement (Bột củ dền, 1 muỗng)
- On a phone, the first sheet opened shows the drag-down tip once
Screenshots: .screenshots/cc-tutorials-*.png
Run with: ALIGN_BASE_URL=http://localhost:3101 npm run probe -- tests/probes/cc_tutorials.py
"""
import json
import os
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright
import _demo  # noqa: F401
import _seed

_seed.onboarding(True)
_seed.whats_new(True)

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3101")
SHOTS = Path(__file__).resolve().parent.parent.parent / ".screenshots"
SHOTS.mkdir(exist_ok=True)
PHONE = {"width": 390, "height": 844}
TOUCH = {"has_touch": True, "is_mobile": True}
SETTINGS_KEY = "h1t_settings_v1_demo"
RELEASE = "2026-10-18c"
# Every tip that existed before this release: a returning user has seen them
OLD_TIPS = [
    "unsaved", "home-logged", "meal-add", "home-share", "pull-refresh", "nutrient-sources", "past-day", "multi-select", "add-tray", "add-shortlists", "haptics",
    "food-detail", "compare", "food-new", "training", "micros", "trends-micros", "explore", "overview", "leaderboard",
]
RETURNING = {"tourDone": True, "seen": OLD_TIPS, "whatsNewSeen": "2026-10-18b"}
STEPS = [
    ("Món chưa lưu", ["sync-status", "header-actions"]),
    ("Kéo xuống để tải lại", ["home-food-list", "meal-pill"]),
    ("Chạm vi chất để xem nguồn", ["nutrient-column"]),
    ("Gần đây và Như hôm qua", ["meal-pill"]),
    ("Thực phẩm bổ sung và Gia vị", ["nav-explore"]),
]
problems = []


def check(cond, msg):
    print(("[PASS] " if cond else "[FAIL] ") + msg)
    if not cond:
        problems.append(msg)


def new_page(browser, onboarding, touch=False):
    ctx = browser.new_context(viewport=PHONE, **(TOUCH if touch else {}))
    # The install pop-up (it opens by itself on a phone) is done, so the first sheet is the one the probe opens
    seed = {"onboarding": onboarding, "installPrompt": {"dismissCount": 0, "snoozeUntil": 0, "done": True, "firstSeenIso": "2026-01-01"}}
    ctx.add_init_script(
        f"if (localStorage.getItem('{SETTINGS_KEY}') === null) localStorage.setItem('{SETTINGS_KEY}', {json.dumps(json.dumps(seed))});"
    )
    return ctx, ctx.new_page()


def go(pg, route, wait=600):
    pg.goto(BASE + route, wait_until="networkidle")
    pg.wait_for_timeout(wait)


def sheet(pg):
    return pg.get_by_role("dialog", name="Có gì mới")


def card(pg):
    return pg.locator("[data-onboarding-card]")


def visible(locator, timeout=3000):
    try:
        locator.first.wait_for(state="visible", timeout=timeout)
        return True
    except Exception:
        return False


def flags(pg):
    raw = pg.evaluate(f"() => localStorage.getItem('{SETTINGS_KEY}')")
    try:
        return (json.loads(raw) or {}).get("onboarding", {}) if raw else {}
    except Exception:
        return {}


def entries(pg):
    return pg.evaluate(
        "() => Object.keys(localStorage).filter(k => /entries|sample_edits|archive/.test(k)).sort().map(k => k + '=' + localStorage.getItem(k)).join('\\n')"
    )


def shot(pg, name):
    pg.screenshot(path=str(SHOTS / f"cc-tutorials-{name}.png"))


def ring_holds(pg, targets):
    """The ring is around the first of `targets` that is on screen (the hole is clamped to the screen)."""
    hole = pg.locator("[data-onboarding-overlay] > div.border-sky").first.bounding_box()
    for t in targets:
        loc = pg.locator(f'[data-tour="{t}"]:visible')
        for i in range(loc.count()):
            box = loc.nth(i).bounding_box()
            if not box or box["width"] == 0:
                continue
            top = max(0, box["y"])
            bottom = min(PHONE["height"], box["y"] + box["height"])
            if hole and hole["x"] <= box["x"] + 1 and hole["x"] + hole["width"] >= box["x"] + box["width"] - 1 and hole["y"] <= top + 1 and hole["y"] + hole["height"] >= bottom - 1:
                return t
    return None


def step_text(pg):
    return card(pg).inner_text() if card(pg).count() else ""


def start_tour(pg):
    go(pg, "/app", 1200)
    check(visible(sheet(pg)), "a returning user: Có gì mới opens by itself on Hôm nay")
    text = sheet(pg).inner_text()
    check("Ghi theo quả, viên" in text and "Trứng, trái cây và thực phẩm bổ sung có nút ×N" in text, "the sheet lists Ghi theo quả, viên")
    try_now = sheet(pg).get_by_role("button", name="Thử ngay (1 phút)")
    check(try_now.count() == 1, "Thử ngay (1 phút): 18c has a tour")
    shot(pg, "sheet")
    try_now.click()
    pg.wait_for_timeout(700)


def tour(browser):
    ctx, pg = new_page(browser, RETURNING)
    go(pg, "/app", 300)
    before = entries(pg)
    start_tour(pg)
    check(sheet(pg).count() == 0, "Thử ngay closes the sheet")
    check(flags(pg).get("whatsNewSeen") == RELEASE, "the release is marked seen")
    for i, (title, targets) in enumerate(STEPS):
        ok = visible(card(pg))
        text = step_text(pg)
        check(ok and f"Mới · {i + 1}/5" in text and title in text, f"step {i + 1}: Mới · {i + 1}/5, {title} ({text[:40]!r})")
        check(card(pg).get_attribute("aria-label") == f"Hướng dẫn bước {i + 1} trên 5", f"step {i + 1}: aria-label")
        on = ring_holds(pg, targets)
        check(on is not None, f"step {i + 1}: the ring is on {' or '.join(targets)} ({on})")
        cbox = card(pg).bounding_box()
        check(cbox and cbox["x"] >= 15 and cbox["x"] + cbox["width"] <= PHONE["width"] - 15 and cbox["y"] >= 0 and cbox["y"] + cbox["height"] <= PHONE["height"], f"step {i + 1}: the card is on screen")
        shot(pg, f"step{i + 1}")
        last = i == len(STEPS) - 1
        button = card(pg).get_by_role("button", name="Xong" if last else "Tiếp")
        check(button.count() == 1, f"step {i + 1}: {'Xong' if last else 'Tiếp'}")
        if not last:
            check(card(pg).get_by_role("button", name="Bỏ qua").count() == 1, f"step {i + 1}: Bỏ qua")
        button.click()
        pg.wait_for_timeout(700)
    check(card(pg).count() == 0, "Xong ends the tour")
    check(pg.url.endswith("/app"), "still on Hôm nay")
    check(entries(pg) == before, "the entries never change")
    go(pg, "/app", 1500)
    check(card(pg).count() == 0 and sheet(pg).count() == 0, "nothing comes back after a reload")
    ctx.close()


def skipped(browser):
    # A step whose target is gone is skipped: no nutrient column -> step 2 goes straight to step 4
    ctx, pg = new_page(browser, RETURNING)
    start_tour(pg)
    card(pg).get_by_role("button", name="Tiếp").click()
    pg.wait_for_timeout(700)
    check("Mới · 2/5" in step_text(pg), "skip: on step 2")
    pg.evaluate("() => document.querySelectorAll('[data-tour=\"nutrient-column\"]').forEach(el => el.removeAttribute('data-tour'))")
    card(pg).get_by_role("button", name="Tiếp").click()
    pg.wait_for_timeout(2500)
    check("Mới · 4/5" in step_text(pg), f"skip: step 3 has no target, so step 4 shows ({step_text(pg)[:30]!r})")
    check(pg.locator("[data-onboarding-overlay]").count() == 1, "skip: one overlay, no ring left behind")
    # A target that leaves the page mid-step moves the tour on (the ring is not left on an empty spot)
    pg.evaluate("() => document.querySelectorAll('[data-tour=\"meal-pill\"]').forEach(el => el.remove())")
    pg.wait_for_timeout(1200)
    check("Mới · 5/5" in step_text(pg), f"gone mid-step: step 4's meal pill left the page, step 5 shows ({step_text(pg)[:30]!r})")
    check(ring_holds(pg, ["nav-explore"]) == "nav-explore", "gone mid-step: the ring is on Khám phá")
    shot(pg, "skipped")
    ctx.close()


def open_food(pg, query, name):
    go(pg, "/add?meal=lunch", 800)
    field = pg.locator('[data-tour="food-search"] input:visible, input[type="search"]:visible').first
    field.fill(query)
    pg.wait_for_timeout(600)
    pg.locator("button[data-food-row]:visible").filter(has_text=name).first.click()
    pg.wait_for_timeout(400)


def stepper_tip(pg, label):
    ok = visible(card(pg), 4000)
    text = step_text(pg)
    check(ok and "Tăng giảm số lượng" in text and "Mẹo · lần đầu" in text, f"{label}: the ×N stepper tip shows ({text[:40]!r})")
    on = ring_holds(pg, ["quantity-stepper"])
    check(on == "quantity-stepper", f"{label}: the ring is on the stepper")
    return ok


def stepper(browser):
    # An egg (Dong's unit portions): picking Trứng gà selects 1 quả, the stepper shows, and its tip with it
    ctx, pg = new_page(browser, RETURNING | {"whatsNewSeen": RELEASE})
    open_food(pg, "trứng gà", "Trứng gà")
    check(pg.locator('[data-tour="quantity-stepper"]:visible').count() >= 1, "egg: the stepper is on screen")
    if stepper_tip(pg, "egg"):
        shot(pg, "stepper-egg")
        card(pg).get_by_role("button", name="Đã hiểu").click()
        pg.wait_for_timeout(300)
    check("quantity-stepper" in flags(pg).get("seen", []), "egg: saved as seen")
    check(card(pg).count() == 0, "egg: Đã hiểu closes it")
    pg.get_by_role("button", name="Tăng số lượng").first.click()
    pg.wait_for_timeout(200)
    check(pg.locator("output[aria-label='Số lượng hiện tại']:visible").first.inner_text() == "×2", "egg: + gives ×2 (the tip did not block the stepper)")
    open_food(pg, "trứng gà", "Trứng gà")
    pg.wait_for_timeout(1500)
    check(card(pg).count() == 0, "egg: never again")
    ctx.close()

    # A supplement: Bột củ dền by the spoon (1 muỗng)
    ctx, pg = new_page(browser, RETURNING | {"whatsNewSeen": RELEASE})
    open_food(pg, "củ dền", "Bột củ dền")
    pg.get_by_role("button", name="1 muỗng").first.click()
    pg.wait_for_timeout(300)
    check(pg.locator('[data-tour="quantity-stepper"]:visible').count() >= 1, "supplement: the stepper is on screen at 1 muỗng")
    if stepper_tip(pg, "supplement"):
        shot(pg, "stepper-supplement")
        card(pg).get_by_role("button", name="Đã hiểu").click()
        pg.wait_for_timeout(300)
    check("quantity-stepper" in flags(pg).get("seen", []), "supplement: saved as seen")
    ctx.close()


def drag(browser):
    ctx, pg = new_page(browser, RETURNING | {"whatsNewSeen": RELEASE, "seen": OLD_TIPS + ["quantity-stepper"]}, touch=True)
    go(pg, "/app", 1500)
    check(card(pg).count() == 0, "drag: no tip on Hôm nay before a sheet opens")
    pg.get_by_role("button", name="Tùy chọn ngày").first.tap()
    pg.wait_for_timeout(300)
    ok = visible(card(pg), 4000)
    text = step_text(pg)
    check(ok and "Kéo xuống để đóng" in text, f"drag: the first sheet shows the drag-down tip ({text[:40]!r})")
    check(ring_holds(pg, ["sheet-handle"]) == "sheet-handle", "drag: the ring is on the grabber")
    check(pg.locator("[data-onboarding-card]").count() == 1, "drag: one card only")
    shot(pg, "drag")
    if ok:
        pg.keyboard.press("Escape")
        pg.wait_for_timeout(300)
        check(card(pg).count() == 0 and pg.locator('[role="dialog"]').count() >= 1, "drag: Esc closes the tip, the sheet stays open")
    check("sheet-drag" in flags(pg).get("seen", []), "drag: saved as seen")
    pg.keyboard.press("Escape")
    pg.wait_for_timeout(500)
    pg.get_by_role("button", name="Tùy chọn ngày").first.tap()
    pg.wait_for_timeout(1500)
    check(card(pg).count() == 0, "drag: the next sheet shows no tip")
    ctx.close()


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for part in (tour, skipped, stepper, drag):
            print(f"\n=== {part.__name__} ===")
            try:
                part(browser)
            except Exception as e:  # a crash is a failure, the rest still runs
                check(False, f"{part.__name__} crashed: {e}")
        browser.close()
    print(f"\n{len(problems)} problem(s)")
    for m in problems:
        print(" - " + m)
    sys.exit(1 if problems else 0)


if __name__ == "__main__":
    main()
