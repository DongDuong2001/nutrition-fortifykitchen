"""cc-12: design parity sweep. For each screen, open our page at 390 and 1440 (screenshot + rendered text) and compare the
static copy of the matching design file (design/screens/<Name>.dc.html) with our rendered text. Design lines our page
does not show are written to .screenshots/cc12-copy-report.txt. The design files are templates (they need their
support.js runtime, which is not in the repo), so only their static copy is compared here; layout is compared by reading
the design source.
Run with: ALIGN_BASE_URL=http://localhost:3101 npm run probe -- tests/probes/cc12.py
"""
import datetime
import os
import re
import sys

from playwright.sync_api import sync_playwright
import _demo  # noqa: F401  (cc2-15b: demo mode on, see _demo.py)

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3100")
HERE = os.path.dirname(__file__)
SHOTS = os.path.join(HERE, "..", "..", ".screenshots")
DESIGN = os.path.join(HERE, "..", "..", "..", "..", "design", "screens")
PHONE = {"width": 390, "height": 844}
DESKTOP = {"width": 1440, "height": 900}
VN = datetime.timezone(datetime.timedelta(hours=7))
YESTERDAY = (datetime.datetime.now(VN).date() - datetime.timedelta(days=1)).isoformat()
SAMPLE_EDITS_EMPTY = "{" + ",".join(f'"item-{i}":{{"deleted":true}}' for i in range(1, 13)) + "}"
os.makedirs(SHOTS, exist_ok=True)


def norm(s):
    return re.sub(r"\s+", " ", s.replace(" ", " ")).strip().lower()


def design_lines(browser, filename):
    """Static copy from a design file: rendered body text minus template and code lines."""
    page = browser.new_page(viewport=PHONE)
    page.goto("file://" + os.path.abspath(os.path.join(DESIGN, filename)), wait_until="load")
    text = page.inner_text("body")
    page.close()
    lines = []
    for raw in text.split("\n"):
        line = raw.strip()
        if len(line) < 3 or re.search(r"[{};]|=>|\bconst\b|\breturn\b|:\s*'", line):
            continue
        lines.append(line)
    return lines


def go(path):
    def run(pg):
        pg.goto(BASE + path, wait_until="networkidle")
        pg.wait_for_timeout(400)
    return run


def empty_today(pg):
    """The sample day deleted (as cc_22 does); the demo history keeps yesterday."""
    pg.add_init_script(
        f"try {{ localStorage.setItem('h1t_sample_edits_v1_demo', {SAMPLE_EDITS_EMPTY!r}); }} catch (e) {{}}"
    )


def go_empty_today(pg):
    empty_today(pg)
    pg.goto(BASE + "/", wait_until="networkidle")
    pg.wait_for_timeout(400)


def add_chà_là_then_today(pg):
    # Design TodayAdded: toast "Đã thêm Chà là 30 g vào Trước tập" on Today
    pg.goto(BASE + "/add?meal=pre_workout", wait_until="networkidle")
    # the add sheet's result row (the home rows under it are buttons too): the one with kcal in it
    pg.locator('button:has-text("Chà là"):has-text("kcal") >> visible=true').first.click()
    pg.locator('button:has-text("Thêm vào Trước tập") >> visible=true').first.click()
    pg.wait_for_url(re.compile(r".*/(\?.*)?$"), timeout=8000)
    pg.wait_for_timeout(400)


def search_empty(pg):
    pg.goto(BASE + "/add?meal=dinner", wait_until="networkidle")
    box = pg.locator('input[aria-label="Tìm món"] >> visible=true').first
    box.fill("bánh tráng trộn")
    pg.wait_for_timeout(400)


def micros_vitamins(pg):
    pg.goto(BASE + "/micros", wait_until="networkidle")
    pg.locator('button:has-text("Vitamin ·") >> visible=true').first.click()
    pg.wait_for_timeout(400)


def copy_yesterday(pg):
    empty_today(pg)
    pg.goto(BASE + "/", wait_until="networkidle")
    pg.locator("section[aria-label='Tổng kcal và dinh dưỡng đa lượng'] >> visible=true").first.wait_for(state="visible", timeout=8000)
    pg.locator('button:has-text("Chép hôm qua") >> visible=true').first.click(timeout=8000)
    pg.wait_for_timeout(400)


def calendar(pg):
    pg.goto(BASE + "/", wait_until="networkidle")
    pg.locator('button[aria-label^="Chọn ngày"] >> visible=true').first.click()
    pg.wait_for_timeout(400)


def meal_switcher(pg):
    pg.goto(BASE + "/add?meal=dinner", wait_until="networkidle")
    pg.locator('button[aria-haspopup="listbox"] >> visible=true').first.click(timeout=8000)
    pg.wait_for_timeout(400)


def loading(pg):
    pg.goto(BASE + "/?loading=1", wait_until="networkidle")
    pg.wait_for_timeout(300)


def offline(pg):
    pg.goto(BASE + "/?offline=1", wait_until="networkidle")
    pg.wait_for_timeout(300)


# (name, setup, design phone file, design desktop file or None)
SCREENS = [
    ("EmptyToday", go_empty_today, "EmptyToday.dc.html", None),
    ("TodayAdded", add_chà_là_then_today, "TodayAdded.dc.html", None),
    ("TodayStates-loading", loading, "TodayStates.dc.html", None),
    ("TodayStates-offline", offline, "TodayStates.dc.html", None),
    ("Today", go("/"), "Today.dc.html", "DesktopToday.dc.html"),
    ("Micros", go("/micros"), "Micros.dc.html", "DesktopMicros.dc.html"),
    ("MicrosVitamins", micros_vitamins, "MicrosVitamins.dc.html", "DesktopMicros.dc.html"),
    ("NutrientDetail", go("/micros/calcium"), "NutrientDetail.dc.html", None),
    ("AddFood", go("/add?meal=dinner"), "AddFood.dc.html", "DesktopAddFood.dc.html"),
    ("SearchEmpty", search_empty, "SearchEmpty.dc.html", None),
    ("FoodDetail", go("/foods/food-cha-la"), "FoodDetail.dc.html", None),
    ("CreateFood", go("/foods/new"), "CreateFood.dc.html", None),
    ("EditEntry", go("/entry/item-5"), "EditEntry.dc.html", None),
    ("MealSwitcher", meal_switcher, "MealSwitcher.dc.html", None),
    ("CopyYesterday", copy_yesterday, "CopyYesterday.dc.html", None),
    ("CalendarPicker", calendar, "CalendarPicker.dc.html", None),
    ("PastDay", go(f"/?date={YESTERDAY}"), "PastDay.dc.html", None),
    ("Profile", go("/settings/profile"), "Profile.dc.html", "DesktopProfile.dc.html"),
    ("EditWeight", go("/settings/profile/weight"), "EditWeight.dc.html", None),
    ("SetupProfile", go("/setup/profile"), "SetupProfile.dc.html", "DesktopSetup.dc.html"),
    ("SetupGoal", go("/setup/goal"), "SetupGoal.dc.html", "DesktopSetup.dc.html"),
    ("SignUp", go("/signup"), "SignUp.dc.html", "DesktopSignUp.dc.html"),
    ("SignIn", go("/signin"), "SignIn.dc.html", None),
    ("CheckEmail", go("/signin/check-email"), "CheckEmail.dc.html", None),
    ("LinkExpired", go("/signin/expired"), "LinkExpired.dc.html", None),
]


def capture(browser, setup, viewport, name):
    context = browser.new_context(viewport=viewport)
    page = context.new_page()
    setup(page)
    page.wait_for_timeout(300)
    shot = os.path.join(SHOTS, f"cc12-{name}-{viewport['width']}.png")
    page.screenshot(path=shot, full_page=True)
    text = norm(page.inner_text("body"))
    context.close()
    return text, shot


def check_calendar(browser):
    """The calendar is a centred dialog at 1440, a bottom sheet at 390. Esc closes it and focus returns to the date."""
    problems = []
    for viewport, label in [(DESKTOP, "1440"), (PHONE, "390")]:
        context = browser.new_context(viewport=viewport)
        page = context.new_page()
        page.goto(BASE + "/", wait_until="networkidle")
        opener = page.locator('button[aria-label^="Chọn ngày"] >> visible=true').first
        opener.wait_for(state="visible", timeout=8000)
        opener.click()
        dialog = page.get_by_role("dialog", name="Chọn ngày")
        dialog.wait_for(state="visible", timeout=8000)
        box = dialog.bounding_box()
        centre_x = box["x"] + box["width"] / 2
        if label == "1440":
            if abs(centre_x - viewport["width"] / 2) > 4 or box["y"] < 40 or box["y"] + box["height"] > viewport["height"] - 40:
                problems.append(f"{label}: calendar is not a centred dialog ({box})")
        elif abs(box["y"] + box["height"] - viewport["height"]) > 2:
            problems.append(f"{label}: calendar is not a bottom sheet ({box})")
        page.screenshot(path=os.path.join(SHOTS, f"cc12-CalendarPicker-{label}.png"))
        page.keyboard.press("Escape")
        dialog.wait_for(state="detached", timeout=8000)
        focused = page.evaluate("document.activeElement && document.activeElement.getAttribute('aria-label')")
        if not (focused or "").startswith("Chọn ngày"):
            problems.append(f"{label}: focus after Esc is on {focused!r}, not the date")
        context.close()
    print("calendar check:", "pass" if not problems else "FAIL")
    for line in problems:
        print("  -", line)
    return problems


def main():
    report = []
    with sync_playwright() as p:
        browser = p.chromium.launch()
        calendar_problems = check_calendar(browser)
        for name, setup, phone_design, desktop_design in SCREENS:
            for width_name, viewport, design in [("390", PHONE, phone_design), ("1440", DESKTOP, desktop_design)]:
                if design is None:
                    if width_name == "1440":
                        # No desktop design: capture our 1440 layout only
                        capture(browser, setup, viewport, name)
                    continue
                ours, shot = capture(browser, setup, viewport, name)
                missing = [line for line in design_lines(browser, design) if norm(line) not in ours]
                status = f"{len(missing)} missing" if missing else "all copy present"
                print(f"[{name} {width_name}] {status} ({design}) -> {os.path.basename(shot)}")
                for line in missing:
                    report.append(f"[{name} {width_name}] {line}")
        browser.close()
    report_path = os.path.join(SHOTS, "cc12-copy-report.txt")
    with open(report_path, "w", encoding="utf-8") as fh:
        fh.write("\n".join(report) + "\n")
    print(f"report: {report_path} ({len(report)} lines)")
    return 1 if calendar_problems else 0


if __name__ == "__main__":
    sys.exit(main())
