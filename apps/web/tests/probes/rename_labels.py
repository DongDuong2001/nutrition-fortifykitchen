"""feat/rename-labels: "Món ăn của tôi", "Bữa ăn đã lưu", "Ngày ăn mẫu" (and the shorter add toast, in lib/__tests__/add-toast.test.ts).

At 360 px, at 360 with the root font at 150 % and at 390:
- Khám phá › Của bạn lists Yêu thích, Bữa ăn đã lưu and Món ăn của tôi (with their counts) and Ngày ăn mẫu sits in its own row; none of
  the old names ("Món của tôi", "Bữa ăn của tôi") is on the page, and no label is cut off (nothing wider than its box). At 100 % text each
  label is one line; at 150 % a label may wrap to a second line but is never cut.
- /explore/cua_toi is headed "Món ăn của tôi"; /explore/meals "Bữa ăn đã lưu" with the subtitle "Thêm lại cả bữa bằng một chạm";
  /explore/ngay-mau "Ngày ăn mẫu".
- A recipe dish (Cơm đậu đỏ) offers "Tùy chỉnh món này"; it makes a recipe whose page says "Món ăn của tôi · N phần · N nguyên liệu".
- On an empty day the pill keeps "Chép ngày mẫu" ("Chép ngày ăn mẫu" does not fit the card at 360 or 390 px); its size is reported, not
  asserted (the old label already wraps there). The picker is "Chọn ngày ăn mẫu".
Shots: .screenshots/v3-rename/<name>-<360|360-text150|390>.png.
Run with: ALIGN_BASE_URL=http://localhost:3101 npm run probe -- tests/probes/rename_labels.py
"""
# PROBE_COVERS: components/explore/** app/(app)/explore/** app/(app)/foods/** lib/food-categories.ts components/templates/** components/home/template-picker-sheet.tsx lib/releases.ts
import os
import re
import sys
from pathlib import Path

import _demo  # noqa: F401
from playwright.sync_api import sync_playwright
from share_micros import NO_SAMPLE

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3101")
OUT = Path(__file__).resolve().parent.parent.parent / ".screenshots" / "v3-rename"
OUT.mkdir(parents=True, exist_ok=True)
CASES = [("360", {"width": 360, "height": 780}, False), ("360-text150", {"width": 360, "height": 780}, True), ("390", {"width": 390, "height": 844}, False)]
OLD = ["Món của tôi", "Bữa ăn của tôi", "Tùy chỉnh thành"]
problems = []

# Every text leaf under a root: its text, its lines (distinct tops of its text range) and whether its box clips it
LEAVES = """(root) => {
  const out = [];
  for (const el of root.querySelectorAll('*')) {
    if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
    const r = document.createRange(); r.selectNodeContents(el);
    const lines = new Set([...r.getClientRects()].map((q) => Math.round(q.top))).size;
    out.push({ text: el.textContent.trim().replace(/\\s+/g, ' ').slice(0, 60), lines, clipped: el.scrollWidth > el.clientWidth + 1 });
  }
  return out;
}"""


def check(cond, msg):
    print(("[PASS] " if cond else "[FAIL] ") + msg)
    if not cond:
        problems.append(msg)


def page(browser, size, big, empty_day=False):
    ctx = browser.new_context(viewport=size)
    if empty_day:
        ctx.add_init_script("try { localStorage.setItem('h1t_sample_edits_v1_demo', %r) } catch (e) {}" % NO_SAMPLE)
    pg = ctx.new_page()
    pg.clock.set_fixed_time("2026-10-15T10:00:00+07:00")
    return ctx, pg


def go(pg, route, big):
    pg.goto(BASE + route, wait_until="networkidle")
    pg.wait_for_timeout(500)
    if big:
        pg.evaluate("document.documentElement.style.fontSize = '24px'")
        pg.wait_for_timeout(300)


def no_old_names(pg, where):
    text = pg.inner_text("body")
    check(not any(o in text for o in OLD), f"{where}: none of the old names on the page")


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for name, size, big in CASES:
            # Khám phá › Của bạn
            ctx, pg = page(browser, size, big)
            go(pg, "/explore", big)
            yours = pg.locator("section[aria-labelledby=explore-yours]")
            text = re.sub(r"\s+", " ", yours.inner_text())
            for label in ("Yêu thích", "Bữa ăn đã lưu", "Món ăn của tôi", "Ngày ăn mẫu"):
                check(label in text, f"{name} Của bạn: {label} ({text[:90]!r})")
            check(re.search(r"Bữa ăn đã lưu · \d+ bữa", text) is not None and re.search(r"Món ăn của tôi · \d+ món", text) is not None, f"{name} Của bạn: the rows keep their counts")
            leaves = yours.evaluate(LEAVES)
            labels = [l for l in leaves if l["text"] in ("Bữa ăn đã lưu", "Món ăn của tôi", "Ngày ăn mẫu", "Yêu thích") or l["text"].startswith(("Bữa ăn đã lưu ·", "Món ăn của tôi ·", "Ngày ăn mẫu ·"))]
            check(labels and not any(l["clipped"] for l in labels), f"{name} Của bạn: no label cut off ({[l['text'] for l in labels if l['clipped']]})")
            if not big:
                check(labels and all(l["lines"] == 1 for l in labels), f"{name} Của bạn: every label on one line ({[(l['text'], l['lines']) for l in labels if l['lines'] != 1]})")
            else:
                print(f"  {name} Của bạn: lines per label {[(l['text'], l['lines']) for l in labels]}")
            no_old_names(pg, f"{name} /explore")
            yours.scroll_into_view_if_needed()
            yours.screenshot(path=str(OUT / f"cua-ban-{name}.png"))
            ctx.close()

            # the pushed screens
            ctx, pg = page(browser, size, big)
            for route, title, sub in (("/explore/cua_toi", "Món ăn của tôi", None), ("/explore/meals", "Bữa ăn đã lưu", "Thêm lại cả bữa bằng một chạm"), ("/explore/ngay-mau", "Ngày ăn mẫu", None)):
                go(pg, route, big)
                h1 = pg.locator("h1:visible").first.text_content().strip()
                check(h1 == title, f"{name} {route}: headed {title!r} ({h1!r})")
                if sub:
                    check(sub in pg.inner_text("header"), f"{name} {route}: subtitle {sub!r}")
                head = pg.locator("header").first.evaluate(LEAVES)
                check(not any(l["clipped"] for l in head), f"{name} {route}: the header is not cut off")
                no_old_names(pg, f"{name} {route}")
            ctx.close()

            # the recipe dish, its button, and the recipe it makes
            ctx, pg = page(browser, size, big)
            go(pg, "/foods/food-com-dau-do", big)
            btn = pg.get_by_text("Tùy chỉnh món này")
            check(btn.count() == 1, f"{name} food page: the button reads Tùy chỉnh món này")
            b = btn.first.evaluate(LEAVES.replace("root.querySelectorAll('*')", "[root]")) if btn.count() else []
            check(b and not b[0]["clipped"] and (big or b[0]["lines"] == 1), f"{name} food page: the button is not cut off ({b})")
            no_old_names(pg, f"{name} food page")
            btn.first.scroll_into_view_if_needed()
            btn.first.locator("xpath=..").screenshot(path=str(OUT / f"food-page-{name}.png"))
            btn.first.click()
            pg.wait_for_url("**/foods/new*")
            pg.wait_for_timeout(600)
            pg.get_by_role("button", name="Lưu món").click()
            pg.wait_for_url(re.compile(r".*/foods/recipe-\d+.*"), timeout=8000)
            pg.wait_for_timeout(600)
            head = re.sub(r"\s+", " ", pg.locator("header").first.inner_text())
            check(re.search(r"Món ăn của tôi · \d+ phần · \d+ nguyên liệu", head) is not None, f"{name} recipe page: header line ({head[:100]!r})")
            leaves = pg.locator("header").first.evaluate(LEAVES)
            line = [l for l in leaves if l["text"].startswith("Món ăn của tôi ·")]
            check(line and not line[0]["clipped"] and (big or line[0]["lines"] == 1), f"{name} recipe page: the line is not cut off{'' if big else ' and is one line'} ({line})")
            pg.screenshot(path=str(OUT / f"recipe-page-{name}.png"))
            ctx.close()

            # the pill on an empty day
            ctx, pg = page(browser, size, big, empty_day=True)
            go(pg, "/app", big)
            pill = pg.get_by_role("button", name="Chép ngày mẫu").locator("visible=true")
            check(pill.count() == 1, f"{name} empty day: the pill reads Chép ngày mẫu")
            if pill.count():
                info = pill.first.evaluate(
                    """(b) => { const card = b.closest('[data-food-scroll]') || b.parentElement; const r = b.getBoundingClientRect(), c = card.getBoundingClientRect();
                      const range = document.createRange(); range.selectNodeContents(b);
                      return { lines: new Set([...range.getClientRects()].map((q) => Math.round(q.top))).size, inside: r.left >= c.left - 1 && r.right <= c.right + 1, clipped: b.scrollWidth > b.clientWidth + 1, width: r.width, card: c.width }; }"""
                )
                # Reported, not asserted: "Chép ngày ăn mẫu" does not fit the 148 to 178 px card, so the label stays "Chép ngày mẫu"; that label
                # itself already wraps to two lines in the pill (a 100 to 130 px button beside its ×), as it did before this branch
                print(f"  {name} empty day: pill {info}")
                pill.first.scroll_into_view_if_needed()
                pg.screenshot(path=str(OUT / f"pill-{name}.png"))
                pill.first.click()
                dlg = pg.get_by_role("dialog", name="Chọn ngày ăn mẫu")
                check(dlg.count() == 1, f"{name} empty day: the picker is Chọn ngày ăn mẫu")
            no_old_names(pg, f"{name} empty day")
            ctx.close()
        browser.close()
    print(f"\n{len(problems)} problem(s)")
    sys.exit(1 if problems else 0)


if __name__ == "__main__":
    main()
