"""cc-07: Micros group chips scroll only the list. Header, chip bar and page stay put (390 and 1440).
Run with: ALIGN_BASE_URL=http://localhost:3101 npm run probe -- tests/probes/cc07.py
"""
import os
import sys

from playwright.sync_api import sync_playwright
import _demo  # noqa: F401  (cc2-15b: demo mode on, see _demo.py)

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3100")
SHOTS = os.path.join(os.path.dirname(__file__), "..", "..", ".screenshots")
PHONE = {"width": 390, "height": 844}
DESKTOP = {"width": 1440, "height": 900}
KEYS = ["vitamins", "minerals", "protein", "lipids", "carbs", "general"]
problems = []
notes = []


def check(cond, msg):
    if cond:
        notes.append("ok: " + msg)
    else:
        problems.append(msg)


# Phone: header, chip bar, list body, group header (sticky) and page scroll positions
PHONE_STATE = """(key) => {
    const wrap = document.querySelector('[data-align-container="micros-page"]');
    const header = wrap.querySelector('header').getBoundingClientRect();
    const chipsRow = wrap.querySelector('.overflow-x-auto');
    const chipBar = chipsRow.parentElement.getBoundingClientRect();
    const list = wrap.querySelector('.overflow-y-auto');
    const listRect = list.getBoundingClientRect();
    // The summary is "đã đạt mục tiêu", or "8/22 vi chất đã đạt" once the header folds on scroll (cc-17)
    const summary = [...wrap.querySelectorAll('header div')].find(d => d.childElementCount === 0 && d.textContent.includes('đã đạt'));
    const sum = summary.getBoundingClientRect();
    const section = document.getElementById('group-' + key);
    const stickyTop = section.firstElementChild.getBoundingClientRect().top;
    const lastRow = document.querySelector('#group-general .divide-y > :last-child');
    const dock = wrap.querySelector('.fixed.bottom-0').getBoundingClientRect();
    // cc-27c: once the full header has scrolled away a compact 60 px bar is at the top and the chips stick under it
    const bar = wrap.querySelector('[data-micros-compact]');
    const barRect = bar.getBoundingClientRect();
    return {
        barShown: bar.dataset.microsCompact === 'shown', barTop: barRect.top, barBottom: barRect.bottom, chipBarHeight: chipBar.height,
        headerTop: header.top, headerBottom: header.bottom,
        chipBarTop: chipBar.top, chipBarBottom: chipBar.bottom,
        summaryTop: sum.top, summaryBottom: sum.bottom,
        listTop: listRect.top, listBottom: listRect.bottom,
        listScroll: list.scrollTop, listMax: list.scrollHeight - list.clientHeight,
        wrapScroll: wrap.scrollTop, winScroll: window.scrollY,
        stickyTop,
        lastRowBottom: lastRow ? lastRow.getBoundingClientRect().bottom : null,
        dockTop: dock.top,
        pressed: [...wrap.querySelectorAll('button[aria-pressed]')].map(b => b.getAttribute('aria-pressed')),
    };
}"""

# Desktop: the page scrolls (window); the group section should land near the top of the viewport
DESKTOP_STATE = """(key) => {
    const section = document.getElementById('desktop-group-' + key);
    const wrap = document.querySelector('[data-align-container="micros-page"]');
    return {
        sectionTop: section.getBoundingClientRect().top,
        winScroll: window.scrollY,
        winMax: document.documentElement.scrollHeight - window.innerHeight,
        mobileVisible: wrap.offsetParent !== null,
        pressed: [...document.querySelectorAll('[data-align-container="micros-desktop"] button[aria-pressed]')].map(b => b.getAttribute('aria-pressed')),
    };
}"""


def list_center(pg):
    box = pg.locator('[data-align-container="micros-page"] .overflow-y-auto').bounding_box()
    return box["x"] + box["width"] / 2, box["y"] + box["height"] / 2


def run_phone(browser):
    ctx = browser.new_context(viewport=PHONE)
    pg = ctx.new_page()
    pg.goto(BASE + "/micros", wait_until="networkidle")
    pg.wait_for_timeout(800)
    chips = pg.locator('[data-align-container="micros-page"] button[aria-pressed]')
    check(chips.count() == 6, f"390: six group chips ({chips.count()})")

    for i, key in enumerate(KEYS):
        chips.nth(i).click()
        pg.wait_for_timeout(1200)
        s = pg.evaluate(PHONE_STATE, key)
        tag = f"390 tap {key}"
        check(s["barShown"] and abs(s["barTop"]) < 1, f"{tag}: compact bar is at the top of the screen ({s['barTop']:.1f})")
        check(abs(s["chipBarTop"] - s["barBottom"]) < 1, f"{tag}: chip bar sits right under the compact bar ({s['chipBarTop']:.1f} vs {s['barBottom']:.1f})")
        check(s["wrapScroll"] == 0, f"{tag}: wrapper scrollTop is 0 ({s['wrapScroll']})")
        check(s["winScroll"] == 0, f"{tag}: window.scrollY is 0 ({s['winScroll']})")
        check(-1 <= s["stickyTop"] - s["chipBarBottom"] <= 10 or s["listScroll"] >= s["listMax"] - 2,
              f"{tag}: group header right under the chip bar ({s['stickyTop']:.1f} vs {s['chipBarBottom']:.1f})")
        check(s["pressed"][i] == "true" and s["pressed"].count("true") == 1, f"{tag}: only the tapped chip is active ({s['pressed']})")
        if key == "minerals":
            pg.screenshot(path=os.path.join(SHOTS, "cc07-after-tap-khoang-chat-390.png"), animations="disabled")
        if key == "general":
            pg.screenshot(path=os.path.join(SHOTS, "cc07-after-tap-tong-quan-390.png"), animations="disabled")

        # Scroll the list back up with the wheel: header and summary must stay fully visible
        cx, cy = list_center(pg)
        pg.mouse.move(cx, cy)
        pg.mouse.wheel(0, -6000)
        pg.wait_for_timeout(800)
        s = pg.evaluate(PHONE_STATE, key)
        check(s["listScroll"] == 0, f"{tag}: list scrolls back to top ({s['listScroll']})")
        check(abs(s["headerTop"]) < 1 and s["summaryTop"] >= s["headerTop"] and s["summaryBottom"] <= s["headerBottom"] + 1,
              f"{tag}: after scrolling up, header and summary fully visible")
        check(abs(s["chipBarTop"] - s["headerBottom"]) < 1, f"{tag}: after scrolling up, chip bar still under header")
        if key == "minerals":
            pg.screenshot(path=os.path.join(SHOTS, "cc07-scrolled-top-390.png"), animations="disabled")

    # Tổng quan: scroll to the end, last row must sit above the bottom nav
    chips.nth(5).click()
    pg.wait_for_timeout(1200)
    cx, cy = list_center(pg)
    pg.mouse.move(cx, cy)
    pg.mouse.wheel(0, 20000)
    pg.wait_for_timeout(800)
    s = pg.evaluate(PHONE_STATE, "general")
    check(s["listScroll"] >= s["listMax"] - 2, f"390 end: list reaches the end ({s['listScroll']:.0f}/{s['listMax']:.0f})")
    check(s["lastRowBottom"] is not None and s["lastRowBottom"] <= s["dockTop"] + 1,
          f"390 end: last row is above the bottom nav ({s['lastRowBottom']} vs dock {s['dockTop']})")
    check(s["wrapScroll"] == 0 and s["winScroll"] == 0, f"390 end: page did not scroll ({s['wrapScroll']}, {s['winScroll']})")
    ctx.close()


def run_desktop(browser):
    ctx = browser.new_context(viewport=DESKTOP)
    pg = ctx.new_page()
    pg.goto(BASE + "/micros", wait_until="networkidle")
    pg.wait_for_timeout(800)
    chips = pg.locator('[data-align-container="micros-desktop"] button[aria-pressed]')
    check(chips.count() == 6, f"1440: six group chips ({chips.count()})")
    for i, key in enumerate(KEYS):
        chips.nth(i).click()
        pg.wait_for_timeout(1200)
        s = pg.evaluate(DESKTOP_STATE, key)
        tag = f"1440 tap {key}"
        check(not s["mobileVisible"], f"{tag}: phone wrapper is hidden")
        check(s["pressed"][i] == "true", f"{tag}: tapped chip is active ({s['pressed']})")
        # scroll-mt-6 leaves 24 px above the group; at the very bottom the page cannot scroll further
        check(0 <= s["sectionTop"] <= 60 or s["winScroll"] >= s["winMax"] - 2,
              f"{tag}: group lands at top of viewport ({s['sectionTop']:.1f})")
    ctx.close()


def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        run_phone(browser)
        run_desktop(browser)
        browser.close()


if __name__ == "__main__":
    run()
    print("\n".join(notes))
    print("PROBLEMS:", problems or "none")
    sys.exit(1 if problems else 0)
