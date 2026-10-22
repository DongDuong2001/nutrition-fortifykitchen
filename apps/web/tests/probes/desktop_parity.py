"""desktop_parity: the desktop gaps a keyboard-and-mouse user hits that a phone never does (demo build, Chromium).

a  1440x900  Esc closes the + dialog (/add opened from the sidebar's Thêm món, #desktop-add-btn) and the focus returns to the opener.
b  1440x900  Esc closes the share sheet (Chia sẻ on Hôm nay; Esc at the name step too) and the focus returns to the opener.
c  1440x900  A food is deleted without a swipe: the row, Sửa món này, Xóa món này -> "Đã xóa ..." and one row fewer. Also ⋯ -> Chọn nhiều món,
             tick a row, Xóa: one row fewer and the focus lands on #home-day-menu, not the body.
d  1440x900  Esc leaves Chọn nhiều món (the select header's Hủy is gone, the normal header is back, the focus is on #home-day-menu).
e  1440x900  The wheel over the food page's nutrient list scrolls (the window or the scrolling ancestor moves).
f  1280x800  With 2 foods in the + dialog's tray, the tray's add button sits inside the dialog and inside the 800 px viewport.
g  1280x800  /micros after a 600 px wheel: the sidebar's nav is still in view (aside top >= 0).
h  1440x900  /explore: a "xem tiếp" button exists and pages its list (scrollLeft grows); at 390 the buttons are not visible.
i  1440x900  /explore: hovering a food card tints it (::after opacity > 0).
j  1440x900  /settings/profile: Năm sinh opens with the year selected; "1990" then Esc puts the year back and the focus returns to the row.
Screenshots of a, c, f, g, h (f at 1280 too) go to docs/screenshots/overnight-1023/desktop/.
Run with: ALIGN_BASE_URL=http://localhost:3180 npm run probe -- tests/probes/desktop_parity.py
"""
# PROBE_COVERS: components/ui/carousel.tsx components/ui/desktop-sidebar.tsx components/home/** components/add/** components/settings/profile-cards.tsx components/foods/** app/globals.css app/(app)/foods/** app/(app)/explore/** app/(app)/micros/**
import json
import os
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright
import _demo  # noqa: F401  (demo mode, tour and tips off)

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3100")
NOW = "2026-10-15T10:00:00+07:00"
SHOTS = Path(__file__).resolve().parents[4] / "docs" / "screenshots" / "overnight-1023" / "desktop"
SEED = {"installPrompt": {"dismissCount": 0, "snoozeUntil": 0, "done": True, "firstSeenIso": "2026-01-01"}}
D1440 = {"width": 1440, "height": 900}
D1280 = {"width": 1280, "height": 800}
problems = []


def check(cond, msg):
    print(("[PASS] " if cond else "[FAIL] ") + msg, flush=True)
    if not cond:
        problems.append(msg)


def new_page(browser, size):
    ctx = browser.new_context(viewport=size, reduced_motion="reduce")
    ctx.add_init_script("try { localStorage.setItem('h1t_settings_v1_demo', %r) } catch (e) {}" % json.dumps(SEED))
    pg = ctx.new_page()
    pg.clock.set_fixed_time(NOW)
    return ctx, pg


def settle(pg, ms=800):
    try:
        pg.wait_for_load_state("networkidle", timeout=5000)
    except Exception:
        pass
    pg.wait_for_timeout(ms)


def open_home(pg):
    pg.goto(BASE + "/app", wait_until="load")
    pg.locator("#desktop-add-btn").wait_for(state="visible", timeout=15000)
    pg.locator("button[data-entry-id]").first.wait_for(state="visible", timeout=15000)
    settle(pg)


def rows(pg):
    return pg.evaluate("[...document.querySelectorAll('button[data-entry-id]')].filter((e) => e.getClientRects().length).length")


def active_id(pg):
    return pg.evaluate("(() => { const a = document.activeElement; return a ? (a.id || a.tagName.toLowerCase()) : null })()")


def dialog_open(pg):
    return pg.locator('[role="dialog"]:visible').count() > 0


def shot(pg, name):
    SHOTS.mkdir(parents=True, exist_ok=True)
    pg.screenshot(path=str(SHOTS / name))


def select_header_gone(pg):
    # the select header's Hủy button
    return pg.get_by_role("button", name="Hủy", exact=True).filter(visible=True).count() == 0


def enter_select(pg):
    pg.locator("#home-day-menu").click()
    pg.get_by_role("button", name="Chọn nhiều món").click()
    pg.get_by_role("button", name="Hủy", exact=True).first.wait_for(state="visible", timeout=5000)
    pg.wait_for_timeout(300)


def part_a(b):
    ctx, pg = new_page(b, D1440)
    open_home(pg)
    pg.locator("#desktop-add-btn").click()
    pg.locator('[role="dialog"]').first.wait_for(state="visible", timeout=8000)
    settle(pg, 600)
    shot(pg, "a-add-dialog-1440.png")
    check(dialog_open(pg), "a: the + dialog is open from #desktop-add-btn")
    pg.keyboard.press("Escape")
    pg.wait_for_timeout(700)
    check(not dialog_open(pg), "a: Esc closes the + dialog")
    check(active_id(pg) == "desktop-add-btn", f"a: the focus returns to the opener (is {active_id(pg)})")
    ctx.close()


def part_b(b):
    ctx, pg = new_page(b, D1440)
    open_home(pg)
    opener = pg.get_by_role("button", name="Chia sẻ ngày này")
    opener.focus()
    opener.click()
    pg.locator('[role="dialog"]').first.wait_for(state="visible", timeout=8000)
    pg.wait_for_timeout(500)
    named = pg.locator("#share-name").count() > 0
    print(f"       share sheet opens at the {'name' if named else 'image'} step")
    pg.keyboard.press("Escape")
    pg.wait_for_timeout(700)
    check(not dialog_open(pg), "b: Esc closes the share sheet")
    now = pg.evaluate("(() => { const a = document.activeElement; return a ? a.getAttribute('aria-label') : null })()")
    check(now == "Chia sẻ ngày này", f"b: the focus returns to Chia sẻ (is {now})")
    ctx.close()


def part_cd(b):
    # c1: the row, Sửa món này, Xóa món này
    ctx, pg = new_page(b, D1440)
    open_home(pg)
    before = rows(pg)
    pg.locator("button[data-entry-id]").filter(visible=True).first.click()
    pg.wait_for_timeout(500)
    pg.get_by_role("link", name="Sửa món này").click()
    pg.get_by_role("button", name="Xóa món này").wait_for(state="visible", timeout=10000)
    settle(pg, 500)
    pg.get_by_role("button", name="Xóa món này").click()
    pg.locator("button[data-entry-id]").first.wait_for(state="visible", timeout=10000)
    toast = pg.locator(".m-toast", has_text="Đã xóa").first
    try:
        toast.wait_for(state="visible", timeout=6000)
        ok = True
    except Exception:
        ok = False
    settle(pg, 600)
    check(ok, "c: the toast \"Đã xóa ...\" shows after Xóa món này")
    shot(pg, "c-delete-toast-1440.png")
    after = rows(pg)
    check(after == before - 1, f"c: the row count drops by 1 ({before} -> {after})")
    ctx.close()

    # c2: select mode, tick one, Xóa
    ctx, pg = new_page(b, D1440)
    open_home(pg)
    before = rows(pg)
    enter_select(pg)
    pg.get_by_role("checkbox").filter(visible=True).first.click()
    pg.wait_for_timeout(300)
    pg.get_by_role("button", name="Xóa", exact=True).click()
    pg.wait_for_timeout(800)
    # a confirm sheet may stand between Xóa and the delete
    dlg = pg.locator('[role="dialog"]:visible')
    if dlg.count():
        for label in ("Xóa", "Xác nhận", "Đồng ý"):
            btn = dlg.get_by_role("button", name=label, exact=False)
            if btn.count():
                btn.first.click()
                break
        pg.wait_for_timeout(800)
    settle(pg, 600)
    after = rows(pg)
    check(after == before - 1, f"c: select mode, Xóa: the row count drops by 1 ({before} -> {after})")
    check(select_header_gone(pg), "c: select mode has ended after Xóa")
    check(active_id(pg) == "home-day-menu", f"c: the focus lands on #home-day-menu after Xóa (is {active_id(pg)})")
    ctx.close()

    # d: Esc leaves select mode
    ctx, pg = new_page(b, D1440)
    open_home(pg)
    enter_select(pg)
    check(not select_header_gone(pg), "d: select mode is on (the header shows Hủy)")
    pg.keyboard.press("Escape")
    pg.wait_for_timeout(600)
    check(select_header_gone(pg), "d: Esc: the select header's Hủy is gone")
    check(pg.locator("#home-day-menu").is_visible(), "d: the normal header is back (⋯ Tùy chọn ngày)")
    check(active_id(pg) == "home-day-menu", f"d: the focus is on #home-day-menu (is {active_id(pg)})")
    ctx.close()


SCROLL_STATE = r"""() => {
  const out = { y: window.scrollY, anc: [] };
  document.querySelectorAll('*').forEach((el) => {
    if (el.scrollHeight > el.clientHeight + 1 && ['auto', 'scroll'].includes(getComputedStyle(el).overflowY)) out.anc.push([el.tagName + (el.id ? '#' + el.id : ''), el.scrollTop]);
  });
  return out;
}"""


def part_e(b):
    ctx, pg = new_page(b, D1440)
    pg.goto(BASE + "/foods/food-uc-ga", wait_until="load")
    pg.locator("h1").first.wait_for(state="visible", timeout=15000)
    settle(pg)
    # the nutrient / micro list: the first row of a list of nutrient names that is on screen
    target = pg.locator("[data-nutrient-list], [data-micro-list], [aria-label*='vi chất' i] li, section li").filter(visible=True).first
    box = target.bounding_box()
    check(box is not None, "e: a nutrient list row is on the food page")
    if not box:
        ctx.close()
        return
    before = pg.evaluate(SCROLL_STATE)
    pg.mouse.move(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2)
    pg.mouse.wheel(0, 600)
    pg.wait_for_timeout(800)
    after = pg.evaluate(SCROLL_STATE)
    moved = after["y"] > before["y"] or any(a[1] > dict(before["anc"]).get(a[0], 0) for a in after["anc"])
    check(moved, f"e: the wheel over the nutrient list scrolls (window {before['y']} -> {after['y']}, scrollers {before['anc']} -> {after['anc']})")
    ctx.close()


def part_f(b):
    ctx, pg = new_page(b, D1280)
    open_home(pg)
    pg.locator("#desktop-add-btn").click()
    dlg = pg.locator('[role="dialog"]').first
    dlg.wait_for(state="visible", timeout=8000)
    pg.locator("[data-testid=food-search]").first.wait_for(state="visible", timeout=8000)
    settle(pg, 600)
    toggles = dlg.locator("[data-testid=tray-toggle]").filter(visible=True)
    toggles.first.wait_for(state="visible", timeout=8000)
    for i in range(2):
        toggles.nth(i).click()
        pg.wait_for_timeout(400)
    add = pg.locator("[data-testid=tray-add]").first
    add.wait_for(state="visible", timeout=5000)
    settle(pg, 400)
    ab = add.bounding_box()
    db = dlg.bounding_box()
    shot(pg, "f-tray-in-view-1280.png")
    check(ab is not None and db is not None, "f: the tray add button and the dialog have boxes")
    if ab and db:
        a_bot, d_bot = ab["y"] + ab["height"], db["y"] + db["height"]
        check(a_bot <= d_bot + 0.5, f"f: tray-add bottom {a_bot:.1f} <= dialog bottom {d_bot:.1f}")
        check(a_bot <= 800, f"f: tray-add bottom {a_bot:.1f} <= 800")
    ctx.close()
    ctx, pg = new_page(b, D1440)
    open_home(pg)
    pg.locator("#desktop-add-btn").click()
    dlg = pg.locator('[role="dialog"]').first
    dlg.wait_for(state="visible", timeout=8000)
    pg.locator("[data-testid=food-search]").first.wait_for(state="visible", timeout=8000)
    settle(pg, 600)
    toggles = dlg.locator("[data-testid=tray-toggle]").filter(visible=True)
    for i in range(2):
        toggles.nth(i).click()
        pg.wait_for_timeout(400)
    pg.locator("[data-testid=tray-add]").first.wait_for(state="visible", timeout=5000)
    settle(pg, 400)
    shot(pg, "f-tray-in-view-1440.png")
    ab = pg.locator("[data-testid=tray-add]").first.bounding_box()
    db = dlg.bounding_box()
    check(ab["y"] + ab["height"] <= db["y"] + db["height"] + 0.5, "f: at 1440 the tray add button is also inside the dialog")
    ctx.close()


def part_g(b):
    ctx, pg = new_page(b, D1280)
    pg.goto(BASE + "/micros", wait_until="load")
    pg.locator("aside").first.wait_for(state="visible", timeout=15000)
    settle(pg)
    pg.mouse.move(700, 500)
    pg.mouse.wheel(0, 600)
    pg.wait_for_timeout(800)
    top = pg.evaluate("(() => { const a = document.querySelector('aside'); const n = a.querySelector('nav') || a; return [n.getBoundingClientRect().top, a.getBoundingClientRect().top, window.scrollY] })()")
    shot(pg, "g-sidebar-pinned-1280.png")
    check(top[2] > 0, f"g: the page scrolled (scrollY {top[2]})")
    check(top[0] >= 0 and top[1] >= 0, f"g: after the wheel the aside top is {top[1]:.1f} and its nav top {top[0]:.1f} (>= 0)")
    ctx.close()


def part_hi(b):
    ctx, pg = new_page(b, D1440)
    pg.goto(BASE + "/explore", wait_until="load")
    pg.locator("section ul[role=list]").first.wait_for(state="visible", timeout=15000)
    settle(pg)
    nxt = pg.get_by_role("button", name="xem tiếp").filter(visible=True)
    check(nxt.count() > 0, f"h: a \"xem tiếp\" button is on /explore at 1440 ({nxt.count()})")
    if nxt.count():
        btn = nxt.first
        label = btn.get_attribute("aria-label")
        sec = btn.locator("xpath=ancestor::section[1]")
        ul = sec.locator("ul[role=list]").first
        s0 = ul.evaluate("(e) => e.scrollLeft")
        btn.click()
        pg.wait_for_timeout(1000)
        s1 = ul.evaluate("(e) => e.scrollLeft")
        check(s1 > s0, f"h: clicking \"{label}\" scrolls its list ({s0:.0f} -> {s1:.0f})")
        prev = sec.get_by_role("button", name="xem trước")
        check(prev.count() == 1 and prev.get_attribute("aria-disabled") != "true", "h: after paging, \"xem trước\" is on")
        # aria-disabled, not disabled: at the row's end the focused button keeps focus (review, 23/10)
        prev.focus()
        prev.click()
        pg.wait_for_timeout(1000)
        check(prev.get_attribute("aria-disabled") == "true" and pg.evaluate("document.activeElement && document.activeElement.getAttribute('aria-label')") == prev.get_attribute("aria-label"),
              "h: back at the start, \"xem trước\" is off and still holds focus")
        sec.scroll_into_view_if_needed()
        pg.wait_for_timeout(300)
        shot(pg, "h-carousel-buttons-1440.png")
    # i: hover
    card = pg.locator("a.m-hover").filter(visible=True).first
    check(card.count() > 0, "i: a .m-hover card link is on /explore")
    if card.count():
        card.scroll_into_view_if_needed()
        o0 = card.evaluate("(e) => getComputedStyle(e, '::after').opacity")
        card.hover()
        pg.wait_for_timeout(600)
        o1 = card.evaluate("(e) => getComputedStyle(e, '::after').opacity")
        check(float(o1) > 0, f"i: hovering a card link: ::after opacity {o0} -> {o1} (> 0)")
    ctx.close()
    # h at 390: not visible
    ctx, pg = new_page(b, {"width": 390, "height": 844})
    pg.goto(BASE + "/explore", wait_until="load")
    pg.locator("section ul[role=list]").first.wait_for(state="visible", timeout=15000)
    settle(pg)
    vis = pg.get_by_role("button", name="xem tiếp").filter(visible=True).count() + pg.get_by_role("button", name="xem trước").filter(visible=True).count()
    check(vis == 0, f"h: at 390 no carousel button is visible ({vis})")
    ctx.close()


def part_j(b):
    ctx, pg = new_page(b, D1440)
    pg.goto(BASE + "/settings/profile", wait_until="load")
    trigger = pg.get_by_role("button", name="Năm sinh").first
    trigger.wait_for(state="visible", timeout=15000)
    settle(pg)
    trigger.click()
    field = pg.locator("#profile-birth-year, input[inputmode=numeric]").first
    field.wait_for(state="visible", timeout=5000)
    pg.wait_for_timeout(300)
    orig_value = field.input_value()
    sel = field.evaluate("(e) => [e.selectionStart, e.selectionEnd, e.value.length, document.activeElement === e]")
    check(sel[3] and sel[0] == 0 and sel[1] == sel[2] > 0, f"j: focusing Năm sinh selects the whole text (selection {sel[0]}-{sel[1]} of {sel[2]}, focused {sel[3]})")
    pg.keyboard.type("1990")
    check(field.input_value() == "1990", f"j: typing replaces the selected year (value {field.input_value()})")
    pg.keyboard.press("Escape")
    pg.wait_for_timeout(500)
    check(pg.locator("#profile-birth-year, input[inputmode=numeric]").count() == 0, "j: Esc closes the field")
    shown = pg.get_by_role("button", name="Năm sinh").first
    text = shown.inner_text()
    check(orig_value in text and "1990" not in text, f"j: the year is back to {orig_value} (row reads {text!r})")
    inside = pg.evaluate("(() => { const a = document.activeElement; return !!a && a.tagName === 'BUTTON' && /Năm sinh/.test(a.textContent || '') })()")
    check(inside, f"j: the focus returns to the Năm sinh row (is {active_id(pg)})")
    ctx.close()


def main():
    with sync_playwright() as p:
        b = p.chromium.launch()
        for name, fn in [("a", part_a), ("b", part_b), ("cd", part_cd), ("e", part_e), ("f", part_f), ("g", part_g), ("hi", part_hi), ("j", part_j)]:
            try:
                fn(b)
            except Exception as e:  # a part that cannot run is a failure of its own
                check(False, f"{name}: crashed: {str(e).splitlines()[0]}")
        b.close()
    print(f"\n{len(problems)} problem(s)")
    for m in problems:
        print("  - " + m)
    sys.exit(1 if problems else 0)


if __name__ == "__main__":
    main()
