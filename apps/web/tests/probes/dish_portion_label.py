"""fix/dish-portion-label: a dish logged as "1 phần" shows "1 phần" in the amount column, never its whole serving label.

Bún đậu mắm tôm is logged as the live catalogue's portion "1 phần (495 g, gồm 46 g mắm tôm)" (495 g), next to an
edited dish (· đã chỉnh, the longest name) and a plain 150 g food. At 360 and 390 wide, with 100 % and 150 % text:
- Hôm nay: the amount reads "1 phần", the line under the name "495 g · gồm 46 g mắm tôm"; Bún đậu mắm tôm takes at
  most 2 lines (3 for the edited dish's longer name at 150 % text), the amount takes at most 40 % of the row and a
  dish name at least 35 % (never one letter per line) and the amount stays inside its row; the plain row is 32 px high (the pixel-fitted look is kept).
- Chọn nhiều món (the checkbox list): the same row rules.
- The share image (Lưu ảnh, its SVG laid out as a page): the amount reads "1 phần" with no "(…)", the name at most
  2 lines, the amount inside the card.
Screenshots: .screenshots/dish-portion-<tag>-<w>-<scale>.png (Hôm nay) and docs/screenshots/dish-portion-label/
share-<tag>-<w>-<scale>.png; DISH_TAG=before|after (default after).
Run with: ALIGN_BASE_URL=http://localhost:3104 npm run probe -- tests/probes/dish_portion_label.py
"""
# PROBE_COVERS: app/(app)/(tabs)/app/** components/home/food-list.tsx components/home/share-day.tsx lib/home.ts lib/portion.ts
import json
import os
import sys
import urllib.parse
from pathlib import Path

import _demo  # noqa: F401
from playwright.sync_api import sync_playwright

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3101")
TAG = os.environ.get("DISH_TAG", "after")
WEB = Path(__file__).resolve().parent.parent.parent
SHOTS = WEB / ".screenshots"
SHOTS.mkdir(exist_ok=True)
OUT = WEB.parent.parent / "docs" / "screenshots" / "dish-portion-label"
OUT.mkdir(parents=True, exist_ok=True)
NOW = "2026-10-20T20:00:00+07:00"
ADDED_AT = "2026-10-20T05:00:00.000Z"
LABEL = "1 phần (495 g, gồm 46 g mắm tôm)"
problems = []


def entry(eid, name, qty, grams, slot, kcal):
    n = {"energy": kcal, "protein": 20, "carbs": 70, "fat": 20, "fiber": 6, "calcium": 300, "iron": 4}
    return {"id": eid, "foodId": "food-bun-dau", "foodName": name, "grams": grams, "displayQty": qty, "mealSlot": slot,
            "calories": kcal, "protein": 20, "carbs": 70, "fat": 20, "fiber": 6, "nutrients": n, "addedAt": ADDED_AT}


ENTRIES = [
    entry("dish-1", "Bún đậu mắm tôm", LABEL, 495, "lunch", 815),
    entry("dish-2", "Bún đậu mắm tôm · đã chỉnh", "1 phần", 350, "dinner", 840),
    {**entry("dish-3", "Cơm gạo lứt", "150 g", 150, "lunch", 165), "foodId": "food-com-gao-lut"},
]
NO_SAMPLE = json.dumps({f"item-{i}": {"deleted": True} for i in range(1, 8)})
PROFILE = {"sex": "male", "birthYear": 2003, "weightKg": 65.4, "goal": "maintain", "periodMode": False,
           "trainingMinutesDefault": 60, "displayName": "Học viên A", "hintSeen": True}
GRAB_SVG = """
(() => {
  window.__shareSvgs = [];
  const desc = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
  Object.defineProperty(HTMLImageElement.prototype, 'src', {
    set(v) { if (typeof v === 'string' && v.startsWith('data:image/svg+xml')) window.__shareSvgs.push(v); desc.set.call(this, v); },
    get() { return desc.get.call(this); },
  });
})();
"""
# Phone text size: every size is in rem, so 150 % on the root is what the setting does
BIG_TEXT = "document.addEventListener('DOMContentLoaded', () => { document.documentElement.style.fontSize = '150%'; });"

# One row: its name's line count, the amount's text and box, the row's box. `row` is the row element.
ROW = """(row) => {
  // The lines a reader sees: a line-clamp-2 name's clipped lines (under its box) do not count
  const lines = (el) => {
    const bottom = el.getBoundingClientRect().bottom + 1;
    const tops = new Set();
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const range = document.createRange();
      range.selectNodeContents(walker.currentNode);
      [...range.getClientRects()].filter((r) => r.width > 0 && r.bottom <= bottom).forEach((r) => tops.add(Math.round(r.top)));
    }
    return tops.size;
  };
  const spans = [...row.children].filter((c) => c.tagName === 'SPAN');
  const amount = spans[spans.length - 1];
  const nameBox = spans.length > 1 ? spans[spans.length - 2] : null;
  const name = nameBox && (nameBox.querySelector('span') || nameBox);
  const detail = nameBox && nameBox.querySelector('.basis-full');
  const r = row.getBoundingClientRect(), a = amount.getBoundingClientRect();
  return {
    name: name ? name.textContent.trim() : '', nameLines: name ? lines(name) : 0,
    amount: amount.textContent.trim(), amountLines: lines(amount), detail: detail ? detail.textContent.trim() : null,
    rowLeft: r.left, rowRight: r.right, rowHeight: r.height, amountLeft: a.left, amountRight: a.right,
    nameWidth: nameBox ? nameBox.getBoundingClientRect().width : 0,
    overflow: amount.scrollWidth > amount.clientWidth + 1,
  };
}"""


def check(cond, msg):
    print(("[PASS] " if cond else "[FAIL] ") + msg)
    if not cond:
        problems.append(msg)
    return cond


def context(browser, w, big):
    ctx = browser.new_context(viewport={"width": w, "height": 800}, accept_downloads=True)
    seed = f"localStorage.setItem('h1t_sample_edits_v1_demo', {json.dumps(NO_SAMPLE)});"
    seed += f"localStorage.setItem('h1t_added_entries_v1_demo', {json.dumps(json.dumps(ENTRIES))});"
    seed += f"localStorage.setItem('h1t_profile_v1_demo', {json.dumps(json.dumps(PROFILE))});"
    ctx.add_init_script("try {" + seed + "} catch (e) {}")
    ctx.add_init_script("Object.defineProperty(navigator, 'canShare', { value: undefined }); Object.defineProperty(navigator, 'share', { value: undefined });")
    ctx.add_init_script(GRAB_SVG)
    if big:
        ctx.add_init_script(BIG_TEXT)
    return ctx


def row_checks(tag, kind, r, dish):
    # Bún đậu mắm tôm takes at most 2 lines; the edited dish's longer name may take 3 at 150 % text in the narrow
    # column. The amount takes at most 40 % of the row, so a long name keeps at least 35 % (before: about 12 px)
    most = 3 if r["name"].endswith("đã chỉnh") else 2
    check(r["nameLines"] <= most, f"{tag} {kind} {r['name']!r}: name on {r['nameLines']} line(s) (≤ {most})")
    width = r["rowRight"] - r["rowLeft"]
    amount = r["amountRight"] - r["amountLeft"]
    check(amount <= width * 0.4 + 1, f"{tag} {kind} {r['name']!r}: amount {amount:.0f} px ≤ 40 % of the row ({width:.0f} px)")
    if dish:
        check(r["nameWidth"] >= width * 0.35, f"{tag} {kind} {r['name']!r}: the name keeps {r['nameWidth']:.0f} of {width:.0f} px (≥ 35 %)")
    check(r["amountLeft"] >= r["rowLeft"] - 0.5 and r["amountRight"] <= r["rowRight"] + 0.5 and not r["overflow"],
          f"{tag} {kind} {r['name']!r}: amount {r['amount']!r} inside the row ({r['amountLeft']:.0f}–{r['amountRight']:.0f} in {r['rowLeft']:.0f}–{r['rowRight']:.0f})")
    if dish:
        check(r["amount"] == "1 phần", f"{tag} {kind} {r['name']!r}: amount reads 1 phần ({r['amount']!r})")


def home(browser, w, big):
    scale = "150" if big else "100"
    tag = f"{w}/{scale}%"
    ctx = context(browser, w, big)
    pg = ctx.new_page()
    pg.clock.set_fixed_time(NOW)
    pg.goto(f"{BASE}/app?level=2", wait_until="networkidle")
    row = pg.locator("[data-entry-id='dish-1'] >> visible=true").first
    row.wait_for(timeout=15000)
    pg.wait_for_timeout(600)
    pg.screenshot(path=str(SHOTS / f"dish-portion-{TAG}-{w}-{scale}.png"))
    for eid in ("dish-1", "dish-2", "dish-3"):
        r = pg.locator(f"[data-entry-id='{eid}'] >> visible=true").first.evaluate(ROW)
        row_checks(tag, "Hôm nay", r, eid != "dish-3")
        if eid == "dish-1":
            check(r["detail"] == "495 g · gồm 46 g mắm tôm", f"{tag} Hôm nay: the line under the name reads 495 g · gồm 46 g mắm tôm ({r['detail']!r})")
        if eid == "dish-3" and not big:
            check(r["rowHeight"] <= 32.5, f"{tag} Hôm nay: a plain row keeps its 32 px height ({r['rowHeight']:.1f})")
    share(pg, tag, w, scale)
    ctx.close()


def share(pg, tag, w, scale):
    pg.locator("[aria-label='Chia sẻ ngày này'] >> visible=true").first.click()
    dlg = pg.get_by_role("dialog")
    try:
        dlg.get_by_role("img").wait_for(state="visible", timeout=30000)
    except Exception:
        check(False, f"{tag} share: the preview never showed")
        return
    with pg.expect_download() as info:
        dlg.get_by_role("button", name="Lưu ảnh").click()
    info.value.save_as(str(OUT / f"share-{TAG}-{w}-{scale}.png"))
    svgs = pg.evaluate("window.__shareSvgs")
    if not check(bool(svgs), f"{tag} share: the SVG of the image was grabbed"):
        return
    body = urllib.parse.unquote(svgs[-1].split(",", 1)[1])
    lay = pg.context.browser.new_context(viewport={"width": 1080, "height": 1400})
    lp = lay.new_page()
    lp.set_content('<!doctype html><html><head></head><body style="margin:0">' + body + "</body></html>")
    lp.wait_for_timeout(300)
    for name in ("Bún đậu mắm tôm", "Bún đậu mắm tôm · đã chỉnh"):
        handle = lp.evaluate_handle(
            "(name) => [...document.querySelectorAll('[data-share-root] [data-share-wrap]')].find((s) => s.textContent.trim() === name)?.parentElement",
            name,
        )
        if not check(handle.evaluate("(el) => !!el"), f"{tag} share: the row of {name!r} is in the image"):
            continue
        r = handle.evaluate(ROW)
        row_checks(tag, "share", r, True)
    lay.close()
    pg.keyboard.press("Escape")


def select_list(browser, w, big):
    """Chọn nhiều món (the day's ⋯ menu): the checkbox list, same rows."""
    scale = "150" if big else "100"
    tag = f"{w}/{scale}%"
    ctx = context(browser, w, big)
    pg = ctx.new_page()
    pg.clock.set_fixed_time(NOW)
    pg.goto(f"{BASE}/app?level=2", wait_until="networkidle")
    pg.locator("[aria-label='Tùy chọn ngày'] >> visible=true").first.click()
    pg.get_by_role("button", name="Chọn nhiều món").click()
    boxes = pg.locator("[role=checkbox] >> visible=true")
    boxes.first.wait_for(timeout=10000)
    pg.wait_for_timeout(400)
    for i in range(boxes.count()):
        r = boxes.nth(i).evaluate(ROW)
        if r["name"].startswith("Bún đậu"):
            row_checks(tag, "Chọn nhiều", r, True)
    ctx.close()


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for w in (360, 390):
            for big in (False, True):
                home(browser, w, big)
                select_list(browser, w, big)
        browser.close()
    print(f"\n{len(problems)} problem(s)")
    sys.exit(1 if problems else 0)


if __name__ == "__main__":
    main()
