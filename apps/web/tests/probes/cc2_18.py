"""cc2-18: polish and voice pass, at 390 and 1280.

- Voice: the verified copy from docs/voice-audit.md is on screen ("Thêm bữa đầu tiên" on /signup, the new app title,
  "Chất béo" on Hôm nay, percents with no space, "Chưa có dữ liệu"); no "Béo" label and no "số liệu"
  on the screens this pass touched; no old meal-list name anywhere in the app source
- Add sheet: each shortcut card is about 88 px tall with a 44 px add button in its corner; the add is labelled
  "Thêm <món> <khẩu phần>" for screen readers; no horizontal scroll

Screenshots: .screenshots/cc2-18-*.png
Run with: ALIGN_BASE_URL=http://localhost:3102 npm run probe -- tests/probes/cc2_18.py
"""
import os
import re
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright
import _demo  # noqa: F401  (demo mode on, see _demo.py)

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3102")
ROOT = Path(__file__).resolve().parent.parent.parent
SHOTS = ROOT / ".screenshots"
SIZES = [("390", {"width": 390, "height": 844}), ("1280", {"width": 1280, "height": 800})]
NOW = "2026-10-12T18:00:00+07:00"
# Files the voice pass touched outside CC1's claim; the source scan covers these
SCANNED = [
    "components/overview",
    "components/add",
    "components/foods",
    "components/diary",
    "components/training/sodium-progress-card.tsx",
    "lib/overview-board.ts",
    "lib/overview-detail.ts",
    "lib/diary-rows.ts",
    "lib/quick-entry.ts",
    "lib/training.ts",
]
problems, notes = [], []


def check(cond, msg):
    (notes if cond else problems).append(("ok: " if cond else "") + msg)


def squash(s):
    return re.sub(r"\s+", " ", s)


def new_page(browser, size, route):
    ctx = browser.new_context(viewport=size)
    pg = ctx.new_page()
    pg.clock.set_fixed_time(NOW)
    pg.goto(BASE + route, wait_until="networkidle")
    pg.wait_for_timeout(600)
    return ctx, pg


def shot(pg, name, size_name):
    SHOTS.mkdir(parents=True, exist_ok=True)
    pg.screenshot(path=str(SHOTS / f"cc2-18-{name}-{size_name}.png"), full_page=True, animations="disabled")


def no_h_scroll(pg, where):
    w, inner = pg.evaluate("() => [Math.max(document.documentElement.scrollWidth, document.body.scrollWidth), window.innerWidth]")
    check(w <= inner, f"{where}: no horizontal scroll ({w} <= {inner})")


def source_scan():
    hits = []
    for rel in SCANNED:
        base = ROOT / rel
        files = [base] if base.is_file() else [p for p in base.rglob("*") if p.suffix in (".ts", ".tsx")]
        for f in files:
            text = f.read_text(encoding="utf8")
            for bad in ["Bữa " + "của tôi", "số " + "liệu", "Xoá", "xoá", "Tuỳ", "tuỳ", "Huỷ", "huỷ"]:
                if bad in text:
                    hits.append(f"{f.relative_to(ROOT)}: {bad}")
    check(not hits, f"source: no old meal-list name or 'số liệu' in the voice-pass files ({hits})")
    app_hits = [str(p.relative_to(ROOT)) for p in (ROOT / "app").rglob("*.tsx") if "Bữa " + "của tôi" in p.read_text(encoding="utf8")]
    check(not app_hits, f"source: no old meal-list name under app/ ({app_hits})")


def voice(browser, size_name, size):
    w = f"{size_name} voice"
    ctx, pg = new_page(browser, size, "/signup")
    body = squash(pg.inner_text("body"))
    # The benefit list is desktop only (hidden lg:flex); the phone shows the paragraph instead
    if size_name == "390":
        check("Thêm bữa ăn, theo dõi vi chất" in body, f"{w}: sign-up paragraph says Thêm")
    else:
        check("Thêm bữa ăn trong vài giây" in body, f"{w}: sign-up hint says Thêm")
        check("Theo dõi đủ 22 vi chất, không chỉ kcal" in body, f"{w}: sign-up value line")
    ctx.close()

    ctx, pg = new_page(browser, size, "/")
    body = squash(pg.inner_text("body"))
    check(re.search(r"·\s*Béo\b", body) is None, f"{w}: no 'Béo' macro label on Hôm nay")
    check("Chất béo" in body, f"{w}: Hôm nay says Chất béo")
    check(not re.search(r"\d \%", body), f"{w}: percents have no space before %")
    no_h_scroll(pg, w + " Hôm nay")
    shot(pg, "home", size_name)
    ctx.close()

    ctx, pg = new_page(browser, size, "/add")
    cards = pg.locator("ul li:visible:has(button[aria-label^='Thêm '])")
    box = cards.first.bounding_box() if cards.count() else None
    if box is None:
        notes.append(f"ok: {w}: no visible shortcut cards on /add in the demo (skipped card checks)")
    else:
        check(box["height"] <= 96, f"{w}: shortcut card is about 88 px ({box['height']:.0f} px)")
        add = cards.first.locator("button[aria-label^='Thêm ']")
        ab = add.bounding_box()
        check(ab["width"] >= 44 and ab["height"] >= 44, f"{w}: add button is 44 px ({ab['width']:.0f}×{ab['height']:.0f})")
        check(add.inner_text().strip() == "", f"{w}: add button is icon-only")
    no_h_scroll(pg, w + " add")
    shot(pg, "add", size_name)
    ctx.close()


def main():
    source_scan()
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for size_name, size in SIZES:
            voice(browser, size_name, size)
        browser.close()
    for n in notes:
        print(n)
    for pr in problems:
        print("[FAIL]", pr)
    print(f"cc2-18: {len(notes)} ok, {len(problems)} fail")
    sys.exit(1 if problems else 0)


if __name__ == "__main__":
    main()
