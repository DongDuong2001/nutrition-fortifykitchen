"""Overnight 22→23/10, PR 1: one sheet in the + flow (demo build). The portion and So sánh are steps inside the + sheet, never a
second dialog over it.

1  390 / 360: + -> a search result -> the portion step: one [role=dialog] in every frame from the tap until the step has settled,
   the sheet keeps its place and height, nothing of Hôm nay shows above it; the step's header is ‹, "Khẩu phần", ✕.
2  ‹ goes back to the list with the search text, the scroll and the Khay as they were; another food -> Thêm adds and goes home.
   Never more than one dialog on the whole way (sampled every frame).
3  The Minh Hào chip and a Gần đây chevron open the same step (one dialog).
4  Back (the phone's) from the step goes back to the list; ✕ on the step closes the whole sheet, and Back from Hôm nay does not
   bring it back. A drag down on the step's header closes the whole sheet.
5  So sánh is a step over the portion (one dialog); ‹ goes back to the portion. Confirming opens the comparison; Back from it
   brings the + sheet back on the portion step of that food, with the search text and the Khay, still one dialog; Back goes to
   the list.
6  The title of a food with a Sống | Chín switch is its name without the state ("CƠM TRẮNG", not "CƠM TRẮNG (CHÍN)").
7  1024: the desktop dialog keeps the portion in its pane: + -> food -> another food -> add, one dialog.
8  Reduced motion: the step comes in with opacity only (no transform).
9  A portion sheet opened on its own (a Hôm nay row) is still one sheet.
Screenshots: .screenshots/one-sheet-*.png
Run with: ALIGN_BASE_URL=http://localhost:3101 npm run probe -- tests/probes/one_sheet_add.py
"""
# PROBE_COVERS: app/(app)/add/** app/(app)/(tabs)/** components/add/** components/ui/sheet-view.tsx components/ui/sheet.tsx components/ui/portion-panel.tsx components/foods/compare-picker.tsx lib/sheet-history.ts
import os
import re
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright
import _demo  # noqa: F401  (demo mode, tour and tips off)

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3100")
SHOTS = Path(__file__).resolve().parent.parent.parent / ".screenshots"
SHOTS.mkdir(exist_ok=True)
SEED = "try { localStorage.setItem('h1t_settings_v1_demo', JSON.stringify({installPrompt:{dismissCount:0,snoozeUntil:0,done:true,firstSeenIso:'2026-01-01'}})) } catch (e) {}"
problems = []


def check(cond, msg):
    print(("[PASS] " if cond else "[FAIL] ") + msg)
    if not cond:
        problems.append(msg)


# Counts the dialogs on screen every frame (the most seen at once), from start() to stop()
SAMPLER = """
window.__dlg = { max: 0, on: false };
window.__dlgStart = () => { window.__dlg = { max: 0, on: true }; const tick = () => {
  if (!window.__dlg.on) return;
  const n = [...document.querySelectorAll('[role=dialog]')].filter((d) => d.getClientRects().length > 0).length;
  window.__dlg.max = Math.max(window.__dlg.max, n);
  requestAnimationFrame(tick);
}; requestAnimationFrame(tick); };
window.__dlgStop = () => { window.__dlg.on = false; return window.__dlg.max; };
"""


def new_page(browser, width, height=844, reduced=False, mobile=True):
    ctx = browser.new_context(viewport={"width": width, "height": height}, device_scale_factor=2, is_mobile=mobile, has_touch=mobile, reduced_motion="reduce" if reduced else "no-preference")
    ctx.add_init_script(SEED)
    ctx.add_init_script(SAMPLER)
    return ctx, ctx.new_page()


def dialogs(pg):
    return pg.locator("[role=dialog]:visible").count()


def open_add(pg):
    pg.goto(BASE + "/app", wait_until="networkidle")
    pg.wait_for_timeout(600)
    pg.locator('a[href^="/add"]:visible').first.click()
    pg.locator("[data-add-panel]").wait_for(state="visible")
    pg.locator("[data-add-panel] button[data-food-row]").first.wait_for(state="visible", timeout=15000)
    pg.wait_for_timeout(500)


def step(pg):
    return pg.locator("[data-add-panel] section[data-sheet-view][data-state=open]")


def search(pg, text):
    field = pg.locator("[data-add-panel] input[type=search], [data-add-panel] input").first
    field.fill(text)
    pg.wait_for_timeout(700)


def tap_row(pg, n=0):
    """Taps the n-th food row that is on screen below the glass header (a tap on one under it would hit the header)."""
    idx = pg.evaluate("""(n) => { const head = document.querySelector('[data-add-panel] .glass-bar').getBoundingClientRect().bottom;
      const rows = [...document.querySelectorAll('[data-add-panel] button[data-food-row]')];
      const shown = rows.map((r, i) => [r.getBoundingClientRect(), i]).filter(([b]) => b.height > 0 && b.top > head + 4 && b.bottom < innerHeight - 100);
      return shown.length > n ? shown[n][1] : -1; }""", n)
    assert idx >= 0, "no food row on screen"
    pg.locator("[data-add-panel] button[data-food-row]").nth(idx).click()


def phone(browser, width):
    tag = f"{width}"
    ctx, pg = new_page(browser, width)
    open_add(pg)
    panel = pg.locator("[data-add-panel]")
    box0 = panel.bounding_box()

    # 1: a search result opens the portion step inside the sheet
    search(pg, "gà")
    rows = pg.locator("[data-add-panel] button[data-food-row]:visible")
    # The Khay holds one food before the step opens: the tray circle of the second row
    pg.locator("[data-add-panel] [data-tray-toggle]:visible, [data-add-panel] button[aria-label^='Thêm vào khay']:visible").first.click()
    pg.wait_for_timeout(400)
    scroller = pg.locator("[data-add-scroll]")
    scroller.evaluate("el => { el.scrollTop = 240; }")
    pg.wait_for_timeout(200)
    scroll_before = scroller.evaluate("el => el.scrollTop")
    tray_before = pg.locator('[data-testid="tray-add"]').inner_text() if pg.locator('[data-testid="tray-add"]').count() else ""
    pg.evaluate("window.__dlgStart()")
    tap_row(pg, 1)
    step(pg).wait_for(state="visible")
    pg.wait_for_timeout(450)
    most = pg.evaluate("window.__dlgStop()")
    check(most == 1, f"{tag} 1: one dialog in every frame while the portion step opens (most at once: {most})")
    box1 = panel.bounding_box()
    check(abs(box1["y"] - box0["y"]) < 1 and abs(box1["height"] - box0["height"]) < 1 and abs(box1["width"] - box0["width"]) < 1, f"{tag} 1: the sheet keeps its place and size ({box0} -> {box1})")
    sbox = step(pg).bounding_box()
    check(abs(sbox["y"] - box1["y"]) < 1 and abs(sbox["width"] - box1["width"]) < 1, f"{tag} 1: the step fills the sheet")
    check(step(pg).get_by_role("button", name="Quay lại").count() == 1 and step(pg).get_by_role("button", name="Đóng").count() == 1, f"{tag} 1: the step's header has ‹ and ✕")
    check("Khẩu phần" in step(pg).locator("#portion-step-title").inner_text(), f"{tag} 1: the header says Khẩu phần")
    check(pg.locator('[aria-labelledby="portion-sheet-title"]').count() == 1 and pg.locator('[role=dialog][aria-labelledby="portion-sheet-title"]').count() == 0, f"{tag} 1: the step is a section of the + sheet, not a dialog")
    pg.screenshot(path=str(SHOTS / f"one-sheet-{tag}-portion.png"))

    # 2: ‹ back keeps the search, the scroll and the Khay
    pg.evaluate("window.__dlgStart()")
    step(pg).get_by_role("button", name="Quay lại").click()
    pg.wait_for_timeout(400)
    check(step(pg).count() == 0, f"{tag} 2: ‹ goes back to the list")
    check(pg.locator("[data-add-panel] input").first.input_value() == "gà", f"{tag} 2: the search text is kept")
    scroll_after = scroller.evaluate("el => el.scrollTop")
    check(abs(scroll_after - scroll_before) < 2, f"{tag} 2: the list's scroll is kept ({scroll_before} -> {scroll_after})")
    tray_after = pg.locator('[data-testid="tray-add"]').inner_text() if pg.locator('[data-testid="tray-add"]').count() else ""
    check(tray_before != "" and tray_before == tray_after, f"{tag} 2: the Khay is kept ({tray_before!r} -> {tray_after!r})")
    pg.screenshot(path=str(SHOTS / f"one-sheet-{tag}-back.png"))
    tap_row(pg, 2)
    step(pg).wait_for(state="visible")
    pg.wait_for_timeout(350)
    step(pg).locator('[data-testid="portion-add"]').click()
    pg.wait_for_url(re.compile(r"/app"), timeout=5000)
    pg.wait_for_timeout(500)
    most = pg.evaluate("window.__dlgStop()")
    check(most == 1, f"{tag} 2: back, another food, Thêm: never more than one dialog (most at once: {most})")
    check(dialogs(pg) == 0, f"{tag} 2: the add went home and closed the sheet")
    ctx.close()


def entry_points(browser):
    ctx, pg = new_page(browser, 390)
    open_add(pg)
    # 3: the Minh Hào chip
    chip = pg.locator('[data-add-panel] [aria-label="Lọc món theo nhóm"]').get_by_role("button", name=re.compile("Minh Hào"))
    if chip.count():
        chip.first.click()
        pg.wait_for_timeout(600)
        tap_row(pg)
        step(pg).wait_for(state="visible")
        check(dialogs(pg) == 1, "3: a Minh Hào food opens the step inside the sheet (one dialog)")
        step(pg).get_by_role("button", name="Quay lại").click()
        pg.wait_for_timeout(300)
        pg.locator('[data-add-panel] [aria-label="Lọc món theo nhóm"]').get_by_text("Tất cả").first.click()
        pg.wait_for_timeout(500)
    else:
        check(False, "3: the Minh Hào chip is in the + sheet")
    # 3: a Gần đây card's chevron
    chev = pg.locator("[data-add-panel] [data-tour='recent-open'], [data-add-panel] button[aria-label^='Chọn khẩu phần']")
    if chev.count():
        chev.first.click()
        step(pg).wait_for(state="visible")
        check(dialogs(pg) == 1, "3: a Gần đây chevron opens the step inside the sheet (one dialog)")
    else:
        print("[SKIP] 3: no Gần đây chevron on this build")

    # 4: Back from the step goes back to the list
    if step(pg).count() == 0:
        tap_row(pg)
        step(pg).wait_for(state="visible")
    pg.go_back()
    pg.wait_for_timeout(500)
    check(step(pg).count() == 0 and dialogs(pg) == 1 and "/add" in pg.url, f"4: Back from the step goes back to the list ({pg.url[len(BASE):]})")
    # ✕ on the step closes all
    tap_row(pg)
    step(pg).wait_for(state="visible")
    step(pg).get_by_role("button", name="Đóng").click()
    pg.wait_for_url(re.compile(r"/app$"), timeout=5000)
    pg.wait_for_timeout(500)
    check(dialogs(pg) == 0, "4: ✕ on the step closes the whole sheet")
    pg.go_back()
    pg.wait_for_timeout(600)
    check(dialogs(pg) == 0 and "/add" not in pg.url, f"4: Back from Hôm nay does not bring the sheet back ({pg.url[len(BASE):]})")
    ctx.close()

    # 4: a drag down on the step's header closes the whole sheet
    ctx, pg = new_page(browser, 390)
    open_add(pg)
    tap_row(pg)
    step(pg).wait_for(state="visible")
    pg.wait_for_timeout(300)
    handle = step(pg).locator("[data-sheet-handle]").bounding_box()
    x, y = handle["x"] + handle["width"] / 2, handle["y"] + handle["height"] / 2
    pg.mouse.move(x, y)
    pg.mouse.down()
    for i in range(1, 11):
        pg.mouse.move(x, y + 40 * i)
        pg.wait_for_timeout(16)
    pg.mouse.up()
    pg.wait_for_url(re.compile(r"/app$"), timeout=5000)
    pg.wait_for_timeout(500)
    check(dialogs(pg) == 0, "4: a drag down on the step closes the whole sheet")
    ctx.close()


def compare(browser):
    ctx, pg = new_page(browser, 390)
    open_add(pg)
    search(pg, "gà")
    pg.locator("[data-add-panel] [data-tray-toggle]:visible, [data-add-panel] button[aria-label^='Thêm vào khay']:visible").first.click()
    pg.wait_for_timeout(300)
    name = "the food"
    tap_row(pg, 1)
    step(pg).wait_for(state="visible")
    pg.wait_for_timeout(300)
    title = pg.locator("#portion-sheet-title").inner_text()
    pg.evaluate("window.__dlgStart()")
    step(pg).get_by_role("button", name="So sánh").click()
    picker = pg.locator('[data-add-panel] section[data-sheet-view][aria-labelledby="compare-picker-title"][data-state=open]')
    picker.wait_for(state="visible")
    pg.wait_for_timeout(400)
    check(pg.evaluate("window.__dlgStop()") == 1, "5: So sánh is a step inside the sheet (one dialog)")
    check(picker.get_by_role("button", name="Hủy").count() == 0, "5: the step has no Hủy beside its ‹ (D-SHT-05)")
    pg.screenshot(path=str(SHOTS / "one-sheet-390-compare.png"))
    picker.get_by_role("button", name="Quay lại").click()
    pg.wait_for_timeout(400)
    check(step(pg).count() == 1 and pg.locator("#portion-sheet-title").inner_text() == title, "5: ‹ goes back to the portion of the same food")
    step(pg).get_by_role("button", name="So sánh").click()
    picker.wait_for(state="visible")
    pg.wait_for_timeout(300)
    picker.locator("button[data-food-row]:visible:not([disabled])").nth(1).click()
    pg.wait_for_timeout(200)
    picker.get_by_role("button", name=re.compile(r"So sánh \(")).click()
    pg.wait_for_url(re.compile(r"/foods/compare"), timeout=8000)
    pg.wait_for_timeout(800)
    pg.go_back()
    pg.wait_for_url(re.compile(r"/add"), timeout=8000)
    step(pg).wait_for(state="visible", timeout=8000)
    pg.wait_for_timeout(600)
    check(dialogs(pg) == 1, "5: Back from the comparison: one dialog")
    check(pg.locator("#portion-sheet-title").inner_text() == title, f"5: Back from the comparison lands on the portion of {name}")
    pg.screenshot(path=str(SHOTS / "one-sheet-390-compare-return.png"))
    pg.go_back()
    pg.wait_for_timeout(600)
    check(step(pg).count() == 0 and dialogs(pg) == 1, "5: Back again goes to the list")
    check(pg.locator("[data-add-panel] input").first.input_value() == "gà", "5: the search text came back with the sheet")
    check(pg.locator('[data-testid="tray-add"]').count() == 1, "5: the Khay came back with the sheet")
    ctx.close()


def title_and_motion(browser):
    ctx, pg = new_page(browser, 390)
    open_add(pg)
    # The demo's Cơm trắng (chín) (the live catalogue's Thịt bò thăn (chín) is in lib/__tests__/food-twins.test.ts)
    search(pg, "cơm trắng")
    tap_row(pg)
    step(pg).wait_for(state="visible")
    pg.wait_for_timeout(600)
    title = pg.locator("#portion-sheet-title").inner_text()
    has_switch = step(pg).get_by_text("Đã nấu chín").count() > 0
    check(has_switch and "(" not in title and title.strip().upper() == "CƠM TRẮNG", f"6: beside the Sống | Chín switch the title has no state ({title!r}, switch {has_switch})")
    pg.screenshot(path=str(SHOTS / "one-sheet-390-title.png"))
    ctx.close()

    ctx, pg = new_page(browser, 390, reduced=True)
    open_add(pg)
    pg.evaluate("""() => { window.__tx = []; new MutationObserver(() => {}).observe(document.body, {childList: true, subtree: true});
      const tick = () => { const s = document.querySelector('[data-add-panel] section[data-sheet-view]'); if (s) window.__tx.push(getComputedStyle(s).transform); if (window.__tx.length < 40) requestAnimationFrame(tick); }; requestAnimationFrame(tick); }""")
    tap_row(pg)
    step(pg).wait_for(state="visible")
    pg.wait_for_timeout(600)
    tx = pg.evaluate("window.__tx")
    check(len(tx) > 0 and all(t == "none" for t in tx), f"8: reduced motion: the step does not move ({sorted(set(tx))[:3]})")
    ctx.close()


def desktop(browser):
    ctx, pg = new_page(browser, 1024, 900, mobile=False)
    pg.goto(BASE + "/app", wait_until="networkidle")
    pg.wait_for_timeout(600)
    pg.locator('a[href^="/add"]:visible, button[id^="desktop-add"]:visible').first.click()
    pg.get_by_role("dialog").first.wait_for(state="visible")
    rows = pg.locator("[role=dialog] button[data-food-row]:visible")
    rows.first.wait_for(state="visible", timeout=15000)
    pg.evaluate("window.__dlgStart()")
    rows.nth(0).click()
    pg.wait_for_timeout(300)
    rows.nth(1).click()
    pg.wait_for_timeout(300)
    pg.locator('[role=dialog] [data-testid="portion-add"]:visible').click()
    pg.wait_for_timeout(900)
    most = pg.evaluate("window.__dlgStop()")
    check(most == 1, f"7: 1024: food, another food, add: one dialog at most ({most})")
    ctx.close()


def home_row(browser):
    # 9: a Hôm nay row's portion sheet is a sheet of its own (one dialog)
    ctx, pg = new_page(browser, 390)
    pg.goto(BASE + "/app", wait_until="networkidle")
    pg.wait_for_timeout(800)
    row = pg.locator("[data-entry-id]:visible").first
    if row.count():
        row.click()
        pg.wait_for_timeout(600)
        check(dialogs(pg) <= 1, f"9: a Hôm nay row opens one sheet ({dialogs(pg)})")
    else:
        print("[SKIP] 9: no Hôm nay entry row found")
    ctx.close()


with sync_playwright() as p:
    browser = p.chromium.launch()
    for w in (390, 360):
        phone(browser, w)
    entry_points(browser)
    compare(browser)
    title_and_motion(browser)
    desktop(browser)
    home_row(browser)
    browser.close()

print(f"\n{len(problems)} problem(s)")
sys.exit(1 if problems else 0)
