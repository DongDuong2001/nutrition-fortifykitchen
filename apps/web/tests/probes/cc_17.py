"""cc-17: Ngày tập ticks per day, one even duration row, and the /micros phone header folding on scroll.

Training: ticks survive a reload on today; a past day is read-only and shows its saved ticks; a day with no record
shows no checklist; the five duration chips sit on one row of equal columns with no wrapped label.
Micros (390 only): the header is under a third of the screen at rest, folds to one line once the list scrolls past
it, and the list does not move on screen when it folds. Desktop 1280 has no fold.
Screenshots: .screenshots/cc-17-{training,micros}-{top,scrolled}-{390,1280}.png
Run with: ALIGN_BASE_URL=http://localhost:3101 npm run probe -- tests/probes/cc_17.py
"""
import os
import sys
from datetime import datetime, timedelta, timezone

from playwright.sync_api import sync_playwright
import _demo  # noqa: F401  (cc2-15b: demo mode on, see _demo.py)

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3101")
SHOTS = os.path.join(os.path.dirname(__file__), "..", "..", ".screenshots")
PHONE = {"width": 390, "height": 844}
DESKTOP = {"width": 1280, "height": 900}
KEY = "h1t_training_checklist_v1"
VN = timezone(timedelta(hours=7))
TODAY = datetime.now(VN).date()
TODAY_ISO = TODAY.isoformat()
YESTERDAY_ISO = (TODAY - timedelta(days=1)).isoformat()
OLD_ISO = (TODAY - timedelta(days=8)).isoformat()

problems = []
notes = []


def check(cond, msg):
    if cond:
        notes.append("ok: " + msg)
    else:
        problems.append(msg)


def open_page(browser, size, path):
    context = browser.new_context(viewport=size)
    pg = context.new_page()
    errors = []
    pg.on("console", lambda msg: errors.append(msg.text) if msg.type == "error" else None)
    pg.goto(BASE + path)
    pg.wait_for_load_state("networkidle")
    return context, pg, errors


def no_horizontal_scroll(pg, label):
    overflow = pg.evaluate("() => document.documentElement.scrollWidth - document.documentElement.clientWidth")
    check(overflow <= 0, f"{label}: no horizontal scroll (overflow {overflow})")


def chip_report(pg):
    return pg.evaluate(
        """() => Array.from(document.querySelectorAll('[role=group][aria-label="Thời gian tập"] button')).map((b) => {
            const range = document.createRange();
            range.selectNodeContents(b);
            const lines = new Set(Array.from(range.getClientRects()).map((r) => Math.round(r.top))).size;
            const r = b.getBoundingClientRect();
            return {
                label: b.textContent.trim(), lines, top: Math.round(r.top), left: r.left, width: r.width,
                height: r.height, overflow: b.scrollWidth - b.clientWidth,
                visible: r.width > 0 && getComputedStyle(b).display !== 'none',
            };
        })"""
    )


def store_day(pg, dateiso, minutes, ticked):
    pg.evaluate(
        """([key, date, value]) => {
            const raw = localStorage.getItem(key);
            const store = raw ? JSON.parse(raw) : {};
            store[date] = value;
            localStorage.setItem(key, JSON.stringify(store));
        }""",
        [KEY, dateiso, {"minutes": minutes, "ticked": ticked}],
    )


def read_store(pg):
    return pg.evaluate("(key) => localStorage.getItem(key)", KEY)


def training_checks(pg):
    # The mobile and desktop trees both render; only the visible one counts
    return pg.evaluate(
        """() => Array.from(document.querySelectorAll('input[type=checkbox]')).filter((i) => i.offsetParent !== null).map((i) => ({
            label: i.getAttribute('aria-label'), checked: i.checked, disabled: i.disabled,
        }))"""
    )


def check_edges(pg, group, label):
    # Every member of a group shares its left and right edges within 1 px (AGENTS: Layout and alignment rules)
    edges = pg.evaluate(
        """(group) => Array.from(document.querySelectorAll(`[data-align-group="${group}"]`))
            .map((el) => el.getBoundingClientRect()).filter((r) => r.width > 0)
            .map((r) => ({ left: r.left, right: r.right }))""",
        group,
    )
    check(len(edges) >= 1, f"{label}: {group} has {len(edges)} visible members")
    if edges:
        check(max(e["left"] for e in edges) - min(e["left"] for e in edges) <= 1.0, f"{label}: {group} left edges align")
        check(max(e["right"] for e in edges) - min(e["right"] for e in edges) <= 1.0, f"{label}: {group} right edges align")


def check_training(browser, size_name, size):
    label = f"training {size_name}"

    # Today: tick Tinh bột nhanh, then reload and it is still ticked
    context, pg, errors = open_page(browser, size, "/training?duration=60")
    pg.wait_for_selector("input[aria-label='Tinh bột nhanh']:visible")
    pg.evaluate("(key) => localStorage.removeItem(key)", KEY)
    pg.reload()
    pg.wait_for_selector("input[aria-label='Tinh bột nhanh']:visible")
    carb = pg.locator("input[aria-label='Tinh bột nhanh']:visible")
    check(carb.count() == 1 and not carb.is_checked(), f"{label}: nothing is ticked on a day with no record")
    carb.click()
    check(carb.is_checked(), f"{label}: today's tick is editable and checks")
    saved = read_store(pg)
    check(saved is not None and TODAY_ISO in saved and "intra-carb" in saved, f"{label}: the tick is saved under today's key")
    pg.reload()
    pg.wait_for_selector("input[aria-label='Tinh bột nhanh']:visible")
    carb = pg.locator("input[aria-label='Tinh bột nhanh']:visible")
    check(carb.is_checked(), f"{label}: the tick survives a reload")
    check(not carb.is_disabled(), f"{label}: today's tick stays editable after reload")

    # Chips: one row of five equal columns, no wrapped label, every target 44 px
    chips = [c for c in chip_report(pg) if c["visible"]]
    check(len(chips) == 5, f"{label}: five duration chips ({len(chips)})")
    if chips:
        # Phone: 3 equal columns, so rows of 3 and 2 with the sixth cell empty. Desktop: one row of 5.
        tops = [c["top"] for c in chips]
        if size_name == "390":
            check(len(set(tops[:3])) == 1 and len(set(tops[3:])) == 1 and tops[0] != tops[3],
                  f"{label}: chips sit in a 3 + 2 grid of equal columns (tops {tops})")
        else:
            check(len(set(tops)) == 1, f"{label}: the five chips share one row (tops {tops})")
        widths = [c["width"] for c in chips]
        check(max(widths) - min(widths) <= 1.0, f"{label}: the five chips are equal width ({widths})")
        check(all(c["lines"] == 1 for c in chips), f"{label}: no chip label wraps ({[c['label'] + ':' + str(c['lines']) for c in chips]})")
        check(all(c["overflow"] <= 0 for c in chips), f"{label}: no chip label overflows")
        check(all(c["height"] >= 44 for c in chips), f"{label}: every chip is at least 44 px tall")
    check_edges(pg, "training-content", f"{label} today")
    no_horizontal_scroll(pg, label)
    check(not errors, f"{label}: no console errors on today ({errors[:2]})")
    pg.screenshot(path=os.path.join(SHOTS, f"cc-17-training-top-{size_name}.png"), full_page=True, animations="disabled")
    pg.evaluate("() => window.scrollTo(0, 400)")
    pg.wait_for_timeout(300)
    pg.screenshot(path=os.path.join(SHOTS, f"cc-17-training-scrolled-{size_name}.png"), animations="disabled")
    context.close()

    # Past day with a saved record: ticks show as saved and cannot change; chips are disabled
    context, pg, errors = open_page(browser, size, "/training")
    store_day(pg, YESTERDAY_ISO, 60, ["intra-carb", "intra-salt-0-20"])
    pg.goto(BASE + f"/training?date={YESTERDAY_ISO}")
    pg.wait_for_load_state("networkidle")
    pg.wait_for_selector("input[aria-label='Tinh bột nhanh']:visible")
    past = [c for c in training_checks(pg)]
    carb = next((c for c in past if c["label"] == "Tinh bột nhanh"), None)
    check(carb is not None and carb["checked"], f"{label}: a past day shows its saved tick as checked")
    check(carb is not None and carb["disabled"], f"{label}: a past day's tick is disabled")
    check(all(c["disabled"] for c in past), f"{label}: every tick on a past day is disabled")
    check(
        pg.locator("input[aria-label='Muối · phút 0–20']:visible").first.is_checked(),
        f"{label}: a saved salt tick on a past day shows as checked",
    )
    chips = [c for c in chip_report(pg) if c["visible"]]
    check(chips and all(pg.locator("[role=group][aria-label='Thời gian tập'] button").nth(i).is_disabled() for i in range(5)), f"{label}: past day chips are disabled")
    check(pg.locator("text=Tick đã lưu của ngày này").count() >= 1, f"{label}: a past day says its ticks are saved")
    check(pg.locator("text=Chỉ xem").count() >= 1, f"{label}: a past day is marked read only")
    no_horizontal_scroll(pg, f"{label} past")
    check(not errors, f"{label}: no console errors on a past day ({errors[:2]})")
    context.close()

    # A day with no record: no checklist, the note says no duration was saved
    context, pg, errors = open_page(browser, size, "/training")
    pg.goto(BASE + f"/training?date={OLD_ISO}")
    pg.wait_for_load_state("networkidle")
    pg.wait_for_timeout(300)
    check(pg.locator("input[aria-label='Tinh bột nhanh']").count() == 0, f"{label}: a day with no record shows no checklist")
    check(pg.locator("text=chưa có thời lượng tập đã ghi").count() >= 1, f"{label}: a day with no record says no duration was saved")
    check(not any(c["checked"] for c in training_checks(pg)), f"{label}: a day with no record has nothing ticked")
    context.close()


def header_box(pg):
    return pg.evaluate(
        """() => {
            const header = document.querySelector('[data-align-container="micros-page"] header');
            const list = document.querySelector('[data-align-container="micros-page"] .overflow-y-auto');
            const r = header.getBoundingClientRect();
            return {
                height: r.height, text: header.innerText,
                listTop: list ? list.offsetTop : null, listScroll: list ? list.scrollTop : null,
            };
        }"""
    )


def check_micros_phone(browser):
    label = "micros 390"
    context, pg, errors = open_page(browser, PHONE, "/micros")
    pg.wait_for_selector("text=Thiếu nhiều nhất")
    pg.wait_for_timeout(300)

    rest = header_box(pg)
    check(rest["height"] <= PHONE["height"] / 3, f"{label}: header at rest is under a third of the screen ({rest['height']:.0f} px)")
    check("Thiếu nhiều nhất" in rest["text"], f"{label}: header at rest shows the summary")
    check("Xu hướng 7 và 30 ngày" in rest["text"], f"{label}: header at rest shows the trends link")

    # Put a list card on screen and remember where it is; the fold must not move it
    anchor = "#group-minerals"
    pg.evaluate(
        """(top) => { const l = document.querySelector('[data-align-container="micros-page"] .overflow-y-auto'); l.scrollTop = top - 4; }""",
        rest["listTop"],
    )
    pg.wait_for_timeout(250)
    y_before = pg.evaluate("(sel) => document.querySelector(sel).getBoundingClientRect().top", anchor)
    pg.evaluate("(top) => { const l = document.querySelector('[data-align-container=\"micros-page\"] .overflow-y-auto'); l.scrollTop = top; }", rest["listTop"])
    pg.wait_for_timeout(400)
    folded = header_box(pg)
    y_after = pg.evaluate("(sel) => document.querySelector(sel).getBoundingClientRect().top", anchor)
    check(folded["height"] < rest["height"] - 60, f"{label}: header folds once the list scrolls past it ({rest['height']:.0f} → {folded['height']:.0f} px)")
    check(folded["height"] <= PHONE["height"] / 3, f"{label}: folded header is under a third of the screen")
    check("vi chất đã đạt" in folded["text"], f"{label}: folded header keeps the 8/22 count")
    check("Xu hướng 7 và 30 ngày" not in folded["text"], f"{label}: folded header hides the trends link")
    check("VI CHẤT" in folded["text"].upper(), f"{label}: folded header keeps the title")
    # 4 px of list scroll moves the card up by 4 px; the fold itself adds no shift
    check(abs((y_after - y_before) + 4) <= 2, f"{label}: the list does not jump when the header folds (card moved {y_after - y_before:+.1f} px, expected -4)")

    pg.screenshot(path=os.path.join(SHOTS, "cc-17-micros-scrolled-390.png"), animations="disabled")
    pg.evaluate("(top) => { const l = document.querySelector('[data-align-container=\"micros-page\"] .overflow-y-auto'); l.scrollTop = 0; }", rest["listTop"])
    pg.wait_for_timeout(400)
    back = header_box(pg)
    check(abs(back["height"] - rest["height"]) <= 2, f"{label}: header unfolds at the top of the list ({back['height']:.0f} px)")

    pg.screenshot(path=os.path.join(SHOTS, "cc-17-micros-top-390.png"), animations="disabled")
    no_horizontal_scroll(pg, label)
    check(not errors, f"{label}: no console errors ({errors[:2]})")
    context.close()


def check_micros_desktop(browser):
    label = "micros 1280"
    context, pg, errors = open_page(browser, DESKTOP, "/micros")
    pg.wait_for_selector("[data-align-container='micros-desktop']")
    pg.wait_for_timeout(300)
    pg.screenshot(path=os.path.join(SHOTS, "cc-17-micros-top-1280.png"), animations="disabled")
    pg.evaluate("() => window.scrollTo(0, 400)")
    pg.wait_for_timeout(300)
    pg.screenshot(path=os.path.join(SHOTS, "cc-17-micros-scrolled-1280.png"), animations="disabled")
    no_horizontal_scroll(pg, label)
    check(not errors, f"{label}: no console errors ({errors[:2]})")
    context.close()


def main():
    os.makedirs(SHOTS, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch()
        check_training(browser, "390", PHONE)
        check_training(browser, "1280", DESKTOP)
        check_micros_phone(browser)
        check_micros_desktop(browser)
        browser.close()

    for line in notes:
        print(line)
    for line in problems:
        print("[FAIL] " + line)
    print(f"cc-17: {len(notes)} ok, {len(problems)} FAIL")
    sys.exit(1 if problems else 0)


if __name__ == "__main__":
    main()
